import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceTaskDetail, taskDetailMocks } from "../src/data/taskDetailMocks.ts";
import { teamWorkspaceScenarios } from "../src/data/teamWorkspaceScenarios.ts";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import { getTaskDiagnosisReport } from "../src/lib/taskDiagnosis.ts";
import { getTaskFileContent } from "../src/lib/taskFileEditing.ts";

const nodes = teamWorkspaceScenarios.flatMap((scenario) => scenario.nodes).filter((node): node is TaskNode => node.kind === "task");
const cases = [
  ["fragrance-final-decision", /8 万元.*12 万元/, "本轮投放预算"],
  ["ccx-serum-contract-close", /授权渠道为抖音.*视频号/, "合同附件与发布排期"],
  ["ccx-serum-asset-batch", /不可修改.*允许自由改写/, "母版交付"],
  ["ccx-serum-price-stock", /12,000.*15,000/, "首批库存"],
  ["ccx-serum-budget-gate", /书面决定.*自动追加/, "追加预算"],
  ["ccx-october-studio-calendar", /直播间.*同时/, "直播间排期"],
  ["ccx-weekly-settlement", /退款.*42,000.*50,000/, "本期退款截点"],
] as const;

function fixture(id: string) {
  const node = nodes.find((item) => item.id === id)!;
  assert.ok(node);
  const detail = taskDetailMocks[id as keyof typeof taskDetailMocks] ?? createWorkspaceTaskDetail(node);
  const context = { goal: detail.goal, completionCriteria: node.completionCriteria ?? [], activities: detail.activities, commits: detail.commits, files: detail.files };
  const diagnose = (patch: Partial<typeof context> = {}) => getTaskDiagnosisReport({
    task: { id, title: node.name, status: node.status, context: { ...context, ...patch } },
    decisionConflicts: detail.diagnosis?.decisionConflicts,
  }).findings.filter((finding) => finding.type === "decision-conflict");
  return { node, detail, context, diagnose };
}

for (const [id, title, topic] of cases) {
  test(`${id}：结果任务以文件和标准形成冲突，讨论只保留为背景`, () => {
    const { node, detail, diagnose } = fixture(id);
    const findings = diagnose();
    assert.equal(findings.length, 1, `${id} 应有一个明确的决定冲突`);
    assert.match(findings[0].title, title);
    const files = findings[0].evidence.filter((item) => item.kind === "file");
    assert.ok(files.length > 0);
    assert.ok(new Set(files.map((item) => item.id)).size >= 2 || findings[0].evidence.some((item) => item.kind === "criterion"));
    for (const evidence of files) {
      const file = detail.files.find((item) => item.id === evidence.id)!;
      assert.ok(getTaskFileContent(file), "依据必须来自当前可读文件");
    }
    assert.ok(!findings[0].evidence.some((item) => item.kind === "activity"));
    const tables = detail.files.map(getTaskFileContent).filter((file) => file?.kind === "table");
    assert.ok(tables.some((table) => table?.kind === "table" && table.sheets[0].rows.length >= 4));
    assert.ok(detail.activities.filter((item) => item.id.includes("-result-context-post-")).length >= 3);
    assert.ok(detail.commits.filter((item) => item.id.includes("-result-context-commit-")).length >= 3);
    for (const commit of detail.commits) for (const name of commit.files) assert.ok(detail.files.some((file) => file.name === name));
    assert.equal(detail.status, node.status, "补充 mock 不自动改变任务验收状态");
  });

  test(`${id}：文件归档或改成草稿后不沿用旧冲突，讨论不能消除文件间矛盾`, () => {
    const { context, diagnose } = fixture(id);
    const finding = diagnose()[0];
    assert.ok(finding);
    for (const evidence of finding.evidence.filter((item) => item.kind === "file")) {
      assert.equal(diagnose({ files: context.files.filter((file) => file.id !== evidence.id) }).length, 0);
      assert.equal(diagnose({ files: context.files.map((file) => file.id === evidence.id ? { ...file, archived: true } : file) }).length, 0);
      const proposal = "仅供讨论的草稿，尚未选择执行方案。";
      assert.equal(diagnose({ files: context.files.map((file) => file.id === evidence.id ? { ...file, content: proposal, previewData: { kind: "text", text: proposal } } : file) }).length, 0);
    }
    assert.equal(diagnose({ activities: [...context.activities, {
      id: `${id}-correction`, author: "周岚", message: `${topic}配置已统一，旧执行选择已撤回。`,
      type: "member-post", createdAt: "2026-09-03T11:00:00+08:00", time: "2026-09-03 11:00",
    }] }).length, 1);
    assert.equal(diagnose({ files: [] }).length, 0);
  });
}

test("结果任务示例不串入用户新建任务或其他团队", () => {
  const node = fixture("ccx-serum-budget-gate").node;
  assert.equal(createWorkspaceTaskDetail({ ...node, createdFrom: "task-editor" }).activities.length, 0);
  const otherTeam = createWorkspaceTaskDetail({ ...node, teamId: "product-platform" });
  assert.ok(!otherTeam.activities.some((item) => item.id.includes("-result-context-post-")));
});
