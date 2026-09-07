#!/usr/bin/env python3
"""Build a self-contained, read-only viewer of recorded offline planner runs."""
import argparse
import json
from pathlib import Path
import re

from validate_plan import read_json

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = ROOT.parents[1]


def portable_source(run):
    """Return a stable display path without leaking a workstation path."""
    resolved = run.resolve()
    try:
        return resolved.relative_to(REPOSITORY_ROOT).as_posix()
    except ValueError:
        return f"external-run:{run.name}"


def collect(directories):
    cases = []
    seen = set()
    for directory in directories:
        manifests = [directory / "manifest.json"] if (directory / "manifest.json").exists() else sorted(directory.rglob("manifest.json"))
        for manifest_path in manifests:
            run = manifest_path.parent
            manifest = read_json(manifest_path)
            structural_path = run / "structural-report.json"
            structural = read_json(structural_path) if structural_path.exists() else {}
            structural_cases = {row["id"]: row for row in structural.get("results", [])}
            semantic_path = run / "semantic-summary.json"
            semantic = read_json(semantic_path) if semantic_path.exists() else {}
            semantic_rows = semantic.get("cases") or semantic.get("results") or []
            semantic_cases = {}
            for row in semantic_rows:
                case_id = row.get("caseId") or row.get("scenarioId") or row.get("id")
                if case_id:
                    semantic_cases[case_id] = row
            for case in manifest["cases"]:
                identifier = case["id"]
                if not re.fullmatch(r"[A-Za-z0-9_-]+", identifier):
                    raise ValueError("Unsafe case ID in run manifest")
                key = (str(run.resolve()), identifier)
                if key in seen:
                    raise ValueError("The same recorded case was supplied twice")
                seen.add(key)
                output_path = run / "outputs" / f"{identifier}.json"
                cases.append({
                    "id": identifier, "run": run.name, "suite": manifest.get("suite", "industry"),
                    "industry": case["industry"], "category": case["category"],
                    "input": read_json(run / "inputs" / f"{identifier}.json"),
                    "output": read_json(output_path) if output_path.exists() else None,
                    "structural": structural_cases.get(identifier), "semantic": semantic_cases.get(identifier),
                    "source": portable_source(run),
                })
    return cases


def render(directories, destination):
    cases = collect(directories)
    payload = json.dumps(cases, ensure_ascii=False, allow_nan=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    template = (ROOT / "evals/review-template.html").read_text(encoding="utf-8")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(template.replace("__RECORDED_CASES__", payload), encoding="utf-8")
    return {"cases": len(cases), "file": str(destination.resolve()), "readOnly": True, "networkRequests": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", type=Path, action="append", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(render(args.run, args.output), ensure_ascii=False, indent=2))
