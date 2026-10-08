import test from 'node:test';
import assert from 'node:assert/strict';
import {runVerdict} from '../src/test-lab/run-verdict.ts';
import type {LabRun} from '../src/test-lab/types.ts';
import {judgeSummary} from '../src/test-lab/judge-summary.ts';
test('验收筛选不把自动检查或低置信度判断当通过',()=>{
 const run={status:'needs_review',steps:[],review:null} as unknown as LabRun;
 assert.equal(runVerdict(run),'pending');
 run.jevReviews=[{items:[{source:'jev',choice:'met',confidence:.95,label:'负责人符合责任'}]}] as any;
 assert.equal(runVerdict(run),'passed');
 run.jevReviews![0].items[0].choice='unmet';assert.equal(runVerdict(run),'failed');
 assert.match(judgeSummary(run.jevReviews![0]).basis,/负责人符合责任/);
 run.jevReviews![0].items[0].confidence=.7;assert.equal(runVerdict(run),'pending');
 run.review={verdict:'passed',note:'已核对',at:'today'};assert.equal(runVerdict(run),'passed');
 run.status='failed';assert.equal(runVerdict(run),'failed');
 run.status='cancelled';assert.equal(runVerdict(run),'pending');
});
