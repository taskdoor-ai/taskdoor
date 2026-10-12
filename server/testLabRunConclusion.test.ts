import test from 'node:test';
import assert from 'node:assert/strict';
import {runConclusion} from '../src/test-lab/run-conclusion.ts';
import type {LabRun} from '../src/test-lab/types.ts';

const base=()=>({status:'needs_review',steps:[],review:null,error:null} as unknown as LabRun);
test('执行错误优先展示原因，不把缺少输出解释成完成标准未满足',()=>{
 const run=base();run.status='failed';run.error='fetch failed';
 run.jevReviews=[{items:[{source:'local',choice:'insufficient',label:'需要创建三个任务',note:'无输出'}]}] as any;
 assert.match(runConclusion(run).reason,/请求连接失败/);
 assert.doesNotMatch(runConclusion(run).reason,/需要创建三个任务|待补充/);
 run.error='工具 create_subtasks 调用未完成：评测写入只允许本次运行创建的任务';
 assert.match(runConclusion(run).reason,/非本次创建的任务 ID/);
});
test('验收未通过展示实际判断依据，资料不足和低置信度仍为待判断',()=>{
 const run=base();run.jevReviews=[{items:[{source:'model',choice:'unmet',confidence:null,label:'分配给文案人员',note:'负责人被分配给统筹人员，未按文案职责分配。'}]}] as any;
 assert.equal(runConclusion(run).title,'未通过');
 assert.equal(runConclusion(run).reason,'负责人被分配给统筹人员，未按文案职责分配。');
 run.jevReviews![0].items[0].choice='insufficient';assert.equal(runConclusion(run).title,'待判断');
 run.jevReviews![0].items[0]={...run.jevReviews![0].items[0],source:'jev',choice:'unmet',confidence:.6};
 assert.match(runConclusion(run).reason,/置信度不足/);
});
test('区分结构检查、人工验收、运行中和取消，不伪造失败依据',()=>{
 const run=base();run.steps=[{error:null,structure:'failed',structureErrors:['缺少 title'],assertions:[]}] as any;
 assert.match(runConclusion(run).reason,/缺少 title/);
 run.steps=[];run.review={verdict:'failed',note:'缺少海报子任务',at:'today'};
 assert.equal(runConclusion(run).reason,'缺少海报子任务');
 run.status='running';assert.deepEqual(runConclusion(run),{verdict:'pending',title:'执行中',reason:''});
 run.status='cancelled';run.error='用户取消';assert.equal(runConclusion(run).title,'已取消');
 run.status='needs_review';run.review={verdict:'passed',note:'已确认',at:'today'};assert.equal(runConclusion(run).title,'通过');
});
