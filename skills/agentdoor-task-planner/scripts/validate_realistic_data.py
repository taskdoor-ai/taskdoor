#!/usr/bin/env python3
"""Validate dense synthetic business fixtures before planner evaluation.

This checks referential integrity and the promised data density. It does not
judge the planner output, authenticate ACL, or read production data.
"""

from __future__ import annotations

import argparse
from datetime import datetime
import json
from pathlib import Path
import re

from validate_plan import _input_errors, read_json


SUPPORTED_EXPECTATION_KEYS = {
    "scenarioId", "allowedIntents", "allowedDispositions", "mustPreserveTaskIds",
    "mustNotCreateTitles", "mustNotUpdateTaskIds", "maxCreates", "maxUpdates",
    "allowedUpdateTaskIds", "requiredUpdateTaskIds", "requiredDependencies", "exactDependencies",
    "mustNotExpose", "requiredEvidenceRefs", "requiredEvidenceGroups", "manualChecks",
}


def _duplicates(values):
    seen, repeated = set(), set()
    for value in values:
        if value in seen:
            repeated.add(value)
        seen.add(value)
    return repeated


def _cycle(nodes, edges):
    visiting, visited = set(), set()

    def visit(node):
        if node in visiting:
            return True
        if node in visited:
            return False
        visiting.add(node)
        for child in edges.get(node, ()):
            if child in nodes and visit(child):
                return True
        visiting.remove(node)
        visited.add(node)
        return False

    return any(visit(node) for node in nodes)


def _task_depth(task_id, parents, errors, label):
    depth, seen, current = 1, set(), task_id
    while parents.get(current) is not None:
        if current in seen:
            errors.append(f"{label}: parent cycle at {current}")
            return 0
        seen.add(current)
        current = parents[current]
        depth += 1
    return depth


def _instant(value, errors, label):
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        errors.append(f"{label}: invalid ISO timestamp {value!r}")
        return None


def validate(fixtures, expectation_document):
    errors = []
    teams = fixtures.get("teams")
    scenarios = fixtures.get("scenarios")
    expectations = expectation_document.get("expectations")
    if not isinstance(teams, list) or not isinstance(scenarios, list) or not isinstance(expectations, list):
        return {}, ["fixtures teams/scenarios and expectations must be arrays"]

    team_ids = [team.get("teamId") for team in teams if isinstance(team, dict)]
    if len(team_ids) != len(teams) or any(not isinstance(value, str) or not value for value in team_ids):
        errors.append("teams: every team needs a nonempty teamId")
    for value in sorted(_duplicates(team_ids), key=str):
        errors.append(f"teams: duplicate teamId {value}")
    team_map = {team.get("teamId"): team for team in teams if isinstance(team, dict)}

    for team_id, team in team_map.items():
        members = team.get("members", [])
        ids = [member.get("id") for member in members if isinstance(member, dict)]
        if len(ids) != len(members) or _duplicates(ids):
            errors.append(f"team {team_id}: invalid or duplicate member ids")
        if not 6 <= len(members) <= 8:
            errors.append(f"team {team_id}: expected 6-8 members, got {len(members)}")
        for member in members:
            for key in ("name", "role", "responsibilities", "boundaries", "evidence", "availability"):
                if key not in member:
                    errors.append(f"team {team_id} member {member.get('id')}: missing {key}")
    all_member_ids = [member.get("id") for team in teams for member in team.get("members", []) if isinstance(member, dict)]
    for value in sorted(_duplicates(all_member_ids), key=str):
        errors.append(f"teams: member id must be globally unique: {value}")

    scenario_ids = [scenario.get("id") for scenario in scenarios if isinstance(scenario, dict)]
    if len(scenario_ids) != len(scenarios) or _duplicates(scenario_ids):
        errors.append("scenarios: ids must be present and unique")
    expectation_ids = [item.get("scenarioId") for item in expectations if isinstance(item, dict)]
    if len(expectation_ids) != len(expectations) or _duplicates(expectation_ids):
        errors.append("expectations: scenarioId values must be present and unique")
    if set(scenario_ids) != set(expectation_ids):
        errors.append("expectations: scenario ids must exactly match fixtures")
    expectation_map = {item.get("scenarioId"): item for item in expectations if isinstance(item, dict)}

    totals = dict(teams=len(teams), scenarios=len(scenarios), members=0, stakeholders=0, tasks=0, files=0, discussions=0, history=0, dependencyEdges=0, confirmedFields=0, duplicateMatches=0)
    totals["members"] = sum(len(team.get("members", [])) for team in teams)
    case_summaries = []

    for scenario in scenarios:
        case_id = scenario.get("id", "<missing>")
        label = f"scenario {case_id}"
        if not re.fullmatch(r"[A-Za-z0-9_-]+", str(case_id)):
            errors.append(f"{label}: unsafe id")
        team_id = scenario.get("teamId")
        if team_id not in team_map:
            errors.append(f"{label}: unknown teamId {team_id}")
            continue
        source = scenario.get("input", {})
        context = source.get("context", {})
        if source.get("dataClassification") != "synthetic":
            errors.append(f"{label}: dataClassification must be synthetic")
        if context.get("coverage", {}).get("files") != "complete":
            errors.append(f"{label}: file coverage must be complete")
        tasks = context.get("tasks", [])
        task_ids = [task.get("id") for task in tasks if isinstance(task, dict)]
        task_set = set(task_ids)
        if len(task_ids) != len(tasks) or _duplicates(task_ids):
            errors.append(f"{label}: invalid or duplicate task ids")
        if not 10 <= len(tasks) <= 16:
            errors.append(f"{label}: expected 10-16 tasks, got {len(tasks)}")
        parents = {task.get("id"): task.get("parentId") for task in tasks if isinstance(task, dict)}
        for task_id, parent_id in parents.items():
            if parent_id is not None and parent_id not in task_set:
                errors.append(f"{label}: task {task_id} has missing parent {parent_id}")
        max_depth = max((_task_depth(task_id, parents, errors, label) for task_id in task_ids), default=0)
        if max_depth < 3:
            errors.append(f"{label}: expected at least three task levels, got {max_depth}")
        dependency_edges = {task.get("id"): task.get("dependsOnTaskIds", []) for task in tasks if isinstance(task, dict)}
        edge_count = 0
        cross_branch = 0
        for task_id, dependencies in dependency_edges.items():
            if not isinstance(dependencies, list) or any(dep not in task_set for dep in dependencies):
                errors.append(f"{label}: task {task_id} has invalid dependency ids")
                continue
            edge_count += len(dependencies)
            for dep in dependencies:
                if parents.get(task_id) == dep or parents.get(dep) == task_id:
                    errors.append(f"{label}: task {task_id} has a parent-child dependency with {dep}")
                if parents.get(task_id) != parents.get(dep):
                    cross_branch += 1
        if edge_count < 4:
            errors.append(f"{label}: expected at least four dependency edges, got {edge_count}")
        if cross_branch < 1:
            errors.append(f"{label}: expected a cross-branch dependency")
        if _cycle(task_set, dependency_edges):
            errors.append(f"{label}: dependency graph contains a cycle")

        source_refs = context.get("sourceRefs", [])
        ref_ids = [item.get("id") for item in source_refs if isinstance(item, dict)]
        if len(ref_ids) != len(source_refs) or _duplicates(ref_ids):
            errors.append(f"{label}: invalid or duplicate sourceRef ids")
        ref_map = {item.get("id"): item for item in source_refs if isinstance(item, dict)}
        files = context.get("files", [])
        file_ids = [item.get("id") for item in files if isinstance(item, dict)]
        if len(file_ids) != len(files) or _duplicates(file_ids):
            errors.append(f"{label}: invalid or duplicate file ids")
        if not 5 <= len(files) <= 8:
            errors.append(f"{label}: expected 5-8 files, got {len(files)}")
        for item in files:
            file_id = item.get("id")
            for key in ("fileName", "mimeType", "version", "checksum", "status", "linkedTaskIds", "source"):
                if key not in item:
                    errors.append(f"{label}: file {file_id} missing {key}")
            if item.get("source") != "synthetic_file_store":
                errors.append(f"{label}: file {file_id} must use synthetic_file_store")
            if not re.fullmatch(r"[0-9a-f]{64}", str(item.get("checksum", ""))):
                errors.append(f"{label}: file {file_id} checksum must be 64 lowercase hex chars")
            if any(task_id not in task_set for task_id in item.get("linkedTaskIds", [])):
                errors.append(f"{label}: file {file_id} links unknown task")
            if file_id not in ref_map or ref_map[file_id].get("source") != "synthetic_file_store":
                errors.append(f"{label}: file {file_id} needs a same-id synthetic_file_store sourceRef")
            else:
                loaded = ref_map[file_id]
                metadata_keys = ("fileName", "mimeType", "version", "checksum", "status", "linkedTaskIds")
                for key in metadata_keys:
                    if key in loaded and loaded[key] != item.get(key):
                        errors.append(f"{label}: file {file_id} {key} disagrees with its sourceRef")
                if not all(key in loaded for key in metadata_keys):
                    excerpt = f"{loaded.get('title', '')} {loaded.get('text', '')}"
                    required_tokens = [str(item.get("checksum")), str(item.get("status")), *map(str, item.get("linkedTaskIds", []))]
                    version = str(item.get("version"))
                    if not (version in excerpt or f"v{version}" in excerpt) or any(token not in excerpt for token in required_tokens):
                        errors.append(f"{label}: file {file_id} sourceRef excerpt does not identify its version/status/checksum/task links")

        members = source.get("members", team_map[team_id].get("members", []))
        member_ids = {member.get("id") for member in members if isinstance(member, dict)}
        stakeholders = context.get("stakeholders", [])
        stakeholder_ids = [item.get("id") for item in stakeholders if isinstance(item, dict)]
        if len(stakeholder_ids) != len(stakeholders) or _duplicates(stakeholder_ids):
            errors.append(f"{label}: invalid or duplicate stakeholder ids")
        if member_ids & set(stakeholder_ids):
            errors.append(f"{label}: stakeholder ids overlap assignable members")
        for stakeholder in stakeholders:
            for key in ("name", "role", "relationship", "assignable"):
                if key not in stakeholder:
                    errors.append(f"{label}: stakeholder {stakeholder.get('id')} missing {key}")
            if stakeholder.get("assignable") is not False:
                errors.append(f"{label}: stakeholder {stakeholder.get('id')} must be non-assignable")
        normalized_source = dict(source)
        normalized_source.setdefault("members", members)
        for input_error in _input_errors(normalized_source):
            errors.append(f"{label}: {input_error}")
        for task in tasks:
            if task.get("ownerId") is not None and task.get("ownerId") not in member_ids:
                errors.append(f"{label}: task {task.get('id')} owner is outside assignable members")
            if any(ref not in ref_map for ref in task.get("sourceRefs", [])):
                errors.append(f"{label}: task {task.get('id')} points to an unloaded sourceRef")
            due = task.get("dueOn", (task.get("schedule") or {}).get("dueOn"))
            if due is not None and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(due)):
                errors.append(f"{label}: task {task.get('id')} has an invalid dueOn")
            parent_id = task.get("parentId")
            while parent_id in task_set:
                parent = next(item for item in tasks if item.get("id") == parent_id)
                parent_due = parent.get("dueOn", (parent.get("schedule") or {}).get("dueOn"))
                if due and parent_due and due > parent_due:
                    errors.append(f"{label}: task {task.get('id')} dueOn exceeds ancestor {parent_id}")
                parent_id = parent.get("parentId")
        discussions = context.get("discussions", [])
        discussion_ids = [item.get("id") for item in discussions if isinstance(item, dict)]
        discussion_set = set(discussion_ids)
        discussion_map = {item.get("id"): item for item in discussions if isinstance(item, dict)}
        if len(discussion_ids) != len(discussions) or _duplicates(discussion_ids):
            errors.append(f"{label}: invalid or duplicate discussion ids")
        if not 6 <= len(discussions) <= 10:
            errors.append(f"{label}: expected 6-10 discussions, got {len(discussions)}")
        if sum(item.get("replyToId") is not None for item in discussions) < 2:
            errors.append(f"{label}: expected at least two threaded replies")
        if len({item.get("kind") for item in discussions}) < 3:
            errors.append(f"{label}: expected at least three discussion kinds")
        as_of = _instant(context.get("asOf"), errors, f"{label} context.asOf")
        for item in discussions:
            if not item.get("threadId"):
                errors.append(f"{label}: discussion {item.get('id')} missing threadId")
            if item.get("taskId") not in task_set:
                errors.append(f"{label}: discussion {item.get('id')} references unknown task")
            if item.get("authorId") not in member_ids | set(stakeholder_ids):
                errors.append(f"{label}: discussion {item.get('id')} author is outside the authorized speaker catalog")
            if item.get("replyToId") is not None and item.get("replyToId") not in discussion_set:
                errors.append(f"{label}: discussion {item.get('id')} has a dangling reply")
            elif item.get("replyToId") is not None and discussion_map[item["replyToId"]].get("threadId") != item.get("threadId"):
                errors.append(f"{label}: discussion {item.get('id')} replies across threads")
            created_at = _instant(item.get("createdAt"), errors, f"{label} discussion {item.get('id')}.createdAt")
            if created_at and as_of and created_at > as_of:
                errors.append(f"{label}: discussion {item.get('id')} occurs after snapshot asOf")
            if item.get("replyToId") in discussion_map:
                parent_at = _instant(discussion_map[item["replyToId"]].get("createdAt"), errors, f"{label} discussion {item.get('replyToId')}.createdAt")
                if created_at and parent_at and created_at <= parent_at:
                    errors.append(f"{label}: discussion {item.get('id')} reply is not later than its parent")

        history = context.get("history", [])
        history_profile = scenario.get("historyProfile", "rich")
        history_ids = [item.get("id") for item in history if isinstance(item, dict)]
        if len(history_ids) != len(history) or _duplicates(history_ids):
            errors.append(f"{label}: invalid or duplicate history ids")
        if history_profile == "rich":
            if not 4 <= len(history) <= 8:
                errors.append(f"{label}: rich history expects 4-8 records, got {len(history)}")
            if len({item.get("type") for item in history}) < 2:
                errors.append(f"{label}: rich history expects at least two event types")
        elif history_profile == "none":
            if context.get("coverage", {}).get("history") != "complete" or history:
                errors.append(f"{label}: no-history profile requires complete coverage and an empty history array")
        elif history_profile == "partial":
            if context.get("coverage", {}).get("history") != "partial" or not history:
                errors.append(f"{label}: partial-history profile requires partial coverage and visible records")
        elif history_profile == "unavailable":
            if context.get("coverage", {}).get("history") != "unavailable" or history:
                errors.append(f"{label}: unavailable-history profile requires unavailable coverage and no records")
        else:
            errors.append(f"{label}: unknown historyProfile {history_profile}")
        if any(item.get("taskId") not in task_set for item in history):
            errors.append(f"{label}: history references unknown task")
        for item in history:
            occurred_at = _instant(item.get("occurredAt"), errors, f"{label} history {item.get('id')}.occurredAt")
            if occurred_at and as_of and occurred_at > as_of:
                errors.append(f"{label}: history {item.get('id')} occurs after snapshot asOf")

        confirmed = source.get("confirmedFields", [])
        if not confirmed:
            errors.append(f"{label}: expected at least one confirmed field")
        if any(item.get("taskId") not in task_set for item in confirmed):
            errors.append(f"{label}: confirmedFields references unknown task")
        duplicate_matches = source.get("duplicateSearch", {}).get("matches", [])
        if not duplicate_matches:
            errors.append(f"{label}: expected at least one duplicate-search candidate")
        if any(item.get("taskId") not in task_set for item in duplicate_matches):
            errors.append(f"{label}: duplicateSearch match is not in the visible task snapshot")

        member_evidence = {e.get("id") for member in members for e in member.get("evidence", []) if isinstance(e, dict)}
        source_namespace = [source.get("requestId"), *task_ids, *member_ids, *stakeholder_ids, *discussion_ids, *history_ids, *ref_ids, *member_evidence]
        for value in sorted(_duplicates(source_namespace), key=str):
            errors.append(f"{label}: ambiguous evidence id {value}")
        eligible_evidence = task_set | set(ref_ids) | discussion_set | set(history_ids) | member_evidence | {source.get("requestId")}
        expected = expectation_map.get(case_id, {})
        unknown_keys = set(expected) - SUPPORTED_EXPECTATION_KEYS
        if unknown_keys:
            errors.append(f"{label}: unsupported expectation keys {sorted(unknown_keys)}")
        if len(expected.get("manualChecks", [])) < 4:
            errors.append(f"{label}: expected at least four manual semantic checks")
        for key in ("mustPreserveTaskIds", "mustNotUpdateTaskIds", "allowedUpdateTaskIds", "requiredUpdateTaskIds"):
            if any(task_id not in task_set for task_id in expected.get(key, [])):
                errors.append(f"{label}: {key} references unknown task")
        required_updates = set(expected.get("requiredUpdateTaskIds", []))
        if required_updates & set(expected.get("mustPreserveTaskIds", [])):
            errors.append(f"{label}: required updates cannot also be required preserved tasks")
        if required_updates & set(expected.get("mustNotUpdateTaskIds", [])):
            errors.append(f"{label}: required updates cannot also be protected from updates")
        if "allowedUpdateTaskIds" in expected and not required_updates <= set(expected.get("allowedUpdateTaskIds", [])):
            errors.append(f"{label}: required updates must be inside allowed update scope")
        if any(ref not in eligible_evidence for ref in expected.get("requiredEvidenceRefs", [])):
            errors.append(f"{label}: requiredEvidenceRefs contains an ineligible id")
        for group in expected.get("requiredEvidenceGroups", []):
            if not group or any(ref not in eligible_evidence for ref in group):
                errors.append(f"{label}: invalid requiredEvidenceGroups entry")
        for expectation_key, description in (
            ("requiredDependencies", "required dependency"),
            ("exactDependencies", "exact dependency"),
        ):
            requirements = expected.get(expectation_key, [])
            consumer_ids = [requirement.get("taskId") for requirement in requirements]
            if _duplicates(consumer_ids):
                errors.append(f"{label}: {description} repeats a consumer")
            for requirement in requirements:
                if requirement.get("taskId") not in task_set:
                    errors.append(f"{label}: {description} consumer is not an existing task")
                dependency_ids = requirement.get("dependsOnTaskIds", [])
                if _duplicates(dependency_ids):
                    errors.append(f"{label}: {description} repeats a dependency")
                if any(dep not in task_set and not str(dep).startswith("new:") for dep in dependency_ids):
                    errors.append(f"{label}: {description} references an unknown result")
        required_dependency_map = {
            item.get("taskId"): set(item.get("dependsOnTaskIds", []))
            for item in expected.get("requiredDependencies", [])
        }
        exact_dependency_map = {
            item.get("taskId"): set(item.get("dependsOnTaskIds", []))
            for item in expected.get("exactDependencies", [])
        }
        for consumer_id in required_dependency_map.keys() & exact_dependency_map.keys():
            if not required_dependency_map[consumer_id] <= exact_dependency_map[consumer_id]:
                errors.append(f"{label}: required dependency set contradicts exact dependency set for {consumer_id}")

        totals["tasks"] += len(tasks)
        totals["stakeholders"] += len(stakeholders)
        totals["files"] += len(files)
        totals["discussions"] += len(discussions)
        totals["history"] += len(history)
        totals["dependencyEdges"] += edge_count
        totals["confirmedFields"] += len(confirmed)
        totals["duplicateMatches"] += len(duplicate_matches)
        case_summaries.append({"id": case_id, "industry": scenario.get("industry"), "historyProfile": history_profile, "tasks": len(tasks), "maxTaskDepth": max_depth, "dependencyEdges": edge_count, "files": len(files), "discussions": len(discussions), "history": len(history)})

    summary = {"dataClassification": fixtures.get("dataPolicy", {}).get("classification"), "totals": totals, "cases": case_summaries, "productionValidation": "not_run"}
    if summary["dataClassification"] != "synthetic":
        errors.append("fixtures.dataPolicy.classification must be synthetic")
    return summary, errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixtures", type=Path, required=True)
    parser.add_argument("--expectations", type=Path, required=True)
    args = parser.parse_args()
    summary, errors = validate(read_json(args.fixtures), read_json(args.expectations))
    print(json.dumps({"valid": not errors, "errors": errors, "summary": summary}, ensure_ascii=False, indent=2))
    raise SystemExit(bool(errors))


if __name__ == "__main__":
    main()
