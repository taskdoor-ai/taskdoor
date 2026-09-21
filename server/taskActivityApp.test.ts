import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createWorkspaceTaskDetail } from "../src/data/taskDetailMocks.ts";
import { normalizeWorkspaceNodes, workspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import { appendTaskActivity, createTaskChangeActivity, parseTaskActivityStore } from "../src/lib/taskActivity.ts";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("本地任务记录使用独立存储并保留原始示例记录", () => {
  assert.match(app, /taskActivityStorageKey = "agentdoor-task-activity"/);
  assert.match(app, /parseTaskActivityStore\(loadStoredValue<unknown>\(taskActivityStorageKey, \{\}\)\)/);
  assert.match(app, /taskDetailSeedNodes/);
  assert.match(app, /createWorkspaceTaskDetail\(selectedTaskSeedNode \?\? selectedTreeTask\)/);
  assert.match(app, /seedActivityIds\.has\(activity\.id\)/);
});

test("详情与列表使用相同状态更新入口且无变化不写记录", () => {
  assert.match(app, /const changeTaskStatus = \(taskId: string, status: TaskNode\["status"\]\)/);
  assert.match(app, /task\.status === status\) return/);
  assert.match(app, /before: task\.status, after: status/);
  assert.match(app, /onTaskStatusChange=\{selectedTreeTask\?\.kind === "task" \? \(status\) => \{\s*changeTaskStatus\(selectedTaskId, status\);/);
  assert.match(app, /changeTaskStatus\(selectedTaskId, status\)/);
  assert.doesNotMatch(app, /setWorkspaceNodes\(\([^)]*\) =>[\s\S]*?createTaskChangeActivity[\s\S]*?\}\);/);
});

test("每种详情字段修改均有具体动作日志", () => {
  for (const type of ["title-change", "goal-change", "schedule-change", "tags-change", "appearance-change", "owner-change", "participants-change"]) {
    assert.ok(app.includes(`"${type}"`), `缺少字段变更记录：${type}`);
  }
  assert.match(app, /createTaskChangeActivity\(\{ author: currentUserName/);
  assert.match(app, /onActivityAppend=\{\(activity\) => appendActivityForTask\(selectedTaskId, activity\)\}/);
});

test("负责人和参与人修改直接生效并记录正式变更", () => {
  assert.doesNotMatch(app, /负责人变更邀请|待接受/);
  assert.match(app, /修改任务负责人/);
  assert.match(app, /新增参与人/);
  assert.match(app, /移除参与人/);
  const ownerHandler = app.slice(app.indexOf("const changeOwner ="), app.indexOf("const changeParticipants ="));
  assert.match(ownerHandler, /changeTaskFields\(task\.id, \{ ownerId \}/);
});

test("详情重新进入时读取最新参与人和期限投影", () => {
  assert.match(app, /selectedLegacyTask\?\.participants \?\? selectedTreeTask\.participantIds \?\? selectedTaskDetailBase\.participants/);
  assert.match(app, /selectedTreeTask\.dueAt \?\? selectedTaskDetailBase\.due/);
  assert.match(app, /participantInvitationStatus: selectedParticipantInvitationStatus/);
});

test("App 不恢复旧概览或关系面板，向当前情况传入真实依赖", () => {
  assert.doesNotMatch(app, /getTaskOverviewProjection|selectedOverviewProjection|overviewTasks=|overviewRole=/);
  assert.doesNotMatch(app, /dependentTasks=|parentTask=\{/);
  assert.match(app, /dependencyTasks=\{selectedDependencyTasks\}/);
  assert.match(app, /dependencyTaskIds=\{selectedDependencyTaskIds\}/);
  assert.match(app, /childTasks=\{selectedChildTasks\}/);
  assert.match(app, /pathItems=\{selectedTaskPath\}/);
});

test("主动清空目标后刷新仍为空，并与持久化变更的未设置一致", () => {
  const task = workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "product-launch-planning");
  assert.ok(task);
  const seed = createWorkspaceTaskDetail(task);
  const event = createTaskChangeActivity({ author: "周岚", type: "goal-change", message: "修改任务目标", changes: [{ label: "任务目标", before: seed.goal, after: null }] });
  assert.ok(event);
  const storedTask = JSON.parse(JSON.stringify([{ ...task, goal: "" }]));
  const restored = normalizeWorkspaceNodes(storedTask).find((node): node is TaskNode => node.kind === "task" && node.id === task.id);
  assert.ok(restored);
  const restoredHeadingGoal = restored.goal ?? seed.goal;
  assert.equal(restoredHeadingGoal, "", "主动清空不能在刷新后回退成原目标");
  const activities = parseTaskActivityStore(JSON.stringify(appendTaskActivity({}, task.id, event)));
  assert.equal(activities[task.id][0].changes?.[0].after, restoredHeadingGoal || null);
});

test("归一仍区分未提供目标与显式空目标，不为缺失字段补造值", () => {
  const source = workspaceNodes.find((node): node is TaskNode => node.kind === "task");
  assert.ok(source);
  const { goal: _goal, ...withoutGoal } = source;
  const restored = normalizeWorkspaceNodes([withoutGoal]).find((node): node is TaskNode => node.kind === "task" && node.id === source.id);
  assert.ok(restored);
  assert.equal(Object.hasOwn(restored, "goal"), false);
});
