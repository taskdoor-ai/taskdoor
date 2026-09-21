import assert from "node:assert/strict";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskSubtaskList } from "../src/components/TaskSubtaskList.tsx";
import { TaskProgressOverview } from "../src/components/TaskProgressOverview.tsx";
import { TaskProgressComparison } from "../src/components/TaskProgressComparison.tsx";
import { getTaskProgressDemoExample } from "../src/data/taskProgressDemo.ts";
import { taskProgressComparisonExamples } from "../src/data/taskProgressComparisonExamples.ts";
import { allTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import { getWorkspaceEffortLeaves } from "../src/lib/taskEffortEditing.ts";
import { toTaskRelationSummary } from "../src/lib/taskRelationProjection.ts";
import { PersonDirectoryProvider } from "../src/components/PersonDirectory.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const tasks = [
  { completionCriteria: ["脚本评审通过"], dependsOnTaskIds: ["live"], dueAt: "8 月 31 日", goal: "确认脚本", id: "script", owner: "陈默", status: "进行中" as const, title: "脚本终审" },
  { dueAt: "未设置", goal: "准备直播", id: "live", owner: "林洁", status: "待开始" as const, title: "直播准备" },
];

type Element = ReactElement<Record<string, any>>;
function elements(tree: ReactNode, match: (element: Element) => boolean): Element[] {
  const found: Element[] = [];
  Children.forEach(tree, child => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (match(child)) found.push(child);
    found.push(...elements(child.props.children, match));
  });
  return found;
}

test("子任务列表显示状态、截止与真实进度来源，不展示前置依赖提醒", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { onOpenTask: () => undefined, tasks }));
  assert.match(html, /task-icon/);
  assert.match(html, /脚本终审/);
  assert.match(html, /直播准备/);
  assert.match(html, /陈默/);
  assert.match(html, /林洁/);
  assert.match(html, /data-task-id="script"/);
  assert.match(html, /进行中/);
  assert.match(html, /待开始/);
  assert.match(html, /截止 8 月 31 日/);
  assert.match(html, /未形成结果/);
  assert.doesNotMatch(html, /<details[^>]*open/, "子任务默认收起");
  assert.doesNotMatch(html, /完成日期待确认/, "子任务不显示单独的完成日期待确认行");
  assert.doesNotMatch(html, /aria-valuenow="0"/, "缺少预测不能冒充零进度");
  assert.doesNotMatch(html, /脚本评审通过|完成标准|更多选项/);
  assert.doesNotMatch(html, /前置依赖|task-subtask-dependency-note/);
  assert.equal((html.match(/<button[^>]*aria-label="打开子任务：/g) ?? []).length, 2, "每项只有名称这个打开入口");
});

test("已完成或不可见的前置依赖也不在子任务列表中展示", () => {
  const completed = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [tasks[0], { ...tasks[1], status: "已完成" }] }));
  assert.doesNotMatch(completed, /前置依赖|task-subtask-dependency-note/);
  const missing = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [{ ...tasks[0], dependsOnTaskIds: ["missing"] }] }));
  assert.doesNotMatch(missing, /前置依赖|task-subtask-dependency-note/);
});

test("旧拟任负责人不再作为待接受状态展示", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [{ ...tasks[0], owner: "", proposedOwnerId: "林洁" }] }));
  assert.match(html, /待定/);
  assert.doesNotMatch(html, /林洁|person-avatar-invitation-status pending|待接受/);
});

test("已有正式负责人时变更提议不能遮住当前负责人", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [{ ...tasks[0], proposedOwnerId: "林洁" }] }));
  assert.match(html, /陈默/);
  assert.doesNotMatch(html, /林洁|待接受/);
});

test("无负责人显示待定，无直接子任务时展示空状态", () => {
  const unassigned = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [{ ...tasks[0], owner: "" }] }));
  assert.match(unassigned, /待定/);
  const empty = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [] }));
  assert.match(empty, /当前任务还没有子任务/);
  assert.doesNotMatch(empty, /task-subtask-list-items/);
});

test("缺少打开回调时名称不可交互", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks }));
  assert.equal((html.match(/disabled=""/g) ?? []).length, tasks.length);
});

test("点击名称会传出对应的直接子任务 ID", () => {
  const openedTaskIds: string[] = [];
  const list = TaskSubtaskList({ onOpenTask: (taskId) => openedTaskIds.push(taskId), tasks });
  const buttons = elements(list, node => node.type === "button");
  assert.equal(buttons.length, 2);
  buttons[1].props.onClick();
  assert.deepEqual(openedTaskIds, ["live"]);
});

test("子任务名称后只显示大于零的直接子任务数量", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, {
    onOpenTask: () => undefined,
    tasks: [
      { ...tasks[0], childTaskCount: 3 },
      { ...tasks[1], childTaskCount: 0 },
      { ...tasks[1], id: "leaf", title: "叶子任务" },
    ],
  }));

  assert.equal((html.match(/3 个子任务/g) ?? []).length, 1);
  assert.match(html, /aria-label="3 个直接子任务"/);
  assert.doesNotMatch(html, /0 个子任务/);
  assert.equal((html.match(/class="task-subtask-title"/g) ?? []).length, 3, "数量不增加独立任务入口");
});


test("子任务时间轴按真实日期顺序展示里程碑并标注预测差异", () => {
  const base = {
    aiAssessment: null, assessmentTiming: "unknown" as const, asOf: "2026-09-04", cancelled: false, completedOn: null, confirmationAt: null,
    currentMinutes: 240, deltaMinutes: null, expectedMinutes: null, expectedRatio: null, historySeries: undefined, planChanged: false, ratio: .5, relation: "unknown" as const, reopened: false, sourceLabel: "AI 预测", total: 480,
  };
  const behind = renderToStaticMarkup(createElement(TaskProgressOverview, { compact: true, model: { ...base, startOn: "2026-09-01", dueOn: "2026-09-10", forecastOn: "2026-09-12", finishOn: "2026-09-12", deltaDays: 2, timeTone: "behind", timeStatus: "预计延期 2 天" } }));
  assert.match(behind, /创建[\s\S]*当前[\s\S]*计划结束[\s\S]*AI 预测/);
  assert.match(behind, /延期 2 天/);
  const ahead = renderToStaticMarkup(createElement(TaskProgressOverview, { compact: true, model: { ...base, startOn: "2026-09-01", dueOn: "2026-09-12", forecastOn: "2026-09-10", finishOn: "2026-09-10", deltaDays: -2, timeTone: "ahead", timeStatus: "预计提前 2 天" } }));
  assert.match(ahead, /创建[\s\S]*当前[\s\S]*AI 预测[\s\S]*计划结束/);
  assert.match(ahead, /提前 2 天/);
  const onTime = renderToStaticMarkup(createElement(TaskProgressOverview, { compact: true, model: { ...base, startOn: "2026-09-01", dueOn: "2026-09-10", forecastOn: "2026-09-10", finishOn: "2026-09-10", deltaDays: 0, timeTone: "on-track", timeStatus: "预计按期" } }));
  assert.match(onTime, /计划结束[^<]*<\/span><span[^>]*>｜<\/span><span data-kind="forecast">AI 预测/);
  assert.match(onTime, /按期/);
});

test("缺少预测或完成日期时不补造 AI 日期", () => {
  const html = renderToStaticMarkup(createElement(TaskProgressOverview, { compact: true, showScheduleHeading: false, model: {
    aiAssessment: null, assessmentTiming: "unknown", asOf: "2026-09-04", cancelled: false, completedOn: null, confirmationAt: null, currentMinutes: null, deltaDays: null, deltaMinutes: null, dueOn: "2026-09-10", expectedMinutes: null, expectedRatio: null, finishOn: null, forecastOn: null, historySeries: undefined, planChanged: false, ratio: null, relation: "unknown", reopened: false, sourceLabel: "尚无进度预测", startOn: "2026-09-01", timeStatus: "尚无完工预测", timeTone: "unknown", total: null,
  } }));
  assert.match(html, /创建/);
  assert.match(html, /计划结束/);
  assert.doesNotMatch(html, /data-kind="forecast"|<span data-kind="forecast">AI 预测/);
  assert.doesNotMatch(html, /完成日期待确认/);
});


test("当前日期夹在计划和预测之间时，差异跨越当前节点仍可见", () => {
  const model = { aiAssessment: null, assessmentTiming: "unknown" as const, asOf: "2026-09-11", cancelled: false, completedOn: null, confirmationAt: null,
    currentMinutes: 240, deltaMinutes: null, expectedMinutes: null, expectedRatio: null, historySeries: undefined, planChanged: false, ratio: .5, relation: "unknown" as const, reopened: false, sourceLabel: "AI 预测", total: 480,
    startOn: "2026-09-01", dueOn: "2026-09-10", forecastOn: "2026-09-12", finishOn: "2026-09-12", deltaDays: 2, timeTone: "behind", timeStatus: "预计延期 2 天" };
  const html = renderToStaticMarkup(createElement(TaskProgressOverview, { compact: true, showScheduleHeading: false, model }));
  assert.match(html, /计划结束[\s\S]*当前[\s\S]*AI 预测/);
  assert.match(html, /task-progress-schedule-gap[^>]*data-has-delta="true"[^>]*grid-column:4[^>]*><span class="task-progress-schedule-delta"[^>]*>延期 2 天/);
  assert.doesNotMatch(html, /task-progress-schedule-comparison/);
  assert.match(html, /data-kind="forecast"/);
});

test("已完成子任务只显示实际完成日期，未知日期不显示待确认行", () => {
  const completeTask = { ...tasks[0], status: "已完成" as const };
  const unknown = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [completeTask] }));
  assert.doesNotMatch(unknown, /完成日期待确认|data-kind="forecast"|data-kind="completed"/);
  const known = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [completeTask], effortTasks: [{ id: "script", status: "已完成", createdAt: "2026-09-01T00:00:00.000Z", plannedEndOn: "2026-09-10", completedAt: "2026-09-12T00:00:00.000Z" }] }));
  assert.match(known, /确认完成/);
  assert.match(known, /延期 2 天/);
  assert.doesNotMatch(known, /完成日期待确认|data-kind="forecast"/);
});


test("待加入人员作为负责人时仅显示头像，保留人员卡入口", () => {
  const members = [{ id: "invited-person", name: "新同事", membershipStatus: "invited" as const, email: "new@example.com", role: "运营" }];
  const html = renderToStaticMarkup(createElement(PersonDirectoryProvider, { members, children: createElement(TaskSubtaskList, { tasks: [{ ...tasks[0], owner: "invited-person" }] }) }));
  assert.match(html, /data-person-preview-trigger="avatar"/);
  assert.match(html, /aria-label="查看新同事的人员信息"/);
  assert.doesNotMatch(html, /person-name-trigger|person-membership-badge|>新同事<|>待加入<|>待接受</);
});

test("已加入的正式负责人仍显示头像和姓名", () => {
  const members = [{ id: "active-person", name: "正式同事", membershipStatus: "active" as const, email: "active@example.com", role: "运营" }];
  const html = renderToStaticMarkup(createElement(PersonDirectoryProvider, { members, children: createElement(TaskSubtaskList, { tasks: [{ ...tasks[0], owner: "active-person" }] }) }));
  assert.match(html, /person-name-trigger/);
  assert.match(html, />正式同事<\/span>/);
  assert.doesNotMatch(html, /person-avatar-invitation-status pending|待加入|待接受/);
});


const fixtureTask = (id: string) => structuredClone(allTeamWorkspaceNodes.find(node => node.id === id) as TaskNode);
function projectedFixtureModel(id: string, effortTasks = getWorkspaceEffortLeaves(allTeamWorkspaceNodes, fixtureTask(id).parentTaskId!)) {
  const view = TaskSubtaskList({ tasks: [toTaskRelationSummary(fixtureTask(id))], effortTasks });
  return elements(view, node => node.type === TaskProgressOverview)[0].props.model;
}

test("实际嵌套任务投影保留自身日期，不依赖叶节点投入集合", () => {
  const task = fixtureTask("product-launch-run-of-show");
  const leaves = getWorkspaceEffortLeaves(allTeamWorkspaceNodes, task.parentTaskId!);
  assert.equal(leaves.some(leaf => leaf.id === task.id), false);
  const ownDates = { ...task, createdAt: "2026-09-01T09:00:00+08:00", plannedEndOn: "2026-09-16" };
  const view = TaskSubtaskList({ tasks: [toTaskRelationSummary(ownDates)], effortTasks: leaves });
  const model = elements(view, node => node.type === TaskProgressOverview)[0].props.model;
  assert.equal(model.startOn, "2026-09-01");
  assert.equal(model.dueOn, "2026-09-16");
  assert.equal(model.forecastOn, "2026-09-17");
  assert.equal(model.deltaDays, 1);
  const html = renderToStaticMarkup(view);
  assert.match(html, /计划结束/);
  assert.match(html, /data-kind="forecast">AI 预测/);
  assert.match(html, /延期 1 天/);
});

test("实际复盘 fixture 经叶任务投入投影后仍有预测与确认完成节点", () => {
  const model = projectedFixtureModel("weekly-retro-open-issues");
  assert.equal(model.forecastOn, "2026-09-15");
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [toTaskRelationSummary(fixtureTask("weekly-retro-open-issues"))], effortTasks: getWorkspaceEffortLeaves(allTeamWorkspaceNodes, "weekly-retro-notes") }));
  assert.match(html, /data-kind="forecast">AI 预测/);
  assert.match(html, /按期/);
  const completed = projectedFixtureModel("weekly-retro-decisions");
  assert.equal(completed.completedOn, "2026-09-14");
  assert.equal(completed.forecastOn, null);
});

test("实际 fixture 的范围被修改后不冒充有效预测", () => {
  const leaves = getWorkspaceEffortLeaves(allTeamWorkspaceNodes, "weekly-retro-notes").map(task => task.id === "weekly-retro-open-issues" ? { ...task, goal: "用户已经修改了任务目标" } : task);
  const model = projectedFixtureModel("weekly-retro-open-issues", leaves);
  assert.equal(model.ratio, null);
  assert.equal(model.forecastOn, null);
});

test("任务缺少创建日期时，通用预测的首条观测标为创建并保留 record 类型", () => {
  const task = { ...fixtureTask("weekly-retro-open-issues"), createdAt: undefined, plannedEndOn: "2026-08-31" };
  const series = taskProgressComparisonExamples.find(example => example.id === "ahead")!;
  const html = renderToStaticMarkup(createElement(TaskProgressComparison, { compact: true, progressTask: task, series }));
  assert.match(html, /data-date="2026-09-07"/);
  assert.match(html, /data-kind="record">创建/);
  assert.doesNotMatch(html, /data-kind="record">当前|data-kind="start"|创建时初始总工作量/);
  const withCreation = renderToStaticMarkup(createElement(TaskProgressComparison, { compact: true, progressTask: { ...task, createdAt: "2026-08-29T09:00:00+08:00" }, series }));
  assert.match(withCreation, /data-date="2026-08-29"/);
  assert.match(withCreation, /data-kind="start">创建/);
  assert.doesNotMatch(withCreation, /data-kind="record">/);
});


test("子任务创建节点优先使用真实创建日，计划和预测保持同轴", () => {
  const task = { ...fixtureTask("product-launch-host-script"), createdAt: "2026-09-02T09:00:00+08:00", plannedEndOn: "2026-09-16" };
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [toTaskRelationSummary(task)], effortTasks: [{ ...task, title: task.name }] }));
  assert.match(html, /data-date="2026-09-02"[^]*?data-kind="start">创建/);
  assert.match(html, /data-kind="now">当前/);
  assert.match(html, /data-kind="plan">计划结束/);
  assert.match(html, /data-kind="forecast">AI 预测/);
  assert.match(html, /task-progress-schedule-delta[^]*?提前 1 天/);
  assert.doesNotMatch(html, /data-kind="start">开始/);
});

test("子任务缺少创建日时依次使用自身 creation 和首条记录，不使用当前日", () => {
  const task = { ...fixtureTask("product-launch-host-script"), createdAt: undefined };
  const original = getTaskProgressDemoExample(task.id)!;
  for (const creation of [undefined, { at: "2026-09-08T09:00:00+08:00", scopeMinutes: original.workload[0].scopeMinutes }]) {
    const series = { ...original, creation };
    const expected = creation ? "2026-09-08" : series.workload[0].at;
    assert.notEqual(expected, series.asOf);
    const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [toTaskRelationSummary(task)], effortTasks: [{ ...task, title: task.name }], progressComparisonsByTaskId: { [task.id]: series } }));
    assert.match(html, new RegExp(`data-date="${expected}"[^]*?data-kind="start">创建`));
    assert.equal((html.match(/data-kind="start">创建/g) ?? []).length, 1);
    assert.match(html, /data-kind="forecast">AI 预测/);
  }
});

test("子任务完全没有创建或历史记录时不把当前日期当作创建", () => {
  const task = { ...tasks[0], plannedEndOn: "2026-09-20" };
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [task] }));
  assert.match(html, /未形成结果/);
  assert.match(html, /dateTime="2026-09-20"/);
  assert.match(html, /计划结束/);
  assert.doesNotMatch(html, /data-kind="start"|task-progress-schedule-start/);
});
