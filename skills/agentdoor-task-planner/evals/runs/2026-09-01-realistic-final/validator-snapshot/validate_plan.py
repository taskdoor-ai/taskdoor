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
CONFIRMED_ALIASES = {
    "ownerId": "ownerRecommendation.memberId", "dueOn": "schedule.dueOn", "startOn": "schedule.startOn",
}
CONFIRMED_PATHS = NEW_FIELDS | {
    "goal", "tips", "ownerId", "dueOn", "startOn", "status", "parentId",
    "goal.text", "goal.basis", "goal.evidenceRefs",
    "ownerRecommendation.memberId", "ownerRecommendation.basis", "ownerRecommendation.reason", "ownerRecommendation.evidenceRefs",
    "schedule.startOn", "schedule.dueOn", "schedule.basis", "schedule.assumptions", "schedule.evidenceRefs",
    "estimate.ewdHours", "estimate.basis", "estimate.assumptions", "estimate.evidenceRefs",
}


def _ids(items):
    return {item for item in items if isinstance(item, str)}


def _json_errors(value, path):
    """Reject non-JSON values and excessive nesting before recursive schema checks.

    Graph size is not nesting depth: thousands of flat task records remain valid.
    Python's decoder accepts NaN/Infinity by default, although JSON does not.
    """
    stack = [(value, path, 0, frozenset())]
    while stack:
        current, location, depth, ancestors = stack.pop()
        if depth > 64:
            return [f"{location}: JSON nesting exceeds the validator limit of 64"]
        if isinstance(current, (dict, list)):
            if id(current) in ancestors:
                return [f"{location}: cyclic values are not JSON"]
            parents = ancestors | {id(current)}
            if isinstance(current, dict):
                if any(not isinstance(key, str) for key in current):
                    return [f"{location}: JSON object keys must be strings"]
                children = current.items()
            else:
                children = enumerate(current)
            stack.extend((child, f"{location}.{key}", depth + 1, parents) for key, child in children)
        elif isinstance(current, float) and not math.isfinite(current):
            return [f"{location}: numbers must be finite"]
        elif current is not None and not isinstance(current, (str, bool, int, float)):
            return [f"{location}: value is not JSON"]
    return []


def loads_strict(text):
    """Decode JSON without duplicate keys, nonfinite numbers or excessive nesting.

    Batch evaluation must call this before validate(): once a normal JSON decoder
    has discarded duplicate keys, validation cannot recover the original text.
    Raises ValueError for invalid artifacts; no schema or ACL claims are made.
    """
    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"duplicate JSON object key: {key}")
            result[key] = value
        return result

    def invalid_constant(value):
        raise ValueError(f"nonfinite JSON constant: {value}")

    try:
        value = json.loads(text, object_pairs_hook=unique_object, parse_constant=invalid_constant)
    except RecursionError as error:
        raise ValueError("JSON nesting exceeds decoder limits") from error
    errors = _json_errors(value, "json")
    if errors:
        raise ValueError(errors[0])
    return value


def read_json(path):
    """Read an artifact through the same strict decoder used by the CLI."""
    return loads_strict(Path(path).read_text(encoding="utf-8"))


def _input_errors(data):
    """Validate the shapes consumed below; this is not a trusted input/ACL service."""
    errors = []

    def object_value(value, path):
        if not isinstance(value, dict):
            errors.append(f"{path}: must be an object")
            return {}
        return value

    def strings(value, path):
        if not isinstance(value, list) or any(not isinstance(item, str) or not item for item in value):
            errors.append(f"{path}: must be an array of nonempty strings")
        elif len(set(value)) != len(value):
            errors.append(f"{path}: duplicate ids")

    def records(value, path, identity="id"):
        if not isinstance(value, list):
            errors.append(f"{path}: must be an array")
            return []
        if any(not isinstance(item, dict) or not isinstance(item.get(identity), str) or not item[identity] for item in value):
            errors.append(f"{path}: must contain objects with nonempty {identity}")
            return []
        ids = [item[identity] for item in value]
        if len(set(ids)) != len(ids):
            errors.append(f"{path}: duplicate {identity}")
        return value

    context = object_value(data.get("context", {}), "input.context")
    acl = object_value(context.get("acl", {}), "input.context.acl")
    coverage = object_value(context.get("coverage", {}), "input.context.coverage")
    duplicate = object_value(data.get("duplicateSearch", {}), "input.duplicateSearch")
    for key, value in (("requestId", data.get("requestId")), ("context.snapshotId", context.get("snapshotId"))):
        if not isinstance(value, str) or not value:
            errors.append(f"input.{key}: must be a nonempty string")
    revision = data.get("revision")
    if not isinstance(revision, int) or isinstance(revision, bool) or revision < 0:
        errors.append("input.revision: must be a nonnegative integer, not a boolean")
    for key in ("currentTaskId", "teamId", "currentUserId"):
        value = data.get(key)
        if value is not None and (not isinstance(value, str) or not value):
            errors.append(f"input.{key}: must be a nonempty string or null")
    strings(data.get("authorizedTeamIds", []), "input.authorizedTeamIds")
    strings(acl.get("scopeTeamIds", []), "input.context.acl.scopeTeamIds")
    strings(duplicate.get("scopeTeamIds", []), "input.duplicateSearch.scopeTeamIds")
    if acl.get("status", "missing") not in ("verified", "missing"):
        errors.append("input.context.acl.status: must be verified or missing")
    if duplicate.get("status", "not_checked") not in ("not_checked", "completed", "partial", "unavailable"):
        errors.append("input.duplicateSearch.status: invalid status")
    for name, value in coverage.items():
        if name in {"tasks", "subtasks", "discussions", "history", "files"} and value not in ("complete", "partial", "unavailable", "not_requested"):
            errors.append(f"input.context.coverage.{name}: invalid coverage")
    if "coverageNote" in duplicate and not isinstance(duplicate["coverageNote"], str):
        errors.append("input.duplicateSearch.coverageNote: must be a string")
    tasks = records(context.get("tasks", []), "input.context.tasks")
    files = records(context.get("files", []), "input.context.files")
    stakeholders = records(context.get("stakeholders", []), "input.context.stakeholders")
    members = records(data.get("members", []), "input.members")
    if {item["id"] for item in stakeholders} & {item["id"] for item in members}:
        errors.append("input.context.stakeholders: external stakeholder ids cannot also be assignable member ids")
    for stakeholder in stakeholders:
        if stakeholder.get("assignable") is not False:
            errors.append(f"input.stakeholder {stakeholder['id']}.assignable: must be false")
    all_records = list(tasks) + list(members) + list(stakeholders)
    for name in ("discussions", "history", "sourceRefs"):
        all_records.extend(records(context.get(name, []), f"input.context.{name}"))
    records(duplicate.get("matches", []), "input.duplicateSearch.matches", "taskId")
    for member in members:
        evidence = member.get("evidence", [])
        if not isinstance(evidence, list):
            errors.append(f"input.member {member['id']}.evidence: must be an array")
        else:
            for record in evidence:
                if isinstance(record, dict) and isinstance(record.get("id"), str) and record["id"]:
                    all_records.append(record)
                elif not isinstance(record, str) or not record:
                    errors.append(f"input.member {member['id']}.evidence: expected source records or reference strings")
    for record in all_records:
        if "teamId" in record and (not isinstance(record["teamId"], str) or not record["teamId"]):
            errors.append("input record.teamId: must be a nonempty string when provided")
    for item in tasks:
        prefix = f"input.task {item['id']}"
        version = item.get("version")
        if not isinstance(version, int) or isinstance(version, bool) or version < 0:
            errors.append(f"{prefix}.version: must be a nonnegative integer, not a boolean")
        if item.get("status") not in ("open", "in_progress", "blocked", "completed", "cancelled"):
            errors.append(f"{prefix}.status: invalid or missing status")
        if item.get("parentId") is not None and (not isinstance(item["parentId"], str) or not item["parentId"]):
            errors.append(f"{prefix}.parentId: must be a nonempty string or null")
        for field in ("dependsOnTaskIds", "sourceRefs"):
            if field in item:
                strings(item[field], f"{prefix}.{field}")
        for field in ("schedule", "estimate"):
            if field in item:
                object_value(item[field], f"{prefix}.{field}")
        if isinstance(item.get("schedule"), dict):
            for field in ("startOn", "dueOn"):
                if field in item and field in item["schedule"] and item[field] != item["schedule"][field]:
                    errors.append(f"{prefix}.{field}: flat and nested dates disagree; normalize the snapshot")
    task_ids = {item["id"] for item in tasks}
    for item in files:
        prefix = f"input.file {item['id']}"
        for field in ("fileName", "mimeType", "version", "status", "source"):
            if not isinstance(item.get(field), (str, int)) or isinstance(item.get(field), bool) or item.get(field) == "":
                errors.append(f"{prefix}.{field}: must be a nonempty string or integer")
        strings(item.get("linkedTaskIds", []), f"{prefix}.linkedTaskIds")
        if any(task_id not in task_ids for task_id in item.get("linkedTaskIds", [])):
            errors.append(f"{prefix}.linkedTaskIds: every linked task must be visible")
    confirmed = data.get("confirmedFields")
    if confirmed is not None:
        if not isinstance(confirmed, list):
            errors.append("input.confirmedFields: must be an array or null")
        else:
            for lock in confirmed:
                if not isinstance(lock, dict) or not isinstance(lock.get("taskId"), str) or not isinstance(lock.get("field"), str) or "value" not in lock:
                    errors.append("input.confirmedFields: each lock requires taskId, field and value")
                    continue
                if lock["taskId"] not in task_ids:
                    errors.append("input.confirmedFields: locked task must exist in normalized context.tasks")
                if lock["field"] not in CONFIRMED_PATHS:
                    errors.append(f"input.confirmedFields: unsupported field {lock['field']}; normalize it before planning")
    if data.get("currentDraft") is not None:
        errors.append("input.currentDraft: normalize the draft into context.tasks and omit the second field copy before validation")
    return errors


def _source_records(input_data):
    """Only declared entity/loaded-evidence positions confer source identity.

    An arbitrary nested payload.id or a source pointer does not prove a read.
    """
    context = input_data.get("context", {})
    members = input_data.get("members", [])
    records = list(members)
    for name in ("tasks", "discussions", "history", "sourceRefs"):
        records.extend(context.get(name, []))
    for member in members:
        records.extend(record for record in member.get("evidence", []) if isinstance(record, dict))
    return records


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
    errors = _json_errors(input_data, "input") + _json_errors(output, "output")
    if errors:
        return errors
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    try:
        for error in sorted(validator.iter_errors(output), key=lambda item: str(list(item.path))):
            errors.append(f"schema {'.'.join(map(str, error.path)) or '$'}: {error.message}")
    except (ValueError, OverflowError, RecursionError) as error:
        return [f"schema validation input error: {error}"]
    if errors:
        return errors
    errors = _input_errors(input_data)
    if errors:
        return errors
    context = input_data.get("context", {})
    raw_tasks = context.get("tasks", [])
    members = input_data.get("members", [])
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

    sources = {input_data["requestId"]}
    source_records = _source_records(input_data)
    for record in source_records:
        if record["id"] in sources:
            errors.append(f"input evidence: ambiguous duplicate source id {record['id']}")
        sources.add(record["id"])
    _check_refs(output, sources, errors)
    duplicate = input_data.get("duplicateSearch") or {}
    duplicate_out = output["duplicateCheck"]
    duplicate_status = duplicate.get("status", "not_checked")
    search_scope = _ids(duplicate.get("scopeTeamIds", []))
    authorized = _ids(input_data.get("authorizedTeamIds", []))
    acl = context.get("acl", {})
    acl_scope = _ids(acl.get("scopeTeamIds", []))
    if not acl_scope <= authorized:
        errors.append("context.acl.scopeTeamIds: outside authorized teams")
    if acl.get("status") == "verified":
        if input_data.get("teamId") not in acl_scope or input_data.get("teamId") not in authorized:
            errors.append("context.acl: current team must be within the provided authorized ACL scope")
    elif any((raw_tasks, members, context.get("stakeholders", []), context.get("discussions", []), context.get("history", []), context.get("files", []))):
        # baseTaskVersions must echo every task, so even a null proposal would
        # disclose object IDs from an unverified snapshot. Sanitize at the caller.
        errors.append("unverified ACL context cannot include task/member/stakeholder/discussion/history/file records")
    acl_records = source_records + list(context.get("stakeholders", [])) + list(context.get("files", []))
    for record in acl_records:
        if "teamId" in record and (record["teamId"] not in authorized or record["teamId"] not in acl_scope):
            errors.append(f"input record {record['id']}: declared team is outside authorized ACL scope")
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
    create_change_ids = {change["id"] for change in changes if change["action"] == "create"}
    resolved_overlaps = set()
    for assessment in duplicate_out["assessments"]:
        resolution = assessment.get("resolution")
        if resolution is None:
            continue
        prefix = f"duplicateCheck assessment {assessment['taskId']}.resolution"
        invalid = False
        if assessment["relationship"] != "overlap":
            errors.append(f"{prefix}: uncovered scope resolution is only valid for overlap")
            invalid = True
        coverage = context.get("coverage", {})
        if duplicate_status != "completed" or any(coverage.get(key) != "complete" for key in ("tasks", "subtasks", "discussions")):
            errors.append(f"{prefix}: completed search and complete tasks/subtasks/discussions are required")
            invalid = True
        if not resolution["changeIds"] or not set(resolution["changeIds"]) <= create_change_ids or len(set(resolution["changeIds"])) != len(resolution["changeIds"]):
            errors.append(f"{prefix}: changeIds must identify distinct create changes in this proposal")
            invalid = True
        refs = set(resolution["evidenceRefs"])
        if assessment["taskId"] not in refs or not (refs - {assessment["taskId"]}) & sources:
            errors.append(f"{prefix}: cite the overlap task and another loaded source or the request")
            invalid = True
        if not invalid:
            resolved_overlaps.add(assessment["taskId"])
    known_ids = set(tasks) | {change["targetId"] for change in changes if change["action"] == "create"}
    for action in output["nextActions"]:
        target = action["taskId"]
        if action["action"] == "review_proposal" and proposal is None:
            errors.append("nextActions.review_proposal: requires a proposal")
        if acl.get("status") != "verified" and (target is not None or action["action"] in {"open_task", "review_proposal"}):
            errors.append("nextActions: unverified ACL permits only untargeted context/clarification actions")
        if action["action"] == "open_task" and target not in tasks:
            errors.append("nextActions.open_task: requires a visible existing task")
        elif target is not None and target not in known_ids:
            errors.append(f"nextActions: unknown task {target}")
    if proposal is None:
        return errors

    if acl.get("status") != "verified":
        errors.append("proposal: verified ACL context is required")
    if input_data.get("teamId") not in acl_scope or input_data.get("teamId") not in authorized:
        errors.append("proposal: current team must be within the provided authorized ACL scope")
    if disposition == "ready_for_confirmation":
        if any(change["action"] == "create" for change in changes):
            if duplicate_status != "completed" or input_data.get("teamId") not in search_scope:
                errors.append("ready create requires completed duplicate search covering the current team")
            if any(a["relationship"] in {"same_outcome", "possible"} or (a["relationship"] == "overlap" and a["taskId"] not in resolved_overlaps) for a in duplicate_out["assessments"]):
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
        if target in tasks and tasks[target].get("teamId", input_data.get("teamId")) != input_data.get("teamId"):
            errors.append(f"{prefix}: cannot change a task in another team")
        if parent in tasks and tasks[parent].get("teamId", input_data.get("teamId")) != input_data.get("teamId"):
            errors.append(f"{prefix}: cannot attach work to another team's task")
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
            unchanged = [key for key, value in fields.items() if comparable[key] == (_goal(value) if key == "goal" else value)]
            if unchanged:
                errors.append(f"{prefix}: unchanged fields {', '.join(unchanged)} must be omitted; use no_change when nothing differs")
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
            if (hours is None) != (estimate["basis"] == "unknown"):
                errors.append(f"{prefix}: unknown effort must be null; known effort must be finite")
        for confirmed in input_data.get("confirmedFields") or []:
            if confirmed.get("taskId") != target:
                continue
            field = confirmed.get("field", "")
            mapped = CONFIRMED_ALIASES.get(field, field)
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
    # Unrelated reference snapshots may be partial or carry pre-existing defects.
    # Check the whole connected impact component (tree, prerequisites and users of
    # those prerequisites), never just the changed edges; an external defect
    # becomes relevant as soon as this proposal depends on it.
    neighbours = {task_id: set() for task_id in graph}
    for task_id, task in graph.items():
        for other in [task.get("parentId"), *task.get("dependsOnTaskIds", [])]:
            if other in graph:
                neighbours[task_id].add(other)
                neighbours[other].add(task_id)
    relevant, pending = set(), [task_id for task_id in [root, *targets] if task_id in graph]
    while pending:
        task_id = pending.pop()
        if task_id not in relevant:
            relevant.add(task_id)
            pending.extend(neighbours[task_id] - relevant)
    graph = {task_id: task for task_id, task in graph.items() if task_id in relevant}
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
    for change in changes:
        if change["action"] == "create" and any(graph[parent].get("status") in TERMINAL for parent in ancestors.get(change["targetId"], [])):
            errors.append(f"task {change['targetId']}: cannot add work under a completed/cancelled ancestor")
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
    # Iterative topological elimination also handles long, flat task snapshots;
    # dependency depth must not be constrained by Python's recursion limit.
    incoming = dict.fromkeys(graph, 0)
    for deps in edges.values():
        for dep in deps:
            if dep in incoming:
                incoming[dep] += 1
    pending = [task_id for task_id, count in incoming.items() if count == 0]
    removed = 0
    while pending:
        task_id = pending.pop()
        removed += 1
        for dep in edges[task_id]:
            if dep in incoming:
                incoming[dep] -= 1
                if incoming[dep] == 0:
                    pending.append(dep)
    if removed != len(graph):
        errors.append("proposal impact graph: dependency cycle")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    try:
        errors = validate(read_json(args.input), read_json(args.output))
    except (OSError, ValueError, RecursionError) as error:
        errors = [f"validation input error: {error}"]
    print(json.dumps({"valid": not errors, "errors": errors}, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
