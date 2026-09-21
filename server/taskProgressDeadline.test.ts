import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getTaskProgressDemoExample } from "../src/data/taskProgressDemo.ts";
import { getTaskProgressDisplay } from "../src/lib/taskProgressDisplay.ts";
import { TaskProgressComparison } from "../src/components/TaskProgressComparison.tsx";
import { TaskProgressOverview } from "../src/components/TaskProgressOverview.tsx";
import { scenarioPresentation } from "../src/prd/progressScenarioFixtures.ts";
(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("修改或清空截止只改变日期差，预测百分比、日期和原始记录保留", () => {
  const series = getTaskProgressDemoExample("weekly-retro-open-issues")!;
  const original = structuredClone(series);
  for (const [due, delta, status] of [
    ["2026-09-14", 1, "预计延期 1 天"],
    ["2026-09-15", 0, "预计按期"],
    ["2026-09-20", -5, "预计提前 5 天"],
    ["", null, "未设截止时间"],
  ] as const) {
    const task = { status: "进行中" as const, plannedEndOn: due };
    const model = getTaskProgressDisplay({ series, task });
    assert.equal(model.forecastOn, "2026-09-15", due);
    assert.equal(model.ratio, .75);
    assert.equal(model.deltaDays, delta);
    assert.equal(model.timeStatus, status);
    const main = renderToStaticMarkup(React.createElement(TaskProgressComparison, { series, progressTask: task }));
    const child = renderToStaticMarkup(React.createElement(TaskProgressOverview, { model, compact: true }));
    assert.doesNotMatch(main, /task-progress-forecast-path/);
    assert.match(main, /task-progress-chart-forecast-date/);
    assert.match(main, /AI 预测完成 9\/15/);
    assert.match(child, /AI 预测 9\/15/);
    assert.doesNotMatch(main + child, /截止已修改|需复核时间预测/);
    if (!due) assert.doesNotMatch(main, /class="task-progress-chart-deadline"/);
  }
  assert.deepEqual(series, original);
});

test("无预测记录不会因改截止生成日期，完成和重开仍执行原状态规则", () => {
  const series = getTaskProgressDemoExample("weekly-retro-open-issues")!;
  const task = { status: "进行中" as const, plannedEndOn: "2026-09-20" };
  const missing = getTaskProgressDisplay({ series: { ...series, timing: { ...series.timing, forecastOn: null } }, task });
  assert.equal(missing.forecastOn, null); assert.equal(missing.timeStatus, "");
  assert.equal(getTaskProgressDisplay({ series, task: { ...task, status: "已完成", completedAt: "2026-09-15T10:00:00+08:00" } }).forecastOn, null);
  assert.equal(getTaskProgressDisplay({ series, task: { ...task, progressReopenedAt: "2026-09-15T10:00:00+08:00" } }).forecastOn, null);
});

test("P18 与 P17 场景保留独立预测，仅 P18 比较新截止", () => {
  const changed = scenarioPresentation("plan-changed").model;
  assert.equal(changed.forecastOn, "2026-09-18");
  assert.equal(changed.dueOn, "2026-09-20");
  assert.equal(changed.timeStatus, "预计提前 2 天");
  const noDue = scenarioPresentation("no-due").model;
  assert.equal(noDue.forecastOn, "2026-09-18");
  assert.equal(noDue.dueOn, null); assert.equal(noDue.deltaDays, null);
});

test("85% 的最终决策样例拥有独立审核时间依据，改截止后保留 9/16 预测", () => {
  const series = getTaskProgressDemoExample("fragrance-final-decision")!;
  const model = getTaskProgressDisplay({ series, task: { status: "待审核", plannedEndOn: "2026-09-15" } });
  assert.equal(model.ratio, .85); assert.equal(model.forecastOn, "2026-09-16");
  assert.equal(model.timeStatus, "预计延期 1 天");
  assert.match(series.timing.basis, /预算核对安排/);
});
