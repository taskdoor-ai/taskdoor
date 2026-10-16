import test from 'node:test';
import assert from 'node:assert/strict';
import {callModel} from './test-lab/model.ts';
const options={apiKey:'never-print-this-key',endpoint:'https://example.com/v1/responses',model:'deepseek/deepseek-v4.1-flash',maxOutputTokens:16000,timeoutMs:1000};
test('连接错误保留安全的底层错误码，不泄漏凭据和上游文本，也不自动重试',async()=>{
 let calls=0;
 await assert.rejects(()=>callModel(options,'JSON',{},new AbortController().signal,async()=>{
  calls++;throw new TypeError('secret upstream debug',{cause:Object.assign(new Error('never-print-this-key'),{code:'ECONNRESET'})});
 }),e=>e instanceof Error&&e.message.includes('ECONNRESET')&&!e.message.includes('never-print-this-key')&&!e.message.includes('secret upstream'));
 assert.equal(calls,1);
});

test('DeepSeek sends the native analysis schema and closes the connection',async()=>{
 const {analysisResponseSchema}=await import('./test-lab/analysis-response-schema.ts');
 let body:any,headers:any;
 await callModel({...options,outputSchema:analysisResponseSchema()},'JSON',{requestId:'r'},new AbortController().signal,async(_url,init)=>{
  body=JSON.parse(String(init?.body));headers=init?.headers;
  return new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:'{}'}]}],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}),{status:200});
 });
 assert.equal(body.text.format.type,'json_schema');
 assert.ok(body.text.format.schema.properties.result.properties.progress.properties.comparison.anyOf[1].properties.timing.required.includes('startOn'));
 assert.equal(headers.Connection,'close');
});

test('连续的 Mercury 分析与 Qwen 判断请求默认关闭空闲连接',async()=>{
 for(const model of ['pa/mercury-5.5','qwen/qwen3.7-plus']){
  let calls=0;
  const transport:typeof fetch=async(_url,init)=>{
   calls++;
   assert.equal(new Headers(init?.headers).get('Connection'),'close');
   return Response.json(model.startsWith('qwen/')?{choices:[{message:{content:'{}'}}]}:{output:[{content:[{type:'output_text',text:'{}'}]}]});
  };
  for(let i=0;i<2;i++)await callModel({...options,model},'JSON',{},new AbortController().signal,transport);
  assert.equal(calls,2);
 }
});

test('recorded workload requires a chart without leaking expected fixture answers',async()=>{
 const {analysisResponseSchema}=await import('./test-lab/analysis-response-schema.ts');
 const record={scopeVersion:'v1',workload:[{at:'2026-10-09',scopeMinutes:240,completedMinutes:120,scopeVersion:'v1'}]};
 const recorded:any=analysisResponseSchema({evidence:[{content:JSON.stringify(record)}]});
 const missing:any=analysisResponseSchema({evidence:[{content:JSON.stringify(record),readState:'unavailable'}]});
 const chart=recorded.properties.result.properties.progress.properties.comparison;
 assert.equal(chart.type,'object');
 assert.ok(missing.properties.result.properties.progress.properties.comparison.anyOf);
 assert.ok(!JSON.stringify(recorded).includes('2026-10-09'));
});

test('native schema requires one assessment per input criterion without embedding answer percentages',async()=>{
 const {analysisResponseSchema}=await import('./test-lab/analysis-response-schema.ts');
 const schema:any=analysisResponseSchema({taskId:'target',analysisContext:{tasks:[{id:'other',criteria:{items:[{}]}},{id:'target',criteria:{items:[{}, {}, {}, {}]}}]}});
 const assessments=schema.properties.result.properties.criterionAssessments;
 assert.equal(assessments.minItems,4);assert.equal(assessments.maxItems,4);
 assert.deepEqual(assessments.items.properties.percent.enum,[0,25,50,75,100,null]);
 assert.ok(assessments.items.required.includes('criterionId'));assert.ok(assessments.items.required.includes('evidenceRefs'));
});

test('matching native schema requires percentages and separates summary strings from detailed assessments',async()=>{
 const {memberResponseSchema}=await import('./test-lab/member-response-schema.ts');
 const schema:any=memberResponseSchema({candidateMemberIds:['candidate']});
 const candidates=schema.properties.result.properties.candidates;
 assert.equal(candidates.minItems,1);assert.equal(candidates.maxItems,1);
 assert.ok(candidates.items.required.includes('matchPercent'));assert.ok(candidates.items.required.includes('requirementAssessments'));
 assert.equal(candidates.items.properties.matchedRequirements.items.type,'string');
 assert.equal(candidates.items.properties.requirementAssessments.items.type,'object');
 assert.equal(JSON.stringify(schema).includes('candidate"'),false);
});
