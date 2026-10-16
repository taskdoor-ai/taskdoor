import test from 'node:test';
import assert from 'node:assert/strict';
import {createRunner} from './test-lab/runner.ts';
import type {LabStore} from './test-lab/store.ts';
import type {LabRun} from '../src/test-lab/types.ts';

const options={apiKey:'test',endpoint:'https://example.com/responses',model:'test',maxOutputTokens:100,timeoutMs:1000};
function historyStore(runs:LabRun[]){
  return {
    get(){throw Error('不得为启动检测复制全部历史输入与输出');},
    getRuns(filter:(run:LabRun)=>boolean){return structuredClone(runs.filter(filter));},
    updateRuns(change:(items:LabRun[])=>void){change(runs);},
  } as unknown as LabStore;
}

test('启动检查不复制已完成运行的大型历史负载，也不触发模型',()=>{
  const history={id:'finished',status:'needs_review',judgeStatus:'completed'} as LabRun;
  Object.defineProperty(history,'steps',{get(){throw Error('已完成历史内容不应被读取');}});
  let calls=0;
  assert.doesNotThrow(()=>createRunner(historyStore([history]),options,async()=>{calls++;throw Error('不应调用');}));
  assert.equal(calls,0);
});

test('轻量启动检测仍标记中断的生成及裁判，保留已完成结果',()=>{
  const runs=[
    {id:'queued',status:'queued'},
    {id:'generating',status:'running'},
    {id:'judging',status:'needs_review',judgeStatus:'running'},
    {id:'finished',status:'needs_review',judgeStatus:'completed',steps:[{output:{value:42}}]},
  ] as LabRun[];
  const before=structuredClone(runs[3]);
  createRunner(historyStore(runs),options);
  assert.deepEqual(runs.slice(0,2).map(run=>run.status),['interrupted','interrupted']);
  assert.ok(runs.slice(0,2).every(run=>run.finishedAt&&run.error?.includes('未自动重试')));
  assert.equal(runs[2].judgeStatus,'failed');
  assert.match(runs[2].judgeError??'',/判断中断/);
  assert.deepEqual(runs[3],before);
});
