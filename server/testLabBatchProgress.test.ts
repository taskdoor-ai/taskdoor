import test from 'node:test';
import assert from 'node:assert/strict';
import type {LabRun} from '../src/test-lab/types.ts';
import {batchProgress} from '../src/test-lab/batch-progress.ts';
import {formatDuration} from '../src/test-lab/run-timing.ts';
test('完成度等待判断结束，失败与取消计入已结束，不伪装通过率',()=>{
 const runs=[{status:'queued'},{status:'running'},{status:'needs_review',selection:{judgeModel:'jev'}},{status:'failed',selection:{judgeModel:'jev'},judgeStatus:'failed'},{status:'cancelled'},{status:'needs_review'}] as LabRun[];
 assert.deepEqual(batchProgress(runs),{total:6,ended:3,queued:1,running:1,judging:1,percent:50,failed:1,cancelled:1});
 runs[2].judgeStatus='completed';assert.equal(batchProgress(runs).ended,4);
 assert.equal(batchProgress([]).percent,0);
 assert.equal(formatDuration(65906),'65906 ms');assert.equal(formatDuration(null),'未记录');
});
