import assert from "node:assert/strict";
import test from "node:test";
import { creatorCommerceMainTaskId, workspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import { getTaskOverviewProjection } from "../src/lib/taskWorkspaceProjection.ts";
import { getVisibleDependencyEdges } from "../src/lib/taskOverview.ts";

const toOverviewTasks = (tasks: TaskNode[]) => tasks.map((task) => ({ ...task, owner: task.ownerId }));

test("主任务概览投影直属子任务，并保留完整依赖画布", () => {
  const projection = getTaskOverviewProjection(workspaceNodes, creatorCommerceMainTaskId);
  const ids = new Set(projection.tasks.map((task) => task.id));
  const edges = getVisibleDependencyEdges(toOverviewTasks(projection.tasks), ids);

  assert.equal(projection.initialFocusedTaskId, null);
  assert.equal(projection.countLabel, "子任务");
  assert.equal(projection.currentTaskId, creatorCommerceMainTaskId);
  assert.equal(projection.role, "main");
  assert.equal(projection.tasks.length, 8);
  assert.equal(ids.has(creatorCommerceMainTaskId), false);
  assert.ok(!edges.some((edge) => edge.from === "fragrance-growth" && edge.to === "fragrance-data"));
  assert.ok(edges.some((edge) => edge.from === "fragrance-data" && edge.to === "fragrance-final-decision"));
});

test("主任务概览不会混入更深层级任务", () => {
  const grandchild: TaskNode = {
    id: "nested-task",
    kind: "task",
    name: "子任务下的协作项",
    ownerId: "陈默",
    parentId: "fragrance-creator-business",
    parentTaskId: "fragrance-creator-business",
    status: "待开始",
    updatedAt: "刚刚",
  };
  const projection = getTaskOverviewProjection([...workspaceNodes, grandchild], creatorCommerceMainTaskId);

  assert.equal(projection.tasks.some((task) => task.id === grandchild.id), false);
  assert.equal(projection.tasks.every((task) => task.parentTaskId === creatorCommerceMainTaskId), true);
});

test("从列表进入子任务时复用同组真实关系，并默认定位当前任务", () => {
  const projection = getTaskOverviewProjection(workspaceNodes, "fragrance-data");
  const ids = new Set(projection.tasks.map((task) => task.id));
  const edges = getVisibleDependencyEdges(toOverviewTasks(projection.tasks), ids);

  assert.equal(projection.initialFocusedTaskId, "fragrance-data");
  assert.equal(projection.countLabel, "相关任务");
  assert.equal(projection.currentTaskId, "fragrance-data");
  assert.equal(projection.role, "subtask");
  assert.equal(projection.tasks.length, 8);
  assert.ok(!edges.some((edge) => edge.from === "fragrance-growth" && edge.to === "fragrance-data"));
  assert.ok(edges.some((edge) => edge.from === "fragrance-data" && edge.to === "fragrance-final-decision"));
});

test("独立任务至少用自身目录数据构建非空概览", () => {
  const standalone: TaskNode = {
    id: "standalone",
    kind: "task",
    name: "独立复盘任务",
    parentId: "workspace-root",
    ownerId: "韩序",
    status: "进行中",
    updatedAt: "刚刚",
  };
  const projection = getTaskOverviewProjection([...workspaceNodes, standalone], standalone.id);

  assert.equal(projection.initialFocusedTaskId, standalone.id);
  assert.equal(projection.countLabel, "相关任务");
  assert.equal(projection.currentTaskId, standalone.id);
  assert.equal(projection.role, "standalone");
  assert.deepEqual(projection.tasks.map((task) => task.id), [standalone.id]);
});
