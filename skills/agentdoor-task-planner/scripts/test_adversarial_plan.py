"""Adversarial observable contract checks, independent of industry answer files."""
from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from test_validate_plan import fields, inputs, output_for, replan, task
from validate_plan import loads_strict, read_json, validate


def route(data):
    result = output_for(data)
    result.update(intent="query", disposition="route_required", proposal=None, nextActions=[])
    return result


def overlap_proposal():
    data = inputs()
    data["context"]["tasks"] = [task("existing-faq")]
    data["duplicateSearch"]["matches"] = [{"taskId": "existing-faq", "title": "既有FAQ", "reason": "部分覆盖"}]
    result = output_for(data)
    assessment = result["duplicateCheck"]["assessments"][0]
    assessment.update(relationship="overlap", resolution={
        "kind": "propose_uncovered_scope", "newScope": "新增开箱说明，保留现有FAQ与培训交付",
        "changeIds": ["change-root"], "evidenceRefs": ["existing-faq", "req"],
    })
    return data, result


class AdversarialPlanTests(unittest.TestCase):
    def test_unverified_acl_cannot_expose_existing_objects_or_actions(self):
        for action in ("open_task", "retry_context"):
            data, result = replan()
            data["context"]["acl"]["status"] = "missing"
            result.update(proposal=None, disposition="needs_clarification",
                          questions=[{"field": "acl", "question": "请补读授权范围", "blocking": True}],
                          nextActions=[{"action": action, "taskId": "a", "label": "查看记录"}])
            result["reasoningSummary"][0]["evidenceRefs"] = ["a", "m1", "document"]
            with self.subTest(action=action):
                self.assertTrue(validate(data, result))

    def test_missing_acl_can_explain_access_failure_from_provided_source(self):
        data = inputs()
        data["members"] = []
        data["context"]["acl"] = {"status": "missing", "scopeTeamIds": []}
        result = route(data)
        result.update(intent="unclear", disposition="needs_clarification",
                      questions=[{"field": "acl", "question": "请授权读取本团队资料", "blocking": True}],
                      nextActions=[{"action": "retry_context", "taskId": None, "label": "补读授权"}])
        result["reasoningSummary"][0]["evidenceRefs"] = ["req", "document"]
        self.assertEqual(validate(data, result), [])

    def test_acl_scope_is_checked_even_without_proposal(self):
        data = inputs()
        data["context"]["acl"]["scopeTeamIds"].append("not-authorized")
        self.assertTrue(validate(data, route(data)))

    def test_explicit_foreign_team_records_are_not_treated_as_authorized(self):
        for kind in ("tasks", "members", "sourceRefs", "discussions", "history"):
            data, result = replan()
            if kind == "members":
                data[kind][0]["teamId"] = "foreign"
            elif kind in {"discussions", "history"}:
                data["context"][kind] = [{"id": kind, "taskId": "a", "teamId": "foreign"}]
            else:
                data["context"][kind][0]["teamId"] = "foreign"
            with self.subTest(kind=kind):
                self.assertTrue(validate(data, result))

    def test_other_authorized_team_can_be_read_but_not_changed(self):
        data, result = replan()
        data["authorizedTeamIds"].append("other")
        data["context"]["acl"]["scopeTeamIds"].append("other")
        data["context"]["tasks"][-1]["teamId"] = "other"
        result["reasoningSummary"][0]["evidenceRefs"].append("reference")
        self.assertEqual(validate(data, result), [])
        data["context"]["tasks"][1]["teamId"] = "other"
        self.assertTrue(validate(data, result))

    def test_duplicate_or_cross_namespace_source_ids_are_ambiguous(self):
        for duplicate in ({"id": "document", "text": "另一版本正文"},
                          {"id": "m1", "text": "伪装成员"},
                          {"id": "req", "text": "伪装用户输入"}):
            data = inputs()
            data["context"]["sourceRefs"].append(duplicate)
            with self.subTest(id=duplicate["id"]):
                self.assertTrue(validate(data, output_for(data)))

    def test_arbitrary_nested_ids_do_not_create_evidence(self):
        for where in ("source", "task", "member"):
            data, result = replan()
            record = {"source": data["context"]["sourceRefs"][0],
                      "task": data["context"]["tasks"][0], "member": data["members"][0]}[where]
            record["payload"] = {"id": "invented", "text": "不是已加载来源"}
            result["reasoningSummary"][0]["evidenceRefs"] = ["invented"]
            with self.subTest(where=where):
                self.assertTrue(validate(data, result))

    def test_visible_member_evidence_is_still_a_valid_source(self):
        data = inputs()
        result = output_for(data)
        result["reasoningSummary"][0]["evidenceRefs"] = ["member-evidence"]
        self.assertEqual(validate(data, result), [])

    def test_confirmed_fields_reject_unknown_alias_instead_of_ignoring_it(self):
        for alias in ("dueDate", "owner", "goalText", "schedule/dueOn", "ewdHours"):
            data, result = replan()
            data["confirmedFields"] = [{"taskId": "a", "field": alias, "value": "locked"}]
            with self.subTest(alias=alias):
                self.assertTrue(validate(data, result))

    def test_confirmed_nested_paths_and_goal_string_object_equivalence(self):
        data, result = replan()
        result["proposal"]["changes"][0].update(targetId="root", parentId=None)
        result["proposal"]["preservedTaskIds"] = ["a", "b", "reference"]
        for confirmed in ("交付结果可核对", {"text": "交付结果可核对", "basis": "confirmed"}):
            data["confirmedFields"] = [{"taskId": "root", "field": "goal", "value": confirmed}]
            result["proposal"]["changes"][0]["fields"] = {"title": "更清楚的名称", "goal": {
                "text": "改变目标", "basis": "inferred", "evidenceRefs": ["req"]}}
            self.assertTrue(validate(data, result))
        data, result = replan()
        data["confirmedFields"] = [{"taskId": "a", "field": "ownerRecommendation.memberId", "value": "m1"}]
        result["proposal"]["changes"][0]["fields"]["ownerRecommendation"] = {
            "memberId": "m2", "basis": "recommended", "reason": "换个候选", "evidenceRefs": ["m2"]}
        self.assertTrue(validate(data, result))

    def test_empty_or_malformed_confirmation_cannot_disable_a_lock(self):
        for lock in ({"taskId": "a", "field": "title"}, {"taskId": "a", "field": []},
                     {"taskId": "missing", "field": "title", "value": "锁定"}):
            data, result = replan()
            data["confirmedFields"] = [lock]
            with self.subTest(lock=lock):
                self.assertTrue(validate(data, result))

    def test_owner_and_participant_id_rules(self):
        for mutation in ("unknown-owner", "unassigned-with-id", "known-without-id", "duplicate-participant", "unknown-participant"):
            data = inputs()
            result = output_for(data)
            patch = result["proposal"]["changes"][0]["fields"]
            if mutation == "unknown-owner":
                patch["ownerRecommendation"].update(memberId="outsider", basis="recommended")
            elif mutation == "unassigned-with-id":
                patch["ownerRecommendation"]["memberId"] = "m1"
            elif mutation == "known-without-id":
                patch["ownerRecommendation"]["basis"] = "explicit"
            else:
                person = {"memberId": "m2" if mutation == "duplicate-participant" else "outsider", "contribution": "核对", "evidenceRefs": ["req"]}
                patch["participantRecommendations"] = [person, deepcopy(person)] if mutation == "duplicate-participant" else [person]
            with self.subTest(mutation=mutation):
                self.assertTrue(validate(data, result))

    def test_existing_draft_requires_one_normalized_task_snapshot(self):
        data, result = replan()
        data["currentDraft"] = {"rootTaskId": "root", "tasks": [{"id": "a", "title": "冲突的旧草稿"}]}
        self.assertTrue(validate(data, result))
        data.pop("currentDraft")
        data["context"]["tasks"][1]["id"] = "new:stable-draft"
        data["context"]["tasks"][2]["dependsOnTaskIds"] = ["new:stable-draft"]
        result["baseTaskVersions"].pop("a")
        result["baseTaskVersions"]["new:stable-draft"] = 2
        result["proposal"]["changes"][0]["targetId"] = "new:stable-draft"
        result["proposal"]["changes"][0]["evidenceRefs"] = ["req", "new:stable-draft"]
        self.assertEqual(validate(data, result), [])

    def test_partial_reads_allow_blocked_proposal_but_never_ready(self):
        for section in ("tasks", "subtasks", "discussions"):
            data, result = replan()
            data["context"]["coverage"][section] = "partial"
            self.assertTrue(validate(data, result))
            result.update(disposition="needs_clarification", nextActions=[{
                "action": "retry_context", "taskId": "root", "label": "补读当前任务资料"}])
            self.assertEqual(validate(data, result), [])

    def test_invalid_input_shapes_return_errors_without_crashing(self):
        cases = [("context", []), ("members", None), ("members", [None]),
                 ("authorizedTeamIds", None), ("authorizedTeamIds", "team"),
                 ("duplicateSearch", 1), ("confirmedFields", [None]),
                 ("context.acl", ["verified"]), ("context.coverage", []),
                 ("context.tasks", [False]), ("context.discussions", [1]),
                 ("context.history", {}), ("context.sourceRefs", [None]),
                 ("duplicateSearch.matches", [None]), ("duplicateSearch.matches", [{"taskId": []}]),
                 ("duplicateSearch.scopeTeamIds", None)]
        for path, value in cases:
            data, result = replan()
            holder = data
            *parents, name = path.split(".")
            for part in parents:
                holder = holder[part]
            holder[name] = value
            with self.subTest(path=path, value=value):
                self.assertTrue(validate(data, result))

    def test_optional_null_confirmations_are_supported(self):
        data, result = replan()
        data["confirmedFields"] = None
        self.assertEqual(validate(data, result), [])

    def test_snapshot_versions_cannot_use_booleans_as_integers(self):
        data = inputs()
        data["revision"] = True
        result = output_for(data)
        result["baseRevision"] = 1
        self.assertTrue(validate(data, result))
        data, result = replan()
        data["context"]["tasks"][0]["version"] = True
        result["baseTaskVersions"]["root"] = 1
        self.assertTrue(validate(data, result))

    def test_unrelated_old_graph_defects_do_not_block_local_update(self):
        for defect in ("cycle", "missing-dependency", "missing-parent", "invalid-date"):
            data, result = replan()
            extra = task("elsewhere")
            if defect == "cycle":
                extra["dependsOnTaskIds"] = ["elsewhere"]
            elif defect == "missing-dependency":
                extra["dependsOnTaskIds"] = ["not-loaded"]
            elif defect == "missing-parent":
                extra["parentId"] = "not-loaded"
            else:
                extra["dueOn"] = "2026-02-30"
            data["context"]["tasks"].append(extra)
            result["baseTaskVersions"]["elsewhere"] = 2
            result["proposal"]["preservedTaskIds"].append("elsewhere")
            with self.subTest(defect=defect):
                self.assertEqual(validate(data, result), [])
                result["proposal"]["changes"][0]["fields"]["dependsOnTaskIds"] = ["elsewhere"]
                self.assertTrue(validate(data, result), "the same defect matters once a changed task relies on it")

    def test_legal_partial_update_does_not_clear_other_fields_or_mutate_input(self):
        data, result = replan()
        data["confirmedFields"] = [{"taskId": "a", "field": "ownerId", "value": "m1"}]
        data["context"]["tasks"][1]["estimate"] = {"ewdHours": 8, "basis": "model"}
        original = deepcopy((data, result))
        self.assertEqual(validate(data, result), [])
        self.assertEqual((data, result), original)

    def test_unchanged_fields_cannot_be_repackaged_as_a_change(self):
        data, result = replan()
        result["proposal"]["changes"][0]["fields"]["acceptanceCriteria"] = ["原有标准"]
        self.assertTrue(validate(data, result))
        data, result = replan()
        result["proposal"]["changes"][0].update(targetId="root", parentId=None, fields={"goal": {
            "text": "交付结果可核对", "basis": "explicit", "evidenceRefs": ["req"]}})
        result["proposal"]["preservedTaskIds"] = ["a", "b", "reference"]
        self.assertTrue(validate(data, result))

    def test_flat_and_nested_schedule_cannot_disagree(self):
        data, result = replan()
        data["context"]["tasks"][1]["schedule"] = {"dueOn": "2026-09-12"}
        self.assertTrue(validate(data, result))

    def test_new_child_preserves_old_parent_estimate_but_rejects_new_parent_total(self):
        data, result = replan()
        data["context"]["tasks"][1]["estimate"] = {"ewdHours": 8, "basis": "model"}
        result["proposal"]["changes"].append({"id": "child", "action": "create", "targetId": "new:child",
            "parentId": "a", "fields": fields(), "reason": "追加独立产出", "evidenceRefs": ["req"]})
        self.assertEqual(validate(data, result), [])
        result["proposal"]["changes"][0]["fields"]["estimate"] = {
            "ewdHours": 10, "basis": "model", "assumptions": [], "evidenceRefs": ["req"]}
        self.assertTrue(validate(data, result))

    def test_nonfinite_numbers_and_negative_effort_rejected_zero_is_not_unknown(self):
        for value in (float("nan"), float("inf"), float("-inf"), -1):
            data = inputs()
            result = output_for(data)
            result["proposal"]["changes"][0]["fields"]["estimate"].update(ewdHours=value, basis="model")
            with self.subTest(value=value):
                self.assertTrue(validate(data, result))
        for value in (0, -0.0):
            data = inputs()
            result = output_for(data)
            estimate = result["proposal"]["changes"][0]["fields"]["estimate"]
            estimate.update(ewdHours=value, basis="model")
            self.assertEqual(validate(data, result), [], "signed zero is numerically nonnegative, not unknown")
            estimate["basis"] = "unknown"
            self.assertTrue(validate(data, result))

    def test_huge_finite_integer_effort_does_not_raise_overflow(self):
        data = inputs()
        result = output_for(data)
        result["proposal"]["changes"][0]["fields"]["estimate"].update(ewdHours=10 ** 400, basis="model")
        self.assertEqual(validate(data, result), [], "the contract has no maximum; Python integers remain finite")

    def test_invalid_calendar_dates_and_reverse_ranges(self):
        for start, due in ((None, "2026-02-29"), (None, "2026-13-01"), (None, "2026-9-01"),
                           (None, "2026-09-01T12:00:00Z"), ("2026-09-05", "2026-09-04")):
            data = inputs()
            result = output_for(data)
            result["proposal"]["changes"][0]["fields"]["schedule"].update(startOn=start, dueOn=due, basis="explicit")
            with self.subTest(start=start, due=due):
                self.assertTrue(validate(data, result))

    def test_cancelled_prerequisite_and_distant_ancestor_are_forbidden(self):
        data, result = replan()
        data["context"]["tasks"][-1]["status"] = "cancelled"
        result["proposal"]["changes"][0]["fields"]["dependsOnTaskIds"] = ["reference"]
        self.assertTrue(validate(data, result))
        data, result = replan()
        data["context"]["tasks"].append(task("grandchild", "a"))
        result["baseTaskVersions"]["grandchild"] = 2
        result["proposal"]["preservedTaskIds"].append("grandchild")
        result["proposal"]["changes"][0]["fields"]["dependsOnTaskIds"] = ["grandchild"]
        self.assertTrue(validate(data, result))

    def test_large_dependency_dag_and_cycle_do_not_overflow_python_stack(self):
        data, result = replan()
        count = 1400
        for index in range(count):
            item = task(f"long-{index}", "root", deps=[f"long-{index + 1}"] if index < count - 1 else [])
            data["context"]["tasks"].append(item)
            result["baseTaskVersions"][item["id"]] = 2
            result["proposal"]["preservedTaskIds"].append(item["id"])
        self.assertEqual(validate(data, result), [])
        data["context"]["tasks"][-1]["dependsOnTaskIds"] = ["long-0"]
        self.assertTrue(validate(data, result))

    def test_bad_graph_field_shapes_return_errors(self):
        for field, value in (("parentId", []), ("dependsOnTaskIds", [None]),
                             ("dependsOnTaskIds", "a"), ("schedule", []), ("status", "archived")):
            data, result = replan()
            data["context"]["tasks"][1][field] = value
            with self.subTest(field=field, value=value):
                self.assertTrue(validate(data, result))

    def test_completed_or_cancelled_ancestor_cannot_gain_new_descendant_work(self):
        for state in ("completed", "cancelled"):
            data, result = replan()
            data["context"]["tasks"][0]["status"] = state
            result["proposal"]["changes"].append({"id": "child", "action": "create", "targetId": "new:child",
                "parentId": "a", "fields": fields(), "reason": "追加工作", "evidenceRefs": ["req"]})
            with self.subTest(state=state):
                self.assertTrue(validate(data, result))

    def test_long_parent_chain_checks_remote_ancestor_without_recursion(self):
        data, result = replan()
        parent = "root"
        for index in range(1100):
            item = task(f"nested-{index}", parent)
            data["context"]["tasks"].append(item)
            result["baseTaskVersions"][item["id"]] = 2
            result["proposal"]["preservedTaskIds"].append(item["id"])
            parent = item["id"]
        self.assertEqual(validate(data, result), [])
        result["proposal"]["changes"][0].update(targetId=parent, parentId="nested-1098", fields={"dependsOnTaskIds": ["root"]})
        result["proposal"]["preservedTaskIds"].remove(parent)
        result["proposal"]["preservedTaskIds"].append("a")
        self.assertTrue(validate(data, result))

    def test_review_action_requires_a_proposal(self):
        data = inputs()
        result = route(data)
        result["nextActions"] = [{"action": "review_proposal", "taskId": None, "label": "预览"}]
        self.assertTrue(validate(data, result))

    def test_deep_or_cyclic_nonjson_values_fail_without_recursion_error(self):
        data = inputs()
        result = output_for(data)
        nested = {}
        data["constraints"] = nested
        for _ in range(1100):
            nested["nested"] = {}
            nested = nested["nested"]
        self.assertTrue(validate(data, result))
        data = inputs()
        data["constraints"] = data
        self.assertTrue(validate(data, result))

    def test_cli_invalid_json_duplicate_keys_and_nonfinite_fail_as_json_errors(self):
        data = inputs()
        result = output_for(data)
        malformed = ["{", "[]", json.dumps(result)[:-1] + ', "proposal": null}',
                     json.dumps(result).replace('"ewdHours": null', '"ewdHours": NaN'),
                     json.dumps(result).replace('"ewdHours": null', '"ewdHours": 1e999')]
        with tempfile.TemporaryDirectory() as directory:
            source, output = Path(directory) / "input.json", Path(directory) / "output.json"
            source.write_text(json.dumps(data), encoding="utf-8")
            for text in malformed:
                output.write_text(text, encoding="utf-8")
                completed = subprocess.run([sys.executable, str(Path(__file__).with_name("validate_plan.py")),
                    "--input", str(source), "--output", str(output)], capture_output=True, text=True)
                with self.subTest(text=text[:30]):
                    self.assertEqual(completed.returncode, 1, completed.stderr)
                    self.assertFalse(json.loads(completed.stdout)["valid"])
                    self.assertNotIn("Traceback", completed.stderr)

    def test_public_artifact_decoder_rejects_ambiguity_before_schema_validation(self):
        for source in ('{"id": "first", "id": "second"}', '{"nested":{"id":1,"id":2}}',
                       '{"value":NaN}', '{"value":Infinity}', '{"value":1e999}',
                       '[' * 1100 + '0' + ']' * 1100):
            with self.subTest(source=source[:30]):
                with self.assertRaises(ValueError):
                    loads_strict(source)
        self.assertEqual(loads_strict('{"value":-0.0}'), {"value": -0.0})
        with tempfile.TemporaryDirectory() as directory:
            artifact = Path(directory) / "artifact.json"
            artifact.write_text('{"safe":true}', encoding="utf-8")
            self.assertEqual(read_json(artifact), {"safe": True})

    def test_overlap_resolution_allows_reviewing_only_the_proposed_uncovered_scope(self):
        data, result = overlap_proposal()
        before = deepcopy((data, result))
        self.assertEqual(validate(data, result), [])
        self.assertEqual((data, result), before)
        result["duplicateCheck"]["assessments"][0].pop("resolution")
        self.assertTrue(validate(data, result), "ordinary overlap remains unresolved")

    def test_overlap_resolution_cannot_reclassify_same_outcome_or_possible(self):
        for relation in ("same_outcome", "possible", "different_instance", "template_only"):
            for disposition in ("ready_for_confirmation", "needs_clarification"):
                data, result = overlap_proposal()
                result["duplicateCheck"]["assessments"][0]["relationship"] = relation
                result["disposition"] = disposition
                if disposition == "needs_clarification":
                    result["questions"] = [{"field": "scope", "question": "范围是否独立？", "blocking": True}]
                with self.subTest(relation=relation, disposition=disposition):
                    self.assertTrue(validate(data, result))

    def test_overlap_resolution_requires_complete_reads_and_duplicate_search(self):
        for missing in ("tasks", "subtasks", "discussions", "duplicateSearch"):
            data, result = overlap_proposal()
            if missing == "duplicateSearch":
                data["duplicateSearch"]["status"] = result["duplicateCheck"]["status"] = "partial"
            else:
                data["context"]["coverage"][missing] = "partial"
            result.update(disposition="needs_clarification", nextActions=[{
                "action": "retry_context", "taskId": None, "label": "补读资料"}])
            with self.subTest(missing=missing):
                self.assertTrue(validate(data, result))

    def test_overlap_resolution_binds_create_change_ids_not_task_ids_or_updates(self):
        for change_ids in ([], ["new:root"], ["missing"], ["change-root", "change-root"]):
            data, result = overlap_proposal()
            result["duplicateCheck"]["assessments"][0]["resolution"]["changeIds"] = change_ids
            with self.subTest(change_ids=change_ids):
                self.assertTrue(validate(data, result))
        data, result = overlap_proposal()
        result["proposal"] = {"rootTaskId": "existing-faq", "complexity": "simple", "preservedTaskIds": [],
            "changes": [{"id": "change-root", "action": "update", "targetId": "existing-faq", "parentId": None,
                         "fields": {"title": "新FAQ标题"}, "reason": "更新措辞", "evidenceRefs": ["req"]}]}
        result["nextActions"][0]["taskId"] = "existing-faq"
        self.assertTrue(validate(data, result))
        result.update(intent="query", disposition="route_required", proposal=None, nextActions=[])
        self.assertTrue(validate(data, result), "resolution cannot refer to removed proposal changes")

    def test_overlap_resolution_requires_overlap_task_and_independent_loaded_evidence(self):
        for evidence_refs in (["req"], ["existing-faq"], ["existing-faq", "fabricated"], ["existing-faq", "existing-faq"]):
            data, result = overlap_proposal()
            result["duplicateCheck"]["assessments"][0]["resolution"]["evidenceRefs"] = evidence_refs
            with self.subTest(evidence_refs=evidence_refs):
                self.assertTrue(validate(data, result))


if __name__ == "__main__":
    unittest.main()
