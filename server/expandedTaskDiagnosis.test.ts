import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceTaskDetail, taskDetailMocks } from "../src/data/taskDetailMocks.ts";
import { teamWorkspaceScenarios } from "../src/data/teamWorkspaceScenarios.ts";
import { getTaskDefinitionGoal } from "../src/lib/taskAiAdjustmentAdapters.ts";
import { getTaskDiagnosisDescendants, getTaskDiagnosisReport } from "../src/lib/taskDiagnosis.ts";
import { getTaskFileContent } from "../src/lib/taskFileEditing.ts";

const nodes = teamWorkspaceScenarios.find((team) => team.id === "creator-commerce")!.nodes.filter((node) => node.kind === "task");
const ids = [
  "fragrance-product", "fragrance-growth", "fragrance-data",
  "product-launch-venue", "product-launch-run-of-show", "product-launch-promo-assets",
  "weekly-retro-decisions", "weekly-retro-open-issues", "weekly-retro-actions",
  "ccx-serum-creator-longlist", "ccx-serum-claim-matrix",
  "ccx-creator-consent-audit", "ccx-creator-ratecard-renewal", "ccx-creator-monthly-committee",
  "ccx-extreme-claim-incident", "ccx-creator-collaboration-handbook",
  "unassigned-creator-sample-tracking", "unassigned-short-video-covers", "unassigned-live-backup-plan",
  "unassigned-gift-stock-check", "unassigned-attribution-dictionary",
];
function fixture(id: string) {
  const node = nodes.find((node) => node.id === id)!;
  assert.ok(node);
  const detail = taskDetailMocks[id as keyof typeof taskDetailMocks] ?? createWorkspaceTaskDetail(node);
  const context = { goal: getTaskDefinitionGoal(nodes, node), completionCriteria: node.completionCriteria ?? [], files: detail.files, activities: detail.activities, commits: detail.commits };
  const task = { id, title: node.name, status: node.status, parentTaskId: node.parentTaskId, dependsOnTaskIds: node.dependsOnTaskIds, context };
  const diagnose = (patch: Partial<typeof context> = {}) => getTaskDiagnosisReport({ task: { ...task, context: { ...context, ...patch } } }).findings.filter((finding) => finding.id.includes(":content-comparison:"));
  return { node, detail, context, task, diagnose };
}

for (const id of ids) {
  test(`${id}：新增可追溯的诊断，不把讨论当成决策`, () => {
    const { node, detail, context, diagnose } = fixture(id);
    const findings = diagnose();
    assert.equal(findings.length, 1, "每个选中任务有一个具体可核对的问题");
    assert.deepEqual(diagnose({ activities: [], commits: [] }), findings);
    assert.equal(detail.status, node.status);
    assert.equal(detail.owner, node.ownerId);
    assert.deepEqual(detail.completionCriteria, node.completionCriteria);
    assert.ok(detail.activities.some((post) => post.id.includes("-diagnosis-context-post-")));
    assert.ok(detail.commits.some((commit) => commit.id.includes("-diagnosis-context-commit-")));
    for (const item of findings[0].evidence) {
      assert.ok(item.kind === "file" || item.kind === "criterion");
      if (item.kind === "criterion") assert.ok(context.completionCriteria.includes(item.fact));
      else {
        const file = context.files.find((file) => file.id === item.id)!;
        assert.ok(file);
        assert.equal(item.source, file.name);
        const content = getTaskFileContent(file)!;
        const facts = content.kind === "table" ? content.sheets.flatMap((sheet) => sheet.rows.map((row) => row.map((value, i) => `${sheet.columns[i]}：${value}`).join("；"))) : [];
        assert.ok(facts.includes(item.fact));
      }
    }
    const fileIds = new Set(findings[0].evidence.filter((item) => item.kind === "file").map((item) => item.id));
    assert.ok(fileIds.size === 2 || findings[0].evidence.some((item) => item.kind === "criterion"));
    for (const fileId of fileIds) {
      assert.equal(diagnose({ files: context.files.filter((file) => file.id !== fileId) }).length, 0);
      assert.equal(diagnose({ files: context.files.map((file) => file.id === fileId ? { ...file, archived: true } : file) }).length, 0);
    }
    for (const commit of detail.commits.filter((item) => item.id.includes("-diagnosis-context-"))) {
      assert.ok(commit.files.every((name) => context.files.some((file) => file.name === name)));
    }
  });
}

test("文件改成一致、草稿或不同适用对象后，不保留旧的比较结果", () => {
  const { context, diagnose } = fixture("product-launch-venue");
  const basis = context.files.find((file) => file.id.endsWith("-diagnosis-basis"))!;
  assert.equal(basis.previewData?.kind, "table");
  if (basis.previewData?.kind !== "table") return;
  const basisRows = basis.previewData.sheets[0].rows;
  const change = (mutate: (row: string[], index: number) => string[]) => context.files.map((file) => file.id.endsWith("-diagnosis-current") && file.previewData?.kind === "table" ? {
    ...file, previewData: { ...file.previewData, sheets: file.previewData.sheets.map((sheet) => ({ ...sheet, rows: sheet.rows.map(mutate) })) },
  } : file);
  assert.equal(diagnose({ files: change((row, i) => [row[0], row[1], basisRows[i][2], row[3]]) }).length, 0);
  assert.equal(diagnose({ files: change((row) => [...row.slice(0, 3), "草稿"]) }).length, 0);
  for (const value of ["未知", "待确认"]) assert.equal(diagnose({ files: change((row) => [row[0], row[1], value, row[3]]) }).length, 0);
  assert.equal(diagnose({ files: change((row) => ["另一场发布会", ...row.slice(1)]) }).length, 0);
  assert.match(diagnose({ files: change((row, i) => i === 0 ? [row[0], row[1], "260 人", row[3]] : row) })[0].title, /260 人/);
});

test("任务标准改变后重新读取要求，不固定使用 mock 的旧标准", () => {
  const longlist = fixture("ccx-serum-creator-longlist");
  assert.equal(longlist.diagnose({ completionCriteria: longlist.context.completionCriteria.map((text) => text.replace("90", "30")) }).length, 0);
  assert.match(longlist.diagnose({ completionCriteria: longlist.context.completionCriteria.map((text) => text.replace("90", "60")) })[0].title, /60 天/);
  const cover = fixture("unassigned-short-video-covers");
  assert.equal(cover.diagnose({ completionCriteria: cover.context.completionCriteria.map((text) => text.replace("三版", "两版")) }).length, 0);
  for (const id of ["ccx-serum-creator-longlist", "unassigned-short-video-covers", "unassigned-creator-sample-tracking"]) assert.equal(fixture(id).diagnose({ completionCriteria: [] }).length, 0);
});

test("上级聚合新增内容问题，常用任务覆盖增加且保留正常对照", () => {
  const tasks = nodes.map((node) => fixture(node.id).task);
  const reports = tasks.map((task) => getTaskDiagnosisReport({ task, dependencyTaskIds: task.dependsOnTaskIds, dependencyTasks: tasks, descendantTasks: getTaskDiagnosisDescendants(tasks, task.id) }));
  assert.ok(reports.filter((report) => report.findings.length).length >= 60, "64 个内置任务至少 60 个可见诊断（含子任务聚合）");
  for (const id of ["product-launch-planning", "weekly-retro-notes", "ccx-creator-pool-governance"]) {
    const report = reports.find((report) => report.rootTaskId === id)!;
    assert.ok(report.findings.some((finding) => finding.id.includes(":content-comparison:")));
  }
  for (const id of ["ccx-creator-identity-merge", "ccx-creator-performance-window", "ccx-holiday-crossplatform-live"]) assert.equal(reports.find((report) => report.rootTaskId === id)!.findings.length, 0, "已修正或已取消的任务保留无诊断状态");
});

test("新增资料只注入内置示例，不串入新建任务或其他团队", () => {
  const node = fixture("product-launch-venue").node;
  for (const task of [{ ...node, createdFrom: "task-editor" as const }, { ...node, teamId: "platform" }, { ...node, id: "user-new-task" }]) {
    assert.ok(!createWorkspaceTaskDetail(task).files.some((file) => file.id.endsWith("-diagnosis-current")));
  }
  const unassigned = fixture("unassigned-short-video-covers").node;
  assert.ok(!createWorkspaceTaskDetail({ ...unassigned, createdAt: "2026-09-03T12:00:00+08:00" }).files.length);
});
