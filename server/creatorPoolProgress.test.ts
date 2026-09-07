import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceTaskDetail } from "../src/data/taskDetailMocks.ts";
import { getTaskAcceptedEffortMinutes, getTaskProgressBurnUp, getTaskProgressEvents } from "../src/data/taskProgressExamples.ts";
import { teamWorkspaceScenarios } from "../src/data/teamWorkspaceScenarios.ts";
import type { TaskNode } from "../src/data/workspaceNodes.ts";

const rootId = "ccx-creator-pool-governance";
const groups = ["ccx-creator-pool-data-track", "ccx-creator-pool-decision-track"];
const team = teamWorkspaceScenarios.find((item) => item.id === "creator-commerce")!;
const tasks = team.nodes.filter((item): item is TaskNode => item.kind === "task");
const leaves = tasks.filter((item) => groups.includes(item.parentTaskId ?? ""));

test("达人池账本保留范围增减、改估和两轮重开，终点与现有八个叶子一致", () => {
  const series = getTaskProgressBurnUp(rootId);
  assert.ok(series, "达人池治理应拥有自己的燃起账本");
  assert.equal(series.source, "example");
  assert.deepEqual(series.points.map((point) => [point.at, point.scopeHours, point.completedHours]), [
    ["2026-08-25", 22, 0], ["2026-08-26", 31, 0], ["2026-08-27", 33, 6],
    ["2026-08-28", 35, 0], ["2026-08-29", 37, 6], ["2026-08-30", 48, 6],
    ["2026-08-31", 52, 6], ["2026-09-01", 49, 15], ["2026-09-02", 54, 6],
  ]);
  const events = getTaskProgressEvents(rootId);
  assert.deepEqual(new Set(events.map((event) => event.kind)), new Set(["scope-added", "accepted", "reopened", "estimate-revised", "scope-removed"]));
  assert.ok(events.length >= 20);
  assert.equal(new Set(events.map((event) => event.taskId)).size, 8);
  assert.equal(series.points.at(-1)!.scopeHours, leaves.reduce((sum, leaf) => sum + leaf.effortEstimate!.minutes! / 60, 0));
  assert.equal(series.points.at(-1)!.completedHours, leaves.filter((leaf) => leaf.status === "已完成").reduce((sum, leaf) => sum + leaf.effortEstimate!.minutes! / 60, 0));
  for (const event of events) {
    const leaf = leaves.find((item) => item.id === event.taskId)!;
    assert.ok(leaf);
    assert.equal(event.taskTitle, leaf.name);
    assert.ok(team.members.some((member) => member.id === event.actor));
    assert.ok(Date.parse(event.at) <= Date.parse(team.asOf));
    assert.ok(series.points.find((point) => point.at === event.at.slice(0, 10))!.note!.includes(event.note));
  }
});

test("两个中间任务投影同一份叶子历史，父级不重复计入工时", () => {
  const root = getTaskProgressBurnUp(rootId);
  assert.ok(root);
  const histories = groups.map((id) => getTaskProgressBurnUp(id));
  assert.ok(histories.every(Boolean), "中间任务也应有自身范围的历史");
  root.points.forEach((point, index) => {
    assert.equal(histories.reduce((sum, history) => sum + history!.points[index].scopeHours!, 0), point.scopeHours);
    assert.equal(histories.reduce((sum, history) => sum + history!.points[index].completedHours!, 0), point.completedHours);
  });
  for (const event of getTaskProgressEvents(rootId)) {
    const leaf = leaves.find((item) => item.id === event.taskId)!;
    for (const id of [rootId, leaf.parentTaskId!, leaf.id]) {
      const detail = createWorkspaceTaskDetail(tasks.find((item) => item.id === id)!);
      assert.deepEqual(getTaskProgressEvents(id).find((item) => item.id === event.id), event);
      assert.equal(detail.activities.filter((item) => item.id === event.id).length, 1);
      assert.equal(detail.activities.find((item) => item.id === event.id)!.message, event.note);
    }
  }
  assert.equal(getTaskAcceptedEffortMinutes(rootId)["ccx-creator-performance-window"], 0);
  assert.equal(getTaskAcceptedEffortMinutes(groups[0])["ccx-creator-identity-merge"], 360);
  assert.equal(getTaskProgressBurnUp(leaves[0].id), undefined);
});

test("每个末级任务都有具体业务表格、讨论和文件版本活动，引用可以在本任务解析", () => {
  for (const leaf of leaves) {
    const detail = createWorkspaceTaskDetail(leaf);
    const posts = detail.activities.filter((item) => item.type === "member-post");
    assert.ok(posts.length >= 4, `${leaf.id} 应有至少四条业务动态`);
    assert.ok(posts.every((item) => item.createdAt && /\d/.test(item.message)));
    const table = detail.files.find((file) => file.previewData?.kind === "table");
    assert.ok(table, `${leaf.id} 应有自己的数据表`);
    if (table.previewData?.kind === "table") {
      assert.ok(table.previewData.sheets[0].rows.length >= 4);
      assert.ok(table.previewData.sheets.every((sheet) => sheet.rows.every((row) => row.length === sheet.columns.length)));
    }
    assert.ok(detail.commits.length >= 3);
    assert.ok(detail.files.some((file) => file.content?.includes(leaf.completionCriteria![0])));
    const names = new Set(detail.files.filter((file) => file.kind === "file").map((file) => file.name));
    for (const activity of detail.activities) if (activity.file) assert.ok(names.has(activity.file));
    for (const commit of detail.commits) assert.ok(commit.files.every((name) => names.has(name)));
    assert.equal(new Set(detail.activities.map((item) => item.id)).size, detail.activities.length);
    assert.ok(detail.activities.every((item) => item.createdAt && Date.parse(item.createdAt) <= Date.parse(team.asOf)));
    assert.equal(detail.status, leaf.status);
  }
});

test("新建任务不套用演示历史，读取后修改副本不污染其他任务", () => {
  const leaf = leaves[0];
  const created = createWorkspaceTaskDetail({ ...leaf, createdFrom: "task-editor" });
  assert.deepEqual(created.activities, []);
  assert.equal(created.burnUp, undefined);
  const detail = createWorkspaceTaskDetail(leaf);
  const original = JSON.stringify(detail);
  detail.activities[0].message = "本地改动";
  detail.files[0].name = "本地文件";
  assert.equal(JSON.stringify(createWorkspaceTaskDetail(leaf)), original);
});
