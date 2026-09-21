import assert from "node:assert/strict";
import test from "node:test";
import { clearedTaskListConditions, createInitialTaskListFilters, normalizeTaskWorkspaceFilters, taskMatchesListFilters, type TaskListFilters } from "../src/components/taskListFilters.ts";
import { buildTaskListProjection } from "../src/lib/taskListProjection.ts";
import type { TaskNode } from "../src/data/workspaceNodes.ts";

const filters: TaskListFilters = { view: "all", owner: "all", status: "all", tag: "all" };
const task = (id: string, patch: Partial<TaskNode> = {}): TaskNode => ({
  id, name: id, kind: "task", parentId: "root", updatedAt: "2026-09-17", ownerId: "alice", status: "进行中", ...patch,
});
const now = new Date(2026, 8, 17, 12);

test("人员的我条件随当前用户解析，负责人和参与人分别匹配", () => {
  const nodes = [task("alice-owned", { participantIds: ["bob"] }), task("bob-owned", { ownerId: "bob", participantIds: ["alice"] })];
  const owned = { ...filters, ownerIsMe: true };
  const participating = { ...filters, participantIsMe: true };
  const ids = (condition: TaskListFilters, user: string) => buildTaskListProjection(nodes, "", condition, [], user).visibleTasks.map(item => item.id);
  assert.deepEqual(ids(owned, "alice"), ["alice-owned"]);
  assert.deepEqual(ids(owned, "bob"), ["bob-owned"]);
  assert.deepEqual(ids(participating, "alice"), ["bob-owned"]);
  assert.deepEqual(ids(participating, "bob"), ["alice-owned"]);
  assert.deepEqual(owned, { ...filters, ownerIsMe: true });
});

test("我与同维度的成员或空值取并集，跨维度继续取交集", () => {
  const nodes = [task("mine", { participantIds: ["alice"] }), task("colleague", { ownerId: "bob", participantIds: ["alice"] }), task("vacant", { ownerId: "", proposedOwnerId: "alice" }), task("other", { ownerId: "carol" })];
  const condition = { ...filters, ownerIsMe: true, ownerIds: ["bob"], includeUnassigned: true };
  const ids = (condition: TaskListFilters) => nodes.filter(item => taskMatchesListFilters(item, "", condition, "alice")).map(item => item.id);
  assert.deepEqual(ids(condition), ["mine", "colleague", "vacant"]);
  assert.deepEqual(ids({ ...condition, participantIsMe: true }), ["mine", "colleague"]);
  assert.deepEqual(ids({ ...condition, participantIsMe: true, includeNoParticipants: true }), ["mine", "colleague", "vacant"]);
  assert.deepEqual(ids({ ...filters, ownerIsMe: true }), ["mine"]);
});

test("我条件缺少当前用户时不放宽筛选，清除条件会移除我", () => {
  for (const condition of [{ ...filters, ownerIsMe: true }, { ...filters, participantIsMe: true }]) {
    for (const user of ["", " ", "all"]) assert.equal(taskMatchesListFilters(task("match", { participantIds: ["alice"] }), "", condition, user), false);
  }
  const cleared = { ...filters, ownerIsMe: true, participantIsMe: true, ...clearedTaskListConditions };
  assert.equal(taskMatchesListFilters(task("any"), "", cleared, "bob"), true);
});

test("不同维度取交集，同一维度的人员、状态和标签取并集", () => {
  const nodes = [
    task("match", { participantIds: ["bob"], createdBy: "carol", labels: ["发布"] }),
    task("other-owner", { ownerId: "carol", participantIds: ["bob"], createdBy: "carol", labels: ["发布"] }),
    task("other-member", { participantIds: ["carol"], createdBy: "carol", labels: ["发布"] }),
    task("other-creator", { participantIds: ["bob"], createdBy: "bob", labels: ["发布"] }),
    task("other-status", { status: "已完成", participantIds: ["bob"], createdBy: "carol", labels: ["发布"] }),
    task("other-tag", { participantIds: ["bob"], createdBy: "carol", labels: ["复盘"] }),
  ];
  const result = buildTaskListProjection(nodes, "", { ...filters, ownerIds: ["alice", "bob"], participantIds: ["bob"], creatorIds: ["carol"], statuses: ["进行中", "待开始"], tags: ["发布", "审核"] }, []);
  assert.deepEqual(result.visibleTasks.map(item => item.id), ["match"]);
});

test("人员空值可与已选成员并选，拟负责人不会匹配正式负责人", () => {
  const nodes = [task("assigned"), task("vacant", { ownerId: "", proposedOwnerId: "alice" }), task("other", { ownerId: "bob" })];
  assert.deepEqual(nodes.filter(item => taskMatchesListFilters(item, "", { ...filters, ownerIds: ["alice"] })).map(item => item.id), ["assigned"]);
  assert.deepEqual(nodes.filter(item => taskMatchesListFilters(item, "", { ...filters, ownerIds: ["alice"], includeUnassigned: true })).map(item => item.id), ["assigned", "vacant"]);
  assert.equal(taskMatchesListFilters(task("member", { participantIds: ["bob"] }), "", { ...filters, includeNoParticipants: true }), false);
  assert.equal(taskMatchesListFilters(task("creator", { createdBy: "bob" }), "", { ...filters, includeUnknownCreator: true }), false);
});

test("人员筛选继续受当前我负责/我参与视图约束", () => {
  const item = task("team", { participantIds: ["me"] });
  assert.equal(taskMatchesListFilters(item, "", { ...filters, view: "participating", ownerIds: ["alice"] }, "me"), true);
  assert.equal(taskMatchesListFilters(item, "", { ...filters, view: "owned", ownerIds: ["alice"] }, "me"), false);
});

test("移除标题与目标筛选后，旧条件不再隐藏任务，列表搜索仍有效", () => {
  const item = task("Launch", { goal: "Review VIDEO assets" });
  const legacyFilters = { ...filters, text: "budget" };
  assert.equal(taskMatchesListFilters(item, "launch", legacyFilters), true);
  assert.equal(taskMatchesListFilters(item, "other", legacyFilters), false);
  assert.equal(taskMatchesListFilters(item, "", legacyFilters), true);
});

test("截止日期范围包含两端，未知日期不会混入确定日期结果", () => {
  const condition: TaskListFilters = { ...filters, deadline: { preset: "custom", from: "2026-09-17", to: "2026-09-20" } };
  const nodes = [task("start", { plannedEndOn: "2026-09-17" }), task("end", { plannedEndOn: "2026-09-20" }), task("later", { plannedEndOn: "2026-09-21" }), task("legacy", { dueAt: "9 月 18 日" }), task("invalid", { plannedEndOn: "2026-02-30" })];
  assert.deepEqual(nodes.filter(item => taskMatchesListFilters(item, "", condition, "me", now)).map(item => item.id), ["start", "end"]);
  assert.deepEqual(nodes.filter(item => taskMatchesListFilters(item, "", { ...filters, deadline: { preset: "unknown" } }, "me", now)).map(item => item.id), ["legacy", "invalid"]);
});

test("相对日期使用本地日历，逾期只匹配尚未结束的任务", () => {
  assert.equal(taskMatchesListFilters(task("today", { plannedEndOn: "2026-09-17" }), "", { ...filters, deadline: { preset: "today" } }, "me", now), true);
  assert.equal(taskMatchesListFilters(task("yesterday", { plannedEndOn: "2026-09-16" }), "", { ...filters, deadline: { preset: "today" } }, "me", now), false);
  for (const status of ["进行中", "已完成", "已取消"] as const) {
    assert.equal(taskMatchesListFilters(task(status, { status, plannedEndOn: "2026-09-16" }), "", { ...filters, deadline: { preset: "overdue" } }, "me", now), status === "进行中");
  }
  assert.equal(taskMatchesListFilters(task("sunday", { plannedEndOn: "2026-09-20" }), "", { ...filters, deadline: { preset: "this-week" } }, "me", now), true);
  assert.equal(taskMatchesListFilters(task("monday", { plannedEndOn: "2026-09-21" }), "", { ...filters, deadline: { preset: "this-week" } }, "me", now), false);
});

test("创建日期按当地日期过滤，缺失创建日期不借用更新时间", () => {
  const timestamp = new Date(2026, 8, 17, 23, 59).toISOString();
  const condition: TaskListFilters = { ...filters, created: { preset: "today" } };
  assert.equal(taskMatchesListFilters(task("created", { createdAt: timestamp }), "", condition, "me", now), true);
  assert.equal(taskMatchesListFilters(task("missing"), "", condition, "me", now), false);
  assert.equal(taskMatchesListFilters(task("missing"), "", { ...filters, created: { preset: "unknown" } }, "me", now), true);
});


test("列表规范化清理旧人员条件，保留状态、标签、日期和搜索", () => {
  const selected: TaskListFilters = { ...filters, view: "owned", owner: "alice", completion: "open", ownerIds: ["bob"], participantIsMe: true, statuses: ["已完成"], tags: ["发布"], deadline: { preset: "custom", from: "2026-09-17", to: "2026-09-20" }, sort: "created" };
  const before = structuredClone(selected);
  const normalized = normalizeTaskWorkspaceFilters(selected);
  const item = task("发布", { ownerId: "bob", participantIds: ["alice"], status: "已完成", labels: ["发布"], plannedEndOn: "2026-09-18" });
  assert.equal(taskMatchesListFilters(item, "发布", normalized, "alice", now), true);
  assert.equal(taskMatchesListFilters(item, "其他", normalized, "alice", now), false);
  for (const field of ["statuses", "tags", "deadline", "sort"] as const) assert.deepEqual(normalized[field], selected[field]);
  assert.deepEqual(normalized.ownerIds, []);
  assert.equal(normalized.participantIsMe, false);
  assert.equal(normalized.scope, "all");
  assert.deepEqual(selected, before);
  assert.deepEqual(normalizeTaskWorkspaceFilters({ ...filters, completion: "done" }).statuses, ["已完成"]);
  assert.deepEqual(normalizeTaskWorkspaceFilters({ ...filters, completion: "open", statuses: [] }).statuses, []);
});

test("初始化及切团队恢复全部，清除条件保留排序与独立搜索", () => {
  const nodes = [task("发布本人"), task("发布他人", { ownerId: "bob", status: "已完成" }), task("其他任务", { ownerId: "" })];
  for (const user of ["alice", "bob"]) {
    assert.equal(buildTaskListProjection(nodes, "", createInitialTaskListFilters(user), [], user).visibleTasks.length, 3);
  }
  const selected: TaskListFilters = { ...filters, view: "owned", owner: "alice", ownerIsMe: true, participantIsMe: true, statuses: ["进行中"], tags: ["发布"], deadline: { preset: "today" }, sort: "created" };
  const cleared = { ...selected, ...clearedTaskListConditions };
  assert.equal(buildTaskListProjection(nodes, "", cleared, [], "alice").visibleTasks.length, 3);
  assert.equal(buildTaskListProjection(nodes, "发布", cleared, [], "alice").visibleTasks.length, 2);
  assert.equal(cleared.sort, "created");
});


test("任务列表忽略已移除的创建人条件，创建日期及任务创建人数据保持不变", () => {
  const createdAt = new Date(2026, 8, 17, 10).toISOString();
  const nodes = [task("alice-created", { createdBy: "alice", createdAt }), task("bob-created", { createdBy: "bob", createdAt }), task("unknown-created", { createdAt }), task("yesterday", { createdBy: "alice", createdAt: new Date(2026, 8, 16, 10).toISOString() })];
  for (const legacy of [{ creatorIds: ["alice"] }, { includeUnknownCreator: true }, { creatorIds: ["missing"], includeUnknownCreator: true }]) {
    const source: TaskListFilters = { ...filters, ...legacy, created: { preset: "today" } };
    const before = structuredClone(source);
    const normalized = normalizeTaskWorkspaceFilters(source);
    assert.deepEqual(normalized.creatorIds, []);
    assert.equal(normalized.includeUnknownCreator, false);
    assert.deepEqual(nodes.filter(item => taskMatchesListFilters(item, "", normalized, "alice", now)).map(item => item.id), ["alice-created", "bob-created", "unknown-created"]);
    assert.deepEqual(source, before);
    assert.equal(nodes[0].createdBy, "alice");
    assert.equal(nodes[1].createdBy, "bob");
  }
});


test("任务范围按当前用户匹配负责或参与，切换只有一种范围", () => {
  const nodes = [task("owned", { participantIds: ["bob"] }), task("participating", { ownerId: "bob", participantIds: ["alice"] }), task("both", { participantIds: ["alice"] }), task("unassigned", { ownerId: "", createdBy: "alice" })];
  const visible = (scope: TaskListFilters["scope"], user: string) => buildTaskListProjection(nodes, "", normalizeTaskWorkspaceFilters({ ...filters, scope }), [], user).visibleTasks.map(item => item.id);
  assert.deepEqual(visible("all", "alice"), ["both", "owned", "participating", "unassigned"]);
  assert.deepEqual(visible("owned", "alice"), ["both", "owned"]);
  assert.deepEqual(visible("participating", "alice"), ["both", "participating"]);
  assert.deepEqual(visible("owned", "bob"), ["participating"]);
  assert.deepEqual(visible("participating", "bob"), ["owned"]);
  for (const user of ["", " ", "all"]) {
    assert.deepEqual(visible("owned", user), []);
    assert.deepEqual(visible("participating", user), []);
    assert.equal(visible("all", user).length, 4);
  }
});

test("新范围与状态标签日期搜索同时匹配，全部仅清除范围限制", () => {
  const nodes = [task("发布本人", { labels: ["发布"], plannedEndOn: "2026-09-17" }), task("发布他人", { ownerId: "bob", labels: ["发布"], plannedEndOn: "2026-09-17" }), task("其他标签", { labels: ["审核"], plannedEndOn: "2026-09-17" }), task("发布已完成", { status: "已完成", labels: ["发布"], plannedEndOn: "2026-09-17" }), task("发布明天", { labels: ["发布"], plannedEndOn: "2026-09-18" })];
  const selected: TaskListFilters = { ...filters, scope: "owned", statuses: ["进行中"], tags: ["发布"], deadline: { preset: "today" }, sort: "created" };
  const visible = (condition: TaskListFilters) => nodes.filter(item => taskMatchesListFilters(item, "发布", normalizeTaskWorkspaceFilters(condition), "alice", now)).map(item => item.id);
  assert.deepEqual(visible(selected), ["发布本人"]);
  assert.deepEqual(visible({ ...selected, scope: "all" }), ["发布本人", "发布他人"]);
  const cleared = { ...selected, ...clearedTaskListConditions };
  assert.deepEqual(visible(cleared), ["发布本人", "发布他人", "发布已完成", "发布明天"]);
  assert.equal(cleared.sort, "created");
  assert.equal(cleared.scope, "all");
});

test("旧人员条件只迁移单一的我，其余清空，显式范围不会被残留字段叠加", () => {
  const cases: Array<[Partial<TaskListFilters>, TaskListFilters["scope"]]> = [
    [{ ownerIsMe: true }, "owned"], [{ participantIsMe: true }, "participating"],
    [{ ownerIsMe: true, participantIsMe: true }, "all"], [{ ownerIsMe: true, ownerIds: ["bob"] }, "all"],
    [{ participantIsMe: true, participantIds: ["bob"] }, "all"], [{ includeUnassigned: true }, "all"],
    [{ includeNoParticipants: true }, "all"], [{ creatorIds: ["alice"] }, "all"], [{ includeUnknownCreator: true }, "all"],
    [{ scope: "participating", ownerIsMe: true, ownerIds: ["missing"], includeNoParticipants: true }, "participating"],
    [{ scope: "all", ownerIsMe: true }, "all"],
  ];
  for (const [legacy, expected] of cases) {
    const source = { ...filters, ...legacy };
    const before = structuredClone(source);
    const normalized = normalizeTaskWorkspaceFilters(source);
    assert.equal(normalized.scope, expected);
    for (const key of ["ownerIds", "participantIds", "creatorIds"] as const) assert.deepEqual(normalized[key], []);
    for (const key of ["ownerIsMe", "participantIsMe", "includeUnassigned", "includeNoParticipants", "includeUnknownCreator"] as const) assert.equal(normalized[key], false);
    assert.deepEqual(source, before);
    assert.deepEqual(normalizeTaskWorkspaceFilters(normalized), normalized);
  }
  assert.equal(taskMatchesListFilters(task("match", { ownerId: "bob", participantIds: ["alice"] }), "", { ...filters, scope: "participating", ownerIds: ["missing"], includeNoParticipants: true }, "alice"), true);
});
