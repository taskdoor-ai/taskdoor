import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { allTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { normalizeWorkspaceNodes, type TaskNode, type WorkspaceNode } from "../src/data/workspaceNodes.ts";
import { taskDetailMocks, createWorkspaceTaskDetail, type TaskDetailId } from "../src/data/taskDetailMocks.ts";
import { getTeamTaskDetailFixture } from "../src/data/teamTaskDetailFixtures.ts";
import { getTaskProgressDemoExample } from "../src/data/taskProgressDemo.ts";
import { getTaskAcceptedEffortMinutes } from "../src/data/taskProgressExamples.ts";
import { getWorkspaceEffortLeaves } from "../src/lib/taskEffortEditing.ts";
import { getTaskWorkloadProjection } from "../src/lib/taskWorkloadProjection.ts";
import { getTaskSituationModel, type TaskSituationInput } from "../src/lib/taskSituation.ts";
import { getTaskEffortDistribution } from "../src/lib/taskEffortDistribution.ts";
import { createManualEffortEstimate } from "../src/lib/taskEffort.ts";
import { migrateProgressDemoFixtures } from "../src/lib/taskProgressDemoMigration.ts";
import { resolveWorkspaceScenarioReset, creatorCommerceScenarioVersion } from "../src/lib/workspaceScenarioReset.ts";
import { toTaskRelationSummary } from "../src/lib/taskRelationProjection.ts";
import { progressDate } from "../src/lib/taskProgressDisplay.ts";
import { TaskCurrentSituation } from "../src/components/TaskCurrentSituation.tsx";
(globalThis as typeof globalThis & {React:typeof React}).React=React;
const unknownIds = ["unassigned-live-backup-plan","unassigned-attribution-dictionary","platform-daily-production-triage","supply-daily-shortage-standup"];
const fixtures=normalizeWorkspaceNodes(allTeamWorkspaceNodes);
const withoutEstimate=fixtures.map(node=>{if(node.kind!=="task")return node;const {effortEstimate:_estimate,...rest}=node;return rest;});
const migrate=(stored:unknown)=>migrateProgressDemoFixtures(resolveWorkspaceScenarioReset({storedVersion:creatorCommerceScenarioVersion,storedWorkspaceNodes:stored,storedTags:[]}).workspaceNodes);
const dates=(task:TaskNode)=>{const value=task.plannedEndOn??task.dueAt??"",m=value.match(/(\d+)\s*月\s*(\d+)\s*日/);return {...task,plannedStartOn:task.plannedStartOn??"",plannedEndOn:progressDate(value)??(m?`2026-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`:"")};};
function project(nodes:WorkspaceNode[],task:TaskNode){
 const team=nodes.filter(n=>n.teamId===task.teamId),tasks=team.filter((n):n is TaskNode=>n.kind==="task");
 const childTasks=tasks.filter(n=>n.parentTaskId===task.id).map(t=>toTaskRelationSummary(dates(t)));
 const effortTasks=getWorkspaceEffortLeaves(team,task.id).map(dates);
 const base=taskDetailMocks[task.id as TaskDetailId]??getTeamTaskDetailFixture(task)??createWorkspaceTaskDetail(task);
 const detail={...base,title:task.name,goal:task.goal??"",owner:task.ownerId,status:task.status,completionCriteria:task.completionCriteria};
 const workload=getTaskWorkloadProjection({progressTask:dates(task),comparison:getTaskProgressDemoExample(task.id),effortTasks,hasSubtasks:childTasks.length>0,series:detail.burnUp,completedMinutesByTaskId:getTaskAcceptedEffortMinutes(task.id),progressComparisonsByTaskId:Object.fromEntries(effortTasks.map(t=>[t.id,getTaskProgressDemoExample(t.id)]))});
 const input={taskId:task.id,task:detail,childTasks,dependencyTaskIds:task.dependsOnTaskIds??[],dependencyTasks:tasks.filter(t=>task.dependsOnTaskIds?.includes(t.id)).map(toTaskRelationSummary),recordedActivities:[],progress:workload.display,progressScopeState:workload.effort.state} as TaskSituationInput;
 const model=getTaskSituationModel(input),html=renderToStaticMarkup(React.createElement(TaskCurrentSituation,{model}));
 return {workload,model,html};
}
for(const [name,raw] of [["fresh",fixtures],["legacy-v21-missing-estimate",withoutEstimate]] as const){
 test(`${name}: all built-in tasks expose evidence-based analysis or an explicit missing-evidence reason`,()=>{
  const nodes=migrate(raw),tasks=nodes.filter((n):n is TaskNode=>n.kind==="task"),rows=tasks.map(task=>({task,...project(nodes,task)}));
  const stats={tasks:tasks.length,current:rows.filter(x=>x.model.freshness==="current").length,missing:rows.filter(x=>x.model.freshness==="missing").length,forecast:rows.filter(x=>x.workload.display.forecastOn).length,summaryWithoutTask:rows.filter(x=>!x.model.summary.includes(x.task.name)).length};
  console.log(name,JSON.stringify(stats));
  assert.equal(tasks.length,232);assert.equal(stats.summaryWithoutTask,0);assert.equal(stats.forecast,200);
  for(const {task,model,html,workload} of rows){
   if(unknownIds.includes(task.id)){assert.equal(model.freshness,"missing",task.id);assert.match(html,/暂无分析.*完成量记录/,task.id);}
   else {assert.equal(model.freshness,"current",task.id);assert.match(html,/下一步建议/,task.id);}
   if(workload.display.forecastOn){assert.ok(html.includes(workload.display.forecastOn),task.id);assert.ok(html.includes(workload.display.timeStatus),task.id);}
   if(["已完成","已取消"].includes(task.status))assert.doesNotMatch(model.summary,/AI 预测完成日/);
  }
  assert.equal(migrateProgressDemoFixtures(nodes),nodes);
 });
}
test("missing estimates are repaired only for unchanged seeds; manual, cleared, edited and deleted data survive",()=>{
 const target=withoutEstimate.find((n):n is TaskNode=>n.id==="product-launch-host-script")!;
 const original=fixtures.find((n):n is TaskNode=>n.id===target.id)!;
 const manual={...target,effortEstimate:createManualEffortEstimate(target,{minutes:240,reason:"本人重新核对",workMethod:original.effortEstimate!.workMethod},original.effortEstimate)};
 const cleared={...target,effortEstimate:{...manual.effortEstimate,basis:"unknown" as const,minutes:null}};
 for(const edited of [manual,cleared,{...target,goal:"用户范围"},{...target,plannedEndOn:"2026-10-10"},{...target,name:"用户任务名称"},{...target,id:"user-created"}]){
  const result=migrateProgressDemoFixtures([edited]);assert.equal(result[0],edited);
 }
 assert.deepEqual(migrateProgressDemoFixtures([]),[]);
 const editedActivity={id:"edit",author:"用户",type:"task-definition-change" as const,message:"清空估算",time:"今天",createdAt:"2026-09-18T10:00:00+08:00"};
 assert.equal(migrateProgressDemoFixtures([target],{[target.id]:[editedActivity]})[0],target);
 assert.equal(migrateProgressDemoFixtures([target])[0].kind,"task");
 assert.ok((migrateProgressDemoFixtures([target])[0] as TaskNode).effortEstimate);
});
test("confirmed manual estimates remain valid in detail and example; stale scope remains unknown",()=>{
 const task=fixtures.find((n):n is TaskNode=>n.id==="product-launch-host-script")!;
 const manual={...task,effortEstimate:createManualEffortEstimate(task,{minutes:240,reason:"人工核对",workMethod:task.effortEstimate!.workMethod},task.effortEstimate)};
 for(const mode of ["detail","example"] as const){assert.equal(getTaskEffortDistribution([manual],mode).totalMinutes,240);assert.equal(getTaskEffortDistribution([{...manual,goal:"不同范围"}],mode).totalMinutes,null);}
});


test("analysis quotes its own progress basis, keeps dependency priority, and hides stale progress",()=>{
 const task=fixtures.find((n):n is TaskNode=>n.id==="product-launch-host-script")!;
 const result=project(fixtures,task);
 const evidence=result.workload.display.historySeries!.aiAssessment!.basis;
 assert.ok(result.model.groups.flatMap(g=>g.items).some(item=>item.text.includes(evidence)));
 assert.match(result.model.groups.find(g=>g.id==="next")!.items[0].text,new RegExp(task.completionCriteria![0].slice(0,6)));
 const changed={...task,goal:"用户改过范围"};
 const stale=project(fixtures.map(n=>n.id===task.id?changed:n),changed);
 assert.match(stale.model.summary,/暂无分析.*范围已变化/);
 assert.ok(!JSON.stringify(stale.model).includes(evidence));
 const pending=fixtures.find((n):n is TaskNode=>n.kind==="task"&&n.id!==task.id&&n.status==="进行中")!;
 const dependent={...task,dependsOnTaskIds:[pending.id]};
 const priority=project(fixtures.map(n=>n.id===task.id?dependent:n),dependent);
 assert.ok(priority.model.groups.find(g=>g.id==="next")!.items[0].text.includes(pending.name));
});
