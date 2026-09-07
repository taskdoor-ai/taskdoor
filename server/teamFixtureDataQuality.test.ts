import assert from "node:assert/strict";
import test from "node:test";
import { multiTeamTags, teamWorkspaceScenarios } from "../src/data/teamWorkspaceScenarios.ts";
import type { TaskNode } from "../src/data/workspaceNodes.ts";

const tasksOf = (nodes: typeof teamWorkspaceScenarios[number]["nodes"]) =>
  nodes.filter((node): node is TaskNode => node.kind === "task");

const taskStatusLabels = new Set(["待开始", "进行中", "待审核", "已完成", "已阻塞", "已取消"]);
const statusesThatRequireStart = new Set<TaskNode["status"]>(["进行中", "待审核", "已阻塞", "已完成"]);

test("全量团队 fixture 不把任务状态重复写入业务标签", () => {
  const conflicts = teamWorkspaceScenarios.flatMap((scenario) =>
    tasksOf(scenario.nodes).flatMap((task) => {
      const duplicated = task.labels?.filter((label) => taskStatusLabels.has(label)) ?? [];
      return duplicated.length ? [`${scenario.id}/${task.id}: ${duplicated.join(", ")}`] : [];
    }),
  );

  assert.deepEqual(conflicts, []);
});

test("团队业务标签目录不提供任务状态标签", () => {
  assert.deepEqual(
    multiTeamTags.flatMap((definition) => taskStatusLabels.has(definition.name) ? [definition.name] : []),
    [],
  );
});

test("全量团队 fixture 中已进入执行流程的任务不会晚于分析日才计划开始", () => {
  const conflicts = teamWorkspaceScenarios.flatMap((scenario) => {
    const analysisDay = scenario.asOf.slice(0, 10);
    return tasksOf(scenario.nodes).flatMap((task) =>
      statusesThatRequireStart.has(task.status) && task.plannedStartOn && task.plannedStartOn > analysisDay
        ? [`${scenario.id}/${task.id}: ${task.status}, ${task.plannedStartOn} > ${analysisDay}`]
        : [],
    );
  });

  assert.deepEqual(conflicts, []);
});

test("团队 fixture 覆盖无固定期限任务，不为持续工作强造日期", () => {
  const withoutDeadline = teamWorkspaceScenarios.flatMap((scenario) =>
    tasksOf(scenario.nodes).filter((task) => !task.dueAt && !task.plannedStartOn && !task.plannedEndOn),
  );

  assert.ok(withoutDeadline.some((task) => task.id === "ccx-creator-collaboration-handbook"));
});
