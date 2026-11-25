import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskListProjection } from "../src/features/tasks/lib/task-list-projection.ts";
import { buildTaskListHierarchy } from "../src/features/tasks/lib/task-list-hierarchy.ts";
import type { TaskNode } from "../src/shared/model/task-model.ts";

const task = (id: string, status: TaskNode["status"], day: string, patch: Partial<TaskNode> = {}): TaskNode => ({
  id, kind: "task", name: id, parentId: null, teamId: "team", ownerId: "me", status,
  updatedAt: `2026-11-${day}T12:00:00Z`, createdAt: `2026-11-${day}T12:00:00Z`, ...patch,
});
const filters = { owner: "all", status: "all", tag: "all" };

for (const sort of ["recent", "created"] as const) {
  test(`${sort}：全部状态按侧栏顺序排列，同状态时间倒序且未知时间靠后`, () => {
    const tasks = [
      task("cancelled", "已取消", "24"), task("done-old", "已完成", "21"),
      task("blocked", "已阻塞", "23"), task("active-old", "进行中", "18", { createdAt: "2026-11-20T12:00:00Z" }),
      task("done-new", "已完成", "24"), task("active-new", "进行中", "20", { createdAt: "2026-11-18T12:00:00Z" }),
      task("active-unknown", "进行中", "24", { updatedAt: "未知", createdAt: undefined }),
    ];
    const snapshot = JSON.stringify(tasks);
    const result = buildTaskListProjection(tasks, "", { ...filters, sort }, []);
    const activeIds = sort === "created" ? ["active-old", "active-new"] : ["active-new", "active-old"];
    const expected = [...activeIds, "active-unknown", "blocked", "done-new", "done-old", "cancelled"];
    assert.deepEqual(result.visibleTasks.map(item => item.id), expected);
    assert.deepEqual(buildTaskListHierarchy(tasks, result.visibleTasks, { sort }).matchingTaskIds, expected);
    assert.equal(JSON.stringify(tasks), snapshot);
    assert.equal(result.statusCounts.all, 7);
  });

  test(`${sort}：状态变化重新归组，单状态筛选仍按选定时间排序`, () => {
    const tasks = [task("launch-done", "已完成", "24"), task("launch-active", "进行中", "18")];
    const selected = { ...filters, sort, statuses: ["已完成"] };
    assert.deepEqual(buildTaskListProjection(tasks, "launch", selected, []).visibleTasks.map(item => item.id), ["launch-done"]);
    const reopened = tasks.map(item => item.id === "launch-done" ? { ...item, status: "进行中" as const } : item);
    assert.deepEqual(buildTaskListProjection(reopened, "launch", { ...filters, sort }, []).visibleTasks.map(item => item.id), ["launch-done", "launch-active"]);
    assert.equal(buildTaskListProjection(reopened, "launch", selected, []).visibleTasks.length, 0);
  });

  test(`${sort}：层级按命中分支的最前状态排列，保留祖先及父子关系`, () => {
    const context = task("context", "已取消", "24");
    const active = task("active", "进行中", "18", { parentTaskId: "context" });
    const done = task("done", "已完成", "24", { parentTaskId: "context" });
    const blocked = task("blocked", "已阻塞", "23", { parentTaskId: "context" });
    const cancelled = task("cancelled", "已取消", "24", { parentTaskId: "context" });
    const other = task("other", "已阻塞", "24");
    const all = [other, context, cancelled, done, blocked, active];
    const result = buildTaskListHierarchy(all, [other, cancelled, done, blocked, active], { sort });
    assert.deepEqual(result.roots.map(item => item.task.id), ["context", "other"]);
    assert.equal(result.roots[0].matches, false);
    assert.deepEqual(result.roots[0].children.map(item => item.task.id), ["active", "blocked", "done", "cancelled"]);
    assert.equal(context.status, "已取消");
  });
}

test("历史待开始按进行中归组，不改写保存状态", () => {
  const tasks = [task("blocked", "已阻塞", "24"), task("waiting", "待开始", "18"), task("active", "进行中", "20")];
  assert.deepEqual(buildTaskListProjection(tasks, "", filters, []).visibleTasks.map(item => item.id), ["active", "waiting", "blocked"]);
  assert.equal(tasks[1].status, "待开始");
});
