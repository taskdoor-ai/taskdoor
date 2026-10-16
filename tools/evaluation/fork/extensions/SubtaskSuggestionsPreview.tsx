import type {LabRun} from '@/test-lab/types';
import React from 'react';

const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const array=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const text=(value:unknown)=>typeof value==='string'?value:'';
const status:Record<string,string>={ready:'可审阅',partial:'局部建议 · 上下文不完整',needs_clarification:'需要确认',no_split_needed:'无需拆分'};

export default function SubtaskSuggestionsPreview({run}:{run:LabRun}){
  const steps=run.steps.filter(step=>step.skillId==='taskdoor-decompose-task');
  if(!steps.length)return null;
  const name=(id:unknown)=>run.teamSnapshot.members.find(member=>member.id===id)?.name??(typeof id==='string'?id:'未分配');
  return <details className="analysis-result-preview" open><summary>查看一层子任务建议 · {steps.length} 轮</summary><div className="analysis-preview-body"><p className="business-muted">建议仅属于当前任务的下一层；审阅结果不代表已创建或已分配。</p>{steps.map((step,index)=>{
    const output=object(step.output),input=object(step.input),current=object(input.currentTask);
    if(output.schemaVersion!=='taskdoor.subtask-suggestions.v1')return <section key={step.stepId}><h3>第 {index+1} 轮</h3><p>尚无符合独立协议的建议，详见原始结果。</p></section>;
    return <section className="analysis-preview-round" key={step.stepId}><h3>第 {index+1} 轮 · {status[text(output.status)]??'待核对'}</h3><p className="business-muted">当前任务：{text(current.title)||text(output.parentTaskId)} · Skill：{step.skillVersionLabel??'工作区版本'}</p>{step.structure!=='passed'&&<p className="text-destructive">结构校验未通过，以下仅显示已返回内容。</p>}<p>{text(output.summary)}</p>{array(output.suggestions).map((value,position)=>{const item=object(value);return <article key={text(item.clientId)||position} className="border-t py-3 business-fields"><h4>{position+1}. {text(item.title)}</h4><p><strong>目标：</strong>{text(item.goal)}</p><div><strong>完成标准</strong><ul>{array(item.acceptanceCriteria).map((criterion,i)=><li key={i}>{text(criterion)}</li>)}</ul></div><p>建议负责人：{name(item.ownerMemberId)} · 截止日期：{text(item.dueDate)||'不设截止'}</p><p className="business-muted">{text(item.assignmentReason)}</p>{array(item.participants).length>0&&<p>必要参与：{array(item.participants).map(participant=>{const person=object(participant);return `${name(person.memberId)}：${text(person.contribution)}`;}).join('；')}</p>}<p>{text(item.rationale)}</p>{array(item.executionTips).length>0&&<ul>{array(item.executionTips).map((tip,i)=><li key={i}>{text(tip)}</li>)}</ul>}<small>依据：{array(item.sourceRefs).map(text).join('、')}</small></article>;})}{array(output.coveredByExisting).length>0&&<div><h4>已有子任务覆盖</h4><ul>{array(output.coveredByExisting).map((value,i)=>{const covered=object(value);return <li key={i}>{run.teamSnapshot.tasks.find(task=>task.id===covered.taskId)?.title??text(covered.taskId)}：{text(covered.reason)}</li>;})}</ul></div>}{array(output.contextGaps).length>0&&<div><h4>上下文缺口</h4><ul>{array(output.contextGaps).map((gap,i)=><li key={i}>{text(gap)}</li>)}</ul></div>}{array(output.questions).length>0&&<div><h4>待确认</h4>{array(output.questions).map((value,i)=>{const question=object(value);return <p key={i}>{text(question.question)}<small className="block">{array(question.choices).map(text).join(' / ')} · 可自填</small></p>;})}</div>}{array(output.warnings).length>0&&<ul className="business-muted">{array(output.warnings).map((warning,i)=><li key={i}>{text(warning)}</li>)}</ul>}</section>;
  })}</div></details>;
}
