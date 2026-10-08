import test from 'node:test';
import assert from 'node:assert/strict';
import {toPromptfoo} from './bridge.mjs';
const fixture={id:'run-a',batchId:'batch',caseId:'case',caseName:'脚本',model:'model-a',createdAt:'2026-09-29T00:00:00Z',status:'needs_review',caseSnapshot:{steps:[{id:'s1',prompt:'写脚本'}],assertions:[{id:'a',stepId:'s1'}],reviewChecklist:['核对语义']},steps:[{stepId:'s1',input:{request:'写脚本'},output:{summary:'真实答案'},rawOutput:'{"summary":"真实答案"}',durationMs:1234,usage:{inputTokens:10,outputTokens:3,totalTokens:13},structure:'passed',structureErrors:[],assertions:[{id:'a',label:'检查',status:'passed',message:'满足'}]}]};
test('导入真实输出、调用耗时与 Token，人工待核对不冒充最终通过',()=>{
 const data=toPromptfoo([fixture]); const result=data.results.results[0];
 assert.match(result.response.output,/真实答案/);
 assert.equal(result.metadata.rawOutput,fixture.steps[0].rawOutput);
 assert.equal(data.results.prompts[0].metrics.testPassCount,1);
 assert.equal(data.results.prompts[0].metrics.tokenUsage.total,13);
 assert.equal(result.latencyMs,1234);assert.equal(result.response.tokenUsage.total,13);
 assert.match(result.gradingResult.reason,/待人工核对/);
 assert.equal(result.metadata.finalAccepted,false);
});
test('不同模型按同一用例步骤对齐；未执行步骤不会伪造输出',()=>{
 const other={...fixture,id:'run-b',model:'model-b',status:'queued',steps:[]};
 const data=toPromptfoo([fixture,other]);
 assert.equal(data.results.prompts.length,2);
 assert.equal(data.results.results.length,1);
 assert.equal(data.results.results[0].testIdx,0);
});
