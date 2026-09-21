import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { allTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { getTaskProgressDemoExample } from "../src/data/taskProgressDemo.ts";
import { getTaskProgressChart, getTaskProgressComparison } from "../src/lib/taskProgressComparison.ts";
import { TaskProgressComparison } from "../src/components/TaskProgressComparison.tsx";
import { rollupProgressForecast } from "../src/data/taskProgressHistory.ts";
import { scenarioPresentation } from "../src/prd/progressScenarioFixtures.ts";
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const stock = () => getTaskProgressDemoExample("unassigned-gift-stock-check")!;
const render = (series=stock(), progressTask: React.ComponentProps<typeof TaskProgressComparison>["progressTask"]={status:"待开始"}) => renderToStaticMarkup(React.createElement(TaskProgressComparison,{series,progressTask}));
const trendPath = (html:string) => html.match(/class="task-progress-forecast-trend" d="([^"]+)"/)?.[1];

test("库存预测从现有 40% 出发，等待、回复初核、收口分别保存，不改写历史",()=>{
  const series=stock(), before=structuredClone(series), model=getTaskProgressComparison(series)!, chart=getTaskProgressChart(model);
  assert.equal(model.latest.completedMinutes,48);
  assert.deepEqual(chart.forecastRows.map(p=>[p.at,p.completedMinutes]),[["2026-09-15",48],["2026-09-16",84],["2026-09-17",120]]);
  assert.equal(chart.forecastRows[0].y,chart.rows.at(-1)!.completedY);
  assert.equal(chart.forecastRows.at(-1)!.y,chart.finishY);
  assert.match(chart.forecastPath,new RegExp(`^M ${Number(chart.asOfX.toFixed(3))} ${Number(chart.rows.at(-1)!.completedY.toFixed(3))} H`));
  assert.ok(chart.rows.every(p=>p.at<=series.asOf));
  assert.deepEqual(series,before);
});

test("仅完工日期或失配节点保留日期，不生成未来趋势",()=>{
  for(const corrupt of [
    s=>{delete s.forecastTrend;}, s=>{s.forecastTrend!.asOf="2026-09-13";},
    s=>{s.forecastTrend!.scopeVersion="old";}, s=>{s.forecastTrend!.startMinutes=50;},
    s=>{s.forecastTrend!.points[0].at=s.asOf;}, s=>{s.forecastTrend!.points[1].completedMinutes=40;},
    s=>{s.forecastTrend!.points.at(-1)!.completedMinutes=119;},
    s=>{s.forecastTrend!.points[1].note="";}, s=>{s.forecastTrend!.points[1].at="2026-02-30";},
  ] as ((s:ReturnType<typeof stock>)=>void)[]){
    const s=stock();corrupt(s);const chart=getTaskProgressChart(getTaskProgressComparison(s)!);
    assert.equal(chart.forecastPath,"");assert.notEqual(chart.forecastX,null);
  }
});

test("常规状态与截止修改保留同一预测，用户确认和取消退出未来趋势，重开恢复已有预测",()=>{
  const s=stock(), original=trendPath(render(s)); assert.ok(original);
  for(const status of ["待开始","进行中","已阻塞"])assert.equal(trendPath(render(s,{status})),original);
  // Changing the deadline may change the horizontal scale, but never the saved checkpoints.
  for(const plannedEndOn of ["2026-09-20",null]){
    const html=render(s,{status:"进行中",plannedEndOn});assert.ok(trendPath(html));assert.match(html,/2026\/09\/17，AI 预测完成/);
  }
  for(const task of [{status:"已完成",completedAt:"2026-09-15T12:00:00+08:00"},{status:"已取消"}]){
    const html=render(s,task);assert.equal(trendPath(html),undefined);assert.doesNotMatch(html,/task-progress-chart-forecast-date/);
  }
  assert.ok(trendPath(render(s))); // Render did not overwrite the saved AI prediction.
});

test("所有 196 个有完工日期的 Demo 同时具有有效未来预测节点",()=>{
  let count=0;
  for(const task of allTeamWorkspaceNodes.filter(t=>t.kind==="task")){
    const s=getTaskProgressDemoExample(task.id), m=getTaskProgressComparison(s);if(!m?.forecastOn)continue;
    count++;assert.ok(getTaskProgressChart(m).forecastPath,task.id);
    assert.equal(m.forecastPoints.at(-1)!.completedMinutes,m.forecastScopePoints.at(-1)?.scopeMinutes ?? m.latest.scopeMinutes,task.id);
    assert.ok(m.forecastPoints.every(point=>point.at>s!.asOf),task.id);
  }
  assert.equal(count,196);
});

test("父任务未来完成量逐日汇总子项，缺少子项预测不补造曲线",()=>{
  const tasks=allTeamWorkspaceNodes.filter(t=>t.kind==="task");
  for(const parent of tasks){
    const children=tasks.filter(t=>t.parentTaskId===parent.id), m=getTaskProgressComparison(getTaskProgressDemoExample(parent.id));
    if(!children.length || !m?.forecastPoints.length)continue;
    const models=children.map(child=>getTaskProgressComparison(getTaskProgressDemoExample(child.id))!);
    for(const point of m.forecastPoints)assert.equal(point.completedMinutes,models.reduce((sum,child)=>sum+(child.forecastPoints.filter(p=>p.at<=point.at).at(-1)?.completedMinutes??child.latest.completedMinutes),0),parent.id);
  }
  const s=stock(), latest={...s.workload.at(-1)!,scopeMinutes:240,completedMinutes:96};
  const unknown=stock();delete unknown.forecastTrend;
  assert.equal(rollupProgressForecast([s,unknown],latest),undefined);
});

test("一次历史评估也能展示独立未来节点，历史仍是一个点",()=>{
  const s=getTaskProgressDemoExample("weekly-retro-actions")!;
  const html=render(s);assert.ok(trendPath(html));assert.doesNotMatch(html,/仅有 1 次工作量记录|暂无历史趋势；紫色虚线为未来预测/);
  assert.equal(getTaskProgressChart(getTaskProgressComparison(s)!).rows.length,1);
  assert.doesNotMatch(html,/计算明细|计划应完成/);
});

test("PRD 预测场景与 Demo 共用趋势；日期缺失、完成和失效场景不画趋势",()=>{
  for(const fixture of ["on-track","behind","ahead-delayed","no-due","plan-changed","status-conflict","reopened"]){
    const p=scenarioPresentation(fixture);
    const html=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series:p.series,presentation:{display:p.model}}));
    assert.ok(trendPath(html),fixture);
  }
  for(const fixture of ["no-forecast","done","cancelled","stale","scope-changed"]){
    const p=scenarioPresentation(fixture);
    const html=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series:p.series,presentation:{display:p.model}}));
    assert.equal(trendPath(html),undefined,fixture);
  }
});

test("预测节点提示保留日期和工作量，不显示预测百分比",()=>{
  const html=render();
  const forecastLabels=[...html.matchAll(/aria-label="([^"]*AI 预测完成量[^"]*)"/g)].map(match=>match[1]);
  assert.ok(forecastLabels.length>0);
  for(const label of forecastLabels){
    assert.match(label,/2026\/09\/\d{2}/);
    assert.match(label,/AI 预测完成量 .*人天/);
    assert.match(label,/预测总工作量 .*人天/);
    assert.doesNotMatch(label,/预测进度|%/);
  }
});
