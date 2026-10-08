import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import {buildModelInput} from './test-lab/context.ts';
import {createRunner} from './test-lab/runner.ts';
import {buildJevRequest} from './test-lab/jev.ts';
import {loadSkill} from './test-lab/skills.ts';
import {caseSchema,validateRelations} from './test-lab/schema.ts';
test('创建场景使用当前任务或首次空列表，不传忙闲或预期答案；JSON实际进入判断请求',async()=>{
 const path=join(mkdtempSync(join(tmpdir(),'lab-context-')),'state.json');const store=createLabStore(path,seedLab());const state=store.get();assert.ok(!state.cases.some(c=>c.origin==='workload/2026-09'));
 const first=state.cases.find(c=>c.id==='lab-content-creation-contract-first')!;const existing=state.cases.find(c=>c.id==='lab-content-creation-contract-estimate')!;const team=state.teams.find(t=>t.id===first.teamId)!;
 const input=buildModelInput(team,first,first.steps[0],'first',[]);assert.deepEqual(input.tasks,[]);assert.equal('workload' in input,false);assert.equal('expectedOutput' in input,false);
 const context=buildModelInput(team,existing,existing.steps[0],'existing',[]);assert.ok(context.tasks.length);assert.ok(context.tasks.some(t=>t.ownerId==='lin'));assert.equal(JSON.stringify(context).includes('scenario-result'),false);
 const bad=structuredClone(first);bad.expectedOutput!.checks[0].stepId='missing';assert.throws(()=>validateRelations(state.teams,[bad]),/预期检查/);assert.throws(()=>caseSchema.parse({...first,expectedOutput:{version:1,checks:[]}}));
 let sent:unknown;const runner=createRunner(store,{apiKey:'test',endpoint:'https://example.com',model:'test',maxOutputTokens:1000,timeoutMs:1000},async(_o,_s,input)=>{sent=input;return {rawOutput:'{}',usage:{inputTokens:1,outputTokens:1,totalTokens:2}};});const[r]=runner.enqueue([existing.id],'context-test');await runner.idle();assert.ok((sent as any).tasks.length);const saved=store.get().runs.find(x=>x.id===r.id)!;const judgment=buildJevRequest(saved,'jev-test');const firstQuestion=JSON.parse(judgment.questions.q0.instructions.criterion);assert.equal(firstQuestion.expected.ewdHours,3.5);assert.equal(firstQuestion.expected.personDays,0.4375);assert.equal(firstQuestion.id,'scenario-result');
 const next=store.get();next.cases.find(c=>c.id===existing.id)!.expectedOutput!.checks[0].criterion='用户已调整验收';store.save(next.revision,next.teams,next.cases);const reopened=createLabStore(path,seedLab()).get();assert.equal(reopened.cases.find(c=>c.id===existing.id)!.expectedOutput!.checks[0].criterion,'用户已调整验收');assert.notEqual(reopened.runs.find(x=>x.id===r.id)!.caseSnapshot.expectedOutput!.checks[0].criterion,'用户已调整验收');
 const skill=loadSkill('agentdoor-task-planner');assert.ok(skill.snapshot.includes('ownerRecommendation.reason 中'));assert.ok(skill.snapshot.includes('分钟÷60写 ewdHours'));
});
test('团队场景任务可以新增、改负责人、删除，作为下一次创建的真实输入',()=>{
 const store=createLabStore(join(mkdtempSync(join(tmpdir(),'lab-tasks-')),'state.json'),seedLab());let state=store.get();const team=state.teams.find(t=>t.id==='lab-content')!;const original=team.tasks[0];const t={...structuredClone(original),id:'new-fixture-task',title:'新周期检查表',ownerId:'lin',createdById:null,participantIds:[],parentId:null,dependsOnTaskIds:[]};team.tasks.push(t);state=store.save(state.revision,state.teams,state.cases);const currentTeam=state.teams.find(t=>t.id===team.id)!;currentTeam.tasks.find(x=>x.id===t.id)!.ownerId='zhou';state=store.save(state.revision,state.teams,state.cases);const c=state.cases.find(c=>c.id==='lab-content-creation-contract-estimate')!;assert.equal(buildModelInput(state.teams.find(x=>x.id===team.id)!,c,c.steps[0],'check',[]).tasks.find(x=>x.id===t.id)?.ownerId,'zhou');state.teams.find(x=>x.id===team.id)!.tasks=state.teams.find(x=>x.id===team.id)!.tasks.filter(x=>x.id!==t.id);store.save(state.revision,state.teams,state.cases);assert.ok(!store.get().teams.find(x=>x.id===team.id)!.tasks.some(x=>x.id===t.id));
});
