import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import {createRunner} from './test-lab/runner.ts';
import {loadSkill,labSkills} from './test-lab/skills.ts';
import {buildJevRequest} from './test-lab/jev-request.ts';
import {evaluateWithFallback} from './test-lab/judge-fallback.ts';
import {generateSubtaskSuggestions} from './test-lab/subtask-generation.ts';
import {buildSubtaskInput,type SubtaskInput} from './test-lab/subtask-suggestions.ts';
import {isSubtaskSuggestionsCase,isSubtaskSuggestionsSnapshot} from '../src/test-lab/subtask-case.ts';
import {validatePackage} from '../src/test-lab/skill-package.ts';
import type {LabRun} from '../src/test-lab/types.ts';
import type {ModelOptions} from './test-lab/model.ts';

const config:ModelOptions={apiKey:'test-not-real',endpoint:'https://example.invalid/responses',model:'test-model',maxOutputTokens:1000,timeoutMs:1000};
const atomicId='case-subtask-v1-atomic-script';
function makeStore(){const store=createLabStore(join(mkdtempSync(join(tmpdir(),'subtask-run-')),'state.json'),seedLab());store.saveModels(store.get().revision,['test-model']);return store;}
const noSplit=(input:SubtaskInput)=>({schemaVersion:'taskdoor.subtask-suggestions.v1',requestId:input.requestId,parentTaskId:input.currentTask.id,status:'no_split_needed',summary:'同一份脚本是一项独立交付，起草和自检无需拆成任务。',suggestions:[],coveredByExisting:[],contextGaps:[],questions:[],warnings:[]});

test('独立注册只读 Skill 与冻结协议，不加载创建树或共享写入契约',()=>{
  const skill=loadSkill('taskdoor-decompose-task');
  assert.equal(skill.outputMode,'subtasks');assert.ok(labSkills.some(item=>item.id==='taskdoor-decompose-task'));
  assert.equal(skill.previewSchema.properties.schemaVersion.const,'taskdoor.subtask-suggestions.v1');
  assert.equal(isSubtaskSuggestionsSnapshot(skill.snapshot),true);
  assert.ok(validatePackage(skill.snapshot,'taskdoor-decompose-task').every(file=>file.path.startsWith('skills/taskdoor-decompose-task/')));
  assert.ok(!skill.instructions.includes('本次为真实 MCP 执行'));assert.ok(!skill.snapshot.includes('skills/agentdoor-task-planner/'));
});

test('runner 只读快照输入，结构和断言有效，原团队/用例不变且不触发 MCP',async()=>{
  const store=makeStore(),before=store.getLibrary();let calls=0,mcpCalls=0;
  const runner=createRunner(store,config,async(_options,instructions,input)=>{calls++;assert.match(instructions,/只读子任务建议/);const snapshot=input as SubtaskInput;assert.ok(snapshot.currentTask.acceptanceCriteria.length);assert.ok(snapshot.existingChildren);assert.equal(snapshot.currentDate,'2026-10-16');return {rawOutput:JSON.stringify(noSplit(snapshot)),usage:{inputTokens:10,outputTokens:20,totalTokens:30}};},undefined,undefined,{url:'https://example.invalid/mcp',token:'unused',workspaceId:'unused'},async()=>{mcpCalls++;throw Error('不可调用 MCP');});
  const created=runner.enqueue([atomicId],'subtask-read-only',{executionMode:'subtasks',skillId:'taskdoor-decompose-task',skillVersionId:null});
  await runner.idle();const run=store.getRun(created[0].id)!;
  assert.equal(calls,1);assert.equal(mcpCalls,0);assert.equal(run.status,'needs_review');assert.equal(run.steps[0].structure,'passed');assert.ok(run.steps[0].assertions.every(item=>item.status==='passed'));assert.equal(run.review,null);
  assert.deepEqual(store.getLibrary().teams,before.teams);assert.deepEqual(store.getLibrary().cases,before.cases);assert.deepEqual(run.steps[0].before,run.steps[0].after);
  assert.equal(isSubtaskSuggestionsCase(run.caseSnapshot),true);assert.equal(isSubtaskSuggestionsCase({...run.caseSnapshot,steps:run.caseSnapshot.steps.map(step=>({...step,taskId:null}))}),false);
});

test('独立建议不能借创建 preview、旧 proposal 或 MCP 执行方式运行',()=>{
  const store=makeStore();let calls=0;const runner=createRunner(store,config,async()=>{calls++;throw Error('not called');});
  assert.throws(()=>runner.enqueue([atomicId],'wrong-preview',{executionMode:'preview',skillId:'taskdoor-decompose-task'}),/方案评测/);
  assert.throws(()=>runner.enqueue([atomicId],'wrong-proposal',{executionMode:'proposal',skillId:'taskdoor-decompose-task'}),/独立的一层建议/);
  assert.throws(()=>runner.enqueue([atomicId],'wrong-mcp',{executionMode:'mcp',skillId:'taskdoor-decompose-task'}),/MCP/);
  assert.equal(calls,0);assert.equal(store.get().runs.length,0);
});

test('结构修正最多一次，保留两个原文与总 Token，服务失败不重复调用',async()=>{
  const store=makeStore(),item=store.get().cases.find(item=>item.id===atomicId)!,input=buildSubtaskInput(item.dataSnapshot!,item,item.steps[0],'repair'),skill=loadSkill('taskdoor-decompose-task');let calls=0;
  const repaired=await generateSubtaskSuggestions(config,skill.instructions,input,skill.previewSchema,new AbortController().signal,async(_options,_instructions,actual)=>{calls++;if(calls===2)assert.ok((actual as Record<string,unknown>).validationFeedback);return {rawOutput:calls===1?'bad json':JSON.stringify(noSplit(input)),usage:{inputTokens:1,outputTokens:2,totalTokens:3}};});
  assert.equal(calls,2);assert.equal(repaired.structureErrors.length,0);assert.equal(repaired.attempts[0].rawOutput,'bad json');assert.deepEqual(repaired.attempts.map(item=>item.kind),['initial','structure_repair']);assert.equal(repaired.usage.totalTokens,6);
  let failures=0;const failed=await generateSubtaskSuggestions(config,skill.instructions,input,skill.previewSchema,new AbortController().signal,async()=>{failures++;throw Error('服务超时');});assert.equal(failures,1);assert.equal(failed.error,'服务超时');
});

test('Jev 与 PPIO 裁判使用独立只读边界，不要求创建/写回回执',async()=>{
  const store=makeStore(),item=store.get().cases.find(item=>item.id===atomicId)!,input=buildSubtaskInput(item.dataSnapshot!,item,item.steps[0],'judge');
  const run:LabRun={id:'judge-run',batchId:'judge-batch',requestId:'judge',caseId:item.id,caseName:item.name,actorId:item.actorId,teamId:item.teamId,status:'needs_review',createdAt:'2026-10-16T00:00:00Z',startedAt:null,finishedAt:'2026-10-16T00:00:00Z',model:'test-model',endpoint:'https://example.invalid/responses',selection:{executionMode:'subtasks',skillId:'taskdoor-decompose-task',judgeModel:'qwen/qwen3.7-plus'},caseSnapshot:item,teamSnapshot:item.dataSnapshot!,steps:[{stepId:'s1',skillId:'taskdoor-decompose-task',input,output:noSplit(input),rawOutput:JSON.stringify(noSplit(input)),error:null,assertions:[],structure:'passed',structureErrors:[],durationMs:1,usage:{inputTokens:1,outputTokens:2,totalTokens:3},skillHash:'hash',promptHash:'hash',before:item.dataSnapshot!,after:item.dataSnapshot!}],error:null,review:null};
  const jev=buildJevRequest(run,'jev-1.13.0');assert.ok(Object.values(jev.questions).every(question=>question.instructions.scope.includes('read-only next-level')));
  const review=await evaluateWithFallback(run,{model:'jev-1.13.0',timeoutMs:1000},{...config,model:'qwen/qwen3.7-plus'},undefined,async(_options,instructions,actual)=>{assert.match(instructions,/只读子任务建议/);assert.match(instructions,/没有MCP调用或写入回执是符合边界/);const questions=(actual as {questions:{id:string}[]}).questions;return {rawOutput:JSON.stringify({items:questions.map(item=>({id:item.id,choice:'met',reason:'有快照依据'}))}),usage:{inputTokens:1,outputTokens:2,totalTokens:3}};});
  assert.equal(review.policyVersion,'subtask-suggestions-judge-v1');assert.ok(review.items.every(item=>item.choice==='met'));assert.equal(run.review,null);
});
