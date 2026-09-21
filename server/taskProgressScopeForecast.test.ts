import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {getTaskProgressDemoExample} from "../src/data/taskProgressDemo.ts";
import {getTaskProgressChart, getTaskProgressComparison} from "../src/lib/taskProgressComparison.ts";
import {rollupProgressForecast} from "../src/data/taskProgressHistory.ts";
import {TaskProgressComparison} from "../src/components/TaskProgressComparison.tsx";
(globalThis as typeof globalThis & {React:typeof React}).React=React;
const stock=()=>getTaskProgressDemoExample("unassigned-gift-stock-check")!;
const withGrowth=()=>{
  const series=stock();
  series.forecastTrend!.scopePoints=[{at:"2026-09-16",scopeMinutes:180,note:"预计新增替代赠品的库存核对，共 60 分钟"}];
  series.forecastTrend!.points.at(-1)!.completedMinutes=180;
  return series;
};
const render=(series=stock(),status="进行中")=>renderToStaticMarkup(React.createElement(TaskProgressComparison,{series,progressTask:{status}}));

test("无预计新增时总量虚线从当前接到截止与预测日中较晚者，不修改历史",()=>{
  const series=stock(), before=structuredClone(series), model=getTaskProgressComparison(series)!;
  for(const dueOn of ["2026-09-15","2026-09-20",null]){
    const chart=getTaskProgressChart({...model,dueOn});
    assert.ok(chart.scopeForecastPath);
    assert.equal(chart.scopeForecastRows.at(-1)!.at,dueOn==="2026-09-20"?dueOn:model.forecastOn);
    assert.ok(chart.scopeForecastRows.every(p=>p.scopeMinutes===120));
    assert.equal(chart.scopeForecastRows[0].x,chart.asOfX);
    assert.equal(chart.scopeForecastRows.at(-1)!.scopeY,chart.rows.at(-1)!.scopeY);
  }
  assert.deepEqual(series,before);
});

test("只有截止日期也能延续已知总量，但不能补造完成量预测",()=>{
  const series=stock();delete series.forecastTrend;series.timing.forecastOn=null;
  const chart=getTaskProgressChart(getTaskProgressComparison(series)!);
  assert.ok(chart.scopeForecastPath);assert.equal(chart.forecastPath,"");
  assert.equal(chart.scopeForecastRows.at(-1)!.at,series.timing.dueOn);
  series.timing.dueOn=null;
  assert.equal(getTaskProgressChart(getTaskProgressComparison(series)!).scopeForecastPath,"");
});

test("有依据的未来范围新增只影响预测总量和未来进度分母，完成终点达到新总量",()=>{
  const series=withGrowth(), before=structuredClone(series), model=getTaskProgressComparison(series)!, chart=getTaskProgressChart(model);
  assert.equal(model.actualRatio,.4);assert.equal(model.latest.scopeMinutes,120);
  assert.equal(model.forecastScopePoints[0].scopeMinutes,180);
  assert.ok(chart.scopeForecastPath);assert.ok(chart.forecastPath);
  assert.deepEqual(chart.forecastRows.map(p=>p.scopeMinutes),[120,180,180]);
  assert.equal(chart.finishScopeMinutes,180);assert.equal(chart.forecastRows.at(-1)!.y,chart.finishY);
  assert.ok(chart.maxDays>=180/480);assert.deepEqual(series,before);
  assert.match(render(series),/预计新增替代赠品/);
});

test("范围预测失配或无依据时不默认为总量不变，也不画冲突的完成量趋势",()=>{
  for(const corrupt of [
    s=>{s.forecastTrend!.scopePoints![0].note="";},
    s=>{s.forecastTrend!.scopePoints![0].at=s.asOf;},
    s=>{s.forecastTrend!.scopePoints![0].scopeMinutes=40;},
    s=>{s.forecastTrend!.scopeVersion="old";},
    s=>{s.forecastTrend!.scopePoints![0].at="2026-09-20";},
  ] as ((s:ReturnType<typeof stock>)=>void)[]){
    const s=withGrowth();corrupt(s);const chart=getTaskProgressChart(getTaskProgressComparison(s)!);
    assert.equal(chart.scopeForecastPath,"");assert.equal(chart.forecastPath,"");
  }
});

test("父级汇总子任务的未来总量，未变化子项沿用当前总量",()=>{
  const children=[withGrowth(),stock()], latest={...stock().workload.at(-1)!,scopeMinutes:240,completedMinutes:96};
  const trend=rollupProgressForecast(children,latest)!;
  assert.deepEqual(trend.scopePoints?.map(p=>[p.at,p.scopeMinutes]),[["2026-09-16",300]]);
  const parent=stock();parent.workload=[latest];parent.forecastTrend=trend;
  const model=getTaskProgressComparison(parent)!;
  assert.equal(model.forecastPoints.at(-1)!.completedMinutes,300);
  assert.equal(getTaskProgressChart(model).finishScopeMinutes,300);
});

test("常规状态保留总量预测，已完成与取消不延续未来总量",()=>{
  for(const status of ["待开始","进行中","已阻塞"])assert.match(render(stock(),status),/class="task-progress-scope-forecast"/);
  for(const status of ["已完成","已取消"])assert.doesNotMatch(render(stock(),status),/class="task-progress-scope-forecast"/);
});
