import assert from "node:assert/strict";
import test from "node:test";
import { allTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { normalizeWorkspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import { createWorkspaceTaskDetail } from "../src/data/taskDetailMocks.ts";
import { getTaskProgressDemoExample } from "../src/data/taskProgressDemo.ts";
import { progressDemoRevisions } from "../src/data/taskProgressDemoFixtures.ts";
import { getTaskProgressComparison } from "../src/lib/taskProgressComparison.ts";
import { getTaskProgressDisplay } from "../src/lib/taskProgressDisplay.ts";
import { migrateProgressDemoFixtures } from "../src/lib/taskProgressDemoMigration.ts";

const task = (id: string) => structuredClone(allTeamWorkspaceNodes.find(node => node.id === id) as TaskNode);
const oldNodes = () => normalizeWorkspaceNodes(allTeamWorkspaceNodes.map(node => progressDemoRevisions[node.id]
  ? { ...node, ...progressDemoRevisions[node.id].before, completedAt: undefined } : node));

test("复盘进度、工作量汇总、截止和预测使用同一组业务快照", () => {
  const parent = getTaskProgressDemoExample("weekly-retro-notes")!;
  const children = ["weekly-retro-decisions", "weekly-retro-open-issues", "weekly-retro-actions"].map(id =>
    getTaskProgressDisplay({ series: getTaskProgressDemoExample(id), task: task(id) }));
  assert.deepEqual(children.map(child => child.ratio), [1, .75, .5]);
  assert.equal(children.reduce((sum, child) => sum + child.currentMinutes!, 0), 315);
  assert.equal(parent.workload.at(-1)?.completedMinutes, 315);
  assert.equal(getTaskProgressComparison(parent)?.actualRatio, .75);
  const model = getTaskProgressDisplay({ series: parent, task: task("weekly-retro-notes") });
  assert.equal(model.asOf, "2026-09-14");
  assert.equal(model.dueOn, "2026-09-15");
  assert.equal(model.forecastOn, "2026-09-15");
  assert.equal(model.deltaDays, 0);
  assert.equal(model.expectedRatio, null);
  for (const id of ["weekly-retro-notes", "weekly-retro-decisions", "weekly-retro-open-issues", "weekly-retro-actions"]) {
    const series = getTaskProgressDemoExample(id)!;
    assert.ok(getTaskProgressComparison(series));
    assert.ok(series.workload.every(point => point.at >= series.timing.startOn && point.at <= series.asOf));
    assert.equal(series.timing.dueOn, task(id).plannedEndOn);
    const detail = createWorkspaceTaskDetail(task(id));
    assert.ok(detail.activities.every(activity => activity.createdAt?.startsWith("2026-09-14")));
    assert.doesNotMatch(JSON.stringify(detail), /2026-08-|2026-09-0[1457]/);
  }
});

test("用户确认和确认前 AI 快照分别保留，待开始且无证据不生成百分比", () => {
  const result = getTaskProgressDisplay({ series: getTaskProgressDemoExample("weekly-retro-decisions"), task: task("weekly-retro-decisions") });
  assert.equal(result.ratio, 1);
  assert.equal(result.completedOn, "2026-09-14");
  assert.equal(result.assessmentTiming, "before");
  assert.equal(result.aiAssessment?.completedMinutes, 114);
  for (const node of allTeamWorkspaceNodes.filter(node => ["unassigned-live-backup-plan", "unassigned-attribution-dictionary"].includes(node.id))) {
    assert.equal(getTaskProgressDemoExample(node.id), undefined);
    assert.equal(getTaskProgressDisplay({ task: node as TaskNode }).ratio, null);
  }
  assert.equal(getTaskProgressDisplay({series:getTaskProgressDemoExample("unassigned-short-video-covers"),task:task("unassigned-short-video-covers")}).ratio,.25);
  assert.equal(getTaskProgressDemoExample("user-created-task"), undefined);
});

test("旧样例按任务精确迁移且幂等，不删除新增任务", () => {
  const nodes = oldNodes();
  const created = { ...task("weekly-retro-notes"), id: "my-own-task", name: "用户新任务" };
  nodes.push(created);
  const result = migrateProgressDemoFixtures(nodes);
  assert.equal((result.find(node => node.id === "weekly-retro-notes") as TaskNode).plannedEndOn, "2026-09-15");
  assert.equal((result.find(node => node.id === "weekly-retro-decisions") as TaskNode).completedAt, "2026-09-14T12:00:00+08:00");
  assert.equal((result.find(node => node.id === "weekly-retro-actions") as TaskNode).status, "待开始");
  assert.equal(result.find(node => node.id === created.id), created);
  assert.equal(migrateProgressDemoFixtures(result), result);
});

test("行动项示例保留待开始状态，产出依据与 50% 预测独立存在", () => {
  const node = task("weekly-retro-actions");
  const comparison = getTaskProgressDemoExample(node.id)!;
  const display = getTaskProgressDisplay({ series: comparison, task: node });
  assert.equal(node.status, "待开始");
  assert.equal(display.ratio, .5);
  assert.equal(display.total, 120);
  assert.equal(display.currentMinutes, 60);
  assert.equal(display.forecastOn, "2026-09-15");
  assert.match(createWorkspaceTaskDetail(node).files[0].content!, /行动项草稿已成形/);
});

test("编辑和变更记录仅保护当前任务；未编辑的兄弟任务仍迁移", () => {
  for (const change of [{ plannedEndOn: "2026-09-20" }, { plannedEndOn: "", dueAt: "—" }, { status: "已完成" as const }, { goal: "新的目标" }, { ownerId: "高远" }]) {
    const nodes = oldNodes();
    Object.assign(nodes.find(node => node.id === "weekly-retro-actions")!, change);
    const before = structuredClone(nodes.filter(node => node.id.startsWith("weekly-retro-")));
    const migrated = migrateProgressDemoFixtures(nodes);
    assert.deepEqual(migrated.find(node => node.id === "weekly-retro-actions"), before.find(node => node.id === "weekly-retro-actions"));
    assert.equal((migrated.find(node => node.id === "weekly-retro-decisions") as TaskNode).completedAt, "2026-09-14T12:00:00+08:00");
  }
  const nodes = oldNodes();
  const migrated = migrateProgressDemoFixtures(nodes, { "weekly-retro-notes": [{ id: "saved-status", type: "status-change", author: "周岚", time: "2026-09-14 18:00", message: "用户更新状态后又改回进行中" }] });
  assert.equal(migrated.find(node => node.id === "weekly-retro-notes"), nodes.find(node => node.id === "weekly-retro-notes"));
});
