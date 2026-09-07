import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateAssertions } from './test-lab/assertions.ts';
import { callModel, type ModelOptions } from './test-lab/model.ts';
import { createRunner } from './test-lab/runner.ts';
import { createLabStore } from './test-lab/store.ts';
import { seedLab } from './test-lab/seeds.ts';
const config:ModelOptions={apiKey:'test-key-not-real',endpoint:'https://api.ppinfra.com/openai/v1/responses',model:'test-model',maxOutputTokens:1000,timeoutMs:1000};

test('缺少断言值为未知而非通过，数字规则不隐式转字符串',()=>{
  const a={id:'a',label:'数值',stepId:'s1',path:'result.value',operator:'gte' as const,expected:3};
  assert.equal(evaluateAssertions({},[a])[0].status,'unknown');
  assert.equal(evaluateAssertions({result:{value:4}},[a])[0].status,'passed');
  assert.equal(evaluateAssertions({result:{value:'4'}},[a])[0].status,'failed');
});
test('真实 Responses 适配保留文本与 Token，无隐式格式修复或工具',async()=>{
  let calls=0;
  const result=await callModel(config,'json instructions',{message:'hello'},new AbortController().signal,async (_url,init)=>{
    calls++;const body=JSON.parse(String(init?.body));assert.equal(body.store,false);assert.equal(body.tools,undefined);
    assert.ok(!JSON.stringify(body).includes('test-key-not-real'));
    return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"ok":true}'}]}],usage:{input_tokens:20,output_tokens:5,total_tokens:25}}),{status:200});
  });
  assert.equal(calls,1);assert.equal(result.rawOutput,'{"ok":true}');assert.equal(result.usage.totalTokens,25);
});
test('上游认证错误只返回安全信息，不泄露错误正文',async()=>{
  await assert.rejects(()=>callModel(config,'json',{},new AbortController().signal,async()=>new Response('secret-token',{status:401})),(e:Error)=>!e.message.includes('secret-token')&&e.message.includes('认证'));
});
test('队列同键幂等，失败原文保留，不自动重试和改变原团队',async()=>{
  const store=createLabStore(join(mkdtempSync(join(tmpdir(),'lab-run-')),'state.json'),seedLab());
  const before=store.get().teams;let calls=0;
  const runner=createRunner(store,config,async()=>{calls++;return {rawOutput:'这不是 JSON',usage:{inputTokens:1,outputTokens:2,totalTokens:3}};});
  const runs=runner.enqueue(['case-effort'],'same-key');
  assert.equal(runner.enqueue(['case-effort'],'same-key')[0].id,runs[0].id);
  assert.throws(()=>runner.enqueue(['case-create'],'same-key'),/不同/);
  await runner.idle();
  const run=store.get().runs[0];assert.equal(calls,1);assert.equal(run.status,'failed');assert.equal(run.steps[0].rawOutput,'这不是 JSON');assert.deepEqual(store.get().teams,before);
});
test('排队取消不会调用上游，活动取消会结束本地状态',async()=>{
  const store=createLabStore(join(mkdtempSync(join(tmpdir(),'lab-cancel-')),'state.json'),seedLab());
  let calls=0;
  const runner=createRunner(store,config,async(_a,_b,_c,signal)=>{calls++;return new Promise((_,reject)=>{signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});});});
  const runs=runner.enqueue(['case-effort','case-diagnosis'],'batch-cancel');
  await new Promise(resolve=>setTimeout(resolve,20));runner.cancel(runs[1].id);runner.cancel(runs[0].id);await runner.idle();
  assert.equal(calls,1);assert.ok(store.get().runs.every(r=>r.status==='cancelled'));
});
