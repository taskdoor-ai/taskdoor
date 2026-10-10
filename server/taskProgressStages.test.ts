import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskProgressComparison } from "../src/features/tasks/components/TaskProgressComparison.tsx";
import { TaskWorkloadSummary } from "../src/features/tasks/components/TaskWorkloadSummary.tsx";
import { TaskSubtaskList } from "../src/features/tasks/components/TaskSubtaskList.tsx";
import { taskProgressComparisonExamples } from "../src/ai/mock/data/taskProgressComparisonExamples.ts";
import { getEffortScopeKey } from "../src/features/tasks/lib/task-effort.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const renderHtml = (element:React.ReactNode) => renderToStaticMarkup(element);
const series = taskProgressComparisonExamples.find(item => item.id === "behind")!;
const summary = (completedMinutes: number | null, status: "进行中" | "已完成" | "已取消" = "进行中") =>
  renderHtml(createElement(TaskProgressComparison, { series, completedMinutes, compact: true, progressTask: { status } }))
    .split('<div class="task-completion-progress"')[1]
    .split('<div class="task-progress-history"')[0];

test("详情进度以分档百分比呈现，未知与零分开", () => {
  for (const [amount, name, filled] of [[0,"0%",0],[1,"25%",1],[599,"25%",1],[600,"25%",1],[1199,"50%",2],[1200,"50%",2],[1800,"75%",3],[2399,"75%",3],[2400,"100%",4]] as const) {
    const html = summary(amount);
    assert.match(html, new RegExp(name));
    assert.match(html, /AI forecast/);
    assert.equal((html.match(/data-filled="true"/g) ?? []).length, filled);
    assert.equal((html.match(/data-filled="(?:true|false)"/g) ?? []).length, 4);
    assert.doesNotMatch(html, /完成进度说明|\bL[1-4]\b/);
    assert.match(html, /class="task-progress-stage-heading">Progress<\/span>/);
    assert.ok(html.indexOf('task-progress-stage-heading') < html.indexOf('task-progress-stage-track'));
    assert.ok(html.indexOf('task-progress-stage-track') < html.indexOf('task-progress-stage-label'));
    assert.ok(html.indexOf('task-progress-stage-label') < html.indexOf('task-ai-prediction-label'));
  }
});

test("四个进度格无论是否点亮都提供对应档位名称", () => {
  const html = summary(1200);
  for (const name of ["25%", "50%", "75%", "100%"]) {
    assert.match(html, new RegExp(`aria-label="${name}"`));
  }
  assert.doesNotMatch(html, /[1-4] 格/);
});

test("进度格提供清晰的悬浮提示和键盘焦点样式", () => {
  const css = readFileSync(new URL("../src/features/tasks/styles/task-detail-split.css", import.meta.url), "utf8");
  assert.match(css, /\.task-progress-stage-step\s*\{[^}]*height:\s*16px/s);
  assert.match(css, /\.task-progress-stage-step::before/);
  assert.match(css, /\.task-progress-stage-step:focus-visible/);
  assert.match(css, /\.task-progress-stage-tip\s*\{/);
});

test("预测达到全部仍是 AI 来源，完成确认和取消保留各自来源", () => {
  assert.match(summary(2400), /100%/);
  assert.doesNotMatch(summary(2400), /Confirmed complete|User confirmed/);
  const confirmed = summary(1008,"已完成");
  assert.match(confirmed, /class="task-progress-stage-label">100%<\/span>/);
  assert.match(confirmed, /class="task-progress-stage-source">User confirmed<\/span>/);
  assert.equal((confirmed.match(/data-filled="true"/g) ?? []).length, 4);
  assert.doesNotMatch(confirmed, /Confirmed complete|AI forecast/);
  assert.match(summary(1008,"已取消"), /50%/);
  assert.match(summary(1008,"已取消"), /取消时进度/);
  assert.doesNotMatch(summary(1008,"已取消"), /AI forecast/);
});

test("缺失或非法完成量显示零个填充格，不伪装已评估", () => {
  for (const amount of [null, NaN, -1, 2401]) {
    const html = summary(amount);
    assert.match(html, /No results yet/);
    assert.equal((html.match(/data-filled="false"/g) ?? []).length, 4);
    assert.doesNotMatch(html, /data-filled="true"|未形成成果|AI forecast/);
  }
});

test("替换进度摘要后燃起图的图形、标记和数据保持一致", () => {
  const before = structuredClone(series);
  const chart = (compact: boolean) => renderHtml(createElement(TaskProgressComparison, {series, compact}))
    .match(/<svg [^>]*class="task-burnup-chart task-progress-comparison-chart"[\s\S]*?<\/svg>/)?.[0];
  assert.ok(chart(false));
  assert.equal(chart(true), chart(false));
  assert.deepEqual(series, before);
});

test("详情记录分支同样用档位显示，保留原有燃起图", () => {
  const html = renderHtml(createElement(TaskWorkloadSummary, {compact:true, series:{source:"recorded",points:[
    {at:"2026-09-16",scopeHours:10,completedHours:7,estimatedLeafCount:1,totalLeafCount:1},
  ]}}));
  assert.match(html.split('<div class="task-progress-history"')[0], /75%/);
  assert.match(html, /class="task-burnup-chart"/);
});

test("子任务沿用相同档位与来源，同时保留截止和状态", () => {
  const html = renderHtml(createElement(TaskSubtaskList, {
    tasks:[{id:"stage-child",title:"完成审核",owner:"周岚",status:"进行中",dueAt:"9 月 24 日"}],
    progressComparisonsByTaskId:{"stage-child":series},
  }));
  assert.match(html,/50%/);
  assert.match(html,/AI forecast/);
  assert.match(html,/In progress/);
  assert.equal((html.match(/data-filled="(?:true|false)"/g) ?? []).length, 4);
  assert.match(html,/Planned finish/);
  assert.match(html,/dateTime="2026-09-18"/);
  assert.match(html,/dateTime="2026-09-21"/);
  assert.match(html,/3 days late/);
  assert.doesNotMatch(html,/task-completion-progress-value|task-progress-race-track/);
});

test("子任务用当前计划日期比较预测，保留提前、按期与未知状态", () => {
  const scope = {goal:"完成审核",completionCriteria:["结论可核对"],executionTips:[]};
  const workMethod = "核对审核资料";
  const render = (plannedEndOn: string, forecast = series) => renderHtml(createElement(TaskSubtaskList, {
    tasks:[{id:"stage-child",title:"完成审核",owner:"周岚",status:"进行中",dueAt:"9 月 24 日",goal:""}],
    effortTasks:[{...scope,id:"stage-child",plannedEndOn,effortEstimate:{minutes:2400,workMethod,basis:"model",reason:"审核投入",confirmed:false,version:1,scopeKey:getEffortScopeKey(scope,workMethod)}}],
    progressComparisonsByTaskId:{"stage-child":forecast},
  }));
  assert.match(render("2026-09-24"), /3 days early/);
  assert.match(render("2026-09-21"), /On time/);
  const unknown = {...series,timing:{...series.timing,forecastOn:undefined},forecastTrend:undefined};
  assert.doesNotMatch(render("2026-09-24",unknown), /尚无完工预测|尚未完工预测|class="task-progress-time-status"/);
  assert.doesNotMatch(render("2026-09-24",unknown), /预计提前|预计延期/);
});
