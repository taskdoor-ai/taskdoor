import React, { useEffect, useState } from 'react';
import { Download, Pencil } from 'lucide-react';
import { createLabClient } from './client';
import { Field } from './editors';
import { Empty } from './views';
import { SkillDocuments } from './markdown';
import { downloadJson } from './model';
import type { LabBootstrap, LabRunSelection, LabState, SkillId } from './types';

type Client = ReturnType<typeof createLabClient>;
const message = (e:unknown) => e instanceof Error ? e.message : '操作失败，请重试';

export function SkillManager({ bootstrap, client, onSave, onDraftChange }: { bootstrap:LabBootstrap; client:Client; onSave:(state:LabState)=>void; onDraftChange?:(dirty:boolean)=>void }) {
  const [skillId,setSkillId]=useState<SkillId>(bootstrap.skills[0]?.id??'agentdoor-task-planner');
  const [selected,setSelected]=useState('workspace');
  const [baseline,setBaseline]=useState<{snapshot:string;hash:string}|null>(null);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(false);
  const [draft,setDraft]=useState<{label:string;notes:string;snapshot:string;revision:number}|null>(null);
  const [notice,setNotice]=useState('');
  const [selectedFile,setSelectedFile]=useState(0);
  const [dirty,setDirty]=useState(false);
  const [discard,setDiscard]=useState(false);
  const versions=(bootstrap.state.skillVersions??[]).filter(v=>v.skillId===skillId);
  const version=versions.find(v=>v.id===selected);
  const current=version??baseline;
  const defaultId=bootstrap.state.skillDefaults?.[skillId]??'workspace';
  useEffect(()=>{let stopped=false;setBaseline(null);setLoading(true);setError('');client.skill(skillId).then(value=>{if(!stopped)setBaseline(value);}).catch(e=>{if(!stopped)setError(message(e));}).finally(()=>{if(!stopped)setLoading(false);});return()=>{stopped=true;};},[skillId,client]);
  useEffect(()=>{onDraftChange?.(dirty||busy);return()=>onDraftChange?.(false);},[dirty,busy,onDraftChange]);
  useEffect(()=>{if(!dirty)return;const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
  function startEditing(){if(!current)return;let number=versions.length+1;while(versions.some(v=>v.label===`v${number}`))number++;setDraft({label:`v${number}`,notes:'',snapshot:current.snapshot,revision:bootstrap.state.revision});setDirty(false);setDiscard(false);setError('');setNotice('');}
  function stopEditing(){setDraft(null);setDirty(false);setDiscard(false);setError('');}
  async function save(){if(!draft)return;setBusy(true);setError('');try{const state=await client.addSkillVersion(draft.revision,{skillId,label:draft.label,notes:draft.notes,snapshot:draft.snapshot});onSave(state);setSelected(state.skillVersions!.at(-1)!.id);stopEditing();setNotice('文档已保存为新版本，可设为默认版本或在用例中选用。');}catch(e){setError(message(e));}finally{setBusy(false);}}
  return <div className="lab-workspace lab-skill-workspace"><section className="lab-list" aria-label="Skill 列表"><div className="lab-list-heading">Skill <small>{bootstrap.skills.length} 项</small></div>{bootstrap.skills.map(skill=><button className={`lab-list-row ${skill.id===skillId?'is-selected':''}`} key={skill.id} disabled={!!draft} onClick={()=>{setSkillId(skill.id);setSelected('workspace');setSelectedFile(0);setNotice('');}}><span><strong>{skill.title}</strong><small>{skill.outputVersion} · {(bootstrap.state.skillVersions??[]).filter(v=>v.skillId===skill.id).length} 个保存版本</small></span></button>)}</section>
    <section className="lab-detail" aria-label="Skill 详情"><div className="lab-detail-heading"><div><small>{skillId}</small><h2>{bootstrap.skills.find(s=>s.id===skillId)?.title}</h2></div><button className="lab-primary" disabled={!current||!!draft||loading} onClick={startEditing}><Pencil size={14}/>编辑当前版本</button></div>
      <p className="lab-description">按文件阅读和编辑规则正文与引用资料。修改保存为新版本，工作区源文件和已有运行快照保留。</p>
      {error&&<p className="lab-alert lab-alert-error" role="alert">{error}</p>}{notice&&<p className="lab-alert lab-alert-success" role="status">{notice}</p>}
      <div className="lab-form-grid"><Field label="查看版本"><select disabled={!!draft} value={selected} onChange={e=>setSelected(e.target.value)}><option value="workspace">工作区版本{defaultId==='workspace'?' · 默认':''}</option>{[...versions].reverse().map(v=><option key={v.id} value={v.id}>{v.label}{defaultId===v.id?' · 默认':''}</option>)}</select></Field><div className="lab-version-action"><button disabled={busy||!!draft||defaultId===selected||!current} onClick={async()=>{setBusy(true);setError('');try{onSave(await client.setSkillDefault(bootstrap.state.revision,skillId,selected==='workspace'?null:selected));setNotice('默认版本已更新，已排队运行和历史报告保持原快照。');}catch(e){setError(message(e));}finally{setBusy(false);}}}>设为默认版本</button><button disabled={!current} onClick={()=>downloadJson(`${skillId}-${version?.label??'workspace'}.json`,{skillId,...current})}><Download size={14}/>导出</button></div></div>
      {draft?<form className="lab-version-editor" onSubmit={e=>{e.preventDefault();void save();}}>
        <h3>编辑文档</h3><div className="lab-form-grid"><Field label="保存为版本"><input required disabled={busy} maxLength={80} value={draft.label} onChange={e=>{setDraft({...draft,label:e.target.value});setDirty(true);}}/></Field><Field label="变更说明"><input disabled={busy} maxLength={2000} placeholder="记录这次调整的内容" value={draft.notes} onChange={e=>{setDraft({...draft,notes:e.target.value});setDirty(true);}}/></Field></div>
        <SkillDocuments snapshot={draft.snapshot} selectedFile={selectedFile} onSelectFile={setSelectedFile} disabled={busy} onChange={snapshot=>{setDraft({...draft,snapshot});setDirty(true);}}/>
        {draft.snapshot.length>300000&&<p role="alert" className="lab-alert lab-alert-error">完整 Skill 超过 300,000 字符，请精简后保存。</p>}
        {discard&&<div className="lab-alert lab-discard" role="alert"><span>文档修改尚未保存，确定放弃？</span><button type="button" onClick={()=>setDiscard(false)}>继续编辑</button><button type="button" onClick={stopEditing}>放弃修改</button></div>}
        <div className="lab-actions lab-document-save"><small>{dirty?'有未保存的修改':'保存时创建新版本'}</small><button type="button" onClick={()=>downloadJson(`${skillId}-draft.json`,{skillId,...draft})}>导出草稿</button><button type="button" disabled={busy} onClick={()=>dirty?setDiscard(true):stopEditing()}>取消编辑</button><button className="lab-primary" disabled={busy||draft.snapshot.length>300000} type="submit">{busy?'保存中…':'保存新版本'}</button></div>
      </form>:loading?<Empty title="正在读取工作区 Skill"/>:current?<><dl className="lab-facts"><div><dt>当前默认</dt><dd>{versions.find(v=>v.id===defaultId)?.label??'工作区版本'}</dd></div><div><dt>保存时间</dt><dd>{version?new Date(version.createdAt).toLocaleString('zh-CN'):'随工作区文件更新'}</dd></div><div><dt>内容校验值</dt><dd><code>{current.hash}</code></dd></div><div><dt>变更说明</dt><dd>{version?.notes||'项目中的当前规则与引用资料'}</dd></div></dl><SkillDocuments snapshot={current.snapshot} selectedFile={selectedFile} onSelectFile={setSelectedFile} onEdit={startEditing}/></>:<Empty title="版本暂时不可用">切换 Skill 后重新读取。</Empty>}
    </section></div>;
}

export function ModelSettings({bootstrap,client,onSave}:{bootstrap:LabBootstrap;client:Client;onSave:(state:LabState)=>void}){
  const [models,setModels]=useState((bootstrap.state.models??[bootstrap.config.model]).join('\n'));
  const [catalog,setCatalog]=useState<string[]>([]);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
  const [revision,setRevision]=useState(bootstrap.state.revision);
  return <section className="lab-settings lab-detail-section"><h3>常用模型</h3><p className="lab-muted">每行填写一个模型 ID，保存后可在运行前选择。模型须支持当前服务的 Responses 接口，实际可用性以运行结果为准。</p>{error&&<p role="alert" className="lab-alert lab-alert-error">{error}</p>}{notice&&<p role="status" className="lab-alert lab-alert-success">{notice}</p>}<Field label="模型 ID 列表"><textarea rows={5} value={models} onChange={e=>setModels(e.target.value)} placeholder={bootstrap.config.model}/></Field><div className="lab-actions"><button disabled={busy||!bootstrap.config.configured} onClick={async()=>{setBusy(true);setError('');try{setCatalog((await client.modelCatalog()).models);}catch(e){setError(message(e));}finally{setBusy(false);}}}>读取服务端模型目录</button><button className="lab-primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const state=await client.saveModels(revision,models.split('\n').map(v=>v.trim()).filter(Boolean));onSave(state);setRevision(state.revision);setNotice('常用模型已保存。');}catch(e){setError(message(e));}finally{setBusy(false);}}}>保存模型列表</button></div>{catalog.length>0&&<Field label="从服务端目录添加模型"><select value="" onChange={e=>{if(e.target.value)setModels([...new Set([...models.split('\n').filter(Boolean),e.target.value])].join('\n'));}}><option value="">选择模型加入常用列表（{catalog.length} 个）</option>{catalog.map(id=><option key={id}>{id}</option>)}</select></Field>}</section>;
}

export function RunSetup({bootstrap,caseIds,preferredActorId,lockActor=false,onSubmit,onClose}:{bootstrap:LabBootstrap;caseIds:string[];preferredActorId?:string;lockActor?:boolean;onSubmit:(selection:LabRunSelection)=>Promise<void>;onClose:()=>void}){
  const cases=caseIds.map(id=>bootstrap.state.cases.find(c=>c.id===id)!);
  const teamIds=[...new Set(cases.map(c=>c.teamId))];const team=teamIds.length===1?bootstrap.state.teams.find(t=>t.id===teamIds[0]):undefined;
  const [model,setModel]=useState(bootstrap.state.models?.[0]||bootstrap.config.model);
  const [actor,setActor]=useState(lockActor?'':preferredActorId||(cases.length===1?cases[0].actorId:''));
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const selectedActor=team?.members.find(m=>m.id===actor);
  const unavailable=actor&&team&&cases.some(c=>c.steps.some(s=>s.taskId&&!team.tasks.some(t=>t.id===s.taskId&&(t.visibility==='team'||t.ownerId===actor||t.participantIds.includes(actor)))));
  return <form onSubmit={e=>{e.preventDefault();setBusy(true);setError('');void onSubmit({model:model.trim(),...(actor?{actorId:actor}:{})}).catch(e=>{setError(message(e));setBusy(false);});}}><div className="lab-dialog-body"><p>本次运行 {cases.length} 个用例、{cases.reduce((n,c)=>n+c.steps.length,0)} 个步骤。</p>{error&&<p role="alert" className="lab-alert lab-alert-error">{error}</p>}<Field label="运行模型"><input required list="lab-run-models" value={model} onChange={e=>setModel(e.target.value)} pattern="[a-zA-Z0-9_.:/\-]+"/><datalist id="lab-run-models">{[...new Set([bootstrap.config.model,...(bootstrap.state.models??[])])].map(id=><option key={id} value={id}/>)}</datalist></Field>{lockActor?<p className="lab-muted">流程使用各场景保存的人员，依次验证不同角色。</p>:team?<Field label="本次执行人员"><select value={actor} onChange={e=>setActor(e.target.value)}><option value="">沿用各用例保存的人员</option>{team.members.map(m=><option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}</select></Field>:<p className="lab-muted">跨团队批次使用各用例保存的执行人员。</p>}{selectedActor&&<p className="lab-muted">责任范围：{selectedActor.responsibilities.join('；')}</p>}{unavailable&&<p role="alert" className="lab-alert lab-alert-error">所选人员无权查看部分目标任务，请切换人员或调整用例。</p>}<div className="lab-run-preview">{cases.map(c=><section key={c.id}><strong>{c.name}</strong><small>执行人员：{bootstrap.state.teams.find(t=>t.id===c.teamId)?.members.find(m=>m.id===(actor||c.actorId))?.name||"成员不存在"}</small>{c.steps.map((s,i)=>{const versionId=s.skillVersionId===null?null:s.skillVersionId||bootstrap.state.skillDefaults?.[s.skillId];return <p key={s.id}>{i+1}. {bootstrap.skills.find(v=>v.id===s.skillId)?.title} · {bootstrap.state.skillVersions?.find(v=>v.id===versionId)?.label??'工作区版本'}</p>;})}</section>)}</div><p className="lab-muted">确认后调用模型服务并产生相应 API 用量；本次人员选择不修改原用例，报告保留运行配置和上下文快照。</p></div><footer className="lab-dialog-footer"><button type="button" disabled={busy} onClick={onClose}>取消</button><button type="submit" className="lab-primary" disabled={busy||!!unavailable}>{busy?'正在提交…':'开始运行'}</button></footer></form>;
}
