import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceTaskDetail, taskDetailMocks } from "../src/data/taskDetailMocks.ts";
import { getTaskDefinitionGoal } from "../src/lib/taskAiAdjustmentAdapters.ts";
import { getTeamTaskDetailFixture } from "../src/data/teamTaskDetailFixtures.ts";
import { teamWorkspaceScenarios } from "../src/data/teamWorkspaceScenarios.ts";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import { getTaskDiagnosisDescendants, getTaskDiagnosisReport, type TaskDiagnosisTask } from "../src/lib/taskDiagnosis.ts";

const nodes = teamWorkspaceScenarios.flatMap((scenario) => scenario.nodes).filter((node): node is TaskNode => node.kind === "task");
function fixture(id: string) {
  const node = nodes.find((item) => item.id === id)!;
  const detail = taskDetailMocks[id as keyof typeof taskDetailMocks] ?? getTeamTaskDetailFixture(node) ?? createWorkspaceTaskDetail(node);
  const context = { goal: getTaskDefinitionGoal(nodes, node), completionCriteria: node.completionCriteria ?? [], activities: detail.activities, commits: detail.commits, files: detail.files };
  return { node, detail, context };
}
function diagnose(id: string, patch: Partial<ReturnType<typeof fixture>["context"]> = {}) {
  const { node, detail, context } = fixture(id);
  return getTaskDiagnosisReport({
    task: { id, title: node.name, status: node.status, context: { ...context, ...patch } },
    decisionConflicts: detail.diagnosis?.decisionConflicts,
  });
}

test("从既有任务标准、目标、动态、文件与活动形成多种诊断，不改写原始数据", () => {
  const ids = ["fragrance-content", "fragrance-live", "fragrance-compliance", "fragrance-final-decision", "fragrance-creator-business",
    "platform-ios-review", "factory-quality-gate", "factory-operator-training",
    "service-data-repair", "service-customer-comms", "service-runbook-update"];
  const kinds = new Set<string>();
  for (const id of ids) {
    const before = JSON.stringify(fixture(id));
    const report = diagnose(id);
    assert.ok(report.findings.length, `${id} 缺少基于现有内容的诊断`);
    for (const finding of report.findings) {
      assert.ok(finding.evidence.length >= 2);
      finding.evidence.forEach((evidence) => kinds.add(evidence.kind));
    }
    assert.equal(JSON.stringify(fixture(id)), before);
  }
  assert.ok(kinds.has("goal"));
  assert.ok(kinds.has("criterion"));
  assert.ok(kinds.has("activity"));
  assert.ok(kinds.has("file"));
  assert.ok(kinds.has("commit"));
});

test("不同建议或只有讨论反映的差异不当作文件决策冲突", () => {
  for (const id of ["platform-api-contract", "platform-android-staged", "factory-capacity-trial", "service-compensation-review",
    "ccx-creator-consent-audit", "ccx-creator-ratecard-renewal", "ccx-creator-monthly-committee"]) {
    const files = fixture(id).context.files.filter((file) => !file.id.includes("-diagnosis-"));
    assert.equal(diagnose(id, { files }).findings.filter((finding) => finding.type === "decision-conflict").length, 0, id);
  }
});

test("终审诊断直接使用当前完成标准和成员动态，改掉任一侧后旧示例不再命中", () => {
  const { context } = fixture("fragrance-content");
  const finding = diagnose("fragrance-content").findings[0];
  assert.ok(finding);
  assert.equal(finding.evidence.find((item) => item.kind === "criterion")?.fact, context.completionCriteria[0]);
  assert.ok(finding.evidence.some((item) => item.fact === context.activities.find((item) => item.type === "member-post")!.message));
  assert.equal(diagnose("fragrance-content", { completionCriteria: ["本次仅交付初稿，不包含终审。"] }).findings.length, 0);
  assert.equal(diagnose("fragrance-content", { activities: [] }).findings.length, 0);
  const corrected = context.activities.map((item) => item.type === "member-post" ? { ...item, message: "功效表述已完成合规复核，终审已完成。" } : item);
  assert.equal(diagnose("fragrance-content", { activities: corrected }).findings.length, 0);
});

test("较新的成员纠正记录替代旧动态，AI 建议不能充当冲突事实", () => {
  const { context } = fixture("fragrance-content");
  const correction = { id: "content-correction", author: "林洁", createdAt: "2026-09-03T10:00:00+08:00", time: "2026-09-03 10:00", message: "功效表述已完成合规复核，终审已完成。", type: "member-post" as const };
  assert.equal(diagnose("fragrance-content", { activities: [...context.activities, correction] }).findings.length, 0);
  assert.equal(diagnose("fragrance-content", { activities: context.activities.map((item) => ({ ...item, type: "ai-insight" as const })) }).findings.length, 0);
});

test("决策冲突读取文件正文而非文件名或预填事实，归档和删除后不回退到旧快照", () => {
  const { context } = fixture("fragrance-final-decision");
  const report = diagnose("fragrance-final-decision");
  const evidence = report.findings.flatMap((finding) => finding.evidence).find((item) => item.kind === "file");
  assert.ok(evidence);
  assert.ok(context.files.find((file) => file.id === evidence.id)?.content?.includes(evidence.fact));
  assert.equal(diagnose("fragrance-final-decision", { files: [] }).findings.length, 0);
  assert.equal(diagnose("fragrance-final-decision", { files: context.files.map((file) => ({ ...file, archived: true })) }).findings.length, 0);
  assert.equal(diagnose("fragrance-final-decision", { files: context.files.map((file) => ({ ...file, content: "新预算已确认生效。", previewData: { kind: "text", text: "新预算已确认生效。" } })) }).findings.length, 0);
});

test("既有表格里的未完成记录可以与任务完成状态交叉核对", () => {
  const report = diagnose("fragrance-creator-business");
  assert.equal(report.findings[0]?.type, "decision-conflict");
  assert.ok(report.findings[0].evidence.some((item) => item.kind === "file" && item.fact.includes("达人确认") && item.fact.includes("进行中")));
  const { context } = fixture("fragrance-creator-business");
  const files = context.files.map((file) => file.previewData?.kind === "table" ? {
    ...file, previewData: { ...file.previewData, sheets: file.previewData.sheets.map((sheet) => ({ ...sheet, rows: sheet.rows.map((row) => row[0] === "达人确认" ? [row[0], "已完成", ...row.slice(2)] : row) })) },
  } : file);
  assert.equal(diagnose("fragrance-creator-business", { files }).findings.length, 0);
});

test("父任务聚合完整上下文，子任务修正后父级旧诊断同步消失", () => {
  const ids = ["fragrance-creator-wrapup", "fragrance-content", "fragrance-live"];
  const tasks = ids.map((id): TaskDiagnosisTask => {
    const { node, context } = fixture(id);
    return { id, parentTaskId: node.parentTaskId, title: node.name, status: node.status, context };
  });
  const report = () => getTaskDiagnosisReport({ task: tasks[0], descendantTasks: getTaskDiagnosisDescendants(tasks, tasks[0].id) });
  assert.ok(report().findings.some((item) => item.subject.id === "fragrance-content"));
  tasks[1].context!.activities = [];
  assert.ok(!report().findings.some((item) => item.subject.id === "fragrance-content"));
});
