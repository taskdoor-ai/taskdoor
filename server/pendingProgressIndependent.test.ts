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
import { migrateProgressDemoFixtures } from "../src/lib/taskProgressDemoMigration.ts";
import { resolveWorkspaceScenarioReset, creatorCommerceScenarioVersion } from "../src/lib/workspaceScenarioReset.ts";
import { toTaskRelationSummary } from "../src/lib/taskRelationProjection.ts";
import { progressDate } from "../src/lib/taskProgressDisplay.ts";
import { TaskCurrentSituation } from "../src/components/TaskCurrentSituation.tsx";
(globalThis as typeof globalThis & {React:typeof React}).React=React;
const fixtures=normalizeWorkspaceNodes(allTeamWorkspaceNodes);
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

import {TaskProgressComparison} from "../src/components/TaskProgressComparison.tsx";
import {TaskBurnUpTiming} from "../src/components/TaskBurnUpTiming.tsx";
import {TaskProgressOverview} from "../src/components/TaskProgressOverview.tsx";
import {taskProgressComparisonExamples} from "../src/data/taskProgressComparisonExamples.ts";
import {getTaskProgressDisplay} from "../src/lib/taskProgressDisplay.ts";
import {scenarioPresentation} from "../src/prd/progressScenarioFixtures.ts";
const forbidden=/尚无完工预测|尚未完工预测/;
test("all pending built-ins retain the same evidence in every active status through the App-like projection",()=>{
 const nodes=migrate(fixtures),pending=nodes.filter((n):n is TaskNode=>n.kind==="task"&&n.status==="待开始");
 let withProgress=0,withForecast=0,clearedByStatus=0;
 for(const task of pending){
  const result=project(nodes,task);
  if(result.workload.display.ratio!==null)withProgress++;
  if(result.workload.display.forecastOn)withForecast++;
  for(const status of ["进行中","已阻塞"] as const){
   const changed={...task,status};const active=project(nodes.map(n=>n.id===task.id?changed:n),changed);
   const fields=["ratio","currentMinutes","forecastOn"] as const;
   if(fields.some(key=>active.workload.display[key]!==null&&result.workload.display[key]===null))clearedByStatus++;
   for(const key of fields)assert.equal(result.workload.display[key],active.workload.display[key],`${task.id} ${status} ${key}`);
  }
  if(result.workload.display.ratio!==null){assert.equal(result.model.freshness,"current");assert.match(result.model.summary,/完成度/);}
 }
 console.log(JSON.stringify({pending:pending.length,withProgress,withForecast,clearedByStatus,unknown:pending.length-withProgress}));
 assert.equal(clearedByStatus,0);assert.equal(pending.length,104);assert.equal(withProgress,102);assert.equal(withForecast,102);
});
test("missing forecasts draw no prediction date and no separate placeholder in charts, compact axes or situation",()=>{
 const sample=taskProgressComparisonExamples.find(s=>s.id==="stalled")!;
 const display=getTaskProgressDisplay({series:sample,task:{status:"待开始"}});
 for(const element of [React.createElement(TaskProgressComparison,{series:sample,progressTask:{status:"待开始"}}),React.createElement(TaskBurnUpTiming,{model:display}),React.createElement(TaskProgressOverview,{model:display,compact:true})]){
  const html=renderToStaticMarkup(element);assert.doesNotMatch(html,forbidden);assert.doesNotMatch(html,/class="task-progress-chart-forecast-date"|data-kind="forecast">AI 预测/);
 }
 const task=fixtures.find((n):n is TaskNode=>n.id==="platform-security-gate")!;
 assert.doesNotMatch(project(fixtures,task).model.summary,forbidden);
});
test("pending PRD presentation keeps its recorded zero assessment rather than clearing evidence by status",()=>{
 const preview=scenarioPresentation("not-started");
 const raw=getTaskProgressDisplay({series:preview.series,task:preview.task});
 assert.equal(preview.model.ratio,raw.ratio);assert.equal(preview.model.currentMinutes,raw.currentMinutes);
 assert.equal(preview.model.forecastOn,raw.forecastOn);assert.equal(preview.model.ratio,0);
 assert.equal(preview.historyEmpty,undefined);assert.ok(preview.model.aiAssessment);
 for(const id of ["not-started","no-current","no-baseline","no-forecast","overdue"])assert.doesNotMatch(scenarioPresentation(id).model.timeStatus,forbidden);
});
test("unknown and edited scopes remain unknown while completed and cancelled tasks retain terminal behavior",()=>{
 const task=fixtures.find((n):n is TaskNode=>n.id==="weekly-retro-actions")!;
 const stale={...task,goal:"用户修改的范围"};
 const model=project(fixtures.map(n=>n.id===task.id?stale:n),stale);
 assert.equal(model.workload.display.ratio,null);assert.equal(model.workload.display.forecastOn,null);assert.match(model.model.summary,/暂无分析.*范围已变化/);
 const missing=getTaskProgressDisplay({task:{status:"待开始"}});assert.equal(missing.ratio,null);assert.equal(missing.currentMinutes,null);assert.equal(missing.forecastOn,null);
 for(const status of ["已完成","已取消"] as const){const display=getTaskProgressDisplay({series:getTaskProgressDemoExample(task.id),task:{...task,status}});assert.equal(display.forecastOn,null);if(status==="已完成")assert.equal(display.ratio,1);}
});
