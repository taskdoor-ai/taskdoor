import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceTaskDetail, taskDetailMocks } from "../src/data/taskDetailMocks.ts";
import { teamWorkspaceScenarios } from "../src/data/teamWorkspaceScenarios.ts";
import { getTaskDefinitionGoal } from "../src/lib/taskAiAdjustmentAdapters.ts";
import { getTaskDiagnosisReport } from "../src/lib/taskDiagnosis.ts";
import { getTaskFileContent } from "../src/lib/taskFileEditing.ts";
import type { TaskNode } from "../src/data/workspaceNodes.ts";

const nodes = teamWorkspaceScenarios.flatMap((team) => team.nodes).filter((node): node is TaskNode => node.kind === "task");
const ids = ["fragrance-final-decision", "ccx-serum-contract-close", "ccx-serum-asset-batch", "ccx-serum-price-stock", "ccx-serum-budget-gate", "ccx-october-studio-calendar", "ccx-weekly-settlement"];
const filePairs = new Set(["fragrance-final-decision", "ccx-serum-contract-close", "ccx-weekly-settlement"]);
function fixture(id: string) {
  const node = nodes.find((item) => item.id === id)!;
  const detail = taskDetailMocks[id as keyof typeof taskDetailMocks] ?? createWorkspaceTaskDetail(node);
  const context = { goal: getTaskDefinitionGoal(nodes, node), completionCriteria: node.completionCriteria ?? [], activities: detail.activities, commits: detail.commits, files: detail.files };
  const diagnose = (patch: Partial<typeof context> = {}) => getTaskDiagnosisReport({ task: { id, title: node.name, status: node.status, context: { ...context, ...patch } }, decisionConflicts: detail.diagnosis?.decisionConflicts }).findings.filter((item) => item.type === "decision-conflict");
  return { node, detail, context, diagnose };
}
for (const id of ids) {
  test(`${id}：冲突由两个文件或文件与完成标准支撑，不依赖讨论`, () => {
    const { context, detail, diagnose } = fixture(id);
    const findings = diagnose();
    assert.equal(findings.length, 1);
    const evidence = findings[0].evidence;
    if (filePairs.has(id)) assert.equal(new Set(evidence.filter((item) => item.kind === "file").map((item) => item.id)).size, 2);
    else assert.ok(evidence.some((item) => item.kind === "criterion" && context.completionCriteria.includes(item.fact)));
    assert.ok(evidence.every((item) => item.kind === "file" || item.kind === "criterion"), "不把无关目标或讨论凑成决策依据");
    assert.deepEqual(diagnose({ activities: [], commits: [] }), findings, "没有讨论也能核对文件和标准");
    assert.ok(evidence.some((item) => item.kind === "file"));
    for (const item of evidence.filter((fact) => fact.kind === "file")) {
      const content = getTaskFileContent(context.files.find((file) => file.id === item.id)!);
      assert.ok(content);
      const facts = content.kind === "table" ? content.sheets.flatMap((sheet) => sheet.rows.map((row) => row.map((cell, i) => `${sheet.columns[i]}：${cell}`).join("；"))) : content.kind === "pdf" ? content.pages.flatMap((page) => page.split("\n")) : content.text.split("\n");
      assert.ok(facts.includes(item.fact));
    }
    assert.doesNotMatch(JSON.stringify(detail), /增长会|预算批复|两份决定均已确认且仍有效|7 天淡纹/);
  });
  test(`${id}：缺少必要文件或标准时不回捞讨论凑冲突`, () => {
    const { context, diagnose } = fixture(id);
    assert.equal(diagnose({ completionCriteria: [] }).length, filePairs.has(id) ? 1 : 0);
    assert.equal(diagnose({ goal: "" }).length, 1, "没有关联到冲突的目标不是判定前置条件");
    assert.equal(diagnose({ files: [] }).length, 0);
    assert.equal(diagnose({ files: context.files.map((file) => ({ ...file, archived: true })) }).length, 0);
    assert.equal(diagnose({ activities: context.activities.map((post) => ({ ...post, type: "ai-insight" as const })) }).length, 1);
  });
}

test("库存冲突由标准数量和实际渠道合计计算，修改任一侧都会改变判断", () => {
  const { context, diagnose } = fixture("ccx-serum-price-stock");
  const changeLimit = (amount: string) => context.completionCriteria.map((text) => text.replace("12,000", amount));
  assert.equal(diagnose({ completionCriteria: changeLimit("15,000") }).length, 0);
  assert.match(diagnose({ completionCriteria: changeLimit("14,000") })[0].title, /14,000.*15,000/);
  const files = context.files.map((file) => file.previewData?.kind === "table" ? { ...file, previewData: { ...file.previewData, sheets: file.previewData.sheets.map((sheet) => ({ ...sheet, rows: sheet.rows.map((row) => row.map((cell, index) => sheet.columns[index] === "分配数量（件）" && cell === "7000" ? "4000" : cell)) })) } } : file);
  assert.equal(diagnose({ files }).length, 0);
});

test("预算以两个当前文件比较，讨论中的新建议不能覆盖文件", () => {
  const { context, diagnose } = fixture("fragrance-final-decision");
  const filesWith = (body: string) => { const text = `适用范围：本轮追加投放；${body}`; return context.files.map((file) => file.id.endsWith("-result") ? { ...file, content: text, previewData: { kind: "text" as const, text } } : file); };
  assert.equal(diagnose({ files: filesWith("方案状态：执行版；预算上限：80000 元；GMV 目标：320000 元") }).length, 0);
  assert.match(diagnose({ files: filesWith("方案状态：执行版；预算上限：100000 元；GMV 目标：400000 元") })[0].title, /8 万元.*10 万元/);
  assert.equal(diagnose({ files: filesWith("方案状态：待讨论；预算上限：120000 元") }).length, 0);
  assert.equal(diagnose({ activities: [...context.activities, { id: "new-budget", author: "周岚", type: "member-post", createdAt: "2026-09-03T18:00:00+08:00", time: "2026-09-03 18:00", message: "建议本轮投放预算上限为 12 万元。" }] }).length, 1);
  const changeBoundary = (text: string) => context.files.map((file) => file.id.endsWith("-rule") ? { ...file, content: text, previewData: { kind: "pdf" as const, pages: [text] } } : file);
  assert.equal(diagnose({ files: changeBoundary("适用范围：本轮追加投放；文件状态：执行版；预算上限：120000 元") }).length, 0);
  assert.match(diagnose({ files: changeBoundary("适用范围：本轮追加投放；文件状态：执行版；预算上限：100000 元") })[0].title, /10 万元.*12 万元/);
  assert.equal(diagnose({ files: changeBoundary("适用范围：本轮追加投放；文件状态：草稿；预算上限：80000 元") }).length, 0);
});

test("两个文件只有适用对象和版本相同才比较授权范围", () => {
  const { context, diagnose } = fixture("ccx-serum-contract-close");
  const withAuthorization = (text: string) => context.files.map((file) => file.id.endsWith("-rule") ? { ...file, content: text, previewData: { kind: "pdf" as const, pages: [text] } } : file);
  assert.equal(diagnose({ files: withAuthorization("达人：C006；合同版本：v2；授权渠道：抖音、视频号；文件状态：已签署") }).length, 0);
  for (const text of [
    "达人：C006；合同版本：v1；授权渠道：抖音；文件状态：已签署",
    "达人：C007；合同版本：v2；授权渠道：抖音；文件状态：已签署",
    "达人：C006；合同版本：v2；授权渠道：抖音；文件状态：草稿",
  ]) assert.equal(diagnose({ files: withAuthorization(text) }).length, 0);
});

test("只有讨论不同或只有一份文件，不能形成结构化决策冲突", () => {
  const base = { id: "conflict", title: "预算不一致", conclusion: "两边金额不同", impact: "需核对", recommendation: "核对原文" };
  const discussion = { kind: "activity" as const, id: "post", source: "陈默", fact: "建议预算改为 12 万元。" };
  const file = { kind: "file" as const, id: "file", source: "预算.md", fact: "本轮预算 8 万元。" };
  for (const evidence of [[file, discussion], [discussion, { ...discussion, id: "other" }]]) {
    assert.equal(getTaskDiagnosisReport({ task: { id: "task", title: "核对预算", status: "进行中" }, decisionConflicts: [{ ...base, evidence }] }).findings.length, 0);
  }
});

const corrections: Array<[string, string, string, string, string?]> = [
  ["ccx-serum-contract-close", "发布渠道", "抖音、视频号", "抖音"],
  ["ccx-serum-asset-batch", "改写规则", "允许自由改写", "不可修改"],
  ["ccx-serum-budget-gate", "确认要求", "无需负责人确认", "负责人书面确认"],
  ["ccx-october-studio-calendar", "直播间", "A", "B", "达人连麦"],
  ["ccx-weekly-settlement", "本期计佣基数（元）", "50000", "42000"],
];
for (const [id, column, before, after, target] of corrections) {
  test(`${id}：修改当前文件里的冲突字段即可消除诊断，不要求重写某句预设文案`, () => {
    const { context, diagnose } = fixture(id);
    assert.equal(diagnose().length, 1);
    const files = context.files.map((file) => file.previewData?.kind === "table" ? {
      ...file, previewData: { ...file.previewData, sheets: file.previewData.sheets.map((sheet) => ({
        ...sheet, rows: sheet.rows.map((row) => row.map((cell, index) => (!target || row.includes(target)) && sheet.columns[index] === column && cell === before ? after : cell)),
      })) },
    } : file);
    assert.equal(diagnose({ files }).length, 0);
  });
}
