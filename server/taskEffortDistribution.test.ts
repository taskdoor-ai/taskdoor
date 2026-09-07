import assert from "node:assert/strict";
import test from "node:test";
import { getEffortScopeKey, type TaskEffortEstimate } from "../src/lib/taskEffort.ts";
import { getTaskEffortDistribution, type TaskEffortDistributionInput } from "../src/lib/taskEffortDistribution.ts";

const scope = { goal: "交付可复核结果", completionCriteria: ["核对结果与原始资料"], executionTips: ["先检查原始资料"] };
const workMethod = "工具辅助整理，人工核对";

function task(id: string, minutes: number | null, overrides: Partial<TaskEffortEstimate> = {}): TaskEffortDistributionInput {
  return {
    ...scope, id, title: `交付 ${id}`,
    effortEstimate: {
      minutes, workMethod, basis: "model", reason: "包含准备、校验和修订的人类投入",
      confirmed: false, version: 1, scopeKey: getEffortScopeKey(scope, workMethod), ...overrides,
    },
  };
}

test("2小时与18小时按人类投入占10%与90%，系统候选不要求手工确认", () => {
  const result = getTaskEffortDistribution([task("a", 120), task("b", 1080, { confirmed: true })]);
  assert.equal(result.state, "available");
  assert.equal(result.totalMinutes, 1200);
  assert.equal(result.knownMinutes, 1200);
  assert.equal(result.estimatedCount, 2);
  assert.equal(result.totalCount, 2);
  assert.deepEqual(result.rows.map(row => [row.id, row.minutes, row.share, row.state]), [
    ["a", 120, 0.1, "estimated"], ["b", 1080, 0.9, "estimated"],
  ]);
});

test("存在未知或过期任务时保留已估分钟，但所有整体占比均未知", () => {
  for (const missing of [{ id: "b" }, task("b", null), { ...task("b", 1080), goal: "范围已改变" }]) {
    const result = getTaskEffortDistribution([task("a", 120), missing]);
    assert.equal(result.state, "partial");
    assert.equal(result.totalMinutes, null);
    assert.equal(result.knownMinutes, 120);
    assert.equal(result.estimatedCount, 1);
    assert.equal(result.totalCount, 2);
    assert.deepEqual(result.rows.map(row => row.share), [null, null]);
    assert.equal(result.rows[1].minutes, null);
  }
  const stale = getTaskEffortDistribution([{ ...task("b", 1080), goal: "范围已改变" }]);
  assert.equal(stale.state, "stale");
  assert.equal(stale.rows[0].state, "stale");
  assert.equal(stale.knownMinutes, 0);
  assert.equal(stale.rows[0].share, null);
});

test("详情排除手填和Mock但保留覆盖分母，创建可查看三种有效来源", () => {
  const tasks = [task("model", 60), task("manual", 120, { basis: "manual", confirmed: true }), task("mock", 180, { basis: "mock" })];
  const detail = getTaskEffortDistribution(tasks);
  assert.equal(detail.state, "partial");
  assert.equal(detail.knownMinutes, 60);
  assert.equal(detail.totalCount, 3);
  assert.equal(detail.estimatedCount, 1);
  assert.equal(detail.hasMock, true);
  assert.equal(detail.hasManual, true);
  assert.deepEqual(detail.rows.map(row => [row.source, row.state, row.minutes, row.share]), [
    ["model", "estimated", 60, null], ["manual", "unknown", null, null], ["mock", "unknown", null, null],
  ]);
  const creation = getTaskEffortDistribution(tasks, "creation");
  assert.equal(creation.state, "available");
  assert.equal(creation.totalMinutes, 360);
  assert.deepEqual(creation.rows.map(row => row.share), [1 / 6, 1 / 3, 1 / 2]);
  assert.equal(getTaskEffortDistribution(tasks.slice(1)).state, "unavailable");
  assert.equal(getTaskEffortDistribution([{ ...tasks[1], goal: "范围变化" }]).state, "unavailable");
});

test("示例模式只采用有效的系统与Mock估算，手填估算仍不可用", () => {
  const mock = getTaskEffortDistribution([task("mock", 180, { basis: "mock" })], "example");
  assert.equal(mock.state, "available");
  assert.equal(mock.totalMinutes, 180);
  assert.equal(mock.knownMinutes, 180);
  assert.equal(mock.estimatedCount, 1);
  assert.equal(mock.hasMock, true);
  assert.deepEqual(mock.rows.map(row => [row.source, row.state, row.minutes, row.share]), [
    ["mock", "estimated", 180, 1],
  ]);

  const modelAndMock = getTaskEffortDistribution([task("model", 60), task("mock", 180, { basis: "mock" })], "example");
  assert.equal(modelAndMock.state, "available");
  assert.equal(modelAndMock.totalMinutes, 240);
  assert.deepEqual(modelAndMock.rows.map(row => [row.source, row.state, row.minutes, row.share]), [
    ["model", "estimated", 60, 0.25],
    ["mock", "estimated", 180, 0.75],
  ]);

  const manual = getTaskEffortDistribution([task("manual", 120, { basis: "manual", confirmed: true })], "example");
  assert.equal(manual.state, "unavailable");
  assert.equal(manual.totalMinutes, null);
  assert.equal(manual.knownMinutes, 0);
  assert.equal(manual.estimatedCount, 0);
  assert.equal(manual.hasManual, true);
  assert.deepEqual(manual.rows.map(row => [row.source, row.state, row.minutes, row.share]), [
    ["manual", "unknown", null, null],
  ]);
});

test("已确认零和系统候选零都是有效估算，总量零不产生占比", () => {
  const result = getTaskEffortDistribution([task("zero", 0, { confirmed: true }), task("proposal", 0)]);
  assert.equal(result.state, "available");
  assert.equal(result.totalMinutes, 0);
  assert.equal(result.estimatedCount, 2);
  assert.deepEqual(result.rows.map(row => [row.minutes, row.share]), [[0, null], [0, null]]);
  assert.deepEqual(getTaskEffortDistribution([task("zero", 0), task("one", 1)]).rows.map(row => row.share), [0, 1]);
  const partial = getTaskEffortDistribution([task("zero", 0), { id: "missing" }]);
  assert.equal(partial.state, "partial");
  assert.equal(partial.totalMinutes, null);
  assert.deepEqual(partial.rows.map(row => row.share), [null, null]);
});

test("无记录、未知来源及缺少依据不伪造工时或占比", () => {
  assert.equal(getTaskEffortDistribution([]).state, "unavailable");
  assert.equal(getTaskEffortDistribution([]).totalMinutes, null);
  for (const value of [{ id: "empty" }, task("unknown", 120, { basis: "unknown" }), task("reason", 120, { reason: " " }), task("method", 120, { workMethod: "" })]) {
    const result = getTaskEffortDistribution([value], "creation");
    assert.equal(result.state, "unavailable");
    assert.equal(result.estimatedCount, 0);
    assert.equal(result.totalCount, 1);
    assert.equal(result.rows[0].minutes, null);
    assert.equal(result.rows[0].share, null);
  }
});

test("非法分钟、来源或版本使分布无效，不以剩余好记录给出百分比", () => {
  const badEstimates: Partial<TaskEffortEstimate>[] = [
    ...[-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(minutes => ({ minutes })),
    { version: 0 }, { version: Number.MAX_SAFE_INTEGER + 1 },
    { basis: "invented" as TaskEffortEstimate["basis"] },
  ];
  for (const estimate of badEstimates) {
    const result = getTaskEffortDistribution([task("valid", 120), task("invalid", 60, estimate)]);
    assert.equal(result.state, "invalid");
    assert.equal(result.totalMinutes, null);
    assert.equal(result.knownMinutes, 0);
    assert.equal(result.totalCount, 2);
    assert.deepEqual(result.rows, []);
  }
});

test("安全整数边界可计算，合计溢出返回无效且不抛异常", () => {
  const safe = getTaskEffortDistribution([task("max", Number.MAX_SAFE_INTEGER)]);
  assert.equal(safe.state, "available");
  assert.equal(safe.totalMinutes, Number.MAX_SAFE_INTEGER);
  assert.equal(safe.rows[0].share, 1);
  const overflow = getTaskEffortDistribution([task("max", Number.MAX_SAFE_INTEGER), task("one", 1)]);
  assert.equal(overflow.state, "invalid");
  assert.equal(overflow.totalMinutes, null);
  assert.equal(overflow.knownMinutes, 0);
  assert.deepEqual(overflow.rows, []);
});

test("重复任务或草稿ID拒绝汇总，无ID旧记录仅获得唯一展示key", () => {
  for (const tasks of [
    [task("duplicate", 60), task("duplicate", 120)],
    [{ ...task("", 60), clientId: "draft" }, { ...task("", 120), clientId: "draft" }],
    [task("shared", 60), { ...task("", 120), clientId: "shared" }],
  ]) assert.equal(getTaskEffortDistribution(tasks).state, "invalid");
  const tasks = [task("effort-index-1", 60), { ...task("", 120), title: "", name: "旧任务" }, { ...task("", 180), clientId: "draft", title: "草稿任务" }];
  const before = structuredClone(tasks);
  const result = getTaskEffortDistribution(tasks);
  assert.equal(result.state, "available");
  assert.equal(new Set(result.rows.map(row => row.id)).size, 3);
  assert.equal(result.rows[2].id, "draft");
  assert.deepEqual(result.rows.map(row => row.title), ["交付 effort-index-1", "旧任务", "草稿任务"]);
  assert.deepEqual(tasks, before);
  result.rows[0].minutes = 5;
  assert.deepEqual(tasks, before, "改动输出不能污染原始估算");
});
