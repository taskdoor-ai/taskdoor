import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTaskProgressBurnUp,
  getTaskProgressBurnUp,
  getTaskProgressEvents,
  taskProgressScenarioIds,
  validateTaskProgressScenario,
  type TaskProgressEvent,
  type TaskProgressScenario,
} from "../src/data/taskProgressExamples.ts";
import { getTaskBurnUpModel } from "../src/lib/taskBurnUp.ts";
import { teamWorkspaceScenarios } from "../src/data/teamWorkspaceScenarios.ts";
import type { TaskNode } from "../src/data/workspaceNodes.ts";

const byDay = (parentTaskId: string) => new Map(
  getTaskProgressBurnUp(parentTaskId)!.points.map((point) => [point.at, point]),
);

test("六个父任务使用独立有效账本，事件 ID、来源和叶子边界明确", () => {
  assert.deepEqual(taskProgressScenarioIds, [
    "fragrance-creator-wrapup",
    "weekly-retro-notes",
    "platform-mobile-release",
    "factory-pilot-ramp",
    "service-incident-recovery",
    "ccx-creator-pool-governance",
  ]);
  const allEvents = taskProgressScenarioIds.flatMap((parentTaskId) => {
    assert.doesNotThrow(() => getTaskProgressBurnUp(parentTaskId));
    const events = getTaskProgressEvents(parentTaskId);
    assert.ok(events.length > 0);
    assert.ok(events.every((event) => event.parentTaskId === parentTaskId));
    assert.ok(events.every((event) => event.taskId !== parentTaskId));
    assert.ok(events.every((event) => event.source === "example" && event.note.trim().length > 0 && !event.note.startsWith("示例：")));
    assert.ok(events.every((event, index) => index === 0 || Date.parse(event.at) >= Date.parse(events[index - 1].at)));
    return events;
  });
  assert.equal(new Set(allEvents.map((event) => event.id)).size, allEvents.length);
  assert.ok(allEvents.some((event) => event.kind === "estimate-revised"));
  assert.ok(allEvents.some((event) => event.kind === "reopened"));
  assert.ok(allEvents.some((event) => event.kind === "scope-removed"));
  assert.ok(allEvents.some((event) => event.ewdHours === null));
});

test("团队任务、成员、当前 EWD 与账本终点一致，历史不越过各团队数据截止时间", () => {
  for (const team of teamWorkspaceScenarios.filter((item) => item.id !== "creator-commerce")) {
    const tasks = team.nodes.filter((node): node is TaskNode => node.kind === "task");
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const memberIds = new Set(team.members.map((member) => member.id));
    const parentIds = new Set(tasks.flatMap((task) => task.parentTaskId ? [task.parentTaskId] : []));
    const events = getTaskProgressEvents(team.mainTaskId);
    for (const event of events) {
      const leaf = taskById.get(event.taskId);
      assert.ok(leaf, `${event.id} 应引用 ${team.id} 内任务`);
      assert.equal(parentIds.has(event.taskId), false, `${event.taskId} 必须是末梢叶子`);
      assert.equal(event.taskTitle, leaf.name);
      assert.ok(memberIds.has(event.actor), `${event.actor} 应属于 ${team.id}`);
      assert.ok(Date.parse(event.at) <= Date.parse(team.asOf), `${event.id} 不能成为未来历史`);
    }
    const leafIds = new Set(events.filter((event) => event.kind === "scope-added").map((event) => event.taskId));
    const currentLeaves = tasks.filter((task) => leafIds.has(task.id));
    const latest = getTaskProgressBurnUp(team.mainTaskId)!.points.at(-1)!;
    const currentScope = currentLeaves.reduce((total, task) => total + task.effortEstimate!.minutes! / 60, 0);
    const currentAccepted = currentLeaves
      .filter((task) => task.status === "已完成")
      .reduce((total, task) => total + task.effortEstimate!.minutes! / 60, 0);
    assert.equal(latest.scopeHours, currentScope);
    assert.equal(latest.completedHours, currentAccepted);
    assert.equal(latest.estimatedLeafCount, currentLeaves.length);
    assert.equal(latest.totalLeafCount, currentLeaves.length);
    assert.ok(latest.at <= team.asOf.slice(0, 10));
  }
});

test("平台发布账本区分增项、改估、重开和移出，已验收叶子改估按事件时点生效", () => {
  const points = byDay("platform-mobile-release");
  assert.deepEqual(
    ["2026-08-25", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01"]
      .map((day) => {
        const point = points.get(day)!;
        return [day, point.scopeHours, point.completedHours, point.estimatedLeafCount, point.totalLeafCount];
      }),
    [
      ["2026-08-25", 44, 0, 5, 5],
      ["2026-08-27", 46, 0, 5, 5],
      ["2026-08-28", 52, 0, 6, 6],
      ["2026-08-29", 52, 8, 6, 6],
      ["2026-08-30", 42, 15, 5, 5],
      ["2026-08-31", 42, 8, 5, 5],
      ["2026-09-01", 52, 8, 6, 6],
    ],
  );
  assert.match(points.get("2026-08-27")!.note!, /改估，不是新增任务/);
  assert.match(points.get("2026-08-30")!.note!, /移出/);
  assert.match(points.get("2026-09-01")!.note!, /重新纳入/);
});

test("试产账本保留范围和完成量下降，不用当前完成状态抹平历史", () => {
  const points = byDay("factory-pilot-ramp");
  assert.deepEqual(
    ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01"]
      .map((day) => {
        const point = points.get(day)!;
        return [day, point.scopeHours, point.completedHours];
      }),
    [
      ["2026-08-24", 78, 0],
      ["2026-08-25", 78, 10],
      ["2026-08-26", 78, 0],
      ["2026-08-27", 80, 0],
      ["2026-08-28", 69, 0],
      ["2026-08-29", 72, 0],
      ["2026-08-30", 83, 12],
      ["2026-08-31", 83, 12],
      ["2026-09-01", 83, 12],
    ],
  );
  assert.deepEqual(points.get("2026-09-01") && {
    estimated: points.get("2026-09-01")!.estimatedLeafCount,
    total: points.get("2026-09-01")!.totalLeafCount,
  }, { estimated: 7, total: 7 });
});

test("事故恢复账本把缺估保留为 null，后续估算只影响当日及以后且覆盖完整后才计算比例", () => {
  const history = getTaskProgressBurnUp("service-incident-recovery")!;
  const points = new Map(history.points.map((point) => [point.at, point]));
  assert.deepEqual(points.get("2026-09-01"), {
    at: "2026-09-01",
    scopeHours: 58,
    completedHours: 4,
    estimatedLeafCount: 6,
    totalLeafCount: 6,
    note: "新增子任务「核对 SLA 与补偿适用范围」，估算 8 h。 新增子任务「更新同步积压处置手册」，估算 9 h。 长尾租户对账出现两笔差异，撤回数据修复验收并重开。",
  });
  assert.deepEqual(points.get("2026-08-30"), {
    at: "2026-08-30",
    scopeHours: null,
    completedHours: null,
    estimatedLeafCount: 0,
    totalLeafCount: 2,
    note: "初始范围纳入「执行同步流量削峰与租户隔离」，尚缺估算。 初始范围纳入「修复受影响同步状态记录」，尚缺估算。",
  });
  assert.deepEqual(
    ["2026-08-31", "2026-09-01"]
      .map((day) => {
        const point = points.get(day)!;
        return [day, point.scopeHours, point.completedHours, point.estimatedLeafCount, point.totalLeafCount];
      }),
    [
      ["2026-08-31", 41, 19, 4, 4],
      ["2026-09-01", 58, 4, 6, 6],
    ],
  );
  const early = getTaskBurnUpModel({ source: "example", points: history.points.slice(0, 1) });
  assert.equal(early.state, "single");
  assert.equal(early.progressRatio, null);
  const final = getTaskBurnUpModel(history);
  assert.equal(final.state, "partial", "历史中的缺估快照仍需保留，因此整条序列不能冒充全程完整");
  assert.equal(final.progressRatio, 4 / 58, "最新覆盖完整时可按 4h / 58h 报当前验收比例");
});

test("单点缺估只形成一个未知快照；无账本任务和叶子不生成曲线或占位", () => {
  const event: TaskProgressEvent = {
    id: "single-added",
    source: "example",
    taskId: "single-leaf",
    taskTitle: "待确认研究边界",
    parentTaskId: "single-parent",
    at: "2026-09-01T09:00:00+08:00",
    kind: "scope-added",
    isBaseline: true,
    ewdHours: null,
    note: "初始范围纳入待确认研究边界，尚缺估算。",
    actor: "研究负责人",
  };
  const history = buildTaskProgressBurnUp({ parentTaskId: "single-parent", snapshotDates: ["2026-09-01"], events: [event] });
  assert.deepEqual(history.points.map((point) => [point.scopeHours, point.completedHours, point.estimatedLeafCount, point.totalLeafCount]), [[null, null, 0, 1]]);
  const model = getTaskBurnUpModel(history);
  assert.equal(model.state, "single");
  assert.equal(model.progressRatio, null);
  assert.equal(model.scopePath, "");
  assert.equal(model.completedPath, "");
  for (const taskId of ["single-leaf", "platform-api-contract", "unknown-parent", "__proto__"]) {
    assert.equal(getTaskProgressBurnUp(taskId), undefined);
  }
  assert.deepEqual(getTaskProgressEvents("unknown-parent"), []);
});

test("账本校验拒绝非法日期、父级重复累计、范围外迁移和静默丢弃", () => {
  const base: TaskProgressEvent = {
    id: "bad-event",
    source: "example",
    taskId: "bad-leaf",
    taskTitle: "异常叶子",
    parentTaskId: "bad-parent",
    at: "2026-09-01T09:00:00+08:00",
    kind: "accepted",
    ewdHours: 3,
    note: "错误事件。",
    actor: "测试者",
  };
  const malformed: TaskProgressScenario = {
    parentTaskId: "bad-parent",
    snapshotDates: ["2026-09-01", "2026-09-01"],
    events: [
      base,
      { ...base, taskId: "bad-parent", at: "2026-02-30T24:00:00+08:00", ewdHours: -1, note: "   " },
    ],
  };
  const issues = validateTaskProgressScenario(malformed);
  assert.ok(issues.some((issue) => issue.includes("快照日期必须严格升序")));
  assert.ok(issues.some((issue) => issue.includes("事件 ID 重复")));
  assert.ok(issues.some((issue) => issue.includes("事件必须指向叶子")));
  assert.ok(issues.some((issue) => issue.includes("事件时间无效")));
  assert.ok(issues.some((issue) => issue.includes("事件 EWD 无效")));
  assert.ok(issues.some((issue) => issue.includes("事件说明不能为空")));
  assert.ok(issues.some((issue) => issue.includes("范围外验收")));
  assert.throws(() => buildTaskProgressBurnUp(malformed), /Invalid task progress scenario/);
});

test("每次读取返回独立副本，消费者修改不会污染其他团队账本或过去快照", () => {
  const baselineEvents = getTaskProgressEvents("service-incident-recovery");
  const baselineHistory = getTaskProgressBurnUp("service-incident-recovery")!;
  const copiedEvents = getTaskProgressEvents("service-incident-recovery");
  const copiedHistory = getTaskProgressBurnUp("service-incident-recovery")!;
  copiedEvents[0].ewdHours = 999;
  copiedEvents[0].note = "消费者修改";
  copiedHistory.points[0].scopeHours = 999;
  assert.deepEqual(getTaskProgressEvents("service-incident-recovery"), baselineEvents);
  assert.deepEqual(getTaskProgressBurnUp("service-incident-recovery"), baselineHistory);
  assert.notDeepEqual(getTaskProgressBurnUp("platform-mobile-release"), baselineHistory);
});
