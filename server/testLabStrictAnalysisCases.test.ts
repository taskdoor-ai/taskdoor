import test from 'node:test';
import assert from 'node:assert/strict';
import {seedLab} from './test-lab/seeds.ts';
import {addTaskAnalysisCases} from './test-lab/task-analysis-cases.ts';
import {buildAnalysisDataFixtures} from './test-lab/analysis-data-fixtures.ts';
import {addAnalysisTimingCases} from './test-lab/analysis-timing-cases.ts';
import {evaluateAssertions} from './test-lab/assertions.ts';
import {caseSchema} from './test-lab/schema.ts';

async function helpers(){
  const module=await import('./test-lab/strict-analysis-cases.ts').catch(()=>({}));
  const create=Reflect.get(module,'createStrictAnalysisRetestCase');
  const evaluate=Reflect.get(module,'evaluateStrictAnalysisRelations');
  assert.equal(typeof create,'function');assert.equal(typeof evaluate,'function');
  return {create,evaluate};
}
function fixtures(){const state=seedLab();addTaskAnalysisCases(state);buildAnalysisDataFixtures(state);addAnalysisTimingCases(state);return state;}
function output(total:number,completed:number,raw:number,display:number,comparison:unknown=null,estimate?:unknown){
  return {result:{progress:{totalEwdMinutes:total,completedEwdMinutes:completed,knownCompletedEwdMinutes:completed,unconfirmedEwdMinutes:0,completionPercent:raw,displayPercent:display,comparison,...(estimate?{estimate}:{})}}};
}

test('明确输入克隆保留业务快照，修正固定比例参考和无据comparison验收',async()=>{
  const {create,evaluate}=await helpers();const state=fixtures();
  for(const [key,total,completed,percent] of [['all-evidence',240,240,100],['weighted',240,120,50]] as const){
    const source=state.cases.find(c=>c.id===`case-analysis-test-${key}`)!;const frozen=structuredClone(source);
    const strict=create(source,`any-new-id-${key}`);caseSchema.parse(strict);
    assert.deepEqual(source,frozen);assert.deepEqual(strict.dataSnapshot,source.dataSnapshot);assert.deepEqual(strict.steps,source.steps);
    assert.equal(strict.origin,'strict-analysis-evidence-v1');
    const valid=output(total,completed,percent,percent);
    const progressAssertions=strict.assertions.filter((a:any)=>a.path.startsWith('result.progress'));
    assert.ok(evaluateAssertions(valid,progressAssertions).every(a=>a.status==='passed'));
    assert.ok(evaluate(strict,'s1',valid).every((a:any)=>a.status==='passed'));
    const invalid=output(total,completed,percent,percent,{workload:[{at:'2026-10-09',scopeMinutes:total,completedMinutes:completed}],timing:{startOn:'2026-10-09',forecastOn:'2026-10-09'}});
    assert.ok(evaluate(strict,'s1',invalid).some((a:any)=>a.status==='failed'));
    assert.equal(evaluate(source,'s1',invalid).length,0);
    const serialized=JSON.stringify(strict.expectedOutput);
    assert.equal(serialized.includes('对应null%'),false);
  }
});

test('动态新增英文只核独立估算公式，不把既有中文计为新完成量',async()=>{
  const {create,evaluate}=await helpers();const source=fixtures().cases.find(c=>c.id==='case-analysis-test-new-scope')!;
  const strict=create(source,'strict-new-bilingual');
  const items=Array.from({length:5},(_,i)=>({id:`work-${i+1}`,criteriaRefs:[`analysis-test-new-scope-criterion-${i+1}`],ewdMinutes:60,threePoint:{optimisticMinutes:60,mostLikelyMinutes:60,pessimisticMinutes:60,expectedMinutes:60}}));
  const estimate={items,totalEwdMinutes:300,knownEwdMinutes:300};
  const valid=output(300,240,80,75,null,estimate);
  assert.ok(evaluate(strict,'s1',valid).every((a:any)=>a.status==='passed'));
  assert.ok(evaluate(strict,'s1',output(300,270,90,75,null,estimate)).some((a:any)=>a.status==='failed'));
  assert.ok(evaluate(strict,'s1',output(300,240,50,50,null,estimate)).some((a:any)=>a.status==='failed'));
  const changedEstimate={...estimate,totalEwdMinutes:360,knownEwdMinutes:360,items:items.map((item,i)=>i===4?{...item,ewdMinutes:120,threePoint:{optimisticMinutes:120,mostLikelyMinutes:120,pessimisticMinutes:120,expectedMinutes:120}}:item)};
  assert.ok(evaluate(strict,'s1',output(360,240,100*240/360,75,null,changedEstimate)).every((a:any)=>a.status==='passed'));
  assert.ok(evaluate(strict,'s1',output(360,240,66.7,75,null,changedEstimate)).every((a:any)=>a.status==='passed'));
  assert.ok(evaluate(strict,'s1',output(360,270,75,75,null,changedEstimate)).some((a:any)=>a.status==='failed'));
});

test('未知有明确证据原因，不能改成零，也不擅自补历史',async()=>{
  const {create,evaluate}=await helpers();const source=fixtures().cases.find(c=>c.id==='case-analysis-test-unknown')!;
  const strict=create(source,'strict-unknown');
  const valid={result:{progress:{totalEwdMinutes:240,completedEwdMinutes:null,knownCompletedEwdMinutes:0,unconfirmedEwdMinutes:240,completionPercent:null,displayPercent:null,comparison:null}}};
  assert.ok(evaluate(strict,'s1',valid).every((a:any)=>a.status==='passed'));
  assert.ok(evaluate(strict,'s1',output(240,0,0,0)).some((a:any)=>a.status==='failed'));
  assert.match(JSON.stringify(strict.expectedOutput),/没有交付正文/);
  assert.throws(()=>create({...source,dataSnapshot:undefined},'missing-snapshot'),/快照/);
});

test('有据时序逐项核对保存历史、计划及两个预测节点',async()=>{
  const {create,evaluate}=await helpers();const source=fixtures().cases.find(c=>c.id==='case-analysis-timing-ahead')!;
  const strict=create(source,'arbitrary-retimed-id');
  const comparison={creation:{at:'2026-10-05',scopeMinutes:240},workload:[{at:'2026-10-05',scopeMinutes:240,completedMinutes:0,scopeVersion:'scope-1'},{at:'2026-10-09',scopeMinutes:240,completedMinutes:120,scopeVersion:'scope-1'}],expected:{scopeVersion:'scope-1',points:[{at:'2026-10-05',completedMinutes:0},{at:'2026-10-09',completedMinutes:120},{at:'2026-10-12',completedMinutes:240}]},forecastTrend:{asOf:'2026-10-09',scopeVersion:'scope-1',startMinutes:120,points:[{at:'2026-10-10',completedMinutes:180,note:'通知窗口'},{at:'2026-10-11',completedMinutes:240,note:'预案窗口'}]},timing:{startOn:'2026-10-05',dueOn:'2026-10-12',forecastOn:'2026-10-11',scopeVersion:'scope-1'}};
  const valid=output(240,120,50,50,comparison);
  assert.ok(evaluate(strict,'s1',valid).every((a:any)=>a.status==='passed'));
  const invalid=structuredClone(valid);invalid.result.progress.comparison=structuredClone(comparison);
  (invalid.result.progress.comparison as typeof comparison).forecastTrend.points[0].completedMinutes=181;
  assert.ok(evaluate(strict,'s1',invalid).some((a:any)=>a.status==='failed'));
});
