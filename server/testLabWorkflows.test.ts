import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createLabStore } from './test-lab/store.ts';
import { seedLab } from './test-lab/seeds.ts';
import { buildModelInput } from './test-lab/context.ts';
import { evaluateAssertions } from './test-lab/assertions.ts';
import { preflightWorkflow } from './test-lab/workflows.ts';
import { buildWorkflows, summarizeWorkflow } from '../src/test-lab/workflows.ts';
import { createRunner } from './test-lab/runner.ts';
import { copyCase } from '../src/test-lab/model.ts';

const makeStore=()=>createLabStore(join(mkdtempSync(join(tmpdir(),'lab-workflow-')),'state.json'),seedLab());

test('场景具有明确目标、初始条件和逐步预期，预期不进入模型输入',()=>{
  const state=makeStore().get();
  const item=state.cases.find(c=>c.id==='lab-manufacturing-journey-status-recovery')!;
  assert.ok(item.verification?.objective,'缺少场景验证目标');
  assert.equal(item.verification.expectedResults.length,item.steps.length);
  assert.ok(item.verification.fixtureChecks.length);
  const team=state.teams.find(t=>t.id===item.teamId)!;
  const input=buildModelInput(team,item,item.steps[0],'check',[]);
  assert.ok(!('verification' in input));
  assert.ok(!JSON.stringify(input).includes(item.verification.objective));
});

test('诊断断言检查整个列表，不要求目标结论恰好排在第一位',()=>{
  const rule={id:'kind',label:'存在冲突',stepId:'s1',path:'result.diagnoses.*.type',operator:'contains' as const,expected:'decision_conflict'};
  assert.equal(evaluateAssertions({result:{diagnoses:[{type:'execution_blockage'},{type:'decision_conflict'}]}},[rule])[0].status,'passed');
  assert.equal(evaluateAssertions({result:{diagnoses:[{type:'execution_blockage'}]}},[rule])[0].status,'failed');
  assert.equal(evaluateAssertions({},[rule])[0].status,'unknown');
});

test('四类流程覆盖全部行业场景，资料变化会使预检失败且不会写报告',()=>{
  const state=makeStore().get(), before=structuredClone(state);
  const workflows=buildWorkflows(state);
  for(const workflow of workflows)assert.equal(preflightWorkflow(state,workflow.id).ready,true,workflow.title);
  assert.equal(new Set(workflows.filter(w=>w.teamId==='lab-manufacturing').flatMap(w=>w.caseIds)).size,18);
  assert.deepEqual(state,before);
  state.teams.find(t=>t.id==='lab-manufacturing')!.tasks.find(t=>t.id==='lab-manufacturing-journey-verify')!.status='已完成';
  const result=preflightWorkflow(state,'lab-manufacturing::delivery');
  assert.equal(result.ready,false);
  assert.ok(result.cases.some(c=>c.checks.some(check=>check.status==='failed')));
});

test('流程启动在入队前复查，失败无调用，成功冻结预期并自动串行执行',async()=>{
  const store=makeStore();let calls=0;
  const runner=createRunner(store,{apiKey:'local-test',endpoint:'https://example.invalid/responses',model:'local-test',maxOutputTokens:1000,timeoutMs:1000},async()=>{calls++;return {rawOutput:'invalid JSON',usage:{inputTokens:1,outputTokens:1,totalTokens:2}};});
  const workflow=buildWorkflows(store.get()).find(w=>w.id==='lab-manufacturing::delivery')!;
  assert.throws(()=>runner.enqueue(workflow.caseIds.slice(0,1),'wrong-cases',{workflowId:workflow.id}),/流程/);
  assert.equal(calls,0);
  const initial=store.get();
  initial.teams.find(t=>t.id==='lab-manufacturing')!.tasks.find(t=>t.id==='lab-manufacturing-journey-verify')!.status='已完成';
  store.save(initial.revision,initial.teams,initial.cases);
  assert.throws(()=>runner.enqueue(workflow.caseIds,'stale',{workflowId:workflow.id}),/初始条件|预检/);
  assert.equal(calls,0);assert.equal(store.get().runs.length,0);
  const reset=store.get();reset.teams.find(t=>t.id==='lab-manufacturing')!.tasks.find(t=>t.id==='lab-manufacturing-journey-verify')!.status='已阻塞';store.save(reset.revision,reset.teams,reset.cases);
  const runs=runner.enqueue(workflow.caseIds,'workflow-run',{workflowId:workflow.id});
  assert.ok(runs.every(r=>r.caseSnapshot.verification?.objective));
  assert.equal(runner.enqueue(workflow.caseIds,'workflow-run',{workflowId:workflow.id})[0].id,runs[0].id);
  await runner.idle();assert.equal(calls,4);
  const report=summarizeWorkflow(store.get().runs);
  assert.equal(report.verdict,'failed');assert.equal(report.counts.failed,4);
  assert.equal(report.counts.passed,0);
});

test('验收说明可编辑并保留删除的断言，副本将目标结果绑定到新步骤',()=>{
  const state=makeStore().get();const item=state.cases.find(c=>c.id==='lab-manufacturing-journey-priority-change')!;
  item.verification!.objective='用户自己的验证目标';item.assertions=item.assertions.filter(a=>!a.id.startsWith('contract-'));
  const path=join(mkdtempSync(join(tmpdir(),'lab-verification-edit-')),'state.json');writeFileSync(path,JSON.stringify(state));
  const saved=createLabStore(path,seedLab()).get().cases.find(c=>c.id===item.id)!;
  assert.deepEqual(saved,item);
  const copied=copyCase(saved);assert.ok(copied.verification!.expectedResults.every(r=>copied.steps.some(s=>s.id===r.stepId)));
  assert.ok(copied.steps.every(s=>!saved.steps.some(old=>old.id===s.id)));
});
