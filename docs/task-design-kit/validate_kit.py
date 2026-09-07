"""Offline artifact checks only; not a production ACL or task-creation validator.

Run: python3 docs/task-design-kit/validate_kit.py
Requires the already available jsonschema package; makes no network requests.
"""

import copy
import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[2]
PLANNER = ROOT / "skills/agentdoor-task-planner"
SCHEMA = json.loads((PLANNER / "references/plan.schema.json").read_text())
VALIDATOR = Draft202012Validator(SCHEMA, format_checker=FormatChecker())


def fixture(name):
    return json.loads((PLANNER / "examples" / f"{name}.json").read_text())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(data):
    source, output = data["input"], data["output"]
    VALIDATOR.validate(output)
    require(output["requestId"] == source["requestId"], "request mismatch")
    duplicate = output["duplicateCheck"]
    search = source["duplicateSearch"]
    require(duplicate["status"] == search["status"], "fabricated search status")
    require(set(duplicate["scopeTeamIds"]) == set(search["scopeTeamIds"]), "search scope changed")
    require(set(duplicate["scopeTeamIds"]) <= set(source["authorizedTeamIds"]), "unauthorized scope")
    visible = {(item["taskId"], item["title"]) for item in search["matches"]}
    require(all((item["taskId"], item["title"]) in visible for item in duplicate["matches"]), "fabricated or hidden match")
    plan = output["plan"]
    if output["intent"] in ("query", "update"):
        require(plan is None and output["disposition"] == "route_required", "wrong route")
        return
    if output["intent"] == "unclear":
        require(plan is None and output["disposition"] == "needs_clarification" and output["questions"], "unclear intent must ask")
        return
    require(plan is not None, "create plan missing")
    require(output["disposition"] != "route_required", "create cannot route away as completed plan")
    tasks = [plan["mainTask"], *plan["subtasks"]]
    ids = [task["clientId"] for task in tasks]
    require(len(ids) == len(set(ids)), "duplicate clientId")
    if plan["complexity"] == "simple":
        require(not plan["subtasks"], "simple task must not split")
    require(not plan["mainTask"]["dependsOnClientIds"], "main task dependencies")
    member_ids = {member["id"] for member in source["members"]}
    children = {task["clientId"]: task for task in plan["subtasks"]}
    for task in tasks:
        owner = task["ownerRecommendation"]
        require(owner["memberId"] is None or owner["memberId"] in member_ids, "invalid member")
        require((owner["memberId"] is None) == (owner["basis"] == "unassigned"), "owner basis mismatch")
        schedule = task["schedule"]
        start, due = schedule["startOn"], schedule["dueOn"]
        require(not start or not due or start <= due, "date order")
        if task is not plan["mainTask"]:
            parent_due = plan["mainTask"]["schedule"]["dueOn"]
            require(not due or not parent_due or due <= parent_due, "child past deadline")
        for dependency in task["dependsOnClientIds"]:
            require(dependency in children and dependency != task["clientId"], "invalid dependency")
            predecessor_due = children[dependency]["schedule"]["dueOn"]
            require(not start or not predecessor_due or predecessor_due <= start, "dependency schedule conflict")
    visiting, visited = set(), set()

    def visit(task_id):
        require(task_id not in visiting, "dependency cycle")
        if task_id in visited:
            return
        visiting.add(task_id)
        for dependency in children[task_id]["dependsOnClientIds"]:
            visit(dependency)
        visiting.remove(task_id)
        visited.add(task_id)

    for task_id in children:
        visit(task_id)
    if output["disposition"] == "ready_for_confirmation":
        require(all(task["ownerRecommendation"]["memberId"] for task in tasks), "ready without owner")
        require(not any(question["blocking"] for question in output["questions"]), "ready with blockers")
        # These fixtures do not model server-issued risk acknowledgements.
        require(duplicate["status"] == "completed" and not duplicate["matches"], "ready without duplicate resolution")


class KitTests(unittest.TestCase):
    def test_schema_and_all_examples(self):
        Draft202012Validator.check_schema(SCHEMA)
        for name in ("simple", "complex", "incomplete"):
            with self.subTest(name=name):
                validate(fixture(name))

    def test_invalid_mutations_are_rejected(self):
        cases = []
        data = fixture("simple")
        data["output"]["plan"]["mainTask"]["ownerRecommendation"]["memberId"] = "outsider"
        cases.append(("foreign owner", data))
        data = fixture("simple")
        data["output"]["plan"]["subtasks"] = [copy.deepcopy(data["output"]["plan"]["mainTask"])]
        data["output"]["plan"]["subtasks"][0]["clientId"] = "child"
        cases.append(("simple over-split", data))
        data = fixture("complex")
        for task in data["output"]["plan"]["subtasks"]:
            task["schedule"]["startOn"] = None
        data["output"]["plan"]["subtasks"][0]["dependsOnClientIds"] = ["verify"]
        cases.append(("cycle", data))
        data = fixture("complex")
        data["output"]["plan"]["subtasks"][1]["dependsOnClientIds"] = ["missing"]
        cases.append(("dangling dependency", data))
        data = fixture("simple")
        data["output"]["plan"]["mainTask"]["schedule"]["dueOn"] = "2026-02-30"
        cases.append(("invalid calendar date", data))
        data = fixture("simple")
        data["output"]["plan"]["mainTask"]["estimate"]["ewdHours"] = -2
        cases.append(("negative EWD", data))
        data = fixture("simple")
        data["output"]["externalEffects"] = "created"
        cases.append(("side effect", data))
        data = fixture("incomplete")
        data["output"]["duplicateCheck"]["status"] = "completed"
        cases.append(("fake search success", data))
        data = fixture("incomplete")
        data["output"]["disposition"] = "ready_for_confirmation"
        data["output"]["questions"] = []
        cases.append(("unresolved search ready", data))
        data = fixture("simple")
        data["output"]["duplicateCheck"]["scopeTeamIds"].append("secret-team")
        cases.append(("expanded scope", data))
        data = fixture("simple")
        data["output"]["duplicateCheck"]["matches"] = [{"taskId": "secret", "title": "Hidden", "reason": "similar"}]
        cases.append(("invented visible match", data))
        data = fixture("complex")
        data["output"]["plan"]["subtasks"][2]["schedule"]["dueOn"] = "2026-09-05"
        cases.append(("late child", data))
        data = fixture("complex")
        data["output"]["plan"]["subtasks"][0]["goal"] = "Unrequested new goal"
        cases.append(("recursive goal", data))
        for name, data in cases:
            with self.subTest(name=name), self.assertRaises(Exception):
                validate(data)
        print(f"Rejected {len(cases)} invalid mutations.")

    def test_query_routes_without_plan(self):
        data = fixture("simple")
        data["output"].update(intent="query", disposition="route_required", plan=None)
        validate(data)

    def test_dependency_ids_survive_reorder(self):
        data = fixture("complex")
        data["output"]["plan"]["subtasks"].reverse()
        validate(data)


if __name__ == "__main__":
    unittest.main(verbosity=2)
