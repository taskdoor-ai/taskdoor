import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { allTeamWorkspaceNodes } from '../src/data/teamWorkspaceScenarios.ts';
import { normalizeWorkspaceNodes, type TaskNode } from '../src/data/workspaceNodes.ts';
import { getProgressDemoCreatedAt, progressDemoRevisions } from '../src/data/taskProgressDemoFixtures.ts';
import { getTaskProgressDemoExample } from '../src/data/taskProgressDemo.ts';
import { getTaskProgressDisplay, progressDate } from '../src/lib/taskProgressDisplay.ts';
import { getTaskProgressComparison } from '../src/lib/taskProgressComparison.ts';
import { migrateProgressDemoFixtures } from '../src/lib/taskProgressDemoMigration.ts';
import { getWorkspaceEffortLeaves } from '../src/lib/taskEffortEditing.ts';
import { getTaskWorkloadProjection } from '../src/lib/taskWorkloadProjection.ts';
import { TaskProgressOverview } from '../src/components/TaskProgressOverview.tsx';
(globalThis as typeof globalThis & {React:typeof React}).React=React;
const nodes=normalizeWorkspaceNodes(allTeamWorkspaceNodes);
const tasks=nodes.filter((n):n is TaskNode=>n.kind==='task');
const date=(value?:string)=>progressDate(value)??(value?.match(/(\d+)\s*月\s*(\d+)\s*日/)?`2026-${value.match(/(\d+)\s*月\s*(\d+)\s*日/)![1].padStart(2,'0')}-${value.match(/(\d+)\s*月\s*(\d+)\s*日/)![2].padStart(2,'0')}`:null);
function project(task:TaskNode,source=nodes){
 const leaves=getWorkspaceEffortLeaves(source,task.id);
 return getTaskWorkloadProjection({progressTask:{...task,plannedStartOn:task.plannedStartOn??'',plannedEndOn:date(task.plannedEndOn??task.dueAt)??''},comparison:getTaskProgressDemoExample(task.id),effortTasks:leaves,hasSubtasks:tasks.some(t=>t.parentTaskId===task.id),progressComparisonsByTaskId:Object.fromEntries(leaves.map(t=>[t.id,getTaskProgressDemoExample(t.id)]))}).display;
}
function anomalies(source=nodes){
 return source.flatMap(task=>{
  if(task.kind!=='task')return [];
  const model=project(task,source),history=getTaskProgressComparison(model.historySeries);
  const created=model.startOn??history?.creation?.day??history?.history[0]?.at;
  return Object.entries({due:model.dueOn,completed:model.completedOn,forecast:model.forecastOn,current:model.asOf,history:history?.history[0]?.at}).flatMap(([kind,value])=>created&&value&&created>value?[`${task.id}: ${created} > ${kind} ${value}`]:[]);
 });
}
test('all built-in parent and child timelines have ordered creation dates after fresh and saved-seed migration',()=>{
 const legacy=nodes.map(node=>{
  if(node.kind!=='task'||getProgressDemoCreatedAt(node.id)||node.createdBy)return {...node};
  const {createdAt,...old}=node;return old;
 });
 const fresh=anomalies(),saved=anomalies(migrateProgressDemoFixtures(legacy));
 console.log(JSON.stringify({tasks:tasks.length,freshInvalidTasks:new Set(fresh.map(s=>s.split(':')[0])).size,freshViolations:fresh.length,legacyBefore:anomalies(legacy).length,savedViolations:saved.length,examples:fresh.slice(0,5)}));
 assert.deepEqual(fresh,[]);assert.deepEqual(saved,[]);
 const target=tasks.find(t=>t.id==='ccx-creator-consent-audit')!;
 assert.ok(project(target).startOn!<='2026-09-06');
});
test('compact timeline has one horizontal rail; difference and all date nodes share it in every finish state',()=>{
 const series=getTaskProgressDemoExample('ccx-creator-consent-audit')!;
 const base=getTaskProgressDisplay({series,task:tasks.find(t=>t.id==='ccx-creator-consent-audit')});
 for(const model of [base,{...base,completedOn:base.forecastOn,forecastOn:null},{...base,finishOn:null,forecastOn:null,deltaDays:null},{...base,finishOn:base.dueOn,forecastOn:base.dueOn,deltaDays:0}]){
  const html=renderToStaticMarkup(React.createElement(TaskProgressOverview,{model,compact:true}));
  assert.equal((html.match(/class="task-progress-schedule-axis /g)??[]).length,1);
  assert.doesNotMatch(html,/task-progress-schedule-comparison-(link|cap)/);
  if(model.deltaDays!==null)assert.match(html,/class="task-progress-schedule-delta"/);
 }
 const css=postcss.parse(readFileSync(new URL('../src/styles/task-progress-comparison.css',import.meta.url),'utf8'));
 const declarations=(selector:string)=>{const result:Record<string,string>={};css.walkRules(r=>{if(r.selector.split(',').map(s=>s.trim()).includes(selector))r.walkDecls(d=>{result[d.prop]=d.value});});return result;};
 assert.equal(declarations('.task-progress-schedule-stop')['grid-row'],'1');
 assert.equal(declarations('.task-progress-schedule-gap')['grid-row'],'1');
 assert.equal(declarations('.task-progress-schedule-delta').top,'0');
});


test('legacy seed creation restoration is bounded, preserves edits and is idempotent',()=>{
 const legacy=nodes.map(node=>{
  if(node.kind!=='task'||getProgressDemoCreatedAt(node.id)||node.createdBy)return {...node};
  const {createdAt,...old}=node;return old;
 });
 const historical=legacy.map(node=>{
  const revision=progressDemoRevisions[node.id];
  return revision?{...node,...revision.before,completedAt:undefined}:node;
 });
 const repaired=migrateProgressDemoFixtures(historical);
 assert.deepEqual(anomalies(repaired),[]);
 assert.equal(migrateProgressDemoFixtures(repaired),repaired);
 const id='ccx-creator-consent-audit', target=legacy.find((n):n is TaskNode=>n.id===id)!;
 assert.equal((repaired.find(n=>n.id===id) as TaskNode).createdAt,'2026-08-29T00:00:00+08:00');
 for(const changes of [{createdAt:'2026-09-08T10:00:00+08:00'},{createdAt:undefined},{plannedEndOn:'2026-09-07'}, {plannedStartOn:'2026-09-01'}, {goal:'用户目标'}, {effortEstimate:{...target.effortEstimate!,basis:'manual' as const,confirmed:true}}, {dependsOnTaskIds:[]}]){
  const edited={...target,...changes};
  const result=migrateProgressDemoFixtures([edited]);
  assert.deepEqual(result,[edited]);
 }
 const custom={...target,id:'user-created'};
 assert.deepEqual(migrateProgressDemoFixtures([custom]),[custom]);
 assert.deepEqual(migrateProgressDemoFixtures([target],{[id]:[{id:'edit',type:'task-definition-change',time:'2026-09-14',author:'周岚',message:'修改任务日期'}]}),[target]);
 assert.equal(migrateProgressDemoFixtures(legacy.filter(n=>n.id!==id)).some(n=>n.id===id),false);
 const {effortEstimate,...noEstimate}=target;
 const restored=migrateProgressDemoFixtures([noEstimate])[0] as TaskNode;
 assert.ok(restored.createdAt);assert.deepEqual(restored.effortEstimate,target.effortEstimate);
});
