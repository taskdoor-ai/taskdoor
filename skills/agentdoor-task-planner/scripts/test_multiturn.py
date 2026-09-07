"""Guard the synthetic transition harness, not model quality or production writes."""
from copy import deepcopy
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import evaluate
import multiturn
from test_validate_plan import fields, inputs, output_for
from validate_plan import validate


def source_fixture():
    data = inputs()
    data["context"]["asOf"] = "2026-09-01T18:00:00+08:00"
    return data


def candidate(data):
    result = output_for(data)

    def replace_refs(value):
        if isinstance(value, dict):
            if "evidenceRefs" in value:
                value["evidenceRefs"] = [data["requestId"] if item == "req" else item for item in value["evidenceRefs"]]
            for child in value.values():
                replace_refs(child)
        elif isinstance(value, list):
            for child in value:
                replace_refs(child)

    replace_refs(result)
    return result


class TransitionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="planner-multiturn-test-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)

    def test_projection_is_copy_only_and_owner_recommendation_never_becomes_acceptance(self):
        data = source_fixture()
        result = candidate(data)
        result["proposal"]["changes"][0]["fields"]["ownerRecommendation"].update(memberId="m1", basis="recommended")
        before = deepcopy((data, result))
        projected = multiturn.project_fixture(data, result)
        root = projected["context"]["tasks"][0]
        self.assertEqual(root["id"], "new:root")
        self.assertEqual(root["recordKind"], "draft")
        self.assertIsNone(root["ownerId"])
        self.assertEqual(root["ownerRecommendation"]["memberId"], "m1")
        self.assertEqual(root["status"], "open")
        self.assertEqual((data, result), before)

    def test_simulated_commit_remaps_task_links_and_records_explicit_synthetic_receipt(self):
        data = source_fixture()
        result = candidate(data)
        result["proposal"]["complexity"] = "complex"
        for identifier, dependencies in (("new:a", []), ("new:b", ["new:a"])):
            child = fields()
            child["dependsOnTaskIds"] = dependencies
            result["proposal"]["changes"].append({"id": "create-" + identifier, "action": "create", "targetId": identifier, "parentId": "new:root", "fields": child, "reason": "独立交付", "evidenceRefs": ["req"]})
        self.assertEqual(validate(data, result), [])
        projected = multiturn.project_fixture(data, result, commit=True, episode="T")
        rows = projected["context"]["tasks"]
        self.assertEqual([row["id"] for row in rows], ["sim:T:1", "sim:T:2", "sim:T:3"])
        self.assertEqual(rows[2]["dependsOnTaskIds"], ["sim:T:2"])
        self.assertEqual(rows[1]["parentId"], "sim:T:1")
        self.assertEqual(projected["currentTaskId"], "sim:T:1")
        self.assertTrue(all(row["ownerId"] is None and row["recordKind"] == "synthetic_saved" for row in rows))
        self.assertTrue(any(record["id"].startswith("simulation-T-receipt-") for record in projected["context"]["sourceRefs"]))

    def test_blocked_or_invalid_previous_output_cannot_be_committed(self):
        data = source_fixture()
        result = candidate(data)
        result["disposition"] = "needs_clarification"
        result["questions"] = [{"field": "scope", "question": "是哪一批？", "blocking": True}]
        with self.assertRaisesRegex(ValueError, "blocked or routed"):
            multiturn.project_fixture(data, result, commit=True)
        result["baseRevision"] += 1
        with self.assertRaisesRegex(ValueError, "failed validation"):
            multiturn.project_fixture(data, result)

    def test_commit_remaps_carried_draft_evidence_links_but_preserves_request_text(self):
        data = source_fixture()
        projected = multiturn.project_fixture(data, candidate(data))
        projected["context"]["tasks"][0]["goal"]["evidenceRefs"].append("new:root")
        projected["context"]["tasks"][0]["tips"] = ["用户原文中的new:root不替换"]
        result = candidate(projected)
        result.update(intent="refine", disposition="no_change", proposal=None, nextActions=[])
        self.assertEqual(validate(projected, result), [])
        saved = multiturn.project_fixture(projected, result, commit=True, episode="T")
        row = saved["context"]["tasks"][0]
        self.assertEqual(row["goal"]["evidenceRefs"], ["req", "sim:T:1"])
        self.assertEqual(row["tips"], ["用户原文中的new:root不替换"])
        self.assertEqual(saved["context"]["sourceRefs"][-1]["syntheticTaskIdMap"], {"new:root": "sim:T:1"})

    def test_next_turn_uses_actual_output_id_and_keeps_its_evidence_and_frozen_input(self):
        with patch.object(multiturn, "_base", side_effect=lambda _: (source_fixture(), "test")):
            multiturn.prepare(self.directory, "A", 1)
            first = self.directory / "A/turn-1"
            input_path = first / "inputs/MULTI-A1.json"
            data = evaluate.read(input_path)
            original_bytes = input_path.read_bytes()
            result = candidate(data)
            evaluate.write(first / "outputs/MULTI-A1.json", result)
            multiturn.prepare(self.directory, "A", 2)
            second = self.directory / "A/turn-2"
            source = evaluate.read(second / "inputs/MULTI-A2.json")
            self.assertEqual(source["currentTaskId"], result["proposal"]["rootTaskId"])
            self.assertEqual(source["context"]["tasks"][0]["acceptanceCriteria"], result["proposal"]["changes"][0]["fields"]["acceptanceCriteria"])
            self.assertIn(data["requestId"], {record["id"] for record in source["context"]["sourceRefs"]})
            self.assertEqual(input_path.read_bytes(), original_bytes)
            manifest = evaluate.read(second / "manifest.json")
            self.assertEqual(manifest["previous"]["outputSha256"], evaluate.sha(first / "outputs/MULTI-A1.json"))
            # Locked goal and owner can still retain their true prior request refs.
            no_change = candidate(source)
            no_change.update(intent="refine", disposition="no_change", proposal=None, nextActions=[])
            self.assertEqual(validate(source, no_change), [])

    def test_tampered_input_or_protocol_and_overwrite_are_rejected(self):
        with patch.object(multiturn, "_base", side_effect=lambda _: (source_fixture(), "test")):
            multiturn.prepare(self.directory, "A", 1)
            first = self.directory / "A/turn-1"
            path = first / "inputs/MULTI-A1.json"
            evaluate.write(first / "outputs/MULTI-A1.json", candidate(evaluate.read(path)))
            with self.assertRaisesRegex(ValueError, "immutable"):
                multiturn.prepare(self.directory, "A", 1)
            path.write_bytes(path.read_bytes() + b"\n")
            with self.assertRaisesRegex(ValueError, "input was modified"):
                multiturn.prepare(self.directory, "A", 2)
            protocol = first / "protocol-snapshot.json"
            frozen = evaluate.read(protocol)
            frozen["SKILL.md"]["sha256"] = "changed"
            evaluate.write(protocol, frozen)
            with self.assertRaisesRegex(ValueError, "Protocol changed"):
                multiturn.prepare(self.directory, "A", 2)

    def test_recorded_transition_harness_drift_is_rejected(self):
        with patch.object(multiturn, "_base", side_effect=lambda _: (source_fixture(), "test")):
            multiturn.prepare(self.directory, "A", 1)
            first = self.directory / "A/turn-1"
            source = evaluate.read(first / "inputs/MULTI-A1.json")
            evaluate.write(first / "outputs/MULTI-A1.json", candidate(source))
            manifest = evaluate.read(first / "manifest.json")
            self.assertEqual(manifest["harnessSha256"], evaluate.sha(Path(multiturn.__file__)))
            self.assertTrue((first / "harness-snapshot.json").exists())
            manifest["harnessSha256"] = "old-harness"
            evaluate.write(first / "manifest.json", manifest)
            with self.assertRaisesRegex(ValueError, "harness changed"):
                multiturn.prepare(self.directory, "A", 2)

    def test_stale_response_is_not_applied_and_revocation_clears_prior_business_data(self):
        multiturn.prepare(self.directory, "D", 1)
        first = self.directory / "D/turn-1"
        data = evaluate.read(first / "inputs/MULTI-D1.json")
        result = candidate(data)
        root = data["currentTaskId"]
        result.update(intent="replan", nextActions=[])
        result["proposal"] = {"rootTaskId": root, "complexity": "complex", "changes": [{"id": "old-format", "action": "update", "targetId": "content03-format", "parentId": root, "fields": {"title": "迟到候选里的旧标题"}, "reason": "旧轮测试候选", "evidenceRefs": [data["requestId"]]}], "preservedTaskIds": [row["id"] for row in data["context"]["tasks"] if row["id"] != "content03-format"]}
        self.assertEqual(validate(data, result), [])
        evaluate.write(first / "outputs/MULTI-D1.json", result)
        multiturn.prepare(self.directory, "D", 2)
        second = self.directory / "D/turn-2"
        latest = evaluate.read(second / "inputs/MULTI-D2.json")
        rows = {row["id"]: row for row in latest["context"]["tasks"]}
        self.assertNotEqual(rows["content03-format"]["title"], "迟到候选里的旧标题")
        self.assertTrue(any(lock["taskId"] == "content03-copy" for lock in latest["confirmedFields"]))
        no_change = candidate(latest)
        no_change.update(intent="replan", disposition="no_change", proposal=None, nextActions=[])
        self.assertEqual(validate(latest, no_change), [])
        evaluate.write(second / "outputs/MULTI-D2.json", no_change)
        multiturn.prepare(self.directory, "D", 3)
        revoked = evaluate.read(self.directory / "D/turn-3/inputs/MULTI-D3.json")
        self.assertEqual(revoked["members"], [])
        self.assertEqual(revoked["authorizedTeamIds"], [])
        for key in ("tasks", "discussions", "history"):
            self.assertEqual(revoked["context"][key], [])
        self.assertEqual([record["id"] for record in revoked["context"]["sourceRefs"]], ["chain-d-access"])
        self.assertNotIn("confirmedFields", revoked)
        self.assertNotIn("currentTaskId", revoked)


if __name__ == "__main__":
    unittest.main()
