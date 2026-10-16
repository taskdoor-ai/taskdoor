import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {seedLab} from './test-lab/seeds.ts';
import {addTaskAnalysisCases} from './test-lab/task-analysis-cases.ts';
import {buildAnalysisDataFixtures} from './test-lab/analysis-data-fixtures.ts';
import {createStrictAnalysisRetestCase} from './test-lab/strict-analysis-cases.ts';
import {createLabStore} from './test-lab/store.ts';
import {createRunner} from './test-lab/runner.ts';
import {runVerdict} from '../src/test-lab/run-verdict.ts';

test('严格用例的业务关系检查保存进运行，人工通过不能覆盖程序发现的编造历史',async()=>{
 const store=createLabStore(join(mkdtempSync(join(tmpdir(),'strict-analysis-runner-')),'state.json'),seedLab());
 const state=store.getLibrary();addTaskAnalysisCases(state);buildAnalysisDataFixtures(state);
 const source=state.cases.find(c=>c.id==='case-analysis-test-weighted')!;
 const strict=createStrictAnalysisRetestCase(source,'strict-runner-weighted');state.cases.push(strict);
 store.save(state.revision,state.teams,state.cases);
 const runner=createRunner(store,{apiKey:'test-key',endpoint:'https://api.ppinfra.com/openai/v1/responses',model:'test-model',maxOutputTokens:1000,timeoutMs:1000},async()=>({rawOutput:JSON.stringify({result:{progress:{totalEwdMinutes:240,completedEwdMinutes:120,knownCompletedEwdMinutes:120,unconfirmedEwdMinutes:0,completionPercent:50,displayPercent:50,comparison:{workload:[{at:'2026-10-09',scopeMinutes:240,completedMinutes:120}]}}}}),usage:{inputTokens:1,outputTokens:1,totalTokens:2}}));
 const [queued]=runner.enqueue([strict.id],'strict-integration');await runner.idle();
 const run=store.getRun(queued.id)!;
 assert.equal(run.steps[0].assertions.find(a=>a.id==='strict-relation-s1-no-history')?.status,'failed');
 assert.equal(run.status,'failed');
 assert.equal(runVerdict({...run,status:'needs_review',steps:run.steps.map(s=>({...s,structure:'passed',error:null,structureErrors:[]})),review:{verdict:'passed',note:'人工认为通过',at:new Date().toISOString()}}),'failed');
});
