import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOutput } from './test-lab/validation.ts';
import { buildModelInput } from './test-lab/context.ts';
import { seedLab } from './test-lab/seeds.ts';
import { ModelResponseError, callModel } from './test-lab/model.ts';
const state=seedLab(),c=state.cases.find(c=>c.id==='case-priority')!;
const input=buildModelInput(state.teams[0],c,c.steps[0],'run',[]);
const output=()=>({schemaVersion:'agentdoor.personal-priority.v0.1',skillId:'agentdoor-personal-priority',ruleVersion:'PRIORITY-2026-09-03-v1',requestId:input.requestId,principalId:input.principalId,teamId:input.teamId,inputVersions:input.inputVersions,coverage:input.coverage,evaluatedAt:input.evaluatedAt,status:'ready',result:{rankedTasks:[],excluded:[]},evidenceRefs:[],unknowns:[],warnings:[],writeReceipt:null});
test('输出引用及版本必须属于当前快照',()=>{
  assert.deepEqual(validateOutput('agentdoor-personal-priority',output(),input),[]);
  assert.ok(validateOutput('agentdoor-personal-priority',{...output(),evidenceRefs:['hidden-task']},input).some(e=>e.includes('引用')));
  assert.ok(validateOutput('agentdoor-personal-priority',{...output(),inputVersions:{}},input).some(e=>e.includes('版本')));
});
test('排序拒绝已完成任务和错误权重，正确公式仍需身份状态校验',()=>{
  const o=output() as any;o.result.rankedTasks=[{rank:1,taskId:'past-script',taskVersion:1,factors:{B:20,C:0,P:0,D:0,H:0,Q:0},I:20,U:0,W:12,reason:'历史任务'}];
  assert.ok(validateOutput('agentdoor-personal-priority',o,input).some(e=>e.includes('入选')));
  o.result.rankedTasks[0].W=100;assert.ok(validateOutput('agentdoor-personal-priority',o,input).some(e=>e.includes('权重')));
});
test('模型截断保留已返回原文和用量，不能当作成功',async()=>{
  await assert.rejects(()=>callModel({apiKey:'test-only',endpoint:'https://api.ppinfra.com/openai/v1/responses',model:'test',maxOutputTokens:512,timeoutMs:1000},'json',{},new AbortController().signal,async()=>new Response(JSON.stringify({status:'incomplete',output:[{content:[{type:'output_text',text:'{"partial":'}]}],usage:{total_tokens:10}}))),e=>e instanceof ModelResponseError&&e.response.rawOutput==='{"partial":'&&e.response.usage.totalTokens===10);
});
