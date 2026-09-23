import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { createWorkspaceTaskDetail } from "../src/data/taskDetailMocks.ts";
import { normalizeWorkspaceNodes, workspaceRootId, type TaskNode, type WorkspaceNode } from "../src/data/workspaceNodes.ts";
import { getEffortScopeKey, getTaskEffortState } from "../src/lib/taskEffort.ts";
import { commitTaskAiStorage, TASK_AI_JOURNAL_KEY } from "../src/lib/taskAiAdjustmentStorage.ts";

const moduleUrl = new URL("../src/lib/workspaceSubtaskEditing.ts", import.meta.url);
const editing = existsSync(moduleUrl) ? await import("../src/lib/workspaceSubtaskEditing.ts") : null;
const model = () => { assert.ok(editing, "需要提供可测试的子任务维护逻辑"); return editing; };
const task = (id: string, overrides: Partial<TaskNode> = {}): TaskNode => ({
  id, kind: "task", name: id, parentId: workspaceRootId, ownerId: "周岚", status: "进行中", updatedAt: "昨天", ...overrides,
});
const parent = task("parent", { name: "主任务", goal: "主任务的真实目标", participantIds: ["林洁"], labels: ["内容制作"] });
const child = task("child", { name: "待删除子任务", parentTaskId: parent.id });
const grandchild = task("grandchild", { name: "下一层任务", parentTaskId: child.id });
const sibling = task("sibling", { parentTaskId: parent.id, dependsOnTaskIds: [child.id, "other"] });
const other = task("other");
const nodes: WorkspaceNode[] = [parent, child, grandchild, sibling, other];
const draft = { title: " 新增子任务 ", completionCriteria: [" 交付复盘纪要 ", "保留结论；不要自动拆分\n原文"] };

function state() {
  const legacy = (id: string) => ({ id, title: id, goal: "旧目标", createdAt: "2026-08-30T00:00:00Z", contextIds: [], participants: [], childTaskIds: id === parent.id ? [child.id, sibling.id] : [] });
  return {
    nodes, activities: { child: [], sibling: [], parent: [] }, detailSeeds: [parent, child, grandchild, sibling],
    ownerProposals: { child: "林洁", other: "陈默" },
    participantInvitations: { grandchild: { "林洁": "pending" as const }, other: { "陈默": "accepted" as const } },
    periodOverrides: { child: { start: "", end: "2026-09-02" }, other: null },
    legacySnapshots: { parent: legacy(parent.id), child: legacy(child.id), other: legacy(other.id) },
    latestLegacySnapshot: legacy(child.id),
  };
}

test("新增子任务要求名称和逐条非空完成标准", () => {
  const { getNewSubtaskDraftError } = model();
  assert.match(getNewSubtaskDraftError({ ...draft, title: " \n " })!, /名称/);
  assert.match(getNewSubtaskDraftError({ ...draft, completionCriteria: [] })!, /至少.*一条/);
  assert.match(getNewSubtaskDraftError({ ...draft, completionCriteria: ["有效", " "] })!, /第 2 条/);
  assert.equal(getNewSubtaskDraftError(draft), null);
});

test("确认新增只创建一个直属任务，继承目标但不继承人员、标签或虚构进展", () => {
  const before = structuredClone(nodes);
  const result = model().addWorkspaceSubtask(nodes, parent.id, draft, { currentUserId: "周岚", author: "编辑者", id: "new-child" });
  assert.equal(result.createdTask.id, "new-child");
  assert.equal(result.createdTask.parentTaskId, parent.id);
  assert.equal(result.createdTask.parentId, parent.parentId);
  assert.equal(result.createdTask.goal, parent.goal);
  assert.equal(result.createdTask.name, "新增子任务");
  assert.deepEqual(result.createdTask.completionCriteria, ["交付复盘纪要", "保留结论；不要自动拆分\n原文"]);
  assert.equal(result.createdTask.ownerId, "");
  assert.deepEqual(result.createdTask.participantIds, []);
  assert.equal(result.createdTask.labels, undefined);
  assert.equal(result.createdTask.status, "待开始");
  assert.equal(result.createdTask.effortEstimate, undefined);
  assert.equal(result.createdTask.createdBy, "周岚");
  assert.equal(result.createdTask.createdFrom, "task-editor");
  assert.equal(result.nodes.length, nodes.length + 1);
  assert.equal(result.activity?.author, "编辑者");
  assert.equal(result.activity?.message, "新增子任务");
  assert.equal(result.activity?.changes?.[0].after, "新增子任务");
  assert.deepEqual(nodes, before, "候选计算不能修改当前状态");
  const detail = createWorkspaceTaskDetail(result.createdTask);
  assert.deepEqual(detail.activities, []);
  assert.deepEqual(detail.files, []);
  assert.deepEqual(detail.commits, []);
});

test("新增到中间层时沿用顶层当前目标，父任务不存在则拒绝", () => {
  const result = model().addWorkspaceSubtask(nodes, child.id, draft, { currentUserId: "周岚", author: "周岚", id: "new-child" });
  assert.equal(result.createdTask.parentTaskId, child.id);
  assert.equal(result.createdTask.goal, parent.goal);
  assert.throws(() => model().addWorkspaceSubtask(nodes, "missing", draft, { currentUserId: "周岚", author: "周岚" }), /不存在/);
  assert.throws(() => model().addWorkspaceSubtask(nodes, parent.id, { ...draft, title: "" }, { currentUserId: "周岚", author: "周岚" }), /名称/);
});

test("手工新增未分配任务刷新后仍存在且不回填演示文件", () => {
  const fresh = task("manual", { ownerId: "", createdFrom: "task-editor", completionCriteria: ["真实标准"] });
  const restored = normalizeWorkspaceNodes(JSON.parse(JSON.stringify([fresh]))).find(node => node.id === fresh.id);
  assert.ok(restored?.kind === "task");
  assert.equal(restored.createdFrom, "task-editor");
  assert.deepEqual(createWorkspaceTaskDetail(restored).files, []);
});

test("删除预览统计全部后代和受影响的外部依赖，不混入兄弟任务", () => {
  const preview = model().getSubtaskDeletionPreview(nodes, parent.id, child.id);
  assert.deepEqual(preview.deletedTaskIds, [child.id, grandchild.id]);
  assert.equal(preview.descendantCount, 1);
  assert.deepEqual(preview.dependencyTasks.map(node => node.id), [sibling.id]);
  assert.equal(preview.task.name, child.name);
  assert.equal(preview.parent.id, parent.id);
});

test("级联删除清理节点与当前依赖，保留其他状态并记录真实变更", () => {
  const current = state();
  const before = structuredClone(current);
  const preview = model().getSubtaskDeletionPreview(nodes, parent.id, child.id);
  const result = model().deleteWorkspaceSubtask(current, parent.id, child.id, preview.signature, "编辑者");
  assert.deepEqual(result.nodes.map(node => node.id), [parent.id, sibling.id, other.id]);
  assert.deepEqual((result.nodes.find(node => node.id === sibling.id) as TaskNode).dependsOnTaskIds, [other.id]);
  assert.equal(result.nodes.find(node => node.id === other.id), other);
  assert.equal(result.activities[parent.id][0].author, "编辑者");
  assert.match(result.activities[parent.id][0].message, /删除子任务/);
  assert.equal(result.activities[sibling.id][0].changes?.[0].before, "待删除子任务、other");
  assert.equal(result.activities[sibling.id][0].changes?.[0].after, "other");
  assert.equal(result.activities.child, undefined);
  assert.deepEqual(result.detailSeeds.map(node => node.id), [parent.id, sibling.id]);
  assert.deepEqual(result.ownerProposals, { other: "陈默" });
  assert.deepEqual(result.participantInvitations, { other: { "陈默": "accepted" } });
  assert.deepEqual(result.periodOverrides, { other: null });
  assert.equal(result.legacySnapshots.child, undefined);
  assert.deepEqual(result.legacySnapshots.parent.childTaskIds, [sibling.id]);
  assert.equal(result.latestLegacySnapshot, null);
  assert.deepEqual(current, before, "确认前/保存失败时原状态保持不变");
});

test("左侧任务删除可移除任意任务树，并清理外部依赖和关联状态", () => {
  const current = state();
  const preview = model().getTaskDeletionPreview(nodes, parent.id);
  assert.deepEqual(preview.deletedTaskIds, [parent.id, child.id, sibling.id, grandchild.id]);
  assert.equal(preview.descendantCount, 3);
  assert.deepEqual(preview.dependencyTasks, []);
  const result = model().deleteWorkspaceTask(current, parent.id, preview.signature, "编辑者");
  assert.deepEqual(result.nodes.map(node => node.id), [other.id]);
  assert.deepEqual(result.detailSeeds, []);
  assert.deepEqual(result.ownerProposals, { other: "陈默" });
  assert.deepEqual(result.participantInvitations, { other: { "陈默": "accepted" } });
  assert.deepEqual(result.periodOverrides, { other: null });
  assert.equal(result.legacySnapshots.parent, undefined);
  assert.equal(result.legacySnapshots.child, undefined);
  assert.equal(result.latestLegacySnapshot, null);
  assert.equal(result.returnTaskId, null);
});

test("从左侧删除子任务后返回仍存在的父任务，并拒绝过期删除范围", () => {
  const current = state();
  const preview = model().getTaskDeletionPreview(nodes, child.id);
  assert.equal(preview.parent?.id, parent.id);
  const result = model().deleteWorkspaceTask(current, child.id, preview.signature, "编辑者");
  assert.equal(result.returnTaskId, parent.id);
  assert.deepEqual(result.nodes.map(node => node.id), [parent.id, sibling.id, other.id]);
  const changed = { ...current, nodes: [...nodes, task("new-descendant", { parentTaskId: grandchild.id })] };
  assert.throws(() => model().deleteWorkspaceTask(changed, child.id, preview.signature, "编辑者"), /变化|重新.*确认/);
});

test("删除范围或依赖变化后必须重新确认，不允许用旧预览扩大删除", () => {
  const current = state();
  const preview = model().getSubtaskDeletionPreview(nodes, parent.id, child.id);
  const changed = { ...current, nodes: [...nodes, task("new-descendant", { parentTaskId: grandchild.id })] };
  assert.throws(() => model().deleteWorkspaceSubtask(changed, parent.id, child.id, preview.signature, "编辑者"), /变化|重新.*确认/);
  const linked = { ...current, nodes: nodes.map(node => node.id === other.id ? { ...other, dependsOnTaskIds: [child.id] } : node) };
  assert.throws(() => model().deleteWorkspaceSubtask(linked, parent.id, child.id, preview.signature, "编辑者"), /变化|重新.*确认/);
});

test("拒绝删除非直属、缺失任务和包含父任务的坏循环", () => {
  assert.throws(() => model().getSubtaskDeletionPreview(nodes, parent.id, other.id), /直属/);
  assert.throws(() => model().getSubtaskDeletionPreview(nodes, parent.id, grandchild.id), /直属/);
  assert.throws(() => model().getSubtaskDeletionPreview(nodes, parent.id, "missing"), /不存在/);
  const cyclic = nodes.map(node => node.id === parent.id ? { ...parent, parentTaskId: grandchild.id } : node);
  assert.throws(() => model().getSubtaskDeletionPreview(cyclic, parent.id, child.id), /循环|父任务/);
});

test("首次新增或删除最后一个子任务都不会复活旧父任务工时", () => {
  const estimated = { ...parent, effortEstimate: { minutes: 120, workMethod: "AI 辅助人工核对", basis: "model" as const, reason: "原范围", confirmed: true, scopeKey: getEffortScopeKey(parent, "AI 辅助人工核对"), version: 1 } };
  const added = model().addWorkspaceSubtask([estimated], parent.id, draft, { currentUserId: "周岚", author: "周岚", id: "new-child" });
  assert.equal(getTaskEffortState(added.nodes[0] as TaskNode), "stale");
  const current = { ...state(), nodes: [estimated, child] };
  const preview = model().getSubtaskDeletionPreview(current.nodes, parent.id, child.id);
  const removed = model().deleteWorkspaceSubtask(current, parent.id, child.id, preview.signature, "周岚");
  assert.equal(getTaskEffortState(removed.nodes[0] as TaskNode), "stale");
  assert.equal((removed.nodes[0] as TaskNode).effortEstimate?.minutes, 120);
});

test("删除写集覆盖legacy双入口和每个被删除任务的文件版本，不清理无关键", () => {
  const current = state();
  const preview = model().getSubtaskDeletionPreview(nodes, parent.id, child.id);
  const result = model().deleteWorkspaceSubtask(current, parent.id, child.id, preview.signature, "编辑者");
  const writes = new Map(model().getSubtaskDeletionWrites(result));
  assert.equal(writes.get("agentdoor-created-task"), "null");
  assert.equal(JSON.parse(writes.get("agentdoor-created-tasks")!).child, undefined);
  assert.equal(writes.get("agentdoor-task-file-edits:child"), "{}");
  assert.equal(writes.get("agentdoor-task-file-edits:grandchild"), "{}");
  assert.equal(writes.has("agentdoor-task-file-edits:other"), false);
  assert.equal(writes.has("agentdoor-tags"), false);
  assert.equal(JSON.parse(writes.get("agentdoor-task-owner-proposals")!).child, undefined);
});

test("删除的多键保存失败会全部回滚，成功后刷新没有孤儿或复活快照", () => {
  const current = state();
  const preview = model().getSubtaskDeletionPreview(nodes, parent.id, child.id);
  const result = model().deleteWorkspaceSubtask(current, parent.id, child.id, preview.signature, "编辑者");
  const writes = model().getSubtaskDeletionWrites(result);
  const initial = new Map(writes.map(([key]) => [key, key === "agentdoor-workspace-nodes" ? JSON.stringify(nodes) : JSON.stringify({ saved: key })]));
  initial.set("unrelated", "keep");
  const values = new Map(initial);
  let failOnce = true;
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => { values.delete(key); },
    setItem: (key: string, value: string) => {
      if (key === "agentdoor-created-task" && failOnce) { failOnce = false; throw new Error("quota"); }
      values.set(key, value);
    },
  };
  assert.throws(() => commitTaskAiStorage(storage, writes), /回滚|保存失败/);
  assert.deepEqual(values, initial);
  assert.equal(values.has(TASK_AI_JOURNAL_KEY), false);
  commitTaskAiStorage(storage, writes);
  assert.equal(values.get("unrelated"), "keep");
  const restored = normalizeWorkspaceNodes(JSON.parse(values.get("agentdoor-workspace-nodes")!));
  assert.equal(restored.some(node => [child.id, grandchild.id].includes(node.id)), false);
  assert.equal(values.get("agentdoor-created-task"), "null");
});

test("App创建入口与两种删除入口独立接线，存储提交成功后才清理文件草稿", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /onCreateSubtask=\{startNewSubtaskConversation\}/);
  assert.match(app, /onDeleteSubtask=\{requestDeleteSubtask\}/);
  assert.match(app, /onDeleteTask=\{requestDeleteTask\}/);
  const remove = app.slice(app.indexOf("const confirmDeleteSubtask ="), app.indexOf("const selectedTreeTask ="));
  assert.ok(remove.indexOf("commitTaskAiStorage") < remove.indexOf("clearTaskFileDraftSessions"));
  assert.ok(remove.includes('kind: "subtasks"'));
  const listRemove = app.slice(app.indexOf("const confirmDeleteTask ="), app.indexOf("const selectedTreeTask ="));
  assert.ok(listRemove.indexOf("commitTaskAiStorage") < listRemove.indexOf("clearTaskFileDraftSessions"));
  assert.match(app, /preview=\{subtaskDeletion.preview\}/);
  assert.match(app, /preview=\{taskDeletion.preview\}/);
});
