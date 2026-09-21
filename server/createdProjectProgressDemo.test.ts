import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { creatorCommerceMembers } from "../src/data/creatorCommerceScenario.ts";
import { getCreatedProjectProgressDemo, withCreatedProjectProgressDetail } from "../src/data/createdProjectProgressDemo.ts";
import { createCreatorCommerceScenarioDraft } from "../src/lib/mockTaskAssistant.ts";
import { createWorkspaceTasksFromDraft } from "../src/lib/workspaceTaskCreation.ts";
import { getTaskProgressDisplay } from "../src/lib/taskProgressDisplay.ts";
import { getTaskProgressChart, getTaskProgressComparison } from "../src/lib/taskProgressComparison.ts";
import { getTaskEffortDistribution } from "../src/lib/taskEffortDistribution.ts";
import { getWorkspaceEffortLeaves } from "../src/lib/taskEffortEditing.ts";
import { createWorkspaceTaskDetail } from "../src/data/taskDetailMocks.ts";
import type { TaskAssistantRequest } from "../src/lib/taskAssistantProtocol.ts";
import { getTaskWorkloadProjection } from "../src/lib/taskWorkloadProjection.ts";

const family = () => {
  mock.timers.enable({apis:["Date"], now:new Date("2026-09-01T09:00:00+08:00")});
  try { return createWorkspaceTasksFromDraft([], createCreatorCommerceScenarioDraft({
  currentDate: "2026-09-01", members: creatorCommerceMembers, messages: [], tags: [],
} as unknown as TaskAssistantRequest), { currentUserId: "周岚", teamId: "creator-commerce" }).createdNodes; } finally { mock.timers.reset(); }
};

test("旧创建种子与当前完成标准不同时，演示估算按当前定义生成并恢复同口径进度与预测", () => {
  const seeds = family().map(task => ({...task, completionCriteria:["旧版演示完成标准"]}));
  const current = seeds.map(task => ({...task, completionCriteria: []}));
  const before = structuredClone(current);
  const demo = getCreatedProjectProgressDemo(seeds, current);
  const effortTasks = getWorkspaceEffortLeaves(current, current[0].id).map(task => ({
    ...task, effortEstimate: demo.estimates[task.id] ?? task.effortEstimate,
  }));
  const result = getTaskWorkloadProjection({progressTask:current[0], effortTasks, hasSubtasks:true,
    comparison:demo.comparisons[current[0].id], progressComparisonsByTaskId:demo.comparisons});
  assert.equal(result.effort.totalMinutes, 2520);
  assert.equal(result.display.currentMinutes, 1332);
  assert.equal(result.display.ratio, 1332 / 2520);
  assert.equal(result.display.forecastOn, "2026-09-16");
  assert.equal(result.display.deltaDays, 1);
  assert.ok(getTaskProgressChart(getTaskProgressComparison(result.comparison)!).forecastPath);
  assert.deepEqual(current, before);
});

test("防晒衣 Demo 保留交付历史与范围新增，主子任务逐日同口径", () => {
  const nodes = family(), before = structuredClone(nodes);
  const demo = getCreatedProjectProgressDemo(nodes);
  const parent = getTaskProgressComparison(demo.comparisons[nodes[0].id])!;
  assert.deepEqual(parent.history.map(row => row.at), ["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-14"]);
  assert.equal(parent.history[0].scopeMinutes, 2280);
  assert.equal(parent.history.find(row => row.at === "2026-09-12")?.addedMinutes, 240);
  assert.equal(parent.latest.scopeMinutes, 2520);
  assert.equal(parent.latest.completedMinutes, 1332);
  for (const row of parent.history) {
    const children = nodes.slice(1).map(task => demo.comparisons[task.id].workload.find(point => point.at === row.at)!);
    assert.equal(row.scopeMinutes, children.reduce((sum, point) => sum + point.scopeMinutes, 0));
    assert.equal(row.completedMinutes, children.reduce((sum, point) => sum + point.completedMinutes, 0));
  }
  const chart = getTaskProgressChart(parent);
  assert.match(chart.scopePath, /H .* V/);
  assert.match(chart.completedPath, /H .* V/);
  assert.ok(chart.forecastPath);
  assert.deepEqual(nodes, before);
});

test("创建演示的随机 ID 项目有完整预测，缺少旧工时记录也能汇总，原节点不被修改", () => {
  const nodes = family(), before = structuredClone(nodes);
  const demo = getCreatedProjectProgressDemo(nodes);
  assert.equal(Object.keys(demo.comparisons).length, 8);
  const leaves = getWorkspaceEffortLeaves(nodes, nodes[0].id).map(task => ({ ...task, effortEstimate: demo.estimates[task.id] }));
  const effort = getTaskEffortDistribution(leaves, "example");
  assert.equal(effort.state, "available");
  assert.equal(effort.totalMinutes, 2520);
  const values = leaves.map(task => getTaskProgressDisplay({ task, series: demo.comparisons[task.id], scopeMinutes: task.effortEstimate.minutes }));
  assert.deepEqual(values.map(value => value.ratio), [.75, .65, .30, .80, .45, .20, .70]);
  const total = values.reduce((sum, value) => sum + value.currentMinutes!, 0);
  const main = getTaskProgressDisplay({ task: nodes[0], series: demo.comparisons[nodes[0].id], scopeMinutes: effort.totalMinutes, completedMinutes: total, sourceLabel: "子任务汇总" });
  assert.equal(main.currentMinutes, 1332);
  assert.equal(main.forecastOn, "2026-09-16");
  assert.equal(main.deltaDays, 1);
  assert.equal(main.sourceLabel, "子任务汇总");
  for (const task of nodes) {
    const detail = withCreatedProjectProgressDetail(createWorkspaceTaskDetail(task), task.id, demo);
    assert.ok(detail.activities.some(activity => activity.message === demo.comparisons[task.id].explanation));
    assert.equal(withCreatedProjectProgressDetail(detail, task.id, demo), detail);
  }
  assert.deepEqual(nodes, before);
});

test("样例只匹配完整的既有创建场景，普通新任务、残缺任务树和其他团队不套用", () => {
  const nodes = family();
  for (const candidates of [nodes.slice(0, 1), nodes.slice(0, -1), nodes.map(node => ({ ...node, teamId: "platform" })),
    nodes.map((node, index) => index ? node : { ...node, goal: "用户自行定义的项目" }),
    nodes.map((node, index) => index ? node : { ...node, plannedEndOn: "2027-09-15", dueAt: "9 月 15 日", plannedStartOn: "2027-09-01" })]) {
    assert.deepEqual(getCreatedProjectProgressDemo(candidates), { comparisons: {}, estimates: {} });
  }
});

test("用户完成与重开仍优先，改截止不重算 AI 百分比，现有工时不覆盖", () => {
  const nodes = family(), task = nodes[1];
  const demo = getCreatedProjectProgressDemo(nodes), series = demo.comparisons[task.id];
  const completed = getTaskProgressDisplay({ task: { ...task, status: "已完成", completedAt: "2026-09-15T10:00:00+08:00" }, series });
  assert.equal(completed.ratio, 1); assert.equal(completed.sourceLabel, "用户确认");
  assert.equal(completed.aiAssessment?.ratio, .75); assert.equal(completed.assessmentTiming, "before");
  assert.equal(getTaskProgressDisplay({ task: { ...task, progressReopenedAt: "2026-09-15T11:00:00+08:00" }, series }).ratio, .75);
  const changed = getTaskProgressDisplay({ task: { ...task, plannedEndOn: "2026-09-20" }, series });
  assert.equal(changed.ratio, .75); assert.equal(changed.forecastOn, "2026-09-15");
  assert.equal(changed.timeStatus, "预计提前 5 天");
  task.effortEstimate = { ...demo.estimates[task.id], basis: "manual", confirmed: true, minutes: 400 };
  assert.equal(getCreatedProjectProgressDemo(nodes).estimates[task.id], undefined);
});
