import React from 'react';
import type { LabTeam } from './types';
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const list=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const text=(value:unknown,fallback='未提供')=>typeof value==='string'?value:fallback;
const number=(value:unknown,suffix:string)=>typeof value==='number'&&Number.isFinite(value)?`${value}${suffix}`:'未知';
export function OutputSummary({output,team}:{output:unknown;team:LabTeam}) {
  const root=record(output),result=record(root.result),proposal=record(root.proposal);
  const changes=list(proposal.changes);
  const person=(id:unknown)=>typeof id==='string'?team.members.find(m=>m.id===id)?.name||id:'未分配';
  if(output===null||output===undefined)return <p className="lab-muted">尚无实际输出</p>;
  if(changes.length)return <div className="lab-table-scroll"><p>{text(root.summary,'')}</p><table className="lab-comparison-table"><thead><tr><th>任务 / 归属</th><th>负责人 / 参与人</th><th>实际完成标准</th><th>预计投入</th></tr></thead><tbody>{changes.map((value,index)=>{const change=record(value),fields=record(change.fields),owner=record(fields.ownerRecommendation);return <tr key={index}><th>{text(fields.title)}<small>{text(change.action)} · {text(change.parentId,'顶层任务')}</small></th><td>{person(owner.memberId)}<small>{text(owner.reason,'')}</small><small>{list(fields.participantRecommendations).map(p=>person(record(p).memberId)).join('、')}</small></td><td><ul>{list(fields.acceptanceCriteria).map((c,i)=><li key={i}>{text(c)}</li>)}</ul></td><td>{number(record(fields.estimate).ewdHours,' 小时')}</td></tr>;})}</tbody></table></div>;
  if(root.skillId==='agentdoor-task-diagnostician')return <><p>实际诊断 {list(result.diagnoses).length} 项</p>{list(result.diagnoses).map((v,i)=>{const d=record(v);return <article key={i}><strong>{d.type==='decision_conflict'?'决策冲突':d.type==='execution_blockage'?'执行阻塞':'未识别诊断'}</strong><p>{text(d.summary)}</p><ul>{list(d.sides).map((side,j)=><li key={j}>{text(record(side).claim)}</li>)}</ul></article>;})}</>;
  if(result.currentSituation||result.progress||result.trend){const progress=record(result.progress);return <><p>{text(record(result.currentSituation).summary,'')}</p>{result.formalStatus!==undefined&&<p>正式状态：{text(result.formalStatus)}</p>}{result.progress!==null&&result.progress!==undefined&&<p>实际完成比例：{number(progress.completionPercent,'%')} · 总量：{number(progress.totalEwdMinutes,' 分钟')} · 完成量：{number(progress.completedEwdMinutes,' 分钟')}</p>}{result.trend!==null&&result.trend!==undefined&&<pre className="lab-output-summary-json">{JSON.stringify(result.trend,null,2)}</pre>}</>;}
  return <p>{text(root.summary,'实际结构化输出见下方原始报告。')}</p>;
}
