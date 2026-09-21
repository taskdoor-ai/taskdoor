import React, { useState } from 'react';
import type { LabBootstrap, LabPreflight, LabRun, LabWorkflow } from './types';
import { buildWorkflows, summarizeWorkflow } from './workflows';
import { downloadJson } from './model';
import type { createLabClient } from './client';

export function WorkflowPicker({bootstrap,client,onRun,onOpenCase}:{bootstrap:LabBootstrap;client:ReturnType<typeof createLabClient>;onRun:(workflow:LabWorkflow)=>void;onOpenCase:(id:string)=>void}){
  const workflows=buildWorkflows(bootstrap.state);
  const [teamId,setTeamId]=useState(workflows[0]?.teamId??'');
  const [workflowId,setWorkflowId]=useState(workflows[0]?.id??'');
  const [result,setResult]=useState<LabPreflight|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const selected=workflows.find(w=>w.id===workflowId);
  const stale=result&&result.revision!==bootstrap.state.revision;
  async function check(){if(!selected)return;setBusy(true);setError('');setResult(null);try{setResult(await client.checkWorkflow(selected.id));}catch(e){setError(e instanceof Error?e.message:'预检失败');}finally{setBusy(false);}}
  return <div className="lab-dialog-body lab-workflow-picker"><p>先确认场景目标，再检查资料。开始运行后自动依次执行场景及其步骤，汇总结构检查、自动断言和人工核对状态。</p>
    <div className="lab-form-grid"><label className="lab-field"><span>测试团队</span><select aria-label="流程测试团队" value={teamId} onChange={e=>{setTeamId(e.target.value);setWorkflowId(workflows.find(w=>w.teamId===e.target.value)?.id??'');setResult(null);setError('');}}>{bootstrap.state.teams.filter(t=>workflows.some(w=>w.teamId===t.id)).map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
      <label className="lab-field"><span>测试流程</span><select aria-label="测试流程" value={workflowId} onChange={e=>{setWorkflowId(e.target.value);setResult(null);setError('');}}>{workflows.filter(w=>w.teamId===teamId).map(w=><option key={w.id} value={w.id}>{w.title.split(' · ').at(-1)}</option>)}</select></label></div>
    {!selected?<p className="lab-muted">暂无可用流程，请先配置行业团队及场景。</p>:<><h3>{selected.title}</h3><p>{selected.objective}</p><ol className="lab-workflow-cases">{selected.caseIds.map(id=>{const item=bootstrap.state.cases.find(c=>c.id===id);const checked=result?.cases.find(c=>c.caseId===id);return <li key={id}><button className="lab-workflow-case-link" onClick={()=>onOpenCase(id)}>{item?.name??'用例已删除'}</button><p>{item?.verification?.objective??'尚未定义验证目标'}</p><small>{item?.steps.length??0} 个步骤 · {item?.assertions.length??0} 项自动断言 · {item?.reviewChecklist.length??0} 项人工核对</small>{checked&&<details><summary>{checked.checks.every(c=>c.status==='passed')?'初始条件已满足':'初始条件未满足'}</summary><ul>{checked.checks.map((c,i)=><li key={i}>{c.status==='passed'?'✓':'✕'} {c.label}{c.status==='failed'&&`：${c.message}`}</li>)}</ul></details>}</li>;})}</ol>
    {error&&<p role="alert" className="lab-alert lab-alert-error">{error}</p>}{stale&&<p role="alert" className="lab-alert">资料已更新，请重新预检。</p>}
    {result&&!stale&&<p role="status" className="lab-alert">{result.ready?`预检通过 · ${result.cases.length} 个场景，预计最多 ${result.stepCount} 次模型调用，尚未执行推理。`:'预检未通过，请按未满足项核对资料或修改场景。'}</p>}
    <div className="lab-actions"><button disabled={busy} onClick={()=>void check()}>{busy?'正在预检…':'检查初始条件'}</button><button className="lab-primary" disabled={busy||!result?.ready||!!stale} onClick={()=>onRun(selected)}>选择模型并运行流程</button>{result&&<button onClick={()=>downloadJson('workflow-preflight.json',result)}>导出预检</button>}</div></>}
  </div>;
}

const labels:Record<string,string>={not_run:'尚未运行',running:'运行中',failed:'未通过',incomplete:'未完成核对',needs_review:'自动检查通过 · 待人工核对',passed:'已通过'};
export function WorkflowReport({runs,onOpenRun,onCancel,busy=false}:{runs:LabRun[];onOpenRun:(id:string)=>void;onCancel?:()=>void;busy?:boolean}){
  const report=summarizeWorkflow(runs);
  return <section className="lab-detail-section lab-workflow-report"><div className="lab-section-heading"><h3>本次流程汇总</h3><div className="lab-actions">{report.counts.running>0&&onCancel&&<button disabled={busy} onClick={onCancel}>取消本次流程</button>}<button onClick={()=>downloadJson(`workflow-${report.batchId}.json`,report)}>导出流程报告</button></div></div><p><strong>{labels[report.verdict]}</strong></p><p className="lab-muted">共 {report.counts.total} 个场景 · 自动通过 {report.counts.passed} · 自动失败 {report.counts.failed} · 未完成或未知 {report.counts.unknown} · 待人工核对 {report.counts.reviewPending}</p>
    {report.rows.map(row=><article key={row.id} className="lab-workflow-result"><button onClick={()=>onOpenRun(row.id)}>{row.name}</button><p>{row.objective}</p><small>{row.completedSteps}/{row.totalSteps} 步 · 自动：{({passed:'通过',failed:'失败',unknown:'未知',incomplete:'未完成',running:'运行中'} as Record<string,string>)[row.automatic]} · 人工：{({passed:'通过',failed:'失败',pending:'待核对',not_required:'未要求'} as Record<string,string>)[row.review]}</small>{row.failures.length>0&&<ul>{row.failures.map((failure,i)=><li key={i}>{failure}</li>)}</ul>}</article>)}
  </section>;
}
