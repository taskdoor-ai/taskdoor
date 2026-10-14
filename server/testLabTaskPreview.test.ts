import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadSkill} from './test-lab/skills.ts';
import {buildPreviewInput,validateTaskPreview,type PreviewInput} from './test-lab/task-preview.ts';
import {createRunner} from './test-lab/runner.ts';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import {previewCaseForEvaluation} from '../src/test-lab/task-preview-case.ts';

const skill=loadSkill('agentdoor-task-planner');
const doc=readFileSync(new URL('../skills/agentdoor-task-planner/references/task-preview.md',import.meta.url),'utf8');
const examples=[...doc.matchAll(/```json\n([\s\S]*?)\n```/g)].map(match=>JSON.parse(match[1]));
const example=examples.find(plan=>plan.tasks?.[0]?.children?.length);
const input:PreviewInput={requestId:example.requestId,userRequest:'安排文案和海报',currentDate:'2026-10-09',timezone:'Asia/Shanghai',currentMemberId:'member-lead',members:['member-lead','member-writer','member-designer'].map(id=>({id,name:id,responsibilities:[]}))};

test('当前主任务方案无需旧前置依赖字段即可完成业务校验',()=>{
  const main=examples.find(plan=>plan.tasks?.[0]?.children?.length===0);
  assert.deepEqual(validateTaskPreview(skill.previewSchema,main,{...input,requestId:main.requestId}),[]);
  const old=structuredClone(main);old.tasks[0].dependsOnClientIds=[];
  assert.match(validateTaskPreview(skill.previewSchema,old,input).join('\n'),/不允许字段.*dependsOnClientIds/);
});

test('冻结生产预览包不再注入写入契约，旧快照仍可辨别',()=>{
  assert.equal(skill.outputMode,'preview');
  assert.ok(skill.instructions.includes('taskdoor.task-preview.v1'));
  assert.ok(!skill.instructions.includes('本次为真实 MCP 执行'));
  assert.ok(!skill.instructions.includes('agentdoor.task-plan.v0.2'));
  assert.equal(loadSkill('agentdoor-task-planner',skill.snapshot).outputMode,'preview');
  assert.equal(loadSkill('agentdoor-task-planner','# 历史版本').outputMode,'legacy');
});

test('可编辑嵌套示例符合冻结 Schema，用户修改字段后仍是有效方案',()=>{
  assert.deepEqual(validateTaskPreview(skill.previewSchema,example,input),[]);
  const edited=structuredClone(example);edited.tasks[0].title='用户编辑的任务';
  edited.tasks[0].children[0].dueDate='2026-12-26';
  assert.deepEqual(validateTaskPreview(skill.previewSchema,edited,input),[]);
  assert.equal(edited.tasks[0].clientId,example.tasks[0].clientId);
});

test('拒绝不存在的成员、重复 ID、无效日期和已移除的依赖字段',()=>{
  const bad=structuredClone(example),root=bad.tasks[0],children=root.children;
  root.ownerMemberId='not-a-member';root.dueDate='2026-02-30';
  const errors=validateTaskPreview(skill.previewSchema,bad,input).join('\n');
  assert.match(errors,/负责人不在/);assert.match(errors,/日期无效/);
  children[0].dependsOnClientIds=[];
  assert.match(validateTaskPreview(skill.previewSchema,bad,input).join('\n'),/不允许字段.*dependsOnClientIds/);
  delete children[0].dependsOnClientIds;
  children[1].clientId=children[0].clientId;
  assert.match(validateTaskPreview(skill.previewSchema,bad,input).join('\n'),/ID 重复/);
});

test('不能附带真实回执或把空方案、待确认问题标为 ready',()=>{
  assert.ok(validateTaskPreview(skill.previewSchema,{...example,writeReceipt:{id:'fake'}},input).length);
  assert.ok(validateTaskPreview(skill.previewSchema,{...example,tasks:[]},input).length);
  assert.ok(validateTaskPreview(skill.previewSchema,{...example,questions:['请选择负责人']},input).length);
});

test('预览验收保留业务要求和自然输入，源用例与历史不被改写',()=>{
  const c=seedLab().cases.find(c=>c.id==='case-create')!;
  c.reviewChecklist=['通过真实MCP创建，每个任务get_task回读，负责人和参与者使用已核对的真实成员ID；目标与完成标准实际保存。','Jage负责主视觉，尺寸1080×1920。'];
  const before=structuredClone(c),derived=previewCaseForEvaluation(c);
  assert.deepEqual(c,before);assert.deepEqual(derived.steps,c.steps);
  assert.match(derived.reviewChecklist[0],/名称、目标和逐条完成标准与用户需求一致/);
  assert.doesNotMatch(derived.reviewChecklist.join(''),/MCP|回读/);
  assert.equal(derived.reviewChecklist[1],'Jage负责主视觉，尺寸1080×1920。');
});

test('预览评测只调用一次模型，即使用户说确认也不触发 MCP，提交立即留存记录',async()=>{
  const store=createLabStore(join(mkdtempSync(join(tmpdir(),'task-preview-')),'state.json'),seedLab());
  const state=store.getLibrary(),team=state.teams.find(t=>!t.archived)!;
  const c=structuredClone(state.cases.find(c=>c.steps[0].skillId==='agentdoor-task-planner')!);
  c.id='preview-case';c.origin='manual';c.archived=false;c.enabled=true;c.teamId=team.id;c.actorId=team.members[0].id;
  c.steps=[{id:'s1',skillId:'agentdoor-task-planner',prompt:'确认方案，创建一项文案任务。',taskId:null,events:[],usePreviousOutput:false}];
  c.assertions=[];c.reviewChecklist=['生成一项文案任务方案'];delete c.verification;delete c.contextMode;delete c.workload;delete c.expectedOutput;
  store.save(state.revision,state.teams,[...state.cases,c]);
  const current=store.getLibrary();
  const updated=store.addSkillVersion(current.revision,{skillId:'agentdoor-task-planner',label:'预览测试版',notes:'',snapshot:skill.snapshot});
  const version=updated.skillVersions!.at(-1)!;
  store.setSkillDefault(updated.revision,'agentdoor-task-planner',version.id);
  let calls=0,mcpCalls=0;
  const runner=createRunner(store,{apiKey:'test',endpoint:'https://example.com/responses',model:'test',maxOutputTokens:2000,timeoutMs:1000},async(_options,instructions,supplied)=>{
    calls++;const i=supplied as PreviewInput;
    assert.ok(!('tasks' in i));assert.ok(!('evidence' in i));assert.equal(i.members.length,team.members.length);
    assert.ok(!instructions.includes('本次为真实 MCP 执行'));
    const plan=structuredClone(example);plan.requestId=i.requestId;
    plan.tasks=[{...plan.tasks[0],ownerMemberId:i.currentMemberId,participants:[],children:[]}];
    return {rawOutput:JSON.stringify(plan),usage:{inputTokens:1,outputTokens:1,totalTokens:2}};
  },undefined,undefined,{url:'https://example.com/mcp',token:'test',workspaceId:'test'},async()=>{mcpCalls++;throw Error('不应写入');});
  assert.throws(()=>runner.enqueue([c.id],'cannot-create',{executionMode:'mcp'}),/版本与评测方式不一致/);
  assert.equal(store.getRuns(()=>true).length,0);
  const [queued]=runner.enqueue([c.id],'preview-only',{executionMode:'preview'});
  assert.equal(calls,0);assert.equal(queued.status,'queued');
  await runner.idle();const run=store.getRun(queued.id)!;
  assert.equal(calls,1);assert.equal(mcpCalls,0);assert.equal(run.steps[0].structure,'passed');
  assert.equal(run.steps[0].mcp,undefined);assert.deepEqual(store.getLibrary().teams,state.teams);
  assert.deepEqual(buildPreviewInput(team,{...c,steps:[{...c.steps[0],evaluatedAt:'2026-10-08T17:00:00Z'}]},'date').currentDate,'2026-10-09');
});
