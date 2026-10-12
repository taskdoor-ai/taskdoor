import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWorkspaceNodes } from "../src/ai/mock/data/workspaceNodes.ts";
import { normalizeTaskStatus, type TaskNode } from "../src/shared/model/task-model.ts";
import { getTaskStatusFilters, taskMatchesListFilters, createInitialTaskListFilters } from "../src/features/tasks/components/task-list-filters.ts";
import { normalizeProgressPredictionInputKey, progressPredictionInputKey } from "../src/ai/mock/lib/taskProgressPrediction.ts";

test("旧待开始任务读取为进行中，范围、日期及人员保留，原记录不被改写", () => {
  const saved: TaskNode = { kind: "task", id: "custom-status-migration", name: "核对交付", parentId: "workspace-root", teamId: "creator-commerce", ownerId: "周岚", participantIds: ["林洁"], status: "待开始", updatedAt: "2026-10-12T00:00:00Z", goal: "核对实际交付", completionCriteria: ["交付已核对"], plannedEndOn: "2026-10-18", labels: ["交付"] };
  const migrated = normalizeWorkspaceNodes([saved]).find(node => node.id === saved.id) as TaskNode;
  assert.equal(migrated.status, "进行中");
  for (const key of ["goal", "completionCriteria", "plannedEndOn", "ownerId", "participantIds", "labels"] as const) assert.deepEqual(migrated[key], saved[key]);
  assert.equal(saved.status, "待开始");
});

test("旧状态筛选仍找到旧任务与已迁移任务，不重复进行中选项", () => {
  const filters = { ...createInitialTaskListFilters("me"), statuses: ["待开始", "进行中"] };
  assert.deepEqual(getTaskStatusFilters(filters), ["进行中"]);
  const task: TaskNode = { kind: "task", id: "task", name: "任务", parentId: null, ownerId: "me", status: "待开始", updatedAt: "2026-10-12" };
  assert.equal(taskMatchesListFilters(task, "", filters), true);
  assert.equal(taskMatchesListFilters({ ...task, status: "进行中" }, "", filters), true);
  assert.equal(taskMatchesListFilters({ ...task, status: "已完成" }, "", filters), false);
});

test("状态兼容不改变完成、阻塞或取消状态", () => {
  for (const status of ["进行中", "已阻塞", "已完成", "已取消", "待审核"] as const) assert.equal(normalizeTaskStatus(status), status);
});

test("旧预测缓存签名兼容迁移状态，实际范围变化仍使签名不同", () => {
  const task: TaskNode = { kind: "task", id: "task", name: "任务", parentId: null, ownerId: "me", status: "待开始", updatedAt: "2026-10-12", goal: "核对交付", completionCriteria: ["交付已核对"] };
  const before = progressPredictionInputKey([task], task.id);
  const after = progressPredictionInputKey([{ ...task, status: "进行中" }], task.id);
  assert.equal(normalizeProgressPredictionInputKey(before), after);
  assert.notEqual(normalizeProgressPredictionInputKey(before), progressPredictionInputKey([{ ...task, status: "进行中", goal: "新的目标" }], task.id));
  assert.equal(normalizeProgressPredictionInputKey("invalid"), "invalid");
});
