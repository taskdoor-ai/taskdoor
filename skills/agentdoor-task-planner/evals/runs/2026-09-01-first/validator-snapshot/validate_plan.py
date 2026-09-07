#!/usr/bin/env python3
"""Offline v0.2 proposal checks; not semantic grading, production ACL or a writer."""
from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import date
import json
import math
from pathlib import Path
import re
import sys

from jsonschema import Draft202012Validator, FormatChecker


SCHEMA = Path(__file__).resolve().parents[1] / "references" / "planning-v0.2.schema.json"
TERMINAL = {"completed", "cancelled"}
NEW_FIELDS = {
    "title", "acceptanceCriteria", "ownerRecommendation", "participantRecommendations",
    "schedule", "estimate", "dependsOnTaskIds",
}
MISSING = object()


def _ids(items):
    return {item for item in items if isinstance(item, str)}


def _sources(value, result):
    if isinstance(value, dict):
        if isinstance(value.get("id"), str):
            result.add(value["id"])
        for child in value.values():
            _sources(child, result)
    elif isinstance(value, list):
        for child in value:
            _sources(child, result)


def _check_refs(value, allowed, errors, path="output"):
    if isinstance(value, dict):
        for key, child in value.items():
            if key == "evidenceRefs":
                for ref in child:
                    if ref not in allowed:
                        errors.append(f"{path}.evidenceRefs: unknown source {ref}")
            else:
                _check_refs(child, allowed, errors, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _check_refs(child, allowed, errors, f"{path}[{index}]")


def _path(value, path):
    for part in path.split("."):
        if not isinstance(value, dict) or part not in value:
            return MISSING
        value = value[part]
    return value


def _goal(value):
    return value.get("text", MISSING) if isinstance(value, dict) else value


def _date(value, path, errors):
    if value is None:
        return None
    try:
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError()
        return date.fromisoformat(value)
    except ValueError:
        errors.append(f"{path}: invalid calendar date")
        return None


def _task_schedule(task):
    nested = task.get("schedule") or {}
    return {key: task.get(key, nested.get(key)) for key in ("startOn", "dueOn")}


def validate(input_data, output):
    """Return deterministic validation errors. An empty list means these checks pass."""
    errors = []
    if not isinstance(input_data, dict):
        return ["input must be an object"]
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    for error in sorted(validator.iter_errors(output), key=lambda item: str(list(item.path))):
        errors.append(f"schema {'.'.join(map(str, error.path)) or '$'}: {error.message}")
    if errors:
        return errors
    context = input_data.get("context") or {}
    if not isinstance(context, dict):
        return ["input.context must be an object"]
    raw_tasks = context.get("tasks", [])
    members = input_data.get("members", [])
    if not isinstance(raw_tasks, list) or any(not isinstance(t, dict) or not isinstance(t.get("id"), str) for t in raw_tasks):
        return ["input.context.tasks must contain objects with stable ids"]
    if not isinstance(members, list) or any(not isinstance(m, dict) or not isinstance(m.get("id"), str) for m in members):
        return ["input.members must contain objects with stable ids"]
    tasks = {task["id"]: task for task in raw_tasks}
    member_ids = {member["id"] for member in members}
    if len(tasks) != len(raw_tasks):
        errors.append("input.context.tasks: duplicate ids")
    if len(member_ids) != len(members):
        errors.append("input.members: duplicate ids")
    for output_key, expected in (
        ("requestId", input_data.get("requestId", MISSING)),
        ("baseSnapshotId", context.get("snapshotId", MISSING)),
        ("baseRevision", input_data.get("revision", MISSING)),
        ("baseTaskVersions", {task_id: task.get("version", MISSING) for task_id, task in tasks.items()}),
    ):
        if output[output_key] != expected:
            errors.append(f"{output_key}: must exactly echo the input snapshot")

    sources = {input_data["requestId"]} if isinstance(input_data.get("requestId"), str) else set()
    for value in (members, raw_tasks, context.get("discussions", []), context.get("history", []), context.get("sourceRefs", [])):
        _sources(value, sources)
    _check_refs(output, sources, errors)
    duplicate = input_data.get("duplicateSearch") or {}
    duplicate_out = output["duplicateCheck"]
    duplicate_status = duplicate.get("status", "not_checked")
    search_scope = _ids(duplicate.get("scopeTeamIds", []))
    authorized = _ids(input_data.get("authorizedTeamIds", []))
    if duplicate_out["status"] != duplicate_status:
        errors.append("duplicateCheck.status: must echo the search status")
    if set(duplicate_out["scopeTeamIds"]) != search_scope:
        errors.append("duplicateCheck.scopeTeamIds: must echo the search scope")
    if "coverageNote" in duplicate and duplicate_out["coverageNote"] != duplicate["coverageNote"]:
        errors.append("duplicateCheck.coverageNote: must echo the reported coverage")
    if not search_scope <= authorized:
        errors.append("duplicateSearch.scopeTeamIds: outside authorized teams")
    matches = duplicate.get("matches", [])
    candidate_ids = {match.get("taskId") for match in matches if isinstance(match, dict)}
    assessment_ids = [assessment["taskId"] for assessment in duplicate_out["assessments"]]
    if set(assessment_ids) != candidate_ids or len(set(assessment_ids)) != len(assessment_ids):
        errors.append("duplicateCheck.assessments: assess every input candidate once, without adding candidates")
    if not candidate_ids <= tasks.keys():
        errors.append("duplicateSearch.matches: candidates must be visible tasks")

    intent, disposition, proposal = output["intent"], output["disposition"], output["proposal"]
    blocking = any(question["blocking"] for question in output["questions"])
    if intent == "query" and (disposition != "route_required" or proposal is not None):
        errors.append("query must route without a proposal")
    if intent == "unclear" and (proposal is not None or not blocking or disposition != "needs_clarification"):
        errors.append("unclear requires blocking clarification without a proposal")
    if disposition in {"route_required", "no_change"} and proposal is not None:
        errors.append(f"{disposition} cannot contain a proposal")
    if disposition == "ready_for_confirmation" and (proposal is None or blocking):
        errors.append("ready_for_confirmation requires a proposal and no blocking questions")
    if disposition == "needs_clarification" and not blocking and not any(action["action"] == "retry_context" for action in output["nextActions"]):
        errors.append("needs_clarification requires a blocking question or retry_context action")

    changes = proposal["changes"] if proposal else []
    known_ids = set(tasks) | {change["targetId"] for change in changes if change["action"] == "create"}
    for action in output["nextActions"]:
        target = action["taskId"]
        if action["action"] == "open_task" and target not in tasks:
            errors.append("nextActions.open_task: requires a visible existing task")
        elif target is not None and target not in known_ids:
            errors.append(f"nextActions: unknown task {target}")
    if proposal is None:
        return errors

    acl = context.get("acl") or {}
    if acl.get("status") != "verified":
        errors.append("proposal: verified ACL context is required")
    acl_scope = _ids(acl.get("scopeTeamIds", []))
    if not acl_scope <= authorized:
        errors.append("context.acl.scopeTeamIds: outside authorized teams")
    if input_data.get("teamId") not in acl_scope or input_data.get("teamId") not in authorized:
        errors.append("proposal: current team must be within the provided authorized ACL scope")
    if disposition == "ready_for_confirmation":
        if any(change["action"] == "create" for change in changes):
            if duplicate_status != "completed" or input_data.get("teamId") not in search_scope:
                errors.append("ready create requires completed duplicate search covering the current team")
            if any(a["relationship"] in {"same_outcome", "overlap", "possible"} for a in duplicate_out["assessments"]):
                errors.append("ready create cannot bypass unresolved duplicate candidates")
        if intent in {"replan", "next_batch"}:
            coverage = context.get("coverage") or {}
            if any(coverage.get(key) != "complete" for key in ("tasks", "subtasks", "discussions")):
                errors.append("ready replan/next_batch requires complete tasks, subtasks and discussions")

    ids = [change["id"] for change in changes]
    targets = [change["targetId"] for change in changes]
    if len(set(ids)) != len(ids) or len(set(targets)) != len(targets):
        errors.append("proposal.changes: change ids and target ids must be unique")
    updated = {change["targetId"] for change in changes if change["action"] == "update"}
    if set(proposal["preservedTaskIds"]) != set(tasks) - updated:
        errors.append("preservedTaskIds: must retain every snapshot task not updated")
    root = proposal["rootTaskId"]
    current = input_data.get("currentTaskId")
    if current is not None and intent in {"refine", "replan", "next_batch"}:
        if current not in tasks:
            errors.append("currentTaskId: must be visible before replanning")
        elif intent != "next_batch" or tasks[current].get("status") not in TERMINAL:
            if root != current:
                errors.append("rootTaskId: cannot replace the current task with another tree")

    graph = {task_id: deepcopy(task) for task_id, task in tasks.items()}
    for change in changes:
        target, parent, fields = change["targetId"], change["parentId"], change["fields"]
        prefix = f"change {change['id']} ({target})"
        if change["action"] == "create":
            if not target.startswith("new:") or not target[4:] or target in tasks:
                errors.append(f"{prefix}: create needs a unique new: target id")
            missing = NEW_FIELDS - fields.keys()
            if missing:
                errors.append(f"{prefix}: missing creation fields {', '.join(sorted(missing))}")
            if parent is None and (target != root or "goal" not in fields):
                errors.append(f"{prefix}: a created root must be proposal.rootTaskId and include goal")
            if parent in tasks and tasks[parent].get("status") in TERMINAL:
                errors.append(f"{prefix}: cannot add work under a completed/cancelled parent")
            graph[target] = {"id": target, "parentId": parent}
        else:
            if target not in tasks:
                errors.append(f"{prefix}: update must use an existing task id")
                continue
            if tasks[target].get("status") in TERMINAL:
                errors.append(f"{prefix}: completed/cancelled tasks cannot be updated")
            if parent != tasks[target].get("parentId"):
                errors.append(f"{prefix}: update cannot change parentId")
            comparable = {key: tasks[target].get(key, MISSING) for key in fields}
            if "goal" in comparable:
                comparable["goal"] = _goal(comparable["goal"])
            if all(comparable[key] == (_goal(value) if key == "goal" else value) for key, value in fields.items()):
                errors.append(f"{prefix}: update contains no field differences; use no_change")
        if parent is not None and "goal" in fields:
            errors.append(f"{prefix}: children inherit the root goal")
        recommendation = fields.get("ownerRecommendation")
        if recommendation:
            owner = recommendation["memberId"]
            if owner is not None and owner not in member_ids:
                errors.append(f"{prefix}: unknown recommended member {owner}")
            if (owner is None) != (recommendation["basis"] == "unassigned"):
                errors.append(f"{prefix}: owner memberId and basis disagree")
        participants = [person["memberId"] for person in fields.get("participantRecommendations", [])]
        if len(set(participants)) != len(participants) or not set(participants) <= member_ids:
            errors.append(f"{prefix}: participants must be distinct visible members")
        schedule = fields.get("schedule")
        if schedule and schedule["basis"] == "unknown" and any(schedule[key] is not None for key in ("startOn", "dueOn")):
            errors.append(f"{prefix}: unknown schedule cannot contain dates")
        estimate = fields.get("estimate")
        if estimate:
            hours = estimate["ewdHours"]
            if (hours is None) != (estimate["basis"] == "unknown") or (hours is not None and not math.isfinite(hours)):
                errors.append(f"{prefix}: unknown effort must be null; known effort must be finite")
        for confirmed in input_data.get("confirmedFields", []):
            if confirmed.get("taskId") != target:
                continue
            field = confirmed.get("field", "")
            mapped = {"ownerId": "ownerRecommendation.memberId", "dueOn": "schedule.dueOn", "startOn": "schedule.startOn"}.get(field, field)
            value = _path(fields, mapped)
            if value is not MISSING:
                expected = confirmed.get("value", MISSING)
                if field == "goal":
                    value, expected = _goal(value), _goal(expected)
                if value != expected:
                    errors.append(f"{prefix}: confirmed field {field} cannot change")
        graph[target].update(deepcopy(fields))
        if schedule:
            graph[target].update({key: schedule[key] for key in ("startOn", "dueOn")})

    if root not in graph:
        errors.append("rootTaskId: must resolve to an existing or newly proposed task")
    ancestors = {}
    for task_id, task in graph.items():
        lineage, seen, parent = [], {task_id}, task.get("parentId")
        while parent is not None:
            if parent not in graph:
                errors.append(f"task {task_id}: dangling parent {parent}")
                break
            if parent in seen:
                errors.append(f"task {task_id}: parent cycle")
                break
            lineage.append(parent)
            seen.add(parent)
            parent = graph[parent].get("parentId")
        ancestors[task_id] = lineage
    for target in targets:
        if target != root and root not in ancestors.get(target, []):
            errors.append(f"task {target}: change is outside proposal.rootTaskId tree")
    if proposal["complexity"] == "simple" and any(root in lineage for lineage in ancestors.values()):
        errors.append("simple proposal cannot contain existing or newly created descendants")

    dates = {task_id: {key: _date(value, f"task {task_id}.{key}", errors) for key, value in _task_schedule(task).items()} for task_id, task in graph.items()}
    for change in changes:
        target = change["targetId"]
        if target not in graph:
            continue
        schedule = dates[target]
        if schedule["startOn"] and schedule["dueOn"] and schedule["startOn"] > schedule["dueOn"]:
            errors.append(f"task {target}: startOn is after dueOn")
        if "estimate" in change["fields"] and change["fields"]["estimate"]["ewdHours"] is not None and any(task.get("parentId") == target for task in graph.values()):
            errors.append(f"task {target}: parent effort cannot duplicate child estimates")
    edges = {}
    for task_id, task in graph.items():
        deps = task.get("dependsOnTaskIds") or []
        edges[task_id] = deps
        for dep in deps:
            if dep not in graph:
                errors.append(f"task {task_id}: dangling dependency {dep}")
                continue
            if dep == task_id or dep in ancestors[task_id] or task_id in ancestors[dep]:
                errors.append(f"task {task_id}: self or parent/child dependency is forbidden")
            if graph[dep].get("status") == "cancelled":
                errors.append(f"task {task_id}: cancelled dependency {dep}")
            if task_id in targets or dep in targets:
                available, start, due = dates[dep]["dueOn"], dates[task_id]["startOn"], dates[task_id]["dueOn"]
                if graph[dep].get("status") != "completed" and available and ((start and available > start) or (due and available > due)):
                    errors.append(f"task {task_id}: schedule conflicts with dependency {dep}")
        for parent in ancestors[task_id]:
            if task_id in targets or parent in targets:
                child_due, parent_due = dates[task_id]["dueOn"], dates[parent]["dueOn"]
                if child_due and parent_due and child_due > parent_due:
                    errors.append(f"task {task_id}: dueOn exceeds ancestor {parent}")
    visiting, visited = set(), set()
    def visit(task_id):
        if task_id in visiting:
            errors.append(f"task {task_id}: dependency cycle")
            return
        if task_id in visited:
            return
        visiting.add(task_id)
        for dep in edges.get(task_id, []):
            if dep in graph:
                visit(dep)
        visiting.remove(task_id)
        visited.add(task_id)
    for task_id in graph:
        visit(task_id)
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    try:
        errors = validate(json.loads(args.input.read_text(encoding="utf-8")), json.loads(args.output.read_text(encoding="utf-8")))
    except (OSError, ValueError) as error:
        errors = [f"validation input error: {error}"]
    print(json.dumps({"valid": not errors, "errors": errors}, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
