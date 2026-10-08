import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateWithFallback,JUDGE_MODELS} from './test-lab/judge-fallback.ts';
import type {LabRun} from '../src/test-lab/types.ts';
const run={id:'r',status:'needs_review',model:'deepseek/deepseek-v4.1-flash',caseSnapshot:{steps:[{id:'s',prompt:'request'}],reviewChecklist:['criterion']},steps:[{stepId:'s',input:{text:'x'.repeat(210000)},output:{ok:true},error:null}]} as unknown as LabRun;
const options={apiKey:'test',endpoint:'https://example.com/responses',model:JUDGE_MODELS[0],maxOutputTokens:4000,timeoutMs:1000};
test('oversize Jev material falls back once and records actual model without probabilities',async()=>{
 let calls=0;const review=await evaluateWithFallback(run,{apiKey:'test',model:'jev',timeoutMs:1000},options,async()=>{throw Error('核对材料过长');},async(_o,_i,input)=>{calls++;assert.ok(JSON.stringify(input).includes('x'.repeat(100)));return {rawOutput:JSON.stringify({items:[{id:'q0',choice:'met',reason:'actual output contains ok=true'}]}),usage:{inputTokens:1,outputTokens:2,totalTokens:3}};});
 assert.equal(calls,1);assert.equal(review.model,JUDGE_MODELS[0]);assert.equal(review.requestedModel,'jev');assert.equal(review.items[0].probabilities,null);assert.equal(review.items[0].source,'model');
});
test('authentication errors do not silently trigger paid fallback',async()=>{
 await assert.rejects(()=>evaluateWithFallback(run,{apiKey:'test',model:'jev',timeoutMs:1000},options,async()=>{throw Error('Jev 认证失败');},async()=>{throw Error('must not call');}),/认证/);
});
test('fallback rejects invented or missing criterion IDs',async()=>{
 await assert.rejects(()=>evaluateWithFallback(run,{apiKey:'test',model:'jev',timeoutMs:1000},options,async()=>{throw Error('核对材料过长');},async()=>({rawOutput:'{"items":[]}',usage:{inputTokens:1,outputTokens:1,totalTokens:2}})),/不完整/);
});
