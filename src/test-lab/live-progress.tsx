import React, {useEffect, useState} from 'react';
import type {LabRun} from './types';
import {isActiveRun, runLabels} from './model';

export function LiveProgress({runs, onOpenRun}:{runs:LabRun[];onOpenRun?:(id:string)=>void}) {
 const [now,setNow]=useState(Date.now);
 const active=runs.some(r=>isActiveRun(r.status));
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[active]);
 const running=runs.filter(r=>r.status==='running');
 const queued=runs.filter(r=>r.status==='queued').length;
 const ended=runs.filter(r=>!isActiveRun(r.status)).length;
 const returned=runs.filter(r=>r.steps.some(s=>s.rawOutput)).length;
 const failed=runs.filter(r=>r.status==='failed').length;
 const stopped=runs.filter(r=>r.status==='cancelled'||r.status==='interrupted').length;
 const latest=[...runs].filter(r=>!isActiveRun(r.status)).sort((a,b)=>(b.finishedAt??b.createdAt).localeCompare(a.finishedAt??a.createdAt)).slice(0,3);
 return <section className="lab-live-progress" aria-label="执行进度">
  <div className="lab-section-heading"><h3>执行进度</h3><strong>{`已结束 ${ended} / ${runs.length}`}</strong></div>
  <progress aria-label="已结束的用例与模型组合" max={runs.length||1} value={ended}/>
  <p role="status">{`运行中 ${running.length} · 排队 ${queued} · 有返回内容 ${returned} · 失败 ${failed} · 取消或中断 ${stopped}`}</p>
  <p className="lab-muted">按服务端状态每 2 秒刷新。进度按已结束的用例与模型组合计算，包含失败与取消；验收结论见下方结果。</p>
  {running.map(run=>{const step=run.caseSnapshot.steps[run.steps.length];const elapsed=run.startedAt?Math.max(0,Math.floor((now-Date.parse(run.startedAt))/1000)):null;return <article className="lab-live-current" key={run.id}>
   <strong>{run.caseName} · {run.model}</strong>
   <p>{step?`步骤 ${run.steps.length+1} / ${run.caseSnapshot.steps.length} · 等待模型返回`:'正在汇总结果'} · 本用例已运行 {elapsed===null?'未知':`${elapsed} 秒`}</p>
   {step&&<p className="lab-live-prompt">{step.prompt}</p>}
   <small>已保存 {run.steps.length} 个步骤结果。模型返回前无法获知生成百分比与 Token 用量。</small>
   {onOpenRun&&<button onClick={()=>onOpenRun(run.id)}>查看当前运行</button>}
  </article>;})}
  {!running.length&&queued>0&&<p>等待队列调度；服务按顺序执行，可能正在处理其他批次。</p>}
  {latest.length>0&&<div className="lab-live-results"><h4>最近结束</h4>{latest.map(run=><div key={run.id}>{onOpenRun?<button onClick={()=>onOpenRun(run.id)}>{run.caseName} · 查看实际结果</button>:<strong>{run.caseName}</strong>}<span>{run.model} · {runLabels[run.status]}</span>{run.error&&<p className="lab-alert-error">{run.error}</p>}</div>)}</div>}
 </section>;
}
