import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { taskCalendarDate, taskCreationDay, taskScheduleError } from "../src/features/tasks/lib/task-schedule.ts";
import { taskDueLabel } from "../src/features/tasks/lib/task-list-presentation.ts";
import { taskMatchesListFilters, type TaskListFilters } from "../src/features/tasks/components/task-list-filters.ts";
import { createWorkspaceTasksFromDraft } from "../src/features/tasks/lib/workspace-task-creation.ts";
import { prepareCreatedTeam } from "../src/features/members/lib/team-limits.ts";
import { initialPersonalCenterState, isPersonalCenterState, loadPersonalCenterDirectory, personalCenterStorageKey } from "../src/ai/mock/data/memberProfiles.ts";
import { getTaskProgressDisplay } from "../src/features/tasks/lib/task-progress-display.ts";
import { getTaskProgressChart, getTaskProgressComparison, type TaskProgressComparisonSeries } from "../src/features/tasks/lib/task-progress-comparison.ts";
import type { TaskNode } from "../src/shared/model/task-model.ts";
import { getTeamTimeZone } from "../src/shared/lib/team-time-zone.ts";
import { createOnboardingPreview, transitionOnboarding } from "../src/features/auth/lib/onboarding-preview.ts";
import { prepareOnboardingWorkspace } from "../src/features/auth/lib/onboarding-workspace.ts";
import { localizeOnboardingMessage } from "../src/features/auth/i18n/onboarding-messages.ts";
import { TeamTimeZoneContext } from "../src/shared/lib/useTeamTimeZone.ts";
import { TaskDueDatePicker } from "../src/features/tasks/components/TaskDueDatePicker.tsx";
import { createCreationForm } from "../src/features/tasks/lib/task-creation-form.ts";
import { createDraftTaskAiContext } from "../src/features/tasks/lib/task-ai-adjustment-adapters.ts";
import { buildTaskAiAdjustment } from "../src/ai/mock/lib/taskAiAdjustment.ts";
(globalThis as typeof globalThis & { React: typeof React }).React = React;

const filters: TaskListFilters = { owner: "all", status: "all", tag: "all" };
const task = (patch: Partial<TaskNode> = {}): TaskNode => ({ id: "calendar-task", kind: "task", parentId: null, name: "日期任务", ownerId: "me", status: "进行中", updatedAt: "2026-09-20T00:00:00Z", ...patch });

function inDeviceZone(zone: string, check: () => void) {
  const previous = process.env.TZ;
  process.env.TZ = zone;
  try { check(); }
  finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
}

test("同一团队的今天、逾期和创建日不随成员设备跨日", () => {
  const now = new Date("2026-09-19T17:00:00Z");
  for (const device of ["UTC", "America/Los_Angeles", "Pacific/Kiritimati"]) inDeviceZone(device, () => {
    const deadline = task({ plannedEndOn: "2026-09-20" });
    assert.equal(taskMatchesListFilters(deadline, "", { ...filters, deadline: { preset: "today" } }, "me", now, "Asia/Shanghai"), true);
    assert.equal(taskMatchesListFilters(deadline, "", { ...filters, deadline: { preset: "overdue" } }, "me", now, "Asia/Shanghai"), false);
    assert.equal(taskMatchesListFilters(task({ createdAt: now.toISOString() }), "", { ...filters, created: { preset: "today" } }, "me", now, "Asia/Shanghai"), true);
    assert.equal(taskCreationDay(now, "Asia/Shanghai"), "2026-09-20");
    assert.deepEqual(taskDueLabel(deadline, now, "Asia/Shanghai"), { label: "今天截止", overdue: false });
  });
});

test("本周边界取团队的周一，而不是设备仍在周日", () => {
  inDeviceZone("America/Los_Angeles", () => {
    const now = new Date("2026-09-20T17:00:00Z");
    const match = (day: string) => taskMatchesListFilters(task({ plannedEndOn: day }), "", { ...filters, deadline: { preset: "this-week" } }, "me", now, "Asia/Shanghai");
    assert.equal(match("2026-09-21"), true);
    assert.equal(match("2026-09-20"), false);
  });
});

test("夏令时前后按团队日历日逾期，午夜之前仍是当天", () => {
  inDeviceZone("Asia/Shanghai", () => {
    for (const [day, lastMinute, nextDay] of [
      ["2026-03-08", "2026-03-09T06:59:00Z", "2026-03-09T07:00:00Z"],
      ["2026-11-01", "2026-11-02T07:59:00Z", "2026-11-02T08:00:00Z"],
    ]) {
      const deadline = task({ plannedEndOn: day });
      const matches = (instant: string, preset: "today" | "overdue") => taskMatchesListFilters(deadline, "", { ...filters, deadline: { preset } }, "me", new Date(instant), "America/Los_Angeles");
      assert.equal(matches(lastMinute, "today"), true);
      assert.equal(matches(lastMinute, "overdue"), false);
      assert.equal(matches(nextDay, "overdue"), true);
      assert.deepEqual(taskDueLabel(deadline, new Date(nextDay), "America/Los_Angeles"), { label: "逾期 1 天", overdue: true });
    }
  });
});

test("保存的日历日期不漂移，非法或无时区的时间点不补成已知日期", () => {
  for (const zone of ["Asia/Shanghai", "America/Los_Angeles", "Pacific/Kiritimati"]) assert.equal(taskCalendarDate("2026-03-08", zone), "2026-03-08");
  for (const value of ["2026-02-30T12:00:00Z", "2026-09-20T12:00:00", "2026-02-30", "9 月 20 日"]) {
    assert.equal(taskCalendarDate(value, "Asia/Shanghai"), null);
    assert.equal(taskMatchesListFilters(task({ createdAt: value }), "", { ...filters, created: { preset: "unknown" } }, "me", new Date("2026-09-20T04:00:00Z"), "Asia/Shanghai"), true);
  }
});

test("创建校验使用团队日期，允许同一时间点在不同团队拥有不同创建日", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-19T17:00:00Z") });
  const draft = { mainTask: { title: "交付", goal: "确认交付", completionCriteria: ["已交付"], ownerId: "", participantIds: [], labels: [], startDate: "", endDate: "2026-09-19" }, subtasks: [] };
  assert.throws(() => createWorkspaceTasksFromDraft([], draft, { timeZone: "Asia/Shanghai" }), /截止.*创建/);
  assert.doesNotThrow(() => createWorkspaceTasksFromDraft([], draft, { timeZone: "America/Los_Angeles" }));
  assert.equal(taskScheduleError("2026-09-19", "2026-09-19T17:00:00Z", "", "America/Los_Angeles"), null);
});

test("新团队只保存创建者当时的时区，不随随后设备时区改变", () => {
  let saved: ReturnType<typeof prepareCreatedTeam>;
  inDeviceZone("America/Los_Angeles", () => { saved = prepareCreatedTeam(structuredClone(initialPersonalCenterState), { userId: "calendar-owner", name: "创建者", email: "calendar@example.com" }, "时区团队"); });
  inDeviceZone("Asia/Shanghai", () => { assert.equal(saved.team.timezone, "America/Los_Angeles"); });
});

test("详情和燃起图将创建时间点转换成同一团队日历日", () => {
  const createdAt = "2026-09-19T17:00:00Z";
  const series: TaskProgressComparisonSeries = {
    source: "recorded", asOf: "2026-09-20", explanation: "已记录",
    creation: { at: createdAt, scopeMinutes: 480 },
    workload: [{ at: "2026-09-20", scopeMinutes: 480, completedMinutes: 240, scopeVersion: "scope-1" }],
    expected: { scopeVersion: "scope-1", points: [] },
    timing: { startOn: "2026-09-19", dueOn: "2026-09-20", forecastOn: null, scopeVersion: "scope-1", basis: "已记录" },
  };
  const progressTask = { createdAt, plannedEndOn: "2026-09-20" };
  assert.equal(getTaskProgressDisplay({ task: progressTask, series, timeZone: "America/Los_Angeles" }).startOn, "2026-09-19");
  const model = getTaskProgressComparison(series, "America/Los_Angeles")!;
  assert.equal(model.creation?.day, "2026-09-19");
  assert.equal(getTaskProgressChart(model, progressTask, { timeZone: "America/Los_Angeles" }).createdOn, "2026-09-19");
  assert.equal(progressTask.plannedEndOn, "2026-09-20");
});

test("注册创建团队也保留创建时区，加入已有团队不改变它", () => {
  const directory = structuredClone(initialPersonalCenterState);
  let created: ReturnType<typeof transitionOnboarding>;
  inDeviceZone("America/Los_Angeles", () => {
    const pending = transitionOnboarding(createOnboardingPreview("new"), { type: "register", email: "tz-new@example.com", name: "时区创建者", passwordDigest: "a".repeat(64), passwordLength: 10, now: 1000 });
    const verified = transitionOnboarding(pending, { type: "verify-code", code: "111111", now: 2000 });
    created = transitionOnboarding(verified, { type: "create-team", name: "时区团队" });
  });
  inDeviceZone("Asia/Shanghai", () => {
    const result = prepareOnboardingWorkspace(created, directory);
    const team = result.directory.teams.find(team => team.id === created.activeTeamId)!;
    assert.equal(team.timezone, "America/Los_Angeles");
    assert.equal(prepareOnboardingWorkspace(created, result.directory).directory.teams.find(item => item.id === team.id)?.timezone, team.timezone);
  });
  assert.equal(getTeamTimeZone(directory.teams[0]), "Asia/Shanghai");
  assert.match(localizeOnboardingMessage("en", "无法识别设备时区，团队已采用 UTC。"), /UTC.*timezone|timezone.*UTC/);
});

test("非法已保存时区保留整个团队目录，日期判断未知且不能提交", () => {
  const directory = structuredClone(initialPersonalCenterState);
  directory.teams[0].timezone = "Invalid/TimeZone";
  assert.equal(isPersonalCenterState(directory), true);
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const stored = JSON.stringify(directory);
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === personalCenterStorageKey ? stored : null } });
  try {
    const read = loadPersonalCenterDirectory();
    assert.equal(read.teams.length, directory.teams.length);
    assert.equal(read.teams[0].timezone, "Invalid/TimeZone");
  } finally { if (original) Object.defineProperty(globalThis, "localStorage", original); else Reflect.deleteProperty(globalThis, "localStorage"); }
  assert.equal(taskCalendarDate("2026-09-19T17:00:00Z", "Invalid/TimeZone"), null);
  assert.throws(() => taskCreationDay(new Date("2026-09-19T17:00:00Z"), "Invalid/TimeZone"), /时区/);
  assert.match(taskScheduleError("2026-09-20", "2026-09-19T17:00:00Z", "", "Invalid/TimeZone") ?? "", /时区/);
  assert.equal(taskMatchesListFilters(task(), "", { ...filters, created: { preset: "today" } }, "me", new Date("2026-09-20T00:00:00Z"), "Invalid/TimeZone"), true);
});

test("截止日期界面读取团队时区，非法时区显示错误并保留原日期", () => {
  const html = renderToStaticMarkup(React.createElement(TeamTimeZoneContext.Provider, { value: "Invalid/TimeZone" }, React.createElement(TaskDueDatePicker, { initialValue: "2026-09-20" })));
  assert.match(html, /timezone is invalid/);
  assert.match(html, /Sep 20/);
  assert.doesNotMatch(html, /<button/);
});

test("创建方案的 AI 改期沿用团队当天，避免再次退回上海日期", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-19T17:00:00Z") });
  const form = createCreationForm("交付方案", { currentDate: "2026-09-19", currentUserId: "me", members: [], tags: [] });
  Object.assign(form.mainTask, { title: "交付方案", goal: "确认交付", completionCriteria: ["交付完成"] });
  const la = buildTaskAiAdjustment(createDraftTaskAiContext(form, [], "me", "America/Los_Angeles"), { kind: "task" }, "截止时间改为2026-09-19");
  assert.ok("proposal" in la);
  const shanghai = buildTaskAiAdjustment(createDraftTaskAiContext(form, [], "me", "Asia/Shanghai"), { kind: "task" }, "截止时间改为2026-09-19");
  assert.ok("error" in shanghai);
});
