import assert from "node:assert/strict";
import test from "node:test";
import type { TaskNode, WorkspaceNode } from "../src/shared/model/task-model";
import { applyCurrentTaskTextField } from "../src/features/tasks/lib/task-text-editing";

const parent: TaskNode = { id: "parent", kind: "task", name: "主任务", goal: "主任务目标", parentId: null, ownerId: "owner", status: "进行中", updatedAt: "昨天" };
const child: TaskNode = { ...parent, id: "child", parentTaskId: "parent", name: "子任务", goal: "子任务目标", completionCriteria: ["验收结果"] };
const nodes: WorkspaceNode[] = [parent, child, { ...parent, id: "other", name: "其他任务" }];

test("名称和目标更新只替换当前任务，保留原数据并记录实际变更", () => {
  const before = structuredClone(nodes);
  for (const field of ["name", "goal"] as const) {
    const value = field === "name" ? "更新后的子任务" : "独立修改的目标\n保留换行";
    const result = applyCurrentTaskTextField(nodes, "child", field, value, "编辑者");
    assert.equal(result.original, child);
    assert.equal(result.nodes[0], parent);
    assert.equal(result.nodes[2], nodes[2]);
    assert.notEqual(result.nodes[1], child);
    assert.ok(Number.isFinite(Date.parse(result.nodes[1].updatedAt)));
    assert.deepEqual(result.nodes[1], { ...child, [field]: value, updatedAt: result.nodes[1].updatedAt });
    assert.equal(result.activity?.author, "编辑者");
    assert.equal(result.activity?.type, field === "name" ? "title-change" : "goal-change");
    assert.equal(result.activity?.message, field === "name" ? "修改任务名称" : "修改任务目标");
    assert.deepEqual(result.activity?.changes, [{ label: field === "name" ? "任务名称" : "任务目标", before: child[field], after: value }]);
  }
  assert.deepEqual(nodes, before);
});

test("相同名称和目标不创建活动，也不更新节点或时间", () => {
  for (const field of ["name", "goal"] as const) {
    const result = applyCurrentTaskTextField(nodes, "child", field, child[field]!, "编辑者");
    assert.equal(result.nodes, nodes);
    assert.equal(result.original, child);
    assert.equal(result.activity, null);
    assert.equal(result.nodes[1].updatedAt, "昨天");
  }
});

test("目标缺失时比较展示的旧目标，明确清空后不再采用旧目标", () => {
  const withoutGoal: TaskNode = { ...child, goal: undefined };
  const source: WorkspaceNode[] = [parent, withoutGoal];
  const unchanged = applyCurrentTaskTextField(source, "child", "goal", "展示的旧目标", "编辑者", "展示的旧目标");
  assert.equal(unchanged.nodes, source);
  assert.equal(unchanged.activity, null);
  const cleared = applyCurrentTaskTextField(source, "child", "goal", "", "编辑者", "展示的旧目标");
  assert.equal((cleared.nodes[1] as TaskNode).goal, "");
  assert.deepEqual(cleared.activity?.changes, [{ label: "任务目标", before: "展示的旧目标", after: null }]);
  assert.equal(withoutGoal.goal, undefined);
  const stillEmpty = applyCurrentTaskTextField(cleared.nodes, "child", "goal", "", "编辑者", "展示的旧目标");
  assert.equal(stillEmpty.nodes, cleared.nodes);
  assert.equal(stillEmpty.activity, null);
  const noGoal = applyCurrentTaskTextField(source, "child", "goal", "", "编辑者");
  assert.equal(noGoal.nodes, source);
  assert.equal(noGoal.activity, null);
});

test("不存在或已不是任务的对象不能被当作保存成功", () => {
  assert.throws(() => applyCurrentTaskTextField(nodes, "missing", "name", "新名称", "编辑者"), /不存在/);
  const folder: WorkspaceNode = { id: "folder", kind: "folder", name: "目录", parentId: null, updatedAt: "昨天" };
  assert.throws(() => applyCurrentTaskTextField([folder], "folder", "goal", "新目标", "编辑者"), /不存在/);
});
