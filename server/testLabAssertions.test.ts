import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAssertions} from './test-lab/assertions.ts';
import type {LabAssertion} from '../src/test-lab/types.ts';

const forecast=(expected:boolean):LabAssertion=>({id:'forecast',stepId:'s1',label:'没有排期就不能生成预测日',path:'result.progress.comparison.timing.forecastOn',operator:'nullish' as LabAssertion['operator'],expected});
test('没有排期时空值和未提供都符合，编造日期直接判失败',()=>{
 for(const value of [{result:{progress:{comparison:null}}},{result:{progress:{comparison:{timing:{forecastOn:null}}}}}]){
  assert.equal(evaluateAssertions(value,[forecast(true)])[0].status,'passed');
 }
 assert.equal(evaluateAssertions({result:{progress:{comparison:{timing:{forecastOn:'2026-10-09'}}}}},[forecast(true)])[0].status,'failed');
});
test('必须有依据日期的检查不会放过空值',()=>{
 assert.equal(evaluateAssertions({},[forecast(false)])[0].status,'failed');
 assert.equal(evaluateAssertions({result:{progress:{comparison:{timing:{forecastOn:null}}}}},[forecast(false)])[0].status,'failed');
 assert.equal(evaluateAssertions({result:{progress:{comparison:{timing:{forecastOn:'2026-10-12'}}}}},[forecast(false)])[0].status,'passed');
});
test('新增空值检查不改变必填字段缺失的旧等值规则',()=>{
 const rule={...forecast(true),operator:'equals' as const,expected:null};
 assert.equal(evaluateAssertions({},[rule])[0].status,'unknown');
});
