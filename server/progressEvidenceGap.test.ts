import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { allTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { normalizeWorkspaceNodes, type TaskNode, type WorkspaceNode } from "../src/data/workspaceNodes.ts";
import { createWorkspaceTaskDetail, taskDetailMocks, type TaskDetailId } from "../src/data/taskDetailMocks.ts";
import { getTeamTaskDetailFixture } from "../src/data/teamTaskDetailFixtures.ts";
import { creatorCommerceMembers } from "../src/data/creatorCommerceScenario.ts";
import { getCreatedProjectProgressDemo, withCreatedProjectProgressDetail } from "../src/data/createdProjectProgressDemo.ts";
import { getTaskProgressDemoExample } from "../src/data/taskProgressDemo.ts";
import { getTaskAcceptedEffortMinutes } from "../src/data/taskProgressExamples.ts";
import { createCreatorCommerceScenarioDraft } from "../src/lib/mockTaskAssistant.ts";
import { createWorkspaceTasksFromDraft } from "../src/lib/workspaceTaskCreation.ts";
import type { TaskAssistantRequest } from "../src/lib/taskAssistantProtocol.ts";
import { resolveWorkspaceScenarioReset, creatorCommerceScenarioVersion } from "../src/lib/workspaceScenarioReset.ts";
import { migrateProgressDemoFixtures } from "../src/lib/taskProgressDemoMigration.ts";
import { migrateTaskStatusDemoFixtures } from "../src/lib/taskStatusDemoMigration.ts";
import { getWorkspaceEffortLeaves } from "../src/lib/taskEffortEditing.ts";
import { getTaskWorkloadProjection } from "../src/lib/taskWorkloadProjection.ts";
import { getTaskSituationModel } from "../src/lib/taskSituation.ts";
import { getTaskProgressChart, getTaskProgressComparison } from "../src/lib/taskProgressComparison.ts";
import { progressDate } from "../src/lib/taskProgressDisplay.ts";
import { createManualEffortEstimate } from "../src/lib/taskEffort.ts";
import { TaskProgressOverview } from "../src/components/TaskProgressOverview.tsx";
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const tasks = (nodes: WorkspaceNode[]) => nodes.filter((node): node is TaskNode => node.kind === "task");
const load = (nodes: WorkspaceNode[]) => migrateTaskStatusDemoFixtures(migrateProgressDemoFixtures(resolveWorkspaceScenarioReset({
  storedVersion: creatorCommerceScenarioVersion, storedWorkspaceNodes: nodes, storedTags: [],
}).workspaceNodes));
const dates = (task: TaskNode) => {
  const value = task.plannedEndOn ?? task.dueAt ?? "", match = value.match(/(\d+)\s*月\s*(\d+)\s*日/);
  return { ...task, plannedStartOn: task.plannedStartOn ?? "", plannedEndOn: progressDate(value) ?? (match ? `2026-${match[1].padStart(2,"0")}-${match[2].padStart(2,"0")}` : "") };
};
// Mirrors App: immutable detail seeds supply Demo observations; live definitions validate effort.
function project(nodes: WorkspaceNode[], seedNodes = nodes) {
  const demo = getCreatedProjectProgressDemo(seedNodes);
  const comparison = (id: string) => getTaskProgressDemoExample(id, demo.comparisons[id]);
  return tasks(nodes).map(task => {
    const team = nodes.filter(node => node.teamId === task.teamId);
    const leaves = getWorkspaceEffortLeaves(team, task.id).map(leaf => {
      const estimate = demo.estimates[leaf.id];
      const useDemo = !leaf.effortEstimate || leaf.effortEstimate.basis === "unknown" || leaf.effortEstimate.basis === "mock" && leaf.effortEstimate.minutes === null;
      return dates(estimate && useDemo ? { ...leaf, effortEstimate: estimate } : leaf);
    });
    const seed = seedNodes.find(node => node.id === task.id) as TaskNode | undefined;
    const base = taskDetailMocks[task.id as TaskDetailId] ?? getTeamTaskDetailFixture(task) ?? createWorkspaceTaskDetail(seed ?? task);
    const detail = { ...withCreatedProjectProgressDetail(base, task.id, demo), status: task.status, goal: task.goal ?? "", title: task.name };
    const series = comparison(task.id);
    const workload = getTaskWorkloadProjection({ progressTask: dates(task), comparison: series, effortTasks: leaves,
      hasSubtasks: tasks(team).some(node => node.parentTaskId === task.id), series: detail.burnUp,
      completedMinutesByTaskId: getTaskAcceptedEffortMinutes(task.id),
      progressComparisonsByTaskId: Object.fromEntries(leaves.map(leaf => [leaf.id, comparison(leaf.id)])),
    });
    const display = workload.display;
    const situation = getTaskSituationModel({ taskId: task.id, task: detail, childTasks: [], recordedActivities: [], progress: display, progressScopeState: workload.effort.state });
    const html = renderToStaticMarkup(React.createElement(TaskProgressOverview, { model: display }));
    return { task, series, detail, workload, display, situation, html };
  });
}
const family = () => {
  const nodes = createWorkspaceTasksFromDraft([], createCreatorCommerceScenarioDraft({
  currentDate: "2026-09-01", members: creatorCommerceMembers, messages: [], tags: [],
} as unknown as TaskAssistantRequest), { currentUserId: "周岚", teamId: "creator-commerce" }).createdNodes;
  const ids = new Map(nodes.map((node, index) => [node.id, `created-demo-${index}`]));
  return nodes.map(node => ({ ...node, id: ids.get(node.id)!, parentTaskId: node.kind === "task" && node.parentTaskId ? ids.get(node.parentTaskId) : undefined }));
};
const fixtures = normalizeWorkspaceNodes(allTeamWorkspaceNodes);
const unknown = ["platform-daily-production-triage", "supply-daily-shortage-standup", "unassigned-attribution-dictionary", "unassigned-live-backup-plan"].sort();
function audit(label: string, rows: ReturnType<typeof project>) {
  // A structured authored snapshot is quantifiable evidence; a file/discussion count is not.
  const evidence = rows.filter(row => row.series?.workload.length);
  const missing = evidence.filter(row => row.display.ratio === null || row.display.currentMinutes === null);
  console.log(label, JSON.stringify({ total: rows.length, evidence: evidence.length, erroneousUnknown: missing.length,
    causes: missing.map(row => ({ id: row.task.id, state: row.workload.effort.state })) }));
  assert.deepEqual(missing.map(row => row.task.id), []);
  for (const row of evidence) {
    assert.doesNotMatch(row.html, /尚无进度预测|暂无预估/, row.task.id);
    assert.equal(row.situation.freshness, "current", row.task.id);
    const model = getTaskProgressComparison(row.display.historySeries)!;
    const chart = getTaskProgressChart({ ...model, forecastOn: row.display.forecastOn, completedOn: row.display.completedOn, dueOn: row.display.dueOn }, dates(row.task));
    assert.equal(chart.forecastX !== null, row.display.forecastOn !== null, row.task.id);
  }
}
for (const [label, nodes] of [["fresh", fixtures], ["v21-missing-estimate", fixtures.map(node => {
  if (node.kind !== "task") return node;
  const { effortEstimate: _estimate, ...rest } = node; return rest;
})]] as const) test(`${label}: all built-in evidence reaches the detail, situation and progress view`, () => {
  const loaded = load(nodes), rows = project(loaded);
  audit(label, rows);
  assert.equal(rows.length, 232);
  assert.deepEqual(rows.filter(row => row.display.ratio === null).map(row => row.task.id).sort(), unknown);
  for (const row of rows.filter(row => unknown.includes(row.task.id))) {
    assert.equal(row.display.forecastOn, null);
    assert.match(row.situation.summary, /暂无分析.*完成量记录/);
  }
  assert.equal(migrateProgressDemoFixtures(loaded), loaded);
});
test("saved creation Demo: all eight authored progress observations survive App effort validation", () => {
  const seeds = family(), before = structuredClone(seeds), rows = project(load(seeds), seeds);
  audit("saved-created-demo", rows);
  assert.equal(rows.length, 8);
  for (const row of rows) assert.ok(row.detail.activities.some(activity => activity.message === row.series!.explanation));
  assert.equal(rows[0].display.currentMinutes, 1332);
  assert.equal(rows[0].display.forecastOn, "2026-09-16");
  assert.deepEqual(seeds, before);
});
test("seed evidence never overrides changed scope or manual estimates; active statuses share evidence", () => {
  const seeds = family(), target = seeds[1] as TaskNode;
  const initial = project(seeds, seeds).find(row => row.task.id === target.id)!;
  for (const status of ["待开始", "进行中", "已阻塞"] as const) {
    const row = project(seeds.map(node => node.id === target.id ? { ...target, status } : node), seeds).find(row => row.task.id === target.id)!;
    assert.deepEqual([row.display.ratio, row.display.currentMinutes, row.display.forecastOn], [initial.display.ratio, initial.display.currentMinutes, initial.display.forecastOn]);
  }
  for (const status of ["已完成", "已取消"] as const) {
    const row = project(seeds.map(node => node.id === target.id ? { ...target, status } : node), seeds).find(row => row.task.id === target.id)!;
    assert.equal(row.display.forecastOn, null);
  }
  const changed = project(seeds.map(node => node.id === target.id ? { ...target, goal: "用户的新范围" } : node), seeds).find(row => row.task.id === target.id)!;
  assert.equal(changed.display.ratio, null); assert.equal(changed.workload.effort.state, "stale");
  const manual = { ...target, effortEstimate: createManualEffortEstimate(target, { minutes: 400, reason: "人工核对", workMethod: "人工整理" }) };
  const row = project(seeds.map(node => node.id === target.id ? manual : node), seeds).find(row => row.task.id === target.id)!;
  assert.equal(row.workload.effort.totalMinutes, 400); assert.equal(row.display.ratio, null);
  assert.equal(row.display.forecastOn, null); assert.equal(manual.effortEstimate.minutes, 400);
});
