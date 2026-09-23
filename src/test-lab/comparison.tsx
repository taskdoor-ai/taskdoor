import { OutputSummary } from "./output-summary";
import React from 'react';
import type { LabRun } from './types';
import { downloadJson, runLabels } from './model';

export function scoreRun(run:LabRun) {
  const planned=run.caseSnapshot.steps.length;
  const completed=run.steps.filter(s=>s.output!==null&&!s.error).length;
  const assertions=run.caseSnapshot.assertions;
  const passed=assertions.filter(a=>run.steps.find(s=>s.stepId===a.stepId)?.assertions.some(r=>r.id===a.id&&r.status==='passed')).length;
  const automatic=['passed','needs_review'].includes(run.status)&&completed===planned&&run.steps.every(s=>s.structure==='passed')&&assertions.length>0&&passed===assertions.length;
  const needsReview=run.caseSnapshot.reviewChecklist.length>0||!!run.caseSnapshot.verification?.expectedResults.some(r=>r.criteria.length>0);
  const accepted=automatic&&run.review?.verdict!=='failed'&&(!needsReview||run.review?.verdict==='passed');
  return {planned,completed,assertions:assertions.length,passed,automatic,accepted};
}
const ratio=(n:number,d:number)=>d?`${Math.round(n/d*100)}% (${n}/${d})`:'未配置';
export function ComparisonReport({runs,onOpenRun}:{runs:LabRun[];onOpenRun:(id:string)=>void}) {
  if(!runs.length)return null;
  const models=[...new Set(runs.map(r=>r.model))];
  const cases=[...new Map(runs.map(r=>[r.caseId,r.caseSnapshot])).values()];
  return <section className="lab-comparison" aria-label="模型横向对比"><div className="lab-detail-heading"><div><h2>模型横向对比</h2><p className="lab-muted">同批 {cases.length} 个用例 · {models.length} 个模型 · {new Date(runs[0].createdAt).toLocaleString('zh-CN')}</p></div><button onClick={()=>downloadJson(`comparison-${runs[0].batchId}.json`,{batchId:runs[0].batchId,metrics:runs.map(r=>({runId:r.id,model:r.model,caseId:r.caseId,...scoreRun(r)})),runs})}>导出对比</button></div>
    <p className="lab-muted">执行完成率 = 返回有效 JSON 的步骤 / 计划步骤；自动达标率要求全部结构与断言通过；最终验收还需完成人工语义核对。失败、未执行与待核对均不计为验收通过。断言达成率包含未执行项。</p>
    <div className="lab-table-scroll"><table className="lab-comparison-table"><thead><tr><th>模型</th><th>执行完成率</th><th>断言达成率</th><th>自动达标用例</th><th>最终验收</th><th>调用耗时 / Tokens</th></tr></thead><tbody>{models.map(model=>{
      const group=runs.filter(r=>r.model===model),scores=group.map(scoreRun);
      const steps=group.flatMap(r=>r.steps),tokens=steps.length&&steps.every(s=>s.usage.totalTokens!==null)?steps.reduce((n,s)=>n+(s.usage.totalTokens??0),0):null;
      return <tr key={model}><th>{model}</th><td>{ratio(scores.reduce((n,s)=>n+s.completed,0),scores.reduce((n,s)=>n+s.planned,0))}</td><td>{ratio(scores.reduce((n,s)=>n+s.passed,0),scores.reduce((n,s)=>n+s.assertions,0))}</td><td>{ratio(scores.filter(s=>s.automatic).length,group.length)}</td><td>{ratio(scores.filter(s=>s.accepted).length,group.length)}</td><td>{(steps.reduce((n,s)=>n+s.durationMs,0)/1000).toFixed(1)} 秒 / {tokens??'未知'}</td></tr>;
    })}</tbody></table></div>
    <div className="lab-table-scroll"><table className="lab-comparison-table"><thead><tr><th>用例 / 预期目标</th>{models.map(m=><th key={m}>{m}</th>)}</tr></thead><tbody>{cases.map(c=><tr key={c.id}><th>{c.name}<small>{c.verification?.objective||c.description}</small></th>{models.map(m=>{const run=runs.find(r=>r.model===m&&r.caseId===c.id);if(!run)return <td key={m}>未执行</td>;const score=scoreRun(run);return <td key={m}><button onClick={()=>onOpenRun(run.id)}>{runLabels[run.status]} · 查看实际输出</button><small>断言 {score.passed}/{score.assertions} · {score.accepted?'验收通过':'尚未验收通过'}</small></td>;})}</tr>)}</tbody></table></div>
  </section>;
}
export function AcceptanceDiff({run}:{run:LabRun}) {
  const score=scoreRun(run);
  return <section className="lab-detail-section"><h3>预期与实际验收</h3><p>步骤完成 {ratio(score.completed,score.planned)} · 断言达成 {ratio(score.passed,score.assertions)} · {score.accepted?'最终验收通过':'尚未达到最终验收标准'}</p>
    {run.caseSnapshot.steps.map((step,i)=>{const actual=run.steps.find(s=>s.stepId===step.id);return <article key={step.id} className="lab-step-preview"><h4>步骤 {i+1} · 输入需求</h4><p>{step.prompt}</p><h4>预期目标结果（语义待人工核对）</h4><ul>{(run.caseSnapshot.verification?.expectedResults.find(r=>r.stepId===step.id)?.criteria??run.caseSnapshot.reviewChecklist).map((text,i)=><li key={i}>{text}</li>)}</ul><h4>实际结果</h4><OutputSummary output={actual?.output} team={run.teamSnapshot}/><div className="lab-table-scroll"><table className="lab-comparison-table"><thead><tr><th>验收项</th><th>预期</th><th>实际</th><th>结论</th></tr></thead><tbody>{run.caseSnapshot.assertions.filter(a=>a.stepId===step.id).map(a=>{const result=actual?.assertions.find(r=>r.id===a.id);return <tr key={a.id}><th>{a.label}<small>{a.path}</small></th><td><code>{a.operator} {JSON.stringify(a.expected)}</code></td><td><code>{result?JSON.stringify(result.actual)??'字段缺失':'未执行'}</code></td><td>{result?.status==='passed'?'通过':result?.status==='failed'?'失败':'未判定'}</td></tr>;})}</tbody></table></div></article>;})}
  </section>;
}
