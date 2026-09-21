import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWorkspaceNodes, type TaskNode, type WorkspaceNode } from "../src/data/workspaceNodes.ts";
import { applySavedTaskAiAdjustment, createSavedTaskAiContext, getTaskDefinitionGoal } from "../src/lib/taskAiAdjustmentAdapters.ts";
import { buildTaskAiAdjustment } from "../src/lib/taskAiAdjustment.ts";
import { newCreationTask, toTaskPlanDraft, type CreationForm } from "../src/lib/taskCreationForm.ts";
import { reconcileCreationEffort } from "../src/lib/taskCreationEffort.ts";
import { createWorkspaceTasksFromDraft } from "../src/lib/workspaceTaskCreation.ts";
import { addWorkspaceSubtask } from "../src/lib/workspaceSubtaskEditing.ts";

const root: TaskNode = { id: "root", kind: "task", name: "主任务", parentId: null, goal: "原主目标", ownerId: "self", status: "待开始", updatedAt: "昨天" };
const child: TaskNode = { ...root, id: "child", name: "子任务", parentTaskId: "root", goal: "子任务初始目标" };
const sibling: TaskNode = { ...child, id: "sibling", name: "同级任务", goal: "同级目标" };
const members = [{ id: "self", name: "我" }];

test("已保存子任务优先读取自己的目标，不跟随主目标变化", () => {
  const nodes = [{ ...root, goal: "父任务新目标" }, child, sibling];
  assert.equal(getTaskDefinitionGoal(nodes, child), "子任务初始目标");
  const context = createSavedTaskAiContext(nodes, "child", members, "self")!;
  assert.equal(context.task.goal, child.goal);
  assert.equal(context.task.goalInherited, false);
});

test("只有缺失目标才兼容父目标，显式清空和持久化后空值都不回退", () => {
  const missing = { ...child, goal: undefined };
  const empty = { ...sibling, goal: "" };
  const nodes: WorkspaceNode[] = [root, missing, empty];
  assert.equal(getTaskDefinitionGoal(nodes, missing), root.goal);
  assert.equal(getTaskDefinitionGoal(nodes, empty), "");
  const restored = normalizeWorkspaceNodes(JSON.parse(JSON.stringify(nodes)));
  assert.equal(getTaskDefinitionGoal(restored, restored.find(n => n.id === empty.id) as TaskNode), "");
  const grandchild = { ...missing, id: "grandchild", parentTaskId: empty.id };
  assert.equal(getTaskDefinitionGoal([...nodes, grandchild], grandchild), "", "最近的显式空目标也应停止回退");
});

test("AI 单独修改子任务目标并可在刷新后读取，不改父任务与同级", () => {
  const nodes = [root, child, sibling];
  const context = createSavedTaskAiContext(nodes, "child", members, "self")!;
  const result = buildTaskAiAdjustment(context, { kind: "task" }, "目标改为独立交付可复核的数据看板");
  assert.ok("proposal" in result, JSON.stringify(result));
  const saved = applySavedTaskAiAdjustment(nodes, context, result.proposal, { author: "我" });
  assert.equal(saved.nodes[0], root);
  assert.equal(saved.nodes[2], sibling);
  assert.equal(child.goal, "子任务初始目标");
  const restored = normalizeWorkspaceNodes(JSON.parse(JSON.stringify(saved.nodes)));
  assert.equal(createSavedTaskAiContext(restored, "child", members, "self")!.task.goal, "独立交付可复核的数据看板");
  assert.deepEqual(saved.affectedIds, ["child"]);
});

test("新子任务创建时带入当前主任务目标，创建后独立保留", () => {
  const result = addWorkspaceSubtask([root, child], child.id, { title: "更小的交付", completionCriteria: ["完成核对"] }, { currentUserId: "self", author: "我", id: "new-child" });
  assert.equal(result.createdTask.goal, child.goal);
  const changed = result.nodes.map(node => node.id === child.id ? { ...node, goal: "后续主目标" } : node);
  assert.equal(getTaskDefinitionGoal(changed, result.createdTask), child.goal);
});


test("创建投影和保存保留每个目标，包括显式空子目标，不强制覆盖父目标", () => {
  const taskDraft = { title: "当前子任务", goal: "人工输入目标", ownerId: "self", participantIds: [], labels: [], startDate: "", endDate: "" };
  const form: CreationForm = { request: "", decision: "attach", candidate: { id: root.id, goal: root.goal }, mainTask: newCreationTask(taskDraft), subtasks: [newCreationTask({ ...taskDraft, title: "下一层任务", goal: "" })] };
  const reconciled = reconcileCreationEffort(form, form);
  const draft = toTaskPlanDraft(reconciled);
  assert.equal(draft.mainTask.goal, "人工输入目标");
  assert.equal(draft.subtasks[0].goal, "");
  const saved = createWorkspaceTasksFromDraft([root, sibling], draft, { parentTaskId: root.id, currentUserId: "self", idForIndex: i => `created-${i}` });
  assert.equal(saved.createdNodes[0].goal, "人工输入目标");
  assert.equal(saved.createdNodes[1].goal, "");
  const restored = normalizeWorkspaceNodes(JSON.parse(JSON.stringify(saved.nodes)));
  assert.equal(getTaskDefinitionGoal(restored, restored.find(n => n.id === "created-1") as TaskNode), "");
  assert.equal(saved.nodes[0], root);
  assert.equal(saved.nodes[1], sibling);
});
