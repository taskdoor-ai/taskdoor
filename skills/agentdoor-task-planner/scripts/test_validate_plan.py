"""Self-contained deterministic contract tests; no industry answer files or network."""
from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from validate_plan import validate


def inputs():
    return {
        "requestId": "req", "message": "准备本期交付", "revision": 3,
        "currentDate": "2026-09-01", "timezone": "Asia/Shanghai", "currentUserId": "m1",
        "teamId": "team", "authorizedTeamIds": ["team"], "confirmedFields": [],
        "members": [{"id": "m1", "name": "甲", "evidence": [{"id": "member-evidence", "text": "负责交付"}]}, {"id": "m2", "name": "乙"}],
        "context": {
            "snapshotId": "snapshot", "acl": {"status": "verified", "scopeTeamIds": ["team"]},
            "coverage": dict.fromkeys(("tasks", "subtasks", "discussions", "history"), "complete"),
            "tasks": [], "discussions": [], "history": [], "sourceRefs": [{"id": "document", "text": "客户确认"}],
        },
        "duplicateSearch": {"status": "completed", "scopeTeamIds": ["team"], "matches": [], "coverageNote": "授权范围已完整检索"},
    }


def fields(root=False):
    result = {
        "title": "可核对的交付", "acceptanceCriteria": ["提交清单并核对全部条目"],
        "ownerRecommendation": {"memberId": None, "basis": "unassigned", "reason": "职责待核对", "evidenceRefs": ["req"]},
        "participantRecommendations": [],
        "schedule": {"startOn": None, "dueOn": None, "basis": "unknown", "assumptions": [], "evidenceRefs": ["req"]},
        "estimate": {"ewdHours": None, "basis": "unknown", "assumptions": [], "evidenceRefs": ["req"]},
        "dependsOnTaskIds": [],
    }
    if root:
        result["goal"] = {"text": "交付结果可核对", "basis": "explicit", "evidenceRefs": ["req"]}
    return result


def task(task_id, parent=None, status="open", due=None, deps=None):
    return {"id": task_id, "parentId": parent, "title": task_id, "status": status, "version": 2,
            "goal": "交付结果可核对" if parent is None else None,
            "acceptanceCriteria": ["原有标准"], "ownerId": "m1", "dueOn": due,
            "dependsOnTaskIds": deps or [], "sourceRefs": ["delivery-evidence"]}


def output_for(data):
    duplicate = data["duplicateSearch"]
    return {
        "schemaVersion": "agentdoor.task-plan.v0.2", "requestId": data["requestId"],
        "baseSnapshotId": data["context"]["snapshotId"], "baseRevision": data["revision"],
        "baseTaskVersions": {item["id"]: item["version"] for item in data["context"]["tasks"]},
        "intent": "create", "disposition": "ready_for_confirmation", "summary": "建议预览本期交付",
        "reasoningSummary": [{"text": "用户请求了本期交付", "evidenceRefs": ["req"]}],
        "proposal": {"rootTaskId": "new:root", "complexity": "simple", "changes": [{
            "id": "change-root", "action": "create", "targetId": "new:root", "parentId": None,
            "fields": fields(True), "reason": "本期需要独立交付", "evidenceRefs": ["req"],
        }], "preservedTaskIds": [item["id"] for item in data["context"]["tasks"]]},
        "duplicateCheck": {"status": duplicate["status"], "scopeTeamIds": duplicate["scopeTeamIds"], "coverageNote": duplicate["coverageNote"], "assessments": [
            {"taskId": match["taskId"], "relationship": "different_instance", "reason": "本次周期不同", "evidenceRefs": [match["taskId"]]} for match in duplicate["matches"]
        ]},
        "questions": [], "warnings": ["负责人待推荐，不代表已经提交"],
        "nextActions": [{"action": "review_proposal", "taskId": "new:root", "label": "预览方案"}], "externalEffects": "none",
    }


def replan():
    data = inputs()
    data["currentTaskId"] = "root"
    data["context"]["tasks"] = [task("root", due="2026-09-30"), task("a", "root", due="2026-09-10"), task("b", "root", due="2026-09-20", deps=["a"]), task("reference")]
    result = output_for(data)
    result["intent"] = "replan"
    result["proposal"] = {"rootTaskId": "root", "complexity": "complex", "changes": [{
        "id": "update-a", "action": "update", "targetId": "a", "parentId": "root", "fields": {"title": "新的独立交付"}, "reason": "明确交付范围", "evidenceRefs": ["req", "a"],
    }], "preservedTaskIds": ["root", "b", "reference"]}
    result["nextActions"][0]["taskId"] = "root"
    return data, result


class ValidatorTests(unittest.TestCase):
    def test_minimal_creation_owner_null_and_no_mutation(self):
        data = inputs()
        result = output_for(data)
        before = deepcopy((data, result))
        self.assertEqual(validate(data, result), [])
        self.assertEqual((data, result), before)

    def test_simple_has_no_descendants_but_complex_accepts_partial_updates(self):
        data = inputs()
        result = output_for(data)
        result["proposal"]["changes"].append({
            "id": "create-child", "action": "create", "targetId": "new:child", "parentId": "new:root",
            "fields": fields(), "reason": "独立交付", "evidenceRefs": ["req"],
        })
        self.assertTrue(validate(data, result), "a simple task cannot quietly gain a child")
        result["proposal"]["complexity"] = "complex"
        self.assertEqual(validate(data, result), [])
        given, planned = replan()
        self.assertEqual(validate(given, planned), [], "complexity is based on the effective tree, not change count")
        planned["proposal"]["complexity"] = "simple"
        self.assertTrue(validate(given, planned))

    def test_snapshot_and_schema_mutations(self):
        data = inputs()
        for field, value in [("requestId", "other"), ("baseSnapshotId", "stale"), ("baseRevision", 4), ("baseTaskVersions", {"invented": 1}), ("externalEffects", "created")]:
            result = output_for(data)
            result[field] = value
            with self.subTest(field=field):
                self.assertTrue(validate(data, result))
        for illegal in ("ownerId", "status", "actualHours"):
            result = output_for(data)
            result["proposal"]["changes"][0]["fields"][illegal] = "invented"
            self.assertTrue(validate(data, result))

    def test_known_evidence_and_member_references(self):
        data, result = replan()
        data["context"]["discussions"] = [{"id": "discussion", "taskId": "root", "text": "讨论"}]
        data["context"]["history"] = [{"id": "history", "taskId": "root", "summary": "历史"}]
        data["context"]["sourceRefs"].append({"id": "delivery-evidence", "text": "已读取交付证据"})
        result["reasoningSummary"][0]["evidenceRefs"] = ["req", "m1", "member-evidence", "a", "discussion", "history", "document", "delivery-evidence"]
        self.assertEqual(validate(data, result), [])
        result["reasoningSummary"][0]["evidenceRefs"].append("fabricated-source")
        self.assertTrue(validate(data, result))
        data["context"]["tasks"][0]["sourceRefs"].append("not-loaded")
        result["reasoningSummary"][0]["evidenceRefs"] = ["not-loaded"]
        self.assertTrue(validate(data, result), "a source pointer does not prove its content was loaded")
        data = inputs()
        for location in ("owner", "participant"):
            result = output_for(data)
            change = result["proposal"]["changes"][0]["fields"]
            if location == "owner":
                change["ownerRecommendation"].update(memberId="outsider", basis="recommended")
            else:
                change["participantRecommendations"] = [{"memberId": "outsider", "contribution": "核对", "evidenceRefs": ["req"]}]
            self.assertTrue(validate(data, result))

    def test_file_catalog_requires_visible_links_and_loaded_excerpt_for_evidence(self):
        data = inputs()
        data["context"]["coverage"]["files"] = "complete"
        data["context"]["files"] = [{
            "id": "file-brief", "fileName": "项目简报-v3.pdf", "mimeType": "application/pdf",
            "version": "v3", "status": "approved", "source": "synthetic_file_store",
            "linkedTaskIds": [],
        }]
        result = output_for(data)
        result["reasoningSummary"][0]["evidenceRefs"] = ["file-brief"]
        self.assertTrue(validate(data, result), "file metadata alone does not prove the file contents were read")
        data["context"]["sourceRefs"].append({"id": "file-brief", "title": "项目简报 v3 节选", "text": "上线范围已确认"})
        self.assertEqual(validate(data, result), [])
        data["context"]["files"][0]["linkedTaskIds"] = ["missing-task"]
        self.assertTrue(validate(data, result), "file links must stay inside the visible task snapshot")

        data = inputs()
        data["context"]["acl"]["status"] = "missing"
        data["context"]["files"] = [{
            "id": "file-secret", "fileName": "未授权.xlsx", "mimeType": "application/vnd.ms-excel",
            "version": 1, "status": "active", "source": "synthetic_file_store", "linkedTaskIds": [],
        }]
        self.assertTrue(validate(data, output_for(data)), "unverified ACL cannot carry file metadata")

    def test_external_stakeholders_explain_authors_but_are_not_evidence_or_assignees(self):
        data = inputs()
        data["context"]["stakeholders"] = [{
            "id": "external-approver", "name": "客户审批人（合成）", "role": "客户审批人",
            "relationship": "client_approver", "assignable": False,
        }]
        data["context"]["discussions"] = [{
            "id": "external-decision", "taskId": None, "authorId": "external-approver",
            "kind": "decision", "text": "本轮范围已确认",
        }]
        result = output_for(data)
        result["reasoningSummary"][0]["evidenceRefs"] = ["external-decision"]
        self.assertEqual(validate(data, result), [])
        result["reasoningSummary"][0]["evidenceRefs"] = ["external-approver"]
        self.assertTrue(validate(data, result), "speaker metadata is not a loaded decision source")
        result = output_for(data)
        result["proposal"]["changes"][0]["fields"]["ownerRecommendation"] = {
            "memberId": "external-approver", "basis": "recommended", "reason": "客户确认范围", "evidenceRefs": ["external-decision"],
        }
        self.assertTrue(validate(data, result), "external speakers cannot become owner candidates")
        data["context"]["stakeholders"][0]["assignable"] = True
        self.assertTrue(validate(data, output_for(data)))

    def test_acl_and_incomplete_context_are_not_ready(self):
        data, result = replan()
        data["context"]["coverage"]["discussions"] = "partial"
        self.assertTrue(validate(data, result))
        result["disposition"] = "needs_clarification"
        result["nextActions"] = [{"action": "retry_context", "taskId": "root", "label": "补读相关讨论"}]
        self.assertEqual(validate(data, result), [])
        data["context"]["acl"]["status"] = "missing"
        self.assertTrue(validate(data, result))
        result["proposal"] = None
        self.assertTrue(validate(data, result), "null proposal still exposes task IDs from an unverified snapshot")
        data["context"]["tasks"] = []
        data["members"] = []
        result["baseTaskVersions"] = {}
        result["nextActions"][0]["taskId"] = None
        self.assertEqual(validate(data, result), [])

    def test_duplicate_truth_coverage_and_each_candidate(self):
        data = inputs()
        data["context"]["tasks"] = [task("prior", status="completed")]
        data["duplicateSearch"]["matches"] = [{"taskId": "prior", "title": "旧周期", "reason": "交付相似"}]
        result = output_for(data)
        self.assertEqual(validate(data, result), [])
        data["authorizedTeamIds"].append("another-visible-team")
        self.assertEqual(validate(data, result), [], "access to another team does not require reading it")
        missing_current = deepcopy(data)
        missing_current["duplicateSearch"]["scopeTeamIds"] = ["another-visible-team"]
        self.assertTrue(validate(missing_current, output_for(missing_current)))
        for relation in ("same_outcome", "overlap", "possible"):
            bad = deepcopy(result)
            bad["duplicateCheck"]["assessments"][0]["relationship"] = relation
            self.assertTrue(validate(data, bad))
            bad["disposition"] = "needs_clarification"
            bad["questions"] = [{"field": "identity", "question": "本期是否为不同交付？", "blocking": True}]
            self.assertEqual(validate(data, bad), [])
        bad = deepcopy(result)
        bad["duplicateCheck"]["assessments"] = []
        self.assertTrue(validate(data, bad))
        bad = deepcopy(result)
        bad["duplicateCheck"]["scopeTeamIds"].append("unauthorized")
        self.assertTrue(validate(data, bad))
        data["duplicateSearch"]["status"] = "partial"
        self.assertTrue(validate(data, result), "cannot claim completed for partial search")

    def test_task_identity_preservation_and_terminal_protection(self):
        data, result = replan()
        self.assertEqual(validate(data, result), [])
        for mutation in ("unknown", "move", "terminal", "preserved", "same", "other-tree", "replace-root"):
            given, bad = deepcopy(data), deepcopy(result)
            change = bad["proposal"]["changes"][0]
            if mutation == "unknown":
                change["targetId"] = "not-visible"
            elif mutation == "move":
                change["parentId"] = "reference"
            elif mutation == "terminal":
                given["context"]["tasks"][1]["status"] = "completed"
            elif mutation == "preserved":
                bad["proposal"]["preservedTaskIds"].remove("b")
            elif mutation == "same":
                change["fields"]["title"] = "a"
            elif mutation == "other-tree":
                change.update(targetId="reference", parentId=None)
                bad["proposal"]["preservedTaskIds"] = ["root", "a", "b"]
            else:
                bad["proposal"]["rootTaskId"] = "reference"
            with self.subTest(mutation=mutation):
                self.assertTrue(validate(given, bad))

    def test_confirmed_mapping_and_unmodified_fields(self):
        data, result = replan()
        data["confirmedFields"] = [{"taskId": "a", "field": "ownerId", "value": "m1"}]
        self.assertEqual(validate(data, result), [])
        samples = [
            ("title", "a", {"title": "changed"}),
            ("acceptanceCriteria", ["原有标准"], {"acceptanceCriteria": ["新标准"]}),
            ("ownerId", "m1", {"ownerRecommendation": {"memberId": "m2", "basis": "recommended", "reason": "待确认提议", "evidenceRefs": ["m2"]}}),
            ("dueOn", "2026-09-10", {"schedule": {"startOn": None, "dueOn": "2026-09-11", "basis": "recommended", "assumptions": [], "evidenceRefs": ["req"]}}),
        ]
        for field, value, patch in samples:
            given, bad = deepcopy(data), deepcopy(result)
            given["confirmedFields"] = [{"taskId": "a", "field": field, "value": value}]
            bad["proposal"]["changes"][0]["fields"] = patch
            with self.subTest(field=field):
                self.assertTrue(validate(given, bad))
        for goal in ("交付结果可核对", {"text": "交付结果可核对", "basis": "confirmed"}):
            given, bad = deepcopy(data), deepcopy(result)
            given["confirmedFields"] = [{"taskId": "root", "field": "goal", "value": goal}]
            bad["proposal"]["changes"][0].update(targetId="root", parentId=None, fields={"goal": {"text": "改变已确认目标", "basis": "inferred", "evidenceRefs": ["req"]}})
            bad["proposal"]["preservedTaskIds"] = ["a", "b", "reference"]
            self.assertTrue(validate(given, bad))

    def test_calendar_dependencies_parent_tree_and_estimate(self):
        data, result = replan()
        for mutation in ("invalid-date", "reversed", "late-prerequisite", "cycle", "dangling", "self", "parent", "cancelled", "double-effort"):
            given, bad = deepcopy(data), deepcopy(result)
            change = bad["proposal"]["changes"][0]
            if mutation in {"invalid-date", "reversed", "late-prerequisite"}:
                start, due = {"invalid-date": (None, "2026-02-30"), "reversed": ("2026-09-12", "2026-09-10"), "late-prerequisite": (None, "2026-09-25")}[mutation]
                change["fields"]["schedule"] = {"startOn": start, "dueOn": due, "basis": "recommended", "assumptions": [], "evidenceRefs": ["req"]}
            elif mutation == "cancelled":
                given["context"]["tasks"][1]["status"] = "cancelled"
            elif mutation == "double-effort":
                change.update(targetId="root", parentId=None, fields={"estimate": {"ewdHours": 8, "basis": "model", "assumptions": ["当前工具方式"], "evidenceRefs": ["req"]}})
                bad["proposal"]["preservedTaskIds"] = ["a", "b", "reference"]
            else:
                change["fields"]["dependsOnTaskIds"] = [{"cycle": "b", "dangling": "missing", "self": "a", "parent": "root"}[mutation]]
            with self.subTest(mutation=mutation):
                self.assertTrue(validate(given, bad))

    def test_next_batch_does_not_extend_completed_tree(self):
        data = inputs()
        data["currentTaskId"] = "done"
        data["context"]["tasks"] = [task("done", status="completed")]
        result = output_for(data)
        result["intent"] = "next_batch"
        result["proposal"]["changes"][0]["evidenceRefs"].append("done")
        self.assertEqual(validate(data, result), [])
        result["proposal"]["rootTaskId"] = "done"
        change = result["proposal"]["changes"][0]
        change["parentId"] = "done"
        del change["fields"]["goal"]
        self.assertTrue(validate(data, result))

    def test_null_routes_no_change_and_cli(self):
        data = inputs()
        result = output_for(data)
        result.update(intent="query", disposition="route_required", proposal=None, nextActions=[])
        self.assertEqual(validate(data, result), [])
        result.update(intent="refine", disposition="no_change")
        self.assertEqual(validate(data, result), [])
        result.update(intent="unclear", disposition="needs_clarification", questions=[{"field": "outcome", "question": "希望达到什么结果？", "blocking": True}])
        self.assertEqual(validate(data, result), [])
        with tempfile.TemporaryDirectory() as folder:
            source, proposed = Path(folder) / "input.json", Path(folder) / "output.json"
            source.write_text(json.dumps(data), encoding="utf-8")
            proposed.write_text(json.dumps(result), encoding="utf-8")
            run = subprocess.run([sys.executable, str(Path(__file__).with_name("validate_plan.py")), "--input", str(source), "--output", str(proposed)], capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            self.assertTrue(json.loads(run.stdout)["valid"])


if __name__ == "__main__":
    unittest.main()
