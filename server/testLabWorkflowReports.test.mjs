import test from 'node:test';
import assert from 'node:assert/strict';
import { toJUnit, reportExitCode } from '../scripts/run-test-lab-workflow.mjs';

test('报告将待人工核对与未完成列为 skipped，不制造通过',()=>{
  const row={name:'版本 <核对> & 回复',steps:[],failures:[],automatic:'passed',review:'pending'};
  const report={workflowId:'local',verdict:'needs_review',rows:[row,{...row,name:'取消',automatic:'incomplete',review:'not_required'}]};
  const xml=toJUnit(report);
  assert.match(xml,/skipped="2"/);assert.match(xml,/版本 &lt;核对&gt; &amp; 回复/);assert.equal(reportExitCode(report),2);
  assert.equal(reportExitCode({...report,verdict:'passed'}),0);
});
test('自动失败或人工失败均使 CI 失败，错误文本安全转义',()=>{
  const report={workflowId:'local',verdict:'failed',rows:[{name:'断言失败',automatic:'failed',review:'pending',error:'期望 "已完成" < 实际值',failures:['状态错误'],steps:[]}]};
  assert.match(toJUnit(report),/failures="1" skipped="0"/);assert.match(toJUnit(report),/&quot;已完成&quot; &lt;/);assert.equal(reportExitCode(report),1);
});
