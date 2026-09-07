"""Regression tests for the dense synthetic collaboration corpus."""

from copy import deepcopy
from datetime import date, timedelta
from pathlib import Path
import unittest

from validate_plan import read_json
from validate_realistic_data import validate


ROOT = Path(__file__).resolve().parents[1]


class RealisticCorpusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures = read_json(ROOT / "evals/realistic-fixtures.json")
        cls.expectations = read_json(ROOT / "evals/realistic-expectations.json")

    def test_corpus_is_dense_and_referentially_valid(self):
        summary, errors = validate(self.fixtures, self.expectations)
        self.assertEqual(errors, [])
        totals = summary["totals"]
        self.assertEqual(totals["scenarios"], 12)
        self.assertGreaterEqual(totals["members"], 72)
        self.assertGreaterEqual(totals["tasks"], 120)
        self.assertGreaterEqual(totals["files"], 60)
        self.assertGreaterEqual(totals["discussions"], 72)
        self.assertGreaterEqual(totals["history"], 48)
        self.assertGreaterEqual(totals["dependencyEdges"], 48)
        self.assertEqual(len({case["industry"] for case in summary["cases"]}), 12)
        self.assertEqual({case["historyProfile"] for case in summary["cases"]}, {"rich", "none", "partial"})

    def test_equivalent_formal_hard_boundary_evidence_is_not_locked_to_one_id(self):
        expectation = next(
            item
            for item in self.expectations["expectations"]
            if item["scenarioId"] == "REAL-C-04"
        )

        self.assertNotIn("rn-hard-handover", expectation["requiredEvidenceRefs"])
        self.assertTrue(
            any(
                {
                    "rn-hard-handover",
                    "rn-d5",
                    "rn-h4",
                    "rn-file-key-check-v4",
                    "rn-key-handover",
                }
                <= set(group)
                for group in expectation["requiredEvidenceGroups"]
            )
        )

    def test_file_metadata_cannot_masquerade_as_loaded_content(self):
        fixtures = deepcopy(self.fixtures)
        scenario = fixtures["scenarios"][0]
        file_id = scenario["input"]["context"]["files"][0]["id"]
        scenario["input"]["context"]["sourceRefs"] = [
            item for item in scenario["input"]["context"]["sourceRefs"] if item["id"] != file_id
        ]
        _, errors = validate(fixtures, self.expectations)
        self.assertTrue(any(f"file {file_id} needs a same-id" in error for error in errors))

    def test_dependency_cycle_is_rejected(self):
        fixtures = deepcopy(self.fixtures)
        tasks = fixtures["scenarios"][0]["input"]["context"]["tasks"]
        tasks[0]["dependsOnTaskIds"] = [tasks[1]["id"]]
        tasks[1]["dependsOnTaskIds"] = [tasks[0]["id"]]
        _, errors = validate(fixtures, self.expectations)
        self.assertTrue(any("dependency graph contains a cycle" in error for error in errors))

    def test_dangling_discussion_reply_is_rejected(self):
        fixtures = deepcopy(self.fixtures)
        discussion = fixtures["scenarios"][0]["input"]["context"]["discussions"][0]
        discussion["replyToId"] = "missing-discussion"
        _, errors = validate(fixtures, self.expectations)
        self.assertTrue(any("dangling reply" in error for error in errors))

    def test_cross_thread_reply_is_rejected(self):
        fixtures = deepcopy(self.fixtures)
        discussions = fixtures["scenarios"][0]["input"]["context"]["discussions"]
        parent = discussions[0]
        child = next(item for item in discussions if item["threadId"] != parent["threadId"])
        child["replyToId"] = parent["id"]
        _, errors = validate(fixtures, self.expectations)
        self.assertTrue(any("replies across threads" in error for error in errors))

    def test_child_due_date_after_ancestor_is_rejected(self):
        fixtures = deepcopy(self.fixtures)
        tasks = fixtures["scenarios"][0]["input"]["context"]["tasks"]
        task_map = {task["id"]: task for task in tasks}
        child = next(
            task
            for task in tasks
            if task.get("dueOn") and task.get("parentId") in task_map and task_map[task["parentId"]].get("dueOn")
        )
        parent = task_map[child["parentId"]]
        child["dueOn"] = (date.fromisoformat(parent["dueOn"]) + timedelta(days=1)).isoformat()

        _, errors = validate(fixtures, self.expectations)

        self.assertIn(
            f"scenario REAL-A-REL-01: task {child['id']} dueOn exceeds ancestor {parent['id']}",
            errors,
        )

    def test_discussion_reply_not_later_than_parent_is_rejected(self):
        fixtures = deepcopy(self.fixtures)
        discussions = fixtures["scenarios"][0]["input"]["context"]["discussions"]
        discussion_map = {item["id"]: item for item in discussions}
        reply = next(item for item in discussions if item.get("replyToId"))
        parent = discussion_map[reply["replyToId"]]
        reply["createdAt"] = parent["createdAt"]

        _, errors = validate(fixtures, self.expectations)

        self.assertIn(
            f"scenario REAL-A-REL-01: discussion {reply['id']} reply is not later than its parent",
            errors,
        )

    def test_external_stakeholder_cannot_be_made_assignable(self):
        fixtures = deepcopy(self.fixtures)
        scenario = next(item for item in fixtures["scenarios"] if item["input"]["context"].get("stakeholders"))
        stakeholder = scenario["input"]["context"]["stakeholders"][0]
        stakeholder["assignable"] = True

        _, errors = validate(fixtures, self.expectations)

        self.assertIn(
            f"scenario {scenario['id']}: stakeholder {stakeholder['id']} must be non-assignable",
            errors,
        )

    def test_stakeholder_id_cannot_collide_with_assignable_member_namespace(self):
        fixtures = deepcopy(self.fixtures)
        scenario = next(item for item in fixtures["scenarios"] if item["input"]["context"].get("stakeholders"))
        stakeholder = scenario["input"]["context"]["stakeholders"][0]
        team = next(item for item in fixtures["teams"] if item["teamId"] == scenario["teamId"])
        member_id = scenario["input"].get("members", team["members"])[0]["id"]
        stakeholder["id"] = member_id

        _, errors = validate(fixtures, self.expectations)

        self.assertIn(f"scenario {scenario['id']}: stakeholder ids overlap assignable members", errors)
        self.assertIn(f"scenario {scenario['id']}: ambiguous evidence id {member_id}", errors)

    def test_loaded_file_metadata_must_match_same_id_source_ref(self):
        fixtures = deepcopy(self.fixtures)
        scenario = fixtures["scenarios"][0]
        context = scenario["input"]["context"]
        file_record = context["files"][0]
        source_ref = next(item for item in context["sourceRefs"] if item["id"] == file_record["id"])
        source_ref["version"] = file_record["version"] + 1

        _, errors = validate(fixtures, self.expectations)

        self.assertIn(
            f"scenario {scenario['id']}: file {file_record['id']} version disagrees with its sourceRef",
            errors,
        )

    def test_file_source_ref_excerpt_must_identify_status(self):
        fixtures = deepcopy(self.fixtures)
        scenario = next(
            item
            for item in fixtures["scenarios"]
            if any(
                source_ref.get("source") == "synthetic_file_store" and "status" not in source_ref
                for source_ref in item["input"]["context"]["sourceRefs"]
            )
        )
        context = scenario["input"]["context"]
        file_record = context["files"][0]
        source_ref = next(item for item in context["sourceRefs"] if item["id"] == file_record["id"])
        self.assertNotIn("status", source_ref)
        self.assertIn(str(file_record["status"]), source_ref["text"])
        source_ref["text"] = source_ref["text"].replace(str(file_record["status"]), "status-mismatch", 1)

        _, errors = validate(fixtures, self.expectations)

        self.assertIn(
            f"scenario {scenario['id']}: file {file_record['id']} sourceRef excerpt does not identify its version/status/checksum/task links",
            errors,
        )

    def test_exact_dependency_expectations_must_reference_visible_tasks(self):
        expectations = deepcopy(self.expectations)
        case = expectations["expectations"][0]
        case["exactDependencies"] = [{
            "taskId": "missing-consumer",
            "dependsOnTaskIds": ["missing-producer"],
        }]

        _, errors = validate(self.fixtures, expectations)

        self.assertIn(
            "scenario REAL-A-REL-01: exact dependency consumer is not an existing task",
            errors,
        )
        self.assertIn(
            "scenario REAL-A-REL-01: exact dependency references an unknown result",
            errors,
        )

    def test_exact_dependency_expectations_cannot_contradict_required_subset(self):
        expectations = deepcopy(self.expectations)
        case = expectations["expectations"][0]
        case["requiredDependencies"] = [{
            "taskId": "rel-security-gate",
            "dependsOnTaskIds": ["rel-notary", "rel-smoke"],
        }]
        case["exactDependencies"] = [{
            "taskId": "rel-security-gate",
            "dependsOnTaskIds": ["rel-notary"],
        }]

        _, errors = validate(self.fixtures, expectations)

        self.assertIn(
            "scenario REAL-A-REL-01: required dependency set contradicts exact dependency set for rel-security-gate",
            errors,
        )


if __name__ == "__main__":
    unittest.main()
