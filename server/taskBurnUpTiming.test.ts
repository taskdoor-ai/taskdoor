import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { taskProgressComparisonExamples } from "../src/data/taskProgressComparisonExamples.ts";
import { TaskProgressComparison } from "../src/components/TaskProgressComparison.tsx";
import { getTaskProgressChart, getTaskProgressComparison } from "../src/lib/taskProgressComparison.ts";
import { layoutBurnUpDateAxis, TaskBurnUpDateAxis } from "../src/components/TaskBurnUpTiming.tsx";
import { getTaskProgressDisplay } from "../src/lib/taskProgressDisplay.ts";
import { getTaskProgressDemoExample } from "../src/data/taskProgressDemo.ts";
(globalThis as typeof globalThis & {React:typeof React}).React=React;
const sample=(id:string)=>structuredClone(taskProgressComparisonExamples.find(item=>item.id === id)!);

test("开始早于首条记录时仍保留四个时间节点，不把截止误当开始", () => {
  const series = sample("behind");
  const progressTask = { status: "进行中", createdAt: "2026-08-25T09:00:00+08:00", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-04" };
  const html = renderToStaticMarkup(React.createElement(TaskProgressComparison, { series, progressTask }));
  const axis = html.split('class="task-progress-chart-date-axis"')[1].split('</svg>')[0];
  assert.match(axis, /data-date="2026-08-25"/);
  for (const label of ["开始时间", "当前", "计划截止", "AI 预测完成"]) assert.ok(axis.includes(`>${label}</tspan>`), label);
  const dateBaselines = [...axis.matchAll(/class="task-progress-chart-axis-date"[^>]* y="([^"]+)"/g)].map(match => match[1]);
  assert.ok(dateBaselines.length >= 4);
  assert.doesNotMatch(axis, />截至</);
});

test("日期拥挤时纵向分行，横坐标不动并保留全部节点", () => {
  const series = sample("behind");
  const display = getTaskProgressDisplay({ series, task: { createdAt: "2026-09-13T09:00:00+08:00", plannedEndOn: "2026-09-15" } });
  const layout = layoutBurnUpDateAxis({ model: display, start: "2026-09-01", end: "2026-09-21", asOf: "2026-09-14",
    startX: 37, endX: 304, asOfX: 210.55, dueX: 223.9, finishX: 304 });
  const labels = layout.labels.flatMap(item => item.entries.map(entry => entry.label));
  for (const name of ["开始时间", "当前", "计划截止", "AI 预测完成"]) assert.ok(labels.includes(name), name);
  for (const label of layout.labels) {
    assert.ok(label.left >= layout.labelStartX && label.right <= layout.labelEndX);
    assert.ok(layout.labels.every(other => other === label || other.row !== label.row || other.right + 4 <= label.left || label.right + 4 <= other.left));
  }
});

test("历史起点显示创建，仍保留更早的计划截止", () => {
  const series = getTaskProgressDemoExample("fragrance-growth")!;
  const html = renderToStaticMarkup(React.createElement(TaskProgressComparison, {
    series, progressTask: { status: "进行中", plannedStartOn: "", plannedEndOn: "2026-09-04" },
  }));
  const axis = html.split('class="task-progress-chart-date-axis"')[1].split('</svg>')[0];
  assert.match(axis, new RegExp(`data-date="${series.workload[0].at}"[^]*?data-kind="record">创建`));
  assert.match(axis, /data-date="2026-09-04"[^]*?data-kind="plan">计划截止/);
  assert.match(axis, />当前<\/tspan>/);
  assert.match(axis, />AI 预测完成<\/tspan>/);
});

test("主任务时间合入燃起图，截止与预测参考线各自按日期定位",()=>{
  for (const scenario of ["behind","ahead","on-track"]) {
    const series=sample(scenario);
    const chart=getTaskProgressChart(getTaskProgressComparison(series)!);
    const html=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series}));
    assert.doesNotMatch(html,/class="task-progress-schedule"/);
    assert.doesNotMatch(html,/class="task-progress-chart-dates"|task-progress-chart-readout/);
    assert.match(html,/计划截止/);
    assert.ok(html.includes(`class="task-progress-chart-forecast-date" x1="${chart.forecastX}"`));
    assert.ok(html.includes(`class="task-progress-chart-deadline" x1="${chart.dueX}"`));
    assert.match(html,/task-progress-scope-path/);assert.match(html,/task-progress-actual-path/);
    const plot=html.split('class="task-burnup-chart task-progress-comparison-chart"')[1].split('</svg>')[0];
    assert.match(plot,/task-progress-chart-time-delta/);
    assert.doesNotMatch(html,/class="task-progress-chart-time-status"/);
    assert.match(plot,/class="task-progress-chart-date-axis"/);
    const dateBlock=plot.split('class="task-progress-chart-date-axis"')[1];
    if (scenario === "on-track") {
      assert.equal((dateBlock.match(/data-date="2026-09-18"/g)??[]).length,1);
      assert.match(dateBlock,/data-kind="plan">计划截止/);
      assert.match(dateBlock,/data-kind="forecast">AI 预测完成/);
    }
  }
});

test("时间轴标签锚定原日期，临近截止与预测不重叠，同日合并", () => {
  for (const dueOn of ["2026-09-16", "2026-09-18", "2026-09-20", "2026-09-21"]) {
    const series = sample("behind");
    const display = getTaskProgressDisplay({ series, task: { status: "进行中", plannedEndOn: dueOn } });
    const model = { ...getTaskProgressComparison(series)!, dueOn: display.dueOn, finishOn: display.finishOn, forecastOn: display.forecastOn };
    const chart = getTaskProgressChart(model);
    const layout = layoutBurnUpDateAxis({ model: display, ...chart, asOf: model.latest.at });
    assert.equal(layout.labels.find(label => label.date === display.dueOn)?.x, chart.dueX);
    assert.equal(layout.labels.find(label => label.date === display.finishOn)?.x, chart.finishX);
    for (const label of layout.labels) {
      assert.ok(label.left >= layout.labelStartX && label.right <= layout.labelEndX);
      assert.ok(layout.labels.every(other => other === label || other.row !== label.row || other.right + 4 <= label.left || label.right + 4 <= other.left));
    }
    if (display.dueOn === display.finishOn) {
      const labels = layout.labels.filter(label => label.date === dueOn);
      assert.equal(labels.length, 1);
      assert.ok(labels[0].entries.some(entry => entry.kind === "plan"));
      assert.ok(labels[0].entries.some(entry => entry.kind === "forecast"));
    }
  }
});

test("窄图的同日、缺失日期和不同时间顺序均保留对齐标签与真实刻度", () => {
  const display = getTaskProgressDisplay({ series: sample("behind") });
  const cases = [
    { startOn: "2026-09-13", asOf: "2026-09-14", dueOn: "2026-09-15", finishOn: "2026-09-16" },
    { startOn: "2026-09-14", asOf: "2026-09-14", dueOn: "2026-09-14", finishOn: "2026-09-14" },
    { startOn: "2026-09-10", asOf: "2026-09-14", dueOn: "2026-09-13", finishOn: "2026-09-12" },
    { startOn: null, historyStartOn: "2026-09-09", asOf: "2026-09-14", dueOn: null, finishOn: null },
  ];
  for (const { startX, endX, fontSize } of [{ startX: 37, endX: 304, fontSize: 11 }, { startX: 4, endX: 192, fontSize: 7 }]) {
    const x = (date: string) => startX + (Date.parse(date) - Date.parse("2026-09-01")) / (20 * 86400000) * (endX - startX);
    for (const dates of cases) {
      const layout = layoutBurnUpDateAxis({ model: { ...display, ...dates }, ...dates, start: "2026-09-01", end: "2026-09-21",
        startX, endX, fontSize, asOfX: x(dates.asOf), dueX: dates.dueOn ? x(dates.dueOn) : null, finishX: dates.finishOn ? x(dates.finishOn) : null });
      assert.equal(layout.height, (Math.max(...layout.labels.map(label => label.row)) + 1) * layout.rowHeight);
      for (const date of new Set(Object.values(dates).filter((date): date is string => Boolean(date)))) {
        const labels = layout.labels.filter(label => label.date === date);
        assert.equal(labels.length, 1, `${date} 同日只显示一个日期`);
        assert.equal(labels[0].x, x(date), "标签避让不移动真实日期位置");
        assert.equal(labels[0].labelX, x(date));
      }
      layout.labels.forEach(label => {
        assert.ok(label.left >= layout.labelStartX - .001 && label.right <= layout.labelEndX + .001);
        assert.ok(layout.labels.every(other => other === label || other.row !== label.row || other.right + 4 <= label.left + .001 || label.right + 4 <= other.left + .001));
      });
      const axis = renderToStaticMarkup(React.createElement(TaskBurnUpDateAxis, { layout, y: 100 }));
      const baselines = [...axis.matchAll(/class="task-progress-chart-axis-date"[^>]* y="([^"]+)"/g)].map(match => match[1]);
      assert.equal(new Set(baselines).size, new Set(layout.labels.map(label => label.row)).size);
    }
  }
});

test("已确认、无预测、无截止保持时间来源，不能保留虚假的未来线",()=>{
  const series=sample("behind");
  const done=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series,progressTask:{status:"已完成",completedAt:"2026-09-13T12:00:00+08:00"}}));
  assert.match(done,/task-progress-chart-completed-date/);
  assert.match(done,/确认完成/);
  assert.doesNotMatch(done,/task-progress-chart-forecast-date|class="task-progress-forecast-path"/);
  const unknown=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series:sample("stalled")}));
  assert.doesNotMatch(unknown,/尚无完工预测|尚未完工预测|class="task-progress-chart-time-status"/);
  assert.match(unknown,/task-progress-chart-deadline/);
  assert.doesNotMatch(unknown,/task-progress-chart-forecast-date/);
  series.timing.dueOn=null;
  const noDue=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series}));
  assert.match(noDue,/未设截止时间/);
  assert.match(noDue,/task-progress-chart-forecast-date/);
  assert.doesNotMatch(noDue,/task-progress-chart-deadline/);
});

test("已有工作量记录也在图内标截止日期，扩展横轴不生成未来历史", async()=>{
  const {getTaskBurnUpModel}=await import("../src/lib/taskBurnUp.ts");
  const {TaskWorkloadSummary}=await import("../src/components/TaskWorkloadSummary.tsx");
  const series={source:"recorded" as const,points:[
    {at:"2026-09-10",scopeHours:8,completedHours:2,estimatedLeafCount:1,totalLeafCount:1},
    {at:"2026-09-13",scopeHours:10,completedHours:4,estimatedLeafCount:1,totalLeafCount:1},
  ]};
  const html=renderToStaticMarkup(React.createElement(TaskWorkloadSummary,{series,progressTask:{status:"进行中",createdAt:"2026-08-25T09:00:00+08:00",plannedStartOn:"2026-09-12",plannedEndOn:"2026-09-18"}}));
  assert.match(html,/task-progress-chart-deadline/);
  assert.match(html,/class="task-progress-scope-forecast"/);
  assert.doesNotMatch(html,/class="task-progress-schedule"|task-progress-chart-forecast-date/);
  assert.match(html,/data-date="2026-08-25"[^]*?data-kind="start">开始时间/);
  assert.doesNotMatch(html,/创建时间未记录/);
  const before=getTaskBurnUpModel(series);
  const extended=getTaskBurnUpModel(series,{includeDates:["2026-09-18"]});
  assert.deepEqual(extended.latest,before.latest);
  assert.equal(extended.points.length,2);
  assert.ok(extended.points[1].x<before.points[1].x);
});

test("计划线节点与日期标签共用真实横坐标，预测线也不偏移",()=>{
  const series=sample("behind"), progressTask={status:"进行中",plannedEndOn:"2026-09-18"};
  const display=getTaskProgressDisplay({series,task:progressTask});
  const model={...getTaskProgressComparison(series)!,dueOn:display.dueOn,forecastOn:display.forecastOn,finishOn:display.finishOn};
  const chart=getTaskProgressChart(model,progressTask);
  const layout=layoutBurnUpDateAxis({model:display,...chart,asOf:model.latest.at,historyStartOn:chart.scopeRows[0]?.at});
  const html=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series,progressTask}));
  for(const [date,x,kind] of [[display.dueOn,chart.dueX,"deadline"],[display.forecastOn,chart.forecastX,"forecast-date"]] as const){
    const label=layout.labels.find(item=>item.date===date)!;
    assert.equal(label.labelX,x,`${date}: label and marker must share x`);
    assert.ok(html.includes(`class="task-progress-chart-${kind}" x1="${x}" x2="${x}"`));
    const axis=html.split('class="task-progress-chart-date-axis"')[1];
    const dateGroup=axis.split(`data-date="${date}"`)[1].split('</g>')[0];
    assert.ok(dateGroup.includes(`class="task-progress-chart-axis-date" x="${x}"`));
    assert.ok(dateGroup.includes(`class="task-progress-chart-axis-caption" x="${x}"`));
  }
  assert.ok(html.includes(`class="task-progress-chart-plan-node" d="M ${chart.dueX} `));
  assert.ok(html.includes(`class="task-progress-chart-finish-node" x1="${chart.finishX}" x2="${chart.finishX}"`));
  assert.doesNotMatch(html,/class="task-progress-chart-axis-leader"/);
});
