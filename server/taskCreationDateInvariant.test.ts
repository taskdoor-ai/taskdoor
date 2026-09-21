import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createWorkspaceTasksFromDraft } from '../src/lib/workspaceTaskCreation.ts';
import { createCreationForm, validateCreationForm } from '../src/lib/taskCreationForm.ts';
import { creatorCommerceMembers } from '../src/data/creatorCommerceScenario.ts';
import { TaskWorkloadSummary } from '../src/components/TaskWorkloadSummary.tsx';
import { getTaskProgressDisplay } from '../src/lib/taskProgressDisplay.ts';
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const task = {title:'交付方案',goal:'确认方案',completionCriteria:['方案已确认'],ownerId:'',participantIds:[],labels:[],startDate:'',endDate:''};

test('创建主任务和子任务都拒绝早于上海创建日的截止日期，并允许当天或不设日期', t => {
  t.mock.timers.enable({apis:['Date'], now:new Date('2026-09-19T17:00:00Z')});
  for (const child of [false,true]) {
    const invalid = {...task,endDate:'2026-09-19'};
    assert.throws(()=>createWorkspaceTasksFromDraft([], {mainTask:child?task:invalid,subtasks:child?[invalid]:[]}), /截止.*创建/);
  }
  for (const endDate of ['', '2026-09-20']) {
    const saved=createWorkspaceTasksFromDraft([], {mainTask:{...task,endDate},subtasks:[]});
    assert.equal(saved.createdNodes[0].createdAt,'2026-09-19T17:00:00.000Z');
  }
});

test('表单阻止旧草稿和无开始日期的过去截止日期', t => {
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-09-20T02:00:00Z')});
  const form=createCreationForm('',{currentDate:'2026-09-20',currentUserId:'周岚',members:creatorCommerceMembers,tags:[]});
  Object.assign(form.mainTask,task,{endDate:'2026-09-15'});
  assert.match(validateCreationForm(form,creatorCommerceMembers) ?? '',/截止.*创建/);
});

test('过期复杂示例不继续预填旧截止，也不自动推迟到下一年',()=>{
  const form=createCreationForm('',{currentDate:'2026-09-20',currentUserId:'周岚',members:creatorCommerceMembers,tags:[]},'complex-plan');
  for (const item of [form.mainTask,...form.subtasks]) assert.equal(item.endDate,'');
});

test('初始任务显示零格进度并隐藏燃起图，不虚构百分比',()=>{
  const html=renderToStaticMarkup(React.createElement(TaskWorkloadSummary,{compact:true,progressTask:{status:'待开始',createdAt:'2026-09-20T02:00:00Z'},effortTasks:[]}));
  assert.doesNotMatch(html,/燃起图|task-burnup-chart/);
  assert.match(html,/未形成结果/);
  assert.equal((html.match(/data-filled="false"/g) ?? []).length,4);
  assert.doesNotMatch(html,/data-filled="true"|0%/);
});

test('已有错误截止保留原始数据，投影显式报错且不生成倒置时间轴',()=>{
  const task={createdAt:'2026-09-20T02:00:00Z',plannedEndOn:'2026-09-15'};
  const display=getTaskProgressDisplay({task});
  assert.equal(display.dueOn,null);
  assert.match(display.scheduleIssue ?? '',/截止.*创建/);
  assert.equal(task.plannedEndOn,'2026-09-15');
});

test('AI 调整沿用真实创建日期，历史合法截止不受今天日期影响', async () => {
  const {createSavedTaskAiContext, applySavedTaskAiAdjustment} = await import('../src/lib/taskAiAdjustmentAdapters.ts');
  const {buildTaskAiAdjustment} = await import('../src/lib/taskAiAdjustment.ts');
  const nodes = [{id:'date-test',kind:'task' as const,parentId:'root',name:'日期测试',goal:'检查日期',ownerId:'',status:'待开始' as const,updatedAt:'2026-09-20',createdAt:'2026-09-10T01:00:00Z',plannedEndOn:'2026-09-20',completionCriteria:['完成检查']}];
  const context=createSavedTaskAiContext(nodes,'date-test',[],'self')!;
  const invalid=buildTaskAiAdjustment(context,{kind:'task'},'截止时间改为2026-09-09');
  assert.ok('error' in invalid);
  assert.match(invalid.error,/截止.*创建/);
  const valid=buildTaskAiAdjustment(context,{kind:'task'},'截止时间改为2026-09-10');
  assert.ok('proposal' in valid);
  const applied=applySavedTaskAiAdjustment(nodes,context,valid.proposal,{author:'我'});
  assert.equal(applied.nodes.find(node=>node.id==='date-test')?.plannedEndOn,'2026-09-10');
  assert.equal(nodes[0].plannedEndOn,'2026-09-20');
});
