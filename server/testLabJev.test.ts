import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJevRequest, evaluateWithJev, createJevReviewer } from './test-lab/jev.ts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLabStore } from './test-lab/store.ts';
import { seedLab } from './test-lab/seeds.ts';
import type { LabRun } from '../src/test-lab/types.ts';

const run = { id:'run', status:'needs_review', caseSnapshot:{ steps:[{id:'one',prompt:'写一篇文章'}], reviewChecklist:['责任分配合理'], verification:{expectedResults:[{stepId:'one',criteria:['只创建一个任务']}] } }, steps:[{stepId:'one',input:{members:['writer']},output:{tasks:[{title:'文章'}]},error:null}], teamSnapshot:{secret:'HIDDEN_TEAM_DATA'} } as unknown as LabRun;
const options={apiKey:'test-secret',model:'jev-1.13.0',timeoutMs:1000};
const answer={type:'choice',choice:'met',probabilities:{met:0.9,unmet:0.05,insufficient:0.05},confidence:0.8};
test('Jev uses frozen visible inputs and asks separately about expectations and review items',()=>{
 const request=buildJevRequest(run,options.model);
 assert.equal(Object.keys(request.questions).length,2);
 assert.ok(JSON.stringify(request).includes('只创建一个任务'));
 assert.ok(!JSON.stringify(request).includes('HIDDEN_TEAM_DATA'));
 assert.throws(()=>buildJevRequest({...run,status:'running'},options.model),/结束/);
});
test('Jev preserves probabilities and model version without changing acceptance',async()=>{
 const before=structuredClone(run);
 const review=await evaluateWithJev(run,options,async(url,init)=>{
  assert.equal(String(url),'https://api.typesafe.ai/v1/systemone');
  assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-secret');
  assert.ok(!String(init?.body).includes('test-secret'));
  const request=JSON.parse(String(init?.body));
  return Response.json({model:'jev-1.13.0',answers:Object.fromEntries(Object.keys(request.questions).map(id=>[id,answer])),usage:{input_tokens:30,output_tokens:10}});
 });
 assert.equal(review.items[0].choice,'met');assert.equal(review.items[0].confidence,0.8);
 assert.equal(review.model,'jev-1.13.0');assert.deepEqual(run,before);
});
test('Jev rejects missing or invalid answers and hides upstream errors',async()=>{
 await assert.rejects(()=>evaluateWithJev(run,options,async()=>Response.json({model:'jev',answers:{}})),/无效/);
 await assert.rejects(()=>evaluateWithJev(run,options,async()=>new Response('test-secret',{status:401})),e=>e instanceof Error&&!e.message.includes('test-secret')&&e.message.includes('认证'));
});
test('Missing output is unknown locally and never sent as valid output',async()=>{
 let calls=0;
 const review=await evaluateWithJev({...run,steps:[]},options,async()=>{calls++;throw Error('must not call');});
 assert.equal(calls,0);assert.ok(review.items.every(item=>item.choice==='insufficient'&&item.confidence===null));
});
test('补判断可以指定PPIO模型，原始生成选择与快照保持不变',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'judge-existing-'));
 try{
  const store=createLabStore(join(directory,'state.json'),seedLab());
  store.updateRuns(runs=>runs.push(structuredClone(run)));
  const before=store.getRun(run.id)!;
  const reviewer=createJevReviewer(store,options,fetch,async supplied=>{
   assert.equal(supplied.selection?.judgeModel,'qwen/qwen3.7-plus');
   return {id:'review-explicit',at:new Date().toISOString(),model:'qwen/qwen3.7-plus',requestedModel:'qwen/qwen3.7-plus',policyVersion:'evidence-judge-v2',requestHash:'local-check',durationMs:1,usage:null,items:[]};
  });
  await reviewer(run.id,'qwen/qwen3.7-plus');
  const saved=store.getRun(run.id)!;
  assert.deepEqual(saved.selection,before.selection);
  assert.deepEqual(saved.caseSnapshot,before.caseSnapshot);
  assert.deepEqual(saved.steps,before.steps);
  assert.equal(saved.jevReviews?.at(-1)?.requestedModel,'qwen/qwen3.7-plus');
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('补判断失败保存原因，重试清理旧状态并保留输出',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'judge-retry-'));
 try{
  const store=createLabStore(join(directory,'state.json'),seedLab());
  store.updateRuns(runs=>runs.push({...structuredClone(run),judgeStatus:'skipped',judgeSkipReason:'旧的跳过原因'}));
  let calls=0;
  const reviewer=createJevReviewer(store,options,fetch,async()=>{
   const current=store.getRun(run.id)!;
   assert.equal(current.judgeStatus,'running');
   assert.equal(current.judgeError,undefined);
   assert.equal(current.judgeSkipReason,undefined);
   if(++calls===1)throw Error('连接中断');
   return {id:'review-retry',at:new Date().toISOString(),model:'qwen/qwen3.7-plus',requestedModel:'qwen/qwen3.7-plus',policyVersion:'evidence-judge-v2',requestHash:'local-check',durationMs:1,usage:null,items:[]};
  });
  await assert.rejects(()=>reviewer(run.id,'qwen/qwen3.7-plus'),/连接中断/);
  assert.equal(store.getRun(run.id)!.judgeStatus,'failed');
  assert.equal(store.getRun(run.id)!.judgeError,'连接中断');
  await reviewer(run.id,'qwen/qwen3.7-plus');
  const saved=store.getRun(run.id)!;
  assert.equal(saved.judgeStatus,'completed');
  assert.equal(saved.judgeError,undefined);
  assert.deepEqual(saved.steps,run.steps);
  assert.equal(saved.jevReviews?.length,1);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('Review history persists without overwriting acceptance and duplicate calls are rejected',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'jev-test-'));
 try{
  const path=join(directory,'state.json'),store=createLabStore(path,seedLab());
  store.updateRuns(runs=>runs.push(structuredClone(run)));
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const reviewer=createJevReviewer(store,options,async(_url,init)=>{
   await gate;const request=JSON.parse(String(init?.body));
   return Response.json({model:'jev-1.13.0',answers:Object.fromEntries(Object.keys(request.questions).map(id=>[id,answer]))});
  });
  const first=reviewer(run.id);
  await assert.rejects(()=>reviewer(run.id),/正在/);release();
  const saved=await first;
  assert.equal(saved.status,run.status);assert.equal(saved.jevReviews?.length,1);
  const reopened=createLabStore(path,seedLab()).get().runs.find(r=>r.id===run.id)!;
  assert.deepEqual(reopened.jevReviews,saved.jevReviews);
  await reviewer(run.id);assert.equal(store.get().runs[0].jevReviews?.length,2);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
