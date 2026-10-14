import test from 'node:test';
import assert from 'node:assert/strict';
import * as recovery from './test-lab/preview-generation.ts';
import * as model from './test-lab/model.ts';
import {loadSkill} from './test-lab/skills.ts';
import {validateTaskPreview} from './test-lab/task-preview.ts';
import {readFileSync} from 'node:fs';
const schema=loadSkill('agentdoor-task-planner').previewSchema;
const doc=readFileSync(new URL('../skills/agentdoor-task-planner/references/task-preview.md',import.meta.url),'utf8');
const example=[...doc.matchAll(/```json\n([\s\S]*?)\n```/g)].map(match=>JSON.parse(match[1])).find(plan=>plan.tasks?.[0]?.children?.length);
const input={requestId:example.requestId,userRequest:'生成文案和海报',currentDate:'2026-10-09',timezone:'Asia/Shanghai',currentMemberId:'member-lead',members:['member-lead','member-writer','member-designer'].map(id=>({id,name:id,responsibilities:[]}))};
const options={apiKey:'test',endpoint:'https://example.com/responses',model:'deepseek/deepseek-v4.1-flash',maxOutputTokens:16000,timeoutMs:1000};
const response=(output:unknown)=>({rawOutput:JSON.stringify(output),usage:{inputTokens:10,outputTokens:20,totalTokens:30}});
const generate=(...args:any[])=>(recovery as any).generateTaskPreview(...args);

test('有效方案只调用一次，记录原始输出',async()=>{
 let calls=0;const r=await generate(options,'规则',input,schema,new AbortController().signal,async()=>{calls++;return response(example);});
 assert.equal(calls,1);assert.equal(r.attempts.length,1);assert.deepEqual(r.structureErrors,[]);assert.deepEqual(r.output,example);
});
test('估算对象的多余字段给出真实原因，不误报必须为 null',()=>{
 const bad=structuredClone(example);bad.tasks[0].effortEstimate={minutes:70,workMethod:'写作',reason:'按规模估算',reason_placeholder_removed:null};
 const errors=validateTaskPreview(schema,bad,input).join('\n');assert.match(errors,/reason_placeholder_removed/);assert.doesNotMatch(errors,/must be null/);
});
test('估算对象必填项与类型约束仍然严格校验，合法非空估算可用',()=>{
 const plan=structuredClone(example);plan.tasks[0].effortEstimate={minutes:70,workMethod:'写作',reason:'按规模估算'};
 assert.deepEqual(validateTaskPreview(schema,plan,input),[]);
 delete plan.tasks[0].effortEstimate.reason;
 assert.match(validateTaskPreview(schema,plan,input).join(),/缺少字段「reason」/);
 plan.tasks[0].effortEstimate.reason='按规模估算';plan.tasks[0].effortEstimate.minutes=0.5;
 assert.match(validateTaskPreview(schema,plan,input).join(),/integer/);
});
test('结构修正保留第一次原文并传递具体错误，不修改原始用户输入',async()=>{
 const bad=structuredClone(example);bad.tasks[0].effortEstimate={minutes:70,workMethod:'写作',reason:'按规模估算',reason_placeholder_removed:null};
 const before=structuredClone(input);let calls=0;
 const r=await generate(options,'规则',input,schema,new AbortController().signal,async(_o:any,instructions:string,supplied:any)=>{
  calls++;if(calls===1)return response(bad);
  assert.match(instructions,/修正/);assert.deepEqual(supplied.userRequest,input.userRequest);assert.ok(supplied.validationErrors.join().includes('reason_placeholder_removed'));assert.equal(supplied.invalidOutput,JSON.stringify(bad));return response(example);
 });
 assert.equal(calls,2);assert.deepEqual(input,before);assert.equal(r.attempts[0].rawOutput,JSON.stringify(bad));assert.equal(r.attempts[1].kind,'structure_repair');assert.deepEqual(r.structureErrors,[]);assert.equal(r.usage.totalTokens,60);
});
test('连续无效输出最多修正一次，最终仍失败',async()=>{
 let calls=0;const bad={...example,tasks:[]};const r=await generate(options,'规则',input,schema,new AbortController().signal,async()=>{calls++;return response(bad);});
 assert.equal(calls,2);assert.ok(r.structureErrors.length);assert.equal(r.attempts.length,2);
});
test('完成标准不能仅含标点、序列化任务或泄露的 JSON 分隔符',()=>{
 for(const criteria of [[', '],[JSON.stringify(example.tasks[0])],[',        "交付可编辑源文件",']]){
  const bad=structuredClone(example);bad.tasks[0].acceptanceCriteria=criteria;
  assert.match(validateTaskPreview(schema,bad,input).join('\n'),/完成标准/);
 }
 const legitimate=structuredClone(example);legitimate.tasks[0].acceptanceCriteria=['交付 UTF-8 JSON 文件，示例 {"name":"产品"}，包含 350ml 容量'];
 assert.deepEqual(validateTaskPreview(schema,legitimate,input),[]);
});
test('相同分支重复交付需修正，不误伤不同渠道或不同验收内容',()=>{
 const bad=structuredClone(example);const leaf=bad.tasks[0].children[0];
 bad.tasks[0].children.push({...structuredClone(leaf),clientId:'duplicate-copy'});
 assert.match(validateTaskPreview(schema,bad,input).join('\n'),/重复交付/);
 bad.tasks[0].children.at(-1).acceptanceCriteria=['为另一个渠道交付独立版本'];
 assert.deepEqual(validateTaskPreview(schema,bad,input),[]);
 const branches=structuredClone(example);const other=structuredClone(branches.tasks[0]);
 other.clientId='other-root';other.title='另一个渠道';other.children.forEach((t:any)=>t.clientId+='-other');branches.tasks.push(other);
 assert.deepEqual(validateTaskPreview(schema,branches,input),[]);
});
test('数组损坏会触发一次结构修正，原始内容保留且不会伪装通过',async()=>{
 const bad=structuredClone(example);bad.tasks[0].acceptanceCriteria=[', '];let calls=0;
 const r=await generate(options,'规则',input,schema,new AbortController().signal,async(_o:any,_i:string,supplied:any)=>{
  calls++;if(calls===1)return response(bad);
  assert.match(supplied.validationErrors.join('\n'),/完成标准/);return response(example);
 });
 assert.equal(calls,2);assert.equal(r.attempts[0].rawOutput,JSON.stringify(bad));assert.equal(r.attempts[1].kind,'structure_repair');assert.deepEqual(r.structureErrors,[]);
});
test('连接恢复后修正重复 ID，最多三次并保留每次输出和已报告用量',async()=>{
 let calls=0;const bad=structuredClone(example);bad.tasks[0].children[0].clientId=bad.tasks[0].clientId;
 const r=await generate(options,'规则',input,schema,new AbortController().signal,async(o:any,_i:string,supplied:any)=>{
  calls++;if(calls===1)throw new model.ModelConnectionError('ECONNRESET');
  assert.equal(o.freshConnection,true);
  if(calls===2)return response(bad);
  assert.match(supplied.validationErrors.join(),/临时任务 ID 重复/);return response(example);
 });
 assert.equal(calls,3);assert.deepEqual(r.structureErrors,[]);assert.equal(r.usage.totalTokens,60);
 assert.deepEqual(r.attempts.map((a:any)=>a.kind),['initial','connection_retry','structure_repair']);
 let n=0;const failed=await generate(options,'规则',input,schema,new AbortController().signal,async()=>{n++;throw new model.ModelConnectionError('ECONNRESET');});
 assert.equal(n,2);assert.match(failed.error,/ECONNRESET/);assert.equal(failed.usage.totalTokens,null);
});
test('瞬时连接中断最多补一次，不重试 HTTP、认证、输出预算耗尽或取消',async()=>{
 const ConnectionError=(model as any).ModelConnectionError;assert.equal(typeof ConnectionError,'function');
 let calls=0;const r=await generate(options,'规则',input,schema,new AbortController().signal,async()=>{calls++;if(calls===1)throw new ConnectionError('ECONNRESET');return response(example);});
 assert.equal(calls,2);assert.equal(r.attempts[1].kind,'connection_retry');assert.deepEqual(r.structureErrors,[]);
 for(const e of [new Error('HTTP 400'),new Error('认证失败'),new model.ModelResponseError('输出预算耗尽',response({})),new ConnectionError('ENOTFOUND')]){
  let n=0;const failed=await generate(options,'规则',input,schema,new AbortController().signal,async()=>{n++;throw e;});assert.equal(n,1);assert.ok(failed.error);
 }
 const controller=new AbortController();let n=0;const cancelled=await generate(options,'规则',input,schema,controller.signal,async()=>{n++;controller.abort();throw new ConnectionError('ECONNRESET');});assert.equal(n,1);assert.ok(cancelled.error);
});
