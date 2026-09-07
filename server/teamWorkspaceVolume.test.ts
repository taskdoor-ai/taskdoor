import assert from "node:assert/strict";
import test from "node:test";
import {
  teamWorkspaceScenarios,
  validateTeamWorkspaceScenarios,
} from "../src/data/teamWorkspaceScenarios.ts";
import { createWorkspaceTaskDetail } from "../src/data/taskDetailMocks.ts";
import { getTeamTaskDetailFixture } from "../src/data/teamTaskDetailFixtures.ts";
import { getTaskEffortState } from "../src/lib/taskEffort.ts";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import { getTaskSituationExample } from "../src/data/taskSituationExamples.ts";

const tasksOf = (nodes: typeof teamWorkspaceScenarios[number]["nodes"]) =>
  nodes.filter((node): node is TaskNode => node.kind === "task");

const depthOf = (task: TaskNode, byId: Map<string, TaskNode>) => {
  let depth = 0;
  let cursor = task;
  const seen = new Set<string>();
  while (cursor.parentTaskId && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    const parent = byId.get(cursor.parentTaskId);
    if (!parent) break;
    depth += 1;
    cursor = parent;
  }
  return depth;
};

test("扩展工作区至少提供 160 个任务，且每个团队都有足够浏览密度", () => {
  const counts = teamWorkspaceScenarios.map((scenario) => tasksOf(scenario.nodes).length);
  assert.ok(counts.every((count) => count >= 40), `每团队至少 40 项，当前为 ${counts.join("/")}`);
  assert.ok(counts.reduce((sum, count) => sum + count, 0) >= 160);
  assert.deepEqual(validateTeamWorkspaceScenarios().issues, []);
});

test("每个团队同时覆盖多个项目树、三级层级和独立日常任务", () => {
  for (const scenario of teamWorkspaceScenarios) {
    const tasks = tasksOf(scenario.nodes);
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const parentIds = new Set(tasks.flatMap((task) => task.parentTaskId ? [task.parentTaskId] : []));
    const projectRoots = tasks.filter((task) => !task.parentTaskId && parentIds.has(task.id));
    const independentTasks = tasks.filter((task) => !task.parentTaskId && !parentIds.has(task.id));
    assert.ok(projectRoots.length >= 3, `${scenario.id} 至少需要 3 棵项目树`);
    assert.ok(independentTasks.length >= 4, `${scenario.id} 至少需要 4 项独立工作`);
    assert.ok(Math.max(...tasks.map((task) => depthOf(task, byId))) >= 2, `${scenario.id} 需要三级任务层级`);
  }
});

test("任务集具有可用的状态、责任、排期、估算与依赖分布", () => {
  for (const scenario of teamWorkspaceScenarios) {
    const tasks = tasksOf(scenario.nodes);
    const parentIds = new Set(tasks.flatMap((task) => task.parentTaskId ? [task.parentTaskId] : []));
    const leaves = tasks.filter((task) => !parentIds.has(task.id));
    const statuses = new Set(tasks.map((task) => task.status));
    const owners = new Set(tasks.map((task) => task.ownerId));
    const scheduled = tasks.filter((task) => task.plannedStartOn && task.plannedEndOn);
    const fullyDescribed = tasks.filter((task) => task.goal?.trim() && task.completionCriteria?.length && task.executionTips?.length);
    const estimatedLeaves = leaves.filter((task) => getTaskEffortState(task) !== "unknown");
    const dependencyEdges = tasks.reduce((count, task) => count + (task.dependsOnTaskIds?.length ?? 0), 0);

    assert.ok(statuses.size >= 5, `${scenario.id} 的状态分布不足`);
    assert.ok(owners.size >= 7, `${scenario.id} 的责任分布过于集中`);
    assert.ok(scheduled.length / tasks.length >= 0.7, `${scenario.id} 的排期覆盖不足`);
    assert.ok(fullyDescribed.length / tasks.length >= 0.7, `${scenario.id} 的目标与验收信息覆盖不足`);
    assert.ok(estimatedLeaves.length / leaves.length >= 0.6, `${scenario.id} 的叶子 EWD 覆盖不足`);
    assert.ok(dependencyEdges >= 6, `${scenario.id} 的依赖关系不足`);
  }
});

test("高密度任务没有重复标题或编号占位，并保持成员与关系在团队边界内", () => {
  const allIds = new Set<string>();
  const allTitles = new Set<string>();
  for (const scenario of teamWorkspaceScenarios) {
    const tasks = tasksOf(scenario.nodes);
    const taskIds = new Set(tasks.map((task) => task.id));
    const memberIds = new Set(scenario.members.map((member) => member.id));
    for (const task of tasks) {
      assert.ok(!allIds.has(task.id), `重复 ID：${task.id}`);
      allIds.add(task.id);
      assert.ok(!allTitles.has(task.name), `重复标题：${task.name}`);
      allTitles.add(task.name);
      assert.doesNotMatch(task.name, /(?:任务|事项|子任务|待办)[\s_-]*[0-9一二三四五六七八九十]+$/u);
      assert.ok(task.ownerId === "" || memberIds.has(task.ownerId), `${task.id} 负责人不在团队`);
      assert.ok(task.participantIds?.every((id) => memberIds.has(id)) ?? true, `${task.id} 参与人跨团队`);
      assert.ok(task.dependsOnTaskIds?.every((id) => taskIds.has(id) && id !== task.id) ?? true, `${task.id} 依赖跨团队或指向自身`);
    }
  }
});

test("已完成的数据复盘不再硬依赖进行中的投流任务，同时保留真实下游决策关系", () => {
  const creatorCommerce = teamWorkspaceScenarios.find((scenario) => scenario.id === "creator-commerce");
  assert.ok(creatorCommerce);
  const tasks = tasksOf(creatorCommerce.nodes);
  const dataTask = tasks.find((task) => task.id === "fragrance-data");
  const finalDecision = tasks.find((task) => task.id === "fragrance-final-decision");

  assert.equal(dataTask?.status, "已完成");
  assert.ok(!dataTask?.dependsOnTaskIds?.includes("fragrance-growth"));
  assert.ok(finalDecision?.dependsOnTaskIds?.includes("fragrance-data"));
  assert.doesNotMatch(JSON.stringify(getTaskSituationExample("fragrance-data")), /未完成投流任务|核对依赖关系/);
});

test("任务详情保留协作证据，新建待分配任务没有虚构进展", () => {
  let highDensityDetails = 0;
  let generatedDetails = 0;
  for (const scenario of teamWorkspaceScenarios) {
    for (const task of tasksOf(scenario.nodes)) {
      const highDensity = getTeamTaskDetailFixture(task);
      const detail = highDensity ?? createWorkspaceTaskDetail(task);
      if (highDensity) highDensityDetails += 1; else generatedDetails += 1;
      if (task.createdFrom === "task-editor" && !task.ownerId) {
        assert.equal(detail.owner, "");
        assert.deepEqual(detail.files, []);
        assert.deepEqual(detail.activities, []);
        assert.deepEqual(detail.commits, []);
        continue;
      }
      assert.ok(detail.files.length >= 7, `${task.id} 缺少可浏览文件`);
      assert.ok(detail.activities.length >= 5, `${task.id} 缺少协作动态`);
      assert.ok(detail.commits.length >= 1, `${task.id} 缺少文件提交记录`);
      assert.equal(detail.title, task.name);
      assert.equal(detail.owner, task.ownerId);
    }
  }
  assert.ok(highDensityDetails >= 31, "既有重点任务的高密度证据不能因扩容退化");
  assert.ok(generatedDetails >= 100, "新增长尾任务应通过统一详情契约获得文件与动态");
});
