import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import {curateWorkflowFocusCases} from './test-lab/workflow-focus-cases.ts';
import {availableMcpCreationCases} from '../src/test-lab/mcp-case.ts';
import {editableSchema,validateRelations} from './test-lab/schema.ts';

test('当前团队收敛为36条正常流程、拆解分配与基础信息用例，其他团队也移除协议边界',()=>{
 const store=createLabStore(join(mkdtempSync(join(tmpdir(),'lab-focus-')),'state.json'),seedLab());
 const state=store.get();
 const selectable=availableMcpCreationCases(state.cases,'lab-content');
 assert.equal(selectable.length,36);
 assert.equal(selectable.filter(c=>c.origin==='planning-core-v1').length,24);
 assert.equal(selectable.filter(c=>c.tags?.includes('重点：创建流程')).length,4);
 assert.equal(selectable.filter(c=>c.tags?.includes('重点：任务基础信息')).length,8);
 for(const team of state.teams.filter(t=>!t.archived)){
  const active=availableMcpCreationCases(state.cases,team.id);
  assert.ok(active.length>=12);
  assert.ok(active.every(c=>['workflow-focus-v1','planning-core-v1'].includes(c.origin??'')));
  assert.ok(!active.some(c=>/幂等|保真|版本冲突|只读协作|转义/.test(c.name)));
 }
 for(const c of selectable){
  assert.ok(c.requiresMemberContext);
  assert.ok(!/MCP|create_task|memberId|幂等|回读|工具/.test(c.steps[0].prompt));
 }
 const parsed=editableSchema.parse({expectedRevision:state.revision,teams:state.teams,cases:state.cases});
 validateRelations(parsed.teams,parsed.cases);
 const original=structuredClone(state.cases);
 const sample=structuredClone(selectable[0]);
 const mixed=[...state.cases,{...sample,id:'disabled',enabled:false},{...sample,id:'archived',archived:true},{...sample,id:'other-team',teamId:'elsewhere'}];
 assert.deepEqual(availableMcpCreationCases(mixed,'lab-content').map(c=>c.id),selectable.map(c=>c.id));
 assert.deepEqual(state.cases,original);
});

test('归档不改历史运行和自定义用例，重载不复活边界用例或覆盖编辑',()=>{
 const path=join(mkdtempSync(join(tmpdir(),'lab-focus-persist-')),'state.json');
 const store=createLabStore(path,seedLab());const state=store.get();
 const old=state.cases.find(c=>c.id==='mcp-live-retry')!;
 assert.ok(old.archived);assert.equal(old.enabled,false);
 const custom={...structuredClone(state.cases.find(c=>c.origin==='workflow-focus-v1')!),id:'custom-case',origin:undefined,name:'用户自定义用例'};
 state.cases.push(custom);
 const current=state.cases.find(c=>c.origin==='workflow-focus-v1')!;
 current.steps[0].prompt='用户调整后的创建需求';
 store.save(state.revision,state.teams,state.cases);
 const saved=store.get();const runSnapshots=JSON.stringify(saved.runs);
 assert.equal(curateWorkflowFocusCases(saved),false);
 assert.equal(JSON.stringify(saved.runs),runSnapshots);
 const reloaded=createLabStore(path,seedLab()).get();
 assert.equal(reloaded.cases.find(c=>c.id===current.id)!.steps[0].prompt,'用户调整后的创建需求');
 assert.equal(reloaded.cases.find(c=>c.id==='custom-case')!.archived,false);
 assert.equal(reloaded.cases.find(c=>c.id===old.id)!.archived,true);
 assert.equal(reloaded.cases.length,saved.cases.length);
 assert.deepEqual(reloaded.runs,saved.runs);
});
