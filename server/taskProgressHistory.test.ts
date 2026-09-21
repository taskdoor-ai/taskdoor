import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getTaskProgressDemoExample } from "../src/data/taskProgressDemo.ts";
import { getTaskProgressComparison } from "../src/lib/taskProgressComparison.ts";
import { TaskProgressComparison } from "../src/components/TaskProgressComparison.tsx";
import { rollupProgressHistory } from "../src/data/taskProgressHistory.ts";
(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("父任务只汇总自身子任务记录，不拼接通用演示历史", () => {
  const series = getTaskProgressDemoExample("fragrance-creator-wrapup")!;
  const model = getTaskProgressComparison(series)!;
  assert.equal(model.history.length, 1);
  assert.equal(model.history[0].at, "2026-09-14");
  assert.equal(model.latest.at, "2026-09-14");
  assert.ok(model.history.every(row => row.addedMinutes === 0));
  assert.equal(model.forecastOn, null); // 有阻塞子项，补历史不补造完工预测。
});

test("单次观察不追加图下说明，不伪造初始零值或新增量", () => {
  const series = getTaskProgressDemoExample("weekly-retro-actions")!;
  const original = structuredClone(series);
  assert.equal(series.workload.length, 1);
  const html = renderToStaticMarkup(React.createElement(TaskProgressComparison, { series }));
  assert.doesNotMatch(html, /仅有 1 次工作量记录|暂无历史趋势/);
  assert.doesNotMatch(html, /task-progress-forecast-path/);
  assert.match(html, /task-progress-chart-forecast-date/);
  assert.match(html, /aria-label="2026\/09\/15，AI 预测完成/);
  assert.equal(getTaskProgressComparison(series)?.netAddedMinutes, 0);
  assert.deepEqual(series, original);
});

test("父级历史从所有子项都有记录时开始，不把较晚的首次观察补为早期零值", () => {
  const first = getTaskProgressDemoExample("weekly-retro-decisions")!;
  const later = getTaskProgressDemoExample("weekly-retro-actions")!;
  const before = structuredClone([first, later]);
  const history = rollupProgressHistory([first, later], "test-parent");
  assert.deepEqual(history.map(point => point.at), ["2026-09-14"]);
  assert.equal(history[0].scopeMinutes, 240);
  assert.equal(history[0].completedMinutes, 180);
  assert.deepEqual([first, later], before);
});
