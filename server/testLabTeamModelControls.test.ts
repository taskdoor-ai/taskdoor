import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import {createRunner} from './test-lab/runner.ts';
import {memberReferences} from '../src/test-lab/member-references.ts';
const make=()=>{const path=join(mkdtempSync(join(tmpdir(),'lab-controls-')),'state.json');return {path,store:createLabStore(path,seedLab())};};
const options={apiKey:'test-only',model:'model-a',endpoint:'https://example.com/responses',maxOutputTokens:1000,timeoutMs:1000};
const output={rawOutput:'{}',usage:{inputTokens:1,outputTokens:2,totalTokens:3}};
test('成员名称责任增改删可持久化，引用成员拒绝删除',()=>{
 const {path,store}=make();let state=store.get();const team=state.teams[0];const otherBefore=structuredClone(state.teams[1]);team.members.push({id:'new-member',name:'新增成员',role:'',responsibilities:['编写检查表'],version:1});state=store.save(state.revision,state.teams,state.cases);
 const saved=state.teams[0].members.find(m=>m.id==='new-member')!;saved.name='修改名称';saved.responsibilities=['审核交付'];state=store.save(state.revision,state.teams,state.cases);
 assert.equal(createLabStore(path,seedLab()).get().teams[0].members.find(m=>m.id==='new-member')?.name,'修改名称');
 assert.deepEqual(memberReferences(state.teams[0],state.cases,'new-member'),[]);
 state.teams[0].members=state.teams[0].members.filter(m=>m.id!=='new-member');state=store.save(state.revision,state.teams,state.cases);assert.ok(!state.teams[0].members.some(m=>m.id==='new-member'));assert.deepEqual(state.teams[1],otherBefore);
 assert.ok(memberReferences(state.teams[0],state.cases,'lin').length);state.teams[0].members=state.teams[0].members.filter(m=>m.id!=='lin');assert.throws(()=>store.save(state.revision,state.teams,state.cases),/成员/);
});
test('关闭模型包括服务默认模型后无法发起调用；目录保留已关闭模型',()=>{
 const {path,store}=make();let calls=0;store.saveModels(store.get().revision,['model-a','model-b']);store.saveModels(store.get().revision,['model-b']);
 const runner=createRunner(store,options,async()=>{calls++;return output;});assert.throws(()=>runner.enqueue(['case-effort'],'disabled',{models:['model-a']}),/未启用/);assert.throws(()=>runner.enqueue(['case-effort'],'default-disabled'),/未启用/);assert.equal(calls,0);assert.equal(store.get().runs.length,0);
 assert.ok(createLabStore(path,seedLab()).get().modelCatalog?.includes('model-a'));
});
test('Jev 开关和验收条件在付费调用之前检查',()=>{
 const {store}=make();let calls=0;const judge={model:'jev-test',configured:true,review:async(id:string)=>{calls++;return store.get().runs.find(r=>r.id===id)!;}};const runner=createRunner(store,options,async()=>{calls++;return output;},undefined,judge);
 store.saveModels(store.get().revision,['model-a'],false);assert.throws(()=>runner.enqueue(['case-effort'],'judge-off',{models:['model-a'],judgeModel:'jev-test'}),/判断模型/);
 store.saveModels(store.get().revision,['model-a'],true);const state=store.get();const c=state.cases.find(c=>c.id==='case-effort')!;c.reviewChecklist=[];delete c.verification;delete c.expectedOutput;store.save(state.revision,state.teams,state.cases);assert.throws(()=>runner.enqueue(['case-effort'],'no-criteria',{judgeModel:'jev-test'}),/验收条件/);assert.equal(calls,0);
});
test('选择 Jev 只在生成后调用一次，重复提交不重复核对',async()=>{
 const {store}=make();store.saveModels(store.get().revision,['model-a'],true);let generated=0,judged=0;const runner=createRunner(store,options,async()=>{generated++;return output;},undefined,{model:'jev-test',configured:true,review:async(id)=>{judged++;const run=store.get().runs.find(r=>r.id===id)!;assert.equal(run.steps[0].rawOutput,'{}');assert.equal(run.judgeStatus,'running');assert.ok(run.judgeStartedAt);return run;}});
 const selection={models:['model-a'],judgeModel:'jev-test'};const[r]=runner.enqueue(['case-effort'],'same',selection);runner.enqueue(['case-effort'],'same',selection);await runner.idle();assert.equal(generated,1);assert.equal(judged,1);assert.equal(store.get().runs.find(x=>x.id===r.id)?.judgeStatus,'completed');
});
test('Jev 错误单独记录，不重跑生成、不吞掉原始输出',async()=>{
 const {store}=make();store.saveModels(store.get().revision,['model-a'],true);let calls=0;const runner=createRunner(store,options,async()=>{calls++;return output;},undefined,{model:'jev-test',configured:true,review:async()=>{throw new Error('判断服务超时');}});runner.enqueue(['case-effort'],'failed-judge',{judgeModel:'jev-test'});await runner.idle();const r=store.get().runs[0];assert.equal(calls,1);assert.equal(r.judgeStatus,'failed');assert.equal(r.judgeError,'判断服务超时');assert.equal(r.steps[0].rawOutput,'{}');assert.notEqual(r.error,r.judgeError);assert.ok(r.judgeStartedAt);assert.ok(r.judgeFinishedAt);assert.ok(Date.parse(r.judgeFinishedAt!)>=Date.parse(r.judgeStartedAt!));
});
test('评测选择文件包覆盖用例旧绑定，冻结版本并保留原用例；删除用例保留历史且重启不恢复',async()=>{
 const {path,store}=make();let state=store.addSkillVersion(store.get().revision,{skillId:'agentdoor-task-planner',label:'运行选择版本',notes:'',snapshot:'SELECTED_SKILL_CONTENT'});const version=state.skillVersions!.at(-1)!;const original=structuredClone(state.cases.find(c=>c.id==='case-effort')!);let calls=0;
 const runner=createRunner(store,options,async()=>{calls++;return output;});
 assert.throws(()=>runner.enqueue(['case-effort'],'wrong-version',{skillId:'agentdoor-task-status-analyzer',skillVersionId:version.id}));assert.equal(calls,0);
 const [run]=runner.enqueue(['case-effort'],'override-version',{skillId:'agentdoor-task-planner',skillVersionId:version.id});await runner.idle();
 const saved=store.get().runs.find(r=>r.id===run.id)!;assert.equal(saved.caseSnapshot.steps[0].skillId,'agentdoor-task-planner');assert.equal(saved.caseSnapshot.steps[0].skillVersionId,version.id);assert.equal(saved.steps[0].skillSnapshot,'SELECTED_SKILL_CONTENT');assert.deepEqual(store.get().cases.find(c=>c.id===original.id),original);
 state=store.get();store.save(state.revision,state.teams,state.cases.filter(c=>c.id!==original.id));const reopened=createLabStore(path,seedLab()).get();assert.ok(!reopened.cases.some(c=>c.id===original.id));assert.ok(reopened.runs.some(r=>r.id===run.id&&r.caseSnapshot.id===original.id));
});
test('新增团队可持久化，删除团队及其用例后不恢复，历史评测快照保留',async()=>{
 const {path,store}=make();const runner=createRunner(store,options,async()=>output);const [run]=runner.enqueue(['case-effort'],'team-delete-history');await runner.idle();let state=store.get();const before=structuredClone(state.runs.find(r=>r.id===run.id)!);const otherTeams=state.teams.filter(t=>t.id!==run.teamId);
 state=store.save(state.revision,[...state.teams,{id:'new-team-test',name:'新增测试团队',industry:'',description:'',archived:true,members:[],tasks:[],evidence:[]}],state.cases);assert.ok(createLabStore(path,seedLab()).get().teams.some(t=>t.id==='new-team-test'));
 state=store.save(state.revision,state.teams.filter(t=>t.id!==run.teamId&&t.id!=='new-team-test'),state.cases.filter(c=>c.teamId!==run.teamId));const reopened=createLabStore(path,seedLab()).get();assert.deepEqual(reopened.teams,otherTeams);assert.ok(!reopened.cases.some(c=>c.teamId===run.teamId));assert.equal(JSON.stringify(reopened.runs.find(r=>r.id===run.id)),JSON.stringify(before));
});
