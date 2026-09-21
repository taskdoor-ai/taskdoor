import React, { useEffect, useMemo, useState } from 'react';
import type { LabCase, LabTeam } from './types';
import { buildView } from './visibility';
import { DocumentView } from './markdown';
import { evidenceDownload, isMarkdownEvidence } from './markdown-files';

export function CaseContext({ item, team, onEditFile }: { item: LabCase; team: LabTeam; onEditFile?:(id:string)=>void }) {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [range, setRange] = useState(item.steps.some(s => s.taskId) ? 'target' : 'all');
  const [openId, setOpenId] = useState<string | null>(null);
  const recordTime = (value:string) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('zh-CN') : '时间未记录';
  useEffect(()=>{if(openId)document.getElementById(`lab-context-${openId}`)?.scrollIntoView({block:'nearest'});},[openId]);
  const visible = useMemo(() => buildView(team, item.actorId).team, [team, item.actorId]);
  const targetIds = new Set(item.steps.flatMap(step => step.taskId ? [step.taskId] : []));
  let added = true;
  while (added) {
    added = false;
    for (const task of visible.tasks) if (task.parentId && targetIds.has(task.parentId) && !targetIds.has(task.id)) { targetIds.add(task.id); added = true; }
  }
  const records = visible.evidence.filter(record => (range === 'all' || targetIds.has(record.taskId)) &&
    (kind === 'all' || record.kind === kind) && (!search || `${record.title} ${record.content} ${visible.tasks.find(t=>t.id===record.taskId)?.title || ''}`.toLowerCase().includes(search.toLowerCase()))
  ).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return <section className="lab-detail-section lab-case-context">
    <h3>文件与讨论 <small>{visible.evidence.length} 条可见资料</small></h3>
    <p className="lab-muted">运行前资料 · {team.members.find(m=>m.id===item.actorId)?.name}视角。可查看任务下的文件、回复、交付、确认与活动；各步骤的前置事件在运行时依次应用。</p>
    <div className="lab-context-tools">
      <input type="search" aria-label="搜索文件、讨论或正文" placeholder="搜索文件、讨论或正文" value={search} onChange={e=>setSearch(e.target.value)} />
      <select aria-label="资料任务范围" value={range} onChange={e=>setRange(e.target.value)}>
        {targetIds.size > 0 && <option value="target">目标任务及子任务</option>}<option value="all">全部可见任务</option>
      </select>
      <select aria-label="资料类型" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">全部类型</option>{(['文件','讨论','交付','确认','活动'] as const).map(value=><option key={value} value={value}>{value} · {visible.evidence.filter(e=>e.kind===value).length}</option>)}</select>
    </div>
    <p className="lab-muted">当前显示 {records.length} 条</p>
    <div className="lab-context-records">{records.map(record => <details id={`lab-context-${record.id}`} className="lab-context-record" key={record.id} open={openId===record.id}>
      <summary onClick={event=>{event.preventDefault();setOpenId(openId===record.id?null:record.id);}}>
        <span className="lab-record-kind">{record.kind}</span><span><strong>{record.title}</strong><small>{visible.tasks.find(t=>t.id===record.taskId)?.title} · {visible.members.find(m=>m.id===record.authorId)?.name} · {recordTime(record.createdAt)}</small></span>
      </summary>
      {openId===record.id && <div className="lab-context-body">
        <div className="lab-record-references">{[...(record.replyToId?[{id:record.replyToId,label:'回复'}]:[]),...(record.supersedesId?[{id:record.supersedesId,label:'替代版本'}]:[]),...(record.relatedEvidenceIds||[]).map(id=>({id,label:'关联资料'}))].map(ref=>{
          const related=visible.evidence.find(e=>e.id===ref.id);
          return related?<button key={`${ref.label}-${ref.id}`} onClick={()=>{setRange('all');setKind('all');setSearch('');setOpenId(ref.id);}}>{ref.label}：{related.title}</button>:null;
        })}</div>
        {record.kind==='文件' ? <DocumentView key={record.id} content={record.content} filename={record.attachment?.name||record.title} downloadFile={evidenceDownload(record)} onEdit={onEditFile&&isMarkdownEvidence(record)?()=>onEditFile(record.id):undefined} /> : <p className="lab-discussion-content">{record.content}</p>}
      </div>}
    </details>)}</div>
    {!records.length && <p className="lab-muted">当前范围没有匹配的资料，可切换任务范围或清除搜索。</p>}
  </section>;
}
