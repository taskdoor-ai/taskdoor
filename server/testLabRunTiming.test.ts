import test from 'node:test';
import assert from 'node:assert/strict';
import {runTiming,formatDuration} from '../src/test-lab/run-timing.ts';
import type {LabRun,LabJevReview} from '../src/test-lab/types.ts';

const generatedRun=()=>({startedAt:'2026-09-29T00:01:00Z',finishedAt:'2026-09-29T00:01:10Z'} as LabRun);
const savedReview=(durationMs:number):LabJevReview=>({id:`review-${durationMs}`,at:'2026-09-29T03:00:02Z',model:'qwen/qwen3.7-plus',requestedModel:'qwen/qwen3.7-plus',policyVersion:'evidence-judge-v2',requestHash:'saved-review',durationMs,usage:null,items:[]});

test('自动判断保留开始到结束的总计，未知计时不假报零',()=>{
  const run:LabRun={...generatedRun(),createdAt:'2026-09-29T00:00:00Z',selection:{judgeModel:'jev'},judgeStartedAt:'2026-09-29T00:01:12Z',judgeFinishedAt:'2026-09-29T00:01:14Z'};
  assert.deepEqual(runTiming(run),{generationMs:10000,judgeMs:2000,totalMs:14000,hasJudge:true});
  delete run.judgeFinishedAt;
  assert.deepEqual(runTiming(run),{generationMs:10000,judgeMs:null,totalMs:null,hasJudge:true});
  delete run.selection;
  delete run.judgeStartedAt;
  assert.equal(runTiming(run).totalMs,10000);
  assert.equal(runTiming(run).hasJudge,false);
  run.startedAt=null;
  assert.equal(runTiming(run).generationMs,null);
  assert.equal(formatDuration(null),'未记录');
  assert.equal(formatDuration(0),'0 ms');
});

test('没有原判断选择的补判累计实际耗时，排除生成后闲置时间',()=>{
  const run={...generatedRun(),judgeStatus:'completed' as const,judgeStartedAt:'2026-09-29T03:00:00Z',judgeFinishedAt:'2026-09-29T03:00:02Z'};
  assert.deepEqual(runTiming(run),{generationMs:10000,judgeMs:2000,totalMs:12000,hasJudge:true});
});

test('历史补判只有核对记录时使用最新一次实际耗时',()=>{
  const run={...generatedRun(),jevReviews:[savedReview(9000),savedReview(2000)]};
  assert.deepEqual(runTiming(run),{generationMs:10000,judgeMs:2000,totalMs:12000,hasJudge:true});
  run.startedAt=null;
  assert.deepEqual(runTiming(run),{generationMs:null,judgeMs:2000,totalMs:null,hasJudge:true});
});

test('新补判仍在运行时不挪用上一次判断耗时',()=>{
  const run={...generatedRun(),judgeStatus:'running' as const,judgeStartedAt:'2026-09-29T04:00:00Z',jevReviews:[savedReview(2000)]};
  assert.deepEqual(runTiming(run),{generationMs:10000,judgeMs:null,totalMs:null,hasJudge:true});
});

test('补判失败缺时间时不挪用旧记录，已跳过仍标记判断已启用',()=>{
  const run={...generatedRun(),judgeStatus:'failed' as const,jevReviews:[savedReview(2000)]};
  assert.deepEqual(runTiming(run),{generationMs:10000,judgeMs:null,totalMs:null,hasJudge:true});
  const skipped={...generatedRun(),judgeStatus:'skipped' as const};
  assert.deepEqual(runTiming(skipped),{generationMs:10000,judgeMs:null,totalMs:10000,hasJudge:true});
});
