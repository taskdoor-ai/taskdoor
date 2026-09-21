import test from 'node:test';
import assert from 'node:assert/strict';
import { createManualEffortEstimate } from '../src/lib/taskEffort.ts';
import { getTaskEffortEditSignature } from '../src/lib/taskEffortEditing.ts';
import { distributeTaskEffortTotal, applyTaskEffortEdits, applyCreationEffortEdits } from '../src/lib/taskEffortEdits.ts';
import { newCreationTask } from '../src/lib/taskCreationForm.ts';
const scope={goal:'交付结果',completionCriteria:['核对通过'],executionTips:[]};
const task=(id:string,minutes:number)=>({...scope,id,title:id,effortEstimate:createManualEffortEstimate(scope,{minutes,workMethod:'人工核对',reason:'用户估算'})});

test('主任务总量按原比例精确分配整数分钟，不重复计入父任务',()=>{
  const tasks=[task('a',120),task('b',180),task('c',60)];
  const edits=distributeTaskEffortTotal(tasks,721);
  assert.equal(edits.reduce((sum,edit)=>sum+edit.estimate.minutes!,0),721);
  assert.deepEqual(edits.map(edit=>edit.estimate.minutes),[240,361,120]);
  assert.ok(edits.every(edit=>edit.estimate.basis==='manual' && edit.estimate.version===2));
  assert.equal(tasks[0].effortEstimate.minutes,120);
  assert.deepEqual(distributeTaskEffortTotal(tasks,0).map(edit=>edit.estimate.minutes),[0,0,0]);
});

test('不把未知或失效估算当成权重，保存前校验版本并整批拒绝过期修改',()=>{
  assert.throws(()=>distributeTaskEffortTotal([{...task('a',120),goal:'范围已变'}],300),/估算|复核/);
  assert.throws(()=>distributeTaskEffortTotal([{...scope,id:'unknown'}],300),/估算/);
  const tasks=[task('a',120),task('b',180)];
  const edits=distributeTaskEffortTotal(tasks,600);
  assert.throws(()=>applyTaskEffortEdits([tasks[0],{...tasks[1],goal:'被他人修改'}],edits),/变化/);
  const updated=applyTaskEffortEdits(tasks,edits);
  assert.deepEqual(updated.map(item=>item.effortEstimate.minutes),[240,360]);
  assert.equal(tasks[0].effortEstimate.minutes,120);
});

test('子任务单独修改更新汇总，草稿持久化后保留手工值与稳定标识',()=>{
  const draft=(id:string,minutes:number)=>({...newCreationTask({...scope,title:id,ownerId:'',participantIds:[],labels:[],startDate:'',endDate:'',effortEstimate:task(id,minutes).effortEstimate}),clientId:id});
  const form={request:'',decision:'independent' as const,mainTask:draft('root',999),subtasks:[draft('a',120),draft('b',180)]};
  const next=applyCreationEffortEdits(form,[{taskId:'a',expectedSignature:getTaskEffortEditSignature(form.subtasks[0]),estimate:createManualEffortEstimate(form.subtasks[0],{minutes:240,workMethod:'人工核对',reason:'增加复核'},form.subtasks[0].effortEstimate)}]);
  assert.equal(next.subtasks.reduce((sum,item)=>sum+item.effortEstimate!.minutes!,0),420);
  assert.equal(JSON.parse(JSON.stringify(next)).subtasks[0].effortEstimate.basis,'manual');
  assert.equal(next.mainTask.effortEstimate!.minutes,999);
  assert.throws(()=>applyCreationEffortEdits(form,[{taskId:'root',expectedSignature:getTaskEffortEditSignature(form.mainTask),estimate:task('root',100).effortEstimate}]),/子任务|范围/);
});


test('多层任务只调整叶子工时，保留中间任务的历史估算',()=>{
  const draft=(id:string,minutes:number)=>({...newCreationTask({...scope,title:id,ownerId:'',participantIds:[],labels:[],startDate:'',endDate:'',effortEstimate:task(id,minutes).effortEstimate}),clientId:id});
  const form={request:'',decision:'independent' as const,mainTask:draft('root',999),subtasks:[draft('branch',300),{...draft('a',120),parentClientId:'branch'},draft('b',180)]};
  const leaves=form.subtasks.filter(item=>item.clientId!=='branch').map(item=>({...item,id:item.clientId}));
  const updated=applyCreationEffortEdits(form,distributeTaskEffortTotal(leaves,600));
  assert.deepEqual(updated.subtasks.map(item=>item.effortEstimate?.minutes),[300,240,360]);
  assert.deepEqual(updated.subtasks[0],form.subtasks[0]);
});
