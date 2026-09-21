#!/usr/bin/env python3
"""Build a portable, integrity-checked TaskDoor planner validation bundle."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import posixpath
import re
import tempfile
import zipfile


SKILL_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = SKILL_ROOT.parents[1]
DEFAULT_OUTPUT = REPOSITORY_ROOT / "outputs" / "agentdoor-task-planner-realistic-validation-20260901.zip"
SOURCE_PATHS = (
    REPOSITORY_ROOT / "skills" / "agentdoor-task-planner",
    REPOSITORY_ROOT / "skills" / "agentdoor-task-design",
    REPOSITORY_ROOT / "docs" / "task-design-kit",
    REPOSITORY_ROOT / "docs" / "product-v2" / "06-ai-collaboration-insights.md",
    REPOSITORY_ROOT / "docs" / "product-v2" / "09-decision-register.md",
    REPOSITORY_ROOT / "docs" / "product-v2" / "11-human-handoff.md",
    REPOSITORY_ROOT / "docs" / "workflow" / "README.md",
    REPOSITORY_ROOT / "src" / "lib" / "taskCreationPlanning.ts",
    REPOSITORY_ROOT / "src" / "lib" / "taskCreationScenario.ts",
    REPOSITORY_ROOT / "src" / "lib" / "taskCreationEffort.ts",
    REPOSITORY_ROOT / "src" / "lib" / "responsibilityAssignment.ts",
    REPOSITORY_ROOT / "src" / "lib" / "workspaceTaskCreation.ts",
    REPOSITORY_ROOT / "src" / "lib" / "taskAiAdjustment.ts",
    REPOSITORY_ROOT / "src" / "lib" / "taskAiAdjustmentAdapters.ts",
    REPOSITORY_ROOT / "src" / "lib" / "taskAiFeedback.ts",
    REPOSITORY_ROOT / "src" / "lib" / "taskSituation.ts",
    REPOSITORY_ROOT / "src" / "components" / "TaskDetail.tsx",
    REPOSITORY_ROOT / "src" / "components" / "TaskCreationPage.tsx",
    REPOSITORY_ROOT / "src" / "components" / "TaskAiAdjustmentPopover.tsx",
    REPOSITORY_ROOT / "src" / "components" / "TaskCreationProcess.tsx",
    REPOSITORY_ROOT / "src" / "components" / "AiConnectionDialog.tsx",
    REPOSITORY_ROOT / "src" / "components" / "TaskBurnUpSparkline.tsx",
    REPOSITORY_ROOT / "src" / "components" / "TaskWorkspace.tsx",
    REPOSITORY_ROOT / "src" / "components" / "WorkspaceTopbar.tsx",
    REPOSITORY_ROOT / "src" / "components" / "task-files" / "TaskFileExplorer.tsx",
    REPOSITORY_ROOT / "src" / "data" / "creatorCommerceScenario.ts",
    REPOSITORY_ROOT / "src" / "data" / "sharedTypes.ts",
    REPOSITORY_ROOT / "src" / "data" / "taskDetailMocks.ts",
    REPOSITORY_ROOT / "src" / "data" / "taskHeadingExamples.ts",
    REPOSITORY_ROOT / "src" / "data" / "workspaceNodes.ts",
    REPOSITORY_ROOT / "src" / "lib" / "taskActivity.ts",
    REPOSITORY_ROOT / "src" / "lib" / "taskAiAdjustmentStorage.ts",
    REPOSITORY_ROOT / "src" / "lib" / "taskAssistantProtocol.ts",
    REPOSITORY_ROOT / "src" / "lib" / "taskBurnUp.ts",
    REPOSITORY_ROOT / "src" / "App.tsx",
    REPOSITORY_ROOT / "mcp" / "server.ts",
    REPOSITORY_ROOT / "server" / "taskAssistant.ts",
    REPOSITORY_ROOT / "vite.config.ts",
)
SKIP_PARTS = {"__pycache__", ".pytest_cache"}
SKIP_NAMES = {".DS_Store"}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source_files() -> list[Path]:
    files: list[Path] = []
    for source_path in SOURCE_PATHS:
        candidates = source_path.rglob("*") if source_path.is_dir() else (source_path,)
        for path in candidates:
            if not path.is_file():
                continue
            if path.name in SKIP_NAMES or path.suffix == ".pyc":
                continue
            if any(part in SKIP_PARTS for part in path.parts):
                continue
            files.append(path)
    return sorted(files, key=lambda item: item.relative_to(REPOSITORY_ROOT).as_posix())


def portable_bytes(path: Path, data: bytes) -> tuple[bytes, int]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return data, 0

    repository_prefix = f"{REPOSITORY_ROOT.as_posix()}/"
    replacements = text.count(repository_prefix)
    text = text.replace(repository_prefix, "${PACKAGE_ROOT}/")
    home_prefix = f"{Path.home().as_posix()}/"
    replacements += text.count(home_prefix)
    text = text.replace(home_prefix, "${USER_HOME}/")
    replacements += text.count("/tmp/")
    text = text.replace("/tmp/", "${TMPDIR}/")
    if path.is_relative_to(REPOSITORY_ROOT / "docs" / "task-design-kit"):
        # Keep Markdown links inside the bundled design kit clickable.
        text = text.replace("${PACKAGE_ROOT}/docs/task-design-kit/", "")
    return text.encode("utf-8"), replacements


def rewrite_archive_integrity(staging: Path) -> None:
    reports = sorted(
        staging.rglob("archive-integrity.json"),
        key=lambda item: len(item.parts),
        reverse=True,
    )
    for report_path in reports:
        report = json.loads(report_path.read_text(encoding="utf-8"))
        entries = report.get("files", [])
        for item in entries:
            artifact = report_path.parent / item["path"]
            if not artifact.is_file():
                raise FileNotFoundError(f"Missing archived artifact: {artifact}")
            data = artifact.read_bytes()
            item["bytes"] = len(data)
            item["sha256"] = sha256(data)
        report["fileCount"] = len(entries)
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
            encoding="utf-8",
        )


def rewrite_markdown_links(staging: Path) -> dict[str, int]:
    """Make bundled local links relative and label omitted workstation attachments."""
    package_patterns = (
        re.compile(r"(!?)\[([^\]]*)\]\(<\$\{PACKAGE_ROOT\}/([^>]+)>\)"),
        re.compile(r"(!?)\[([^\]]*)\]\(\$\{PACKAGE_ROOT\}/([^)]+)\)"),
    )
    home_patterns = (
        re.compile(r"(!?)\[([^\]]*)\]\(<\$\{USER_HOME\}/[^>]+>\)"),
        re.compile(r"(!?)\[([^\]]*)\]\(\$\{USER_HOME\}/[^)]+\)"),
    )
    counts: dict[str, int] = {}

    for path in sorted(staging.rglob("*.md")):
        relative = path.relative_to(staging)
        text = path.read_text(encoding="utf-8")
        changes = 0

        def replace_package_link(match: re.Match[str]) -> str:
            nonlocal changes
            bang, label, raw_target = match.groups()
            target = raw_target
            line = None
            line_match = re.fullmatch(r"(.+):(\d+)", target)
            if line_match:
                target, line = line_match.groups()
            destination = staging / target
            if not destination.exists():
                raise FileNotFoundError(
                    f"Bundled Markdown link has no target: {relative.as_posix()} -> {raw_target}"
                )
            start = relative.parent.as_posix() if relative.parent.as_posix() != "." else "."
            portable_target = posixpath.relpath(target, start=start)
            if line:
                portable_target = f"{portable_target}#L{line}"
            changes += 1
            return f"{bang}[{label}]({portable_target})"

        def replace_home_link(match: re.Match[str]) -> str:
            nonlocal changes
            bang, label = match.groups()
            changes += 1
            prefix = "本地图片" if bang else "本地附件"
            return f"{label}（{prefix}未随验证包分发）"

        for pattern in package_patterns:
            text = pattern.sub(replace_package_link, text)
        for pattern in home_patterns:
            text = pattern.sub(replace_home_link, text)
        if changes:
            path.write_text(text, encoding="utf-8")
            counts[relative.as_posix()] = changes
    return counts


def package_readme() -> bytes:
    return (
        "# TaskDoor 任务规划 Skill 验证包\n\n"
        "本包只包含高拟真合成数据、候选规划 Skill、离线校验器与已记录运行；"
        "没有生产数据、生产访问或任务写入。\n\n"
        "- 从 `skills/agentdoor-task-planner/SKILL.md` 开始。\n"
        "- 查看 `skills/agentdoor-task-planner/evals/realistic-report.md` 获取结论。\n"
        "- 打开 `skills/agentdoor-task-planner/evals/review.html` 复核 139 份记录。\n"
        "- 按 `skills/agentdoor-task-planner/evals/tomorrow-validation.md` 重新盲测。\n"
        "- `${PACKAGE_ROOT}` 是打包时替换本机工作区路径使用的逻辑占位符。\n"
        "- `${TMPDIR}` 是可重跑命令或历史临时运行来源的环境变量占位符；归档映射见各运行的 "
        "`artifact-path-map.json`。\n"
    ).encode("utf-8")


def write_zip(staging: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(staging.rglob("*")):
            if not path.is_file():
                continue
            relative = path.relative_to(staging).as_posix()
            info = zipfile.ZipInfo(relative, date_time=(2026, 9, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes())


def build(output: Path) -> dict:
    source_metadata: dict[str, dict] = {}
    with tempfile.TemporaryDirectory(prefix="agentdoor-portable-package-") as temporary:
        staging = Path(temporary)
        for source in source_files():
            relative = source.relative_to(REPOSITORY_ROOT)
            original = source.read_bytes()
            packaged, replacement_count = portable_bytes(source, original)
            destination = staging / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(packaged)
            source_metadata[relative.as_posix()] = {
                "sourceSha256": sha256(original),
                "portabilityTransformCount": replacement_count,
            }

        (staging / "README-PACKAGE.md").write_bytes(package_readme())
        link_rewrite_counts = rewrite_markdown_links(staging)
        for relative, count in link_rewrite_counts.items():
            if relative in source_metadata:
                source_metadata[relative]["portabilityTransformCount"] += count
        rewrite_archive_integrity(staging)

        remaining_local_paths = []
        workstation_marker = "/" + "Users/"
        for path in staging.rglob("*"):
            if not path.is_file():
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            if workstation_marker in text:
                remaining_local_paths.append(path.relative_to(staging).as_posix())
        if remaining_local_paths:
            raise ValueError(f"Workstation paths remain: {remaining_local_paths}")

        manifest_entries = []
        for path in sorted(staging.rglob("*")):
            if not path.is_file():
                continue
            relative = path.relative_to(staging).as_posix()
            data = path.read_bytes()
            item = {"path": relative, "bytes": len(data), "sha256": sha256(data)}
            item.update(source_metadata.get(relative, {"generated": True}))
            manifest_entries.append(item)

        manifest = {
            "package": "agentdoor-task-planner-realistic-validation-20260901",
            "dataClassification": "synthetic",
            "productionAccess": False,
            "productionWrites": False,
            "portability": {
                "workstationPathsRemoved": True,
                "replacement": "${PACKAGE_ROOT}/",
                "temporaryPathReplacement": "${TMPDIR}/",
            },
            "fileCount": len(manifest_entries),
            "files": manifest_entries,
        }
        (staging / "PACKAGE-MANIFEST.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
            encoding="utf-8",
        )
        write_zip(staging, output)

    digest = sha256(output.read_bytes())
    checksum_path = Path(f"{output}.sha256")
    checksum_path.write_text(f"{digest}  {output.name}\n", encoding="utf-8")
    return {
        "output": str(output.resolve()),
        "bytes": output.stat().st_size,
        "sha256": digest,
        "payloadFiles": len(manifest_entries),
        "zipEntries": len(manifest_entries) + 1,
        "workstationPathsRemoved": True,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    print(json.dumps(build(args.output), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
