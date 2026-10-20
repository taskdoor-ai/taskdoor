import assert from "node:assert/strict";
import test from "node:test";
import { taskUpdatedTime, taskUpdatedLabel, taskDueLabel } from "../src/features/tasks/lib/task-list-presentation.ts";
import { buildTaskListProjection } from "../src/features/tasks/lib/task-list-projection.ts";
import { partitionPinnedTasks } from "../src/features/tasks/lib/task-pins.ts";
import { taskResultSelection } from "../src/features/tasks/lib/task-result-selection.ts";
import { createInitialTaskListFilters } from "../src/features/tasks/components/task-list-filters.ts";
import { normalizeWorkspaceNodes } from "../src/ai/mock/data/workspaceNodes.ts";
import { type TaskNode } from "../src/shared/model/task-model.ts";
import type { TaskListFilters } from "../src/features/tasks/components/task-list-filters.ts";
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
test("最近更新将较新的已完成任务置底，两组各按原更新时间排列，取消任务不额外后置", () => {
  const nodes = [
    node("done-new", { name: "完成创建页三栏改版", status: "已完成", updatedAt: "2026-10-20T12:00:00Z" }),
    node("active-old", { name: "讨论附件显示缩略图", updatedAt: "2026-10-18T10:00:00Z" }),
    node("done-old", { name: "文件树仅展开和收起", status: "已完成", updatedAt: "2026-10-16T10:00:00Z" }),
    node("active-unknown", { name: "核对历史反馈", updatedAt: "导入" }),
    node("blocked", { name: "等待需求范围确认", status: "已阻塞", updatedAt: "2026-10-19T09:00:00Z" }),
    node("cancelled", { name: "撤销旧版文件区方案", status: "已取消", updatedAt: "2026-10-20T11:00:00Z" }),
  ];
  const before = JSON.stringify(nodes);
  const result = buildTaskListProjection(nodes, "", createInitialTaskListFilters("me"), []);
  assert.deepEqual(result.visibleTasks.map(task => task.id), ["cancelled", "blocked", "active-old", "active-unknown", "done-new", "done-old"]);
  assert.equal(JSON.stringify(nodes), before);
});
test("创建时间排序保持纯时间顺序，任务重开后回到最近更新的未完成组并保留当前选择", () => {
  const nodes = [
    node("done", { name: "确认附件缩略图交付", status: "已完成", updatedAt: "2026-10-20T12:00:00Z", createdAt: "2026-10-20T09:00:00Z" }),
    node("active", { name: "调整文件区方案", updatedAt: "2026-10-19T12:00:00Z", createdAt: "2026-10-19T09:00:00Z" }),
  ];
  const filters = createInitialTaskListFilters("me");
  assert.deepEqual(buildTaskListProjection(nodes, "", { ...filters, sort: "created" }, []).visibleTasks.map(task => task.id), ["done", "active"]);
  const before = buildTaskListProjection(nodes, "", filters, []).visibleTasks.map(task => task.id);
  assert.deepEqual(before, ["active", "done"]);
  assert.equal(taskResultSelection(before, "done"), "done");
  const reopened = nodes.map(task => task.id === "done" ? { ...task, status: "进行中" as const } : task);
  const after = buildTaskListProjection(reopened, "", filters, []).visibleTasks.map(task => task.id);
  assert.deepEqual(after, ["done", "active"]);
  assert.equal(taskResultSelection(after, "done"), "done");
});
test("最近更新的完成后置保持搜索筛选与置顶独立分组", () => {
  const nodes = [
    node("pinned-done", { name: "附件缩略图交付", status: "已完成", labels: ["协作"], updatedAt: "2026-10-20T12:00:00Z" }),
    node("regular-done", { name: "附件预览交付", status: "已完成", labels: ["协作"], updatedAt: "2026-10-20T11:00:00Z" }),
    node("regular-active", { name: "附件预览改版", labels: ["协作"], updatedAt: "2026-10-19T10:00:00Z" }),
    node("pinned-active", { name: "附件缩略图改版", labels: ["协作"], updatedAt: "2026-10-18T10:00:00Z" }),
    node("other-owner", { name: "附件规范", labels: ["协作"], ownerId: "other" }),
    node("other-tag", { name: "附件整理", labels: ["文件"] }),
    node("other-query", { name: "文件区改版", labels: ["协作"] }),
  ];
  const filters: TaskListFilters = { ...createInitialTaskListFilters("me"), scope: "owned", tags: ["协作"], sort: "recent" };
  const visible = buildTaskListProjection(nodes, "附件", filters, [], "me").visibleTasks;
  const { pinned, unpinned } = partitionPinnedTasks(visible, ["pinned-done", "pinned-active"]);
  assert.deepEqual(pinned.map(task => task.id), ["pinned-active", "pinned-done"]);
  assert.deepEqual(unpinned.map(task => task.id), ["regular-active", "regular-done"]);
  assert.deepEqual([...pinned, ...unpinned].map(task => task.id), ["pinned-active", "pinned-done", "regular-active", "regular-done"]);
  assert.deepEqual(buildTaskListProjection(nodes, "附件", { ...filters, statuses: ["已完成"] }, [], "me").visibleTasks.map(task => task.id), ["pinned-done", "regular-done"]);
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
test("列表时间按界面语言格式化日期时分与相对时间", () => {
  const now = new Date(2026, 8, 17, 12);
  const label = (date: Date) => taskUpdatedLabel(date.toISOString(), now).label;
  assert.equal(label(new Date(2026, 8, 17, 11, 59, 50)), "刚刚");
  assert.equal(label(new Date(2026, 8, 17, 9, 5)), "2小时前");
  assert.equal(label(new Date(2026, 8, 16, 8, 10)), "昨天 08:10");
  assert.equal(label(new Date(2026, 8, 15, 18)), "9月15日 18:00");
  assert.equal(label(new Date(2025, 11, 31, 18)), "2025年12月31日 18:00");
  const value = new Date(2026, 8, 17, 9, 5, 8).toISOString();
  assert.deepEqual(taskUpdatedLabel(value, now), { label: "2小时前", title: "2026年9月17日 09:05", dateTime: value });
  assert.equal(taskUpdatedLabel(value, now, now, "en").label, "2 hours ago");
  assert.equal(taskUpdatedLabel(new Date(2026, 8, 15, 18).toISOString(), now, now, "en").label, "Sep 15, 6:00 PM");
});
test("跨年与未来记录保留真实年份，未来同年记录不显示负相对时间", () => {
  const now = new Date(2027, 0, 1, 0, 5);
  assert.equal(taskUpdatedLabel(new Date(2026, 11, 31, 23, 58).toISOString(), now).label, "7分钟前");
  assert.equal(taskUpdatedLabel(new Date(2026, 11, 30, 23, 58).toISOString(), now).label, "2026年12月30日 23:58");
  assert.equal(taskUpdatedLabel(new Date(2027, 0, 1, 0, 10).toISOString(), now).label, "1月1日 00:10");
  assert.equal(taskUpdatedLabel(new Date(2027, 0, 2, 0, 10).toISOString(), now).label, "1月2日 00:10");
});
test("旧演示时间仅转换文案，不补绝对时间；排序参考和非法值保持", () => {
  const now = new Date(2026, 8, 17, 12);
  assert.equal(taskUpdatedTime("20 分钟前", now), now.getTime() - 1200000);
  assert.equal(taskUpdatedTime("昨天 99:00", now), null);
  assert.equal(taskUpdatedTime("导入"), null);
  assert.equal(taskUpdatedLabel("2026-02-30T12:00:00Z", now).label, "时间未知");
  assert.equal(taskUpdatedLabel(" ", now).label, "时间未知");
  assert.equal(taskUpdatedLabel("今天 09:20", now, now).label, "今天 09:20");
  assert.equal(taskUpdatedLabel("昨天 18:10", now, now).label, "昨天 18:10");
  assert.equal(taskUpdatedLabel("35 分钟前", now, now).label, "35分钟前");
  assert.equal(taskUpdatedLabel("今天", now, now).label, "今天");
  assert.equal(taskUpdatedLabel("昨天", now, now).label, "昨天");
  assert.equal(taskUpdatedLabel("今天", now, now).dateTime, undefined);
  const dateOnly = taskUpdatedLabel("2026-09-17", now);
  assert.equal(dateOnly.label, "9月17日");
  assert.equal(dateOnly.dateTime, "2026-09-17");
  assert.match(dateOnly.title, /2026年9月17日.*未记录时分/);
  assert.doesNotMatch(dateOnly.title, /AM|PM/);
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
