import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { createPromptfooEngine } from './test-lab/evaluation-engine.ts';
import { createRunner } from './test-lab/runner.ts';
import { createLabStore } from './test-lab/store.ts';
import { seedLab } from './test-lab/seeds.ts';

// Real Promptfoo engine and database; deliberately stub only the paid model boundary.
test('Promptfoo 调度实际组合，保留原文与用量，取消组合不调用模型，重复提交不重跑',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'taskdoor-promptfoo-'));
 const store=createLabStore(join(dir,'state.json'),seedLab());
 const engine=createPromptfooEngine(resolve('.'),join(dir,'promptfoo'));
 const before=store.get().teams;
 let calls=0,activeCalls=0,maxActiveCalls=0;
 const runner=createRunner(store,{apiKey:'test-only',model:'test-model',endpoint:'https://example.invalid/responses',maxOutputTokens:1000,timeoutMs:1000},async()=>{
  calls++;activeCalls++;maxActiveCalls=Math.max(maxActiveCalls,activeCalls);
  await new Promise(resolve=>setTimeout(resolve,100));activeCalls--;
  return {rawOutput:'invalid JSON retained for regression',usage:{inputTokens:4,outputTokens:3,totalTokens:7}};
 },engine);
 const runs=runner.enqueue(['case-effort','case-diagnosis'],'promptfoo-regression',{models:['model-a','model-b']});
 runner.cancel(runs[1].id);
 assert.equal(runner.enqueue(['case-effort','case-diagnosis'],'promptfoo-regression',{models:['model-a','model-b']})[0].id,runs[0].id);
 await runner.idle();
 const saved=store.get().runs;
 assert.equal(calls,3);
 assert.equal(maxActiveCalls,2,'独立组合应并行执行，且最多同时执行两组');
 assert.equal(saved[1].status,'cancelled');
 assert.ok(saved.every(r=>r.evaluation?.id.startsWith('eval-')),JSON.stringify(saved.map(r=>({status:r.status,error:r.evaluationError}))));
 assert.equal(new Set(saved.map(r=>r.evaluation?.id)).size,1);
 assert.ok(saved.filter(r=>r.status==='failed').every(r=>r.steps[0].rawOutput==='invalid JSON retained for regression'&&r.steps[0].usage.totalTokens===7));
 assert.deepEqual(store.get().teams,before);
 runner.close();
});

test('原生数据库保存逐步结果与业务评分，自动通过不冒充人工验收',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'taskdoor-promptfoo-grading-'));
 const store=createLabStore(join(dir,'state.json'),seedLab());
 // Prepare snapshots through the real enqueue preflight, but do not run a model.
 const prepared=createRunner(store,{apiKey:'test-only',model:'local-fixture',endpoint:'https://example.invalid/responses',maxOutputTokens:1000,timeoutMs:1000},async()=>{throw new Error('No external calls permitted');});
 const [planned]=prepared.enqueue(['case-effort'],'local-grading');prepared.cancel(planned.id);await prepared.idle();
 const stepId=planned.caseSnapshot.steps[0].id;
 const step={stepId,skillId:planned.caseSnapshot.steps[0].skillId,input:{members:[{id:'test-member',responsibilities:['Test responsibility']}]},output:{summary:'LOCAL FIXTURE ONLY'},rawOutput:'{"summary":"LOCAL FIXTURE ONLY"}',error:null,assertions:[{id:'a',label:'local check',status:'passed' as const,actual:1,expected:1,message:'ok'}],structure:'passed' as const,structureErrors:[],durationMs:13,usage:{inputTokens:4,outputTokens:3,totalTokens:7},skillHash:'frozen-test-hash',promptHash:'test-prompt',before:planned.teamSnapshot,after:planned.teamSnapshot};
 const passed={...planned,status:'needs_review' as const,error:null,steps:[step]};
 const unknown={...passed,id:planned.id+'-unknown',caseId:planned.caseId+'-unknown',steps:[{...step,assertions:[{...step.assertions[0],status:'unknown' as const}]}]};
 const engine=createPromptfooEngine(resolve('.'),join(dir,'promptfoo'));
 let completed=0;
 await engine.run([passed,unknown],async id=>id===passed.id?passed:unknown,(_id,count)=>{completed=Math.max(completed,count??0);});
 assert.equal(completed,2);
 const {execFileSync}=await import('node:child_process');
 const rows=JSON.parse(execFileSync('sqlite3',['-json',join(dir,'promptfoo/promptfoo.db'),'select success, response, grading_result from eval_results order by test_idx'],{encoding:'utf8'}));
 assert.equal(rows.length,2);assert.equal(rows[0].success,1,rows[0].grading_result);assert.equal(rows[1].success,0,rows[1].grading_result);
 const response=JSON.parse(rows[0].response);
 assert.equal(response.metadata.finalAccepted,false);
 assert.equal(response.metadata.steps[0].skillHash,'frozen-test-hash');
 assert.equal(response.metadata.steps[0].input.members[0].responsibilities[0],'Test responsibility');
 assert.equal(response.tokenUsage.total,7);assert.match(response.output,/LOCAL FIXTURE ONLY/);
 engine.close();prepared.close();
});

test('引擎中断会停止活动模型并保留中断状态，不继续调用排队组合',async()=>{
 const store=createLabStore(join(mkdtempSync(join(tmpdir(),'taskdoor-engine-failure-')),'state.json'),seedLab());
 let calls=0;
 const runner=createRunner(store,{apiKey:'test-only',model:'local-fixture',endpoint:'https://example.invalid/responses',maxOutputTokens:1000,timeoutMs:1000},async(_a,_b,_c,signal)=>{
  calls++;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
 },{check(){},close(){},async run(runs,execute){void execute(runs[0].id);throw new Error('local engine failure');}});
 runner.enqueue(['case-effort','case-diagnosis'],'interrupted-regression');await runner.idle();
 assert.equal(calls,1);assert.ok(store.get().runs.every(r=>r.status==='interrupted'&&r.evaluationError==='local engine failure'));
 runner.close();
});
