import assert from "node:assert/strict";
import test from "node:test";
import { getEffortScopeKey, type TaskEffortEstimate } from "../src/lib/taskEffort.ts";
import type { TaskEffortDistributionInput } from "../src/lib/taskEffortDistribution.ts";
import { getTaskProgressAssessment } from "../src/lib/taskProgressAssessment.ts";

const scope = { goal: "交付可核对结果", completionCriteria: ["结果通过核对"], executionTips: [] };
const method = "AI 整理，人工核对";

function effort(id: string, minutes: number, overrides: Partial<TaskEffortEstimate> = {}): TaskEffortDistributionInput {
  return {
    ...scope,
    id,
    title: `当前任务 ${id}`,
    effortEstimate: {
      minutes,
      workMethod: method,
      basis: "model",
      reason: "按当前范围估算",
      confirmed: false,
      scopeKey: getEffortScopeKey(scope, method),
      version: 1,
      ...overrides,
    },
  };
}

test("没有进度记录但已有范围估算时显示总量观察点，完成量仍未知", () => {
  const assessment = getTaskProgressAssessment(undefined, [effort("leaf", 420)]);
  assert.equal(assessment.state, "single");
  assert.equal(assessment.progressRatio, null);
  assert.equal(assessment.scopeHours, 7);
  assert.equal(assessment.completedHours, null);
  assert.equal(assessment.hasTrend, true);
  assert.equal(assessment.burnUp.points.length, 1);
  assert.equal(assessment.burnUp.points[0].scopeHours, 7);
  assert.equal(assessment.burnUp.completedPath, "");
});

test("已有账本优先于当前 EWD 基线", () => {
  const assessment = getTaskProgressAssessment({ source: "recorded", points: [
    { at: "2026-09-01", scopeHours: 7, completedHours: 2, estimatedLeafCount: 1, totalLeafCount: 1 },
  ] }, [effort("leaf", 420)]);
  assert.equal(assessment.state, "single");
  assert.equal(assessment.progressRatio, 2 / 7);
  assert.equal(assessment.completedHours, 2);
});

test("缺估、过期、非法和零范围都不可计算", () => {
  const inputs: TaskEffortDistributionInput[][] = [
    [],
    [{ ...scope, id: "missing" }],
    [{ ...effort("stale", 420), goal: "范围已改变" }],
    [effort("invalid", 420, { minutes: -1 })],
    [effort("zero", 0)],
  ];
  assert.deepEqual(inputs.map(input => getTaskProgressAssessment(undefined, input).state), [
    "unavailable", "unavailable", "stale", "invalid", "unavailable",
  ]);
  assert.ok(inputs.every(input => getTaskProgressAssessment(undefined, input).progressRatio === null));
});

test("部分叶子缺估时不能把已估子集显示成总体完成度", () => {
  const assessment = getTaskProgressAssessment(undefined, [effort("known", 120), { ...scope, id: "missing" }]);
  assert.equal(assessment.state, "partial");
  assert.equal(assessment.progressRatio, null);
  assert.equal(assessment.scopeHours, null);
  assert.equal(assessment.estimatedLeafCount, 1);
  assert.equal(assessment.totalLeafCount, 2);
});
