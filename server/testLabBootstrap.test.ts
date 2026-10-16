import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import type {LabRun,LabState} from '../src/test-lab/types.ts';

function fixture(){
  const store=createLabStore(join(mkdtempSync(join(tmpdir(),'lab-bootstrap-')),'state.json'),seedLab());
  const library=store.getLibrary(),item=structuredClone(library.cases[0]);
  const team=structuredClone(library.teams.find(team=>team.id===item.teamId)!);
  const body='历史文件与模型原文'.repeat(2_500);
  item.dataSnapshot={...team,evidence:[{id:'large-file',taskId:team.tasks[0].id,authorId:item.actorId,kind:'文件',title:'冻结附件',content:body,createdAt:'2026-10-16',version:1,visibleToIds:[]}]};
  item.legacyInput={body};item.legacyExpected={body};
  item.assertions=[{id:'case-assertion',label:'原文一致',stepId:item.steps[0].id,path:'$',operator:'equals',expected:{body}}];
  item.expectedOutput={version:1,checks:[{id:'expected-check',stepId:item.steps[0].id,subject:'目标',criterion:'结果可核对',expected:{body}}]};
  item.steps[0].events=[{type:'evidence',evidence:item.dataSnapshot.evidence[0]}];
  const run:LabRun={id:'large-run',batchId:'selected-batch',requestId:'frozen-request',caseId:item.id,caseName:item.name,actorId:item.actorId,teamId:team.id,status:'needs_review',createdAt:'2026-10-16T00:00:00Z',startedAt:null,finishedAt:null,model:'test',endpoint:'https://example.invalid/responses',selection:{executionMode:'preview'},caseSnapshot:item,teamSnapshot:item.dataSnapshot,steps:[{stepId:item.steps[0].id,skillId:item.steps[0].skillId,input:{body},output:{body},rawOutput:body,error:null,assertions:[{id:'result-check',label:'原文一致',status:'passed',actual:{body},expected:{body},message:'已通过'}],structure:'passed',structureErrors:[],durationMs:123,usage:{inputTokens:7,outputTokens:8,totalTokens:15},skillHash:'frozen-skill-hash',promptHash:'frozen-prompt-hash',skillSnapshot:body,previewAttempts:[{kind:'initial',rawOutput:body,error:null,structureErrors:[],durationMs:123,promptHash:'frozen-prompt-hash',usage:{inputTokens:7,outputTokens:8,totalTokens:15}}],before:item.dataSnapshot,after:item.dataSnapshot}],error:null,review:null,judgeStatus:'completed',jevReviews:[{id:'review',at:'2026-10-16',model:'judge',requestedModel:'judge',policyVersion:'frozen-policy',requestHash:'frozen-request-hash',durationMs:12,usage:{input_tokens:2,output_tokens:3},items:[{id:'goal',stepId:null,label:'目标',choice:'met',confidence:null,probabilities:null,source:'model',note:'目标与完成标准一致'}]}]};
  store.appendRuns([run,{...structuredClone(run),id:'same-batch-run'},{...structuredClone(run),id:'other-run',batchId:'other-batch',requestId:'other-request'}]);
  return {store,run};
}

test('初始化历史摘要去除重复夹具、原文与断言大值，保留状态、裁判和用量',()=>{
  const {store,run}=fixture(),before=store.getRun(run.id)!;
  const summary=store.getBootstrapState().runs.find(item=>item.id===run.id)!;
  assert.ok(summary.caseSnapshot.dataSnapshot===undefined,'历史摘要不携带夹具正文');
  assert.ok(summary.caseSnapshot.legacyInput===undefined);assert.ok(summary.caseSnapshot.legacyExpected===undefined);
  assert.ok(summary.caseSnapshot.assertions[0].expected===null);
  assert.ok(summary.caseSnapshot.expectedOutput!.checks[0].expected===null);
  assert.deepEqual(summary.caseSnapshot.steps[0].events,[]);
  assert.equal(summary.steps[0].previewAttempts![0].rawOutput,'');
  assert.ok(summary.steps[0].assertions[0].actual===null);assert.ok(summary.steps[0].assertions[0].expected===null);
  assert.equal(summary.steps[0].rawOutput,'');assert.equal(summary.steps[0].input,null);assert.equal(summary.steps[0].output,null);
  assert.equal(summary.steps[0].structure,'passed');assert.equal(summary.status,'needs_review');
  assert.deepEqual(summary.steps[0].usage,run.steps[0].usage);assert.equal(summary.steps[0].durationMs,123);
  assert.deepEqual(summary.jevReviews,run.jevReviews);assert.equal(summary.review,null);
  assert.ok(Buffer.byteLength(JSON.stringify(summary))<Buffer.byteLength(JSON.stringify(before))/10);
  summary.caseSnapshot.name='只修改摘要';summary.steps[0].usage.totalTokens=0;
  assert.deepEqual(store.getRun(run.id),before,'裁剪与调用者修改摘要均不改变冻结原文');
});

test('选中批次或运行保留完整正文，按 requestId 查询仍返回完整冻结记录',()=>{
  const {store,run}=fixture(),before=store.getRuns(()=>true);
  const batch=store.getBootstrapState(run.batchId);
  for(const original of before.filter(item=>item.batchId===run.batchId))assert.deepEqual(batch.runs.find(item=>item.id===original.id),original);
  assert.ok(batch.runs.find(item=>item.id==='other-run')!.caseSnapshot.dataSnapshot===undefined);
  const selected=store.getBootstrapState(undefined,'other-run');
  assert.deepEqual(selected.runs.find(item=>item.id==='other-run'),before.find(item=>item.id==='other-run'));
  assert.equal(selected.runs.find(item=>item.id===run.id)!.steps[0].previewAttempts![0].rawOutput,'');
  assert.deepEqual(store.getRuns(item=>item.requestId===run.requestId),before.filter(item=>item.requestId===run.requestId));
  assert.deepEqual(store.getRuns(()=>true),before);
});

test('配置写入可返回摘要并保留完整版本文件，普通 store 返回语义和历史不变',()=>{
  const {store,run}=fixture(),before=store.getRun(run.id)!;
  let state:LabState=store.getLibrary();
  state=store.addSkillVersion(state.revision,{skillId:'agentdoor-task-planner',label:'冻结测试版本',notes:'目标与完成标准',snapshot:'# 冻结的完整规则'},{summary:true});
  const version=state.skillVersions!.at(-1)!;
  const checkSummary=()=>{assert.ok(state.runs[0].caseSnapshot.dataSnapshot===undefined);assert.equal(state.skillVersions!.at(-1)!.snapshot,version.snapshot);assert.deepEqual(state.skillVersions!.at(-1)!.files,version.files);};
  checkSummary();
  state=store.setSkillDefault(state.revision,version.skillId,version.id,{summary:true});checkSummary();
  state=store.updateSkillVersionNotes(state.revision,version.id,{notes:'补充真实目标与日期'},{summary:true});checkSummary();
  state=store.save(state.revision,state.teams,state.cases,{summary:true});checkSummary();
  const full=store.updateSkillVersionNotes(state.revision,version.id,{notes:'补充真实目标与日期'});
  assert.deepEqual(full.runs.find(item=>item.id===run.id),before);
  assert.deepEqual(store.getRun(run.id),before);
  assert.equal(state.skillDefaults![version.skillId],version.id);
});
