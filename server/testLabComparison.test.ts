import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLabStore } from './test-lab/store.ts';
import { seedLab } from './test-lab/seeds.ts';
import { createRunner } from './test-lab/runner.ts';
import { scoreRun } from '../src/test-lab/comparison.tsx';
import { buildModelInput } from './test-lab/context.ts';
import { evaluateAssertions } from './test-lab/assertions.ts';
const options={apiKey:'fake',endpoint:'https://example.com/responses',model:'one',maxOutputTokens:1000,timeoutMs:1000};
const setup=()=>createLabStore(join(mkdtempSync(join(tmpdir(),'lab-matrix-')),'state.json'),seedLab());

test('多模型笛卡尔积原子入队、同键幂等、每个组合独立调用与快照',async()=>{
 const store=setup();const calls:string[]=[];
 const runner=createRunner(store,options,async config=>{calls.push(config.model);return {rawOutput:'{}',usage:{inputTokens:1,outputTokens:1,totalTokens:2}};});
 const runs=runner.enqueue(['benchmark-single','benchmark-diagnosis'],'matrix',{models:['one','two']});
 assert.equal(runs.length,4);assert.equal(new Set(runs.map(r=>r.batchId)).size,1);
 assert.deepEqual(runs[0].caseSnapshot,runs[2].caseSnapshot);assert.deepEqual(runs[0].teamSnapshot,runs[2].teamSnapshot);
 assert.deepEqual(runner.enqueue(['benchmark-single','benchmark-diagnosis'],'matrix',{models:['one','two']}).map(r=>r.id),runs.map(r=>r.id));
 assert.throws(()=>runner.enqueue(['benchmark-single'],'bad',{models:['one','one']}));
 await runner.idle();assert.deepEqual(calls,['one','one','two','two']);assert.ok(store.get().runs.every(r=>!scoreRun(r).accepted));
});
test('前置条件漂移阻止整批调用，核心库预期不泄露给模型',()=>{
 const store=setup();const state=store.get(),core=state.cases.filter(c=>c.origin==='benchmark/2026-09');assert.equal(core.length,9);
 for(const c of core){const team=state.teams.find(t=>t.id===c.teamId)!;assert.ok(c.verification?.objective);assert.ok(c.assertions.length);for(const step of c.steps)assert.ok(c.verification?.expectedResults.some(r=>r.stepId===step.id&&r.criteria.length));for(const rule of c.verification!.fixtureChecks){const list=rule.subject==='member'?team.members:rule.subject==='task'?team.tasks:team.evidence;assert.equal(evaluateAssertions(list.find(s=>s.id===rule.subjectId),[{...rule,stepId:'fixture'}])[0].status,'passed');}const input=JSON.stringify(buildModelInput(team,c,c.steps[0],'test',[]));assert.ok(!input.includes('fixtureChecks'));assert.ok(!input.includes('expectedResults'));}
 const team=state.teams.find(t=>t.id==='lab-content')!;team.members[0].responsibilities=['已调整'];store.save(state.revision,state.teams,state.cases);
 const runner=createRunner(store,options,async()=>{throw Error('不应调用');});assert.throws(()=>runner.enqueue(['benchmark-single'],'drift',{models:['one','two']}),/前置条件/);assert.equal(store.get().runs.length,0);
});
test('验收分母包含未运行断言；人工通过不能掩盖失败与取消',async()=>{
 const store=setup();const runner=createRunner(store,options,async()=>({rawOutput:'{}',usage:{inputTokens:1,outputTokens:1,totalTokens:2}}));
 runner.enqueue(['benchmark-single'],'scores');await runner.idle();const run=store.get().runs[0];
 run.status='needs_review';run.steps[0].structure='passed';run.steps[0].assertions=run.caseSnapshot.assertions.map(a=>({id:a.id,label:a.label,status:'passed',actual:a.expected,expected:a.expected,message:''}));
 assert.equal(scoreRun(run).automatic,true);assert.equal(scoreRun(run).accepted,false);
 run.review={verdict:'passed',note:'已核对',at:new Date().toISOString()};assert.equal(scoreRun(run).accepted,true);
 run.steps[0].assertions.pop();assert.equal(scoreRun(run).accepted,false);assert.equal(scoreRun(run).assertions,run.caseSnapshot.assertions.length);
 run.status='cancelled';assert.equal(scoreRun(run).automatic,false);
});

test('超过五个用例和二十步骤的多模型批次可完整入队且取消前不调用模型',async()=>{
 const store=setup();const state=store.get();const source=state.cases.find(c=>c.id==='benchmark-single')!;
 const cases=Array.from({length:12},(_,i)=>({...structuredClone(source),id:`bulk-${i}`,steps:[{...source.steps[0],id:'s1'},{...source.steps[0],id:'s2',usePreviousOutput:true}]}));
 store.save(state.revision,state.teams,[...state.cases,...cases]);let calls=0;
 const runner=createRunner(store,options,async()=>{calls++;return {rawOutput:'{}',usage:{inputTokens:1,outputTokens:1,totalTokens:2}};});
 const runs=runner.enqueue(cases.map(c=>c.id),'large-batch',{models:['one','two']});
 assert.equal(runs.length,24);assert.equal(new Set(runs.map(r=>r.caseId)).size,12);assert.equal(new Set(runs.map(r=>r.batchId)).size,1);
 assert.equal(runs.reduce((n,r)=>n+r.caseSnapshot.steps.length,0),48);
 assert.equal(runner.enqueue(cases.map(c=>c.id),'large-batch',{models:['one','two']}).length,24);
 for(const run of runs)runner.cancel(run.id);await runner.idle();assert.equal(calls,0);
 assert.ok(store.get().runs.every(r=>r.status==='cancelled'));
});
