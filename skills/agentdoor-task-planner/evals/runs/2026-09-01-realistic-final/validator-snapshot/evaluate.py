"""Prepare blinded inputs or check recorded outputs; never calls a model or writes tasks.

python3 skills/agentdoor-task-planner/scripts/evaluate.py prepare --directory /tmp/planner-eval
python3 skills/agentdoor-task-planner/scripts/evaluate.py prepare --directory /tmp/planner-subset --cases NPI-01 RETAIL-02
python3 skills/agentdoor-task-planner/scripts/evaluate.py check --directory /tmp/planner-eval

Outputs belong in DIRECTORY/outputs/SCENARIO_ID.json. Expected answers are never
copied into the blinded input directory; an exact snapshot stays at the run root.
Checks use frozen expectations but the current validator and schema, reporting
protocol version drift. Semantic review remains separate.
"""

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from validate_plan import loads_strict, read_json

ROOT = Path(__file__).resolve().parents[1]
PREPARE_SUITES = {"industry", "edge", "complex", "realistic"}
CHECK_SUITES = PREPARE_SUITES | {"multiturn"}


def read(path):
    return read_json(path)


def write(path, value):
    serialized = json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(serialized, encoding="utf-8")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(directory, cases=None, suite="industry"):
    if (directory / "manifest.json").exists():
        raise ValueError("Use a new directory; do not overwrite a frozen run.")
    if suite not in PREPARE_SUITES:
        raise ValueError("Unknown suite; choose industry, edge, complex, or realistic.")
    fixtures_path = ROOT / f"evals/{suite}-fixtures.json"
    fixtures = read(fixtures_path)
    teams = {team["teamId"]: team for team in fixtures["teams"]}
    scenarios = {}
    for scenario in fixtures["scenarios"]:
        case_id = scenario["id"]
        if not re.fullmatch(r"[A-Za-z0-9_-]+", case_id) or case_id in scenarios:
            raise ValueError("Scenario IDs must be unique safe filenames.")
        scenarios[case_id] = scenario
    selected_ids = list(scenarios) if cases is None else list(cases)
    if not selected_ids:
        raise ValueError("Select at least one scenario ID.")
    if len(set(selected_ids)) != len(selected_ids):
        raise ValueError("Duplicate scenario IDs in --cases are not allowed.")
    unknown = set(selected_ids) - scenarios.keys()
    if unknown:
        raise ValueError(f"Unknown scenario IDs: {', '.join(sorted(unknown))}")

    expectations_bytes = (ROOT / f"evals/{suite}-expectations.json").read_bytes()
    protocol_files = ("SKILL.md", "references/planning-v0.2.md", "references/planning-v0.2.schema.json", "references/context-and-replanning.md")
    protocol_snapshot = {}
    for name in protocol_files:
        content = (ROOT / name).read_bytes()
        protocol_snapshot[name] = {"sha256": hashlib.sha256(content).hexdigest(), "content": content.decode("utf-8")}
    manifest = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "suite": suite,
        "fixtureSha256": sha(fixtures_path),
        "expectationsSha256": hashlib.sha256(expectations_bytes).hexdigest(),
        "skillSha256": protocol_snapshot["SKILL.md"]["sha256"],
        "contractSha256": protocol_snapshot["references/planning-v0.2.md"]["sha256"],
        "schemaSha256": protocol_snapshot["references/planning-v0.2.schema.json"]["sha256"],
        "notice": "Synthetic, offline Skill evaluation. No model API, production ACL or task writes are exercised by this script.",
        "selectedCaseIds": selected_ids,
        "cases": [],
    }
    for case_id in selected_ids:
        scenario = scenarios[case_id]
        source = scenario["input"]
        if "members" not in source:
            team_id = scenario["teamId"]
            acl = source["context"]["acl"]
            permitted = acl["status"] == "verified" and team_id in acl["scopeTeamIds"] and team_id in source["authorizedTeamIds"]
            source["members"] = teams[team_id]["members"] if permitted else []
        path = directory / "inputs" / f"{case_id}.json"
        write(path, source)
        manifest["cases"].append({"id": case_id, "industry": scenario["industry"], "category": scenario["category"], "inputSha256": sha(path)})
    (directory / "outputs").mkdir(parents=True, exist_ok=True)
    (directory / "expectations-snapshot.json").write_bytes(expectations_bytes)
    write(directory / "protocol-snapshot.json", protocol_snapshot)
    # Write the freeze marker last, after all inputs and snapshots are present.
    write(directory / "manifest.json", manifest)
    return {"prepared": len(manifest["cases"]), "directory": str(directory), "expectedAnswersIncluded": True, "expectedAnswersIncludedInInputs": False}


def check(directory):
    from validate_plan import validate

    manifest = read(directory / "manifest.json")
    version_checks = {
        "skill": sha(ROOT / "SKILL.md") == manifest["skillSha256"],
        "contract": sha(ROOT / "references/planning-v0.2.md") == manifest["contractSha256"],
        "schema": sha(ROOT / "references/planning-v0.2.schema.json") == manifest["schemaSha256"],
    }
    snapshot_path = directory / "expectations-snapshot.json"
    has_snapshot = snapshot_path.exists()
    suite = manifest.get("suite", "industry")
    if suite not in CHECK_SUITES:
        raise ValueError("Unknown suite in manifest.")
    if not has_snapshot and suite == "multiturn":
        raise ValueError("Multi-turn runs require their frozen expectation snapshot.")
    expectations_path = snapshot_path if has_snapshot else ROOT / f"evals/{suite}-expectations.json"
    expectations_bytes = expectations_path.read_bytes()
    expectations_sha = hashlib.sha256(expectations_bytes).hexdigest()
    if expectations_sha != manifest["expectationsSha256"]:
        raise ValueError("Expectations do not match the frozen manifest; restore the exact snapshot or record a separate run.")
    expectations = {item["scenarioId"]: item for item in loads_strict(expectations_bytes)["expectations"]}
    results = []
    for case in manifest["cases"]:
        case_id = case["id"]
        input_path = directory / "inputs" / f"{case_id}.json"
        output_path = directory / "outputs" / f"{case_id}.json"
        result = {"id": case_id, "industry": case["industry"], "errors": [], "semanticReview": "not_reviewed"}
        try:
            if sha(input_path) != case["inputSha256"]:
                result["errors"].append("Frozen input was modified.")
            if not output_path.exists():
                result["errors"].append("Missing output; included in the denominator.")
                result["status"] = "missing"
                results.append(result)
                continue
            source, output = read(input_path), read(output_path)
            result["errors"].extend(validate(source, output))
            expected = expectations[case_id]
            for name, key in (("allowedIntents", "intent"), ("allowedDispositions", "disposition")):
                if expected.get(name) and output.get(key) not in expected[name]:
                    result["errors"].append(f"{key} outside the case's allowed outcomes")
            proposal = output.get("proposal") or {}
            changes = proposal.get("changes", [])
            created_titles = {change.get("fields", {}).get("title") for change in changes if change.get("action") == "create"}
            updated_ids = {change.get("targetId") for change in changes if change.get("action") == "update"}
            preserved = set(proposal.get("preservedTaskIds", [])) if proposal else {task["id"] for task in source["context"]["tasks"]}
            if not set(expected.get("mustPreserveTaskIds", [])) <= preserved:
                result["errors"].append("Required existing work not preserved")
            if set(expected.get("mustNotCreateTitles", [])) & created_titles:
                result["errors"].append("Recreated a forbidden already-covered title")
            if set(expected.get("mustNotUpdateTaskIds", [])) & updated_ids:
                result["errors"].append("Updated a protected case task")
            created_count = sum(change.get("action") == "create" for change in changes)
            updated_count = len(updated_ids)
            for key, count in (("maxCreates", created_count), ("maxUpdates", updated_count)):
                if key in expected and count > expected[key]:
                    result["errors"].append(f"{key}: exceeded the case's allowed changes")
            if "allowedUpdateTaskIds" in expected and not updated_ids <= set(expected["allowedUpdateTaskIds"]):
                result["errors"].append("Updated outside the case's requested scope")
            if not set(expected.get("requiredUpdateTaskIds", [])) <= updated_ids:
                result["errors"].append("Missing a required affected-task update")
            resulting_tasks = {task["id"]: dict(task) for task in source["context"]["tasks"]}
            for change in changes:
                resulting_tasks.setdefault(change["targetId"], {}).update(change.get("fields", {}))
            for dependency in expected.get("requiredDependencies", []):
                actual = set(resulting_tasks.get(dependency["taskId"], {}).get("dependsOnTaskIds", []))
                if not set(dependency["dependsOnTaskIds"]) <= actual:
                    result["errors"].append(f"Missing required handoff dependencies for {dependency['taskId']}")
            for dependency in expected.get("exactDependencies", []):
                actual = set(resulting_tasks.get(dependency["taskId"], {}).get("dependsOnTaskIds", []))
                if set(dependency["dependsOnTaskIds"]) != actual:
                    result["errors"].append(f"Final dependency set does not exactly match for {dependency['taskId']}")
            serialized = json.dumps(output, ensure_ascii=False)
            if any(term in serialized for term in expected.get("mustNotExpose", [])):
                result["errors"].append("Output exposed data removed from the current authorized context")

            def evidence(value):
                found = set()
                if isinstance(value, dict):
                    found.update(value.get("evidenceRefs", []))
                    for child in value.values():
                        found.update(evidence(child))
                elif isinstance(value, list):
                    for child in value:
                        found.update(evidence(child))
                return found

            cited = evidence(output)
            if not set(expected.get("requiredEvidenceRefs", [])) <= cited:
                result["errors"].append("Missing a required source reference")
            for alternatives in expected.get("requiredEvidenceGroups", []):
                if not alternatives or not cited.intersection(alternatives):
                    result["errors"].append("Missing a required equivalent-evidence group")
            result.update(summary=output.get("summary"), intent=output.get("intent"), disposition=output.get("disposition"), changes=len(changes), outputSha256=sha(output_path), manualChecks=expected.get("manualChecks", []))
            result["status"] = "failed" if result["errors"] else "structurally_valid"
        except (ValueError, KeyError, TypeError, AttributeError, OSError, RecursionError) as error:
            result["errors"].append(f"Invalid artifact: {error}")
            result["status"] = "failed"
        results.append(result)
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "total": len(results), "structurallyValid": sum(r["status"] == "structurally_valid" for r in results), "semanticPassRate": None, "productionValidation": "not_run", "versionChecks": version_checks, "validatorSha256": sha(ROOT / "scripts/validate_plan.py"), "expectationsSha256": expectations_sha, "expectationsSource": "run_snapshot" if has_snapshot else "current_repository", "results": results}
    write(directory / "structural-report.json", report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("prepare", "check"))
    parser.add_argument("--directory", type=Path, required=True)
    parser.add_argument("--cases", nargs="+", metavar="ID", help="Prepare only these scenario IDs; the default is every scenario.")
    parser.add_argument("--suite", choices=("industry", "edge", "complex", "realistic"), default=None, help="Case corpus for prepare; defaults to industry.")
    args = parser.parse_args()
    if args.command != "prepare" and args.cases is not None:
        parser.error("--cases is only supported by prepare.")
    if args.command != "prepare" and args.suite is not None:
        parser.error("--suite is only supported by prepare; check uses the frozen manifest.")
    try:
        result = prepare(args.directory, args.cases, args.suite or "industry") if args.command == "prepare" else check(args.directory)
    except ValueError as error:
        parser.error(str(error))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if args.command == "check" and result["structurallyValid"] != result["total"]:
        raise SystemExit(1)
