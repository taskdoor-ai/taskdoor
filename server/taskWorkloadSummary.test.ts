import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskWorkloadSummary } from "../src/components/TaskWorkloadSummary.tsx";
import type { TaskBurnUpSeries } from "../src/lib/taskBurnUp.ts";
import { getEffortScopeKey } from "../src/lib/taskEffort.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const series: TaskBurnUpSeries = { source: "example", points: [
  { at: "2026-08-25", scopeHours: 37, completedHours: 0, estimatedLeafCount: 6, totalLeafCount: 6 },
  { at: "2026-08-31", scopeHours: 43, completedHours: 15, estimatedLeafCount: 8, totalLeafCount: 8 },
] };

test("右侧分析只用完成进度与燃起图表达当前任务推进", () => {
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary, { series }));
  assert.match(html, /aria-label="任务完成进度与燃起图"/);
  assert.match(html, /完成进度/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuenow="34\.883721"/);
  assert.match(html, /style="width:34\.883721%"/);
  assert.match(html, /燃起图/);
  assert.doesNotMatch(html, /示例/);
  assert.match(html, /34\.9%/);
  assert.doesNotMatch(html, /task-burnup-values|已验收 <strong>|范围 <strong>/);
  assert.doesNotMatch(html, /完成状态|进行中|预计人类工时|约 0.88 人天|子任务工时分布/);
  assert.ok(html.indexOf("完成进度") < html.indexOf("燃起图"), "完成进度位于燃起图之前");
  const visualStart = html.indexOf('class="task-burnup-visual"');
  assert.ok(visualStart > 0);
  assert.match(html, /data-source="example"/, "来源元数据继续保留");
  assert.doesNotMatch(html.slice(visualStart), /task-heading-example[^>]*>示例/, "同一来源不重复标记");
});

test("完成进度直接来自燃起账本，不按任务个数或状态推算", () => {
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary, { series: { source: "recorded", points: [
    { at: "2026-08-31", scopeHours: 7, completedHours: 2, estimatedLeafCount: 3, totalLeafCount: 3 },
  ] } }));
  assert.match(html, /28\.6%/);
  assert.match(html, /aria-valuenow="28\.571429"/);
  assert.match(html, /单位：人天/);
  assert.match(html, /<td>0\.88<\/td><td>0\.25<\/td>/, "7 小时和 2 小时在表格换算成人天，进度仍用原始 2/7");
  assert.doesNotMatch(html, /33\.3%|进行中|已完成<\/strong>/);
});

test("完成进度可展开查看子任务工作量与显式验收进度", () => {
  const goal = "交付团队复盘纪要";
  const effortTask = (id: string, title: string, minutes: number) => {
    const scope = { goal, completionCriteria: [`完成${title}`], executionTips: [] };
    const workMethod = "AI 整理，人工核对";
    return {
      ...scope,
      id,
      title,
      effortEstimate: {
        minutes,
        workMethod,
        basis: "mock" as const,
        reason: "固定演示估算",
        confirmed: false,
        scopeKey: getEffortScopeKey(scope, workMethod),
        version: 1,
      },
    };
  };
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary, {
    completedMinutesByTaskId: { decisions: 120, actions: 0 },
    effortTasks: [effortTask("decisions", "整理关键决定", 120), effortTask("actions", "确认行动项", 180)],
    series: { source: "example", points: [{ at: "2026-09-01", scopeHours: 5, completedHours: 2, estimatedLeafCount: 2, totalLeafCount: 2 }] },
  }));

  assert.doesNotMatch(html, /子任务工作量|task-effort-cost-summary|演示估算/);
  assert.doesNotMatch(html, /task-burnup-values|已验收 <strong>|范围 <strong>|约 0.63 人天/);
  assert.match(html, /子任务投入与进度/);
  assert.match(html, /预计投入 0.63 人天/);
  assert.doesNotMatch(html, /预计共 0.63 人天/);
  assert.match(html, /整理关键决定/);
  assert.match(html, /0.25 人天/);
  assert.match(html, /40%/);
  assert.match(html, /已完成 100%/);
  assert.match(html, /确认行动项/);
  assert.match(html, /已完成 0%/);
  const trackEnd = html.indexOf('class="task-completion-progress-track"');
  const distributionStart = html.indexOf("子任务投入与进度");
  const visualStart = html.indexOf('class="task-burnup-visual"');
  assert.ok(trackEnd > 0 && trackEnd < distributionStart && distributionStart < visualStart, "子任务分布紧接完成进度条，并位于燃起图之前");
});

test("无子任务账本但当前范围有效时显示 0% 和固定空趋势", () => {
  const scope = { goal: "交付结果", completionCriteria: ["通过核对"], executionTips: [] };
  const method = "AI 整理，人工核对";
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary, { effortTasks: [{
    ...scope,
    id: "standalone",
    title: "独立任务",
    effortEstimate: {
      minutes: 420,
      workMethod: method,
      basis: "model",
      reason: "按当前范围估算",
      confirmed: false,
      scopeKey: getEffortScopeKey(scope, method),
      version: 1,
    },
  }] }));
  assert.match(html, /任务完成进度与燃起图/);
  assert.match(html, /task-completion-progress-value">0%/);
  assert.match(html, /aria-valuenow="0"/);
  assert.match(html, /style="width:0%"/);
  assert.match(html, /task-completion-progress-metrics[^]*?task-completion-progress-value">0%<\/strong>[^]*?预计投入 0.88 人天/);
  assert.ok(html.indexOf("预计投入 0.88 人天") < html.indexOf('class="task-completion-progress-track"'));
  assert.doesNotMatch(html, /task-burnup-values|已验收 <strong>|范围 <strong>/);
  assert.match(html, /燃起图|暂无趋势|尚无 EWD 历史记录/);
  assert.doesNotMatch(html, /task-burnup-chart|进行中/);
});

test("子任务工时分布摘要在进度条下保持一行", () => {
  const styles = readFileSync(new URL("../src/styles/task-effort.css", import.meta.url), "utf8");
  assert.match(styles, /task-effort-cost\[data-presentation="summary"\] \.task-effort-distribution-heading\s*\{[^}]*flex-wrap:\s*nowrap/);
  assert.match(styles, /task-effort-cost\[data-presentation="summary"\] \.task-effort-distribution-heading-end\s*\{[^}]*width:\s*auto/);
  assert.match(styles, /task-effort-cost\[data-presentation="summary"\] \.task-effort-distribution-name\s*\{[^}]*color:\s*var\(--ad-ink\)[^}]*font-weight:\s*600/);
});

test("完成进度提供可聚焦的 AI 分析说明入口，并注明本地实现边界", () => {
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary, { series }));
  assert.match(html, /<button[^>]*aria-label="完成进度说明"/);
  const source = readFileSync(new URL("../src/components/TaskBurnUpSparkline.tsx", import.meta.url), "utf8");
  assert.match(source, /历史任务完成情况与当前任务的交付记录/);
  assert.match(source, /仅供参考/);
  assert.match(source, /尚未接入 AI 评估服务/);
});

test("总工时读取当前叶子估算，部分覆盖只展示已估部分", () => {
  const scope = { goal: "核对结论", completionCriteria: ["交付记录"], executionTips: [] };
  const workMethod = "人工核对";
  const estimated = {
    ...scope, id: "a", title: "核对数据",
    effortEstimate: { minutes: 4200, basis: "model" as const, workMethod, reason: "当前范围估算", confirmed: false, version: 1, scopeKey: getEffortScopeKey(scope, workMethod) },
  };
  const complete = renderToStaticMarkup(createElement(TaskWorkloadSummary, { effortTasks: [estimated], series }));
  assert.match(complete, /预计投入 8.75 人天/);
  assert.doesNotMatch(complete, /预计投入 5.38 人天/);

  const partial = renderToStaticMarkup(createElement(TaskWorkloadSummary, { effortTasks: [estimated, { id: "b" }], series }));
  assert.match(partial, /已估部分 8.75 人天/);
  assert.doesNotMatch(partial, /预计投入 (8\.75|5\.38) 人天/);

  const stale = renderToStaticMarkup(createElement(TaskWorkloadSummary, { effortTasks: [{ ...estimated, goal: "范围已改变" }], series }));
  assert.match(stale, /预计投入 需重估/);
  assert.doesNotMatch(stale, /预计投入 (8\.75|5\.38) 人天/);

  const empty = renderToStaticMarkup(createElement(TaskWorkloadSummary, {}));
  assert.match(empty, /预计投入 待估算/);
  assert.doesNotMatch(empty, /预计投入 0 人天/);
});

test("范围未知时仍保留右栏和空进度条但不冒充 0%", () => {
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary, {}));
  assert.match(html, /任务完成进度与燃起图/);
  assert.match(html, /暂不可计算/);
  assert.match(html, /task-completion-progress-track/);
  assert.match(html, /燃起图|暂无趋势/);
  assert.doesNotMatch(html, /aria-valuenow|task-completion-progress-value">0%|task-burnup-chart/);
});

test("非法或缺估历史不把未知完成度显示成 0%", () => {
  const invalid = renderToStaticMarkup(createElement(TaskWorkloadSummary, { series: { source: "recorded", points: [
    { at: "非法日期", scopeHours: 7, completedHours: 2, estimatedLeafCount: 3, totalLeafCount: 3 },
  ] } }));
  assert.match(invalid, /完成进度/);
  assert.match(invalid, /暂不可计算/);
  assert.match(invalid, /数据待核对/);
  assert.match(invalid, /task-burnup-visual|燃起图/);
  assert.doesNotMatch(invalid, /role="progressbar"|task-burnup-chart|task-burnup-scope|task-burnup-completed|0%/);

  const partial = renderToStaticMarkup(createElement(TaskWorkloadSummary, { series: { source: "recorded", points: [
    { at: "2026-08-31", scopeHours: null, completedHours: 2, estimatedLeafCount: 2, totalLeafCount: 3 },
  ] } }));
  assert.match(partial, /暂不可计算/);
  assert.match(partial, /估算不完整/);
  assert.doesNotMatch(partial, /role="progressbar"|0%/);
});

test("状态与验收账本冲突时只提示核对，不恢复重复状态卡", () => {
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary, { needsReview: true, series }));
  assert.match(html, /任务状态与验收进度不一致，待核对/);
  assert.doesNotMatch(html, /完成状态|进行中/);
});

test("详情始终接入当前任务完成度，不受子任务数量或空账本控制", () => {
  const source = readFileSync(new URL("../src/components/TaskDetail.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /<TaskEffortCost/);
  assert.doesNotMatch(source, /const hasProgressSummary|childTasks\.length > 0 && burnUp/);
  assert.match(source, /getTaskProgressAssessment\(burnUp, effortTasks\)/);
  assert.match(source, /hasBurnUp=\{hasBurnUp\}/);
  assert.match(source, /<TaskWorkloadSummary[^\n]*onOpenTask=\{onOpenRelatedTask\}/);
  assert.match(source, /<TaskWorkloadSummary[^>]*hasSubtasks=\{childTasks\.length > 0\}/);
  assert.match(source, /currentStatus === "已完成"[^;]+progressAssessment\.progressRatio < 1/);
  assert.doesNotMatch(source, /<TaskWorkloadSummary[^>]*\s(?:status|tasks|showDistribution)=/);
  assert.match(source, /trendLabel="完成进度与燃起图"/);
});
