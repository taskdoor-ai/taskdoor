import assert from "node:assert/strict";
import test from "node:test";
import {
  filterOverviewTasks,
  getAttentionTaskIds,
  getCanvasTaskPresentation,
  getCyclicTaskIds,
  getDependencyLevelByTaskId,
  getFocusedTaskIds,
  getMostRecentlyUpdatedTask,
  getOverviewInsightCandidateIds,
  getSubtaskProgressJudgment,
  getVisibleDependencyEdges,
  isCanvasRelationshipActive,
  type OverviewTask,
} from "../src/lib/taskOverview.ts";

const tasks: OverviewTask[] = [
  { dependsOnTaskIds: [], id: "research", owner: "陈默", status: "已完成" },
  { dependsOnTaskIds: ["research"], id: "content", owner: "林洁", status: "进行中" },
  { dependsOnTaskIds: ["content"], id: "live", owner: "高远", status: "待开始" },
  { dependsOnTaskIds: [], id: "inventory", owner: "梁川", status: "进行中" },
];

test("概览筛选同时遵循负责人和正式任务状态", () => {
  assert.deepEqual(
    filterOverviewTasks(tasks, { owner: "林洁", status: "进行中" }).map((task) => task.id),
    ["content"],
  );
  assert.deepEqual(
    filterOverviewTasks(tasks, { owner: "all", status: "进行中" }).map((task) => task.id),
    ["content", "inventory"],
  );
});

test("画布聚焦范围包含选中任务所在的完整依赖链路", () => {
  assert.deepEqual([...getFocusedTaskIds(tasks, "research")].sort(), ["content", "live", "research"]);
  assert.deepEqual([...getFocusedTaskIds(tasks, null)].sort(), tasks.map((task) => task.id).sort());
});

test("子任务推进判断优先指出未完成前置及可执行入口", () => {
  const judgmentTasks: OverviewTask[] = [
    { id: "source-a", owner: "陈默", status: "进行中", title: "脚本终审" },
    { id: "source-b", owner: "林洁", status: "已完成", title: "场控清单" },
    { dependsOnTaskIds: ["source-a", "source-b"], id: "current", owner: "高远", status: "进行中", title: "直播彩排" },
  ];

  assert.deepEqual(getSubtaskProgressJudgment(judgmentTasks, "current"), {
    action: { label: "查看前置任务", target: "task", taskId: "source-a" },
    condition: "还有 1 项前置未完成",
    detail: "「脚本终审」尚未完成，会影响当前任务继续推进。",
    headline: "当前任务暂时受阻，需先完成「脚本终审」",
    status: "进行中",
  });
});

test("子任务推进判断覆盖可开始、待审核、完成和取消状态", () => {
  const taskWithStatus = (status: string): OverviewTask[] => [
    { id: "source", owner: "陈默", status: "已完成", title: "脚本终审" },
    { dependsOnTaskIds: ["source"], id: "current", owner: "高远", status, title: "直播彩排" },
  ];

  assert.match(getSubtaskProgressJudgment(taskWithStatus("待开始"), "current")?.headline ?? "", /前置条件已满足/);
  assert.deepEqual(getSubtaskProgressJudgment(taskWithStatus("待审核"), "current")?.action, { label: "查看审核活动", target: "activity" });
  assert.match(getSubtaskProgressJudgment(taskWithStatus("已完成"), "current")?.headline ?? "", /结果可供后续任务/);
  assert.match(getSubtaskProgressJudgment(taskWithStatus("已取消"), "current")?.headline ?? "", /已取消/);
});

test("子任务 AI 洞察范围只包含当前任务", () => {
  assert.deepEqual(getOverviewInsightCandidateIds(tasks, "subtask", "content"), ["content"]);
  assert.deepEqual(getOverviewInsightCandidateIds(tasks, "main", "content"), tasks.map((task) => task.id));
  assert.deepEqual(getOverviewInsightCandidateIds(tasks, "subtask", "missing"), []);
});

test("汇合链路不会把同级分支误判为当前任务的相关节点", () => {
  const convergingTasks: OverviewTask[] = [
    { id: "a", owner: "陈默", status: "进行中" },
    { id: "b", owner: "林洁", status: "进行中" },
    { dependsOnTaskIds: ["a", "b"], id: "c", owner: "高远", status: "待开始" },
    { dependsOnTaskIds: ["c"], id: "d", owner: "梁川", status: "待开始" },
  ];

  assert.deepEqual([...getFocusedTaskIds(convergingTasks, "a")].sort(), ["a", "c", "d"]);
  assert.deepEqual([...getFocusedTaskIds(convergingTasks, "b")].sort(), ["b", "c", "d"]);
  assert.deepEqual([...getFocusedTaskIds(convergingTasks, "c")].sort(), ["a", "b", "c", "d"]);
});

test("画布聚焦不会替换节点集合，只强调选中任务所在的完整链路", () => {
  const presentation = getCanvasTaskPresentation(tasks, "research");

  assert.deepEqual(presentation.tasks.map((task) => task.id), tasks.map((task) => task.id));
  assert.deepEqual([...presentation.emphasizedTaskIds].sort(), ["content", "live", "research"]);
});

test("选中任务后整条相关链路继续流转，未选中时全部流转", () => {
  const emphasizedTaskIds = getCanvasTaskPresentation(tasks, "research").emphasizedTaskIds;

  assert.equal(isCanvasRelationshipActive({ from: "research", to: "content" }, emphasizedTaskIds, "content"), true);
  assert.equal(isCanvasRelationshipActive({ from: "content", to: "live" }, emphasizedTaskIds, "content"), true);
  assert.equal(isCanvasRelationshipActive({ from: "inventory", to: "other" }, emphasizedTaskIds, "content"), false);
  assert.equal(isCanvasRelationshipActive({ from: "inventory", to: "other" }, emphasizedTaskIds, null), true);
});

test("画布只为当前可见任务之间的真实依赖生成连线", () => {
  assert.deepEqual(getVisibleDependencyEdges(tasks, new Set(["research", "content", "inventory"])), [
    { from: "research", to: "content" },
  ]);
});

test("缺失和自引用依赖不会虚增关注数或生成连线", () => {
  const invalidDependencies: OverviewTask[] = [
    { dependsOnTaskIds: ["missing", "self"], id: "self", owner: "周岚", status: "进行中" },
  ];
  assert.deepEqual([...getAttentionTaskIds(invalidDependencies)], []);
  assert.deepEqual(getVisibleDependencyEdges(invalidDependencies, new Set(["self"])), []);
});

test("关注任务按阻塞与未完成前置的去重并集计算", () => {
  const attentionTasks: OverviewTask[] = [
    { id: "source", owner: "陈默", status: "进行中" },
    { dependsOnTaskIds: ["source"], id: "blocked", owner: "林洁", status: "已阻塞" },
    { id: "other-blocked", owner: "高远", status: "已阻塞" },
  ];
  assert.deepEqual([...getAttentionTaskIds(attentionTasks)].sort(), ["blocked", "other-blocked"]);
});

test("最近更新按相对时间而不是数组顺序选择", () => {
  const updatedTasks: OverviewTask[] = [
    { id: "older", owner: "陈默", status: "进行中", updatedAt: "20 分钟前" },
    { id: "newer", owner: "林洁", status: "进行中", updatedAt: "10 分钟前" },
  ];
  assert.equal(getMostRecentlyUpdatedTask(updatedTasks)?.id, "newer");
});

test("循环依赖降级为同层异常，不生成相互冲突的箭头", () => {
  const cyclicTasks: OverviewTask[] = [
    { dependsOnTaskIds: ["b"], id: "a", owner: "陈默", status: "进行中" },
    { dependsOnTaskIds: ["a"], id: "b", owner: "林洁", status: "进行中" },
  ];
  assert.deepEqual([...getCyclicTaskIds(cyclicTasks)].sort(), ["a", "b"]);
  assert.deepEqual(getVisibleDependencyEdges(cyclicTasks, new Set(["a", "b"])), []);
  assert.equal(getDependencyLevelByTaskId(cyclicTasks).get("a"), getDependencyLevelByTaskId(cyclicTasks).get("b"));
});

test("不同循环组件之间保留真实依赖，并按收缩后的关系分层", () => {
  const tasksWithTwoCycles: OverviewTask[] = [
    { dependsOnTaskIds: ["b"], id: "a", owner: "陈默", status: "进行中" },
    { dependsOnTaskIds: ["a"], id: "b", owner: "林洁", status: "进行中" },
    { dependsOnTaskIds: ["d", "a"], id: "c", owner: "高远", status: "进行中" },
    { dependsOnTaskIds: ["c"], id: "d", owner: "梁川", status: "进行中" },
  ];
  assert.deepEqual(getVisibleDependencyEdges(tasksWithTwoCycles, new Set(tasksWithTwoCycles.map((task) => task.id))), [{ from: "a", to: "c" }]);
  const levels = getDependencyLevelByTaskId(tasksWithTwoCycles);
  assert.equal(levels.get("a"), levels.get("b"));
  assert.equal(levels.get("c"), levels.get("d"));
  assert.equal((levels.get("c") ?? 0) > (levels.get("a") ?? 0), true);
});

test("循环组件共享外部前置层级", () => {
  const cycleWithExternalDependency: OverviewTask[] = [
    { id: "source", owner: "陈默", status: "已完成" },
    { dependsOnTaskIds: ["b", "source"], id: "a", owner: "林洁", status: "进行中" },
    { dependsOnTaskIds: ["a"], id: "b", owner: "高远", status: "进行中" },
  ];
  const levels = getDependencyLevelByTaskId(cycleWithExternalDependency);
  assert.equal(levels.get("a"), levels.get("b"));
  assert.equal((levels.get("a") ?? 0) > (levels.get("source") ?? 0), true);
});

test("已完成与已取消任务不会继续显示等待前置或进入关注数", () => {
  const terminalTasks: OverviewTask[] = [
    { id: "source", owner: "陈默", status: "进行中" },
    { dependsOnTaskIds: ["source"], id: "cancelled", owner: "林洁", status: "已取消" },
    { dependsOnTaskIds: ["source"], id: "completed", owner: "高远", status: "已完成" },
  ];
  assert.deepEqual([...getAttentionTaskIds(terminalTasks)], []);
});
