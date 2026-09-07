import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskWorkloadSummary } from "../src/components/TaskWorkloadSummary.tsx";
import { unassignedTaskFixtures } from "../src/data/unassignedTaskFixtures.ts";
import { createManualEffortEstimate, getTaskEffortState } from "../src/lib/taskEffort.ts";
import { getWorkspaceEffortLeaves } from "../src/lib/taskEffortEditing.ts";
import { getTaskProgressAssessment } from "../src/lib/taskProgressAssessment.ts";
import { commitWorkspaceScenarioReset, creatorCommerceScenarioVersion, resolveWorkspaceScenarioReset } from "../src/lib/workspaceScenarioReset.ts";
import type { TaskNode } from "../src/data/workspaceNodes.ts";

const legacyTasks = () => unassignedTaskFixtures.map(({ effortEstimate: _estimate, ...task }) => task);
const migrate = (nodes: unknown) => resolveWorkspaceScenarioReset({ storedVersion: "multi-team-v17-unassigned-tasks", storedWorkspaceNodes: nodes, storedTags: [] });

test("五个未分配示例均有独立于人员的范围估算，待开始任务计算为 0%", () => {
  assert.equal(unassignedTaskFixtures.length, 5);
  for (const task of unassignedTaskFixtures) {
    assert.equal(task.ownerId, "");
    assert.equal(task.effortEstimate?.basis, "mock");
    assert.equal(getTaskEffortState(task), "proposed");
    const assessment = getTaskProgressAssessment(undefined, getWorkspaceEffortLeaves(unassignedTaskFixtures, task.id));
    assert.equal(assessment.state, "zero");
    assert.equal(assessment.progressRatio, 0);
    assert.equal(assessment.scopeHours, task.effortEstimate!.minutes! / 60);
    assert.equal(assessment.hasTrend, false);
  }
  const task = unassignedTaskFixtures.find((item) => item.id === "unassigned-live-backup-plan")!;
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary, { effortTasks: getWorkspaceEffortLeaves(unassignedTaskFixtures, task.id) }));
  assert.match(html, /预计投入 0.5 人天/);
  assert.match(html, /aria-valuenow="0"/);
  assert.doesNotMatch(html, /暂不可计算|工作量未知|尚无可用的范围 EWD 记录|task-burnup-chart/);
});

test("清空负责人和参与人不改变已有估算，未分配叶子也纳入父级合计", () => {
  const leaves = unassignedTaskFixtures;
  const assigned = leaves.map((task) => ({ ...task, ownerId: "陈默", participantIds: ["周岚"] }));
  const withoutPeople = assigned.map((task) => ({ ...task, ownerId: "", participantIds: [] }));
  assert.deepEqual(getTaskProgressAssessment(undefined, assigned), getTaskProgressAssessment(undefined, withoutPeople));
  const root: TaskNode = { ...leaves[0], id: "test-parent", name: "汇总任务", goal: leaves[0].goal, effortEstimate: undefined };
  const children = [withoutPeople[0], { ...withoutPeople[0], id: "second", ownerId: "陈默" }].map((task) => ({ ...task, parentTaskId: root.id }));
  const assessment = getTaskProgressAssessment(undefined, getWorkspaceEffortLeaves([root, ...children], root.id));
  assert.equal(assessment.estimatedLeafCount, 2);
  assert.equal(assessment.scopeHours, leaves[0].effortEstimate!.minutes! * 2 / 60);
});

test("v17 只补旧示例缺失的估算，保留人员编辑、删除和所有本地历史存储", () => {
  const stored = legacyTasks().slice(0, 4).map((task) => ({ ...task, ownerId: "韩序", participantIds: [], name: `${task.name}（已改名）` }));
  const result = migrate(stored);
  assert.equal(result.version, "multi-team-v18-unassigned-effort");
  assert.equal(result.didReset, false);
  assert.equal(result.didMigrate, true);
  const tasks = result.workspaceNodes.filter((item): item is TaskNode => item.kind === "task");
  assert.equal(tasks.length, 4, "不能复活已删除任务");
  for (const task of tasks) {
    const original = stored.find((item) => item.id === task.id)!;
    assert.deepEqual({ ...task, effortEstimate: undefined }, { ...original, effortEstimate: undefined });
    assert.equal(getTaskEffortState(task), "proposed");
  }
  const removed: string[] = [];
  assert.equal(commitWorkspaceScenarioReset({ setItem() {}, removeItem(key) { removed.push(key); } }, result, {
    workspaceNodesKey: "nodes", tagsKey: "tags", versionKey: "version", legacyKeys: ["activity", "file-edits", "task-seeds"],
  }), true);
  assert.deepEqual(removed, []);
  const again = resolveWorkspaceScenarioReset({ storedVersion: creatorCommerceScenarioVersion, storedWorkspaceNodes: result.workspaceNodes, storedTags: result.tags });
  assert.equal(again.didMigrate, undefined);
  assert.deepEqual(again.workspaceNodes, result.workspaceNodes);
});

test("升级不覆盖手工估算、显式清空、修改范围或已有子任务，也不估算任意用户任务", () => {
  const originals = legacyTasks();
  const manual = createManualEffortEstimate(originals[0], { minutes: 75, workMethod: "人工核对", reason: "已缩小样本" });
  const stored = [
    { ...originals[0], effortEstimate: manual },
    { ...originals[1], effortEstimate: null },
    { ...originals[2], goal: "不同的工作范围" },
    { ...originals[3], parentTaskId: originals[2].id },
    originals[4],
    { ...originals[0], id: "custom-child", parentTaskId: originals[4].id },
    { ...originals[0], id: "custom-unassigned" },
  ];
  const tasks = migrate(stored).workspaceNodes.filter((item): item is TaskNode => item.kind === "task");
  assert.equal(tasks.length, stored.length);
  assert.deepEqual(tasks.find((item) => item.id === originals[0].id)!.effortEstimate, manual);
  assert.ok(tasks.filter((item) => item.id !== originals[0].id).every((item) => item.effortEstimate === undefined));
});

test("真正缺少估算仍不伪装成 0%，但不再展示重复的工作量未知提示", () => {
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary, { effortTasks: [] }));
  assert.match(html, /暂不可计算/);
  assert.match(html, /预计投入 待估算/);
  assert.match(html, /暂无趋势/);
  assert.doesNotMatch(html, /工作量未知|尚无可用的范围 EWD 记录|task-burnup-state/);
  assert.doesNotMatch(html, /aria-valuenow="0"/);
});
