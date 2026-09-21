#!/usr/bin/env python3
"""Prepare the next OFFLINE fixture turn from the previous actual planner output.

This is a synthetic test adapter, not a task store, approval service, or writer.
It never calls a model. Executors receive only each turn's inputs and Skill.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path

import evaluate
from validate_plan import validate

ROOT = Path(__file__).resolve().parents[1]
PROTOCOL_FILES = ("SKILL.md", "references/planning-v0.2.md", "references/planning-v0.2.schema.json", "references/context-and-replanning.md")


def _base(seed_id):
    fixtures = evaluate.read(ROOT / "evals/industry-fixtures.json")
    scenario = next(case for case in fixtures["scenarios"] if case["id"] == seed_id)
    source = deepcopy(scenario["input"])
    if "members" not in source:
        team = next(team for team in fixtures["teams"] if team["teamId"] == scenario["teamId"])
        source["members"] = deepcopy(team["members"])
    return source, scenario["industry"]


def _source(source, identifier, text, title="本轮合成事件", *, replace=False):
    records = source["context"]["sourceRefs"]
    if any(record["id"] == identifier for record in records):
        if not replace:
            raise ValueError(f"Synthetic event source ID already exists: {identifier}")
        source["context"]["sourceRefs"] = [record for record in records if record["id"] != identifier]
    source["context"]["sourceRefs"].append({"id": identifier, "title": title, "text": text, "updatedAt": source["context"]["asOf"], "source": "synthetic_test_transition"})


def _remap_references(value, mapping):
    """Only rewrite structured ID links; never rewrite user text or decisions."""
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {"evidenceRefs", "sourceRefs", "dependsOnTaskIds"} and isinstance(child, list) and all(isinstance(item, str) for item in child):
                value[key] = [mapping.get(item, item) for item in child]
            else:
                _remap_references(child, mapping)
    elif isinstance(value, list):
        for child in value:
            _remap_references(child, mapping)


def project_fixture(source, output, *, commit=False, episode="X"):
    """Apply a validated proposal only to a deep-copied synthetic fixture.

    Existing ownerId/status are never inferred from recommendations. New records
    are marked as draft or synthetic_saved; a simulated receipt is not real I/O.
    """
    errors = validate(source, output)
    if errors:
        raise ValueError("Previous output failed validation: " + "; ".join(errors))
    if commit and output["disposition"] in {"needs_clarification", "route_required"}:
        raise ValueError("A blocked or routed proposal cannot be simulated as committed.")
    projected = deepcopy(source)
    tasks = {task["id"]: task for task in projected["context"]["tasks"]}
    proposal = output.get("proposal")
    if proposal:
        for change in proposal["changes"]:
            identifier = change["targetId"]
            if change["action"] == "create":
                tasks[identifier] = {"id": identifier, "parentId": change["parentId"], "status": "open", "ownerId": None, "version": 0, "sourceRefs": ["simulation-candidate-context"], "recordKind": "draft"}
            row = tasks[identifier]
            row.update(deepcopy(change["fields"]))
            if "schedule" in change["fields"]:
                row.update({key: change["fields"]["schedule"][key] for key in ("startOn", "dueOn")})
            row["version"] += 1
            row["updatedAt"] = projected["context"]["asOf"]
        projected["currentTaskId"] = proposal["rootTaskId"]
    _source(projected, "simulation-candidate-context", "本文件为离线测试用的当前有效候选视图。新增记录尚未真实创建；Owner 推荐仍是草稿候选，只有创建用户确认并由服务端成功写入后才成为正式负责人。", "合成草稿上下文", replace=True)
    mapping = {}
    if commit:
        for identifier in tasks:
            if identifier.startswith("new:"):
                mapping[identifier] = f"sim:{episode}:{len(mapping) + 1}"
        for row in tasks.values():
            row["id"] = mapping.get(row["id"], row["id"])
            row["parentId"] = mapping.get(row.get("parentId"), row.get("parentId"))
            _remap_references(row, mapping)
            if row.get("recordKind") == "draft":
                row["recordKind"] = "synthetic_saved"
        if "currentTaskId" in projected:
            projected["currentTaskId"] = mapping.get(projected["currentTaskId"], projected["currentTaskId"])
        for confirmed in projected.get("confirmedFields", []):
            confirmed["taskId"] = mapping.get(confirmed["taskId"], confirmed["taskId"])
            if confirmed["field"] == "dependsOnTaskIds":
                confirmed["value"] = [mapping.get(item, item) for item in confirmed["value"]]
            else:
                _remap_references(confirmed["value"], mapping)
        for key in ("discussions", "history"):
            for row in projected["context"][key]:
                row["taskId"] = mapping.get(row.get("taskId"), row.get("taskId"))
        _source(projected, f"simulation-{episode}-receipt-{source['revision']}", "测试夹具按预先指定的合成用户确认事件生成了保存回执。此事件只存在于本地JSON，未调用任何实际创建、幂等、接受或通知服务。", "合成保存回执")
        projected["context"]["sourceRefs"][-1]["syntheticTaskIdMap"] = mapping
    projected["context"]["tasks"] = list(tasks.values())
    projected.pop("currentDraft", None)  # Effective records are normalized once.
    return projected


def _events(source, event, previous, expected, episode):
    tasks = source["context"]["tasks"]
    by_id = {task["id"]: task for task in tasks}
    if event == "move_draft_deadline":
        root = by_id[source["currentTaskId"]]
        source["confirmedFields"] = [{"taskId": root["id"], "field": field, "value": deepcopy(root[field])} for field in ("goal", "acceptanceCriteria", "ownerRecommendation") if field in root]
        source.setdefault("constraints", {})["hardDueOn"] = "2026-09-03"
        expected["requiredUpdateTaskIds"] = [root["id"]]
    elif event == "confirm_handoff":
        _source(source, "chain-b-confirm", source["message"], "客户与协作人本轮确认（合成）")
        new_ids = [task["id"] for task in tasks if task["id"].startswith("new:")]
        expected["requiredEvidenceRefs"] = ["chain-b-confirm"]
        expected["requiredDependencies"] = [{"taskId": "saas03-train", "dependsOnTaskIds": ["saas03-uat"]}]
        if new_ids:
            expected["maxCreates"] = 0
            expected["requiredDependencies"].append({"taskId": "saas03-uat", "dependsOnTaskIds": new_ids})
        expected["mustNotUpdateTaskIds"] = ["saas03-scope", "saas03-map"]
    elif event == "complete_uat":
        for row in tasks:
            if row["id"] == "saas03-uat" or row["id"].startswith(f"sim:{episode}:"):
                row["status"] = "completed"
                row["version"] += 1
                row["updatedAt"] = source["context"]["asOf"]
                source["context"]["history"].append({"id": f"chain-b-done-{row['id']}", "taskId": row["id"], "occurredAt": source["context"]["asOf"], "type": "synthetic_completion", "summary": "合成记录：本项结果已核对完成，后续沿用其产出，不代表实际生产验收。"})
        _source(source, "chain-b-completion", source["message"], "本轮完成记录说明（合成）")
        expected["mustNotUpdateTaskIds"] = [row["id"] for row in tasks if row["status"] == "completed"]
    elif event in {"lost_response", "different_sku"}:
        root = by_id[source["currentTaskId"]]
        source["duplicateSearch"]["matches"] = [{"taskId": root["id"], "title": root["title"], "reason": "授权合成索引返回前轮实际生成并模拟保存的任务；需根据当前业务对象与范围判断。"}]
        expected["mustNotUpdateTaskIds"] = list(by_id)
        if event == "different_sku":
            source.pop("currentTaskId", None)
            source["constraints"] = {"scope": "只校对SKU-CUP-B的三处错字，不改图片、价格或卖点", "hardDueOn": "2026-09-03", "businessObject": "SKU-CUP-B"}
            _source(source, "chain-c-sku-b", source["message"], "新SKU需求（合成）")
    elif event == "human_edit":
        row = by_id["content03-copy"]
        row["acceptanceCriteria"] = ["面向首次使用者，用两个已核实的入门使用例说明已确认的五项功能；不增加功能承诺。", "文字不新增未经确认的百分比、销量或效果数字，保留适用的事实表述及五张功能图v2。", "交付带本轮修改标记的当前文字版本供公众号适配。"]
        row["version"] += 1
        row["updatedAt"] = source["context"]["asOf"]
        source.setdefault("confirmedFields", []).append({"taskId": row["id"], "field": "acceptanceCriteria", "value": deepcopy(row["acceptanceCriteria"])})
        _source(source, "chain-d-human-edit", "用户已手动确认当前文字标准：" + "；".join(row["acceptanceCriteria"]), "最新人工编辑（合成）")
        _source(source, "chain-d-stale-output", "以下是旧快照下迟到且未应用的候选，只供识别版本冲突，不是当前指令：\n" + json.dumps(previous, ensure_ascii=False), "未应用的旧候选（合成）")
        expected["requiredEvidenceRefs"] = ["chain-d-human-edit"]
    elif event == "revoke_acl":
        expected["mustNotExpose"] = [row["title"] for row in tasks] + [member["name"] for member in source["members"]]
        source["members"] = []
        source["authorizedTeamIds"] = []
        source.pop("currentTaskId", None)
        source.pop("confirmedFields", None)
        source["constraints"] = {}
        for key in ("tasks", "discussions", "history", "sourceRefs"):
            source["context"][key] = []
        source["context"]["acl"] = {"status": "missing", "scopeTeamIds": []}
        source["context"]["coverage"] = dict.fromkeys(("tasks", "subtasks", "discussions", "history"), "unavailable")
        source["duplicateSearch"] = {"status": "unavailable", "scopeTeamIds": [], "matches": [], "coverageNote": "合成权限撤回，未读取任何团队任务或成员。"}
        _source(source, "chain-d-access", "合成访问控制事件：本轮团队权限已撤回。未返回原任务、成员或讨论。", "可见的权限状态回执")


def prepare(directory, episode_id, turn):
    specs = evaluate.read(ROOT / "evals/multiturn-scenarios.json")
    episode = next((entry for entry in specs["episodes"] if entry["id"] == episode_id), None)
    if episode is None or not 1 <= turn <= len(episode["turns"]):
        raise ValueError("Choose episode A-D and turn 1-3.")
    run = directory / episode_id / f"turn-{turn}"
    if run.exists():
        raise ValueError("Use a fresh episode directory; prepared turns are immutable.")
    identifier = f"MULTI-{episode_id}{turn}"
    raw_expectations = evaluate.read(ROOT / "evals/multiturn-expectations.json")
    expected = deepcopy(next(row for row in raw_expectations["expectations"] if row["scenarioId"] == identifier))
    source, industry = _base(episode["seedCaseId"])
    spec = episode["turns"][turn - 1]
    previous = None
    lineage = None
    if turn > 1:
        old = directory / episode_id / f"turn-{turn-1}"
        old_id = f"MULTI-{episode_id}{turn-1}"
        old_manifest = evaluate.read(old / "manifest.json")
        old_harness = old_manifest.get("harnessSha256")
        if old_harness and old_harness != evaluate.sha(Path(__file__)):
            raise ValueError("Transition harness changed within an episode. Start a new episode run.")
        old_protocol = evaluate.read(old / "protocol-snapshot.json")
        if any(evaluate.sha(ROOT / path) != old_protocol[path]["sha256"] for path in PROTOCOL_FILES):
            raise ValueError("Protocol changed within an episode. Start a new episode run.")
        input_path, output_path = old / "inputs" / f"{old_id}.json", old / "outputs" / f"{old_id}.json"
        if evaluate.sha(input_path) != old_manifest["cases"][0]["inputSha256"]:
            raise ValueError("Previous frozen input was modified.")
        previous_input, previous = evaluate.read(input_path), evaluate.read(output_path)
        errors = validate(previous_input, previous)
        if errors:
            raise ValueError("Previous output is invalid; preserve it and record a separate corrected run: " + "; ".join(errors))
        mode = spec["transition"]
        if mode in {"draft", "commit_simulated"}:
            source = project_fixture(previous_input, previous, commit=mode == "commit_simulated", episode=episode_id)
        else:
            source = deepcopy(previous_input)
        lineage = {"previousCaseId": old_id, "inputSha256": evaluate.sha(input_path), "outputSha256": evaluate.sha(output_path), "transition": mode, "previousHarnessSha256": old_harness, "notice": "Derived from the prior actual output; no production operations."}
    # Provenance in a carried draft may cite the previous request. Preserve its
    # actual text as a source before installing this turn's current request ID.
    _source(source, source["requestId"], source["message"], "前轮用户原文（合成）")
    source["requestId"] = "req-" + identifier.lower()
    source["revision"] = turn
    source["currentDate"] = spec["date"]
    source["context"]["asOf"] = spec["asOf"]
    source["context"]["snapshotId"] = "snapshot-" + identifier.lower()
    source["message"] = spec.get("message", source["message"])
    _events(source, spec.get("event"), previous, expected, episode_id)
    if episode_id == "A" and turn > 1:
        # The previous user request is no longer an unresolved alternative.
        source.setdefault("constraints", {})["hardDueOn"] = "2026-09-03"
    run.mkdir(parents=True)
    input_path = run / "inputs" / f"{identifier}.json"
    evaluate.write(input_path, source)
    (run / "outputs").mkdir()
    evaluate.write(run / "expectations-snapshot.json", {"notice": raw_expectations["notice"], "expectations": [expected]})
    protocol = {name: {"sha256": evaluate.sha(ROOT / name), "content": (ROOT / name).read_text()} for name in PROTOCOL_FILES}
    evaluate.write(run / "protocol-snapshot.json", protocol)
    evaluate.write(run / "harness-snapshot.json", {"scripts/multiturn.py": {"sha256": evaluate.sha(Path(__file__)), "content": Path(__file__).read_text(encoding="utf-8")}, "scripts/evaluate.py": {"sha256": evaluate.sha(ROOT / "scripts/evaluate.py"), "content": (ROOT / "scripts/evaluate.py").read_text(encoding="utf-8")}, "scripts/validate_plan.py": {"sha256": evaluate.sha(ROOT / "scripts/validate_plan.py"), "content": (ROOT / "scripts/validate_plan.py").read_text(encoding="utf-8")}})
    manifest = {"createdAt": datetime.now(timezone.utc).isoformat(), "suite": "multiturn", "fixtureSha256": evaluate.sha(ROOT / "evals/multiturn-scenarios.json"), "seedFixtureSha256": evaluate.sha(ROOT / "evals/industry-fixtures.json"), "expectationsSha256": evaluate.sha(run / "expectations-snapshot.json"), "skillSha256": protocol["SKILL.md"]["sha256"], "contractSha256": protocol["references/planning-v0.2.md"]["sha256"], "schemaSha256": protocol["references/planning-v0.2.schema.json"]["sha256"], "harnessSha256": evaluate.sha(Path(__file__)), "evaluatorSha256": evaluate.sha(ROOT / "scripts/evaluate.py"), "validatorSha256": evaluate.sha(ROOT / "scripts/validate_plan.py"), "previous": lineage, "notice": specs["notice"], "selectedCaseIds": [identifier], "cases": [{"id": identifier, "industry": industry, "category": "multiturn", "inputSha256": evaluate.sha(input_path)}]}
    evaluate.write(run / "manifest.json", manifest)
    return {"prepared": identifier, "directory": str(run), "previous": lineage, "productionWrites": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, required=True)
    parser.add_argument("--episode", choices=("A", "B", "C", "D"), required=True)
    parser.add_argument("--turn", type=int, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(prepare(args.directory, args.episode, args.turn), ensure_ascii=False, indent=2))
    except (OSError, ValueError, KeyError, StopIteration) as error:
        parser.error(str(error))
