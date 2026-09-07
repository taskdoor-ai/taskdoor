import assert from "node:assert/strict";
import test from "node:test";
import type { TaskNode, WorkspaceNode } from "../src/data/workspaceNodes";
import { applyCurrentTaskCriteria, applySavedTaskCriteria, validateTaskCriteria } from "../src/lib/taskCriteriaEditing";

const parent: TaskNode = { id: "parent", kind: "task", name: "主任务", parentId: null, ownerId: "owner", status: "进行中", updatedAt: "昨天" };
const child: TaskNode = { ...parent, id: "child", parentTaskId: "parent", name: "子任务", completionCriteria: ["原标准"], goal: "共享目标", dependsOnTaskIds: ["other"], participantIds: ["member"] };
const nodes: WorkspaceNode[] = [parent, child, { ...parent, id: "other" }];

test("逐条 trim，保留分号、换行和相同条目，不解析正文", () => {
  assert.deepEqual(validateTaskCriteria([" A；B\nC ", " D ", "D"]), ["A；B\nC", "D", "D"]);
});
test("拒绝空列表和空白条目并指出位置", () => {
  assert.throws(() => validateTaskCriteria([]), /至少.*一条/);
  assert.throws(() => validateTaskCriteria(["有效", " \n "]), /第 2 条/);
});
test("保存多条只修改目标标准和更新时间，原数据不变，生成真实人工变更", () => {
  const result = applySavedTaskCriteria(nodes, "parent", "child", ["原标准"], [" 第一条 ", "第二条"], "编辑者");
  assert.equal(result.original, child);
  assert.equal(result.nodes[0], parent);
  assert.equal(result.nodes[2], nodes[2]);
  assert.deepEqual(result.nodes[1], { ...child, completionCriteria: ["第一条", "第二条"], updatedAt: "刚刚" });
  assert.deepEqual(child.completionCriteria, ["原标准"]);
  assert.equal(result.activity?.type, "task-definition-change");
  assert.equal(result.activity?.author, "编辑者");
  assert.equal(result.activity?.message, "修改完成标准");
  assert.deepEqual(result.activity?.changes, [{ label: "完成标准", before: "原标准", after: "第一条\n第二条" }]);
});
test("相同内容不创建活动也不替换 nodes", () => {
  const result = applySavedTaskCriteria(nodes, "parent", "child", ["原标准"], [" 原标准 "], "编辑者");
  assert.equal(result.nodes, nodes);
  assert.equal(result.activity, null);
});
test("拒绝过期、已移动、非直属及不存在的任务", () => {
  assert.throws(() => applySavedTaskCriteria(nodes, "parent", "child", ["旧标准"], ["新标准"], "编辑者"), /已.*更新|变化/);
  assert.throws(() => applySavedTaskCriteria(nodes, "parent", "other", [], ["新标准"], "编辑者"), /直属/);
  assert.throws(() => applySavedTaskCriteria(nodes, "missing", "child", ["原标准"], ["新标准"], "编辑者"), /不存在/);
  assert.throws(() => applySavedTaskCriteria(nodes, "parent", "missing", [], ["新标准"], "编辑者"), /不存在/);
  const moved = nodes.map(node => node.id === "child" ? { ...child, parentTaskId: "other" } : node);
  assert.throws(() => applySavedTaskCriteria(moved, "parent", "child", ["原标准"], ["新标准"], "编辑者"), /直属/);
});
test("缺少标准不能把目标作为旧标准，允许补全首条标准", () => {
  const empty = { ...child, completionCriteria: undefined };
  const result = applySavedTaskCriteria([parent, empty], "parent", "child", [], ["可核对的结果"], "编辑者");
  assert.deepEqual(result.activity?.changes, [{ label: "完成标准", before: null, after: "可核对的结果" }]);
});

test("拆分或合并相同换行正文仍保存条目边界并记录活动", () => {
  const multiline = { ...child, completionCriteria: ["A\nB"] };
  const split = applySavedTaskCriteria([parent, multiline], "parent", "child", ["A\nB"], ["A", "B"], "编辑者");
  assert.ok(split.activity);
  assert.notEqual(split.activity.changes?.[0].before, split.activity.changes?.[0].after);
  assert.deepEqual((split.nodes[1] as TaskNode).completionCriteria, ["A", "B"]);
  const merged = applySavedTaskCriteria(split.nodes, "parent", "child", ["A", "B"], ["A\nB"], "编辑者");
  assert.ok(merged.activity);
});

test("当前任务从空标准新增多条，只更新当前任务并保留子任务及任务状态", () => {
  const result = applyCurrentTaskCriteria(nodes, "parent", [], [" 确认最终交付范围 ", "交付内容可供复核"], "编辑者");
  assert.equal(result.original, parent);
  assert.deepEqual(result.nodes[0], { ...parent, completionCriteria: ["确认最终交付范围", "交付内容可供复核"], updatedAt: "刚刚" });
  assert.equal(result.nodes[1], child);
  assert.equal(result.nodes[2], nodes[2]);
  assert.equal(parent.completionCriteria, undefined);
  assert.equal(result.activity?.author, "编辑者");
  assert.deepEqual(result.activity?.changes, [{ label: "完成标准", before: null, after: "确认最终交付范围\n交付内容可供复核" }]);
});

test("当前任务可修改已有标准并追加条目，旧入口仍不能直接修改主任务", () => {
  const result = applyCurrentTaskCriteria(nodes, "child", ["原标准"], ["修改后的标准", "追加标准"], "编辑者");
  assert.equal(result.nodes[0], parent);
  assert.deepEqual((result.nodes[1] as TaskNode).completionCriteria, ["修改后的标准", "追加标准"]);
  assert.equal((result.nodes[1] as TaskNode).status, child.status);
  assert.equal((result.nodes[1] as TaskNode).parentTaskId, child.parentTaskId);
  assert.deepEqual(result.activity?.changes, [{ label: "完成标准", before: "原标准", after: "修改后的标准\n追加标准" }]);
  assert.throws(() => applySavedTaskCriteria(nodes, "parent", "parent", [], ["不能通过子任务入口保存"], "编辑者"), /直属/);
});

test("当前任务拒绝过期、新增期间并发更新、无效条目及不存在对象", () => {
  assert.throws(() => applyCurrentTaskCriteria(nodes, "child", ["过时的标准"], ["新标准"], "编辑者"), /已被其他操作更新/);
  const changed = applyCurrentTaskCriteria(nodes, "parent", [], ["其他操作新增标准"], "其他编辑者");
  assert.throws(() => applyCurrentTaskCriteria(changed.nodes, "parent", [], ["过期表单的标准"], "编辑者"), /已被其他操作更新/);
  assert.throws(() => applyCurrentTaskCriteria(nodes, "child", ["原标准"], ["有内容", " "], "编辑者"), /第 2 条/);
  assert.throws(() => applyCurrentTaskCriteria(nodes, "missing", [], ["标准"], "编辑者"), /不存在/);
  const unchanged = applyCurrentTaskCriteria(nodes, "child", ["原标准"], [" 原标准 "], "编辑者");
  assert.equal(unchanged.nodes, nodes);
  assert.equal(unchanged.activity, null);
});
