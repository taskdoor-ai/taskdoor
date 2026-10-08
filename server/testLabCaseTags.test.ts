import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import {caseSchema} from './test-lab/schema.ts';
import {buildModelInput} from './test-lab/context.ts';
test('标签初始化、编辑及清空可持久化，不进入模型输入且拒绝重复标签',()=>{
 const path=join(mkdtempSync(join(tmpdir(),'lab-tags-')),'state.json');const store=createLabStore(path,seedLab());let state=store.get();const c=state.cases.find(c=>c.id==='lab-content-creation-contract-split')!;assert.ok(c.tags?.includes('重点：任务拆解'));assert.ok(c.tags?.includes('重点：成员匹配'));c.tags=['自定义验收分类'];state=store.save(state.revision,state.teams,state.cases);assert.deepEqual(createLabStore(path,seedLab()).get().cases.find(x=>x.id===c.id)?.tags,['自定义验收分类']);assert.equal(JSON.stringify(buildModelInput(state.teams.find(t=>t.id===c.teamId)!,c,c.steps[0],'test',[])).includes('自定义验收分类'),false);assert.throws(()=>caseSchema.parse({...c,tags:['重复','重复']}));
 state.cases.find(x=>x.id===c.id)!.tags=[];store.save(state.revision,state.teams,state.cases);assert.deepEqual(createLabStore(path,seedLab()).get().cases.find(x=>x.id===c.id)?.tags,[]);
});
