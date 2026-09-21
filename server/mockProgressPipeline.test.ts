import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { allTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { normalizeWorkspaceNodes, type TaskNode, type WorkspaceNode } from "../src/data/workspaceNodes.ts";
import { buildTaskProgressDemoExamples, getTaskProgressDemoExample, getTaskProgressDemoEvidence } from "../src/data/taskProgressDemo.ts";
import { taskProgressComparisonExamples } from "../src/data/taskProgressComparisonExamples.ts";
import { progressDemoRevisions } from "../src/data/taskProgressDemoFixtures.ts";
import { migrateProgressDemoFixtures } from "../src/lib/taskProgressDemoMigration.ts";
import { getWorkspaceEffortLeaves } from "../src/lib/taskEffortEditing.ts";
import { getTaskEffortDistribution } from "../src/lib/taskEffortDistribution.ts";
import { getEffortScopeKey } from "../src/lib/taskEffort.ts";
import { getTaskProgressChart, getTaskProgressComparison } from "../src/lib/taskProgressComparison.ts";
import { getTaskProgressDisplay, progressDate } from "../src/lib/taskProgressDisplay.ts";
import { TaskProgressComparison } from "../src/components/TaskProgressComparison.tsx";
import { TaskWorkloadSummary } from "../src/components/TaskWorkloadSummary.tsx";
import { layoutBurnUpDateAxis } from "../src/components/TaskBurnUpTiming.tsx";
(globalThis as typeof globalThis & {React:typeof React}).React=React;
const fixtures=normalizeWorkspaceNodes(allTeamWorkspaceNodes);
const tasks=fixtures.filter((node):node is TaskNode=>node.kind==="task");
const unknown = new Map([
  ["unassigned-live-backup-plan","只有要求与估算，尚无执行/交付预测依据"],
  ["unassigned-attribution-dictionary","只有要求与估算，尚无执行/交付预测依据"],
  ["platform-daily-production-triage","持续处理类任务未定义单次完工节点"],
  ["supply-daily-shortage-standup","持续处理类任务未定义单次完工节点"],
  ["fragrance-live","核心达人尚未回复复排档期"],
  ["platform-security-gate","安全复核窗口未确认"],
  ["ccx-extreme-claim-incident","外部核查恢复日期未知"],
  ["supply-incident-lockbody-rust","外部核查恢复日期未知"],
  ["fragrance-creator-wrapup","子任务未全部获得有效完工预测"],
  ["platform-mobile-release","子任务未全部获得有效完工预测"],
  ["platform-governance-track","子任务未全部获得有效完工预测"],
]);
const dates=(task:TaskNode)=>{
  const text=task.plannedEndOn??task.dueAt??"", match=text.match(/(\d+)\s*月\s*(\d+)\s*日/);
  return {...task,plannedStartOn:task.plannedStartOn??"",plannedEndOn:progressDate(text)??(match?`2026-${match[1].padStart(2,"0")}-${match[2].padStart(2,"0")}`:"")};
};
function project(nodes:WorkspaceNode[],task:TaskNode){
  const input=dates(task),series=getTaskProgressDemoExample(task.id),leaves=getWorkspaceEffortLeaves(nodes,task.id);
  const effort=getTaskEffortDistribution(leaves,"example");
  const display=getTaskProgressDisplay({task:input,series,scopeMinutes:effort.totalMinutes});
  const raw=getTaskProgressComparison(display.historySeries??series);
  const chart=raw?getTaskProgressChart({...raw,startOn:display.startOn,dueOn:display.dueOn,completedOn:display.completedOn,forecastOn:display.forecastOn,finishOn:display.finishOn,deltaDays:display.deltaDays},input):null;
  return {input,series,leaves,effort,display,raw,chart};
}

test("每条 Mock 进度序列从任务创建日记录初始总工作量，未改量区间保持水平",()=>{
  let checked=0;
  for(const task of tasks){
    const series=getTaskProgressDemoExample(task.id);if(!series)continue;
    const createdOn=progressDate(task.createdAt);
    assert.ok(createdOn,`${task.id}: missing creation date`);
    assert.ok(series.creation,`${task.id}: missing creation workload`);
    assert.equal(progressDate(series.creation.at),createdOn,task.id);
    const model=getTaskProgressComparison(series);assert.ok(model,task.id);
    const chart=getTaskProgressChart(model,task);
    assert.equal(chart.scopeRows[0].at,createdOn,task.id);
    assert.equal(chart.scopeRows[0].isCreation,true,task.id);
    assert.equal(chart.scopeRows[0].scopeMinutes,series.creation.scopeMinutes,task.id);
    checked++;
  }
  assert.ok(checked>200);

  const launchTask=tasks.find(task=>task.id==="ccx-serum-launch")!;
  const launchSeries=getTaskProgressDemoExample(launchTask.id)!;
  const launchChart=getTaskProgressChart(getTaskProgressComparison(launchSeries)!,launchTask);
  assert.deepEqual(launchChart.scopeRows.slice(0,2).map(row=>[row.at,row.scopeMinutes,row.isCreation]),[
    ["2026-08-18",4680,true],
    ["2026-09-08",4680,false],
  ]);
});

test("all 232 built-in tasks project through valid effort to 200 forecasts, with 11 explicit unknowns",()=>{
  const nodes=migrateProgressDemoFixtures(fixtures);
  let forecasts=0,terminals=0;
  for(const task of tasks){
    const {series,effort,display,raw,chart}=project(nodes,task);
    if(["已完成","已取消"].includes(task.status)){terminals++;assert.equal(display.forecastOn,null,task.id);}
    else if(unknown.has(task.id))assert.equal(display.forecastOn,null,`${task.id}: ${unknown.get(task.id)}`);
    else {forecasts++;assert.ok(display.forecastOn,task.id);assert.equal(effort.state,"available",task.id);}
    if(!series){assert.ok(unknown.has(task.id),task.id);continue;}
    assert.ok(raw,task.id);assert.ok(chart,task.id);
    assert.equal(raw.latest.scopeMinutes,effort.totalMinutes,task.id);
    for(const [i,p] of series.workload.entries()){
      assert.ok(p.completedMinutes>=0&&p.completedMinutes<=p.scopeMinutes,task.id);
      assert.ok(p.at<=series.asOf,task.id);
      if(i){assert.ok(p.at>series.workload[i-1].at,task.id);assert.ok(p.completedMinutes>=series.workload[i-1].completedMinutes,task.id);}
      assert.ok(!p.scopeVersion.startsWith("scope-"),`${task.id}: no generic scope history`);
    }
    if(task.createdAt){const creation=progressDate(task.createdAt)!;assert.ok(creation<=series.workload[0].at,task.id);if(display.dueOn)assert.ok(creation<=display.dueOn,task.id);}
    if(display.forecastOn){
      assert.ok(display.forecastOn>series.asOf,task.id);
      assert.equal(chart.forecastRows.at(-1)?.at,display.forecastOn,task.id);
      assert.equal(chart.forecastRows.at(-1)?.completedMinutes,chart.finishScopeMinutes,task.id);
      assert.equal(chart.forecastX,chart.finishX,task.id);
    }else assert.equal(chart.forecastRows.length,0,task.id);
    assert.ok([...chart.rows,...chart.forecastRows,...chart.scopeRows].every(row=>Number.isFinite(row.x)&&row.x>=chart.startX&&row.x<=chart.endX),task.id);
    const axis=layoutBurnUpDateAxis({model:display,...chart,asOf:raw.latest.at,historyStartOn:chart.scopeRows[0].at});
    const forecast=axis.labels.flatMap(label=>label.entries).find(entry=>entry.kind==="forecast");
    assert.equal(forecast?.date??null,display.forecastOn,task.id);
  }
  assert.equal(tasks.length,232);assert.equal(forecasts,200);assert.equal(terminals,21);assert.equal(unknown.size,11);
});

test("parents aggregate their actual children, and cycles or missing evidence cannot invent a rollup",()=>{
  for(const parent of tasks){
    const children=tasks.filter(task=>task.parentTaskId===parent.id);if(!children.length)continue;
    const parentModel=getTaskProgressComparison(getTaskProgressDemoExample(parent.id))!;
    const childModels=children.map(child=>getTaskProgressComparison(getTaskProgressDemoExample(child.id))!);
    assert.equal(parentModel.latest.scopeMinutes,childModels.reduce((sum,model)=>sum+model.latest.scopeMinutes,0),parent.id);
    assert.equal(parentModel.latest.completedMinutes,childModels.reduce((sum,model)=>sum+model.latest.completedMinutes,0),parent.id);
  }
  assert.equal(getTaskProgressComparison(getTaskProgressDemoExample("product-launch-run-of-show"))!.latest.scopeMinutes,1080);
  assert.equal(getTaskProgressComparison(getTaskProgressDemoExample("product-launch-planning"))!.latest.scopeMinutes,2160);
  const seed=tasks[0],a={...seed,id:"cycle-a",parentTaskId:"cycle-b"},b={...seed,id:"cycle-b",parentTaskId:"cycle-a"};
  assert.equal(buildTaskProgressDemoExamples([a,b],{}).size,0);
  const parent={...seed,id:"parent"},child={...seed,id:"child",parentTaskId:"parent"};
  assert.equal(buildTaskProgressDemoExamples([parent,child],{}).get("parent"),undefined);
  const done={...tasks.find(task=>task.id==="product-launch-planning")!,status:"已完成" as const,completedAt:"2026-09-20T10:00:00+08:00"};
  assert.equal(project(fixtures,done).display.forecastOn,null);
});

test("business history only uses authored records; generic scenarios remain standalone",()=>{
  for(const task of tasks){
    const record=getTaskProgressDemoEvidence(task.id);if(!record)continue;
    const series=getTaskProgressDemoExample(task.id)!;
    assert.equal(series.workload.length,(record.history?.length??0)+1,task.id);
    assert.deepEqual(series.workload.slice(0,-1),record.history??[],task.id);
  }
  assert.equal(getTaskProgressDemoExample("fragrance-final-decision")!.workload.length,1,"generic rework had no task-specific reopening evidence");
  for(const series of taskProgressComparisonExamples)assert.ok(getTaskProgressComparison(series));
  const saved=getTaskProgressDemoExample("product-launch-host-script")!;saved.workload.at(-1)!.note="用户保存的独立预测说明";
  assert.deepEqual(getTaskProgressDemoExample("product-launch-host-script",saved),saved);
});

test("legacy mock migration restores the entire forecast pipeline and preserves edits, deletions and saved text",()=>{
  const legacy=normalizeWorkspaceNodes(fixtures.map(node=>{
    if(node.kind!=="task")return node;let parent=node;
    while(parent.parentTaskId)parent=tasks.find(task=>task.id===parent.parentTaskId)!;
    const revision=progressDemoRevisions[node.id];
    return {...node,...(revision?{...revision.before,completedAt:undefined}:{}),...(node.effortEstimate?{effortEstimate:{...node.effortEstimate,reason:"原样保存旧说明",scopeKey:getEffortScopeKey({...node,goal:parent.goal},node.effortEstimate.workMethod)}}:{})};
  }));
  const migrated=migrateProgressDemoFixtures(legacy);
  assert.equal(migrated.filter((node):node is TaskNode=>node.kind==="task").filter(task=>project(migrated,task).display.forecastOn).length,200);
  assert.equal(migrateProgressDemoFixtures(migrated),migrated);
  assert.ok(migrated.filter((node):node is TaskNode=>node.kind==="task"&&!!node.effortEstimate).every(task=>task.effortEstimate!.reason==="原样保存旧说明"));
  const target=legacy.find((node):node is TaskNode=>node.id==="product-launch-host-script")!;
  const edited={...target,goal:"用户明确改过目标",plannedEndOn:"2026-10-10"};
  const custom={...edited,id:"user-created"};
  const inputs=[...legacy.filter(node=>node.id!==target.id&&node.id!=="product-launch-venue"),edited,custom];
  const result=migrateProgressDemoFixtures(inputs);
  assert.equal(result.find(node=>node.id===edited.id),edited);assert.equal(result.find(node=>node.id===custom.id),custom);
  assert.ok(!result.some(node=>node.id==="product-launch-venue"));
  assert.equal(project(result,edited).display.forecastOn,null);
});

test("actual summary rendering respects null/stale scope, while undefined preserves standalone demos",()=>{
  const task=tasks.find(task=>task.id==="product-launch-host-script")!;
  const series=getTaskProgressDemoExample(task.id)!;
  const noScope=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series,progressTask:task,currentScopeMinutes:null}));
  assert.match(noScope,/data-progress-state="unknown"/);assert.doesNotMatch(noScope,/class="task-progress-chart-forecast-date"/);
  const standalone=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series:taskProgressComparisonExamples[0]}));
  assert.match(standalone,/class="task-progress-chart-forecast-date"/);
  const stale={...task,goal:"用户修改的新目标"};
  const html=renderToStaticMarkup(React.createElement(TaskWorkloadSummary,{compact:true,progressTask:stale,comparison:series,effortTasks:[stale]}));
  assert.match(html,/待重新评估/);assert.doesNotMatch(html,/class="task-progress-chart-forecast-date"/);
  for(const id of ["product-launch-planning","product-launch-run-of-show","product-launch-host-script","product-launch-guest-cue","product-launch-flow-rehearsal","demo-autumn-creator-event","demo-autumn-creator-event-content","demo-autumn-creator-event-launch"]){
    const task=tasks.find(item=>item.id===id)!,p=project(fixtures,task);
    const html=renderToStaticMarkup(React.createElement(TaskWorkloadSummary,{compact:true,progressTask:p.input,comparison:p.series,effortTasks:p.leaves,progressComparisonsByTaskId:Object.fromEntries(p.leaves.map(leaf=>[leaf.id,getTaskProgressDemoExample(leaf.id)]))}));
    if (!p.series?.workload.some(point => point.completedMinutes > 0)) {
      assert.doesNotMatch(html, /task-burnup-chart/);
      continue;
    }
    assert.match(html,/class="task-progress-chart-forecast-date"/,id);
    assert.ok(html.includes(p.display.forecastOn!.replaceAll("-","/")),id);
  }
});

test("有历史完成量但当前范围失效时，不宣称未形成结果，也不把旧图标成当前", () => {
  const task = tasks.find(task => task.id === "product-launch-host-script")!;
  const html = renderToStaticMarkup(React.createElement(TaskWorkloadSummary, {
    compact: true, progressTask: task, comparison: getTaskProgressDemoExample(task.id),
    effortTasks: [{...task, goal: "已修改的交付范围"}],
  }));
  assert.match(html, /待重新评估/);
  assert.match(html, /上次记录/);
  assert.doesNotMatch(html, /未形成结果|class="task-progress-chart-forecast-date"/);
});
