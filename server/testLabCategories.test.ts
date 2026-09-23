import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLabStore } from './test-lab/store.ts';
import { seedLab } from './test-lab/seeds.ts';
import { applyEvents, buildModelInput } from './test-lab/context.ts';
import { evaluateAssertions } from './test-lab/assertions.ts';
import { caseSchema, validateRelations } from './test-lab/schema.ts';
import { categoryList } from '../src/test-lab/categories.tsx';
import { addCoverageCases } from './test-lab/coverage-seeds.ts';
const setup=()=>{const path=join(mkdtempSync(join(tmpdir(),'lab-categories-')),'state.json');return {path,store:createLabStore(path,seedLab())};};

test('分类可以先于用例创建，去重、修订冲突校验，改名同步当前用例但不动历史快照',()=>{
 const {store,path}=setup();let state=store.get();state=store.saveCategory(state.revision,{name:'  边界验收  ',description:'缺少输入与未知进度'});
 assert.ok(categoryList(state).includes('边界验收'));assert.throws(()=>store.saveCategory(state.revision,{name:'边界验收',description:''}),/已存在/);
 assert.throws(()=>store.saveCategory(state.revision-1,{name:'其他',description:''}),/数据版本/);
 const c=state.cases[0],oldVersion=c.version,oldName=c.category;
 state=store.saveCategory(state.revision,{name:'基础规划验收',description:'验证规划',previousName:oldName});
 assert.equal(state.cases[0].category,'基础规划验收');assert.equal(state.cases[0].version,oldVersion+1);
 assert.equal(createLabStore(path,seedLab()).get().categories?.find(c=>c.name==='边界验收')?.description,'缺少输入与未知进度');
 assert.throws(()=>store.saveCategory(state.revision,{name:' ',description:''}));
});

test('跨行业新增用例有有效输入、逐步预期、前置核验和输出断言，所有事件满足关系校验',()=>{
 const {store}=setup();const state=store.get();const cases=state.cases.filter(c=>c.origin==='coverage/2026-09'||c.origin==='decomposition/2026-09');
 assert.equal(cases.filter(c=>c.origin==='decomposition/2026-09').length,50);
 assert.ok(cases.length>=75,`新增 ${cases.length} 条`);assert.equal(new Set(cases.map(c=>c.teamId)).size,5);
 assert.equal(new Set(cases.map(c=>c.teamId+c.steps.map(s=>s.prompt).join('\n'))).size,cases.length);
 for(const c of cases){caseSchema.parse(c);const team=state.teams.find(t=>t.id===c.teamId)!;
  for(const rule of c.verification!.fixtureChecks){const subjects=rule.subject==='member'?team.members:rule.subject==='task'?team.tasks:team.evidence;assert.equal(evaluateAssertions(subjects.find(s=>s.id===rule.subjectId),[{...rule,stepId:'preflight'}])[0].status,'passed',c.id+rule.label);}
  let sandbox=team;for(const s of c.steps){assert.ok(c.verification!.expectedResults.some(e=>e.stepId===s.id&&e.criteria.length));assert.ok(c.assertions.some(a=>a.stepId===s.id));sandbox=applyEvents(sandbox,s);validateRelations([sandbox],[c]);const input=JSON.stringify(buildModelInput(sandbox,c,s,'audit',[]));assert.ok(!input.includes('fixtureChecks'));assert.ok(!input.includes('expectedResults'));}
 }
});
test('重复启动不重建删除的用例，不覆盖编辑，不重复追加分类',()=>{
 const {store,path}=setup();const state=store.get(),c=state.cases.find(c=>c.origin==='coverage/2026-09')!;
 c.name='我修改的用例';const removed=state.cases.find(item=>item.origin==='coverage/2026-09'&&item.id!==c.id)!;store.save(state.revision,state.teams,state.cases.filter(item=>item.id!==removed.id));
 const reopened=createLabStore(path,seedLab()).get();assert.equal(reopened.cases.find(item=>item.id===c.id)?.name,'我修改的用例');assert.ok(!reopened.cases.some(item=>item.id===removed.id));assert.equal(addCoverageCases(reopened),false);
});

test('拆解专项重启保留用户编辑和删除，且第二轮使用前次草稿',()=>{
 const {store,path}=setup();let state=store.get();const cases=state.cases.filter(c=>c.origin==='decomposition/2026-09');
 const edited=cases[0],removed=cases[1];edited.name='用户调整的拆解案例';
 const multi=cases.find(c=>c.id.endsWith('-revisions'))!;assert.equal(multi.steps.length,2);assert.equal(multi.steps[1].usePreviousOutput,true);
 store.save(state.revision,state.teams,state.cases.filter(c=>c.id!==removed.id));
 state=createLabStore(path,seedLab()).get();assert.equal(state.cases.find(c=>c.id===edited.id)?.name,'用户调整的拆解案例');assert.ok(!state.cases.some(c=>c.id===removed.id));
 assert.equal(state.cases.filter(c=>c.origin==='decomposition/2026-09').length,49);
});
