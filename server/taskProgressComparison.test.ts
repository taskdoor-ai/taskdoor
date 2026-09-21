import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getTaskProgressChart, getTaskProgressComparison, type TaskProgressComparisonSeries } from "../src/lib/taskProgressComparison.ts";
import { TaskWorkloadSummary } from "../src/components/TaskWorkloadSummary.tsx";
import { TaskProgressComparison } from "../src/components/TaskProgressComparison.tsx";
import { getTaskProgressComparisonExample, taskProgressComparisonExamples } from "../src/data/taskProgressComparisonExamples.ts";
import { getEffortScopeKey } from "../src/lib/taskEffort.ts";
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const sample = (id = "behind") => structuredClone(taskProgressComparisonExamples.find(item => item.id === id)!);

test("工作量差额来自保存的分钟，新增范围不回写历史完成量", () => {
  const series = sample();
  const original = structuredClone(series);
  const model = getTaskProgressComparison(series)!;
  assert.equal(model.actualRatio, .42);
  assert.equal(model.expectedRatio, .65);
  assert.equal(model.deltaMinutes, -552);
  assert.equal(model.netAddedMinutes, 480);
  assert.equal(model.history[0].scopeMinutes, 1920);
  assert.equal(model.latest.scopeMinutes, 2400);
  assert.equal(model.history.reduce((sum,p)=>sum+p.addedMinutes,0), model.netAddedMinutes);
  assert.deepEqual(series, original);
  const growing: TaskProgressComparisonSeries = {...series, workload:[
    {at:"2026-09-07",scopeMinutes:480,completedMinutes:240,scopeVersion:"v1"},
    {at:"2026-09-13",scopeMinutes:960,completedMinutes:240,scopeVersion:"v2"},
  ]};
  const growth = getTaskProgressComparison(growing)!;
  assert.equal(growth.actualRatio,.25);
  assert.equal(growth.history[0].completedMinutes,240);
  assert.equal(growth.history[0].scopeMinutes,480);
  assert.equal(growth.expectedMinutes,null);
});

test("燃起图保留历史总量和完成量，未来趋势只采用独立节点", () => {
  const model = getTaskProgressComparison(sample())!;
  const timing = getTaskProgressChart(model);
  assert.match(timing.scopePath,/H .* V/);
  assert.match(timing.completedPath,/H .* V/);
  assert.equal(timing.end,"2026-09-21");
  assert.ok(timing.forecastX !== null);
  assert.ok(timing.dueX! < timing.forecastX!);
  assert.ok(timing.rows.every(row=>row.at <= "2026-09-13"));
  assert.equal(timing.rows.at(-1)?.scopeMinutes,model.latest.scopeMinutes);
  assert.equal(timing.forecastRows.length,4);
  assert.ok(timing.forecastRows.every(row=>row.at>model.latest.at));
  const dateOnly=sample();delete dateOnly.forecastTrend;
  assert.equal(getTaskProgressChart(getTaskProgressComparison(dateOnly)!).forecastPath,"");
  const finished = getTaskProgressChart(getTaskProgressComparison(sample("finished"))!);
  assert.equal(finished.forecastX, null);
  assert.ok(finished.finishX! < finished.dueX!);
  const unknown = getTaskProgressChart(getTaskProgressComparison(sample("stalled"))!);
  assert.equal(unknown.forecastX, null);
  assert.equal(unknown.finishX, null);
});

test("时间差按完成日减截止日，支持提前、按期、延期和未知", () => {
  assert.equal(getTaskProgressComparison(sample())?.deltaDays,3);
  assert.equal(getTaskProgressComparison(sample("ahead"))?.deltaDays,-2);
  const recovering = getTaskProgressComparison(sample("catching-up"))!;
  assert.ok(recovering.deltaMinutes! < 0);
  assert.equal(recovering.deltaDays,0); // 工作量落后，不代表最终一定延期。
  assert.equal(getTaskProgressComparison(sample("stalled"))?.forecastOn,null);
  assert.equal(getTaskProgressComparison(sample("not-started"))?.deltaDays,null);
  assert.equal(getTaskProgressComparison(sample("finished"))?.completedOn,"2026-09-13");
  assert.equal(getTaskProgressComparison(sample("finished"))?.deltaDays,-5);
  const noDate = sample(); noDate.timing.dueOn = null;
  assert.equal(getTaskProgressComparison(noDate)?.deltaDays,null);
  const invalid = sample(); invalid.timing.forecastOn = "2026-02-30";
  assert.equal(getTaskProgressComparison(invalid)?.forecastOn,null);
});

test("范围版本不符使预测失效，非法记录与过期观测不伪装当前数据", () => {
  assert.equal(getTaskProgressComparison(undefined),null);
  const bad = sample(); bad.workload[0].completedMinutes=bad.workload[0].scopeMinutes+1;
  assert.equal(getTaskProgressComparison(bad),null);
  const stale = sample(); stale.asOf="2026-09-14";
  assert.equal(getTaskProgressComparison(stale),null);
  const wrongVersion = sample(); wrongVersion.expected.scopeVersion="old"; wrongVersion.timing.scopeVersion="old";
  const model = getTaskProgressComparison(wrongVersion)!;
  assert.equal(model.expectedRatio,null); assert.equal(model.forecastOn,null); assert.equal(model.deltaDays,null);
  const unchangedVersion = sample(); unchangedVersion.workload[2].scopeVersion=unchangedVersion.workload[1].scopeVersion;
  assert.equal(getTaskProgressComparison(unchangedVersion),null);
});

test("样例保存独立历史，返工可下降，新任务不套用 Mock", () => {
  assert.equal(taskProgressComparisonExamples.length,8);
  for (const example of taskProgressComparisonExamples) {
    const model = getTaskProgressComparison(example);
    assert.ok(model,example.scenario); assert.equal(model.history.length,7);
  }
  const rework=getTaskProgressComparison(sample("rework"))!;
  assert.ok(rework.history[5].completedMinutes < rework.history[4].completedMinutes);
  const task=getTaskProgressComparisonExample("unassigned-short-video-covers")!;
  assert.equal(task.workload.at(-1)?.scopeMinutes,240);
  task.workload[0].scopeMinutes=1;
  assert.notEqual(getTaskProgressComparisonExample("unassigned-short-video-covers")!.workload[0].scopeMinutes,1);
  assert.equal(getTaskProgressComparisonExample("real-user-created-task"),undefined);
});

test("工作量、子任务和带时间预测的燃起图保持同一组件", () => {
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary,{comparison:sample()}));
  assert.match(html,/42%/);
  assert.match(html,/总工作量/); assert.doesNotMatch(html,/计算明细|工作量历史|<table/);
  assert.doesNotMatch(html,/<select|进度 Mock 场景|class="task-progress-expected-label"|class="task-progress-schedule"/);
  const track=html.indexOf('class="task-progress-race-track"');
  const chart=html.indexOf('class="task-burnup-visual"');
  const plotEnd=html.indexOf('</svg>', chart);
  const dates=html.indexOf('class="task-progress-chart-date-axis"');
  assert.doesNotMatch(html,/class="task-progress-observation"/);
  assert.ok(track < chart && chart < dates && dates < plotEnd);
  assert.doesNotMatch(html,/task-progress-chart-readout/);
  assert.match(html,/预计延期 3 天/);
  assert.match(html,/计划截止 9\/18/);assert.match(html,/AI 预测完成 9\/21/);
  assert.equal((html.match(/role="progressbar"/g) ?? []).length,1);
  assert.match(html,/AI 预测完成量 ÷ 总工作量 × 100%/);
  assert.doesNotMatch(html,/task-progress-forecast-path/);
  assert.match(html,/task-progress-forecast-trend/);
  assert.match(html,/task-progress-chart-forecast-date/);
  assert.match(html,/task-progress-forecast-point/);
  const changed=renderToStaticMarkup(createElement(TaskProgressComparison,{series:sample(),currentScopeMinutes:3000}));
  assert.doesNotMatch(changed,/历史总量保留|预测待更新|task-progress-asof/);
  assert.match(changed,/尚无进度预测/);
  assert.doesNotMatch(changed,/task-progress-forecast-trend|task-progress-chart-forecast-date/);
});

test("燃起图日期来源明确，同日合并且缺失日期不补造", () => {
  for (const [id,time] of [["on-track","预计按期"],["ahead","预计提前 2 天"],["behind","预计延期 3 天"],["stalled",""]]) {
    const html=renderToStaticMarkup(createElement(TaskProgressComparison,{series:sample(id)}));
    assert.ok(html.includes(time));
    const dateBlock=html.split('class="task-progress-chart-date-axis"')[1].split('</svg>')[0];
    const dates=[...dateBlock.matchAll(/data-date="([^"]+)"/g)].map(match=>match[1]);
    assert.deepEqual(dates,[...new Set(dates)].sort());
    if(id === "on-track") {
      assert.equal((dateBlock.match(/data-date="2026-09-18"/g) ?? []).length,1);
      assert.match(dateBlock,/计划截止/);assert.match(dateBlock,/｜/);assert.match(dateBlock,/AI 预测/);
    }
    if(id === "stalled") assert.doesNotMatch(html,/task-progress-chart-forecast-date|尚无完工预测|尚未完工预测/);
  }
});

test("Mock 对比保留独立子任务进度入口，不用主任务示例覆盖子任务记录", () => {
  const scope = { goal:"交付复盘纪要", completionCriteria:["核对结论"], executionTips:[] };
  const workMethod = "人工核对";
  const effortTasks = [
    {id:"decisions",title:"整理关键决定",minutes:1200},
    {id:"actions",title:"确认行动项",minutes:720},
    {id:"followup",title:"跟进行动结果",minutes:480},
  ].map(({minutes,...task})=>({...scope,...task,effortEstimate:{minutes,workMethod,basis:"model" as const,reason:"当前范围估算",confirmed:false,scopeKey:getEffortScopeKey(scope,workMethod),version:1}}));
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary, {
    comparison:sample(), effortTasks, completedMinutesByTaskId:{decisions:1200,actions:0}, onOpenTask:()=>{},
  }));
  assert.match(html,/task-completion-progress-value">42%/);
  assert.match(html,/aria-label="展开子任务进度"/);
  assert.match(html,/整理关键决定完成进度" aria-valuemax="100" aria-valuemin="0" aria-valuenow="100"/);
  assert.match(html,/确认行动项完成进度" aria-valuemax="100" aria-valuemin="0" aria-valuenow="0"/);
  assert.match(html,/跟进行动结果完成进度：尚无进度预测；/);
  const calculationEnd=html.indexOf('class="task-completion-breakdown"');
  const children=html.indexOf('aria-label="子任务进度"');
  const chart=html.indexOf('class="task-burnup-visual"');
  assert.ok(calculationEnd>0 && children>calculationEnd && chart>children);
  assert.match(html,/<button[^>]*class="task-effort-distribution-name"[^>]*>整理关键决定/);
});

test("真实历史优先，异常 Mock 保留原未知进度", () => {
  const recorded={source:"recorded" as const,points:[{at:"2026-09-13",scopeHours:10,completedHours:1,estimatedLeafCount:1,totalLeafCount:1}]};
  const html=renderToStaticMarkup(createElement(TaskWorkloadSummary,{comparison:sample(),series:recorded}));
  assert.match(html,/aria-valuenow="10"/); assert.doesNotMatch(html,/进度查看维度/);
  const invalid=renderToStaticMarkup(createElement(TaskWorkloadSummary,{comparison:{...sample(),workload:[]}}));
  assert.match(invalid,/暂不可计算/);
});
