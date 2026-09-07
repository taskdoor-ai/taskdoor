"""Offline evaluator regression tests using isolated synthetic fixtures and runs."""

import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import evaluate
import validate_plan


class EvaluationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="planner-evaluator-test-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.root = self.directory / "skill"
        self.run = self.directory / "run"
        for name in (
            "SKILL.md", "references/planning-v0.2.md",
            "references/planning-v0.2.schema.json", "references/context-and-replanning.md",
            "scripts/evaluate.py", "scripts/validate_plan.py",
        ):
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(evaluate.ROOT / name, target)
        self.case_ids = ["CASE-A", "CASE-B", "CASE-C"]
        scenarios = []
        for case_id in self.case_ids:
            source = {
                "requestId": f"request-{case_id}", "message": "查看现有工作",
                "revision": 1, "currentDate": "2026-09-01", "timezone": "Asia/Shanghai",
                "currentUserId": "member", "teamId": "team", "authorizedTeamIds": ["team"],
                "context": {
                    "snapshotId": f"snapshot-{case_id}",
                    "acl": {"status": "verified", "scopeTeamIds": ["team"]},
                    "coverage": dict.fromkeys(("tasks", "subtasks", "discussions", "history"), "complete"),
                    "tasks": [], "discussions": [], "history": [], "sourceRefs": [],
                },
                "duplicateSearch": {
                    "status": "completed", "scopeTeamIds": ["team"],
                    "matches": [], "coverageNote": "合成完整查询",
                },
            }
            scenarios.append({"id": case_id, "teamId": "team", "industry": "test", "category": "query", "input": source})
        evaluate.write(self.root / "evals/industry-fixtures.json", {
            "teams": [{"teamId": "team", "members": [{"id": "member", "name": "测试成员"}]}],
            "scenarios": scenarios,
        })
        self.expectations = self.root / "evals/industry-expectations.json"
        expected = {"expectations": [{
            "scenarioId": case_id, "allowedIntents": ["query"],
            "allowedDispositions": ["route_required"], "manualChecks": ["原始人工核对项"],
        } for case_id in self.case_ids]}
        # Preserve unusual whitespace as well as Unicode: this must be a byte copy.
        self.original_expectations = (" \n" + json.dumps(expected, ensure_ascii=False, indent=3) + "\n\n").encode("utf-8")
        self.expectations.write_bytes(self.original_expectations)
        for target, attribute, value in (
            (evaluate, "ROOT", self.root),
            (validate_plan, "SCHEMA", self.root / "references/planning-v0.2.schema.json"),
        ):
            patcher = patch.object(target, attribute, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def output(self, case_id):
        source = evaluate.read(self.run / "inputs" / f"{case_id}.json")
        duplicate = source["duplicateSearch"]
        value = {
            "schemaVersion": "agentdoor.task-plan.v0.2", "requestId": source["requestId"],
            "baseSnapshotId": source["context"]["snapshotId"], "baseRevision": source["revision"],
            "baseTaskVersions": {}, "intent": "query", "disposition": "route_required",
            "summary": "转到现有工作查询", "reasoningSummary": [], "proposal": None,
            "duplicateCheck": {**{key: duplicate[key] for key in ("status", "scopeTeamIds", "coverageNote")}, "assessments": []},
            "questions": [], "warnings": [], "nextActions": [], "externalEffects": "none",
        }
        evaluate.write(self.run / "outputs" / f"{case_id}.json", value)

    def test_default_and_subset_are_explicit_and_snapshot_bytes_are_exact(self):
        result = evaluate.prepare(self.run)
        manifest = evaluate.read(self.run / "manifest.json")
        self.assertEqual(result["prepared"], len(self.case_ids))
        self.assertEqual(manifest["selectedCaseIds"], self.case_ids)
        subset = self.directory / "subset"
        evaluate.prepare(subset, cases=["CASE-C", "CASE-A"])
        manifest = evaluate.read(subset / "manifest.json")
        self.assertEqual(manifest["selectedCaseIds"], ["CASE-C", "CASE-A"])
        self.assertEqual([case["id"] for case in manifest["cases"]], ["CASE-C", "CASE-A"])
        self.assertEqual({path.name for path in (subset / "inputs").iterdir()}, {"CASE-C.json", "CASE-A.json"})
        snapshot = subset / "expectations-snapshot.json"
        self.assertEqual(snapshot.read_bytes(), self.original_expectations)
        self.assertEqual(manifest["expectationsSha256"], hashlib.sha256(self.original_expectations).hexdigest())
        self.assertTrue((subset / "protocol-snapshot.json").is_file())

    def test_invalid_case_selection_is_rejected_before_writing(self):
        for selected in (["CASE-A", "UNKNOWN"], ["CASE-A", "CASE-A"], []):
            with self.subTest(cases=selected):
                with self.assertRaises(ValueError):
                    evaluate.prepare(self.run, cases=selected)
                self.assertFalse(self.run.exists(), "invalid selection must not leave a partly prepared run")

    def test_cli_accepts_case_subset_and_rejects_cases_for_check(self):
        command = [sys.executable, str(self.root / "scripts/evaluate.py")]
        result = subprocess.run(command + ["prepare", "--directory", str(self.run), "--cases", "CASE-B"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["prepared"], 1)
        invalid = subprocess.run(command + ["check", "--directory", str(self.run), "--cases", "CASE-B"], capture_output=True, text=True)
        self.assertNotEqual(invalid.returncode, 0)
        self.assertIn("--cases", invalid.stderr)

    def test_prepare_cannot_overwrite_frozen_run(self):
        evaluate.prepare(self.run)
        self.output("CASE-A")
        before = {path.relative_to(self.run): path.read_bytes() for path in self.run.rglob("*") if path.is_file()}
        with self.assertRaisesRegex(ValueError, "frozen run"):
            evaluate.prepare(self.run, cases=["CASE-B"])
        after = {path.relative_to(self.run): path.read_bytes() for path in self.run.rglob("*") if path.is_file()}
        self.assertEqual(after, before)

    def test_repository_expectations_edits_do_not_change_old_run(self):
        evaluate.prepare(self.run, cases=["CASE-A"])
        self.output("CASE-A")
        original_report = evaluate.check(self.run)
        changed = evaluate.read(self.expectations)
        changed["expectations"][0].update(allowedIntents=["create"], manualChecks=["后来的勘误"])
        evaluate.write(self.expectations, changed)
        report = evaluate.check(self.run)
        self.assertEqual(report["structurallyValid"], 1)
        self.assertEqual(report["expectationsSource"], "run_snapshot")
        self.assertEqual(report["expectationsSha256"], original_report["expectationsSha256"])
        self.assertEqual(report["results"], original_report["results"])

    def test_modified_snapshot_is_rejected_even_if_json_meaning_is_unchanged(self):
        evaluate.prepare(self.run, cases=["CASE-A"])
        self.output("CASE-A")
        snapshot = self.run / "expectations-snapshot.json"
        snapshot.write_bytes(snapshot.read_bytes() + b"\n")
        with self.assertRaisesRegex(ValueError, "[Ee]xpectations"):
            evaluate.check(self.run)
        self.assertFalse((self.run / "structural-report.json").exists())

    def test_legacy_run_falls_back_but_still_requires_manifest_hash(self):
        evaluate.prepare(self.run, cases=["CASE-A"])
        self.output("CASE-A")
        (self.run / "expectations-snapshot.json").unlink()
        report = evaluate.check(self.run)
        self.assertEqual(report["structurallyValid"], 1)
        self.assertEqual(report["expectationsSource"], "current_repository")
        self.expectations.write_bytes(self.original_expectations + b"\n")
        with self.assertRaisesRegex(ValueError, "[Ee]xpectations"):
            evaluate.check(self.run)

    def test_changed_input_and_missing_output_remain_in_denominator(self):
        evaluate.prepare(self.run)
        self.output("CASE-A")
        self.output("CASE-B")
        altered = self.run / "inputs/CASE-A.json"
        source = evaluate.read(altered)
        source["message"] = "改过的输入"
        evaluate.write(altered, source)
        report = evaluate.check(self.run)
        self.assertEqual(report["total"], 3)
        self.assertEqual(report["structurallyValid"], 1)
        results = {item["id"]: item for item in report["results"]}
        self.assertEqual(results["CASE-A"]["status"], "failed")
        self.assertIn("Frozen input was modified.", results["CASE-A"]["errors"])
        self.assertEqual(results["CASE-C"]["status"], "missing")
        self.assertIn("Missing output; included in the denominator.", results["CASE-C"]["errors"])

    def test_version_drift_is_reported_and_current_schema_is_used(self):
        evaluate.prepare(self.run, cases=["CASE-A"])
        self.output("CASE-A")
        for name in ("SKILL.md", "references/planning-v0.2.md"):
            path = self.root / name
            path.write_text(path.read_text() + "\nTest revision.\n")
        schema_path = self.root / "references/planning-v0.2.schema.json"
        schema = evaluate.read(schema_path)
        schema["properties"]["summary"]["const"] = "A new schema requirement"
        evaluate.write(schema_path, schema)
        report = evaluate.check(self.run)
        self.assertEqual(report["versionChecks"], {"skill": False, "contract": False, "schema": False})
        self.assertEqual(report["structurallyValid"], 0)
        self.assertTrue(any("schema summary" in error for error in report["results"][0]["errors"]))
        self.assertEqual(report["validatorSha256"], evaluate.sha(self.root / "scripts/validate_plan.py"))

    def test_missing_input_and_malformed_output_are_per_case_failures(self):
        evaluate.prepare(self.run)
        for case_id in self.case_ids:
            self.output(case_id)
        (self.run / "inputs/CASE-A.json").unlink()
        output_path = self.run / "outputs/CASE-B.json"
        malformed = evaluate.read(output_path)
        malformed["proposal"] = [{"not": "a proposal object"}]
        evaluate.write(output_path, malformed)
        report = evaluate.check(self.run)
        self.assertEqual(report["total"], 3)
        self.assertEqual(report["structurallyValid"], 1)
        results = {item["id"]: item for item in report["results"]}
        for case_id in ("CASE-A", "CASE-B"):
            self.assertEqual(results[case_id]["status"], "failed")
            self.assertTrue(any(error.startswith("Invalid artifact:") for error in results[case_id]["errors"]))
        self.assertEqual(results["CASE-C"]["status"], "structurally_valid")

    def test_suite_selection_keeps_case_member_snapshot_and_unverified_data_empty(self):
        fixtures = evaluate.read(self.root / "evals/industry-fixtures.json")
        fixtures["scenarios"][0]["input"]["members"] = [{"id": "member", "name": "本案目录昵称"}]
        fixtures["scenarios"][1]["input"]["context"]["acl"]["status"] = "missing"
        evaluate.write(self.root / "evals/edge-fixtures.json", fixtures)
        (self.root / "evals/edge-expectations.json").write_bytes(self.original_expectations)
        evaluate.prepare(self.run, suite="edge")
        self.assertEqual(evaluate.read(self.run / "manifest.json")["suite"], "edge")
        self.assertEqual(evaluate.read(self.run / "inputs/CASE-A.json")["members"][0]["name"], "本案目录昵称")
        self.assertEqual(evaluate.read(self.run / "inputs/CASE-B.json")["members"], [])
        for case_id in self.case_ids:
            self.output(case_id)
        self.assertEqual(evaluate.check(self.run)["structurallyValid"], 3)

    def test_realistic_suite_can_be_prepared_and_checked(self):
        fixtures = evaluate.read(self.root / "evals/industry-fixtures.json")
        evaluate.write(self.root / "evals/realistic-fixtures.json", fixtures)
        (self.root / "evals/realistic-expectations.json").write_bytes(self.original_expectations)
        prepared = evaluate.prepare(self.run, suite="realistic", cases=["CASE-A"])
        self.assertEqual(prepared["prepared"], 1)
        self.assertEqual(evaluate.read(self.run / "manifest.json")["suite"], "realistic")
        self.output("CASE-A")
        self.assertEqual(evaluate.check(self.run)["structurallyValid"], 1)

    def test_duplicate_keys_and_nonfinite_numbers_fail_per_case_without_aborting_batch(self):
        evaluate.prepare(self.run)
        for case_id in self.case_ids:
            self.output(case_id)
        path = self.run / "outputs/CASE-A.json"
        path.write_text(path.read_text().replace('"externalEffects": "none"', '"externalEffects": "created", "externalEffects": "none"'))
        path = self.run / "outputs/CASE-B.json"
        path.write_text(path.read_text().replace('"baseRevision": 1', '"baseRevision": 1e999'))
        report = evaluate.check(self.run)
        self.assertEqual(report["total"], 3)
        self.assertEqual(report["structurallyValid"], 1)
        self.assertTrue(all(row["status"] == "failed" for row in report["results"][:2]))

    def test_case_guardrails_detect_scope_leak_and_missing_required_updates(self):
        expected = evaluate.read(self.expectations)
        expected["expectations"][0].update(mustNotExpose=["已撤权的原任务"], requiredUpdateTaskIds=["required-task"])
        evaluate.write(self.expectations, expected)
        evaluate.prepare(self.run, cases=["CASE-A"])
        self.output("CASE-A")
        path = self.run / "outputs/CASE-A.json"
        value = evaluate.read(path)
        value["summary"] = "继续处理已撤权的原任务"
        evaluate.write(path, value)
        errors = evaluate.check(self.run)["results"][0]["errors"]
        self.assertIn("Missing a required affected-task update", errors)
        self.assertIn("Output exposed data removed from the current authorized context", errors)

    def test_writer_rejects_nonfinite_values_before_leaving_an_artifact(self):
        path = self.directory / "bad-output.json"
        with self.assertRaises(ValueError):
            evaluate.write(path, {"estimate": float("nan")})
        self.assertFalse(path.exists())

    def test_required_handoffs_and_narrow_update_scope_use_the_resulting_graph(self):
        from test_validate_plan import replan
        source, output = replan()
        next(task for task in source["context"]["tasks"] if task["id"] == "b")["dependsOnTaskIds"] = ["a", "reference"]
        fixture_path = self.root / "evals/industry-fixtures.json"
        fixtures = evaluate.read(fixture_path)
        fixtures["scenarios"][0]["input"] = source
        evaluate.write(fixture_path, fixtures)
        expected = evaluate.read(self.expectations)
        expected["expectations"][0].update(allowedIntents=["replan"], allowedDispositions=["ready_for_confirmation"], maxCreates=0, maxUpdates=1, allowedUpdateTaskIds=["a"], requiredUpdateTaskIds=["a"], requiredDependencies=[{"taskId": "b", "dependsOnTaskIds": ["a"]}])
        evaluate.write(self.expectations, expected)
        evaluate.prepare(self.run, cases=["CASE-A"])
        path = self.run / "outputs/CASE-A.json"
        evaluate.write(path, output)
        self.assertEqual(evaluate.check(self.run)["structurallyValid"], 1)
        output["proposal"]["changes"].append({"id": "drop-handoff", "action": "update", "targetId": "b", "parentId": "root", "fields": {"dependsOnTaskIds": []}, "reason": "错误地删除交接", "evidenceRefs": ["req"]})
        output["proposal"]["preservedTaskIds"].remove("b")
        evaluate.write(path, output)
        errors = evaluate.check(self.run)["results"][0]["errors"]
        self.assertIn("maxUpdates: exceeded the case's allowed changes", errors)
        self.assertIn("Updated outside the case's requested scope", errors)
        self.assertIn("Missing required handoff dependencies for b", errors)

    def test_exact_dependencies_compare_the_unordered_final_graph_and_fall_back_to_snapshot(self):
        from test_validate_plan import replan, task

        source, output = replan()
        next(task for task in source["context"]["tasks"] if task["id"] == "b")["dependsOnTaskIds"] = ["a", "reference"]
        source["context"]["tasks"].append(task("other"))
        output["baseTaskVersions"]["other"] = 2
        output["proposal"]["preservedTaskIds"].append("other")
        fixture_path = self.root / "evals/industry-fixtures.json"
        fixtures = evaluate.read(fixture_path)
        fixtures["scenarios"][0]["input"] = source
        evaluate.write(fixture_path, fixtures)
        expected = evaluate.read(self.expectations)
        expected["expectations"][0].update(
            allowedIntents=["replan"],
            allowedDispositions=["ready_for_confirmation"],
            exactDependencies=[{"taskId": "b", "dependsOnTaskIds": ["reference", "a"]}],
        )
        evaluate.write(self.expectations, expected)
        evaluate.prepare(self.run, cases=["CASE-A"])
        path = self.run / "outputs/CASE-A.json"
        evaluate.write(path, output)

        self.assertEqual(evaluate.check(self.run)["structurallyValid"], 1)

        output["proposal"]["changes"].append({
            "id": "drop-one-handoff", "action": "update", "targetId": "b", "parentId": "root",
            "fields": {"dependsOnTaskIds": ["a"]}, "reason": "错误地删除一个既有交接", "evidenceRefs": ["req"],
        })
        output["proposal"]["preservedTaskIds"].remove("b")
        evaluate.write(path, output)
        errors = evaluate.check(self.run)["results"][0]["errors"]
        self.assertIn("Final dependency set does not exactly match for b", errors)

        output["proposal"]["changes"][-1]["fields"]["dependsOnTaskIds"] = ["other", "a", "reference"]
        evaluate.write(path, output)
        errors = evaluate.check(self.run)["results"][0]["errors"]
        self.assertIn("Final dependency set does not exactly match for b", errors)

    def test_evidence_alternatives_are_explicit_groups_not_transitive_reference_expansion(self):
        expected = evaluate.read(self.expectations)
        expected["expectations"][0]["requiredEvidenceGroups"] = [["request-CASE-A", "equivalent-request-record"]]
        evaluate.write(self.expectations, expected)
        evaluate.prepare(self.run, cases=["CASE-A"])
        self.output("CASE-A")
        self.assertIn("Missing a required equivalent-evidence group", evaluate.check(self.run)["results"][0]["errors"])
        path = self.run / "outputs/CASE-A.json"
        value = evaluate.read(path)
        value["reasoningSummary"] = [{"text": "该请求只需查询", "evidenceRefs": ["request-CASE-A"]}]
        evaluate.write(path, value)
        self.assertEqual(evaluate.check(self.run)["structurallyValid"], 1)


if __name__ == "__main__":
    unittest.main()
