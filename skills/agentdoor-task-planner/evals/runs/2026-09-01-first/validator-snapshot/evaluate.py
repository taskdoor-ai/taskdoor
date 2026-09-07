"""Prepare blinded inputs or check recorded outputs; never calls a model or writes tasks.

python3 skills/agentdoor-task-planner/scripts/evaluate.py prepare --directory /tmp/planner-eval
python3 skills/agentdoor-task-planner/scripts/evaluate.py check --directory /tmp/planner-eval

Outputs belong in DIRECTORY/outputs/SCENARIO_ID.json. Expected answers are never
copied into the blinded input directory. Semantic review remains separate.
"""

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(path.read_text())


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(directory):
    if (directory / "manifest.json").exists():
        raise ValueError("Use a new directory; do not overwrite a frozen run.")
    fixtures_path = ROOT / "evals/industry-fixtures.json"
    fixtures = read(fixtures_path)
    teams = {team["teamId"]: team for team in fixtures["teams"]}
    manifest = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "fixtureSha256": sha(fixtures_path),
        "expectationsSha256": sha(ROOT / "evals/industry-expectations.json"),
        "skillSha256": sha(ROOT / "SKILL.md"),
        "contractSha256": sha(ROOT / "references/planning-v0.2.md"),
        "schemaSha256": sha(ROOT / "references/planning-v0.2.schema.json"),
        "notice": "Synthetic, offline Skill evaluation. No model API, production ACL or task writes are exercised by this script.",
        "cases": [],
    }
    for scenario in fixtures["scenarios"]:
        case_id = scenario["id"]
        if not re.fullmatch(r"[A-Za-z0-9_-]+", case_id) or any(case["id"] == case_id for case in manifest["cases"]):
            raise ValueError("Scenario IDs must be unique safe filenames.")
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
    write(directory / "manifest.json", manifest)
    protocol_files = ("SKILL.md", "references/planning-v0.2.md", "references/planning-v0.2.schema.json", "references/context-and-replanning.md")
    write(directory / "protocol-snapshot.json", {name: {"sha256": sha(ROOT / name), "content": (ROOT / name).read_text()} for name in protocol_files})
    return {"prepared": len(manifest["cases"]), "directory": str(directory), "expectedAnswersIncluded": False}


def check(directory):
    from validate_plan import validate

    manifest = read(directory / "manifest.json")
    version_checks = {
        "skill": sha(ROOT / "SKILL.md") == manifest["skillSha256"],
        "contract": sha(ROOT / "references/planning-v0.2.md") == manifest["contractSha256"],
        "schema": sha(ROOT / "references/planning-v0.2.schema.json") == manifest["schemaSha256"],
    }
    expectations_path = ROOT / "evals/industry-expectations.json"
    expectations = {item["scenarioId"]: item for item in read(expectations_path)["expectations"]}
    if sha(expectations_path) != manifest["expectationsSha256"]:
        raise ValueError("Expectations changed after inputs were frozen; record a separate run.")
    results = []
    for case in manifest["cases"]:
        case_id = case["id"]
        input_path = directory / "inputs" / f"{case_id}.json"
        output_path = directory / "outputs" / f"{case_id}.json"
        result = {"id": case_id, "industry": case["industry"], "errors": [], "semanticReview": "not_reviewed"}
        if sha(input_path) != case["inputSha256"]:
            result["errors"].append("Frozen input was modified.")
        if not output_path.exists():
            result["errors"].append("Missing output; included in the denominator.")
            result["status"] = "missing"
            results.append(result)
            continue
        try:
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

            if not set(expected.get("requiredEvidenceRefs", [])) <= evidence(output):
                result["errors"].append("Missing a required source reference")
            result.update(summary=output.get("summary"), intent=output.get("intent"), disposition=output.get("disposition"), changes=len(changes), outputSha256=sha(output_path), manualChecks=expected.get("manualChecks", []))
            result["status"] = "failed" if result["errors"] else "structurally_valid"
        except (ValueError, KeyError, TypeError) as error:
            result["errors"].append(f"Invalid artifact: {error}")
            result["status"] = "failed"
        results.append(result)
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "total": len(results), "structurallyValid": sum(r["status"] == "structurally_valid" for r in results), "semanticPassRate": None, "productionValidation": "not_run", "versionChecks": version_checks, "validatorSha256": sha(ROOT / "scripts/validate_plan.py"), "expectationsSha256": sha(expectations_path), "results": results}
    write(directory / "structural-report.json", report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("prepare", "check"))
    parser.add_argument("--directory", type=Path, required=True)
    args = parser.parse_args()
    result = prepare(args.directory) if args.command == "prepare" else check(args.directory)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if args.command == "check" and result["structurallyValid"] != result["total"]:
        raise SystemExit(1)
