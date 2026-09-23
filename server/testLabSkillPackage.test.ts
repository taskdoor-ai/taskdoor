import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validatePackage,serializePackage,packageDiff} from '../src/test-lab/skill-package.ts';
import {loadSkill,labSkills,resolveSkill,hash} from './test-lab/skills.ts';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
const id='agentdoor-task-planner';
test('工作区两个入口包包含当前规则、示例和完整依赖，可逐文件校验',()=>{
 for(const skill of labSkills){const pack=loadSkill(skill.id);const files=validatePackage(pack.snapshot,skill.id);assert.ok(files.some(f=>f.path===`skills/${skill.id}/examples/decision-pairs.md`));assert.ok(files.some(f=>f.path==='skills/shared/current-prd-contract.md'));assert.equal(new Set(files.map(f=>f.path)).size,files.length);assert.equal(hash(pack.snapshot),pack.hash);}
});
test('保存包拒绝路径穿越、重复文件、缺少入口和损坏JSON',()=>{
 const entry={path:`skills/${id}/SKILL.md`,content:'# test'};
 for(const files of [[entry,{path:'../secret',content:'x'}],[entry,entry],[{path:'references/a.md',content:'a'}],[entry,{path:`skills/${id}/data.json`,content:'{'}]])assert.throws(()=>validatePackage(serializePackage(files),id));
});
test('新版本冻结全部文件和来源，修改子文件不改变旧版本解析',()=>{
 const store=createLabStore(join(mkdtempSync(join(tmpdir(),'skill-package-')),'state.json'),seedLab());
 let state=store.get();const original=loadSkill(id).snapshot;
 state=store.addSkillVersion(state.revision,{skillId:id,label:'base',notes:'',snapshot:original,baseVersionId:null});
 const first=state.skillVersions!.at(-1)!;const files=validatePackage(original,id);files.push({path:`skills/${id}/references/custom.md`,content:'# 自定义规则'});
 const next=serializePackage(files);assert.equal(packageDiff(original,next).added.length,1);
 state=store.addSkillVersion(state.revision,{skillId:id,label:'next',notes:'新增参考',snapshot:next,baseVersionId:first.id});
 const second=state.skillVersions!.at(-1)!;assert.equal(second.baseVersionId,first.id);assert.equal(second.files!.length,first.files!.length+1);
 assert.equal(resolveSkill(state,id,first.id).snapshot,original.trim());assert.equal(resolveSkill(state,id,second.id).snapshot,next.trim());
 assert.ok(second.files!.every(f=>f.hash===hash(f.content)));
 assert.throws(()=>store.addSkillVersion(state.revision,{skillId:'agentdoor-task-diagnostician',label:'bad',notes:'',snapshot:'legacy',baseVersionId:first.id}),/不属于/);
});

test('Skill 库只有创建与分析，分析包含问题核对而不加载独立诊断入口',()=>{
 assert.deepEqual(labSkills.map(s=>s.title),['创建任务','任务分析']);
 const pack=loadSkill('agentdoor-task-status-analyzer').snapshot;
 assert.ok(pack.includes('/references/problem-analysis.md'));
 assert.ok(!pack.includes('--- FILE: skills/agentdoor-task-diagnostician/SKILL.md'));
});
