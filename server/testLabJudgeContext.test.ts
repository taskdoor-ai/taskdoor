import test from 'node:test';
import assert from 'node:assert/strict';
import {packJudgeState} from './test-lab/judge-context.ts';
import {buildJevRequest, evaluateWithJev} from './test-lab/jev.ts';
import {callModel} from './test-lab/model.ts';
import type {LabRun} from '../src/test-lab/types.ts';
function restore(packed:ReturnType<typeof packJudgeState>){
 function decode(v:any):any{
  if(typeof v==='string'&&/^@\d+$/.test(v))return packed.texts[Number(v.slice(1))];
  if(v&&typeof v==='object'&&Array.isArray(v.$literal))return Object.fromEntries(v.$literal.map(([k,x]:any[])=>[decode(k),decode(x)]));
  if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&typeof v.$text==='number')return packed.texts[v.$text];
  if(v&&typeof v==='object'&&Array.isArray(v.$columns)&&Array.isArray(v.$rows)){const cols=decode(v.$columns);return v.$rows.map((row:any[])=>Object.fromEntries(row.map((x,i)=>[cols[i],decode(x)])));}
  if(Array.isArray(v))return v.map(decode);
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,decode(x)]));return v;
 }
 const decoded=decode(packed.data);
 function records(v:any):any{
  if(Array.isArray(v))return v.map(records);
  if(v&&typeof v==='object'){
   if(typeof v.$base==='number'){const result=structuredClone(decoded.records[v.$base]);for(const k of v.$omit??[])delete result[k];return {...result,...records(v.$set??{})};}
   return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,records(x)]));
  }return v;
 }
 return decoded.recordReferences?records(decoded.data):decoded.data;
}
test('Compression round trips tasks, responsibilities, conflicting evidence, null and absent fields',()=>{
 const rows=Array.from({length:10},(_,i)=>({id:'task-'+i,owner:'成员名称以及具体责任'.repeat(5),goal:'目标'.repeat(80),score:i,nullable:null}));
 const state={literalReference:'@3',reserved:{$text:9,$columns:['a'],$rows:[[1]],$literal:'literal'},steps:[{input:{tasks:rows,mixed:[{a:null},{b:false},{a:''}],evidence:[{id:'same',text:'旧材料'},{id:'same',text:'冲突的新材料'}]},output:{tasks:rows}}]};
 const before=structuredClone(state);const packed=packJudgeState(state);
 assert.deepEqual(restore(packed),state);assert.deepEqual(state,before);assert.ok(JSON.stringify(packed).length<JSON.stringify(state).length);
});
test('Large repetitive visible context passes old character cap without leaking team snapshot or truncating output',()=>{
 const tasks=Array.from({length:15},(_,i)=>({id:i,content:'同一份长证据，不应丢弃。'.repeat(600)}));
 const input={tasks,sources:tasks};const output={message:'模型实际结果'};
 const run={status:'needs_review',caseSnapshot:{steps:[{id:'s',prompt:'拆解任务'}],reviewChecklist:['责任匹配'],},steps:[{stepId:'s',input,output,error:null}],teamSnapshot:{secret:'HIDDEN'}} as unknown as LabRun;
 const request=buildJevRequest(run,'jev-1.13.0');
 assert.ok(JSON.stringify(input).length>48000);assert.ok(JSON.stringify(request).length<48000);
 assert.ok(!JSON.stringify(request).includes('HIDDEN'));
 const decoded=restore((typeof request.state==='string'?JSON.parse(request.state):request.state) as ReturnType<typeof packJudgeState>);assert.deepEqual(decoded.steps[0].input,input);assert.deepEqual(decoded.steps[0].output,output);
});

import {canonicalJudgeInput} from './test-lab/canonical-judge-input.ts';
test('Canonical context preserves changed duplicate views and all raw evidence',()=>{
 const task={id:'t',title:'任务',goal:'目标',acceptanceCriteria:['交付'],status:'待开始',dueAt:null};
 const input={tasks:[task],members:[],evidence:[{id:'e',content:'原始材料'}],evaluatedAt:'now',context:{tasks:[{...task,status:'open',updatedAt:'now',dueOn:null,sourceRefs:['t']}],files:[{id:'e',content:'不同材料'}]},unknown:'keep'};
 const compressed=canonicalJudgeInput(input);
 assert.equal(compressed.context.tasks,undefined);assert.deepEqual(compressed.tasks,input.tasks);assert.deepEqual(compressed.evidence,input.evidence);assert.deepEqual(compressed.context.files,input.context.files);assert.equal(compressed.unknown,'keep');assert.equal(input.context.tasks.length,1);
});
test('Reserved record markers remain literal',()=>{const value={nested:{$base:0,$set:{x:1}},text:'@0'};assert.deepEqual(restore(packJudgeState(value)),value);});

test('Generation sends ordinary JSON without making the model decode a dictionary',async()=>{
 const records=Array.from({length:20},(_,i)=>({id:`t${i}`,goal:'完整证据，不得截断。'.repeat(300),status:'open',owner:'member'}));
 const input={tasks:records,context:{tasks:records},literal:'@0'};
 const before=structuredClone(input);
 await callModel({apiKey:'test',endpoint:'https://example.com/responses',model:'test',timeoutMs:1000,maxOutputTokens:16000},'skill instructions',input,new AbortController().signal,async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  const content=body.input[0].content;
  const serialized=content.slice(content.indexOf('\n')+1);
  assert.deepEqual(JSON.parse(serialized),input);
  assert.equal(body.max_output_tokens,16000);
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]});
 });
 assert.deepEqual(input,before);
});

test('Small generation inputs remain ordinary JSON',async()=>{
 const input={message:'short'};
 await callModel({apiKey:'test',endpoint:'https://example.com/responses',model:'test',timeoutMs:1000,maxOutputTokens:1000},'skill',input,new AbortController().signal,async(_url,init)=>{
  const content=JSON.parse(String(init?.body)).input[0].content;
  assert.deepEqual(JSON.parse(content.slice(content.indexOf('\n')+1)),input);
  return Response.json({output:[{content:[{type:'output_text',text:'{}'}]}]});
 });
});

test('A run without valid output is judged locally even when its unused input exceeds the cap',async()=>{
 const run={status:'failed',caseSnapshot:{steps:[{id:'s',prompt:'request'}],reviewChecklist:['criterion']},steps:[{stepId:'s',input:{text:'x'.repeat(250000)},output:null,error:'timeout'}]} as unknown as LabRun;
 let calls=0;
 const review=await evaluateWithJev(run,{apiKey:'test',model:'jev',timeoutMs:1000},async()=>{calls++;throw Error('must not send');});
 assert.equal(calls,0);assert.equal(review.items[0].choice,'insufficient');
});

test('Unique oversized evidence is rejected before transport instead of truncated',async()=>{
 const run={status:'needs_review',caseSnapshot:{steps:[{id:'s',prompt:'request'}],reviewChecklist:['criterion']},steps:[{stepId:'s',input:{text:'x'.repeat(250000)},output:{ok:true},error:null}]} as unknown as LabRun;
 let calls=0;
 await assert.rejects(()=>evaluateWithJev(run,{apiKey:'test',model:'jev',timeoutMs:1000},async()=>{calls++;throw Error('must not send');}),/200,000/);
 assert.equal(calls,0);
});

test('Generation timeout aborts the request exactly once and user cancellation stays distinct',async()=>{
 const options={apiKey:'test',endpoint:'https://example.com/responses',model:'test',timeoutMs:10,maxOutputTokens:1000};
 let calls=0;
 const transport:typeof fetch=async(_url,init)=>{calls++;return new Promise((_resolve,reject)=>{init!.signal!.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});});};
 await assert.rejects(()=>callModel(options,'skill',{},new AbortController().signal,transport),/模型调用超时/);
 assert.equal(calls,1);
 const controller=new AbortController();
 const pending=callModel({...options,timeoutMs:1000},'skill',{},controller.signal,transport);
 controller.abort();
 await assert.rejects(()=>pending,/运行已取消/);
 assert.equal(calls,2);
});
