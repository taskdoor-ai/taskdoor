import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
test('旧版本按创建顺序编号，新版本独立递增且重启后稳定',()=>{
 const path=join(mkdtempSync(join(tmpdir(),'skill-number-')),'state.json');const seed=seedLab();seed.skillVersions=[{id:'old-b',skillId:'agentdoor-task-planner',label:'后一个',notes:'',snapshot:'test',hash:'x',createdAt:'2026-02-01'},{id:'old-a',skillId:'agentdoor-task-planner',label:'前一个',notes:'',snapshot:'test',hash:'y',createdAt:'2026-01-01'}];writeFileSync(path,JSON.stringify(seed));
 const store=createLabStore(path,seed);assert.equal(store.get().skillVersions!.find(v=>v.id==='old-a')!.versionNumber,1);assert.equal(store.get().skillVersions!.find(v=>v.id==='old-b')!.versionNumber,2);
 let state=store.addSkillVersion(store.get().revision,{skillId:'agentdoor-task-planner',label:'v3',notes:'',snapshot:'test'});assert.equal(state.skillVersions!.at(-1)!.versionNumber,3);
 state=store.addSkillVersion(state.revision,{skillId:'agentdoor-task-status-analyzer',label:'v1',notes:'',snapshot:'test'});assert.equal(state.skillVersions!.at(-1)!.versionNumber,1);
 assert.deepEqual(createLabStore(path,seed).get().skillVersions,state.skillVersions);
 assert.throws(()=>store.addSkillVersion(state.revision-1,{skillId:'agentdoor-task-planner',label:'v4',notes:'',snapshot:'test'}));
});
