import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import {createRunner} from './test-lab/runner.ts';
import {createLabClient} from '../src/test-lab/client.ts';

const options={apiKey:'test',endpoint:'https://example.com/responses',model:'test',maxOutputTokens:1000,timeoutMs:1000};
const makeStore=()=>createLabStore(join(mkdtempSync(join(tmpdir(),'lab-submit-')),'state.json'),seedLab());
test('先保存排队记录再启动执行；历史查询不走整库复制',async()=>{
 const store=makeStore();let calls=0;const runner=createRunner(store,options,async()=>{calls++;return {rawOutput:'bad-json',usage:{inputTokens:0,outputTokens:0,totalTokens:0}};});
 // New submissions and queue lookups must not copy all previous raw evidence.
 store.get=()=>{throw Error('不应复制全部历史记录');};
 const created=runner.enqueue(['case-effort'],'fast-submit');
 assert.equal(calls,0);assert.equal(store.getRun(created[0].id)?.status,'queued');
 await Promise.resolve();assert.equal(calls,0,'执行不占用提交响应前的微任务阶段');
 await runner.idle();assert.equal(calls,1);
 const complete=store.getRun(created[0].id)!;
 const before=structuredClone(complete);
 const full=store.getBootstrapState(complete.batchId).runs.find(r=>r.id===complete.id)!;
 const summary=store.getBootstrapState().runs.find(r=>r.id===complete.id)!;
 assert.equal(full.steps[0].rawOutput,'bad-json');assert.equal(summary.steps[0].rawOutput,'');
 assert.equal(summary.steps[0].structure,full.steps[0].structure);
 assert.deepEqual(store.getRun(complete.id),before);
});
test('只恢复服务关闭前尚未发出请求的排队项，不重跑已开始或手动取消项',async()=>{
 const store=makeStore();const library=store.getLibrary();const template=library.cases.find(c=>c.id==='case-effort')!;
 const ids=['recover-a','recover-b','recover-c'];
 store.save(library.revision,library.teams,[...library.cases,...ids.map(id=>({...structuredClone(template),id,origin:'manual',archived:false,enabled:true}))]);
 let calls=0;const runner=createRunner(store,options,async()=>{calls++;return {rawOutput:'bad-json',usage:{inputTokens:0,outputTokens:0,totalTokens:0}};});
 const [waiting,started,cancelled]=runner.enqueue(ids,'recover-queue');
 runner.close();
 store.updateRun(waiting.id,r=>{r.error='write EPIPE';});
 store.updateRun(started.id,r=>{r.startedAt=new Date().toISOString();});
 store.updateRun(cancelled.id,r=>{r.status='cancelled';});
 runner.resumeUnstarted(waiting.batchId);runner.resumeUnstarted(waiting.batchId);
 await runner.idle();assert.equal(calls,1);
 assert.equal(store.getRun(started.id)?.status,'interrupted');assert.equal(store.getRun(cancelled.id)?.status,'cancelled');
});
test('提交超时只查询同一请求已保存的记录，不重复POST',async()=>{
 let posts=0;let gets=0;
 const saved=[{id:'already-saved'}];
 const client=createLabClient('csrf',async(url,init)=>{
  if(init?.method==='POST'){posts++;const event=new Event('abort');
   // Simulate the actual timeout signal without waiting 15 seconds.
   Object.defineProperty(init.signal!,'aborted',{value:true});init.signal!.dispatchEvent(event);throw new DOMException('timeout','TimeoutError');}
  gets++;assert.match(String(url),/requestId=request-1/);return Response.json(saved);
 });
 assert.deepEqual(await client.run(['case'],'request-1'),saved);assert.equal(posts,1);assert.equal(gets,1);
});
