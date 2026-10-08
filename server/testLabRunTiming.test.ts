import test from 'node:test';
import assert from 'node:assert/strict';
import {runTiming,formatDuration} from '../src/test-lab/run-timing.ts';
import type {LabRun} from '../src/test-lab/types.ts';
test('耗时分别记录生成和判断，总计排除排队；未知计时不假报零',()=>{
  const run={createdAt:'2026-09-29T00:00:00Z',startedAt:'2026-09-29T00:01:00Z',finishedAt:'2026-09-29T00:01:10Z',selection:{judgeModel:'jev'},judgeStartedAt:'2026-09-29T00:01:10Z',judgeFinishedAt:'2026-09-29T00:01:12Z'} as LabRun;
  assert.deepEqual(runTiming(run),{generationMs:10000,judgeMs:2000,totalMs:12000});
  delete run.judgeFinishedAt;
  assert.deepEqual(runTiming(run),{generationMs:10000,judgeMs:null,totalMs:null});
  delete run.selection;
  assert.equal(runTiming(run).totalMs,10000);
  run.startedAt=null;
  assert.equal(runTiming(run).generationMs,null);
  assert.equal(formatDuration(null),'未记录');
  assert.equal(formatDuration(0),'0 ms');
});
