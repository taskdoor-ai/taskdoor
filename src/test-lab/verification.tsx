import React, { useState } from 'react';
import type { LabCase, LabFixtureCheck } from './types';

export function VerificationSummary({item}:{item:LabCase}) {
  const plan=item.verification;
  if(!plan)return <p className="lab-muted">此用例尚未补充场景验收说明，可在编辑中填写验证目标和逐步预期。</p>;
  return <section className="lab-detail-section lab-verification"><h3>验证目标</h3><p>{plan.objective}</p>
    <details><summary>初始条件 · {plan.fixtureChecks.length} 项自动预检</summary><ul>{plan.preconditions.map((text,i)=><li key={i}>{text}</li>)}</ul></details>
    <h4>目标结果</h4>{item.steps.map((step,index)=><div key={step.id} className="lab-expected-step"><strong>步骤 {index+1}</strong><ul>{plan.expectedResults.find(r=>r.stepId===step.id)?.criteria.map((text,i)=><li key={i}>{text}</li>)}</ul></div>)}
    <p className="lab-muted">流程自动核对结构、引用与已配置断言；语义、责任边界等仍按人工核对项确认。预期结果不会发送给模型。</p>
  </section>;
}

export function VerificationEditor({value,onChange}:{value:LabCase;onChange:(value:LabCase)=>void}){
  const plan=value.verification??{objective:'',preconditions:[],expectedResults:[],fixtureChecks:[]};
  const [rules,setRules]=useState(JSON.stringify(plan.fixtureChecks,null,2));
  const [error,setError]=useState('');
  const lines=(text:string)=>text.split('\n').map(t=>t.trim()).filter(Boolean);
  const set=(patch:Partial<typeof plan>)=>onChange({...value,verification:{...plan,...patch}});
  return <section className="lab-editor-section"><h3>场景验收</h3>
    <label className="lab-field"><span>验证目标</span><textarea rows={2} value={plan.objective} onChange={e=>set({objective:e.target.value})} placeholder="这次要验证哪条产品规则，防止什么错误？" /></label>
    <label className="lab-field"><span>初始条件（每行一项）</span><textarea rows={3} value={plan.preconditions.join('\n')} onChange={e=>set({preconditions:lines(e.target.value)})}/></label>
    {value.steps.map((step,index)=><label className="lab-field" key={step.id}><span>步骤 {index+1} 的目标结果（每行一项）</span><textarea rows={3} value={plan.expectedResults.find(r=>r.stepId===step.id)?.criteria.join('\n')??''} onChange={e=>set({expectedResults:[...plan.expectedResults.filter(r=>r.stepId!==step.id&&value.steps.some(s=>s.id===r.stepId)),{stepId:step.id,criteria:lines(e.target.value)}]})}/></label>)}
    <details className="lab-advanced"><summary>编辑自动前置检查 JSON</summary><p className="lab-muted">每项指定 subject（task、evidence、member）、subjectId、path、operator、expected 和 label。只核对输入资料，不作为模型提示词。</p><textarea aria-label="自动前置检查 JSON" rows={10} value={rules} onChange={e=>{setRules(e.target.value);try{const checks:unknown=JSON.parse(e.target.value);if(!Array.isArray(checks))throw new Error('需要 JSON 数组');set({fixtureChecks:checks as LabFixtureCheck[]});setError('');e.target.setCustomValidity('');}catch{setError('请输入有效的 JSON 数组');e.target.setCustomValidity('自动前置检查 JSON 无效');}}}/>{error&&<p role="alert">{error}</p>}</details>
  </section>;
}
