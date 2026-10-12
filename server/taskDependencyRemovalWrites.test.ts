import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { createCreationForm, newCreationTask, removeCreationSubtask, toTaskPlanDraft, validateCreationForm, type CreationForm } from "../src/features/tasks/lib/task-creation-form.ts";
import { syncCreationSubtaskEdit } from "../src/features/tasks/lib/task-creation-subtask-editing.ts";
import { createWorkspaceTasksFromDraft } from "../src/features/tasks/lib/workspace-task-creation.ts";
import { applyDraftTaskAiAdjustment, applySavedTaskAiAdjustment, createDraftTaskAiContext, createSavedTaskAiContext } from "../src/features/tasks/lib/task-ai-adjustment-adapters.ts";
import { buildTaskAiAdjustment, getTaskAiContextSignature } from "../src/ai/mock/lib/taskAiAdjustment.ts";
import { normalizeProgressPredictionInputKey, progressPredictionInputKey } from "../src/ai/mock/lib/taskProgressPrediction.ts";
import { deleteWorkspaceTask, getTaskDeletionPreview, type SubtaskWorkspaceState } from "../src/features/tasks/lib/workspace-subtask-editing.ts";
import { creatorCommerceMembers } from "../src/ai/mock/data/creatorCommerceScenario.ts";
import type { TaskDraft, TaskPlanDraft } from "../src/features/tasks/lib/task-assistant-protocol.ts";
import type { TaskAiAdjustmentContext, TaskAiAdjustmentScope } from "../src/features/tasks/lib/task-ai-adjustment-types.ts";
import type { TaskNode, WorkspaceNode } from "../src/shared/model/task-model.ts";

beforeEach(t => t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-08-31T02:00:00Z") }));
const members = [{ id: "self", name: "本人" }];
const draft = (title: string): TaskDraft => ({ title, goal: "交付可核对结果", completionCriteria: ["核对记录已共享"], executionTips: [], ownerId: "self", participantIds: [], labels: [], startDate: "", endDate: "" });
const form = (): CreationForm => ({ request: "用户需求", decision: "independent", mainTask: newCreationTask(draft("主任务")), subtasks: [newCreationTask(draft("资料")), newCreationTask(draft("核对"))] });
const node = (id: string, fields: Partial<TaskNode> = {}): TaskNode => ({ id, kind: "task", parentId: "root", teamId: "team", name: id, ownerId: "self", participantIds: [], goal: "交付可核对结果", completionCriteria: ["核对记录已共享"], status: "进行中", createdAt: "2026-08-31T02:00:00Z", updatedAt: "2026-08-31T02:00:00Z", ...fields });
const candidate = (context: TaskAiAdjustmentContext, instruction: string, scope: TaskAiAdjustmentScope = { kind: "task" }) => {
  const result = buildTaskAiAdjustment(context, scope, instruction);
  assert.ok("proposal" in result, "error" in result ? result.error : "");
  return result.proposal;
};

test("新创建方案保留拆分层级但不导入前置依赖", () => {
  const context = { currentDate: "2026-08-31", currentUserId: "周岚", members: creatorCommerceMembers, tags: [], existingTasks: [] };
  for (const scenarioId of ["complex-plan", "nested-plan"] as const) {
    const plan = createCreationForm("", context, scenarioId);
    assert.ok(plan.subtasks.length > 0);
    assert.ok([plan.mainTask, ...plan.subtasks].every(task => task.dependsOnClientIds.length === 0));
    assert.equal(toTaskPlanDraft(plan).dependencies, undefined);
    if (scenarioId === "nested-plan") assert.ok(plan.subtasks.some(task => task.parentClientId));
  }
});

test("旧草稿的循环和失效依赖不妨碍编辑，提交不再输出依赖", () => {
  const base = form();
  const first = base.subtasks[0], second = base.subtasks[1];
  first.dependsOnClientIds = [second.clientId, "missing"];
  second.dependsOnClientIds = [first.clientId];
  assert.equal(validateCreationForm(base, members), null);
  const expected = structuredClone(first);
  first.dependsOnClientIds.push("old-record");
  const next = syncCreationSubtaskEdit(base, { ...expected, title: "资料已改名", dependsOnClientIds: ["new-reference"] }, expected, members);
  assert.equal(next.subtasks[0].title, "资料已改名");
  assert.deepEqual(next.subtasks[0].dependsOnClientIds, first.dependsOnClientIds);
  assert.equal(toTaskPlanDraft(next).dependencies, undefined);
  const removed = removeCreationSubtask(next, second.clientId);
  assert.deepEqual(removed.subtasks[0].dependsOnClientIds, ["missing", "old-record"]);
  assert.equal(base.subtasks.length, 2);
});

test("创建写入忽略旧协议依赖，独立和固定父任务的层级与日期保持", () => {
  const parent = node("existing", { dependsOnTaskIds: ["historical"] });
  const plan: TaskPlanDraft = { mainTask: draft("主"), subtasks: [draft("下级"), { ...draft("叶子"), parentSubtaskIndex: 0, endDate: "2026-09-20" }], dependencies: [{ subtaskIndex: 1, dependsOnSubtaskIndexes: [0] }] };
  for (const parentTaskId of [undefined, parent.id]) {
    const result = createWorkspaceTasksFromDraft([parent], plan, { parentTaskId, teamId: "team", idForIndex: index => `new-${index}` });
    assert.equal(result.createdNodes[0].parentTaskId, parentTaskId);
    assert.equal(result.createdNodes[1].parentTaskId, "new-0");
    assert.equal(result.createdNodes[2].parentTaskId, "new-1");
    assert.equal(result.createdNodes[2].plannedEndOn, "2026-09-20");
    assert.ok(result.createdNodes.every(task => task.dependsOnTaskIds === undefined));
    assert.deepEqual(result.nodes[0], parent);
  }
});

test("AI普通调整保留旧记录，不能提出或注入依赖修改，新子任务不写依赖", () => {
  const base: WorkspaceNode[] = [node("main", { dependsOnTaskIds: ["missing"] }), node("child", { parentTaskId: "main", dependsOnTaskIds: ["main"] })];
  const context = createSavedTaskAiContext(base, "main", members, "self")!;
  assert.ok([context.task, ...context.subtasks, ...context.dependencyTasks].every(task => task.dependsOnTaskIds.length === 0));
  const rename = candidate(context, "任务名称改为新主任务");
  const next = applySavedTaskAiAdjustment(base, context, rename, { author: "本人" });
  assert.deepEqual((next.nodes[0] as TaskNode).dependsOnTaskIds, ["missing"]);
  assert.deepEqual(next.nodes[1], base[1]);
  assert.ok("error" in buildTaskAiAdjustment(context, { kind: "task" }, "前置依赖改为无"));
  assert.throws(() => applySavedTaskAiAdjustment(base, context, { ...rename, updates: [{ taskId: "main", patch: { title: "新主任务", dependsOnTaskIds: [] } }] }, { author: "本人" }), /预览|不一致/);
  const addition = candidate(context, "添加子任务：结果复查；完成标准：复查记录已共享", { kind: "subtasks" });
  const added = applySavedTaskAiAdjustment(base, context, addition, { author: "本人" });
  assert.equal((added.nodes.at(-1) as TaskNode).dependsOnTaskIds, undefined);
  assert.doesNotMatch(JSON.stringify(added.activities), /前置依赖/);
  const legacy = form(); legacy.mainTask.dependsOnClientIds = ["missing"];
  const draftContext = createDraftTaskAiContext(legacy, members, "self");
  const edited = applyDraftTaskAiAdjustment(legacy, draftContext, candidate(draftContext, "任务名称改为新草稿"));
  assert.deepEqual(edited.mainTask.dependsOnClientIds, ["missing"]);
});

test("AI父子截止和父任务投入约束保留，旧依赖不影响预览签名", () => {
  const base = [node("main", { plannedEndOn: "2026-09-30" }), node("child", { parentTaskId: "main", plannedEndOn: "2026-09-20" })];
  const context = createSavedTaskAiContext(base, "main", members, "self")!;
  const early = buildTaskAiAdjustment(context, { kind: "task" }, "截止时间改为2026-09-10");
  assert.ok("error" in early); assert.match(early.error, /子任务.*截止/);
  const late = buildTaskAiAdjustment(context, { kind: "subtask", taskId: "child" }, "截止时间改为2026-10-01");
  assert.ok("error" in late); assert.match(late.error, /子任务.*主任务/);
  const draftContext = createDraftTaskAiContext(form(), members, "self");
  const effort = buildTaskAiAdjustment(draftContext, { kind: "task" }, "预计投入改为2小时");
  assert.ok("error" in effort); assert.match(effort.error, /叶子|子任务.*汇总/);
  const changedLegacy = structuredClone(context); changedLegacy.task.dependsOnTaskIds = ["missing"];
  changedLegacy.dependencyTasks[0].dependsOnTaskIds = ["old-cycle"];
  assert.equal(getTaskAiContextSignature(changedLegacy), getTaskAiContextSignature(context));
});

test("预测签名兼容旧依赖并忽略其变化，真实父子范围变化仍失效", () => {
  const tasks = [node("main", { dependsOnTaskIds: ["missing"] }), node("child", { parentTaskId: "main" })];
  const key = progressPredictionInputKey(tasks, "main");
  const historical = JSON.parse(key); historical[0].dependsOnTaskIds = ["old"];
  assert.equal(normalizeProgressPredictionInputKey(JSON.stringify(historical)), key);
  assert.equal(progressPredictionInputKey(tasks.map(task => ({ ...task, dependsOnTaskIds: ["other"] })), "main"), key);
  assert.notEqual(progressPredictionInputKey([tasks[0], { ...tasks[1], parentTaskId: undefined }], "main"), key);
});

test("删除任务静默清理旧引用，不生成依赖活动或刷新关联任务时间", () => {
  const nodes = [node("main"), node("child", { parentTaskId: "main" }), node("related", { dependsOnTaskIds: ["child", "kept"] })];
  const state: SubtaskWorkspaceState = { nodes, activities: {}, detailSeeds: [], ownerProposals: {}, participantInvitations: {}, periodOverrides: {}, legacySnapshots: {}, latestLegacySnapshot: null };
  const preview = getTaskDeletionPreview(nodes, "child");
  const changed = { ...state, nodes: nodes.map(task => task.id === "related" ? { ...task, dependsOnTaskIds: ["child", "kept", "other"] } : task) };
  const result = deleteWorkspaceTask(changed, "child", preview.signature, "本人");
  const related = result.nodes.find(task => task.id === "related") as TaskNode;
  assert.deepEqual(related.dependsOnTaskIds, ["kept", "other"]);
  assert.equal(related.updatedAt, nodes[2].updatedAt);
  assert.equal(result.activities.related, undefined);
  assert.match(result.activities.main[0].message, /删除子任务/);
  assert.doesNotMatch(JSON.stringify(result.activities), /前置依赖/);
  assert.equal(result.detailSeeds.some(task => task.id === "related"), false);
  assert.deepEqual(nodes[2].dependsOnTaskIds, ["child", "kept"]);
});
