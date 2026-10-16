import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import * as preview from './test-lab/task-preview.ts';
import {loadSkill} from './test-lab/skills.ts';
import {callModel,supportsPreviewSchema} from './test-lab/model.ts';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const options={apiKey:'test',endpoint:'https://example.com/v1/responses',model:'deepseek/deepseek-v4.1-flash',maxOutputTokens:16000,timeoutMs:1000};
const schema={type:'object',properties:{ownerMemberId:{type:'string',enum:['real-id']}},required:['ownerMemberId'],additionalProperties:false};

test('DeepSeek 预览把 Schema 发给接口，不再仅请求任意 JSON 对象',async()=>{
 await callModel({...options,outputSchema:schema} as any,'JSON',{},new AbortController().signal,async(_url,init)=>{
  const body=JSON.parse(String(init?.body));assert.equal(body.text.format.type,'json_schema');assert.deepEqual(body.text.format.schema,schema);assert.equal(body.text.format.strict,true);assert.equal(body.max_output_tokens,16000);assert.equal(body.text.verbosity,undefined);
  return Response.json({output:[{content:[{type:'output_text',text:'{"ownerMemberId":"real-id"}'}]}]});
 });
});
test('Qwen 避开产生数组内容损坏的严格解码，预览仍返回 JSON 并由本地验证',async()=>{
 assert.equal(supportsPreviewSchema('qwen/qwen3.7-plus'),false);
 assert.equal(supportsPreviewSchema('deepseek/deepseek-v4.1-flash'),true);
 await callModel({...options,model:'qwen/qwen3.7-plus',outputSchema:schema} as any,'JSON',{},new AbortController().signal,async(_url,init)=>{
  const body=JSON.parse(String(init?.body));assert.deepEqual(body.response_format,{type:'json_object'});assert.equal(body.enable_thinking,false);
  return Response.json({choices:[{finish_reason:'stop',message:{content:'{"ownerMemberId":"real-id"}'}}]});
 });
});
test('运行 Schema 绑定当前成员 ID 和 requestId，保留单主任务边界、有效空成员目录，不修改 Skill Schema',()=>{
 const build=(preview as any).buildTaskPreviewResponseSchema;assert.equal(typeof build,'function');
 const original=loadSkill('agentdoor-task-planner').previewSchema;const before=structuredClone(original);
 const input={requestId:'current-request',userRequest:'生成任务',currentDate:'2026-10-09',timezone:'Asia/Shanghai',currentMemberId:'real-id',members:[{id:'real-id',name:'tiger huang',responsibilities:[]}]};
 const next=build(original,input);assert.deepEqual(original,before);assert.equal(next.properties.requestId.const,input.requestId);
 const ajv=new Ajv2020({strict:false});const owner=ajv.compile(next.$defs.task.properties.ownerMemberId);assert.equal(owner('real-id'),true);assert.equal(owner('tiger huang'),false);assert.equal(owner('made-up'),false);assert.equal(owner(null),true);
 const participant=ajv.compile(next.$defs.task.properties.participants.items.properties.memberId);assert.equal(participant('real-id'),true);assert.equal(participant('tiger huang'),false);
 assert.equal(next.properties.tasks.maxItems,1);assert.equal(next.$defs.task.properties.children.maxItems,0);
 assert.equal(next.$defs.task.properties.children.items.$ref,'#/$defs/task');assert.ok(ajv.compile(next));
 const empty=build(original,{...input,members:[]});assert.ok(ajv.compile(empty));assert.equal(empty.$defs.task.properties.participants.maxItems,0);assert.deepEqual(empty.$defs.task.properties.ownerMemberId,{type:'null'});assert.equal(empty.properties.tasks.maxItems,1);assert.equal(empty.$defs.task.properties.children.maxItems,0);
});
test('未点名的客服参考分工允许负责人或参与者实现，用户输入及旧运行快照不变',()=>{
 const store=createLabStore(join(mkdtempSync(join(tmpdir(),'lab-role-contract-')),'state.json'),seedLab());
 const cases=store.getLibrary().cases;
 for(const id of ['planning-core-v1-d-channels','planning-core-v1-d-reuse']){
  const c=cases.find(c=>c.id===id)!;assert.ok(c);assert.ok(c.steps[0].prompt.includes('按职责')||c.steps[0].prompt.includes('安排分工'));
  const checks=c.expectedOutput!.checks.map(c=>c.criterion).join('\n');assert.match(checks,/负责人或参与者/);assert.doesNotMatch(checks,/客服协作与核对由tiger huang负责|客服口径核查由tiger huang参与且/);
 }
});
