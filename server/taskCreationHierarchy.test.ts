import assert from "node:assert/strict";
import test from "node:test";
import { creatorCommerceMembers } from "../src/data/creatorCommerceScenario.ts";
import { taskCreationScenarios } from "../src/data/taskCreationScenarios.ts";
import { planTaskCreation } from "../src/lib/taskCreationPlanning.ts";
import { removeCreationSubtask, toTaskPlanDraft, validateCreationForm, type CreationForm } from "../src/lib/taskCreationForm.ts";
import { getCreationEffortLeaves } from "../src/lib/taskCreationEffort.ts";
import { summarizeTaskEffort } from "../src/lib/taskEffort.ts";
import { taskPlanDraftSchema } from "../src/lib/taskAssistantProtocol.ts";
import { createWorkspaceTasksFromDraft } from "../src/lib/workspaceTaskCreation.ts";
import { parseCreationSessions } from "../src/lib/taskCreationSessions.ts";
import { migrateNestedTaskVisuals } from "../src/lib/nestedTaskCreationScenario.ts";

const context = { currentDate: "2026-09-20", currentUserId: "周岚", members: creatorCommerceMembers, tags: [] };
function plan(): CreationForm {
  const example = taskCreationScenarios.find(item => item.id === "nested-plan");
  assert.ok(example, "应提供多层级示例入口");
  const result = planTaskCreation(example.prompt, context);
  assert.equal(result.stage, "review");
  if (result.stage !== "review") throw new Error("expected review");
  return result.form;
}

test("多层级 Mock 为每个任务生成具体执行建议，创建时保留建议和分支参与人", () => {
  const form = plan();
  for (const task of [form.mainTask, ...form.subtasks]) {
    assert.ok(task.executionTips.some(tip => tip.trim().length > 15), task.title);
    assert.notEqual(task.executionTips.join(""), task.goal, "建议不能用目标充当");
  }
  const branch = form.subtasks.find(task => task.title === "完成内容制作")!;
  branch.participantIds = context.members.filter(member => member.id !== branch.ownerId).slice(0, 2).map(member => member.id);
  const draft = taskPlanDraftSchema.parse(toTaskPlanDraft(form));
  const saved = createWorkspaceTasksFromDraft([], draft, { idForIndex: i => `advice-${i}`, teamId: "team", participantsReviewed: true });
  const savedBranch = saved.createdNodes.find(task => task.name === branch.title)!;
  assert.deepEqual(savedBranch.participantIds, branch.participantIds);
  for (const task of [form.mainTask, ...form.subtasks]) {
    assert.deepEqual(saved.createdNodes.find(node => node.name === task.title)?.executionTips, task.executionTips);
  }
});

test("多层级示例创建十个任务并保留四层归属，协议转换不丢失父项", () => {
  const form = plan();
  assert.equal(form.subtasks.length, 9);
  assert.equal(validateCreationForm(form, context.members), null);
  const draft = taskPlanDraftSchema.parse(toTaskPlanDraft(form));
  const saved = createWorkspaceTasksFromDraft([], draft, { idForIndex: i => `nested-${i}`, teamId: "team" });
  assert.equal(saved.createdNodes.length, 10);
  const byName = new Map(saved.createdNodes.map(task => [task.name, task]));
  assert.ok(new Set(saved.createdNodes.map(task => task.iconName)).size >= 6);
  assert.ok(new Set(saved.createdNodes.map(task => task.iconTone)).size >= 6);
  for (const task of [form.mainTask, ...form.subtasks]) {
    assert.ok(task.iconName && task.iconTone, task.title);
    assert.equal(byName.get(task.title)?.iconName, task.iconName);
    assert.equal(byName.get(task.title)?.iconTone, task.iconTone);
  }
  const content = byName.get("完成内容制作")!;
  const scripts = byName.get("完成脚本策划")!;
  const script = byName.get("撰写直播脚本")!;
  assert.equal(content.parentTaskId, saved.mainTaskId);
  assert.equal(scripts.parentTaskId, content.id);
  assert.equal(script.parentTaskId, scripts.id);
  assert.ok(saved.createdNodes.every(task => task.teamId === "team"));
  const attached = createWorkspaceTasksFromDraft(saved.nodes, draft, { parentTaskId: saved.mainTaskId, idForIndex: i => `attached-${i}` });
  assert.equal(attached.createdNodes[0].parentTaskId, saved.mainTaskId);
  assert.equal(attached.createdNodes.find(task => task.name === "撰写直播脚本")?.parentTaskId, attached.createdNodes.find(task => task.name === "完成脚本策划")?.id);
});

test("已创建的完整多层级示例补齐图标，保留用户选择且不修改无关任务", () => {
  const saved = createWorkspaceTasksFromDraft([], toTaskPlanDraft(plan()), { idForIndex: i => `visual-${i}`, teamId: "team", currentUserId: context.currentUserId });
  const legacy = saved.createdNodes.map(({ iconName: _icon, iconTone: _tone, ...node }) => node);
  const customized = { ...legacy[1], iconName: "sparkles" as const, iconTone: "red" as const };
  const unrelated = { ...legacy[0], id: "unrelated", goal: "不同的项目" };
  const input = [legacy[0], customized, ...legacy.slice(2), unrelated];
  const migrated = migrateNestedTaskVisuals(input);
  assert.equal(migrated[0].kind === "task" && migrated[0].iconName, "target");
  assert.equal(migrated[0].kind === "task" && migrated[0].iconTone, "blue");
  assert.equal(migrated[1], customized);
  assert.equal(migrated.at(-1), unrelated);
  assert.ok(migrated.slice(0, 10).every(node => node.kind === "task" && node.iconName && node.iconTone));
  assert.equal(migrateNestedTaskVisuals(migrated), migrated);
  const partial = legacy.slice(0, 3);
  assert.equal(migrateNestedTaskVisuals(partial), partial);
});

test("嵌套工时只汇总六个叶子，父项不重复累计", () => {
  const form = plan();
  const leaves = getCreationEffortLeaves(form);
  assert.equal(leaves.length, 6);
  assert.ok(leaves.every(task => task.effortEstimate?.minutes));
  const total = summarizeTaskEffort(leaves);
  assert.equal(total.estimatedCount, 6);
  assert.equal(total.totalMinutes, leaves.reduce((sum, task) => sum + task.effortEstimate!.minutes!, 0));
});

test("移除父项会移除整个分支并清理剩余任务的依赖", () => {
  const form = plan();
  const parent = form.subtasks.find(task => task.title === "完成内容制作")!;
  const script = form.subtasks.find(task => task.title === "撰写直播脚本")!;
  form.subtasks[0].dependsOnClientIds = [script.clientId];
  const next = removeCreationSubtask(form, parent.clientId);
  assert.equal(next.subtasks.length, 4);
  assert.deepEqual(next.subtasks[0].dependsOnClientIds, []);
  assert.equal(validateCreationForm(next, context.members), null);
});

test("无效父项和归属循环会阻止创建，不会静默平铺", () => {
  const form = plan();
  form.subtasks[0].parentClientId = "gone";
  assert.match(validateCreationForm(form, context.members) ?? "", /层级|上级/);
  const draft = toTaskPlanDraft(plan());
  draft.subtasks[0].parentSubtaskIndex = 0;
  assert.throws(() => createWorkspaceTasksFromDraft([], draft), /层级|上级/);
  draft.subtasks[0].parentSubtaskIndex = 1;
  draft.subtasks[1].parentSubtaskIndex = 0;
  assert.throws(() => createWorkspaceTasksFromDraft([], draft), /层级|上级/);
});

test("创建会话恢复保留嵌套层级", () => {
  const form = plan();
  const session = { id: "nested", updatedAt: 1, clarificationStep: 0, parent: null, workspace: { request: form.request, scenarioId: "nested-plan", planning: { stage: "review", form, summary: "" }, answers: {}, processes: [], editingBrief: false } };
  const restored = parseCreationSessions(JSON.stringify([session]));
  assert.equal(restored.error, "");
  const planning = restored.sessions[0].workspace.planning;
  assert.ok(planning?.stage === "review");
  assert.deepEqual(planning.form.subtasks, form.subtasks);
});
