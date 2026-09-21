import assert from "node:assert/strict";
import test from "node:test";
import { taskUpdatedTime, taskUpdatedLabel, taskDueLabel } from "../src/lib/taskListPresentation.ts";
import { buildTaskListProjection } from "../src/lib/taskListProjection.ts";
import { createInitialTaskListFilters } from "../src/components/taskListFilters.ts";
import { normalizeWorkspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import type { TaskListFilters } from "../src/components/taskListFilters.ts";
const node = (id: string, patch: Partial<TaskNode> = {}): TaskNode => ({ id, kind: "task", parentId: null, name: id, ownerId: "me", status: "进行中", updatedAt: "2026-09-01T09:00:00Z", ...patch });
test("关系视图按正式负责人和参与人筛选，旧负责人提议迁移为正式负责", () => {
  const nodes = normalizeWorkspaceNodes([node("owned"), node("participating", { ownerId: "other", participantIds: ["me"] }), node("both", { participantIds: ["me"] }), node("proposed", { ownerId: "", proposedOwnerId: "me", createdBy: "me" }), node("other", { ownerId: "other" })])
    .filter((item): item is TaskNode => item.kind === "task");
  const filters: TaskListFilters = { ...createInitialTaskListFilters("me"), scope: "owned" };
  const ids = (scope: TaskListFilters["scope"]) => buildTaskListProjection(nodes, "", { ...filters, scope }, [], "me").visibleTasks.map(t => t.id);
  assert.deepEqual(ids("owned"), ["both", "owned", "proposed"]);
  assert.deepEqual(ids("participating"), ["both", "participating"]);
  assert.deepEqual(ids("all"), ["both", "other", "owned", "participating", "proposed"]);
  assert.equal(buildTaskListProjection(nodes, "", { ...filters, scope: "participating" }, [], "").visibleTasks.length, 0);
});
test("参与视图叠加搜索、未完成和标签条件，切换排序不改变结果范围", () => {
  const nodes = [node("launch-old", { participantIds: ["me"], labels: ["A"], createdAt: "2026-09-08T10:00:00Z" }), node("launch-new", { ownerId: "other", participantIds: ["me"], labels: ["A"], updatedAt: "2026-09-07T10:00:00Z", createdAt: "2026-08-01T10:00:00Z" }), node("launch-done", { participantIds: ["me"], labels: ["A"], status: "已完成" }), node("launch-cancelled", { participantIds: ["me"], labels: ["A"], status: "已取消" }), node("unrelated", { participantIds: ["me"], labels: ["A"] }), node("launch-other-tag", { participantIds: ["me"], labels: ["B"] })];
  const filters: TaskListFilters = { ...createInitialTaskListFilters("me"), view: "participating", completion: "open", tags: ["A"] };
  const snapshot = JSON.stringify(nodes);
  assert.deepEqual(buildTaskListProjection(nodes, "launch", filters, [], "me").visibleTasks.map(t => t.id), ["launch-new", "launch-old"]);
  assert.deepEqual(buildTaskListProjection(nodes, "launch", { ...filters, sort: "created" }, [], "me").visibleTasks.map(t => t.id), ["launch-old", "launch-new"]);
  assert.equal(JSON.stringify(nodes), snapshot);
});
test("创建时间与最近更新时间独立倒序，未知时间置后且不重复任务", () => {
  const nodes = [node("old", { createdAt: "2026-09-05T10:00:00Z" }), node("unknown", { updatedAt: "导入" }), node("new", { updatedAt: "2026-09-07T10:00:00Z", createdAt: "2026-08-01T10:00:00Z" }), node("new")];
  const filters = { owner: "all", status: "all", tag: "all" };
  assert.deepEqual(buildTaskListProjection(nodes, "", filters, []).visibleTasks.map(t => t.id), ["new", "old", "unknown"]);
  assert.deepEqual(buildTaskListProjection(nodes, "", { ...filters, sort: "created" }, []).visibleTasks.map(t => t.id), ["old", "new", "unknown"]);
});
test("默认全部，显式完成条件与多标签 OR 筛选一致", () => {
  const nodes = [node("active", { labels: ["A"] }), node("done", { status: "已完成", labels: ["B"] }), node("cancelled", { status: "已取消" })];
  const filters = createInitialTaskListFilters("me");
  assert.equal(buildTaskListProjection(nodes, "", filters, []).visibleTasks.length, 3);
  assert.deepEqual(buildTaskListProjection(nodes, "", { ...filters, completion: "open" }, []).visibleTasks.map(t => t.id), ["active"]);
  assert.equal(buildTaskListProjection(nodes, "", { ...filters, completion: "all" }, []).visibleTasks.length, 3);
  assert.deepEqual(buildTaskListProjection(nodes, "", { ...filters, completion: "done" }, []).visibleTasks.map(t => t.id), ["done"]);
  assert.deepEqual(buildTaskListProjection(nodes, "", { ...filters, completion: "all", tags: ["A", "B"] }, []).visibleTasks.map(t => t.id), ["active", "done"]);
});
test("列表当天显示 24 小时时分，昨天保留时分，更早记录按年份显示日期", () => {
  const now = new Date(2026, 8, 17, 12);
  const label = (date: Date) => taskUpdatedLabel(date.toISOString(), now).label;
  assert.equal(label(new Date(2026, 8, 17, 11, 59, 50)), "11:59");
  assert.equal(label(new Date(2026, 8, 17, 9, 5)), "09:05");
  assert.equal(label(new Date(2026, 8, 17, 0)), "00:00");
  assert.equal(label(new Date(2026, 8, 16, 23, 50)), "昨天 23:50");
  assert.equal(label(new Date(2026, 8, 16, 8, 10)), "昨天 08:10");
  assert.equal(label(new Date(2026, 8, 15, 18)), "9/15");
  assert.equal(label(new Date(2025, 11, 31, 18)), "2025/12/31");
  const value = new Date(2026, 8, 17, 9, 5, 8).toISOString();
  assert.deepEqual(taskUpdatedLabel(value, now), { label: "09:05", title: "2026/09/17 09:05:08", dateTime: value });
});
test("日期边界按本地日历判断，跨年昨天仍保留时分，未来时间不显示负数", () => {
  const now = new Date(2027, 0, 1, 0, 5);
  assert.equal(taskUpdatedLabel(new Date(2026, 11, 31, 23, 58).toISOString(), now).label, "昨天 23:58");
  assert.equal(taskUpdatedLabel(new Date(2026, 11, 30, 23, 58).toISOString(), now).label, "2026/12/30");
  assert.equal(taskUpdatedLabel(new Date(2027, 0, 1, 0, 10).toISOString(), now).label, "00:10");
  assert.equal(taskUpdatedLabel(new Date(2027, 0, 2, 0, 10).toISOString(), now).label, "1/2");
});
test("旧演示时间固定参考日期，缺少时分不补零点，非法时间保持未知", () => {
  const now = new Date(2026, 8, 17, 12);
  assert.equal(taskUpdatedTime("20 分钟前", now), now.getTime() - 1200000);
  assert.equal(taskUpdatedTime("昨天 99:00", now), null);
  assert.equal(taskUpdatedTime("导入"), null);
  assert.equal(taskUpdatedLabel("2026-02-30T12:00:00Z", now).label, "时间未知");
  assert.equal(taskUpdatedLabel(" ", now).label, "时间未知");
  assert.equal(taskUpdatedLabel("今天 09:20", now, now).label, "09:20");
  assert.equal(taskUpdatedLabel("昨天 18:10", now, now).label, "昨天 18:10");
  assert.equal(taskUpdatedLabel("35 分钟前", now, now).label, "11:25");
  const tomorrow = new Date(2026, 8, 18, 12);
  assert.equal(taskUpdatedLabel("35 分钟前", tomorrow, now).label, "昨天 11:25");
  for (const value of ["今天", "2026-09-17"]) {
    const time = taskUpdatedLabel(value, now, now);
    assert.equal(time.label, "9/17");
    assert.match(time.title, /未记录时分/);
    assert.doesNotMatch(time.title, /00:00/);
  }
  assert.equal(taskUpdatedLabel("昨天", now, now).label, "9/16");
  assert.equal(taskUpdatedLabel("今天", now, now).dateTime, undefined);
  assert.equal(taskUpdatedLabel("2026-09-17", now).dateTime, "2026-09-17");
  assert.match(taskUpdatedLabel("今天", now, now).title, /未记录绝对时间/);
});
test("截止日按日历日计算，完成/取消和缺失年份不误报逾期", () => {
  const now = new Date(2026, 8, 7, 20);
  assert.deepEqual(taskDueLabel(node("due", { plannedEndOn: "2026-09-06" }), now), { label: "逾期 1 天", overdue: true });
  assert.equal(taskDueLabel(node("due", { plannedEndOn: "2026-09-07" }), now)?.label, "今天截止");
  assert.equal(taskDueLabel(node("done", { status: "已完成", plannedEndOn: "2026-09-01" }), now), null);
  assert.equal(taskDueLabel(node("legacy", { dueAt: "8 月 1 日" }), now)?.overdue, false);
  assert.equal(taskDueLabel(node("invalid", { plannedEndOn: "2026-02-31" }), now), null);
});
