import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceTaskDetail, taskDetailMocks, type TaskDetailId } from "../src/data/taskDetailMocks.ts";
import { getTaskHeadingExample } from "../src/data/taskHeadingExamples.ts";
import { getTaskAcceptedEffortMinutes, getTaskProgressBurnUp, getTaskProgressEvents } from "../src/data/taskProgressExamples.ts";
import { workspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import { getWorkspaceEffortLeaves } from "../src/lib/taskEffortEditing.ts";

const parentId = "fragrance-creator-wrapup";

test("模拟事件区分六项初始范围和两项中途新增，形成范围与验收双线", () => {
  const events = getTaskProgressEvents(parentId);
  assert.equal(events.filter((event) => event.kind === "scope-added" && event.isBaseline).length, 6);
  assert.deepEqual(events.filter((event) => event.kind === "scope-added" && !event.isBaseline).map((event) => event.taskId), ["fragrance-compliance", "fragrance-final-decision"]);
  assert.equal(events.filter((event) => event.kind === "accepted").length, 3);
  assert.ok(events.every((event, index) => index === 0 || Date.parse(event.at) >= Date.parse(events[index - 1].at)));
  assert.ok(events.every((event) => event.source === "example" && event.note.trim().length > 0 && !event.note.startsWith("示例：")));

  const history = getTaskProgressBurnUp(parentId)!;
  assert.equal(history.source, "example");
  assert.deepEqual(history.points.map((point) => [point.at, point.scopeHours, point.completedHours, point.totalLeafCount]), [
    ["2026-08-25", 37, 0, 6],
    ["2026-08-26", 37, 0, 6],
    ["2026-08-27", 40, 6, 7],
    ["2026-08-28", 40, 6, 7],
    ["2026-08-29", 43, 11, 8],
    ["2026-08-30", 43, 11, 8],
    ["2026-08-31", 43, 15, 8],
  ]);
  assert.deepEqual(getTaskHeadingExample(parentId)?.burnUp, history);
});

test("聚合对象均为真实示例树中的末梢叶子，不加父级，也不重复累计叶子", () => {
  const events = getTaskProgressEvents(parentId);
  const included = events.filter((event) => event.kind === "scope-added");
  const leaves = workspaceNodes.filter((task): task is TaskNode => task.kind === "task" && task.parentTaskId === parentId);
  assert.equal(new Set(included.map((event) => event.taskId)).size, included.length);
  assert.deepEqual(included.map((event) => event.taskId).sort(), leaves.map((task) => task.id).sort());
  for (const event of events) {
    assert.notEqual(event.taskId, parentId);
    assert.equal(workspaceNodes.some((task) => task.kind === "task" && task.parentTaskId === event.taskId), false);
  }
  assert.ok(included.every((event) => event.ewdHours !== null));
  assert.ok(events.filter((event) => event.kind === "accepted").every((event) => event.ewdHours !== null));
  assert.equal(included.reduce((total, event) => total + event.ewdHours!, 0), 43);
  assert.equal(events.filter((event) => event.kind === "accepted").reduce((total, event) => total + event.ewdHours!, 0), 15);
  assert.equal(taskDetailMocks[parentId].status, "进行中", "叶子验收不会自动关闭父任务");
});

test("子任务明细只把显式验收账本投影成已验收工时", () => {
  const completed = getTaskAcceptedEffortMinutes(parentId);
  assert.equal(completed["fragrance-creator-business"], 360);
  assert.equal(completed["fragrance-product"], 300);
  assert.equal(completed["fragrance-data"], 240);
  assert.equal(completed["fragrance-content"], 0);
  assert.deepEqual(getTaskAcceptedEffortMinutes("unknown"), {});
});

test("父级、叶子活动与曲线使用同一个事件ID和固定时间，原活动引用保留", () => {
  for (const event of getTaskProgressEvents(parentId)) {
    const childEvents = getTaskProgressEvents(event.taskId);
    assert.deepEqual(childEvents.find((item) => item.id === event.id), event);
    for (const taskId of [parentId, event.taskId] as TaskDetailId[]) {
      const detail = taskDetailMocks[taskId];
      const activity = detail.activities.find((record) => record.id === event.id);
      assert.ok(activity, `${taskId} 应可追溯事件 ${event.id}`);
      assert.equal(activity.createdAt, event.at);
      assert.equal(activity.author, event.actor);
      assert.ok(activity.message.includes(event.note));
      assert.equal(activity.message, event.note);
      assert.doesNotMatch(activity.message, /固定演示历史|示例：/);
      assert.ok(detail.activities.some((record) => record.id === `${taskId}-activity`));
      assert.ok(detail.activities.some((record) => record.id === `${taskId}-activity-status`));
      assert.ok(detail.activities.some((record) => record.replyToActivityId === `${taskId}-activity`));
    }
    const snapshot = getTaskProgressBurnUp(parentId)!.points.find((point) => point.at === event.at.slice(0, 10));
    assert.ok(snapshot?.note?.includes(event.note));
  }
});

test("复盘纪要 Mock 同步提供完成标准、子任务估算与显式燃起账本", () => {
  const task = workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "weekly-retro-notes")!;
  const children = workspaceNodes.filter((node): node is TaskNode => node.kind === "task" && node.parentTaskId === task.id);
  const effortLeaves = getWorkspaceEffortLeaves(workspaceNodes, task.id);
  const events = getTaskProgressEvents(task.id);
  const history = getTaskProgressBurnUp(task.id)!;

  assert.ok(task.completionCriteria && task.completionCriteria.length >= 2);
  assert.deepEqual(children.map((child) => child.id), ["weekly-retro-decisions", "weekly-retro-open-issues", "weekly-retro-actions"]);
  assert.equal(effortLeaves.length, 3);
  assert.ok(effortLeaves.every((leaf) => leaf.effortEstimate?.basis === "mock"));
  assert.equal(effortLeaves.reduce((total, leaf) => total + leaf.effortEstimate!.minutes!, 0), 420);
  assert.ok(events.every((event) => event.source === "example" && event.parentTaskId === task.id));
  assert.deepEqual(history.points.map((point) => [point.at, point.scopeHours, point.completedHours, point.totalLeafCount]), [
    ["2026-08-29", 5, 0, 2],
    ["2026-08-30", 5, 0, 2],
    ["2026-08-31", 7, 2, 3],
    ["2026-09-01", 7, 2, 3],
  ]);
  assert.deepEqual(createWorkspaceTaskDetail(task).burnUp, history);
});

test("叶子和无历史的其他父任务不生成曲线，未知任务不借用其他范围的演示事件", () => {
  for (const taskId of ["fragrance-final-decision", "fragrance-creator-business", "product-launch-planning", "unknown", "__proto__"]) {
    assert.equal(getTaskProgressBurnUp(taskId), undefined);
  }
  assert.deepEqual(getTaskProgressEvents("product-launch-planning"), []);
  assert.deepEqual(getTaskProgressEvents("unknown"), []);
  assert.deepEqual(getTaskProgressEvents("__proto__"), []);
});

test("独立读取与当前状态修改不会改写演示事件或过去快照", () => {
  const originalEvents = getTaskProgressEvents(parentId);
  const originalHistory = getTaskProgressBurnUp(parentId);
  const copiedEvents = getTaskProgressEvents(parentId);
  const copiedHistory = getTaskProgressBurnUp(parentId)!;
  copiedEvents[0].ewdHours = 999;
  copiedEvents[0].note = "消费者临时修改";
  copiedHistory.points[0].scopeHours = 999;
  assert.deepEqual(getTaskProgressEvents(parentId), originalEvents);
  assert.deepEqual(getTaskProgressBurnUp(parentId), originalHistory);

  const leaf = workspaceNodes.find((task): task is TaskNode => task.kind === "task" && task.id === "fragrance-content")!;
  const originalStatus = leaf.status;
  try {
    leaf.status = "已完成";
    assert.deepEqual(getTaskProgressEvents(parentId), originalEvents);
    assert.deepEqual(getTaskProgressBurnUp(parentId), originalHistory);
  } finally {
    leaf.status = originalStatus;
  }
});
