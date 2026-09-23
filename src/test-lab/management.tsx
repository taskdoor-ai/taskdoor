import { modelProvider } from "./ModelPicker";
import { packageDiff } from "./skill-package";
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
  async function save(){if(!draft)return;setBusy(true);setError('');try{const state=await client.addSkillVersion(draft.revision,{skillId,label:draft.label,notes:draft.notes,baseVersionId:selected==='workspace'?null:selected,snapshot:draft.snapshot});onSave(state);setSelected(state.skillVersions!.at(-1)!.id);stopEditing();setNotice('文档已保存为新版本，可设为默认版本或在用例中选用。');}catch(e){setError(message(e));}finally{setBusy(false);}}
  return <div className="lab-workspace lab-skill-workspace"><section className="lab-list" aria-label="Skill 列表"><div className="lab-list-heading">Skill <small>{bootstrap.skills.length} 项</small></div>{bootstrap.skills.map(skill=><button className={`lab-list-row ${skill.id===skillId?'is-selected':''}`} key={skill.id} disabled={!!draft} onClick={()=>{setSkillId(skill.id);setSelected('workspace');setSelectedFile(0);setNotice('');}}><span><strong>{skill.title}</strong><small>{skill.outputVersion} · {(bootstrap.state.skillVersions??[]).filter(v=>v.skillId===skill.id).length} 个保存版本</small></span></button>)}</section>
    <section className="lab-detail" aria-label="Skill 详情"><div className="lab-detail-heading"><div><small>{skillId}</small><h2>{bootstrap.skills.find(s=>s.id===skillId)?.title}</h2></div><button className="lab-primary" disabled={!current||!!draft||loading} onClick={startEditing}><Pencil size={14}/>编辑当前版本</button></div>
      <p className="lab-description">按文件阅读和编辑规则正文与引用资料。修改保存为新版本，工作区源文件和已有运行快照保留。</p>
      {error&&<p className="lab-alert lab-alert-error" role="alert">{error}</p>}{notice&&<p className="lab-alert lab-alert-success" role="status">{notice}</p>}
      <div className="lab-form-grid"><Field label="查看版本"><select disabled={!!draft} value={selected} onChange={e=>setSelected(e.target.value)}><option value="workspace">工作区版本{defaultId==='workspace'?' · 默认':''}</option>{[...versions].reverse().map(v=><option key={v.id} value={v.id}>{v.label}{defaultId===v.id?' · 默认':''}</option>)}</select></Field><div className="lab-version-action"><button disabled={busy||!!draft||defaultId===selected||!current} onClick={async()=>{setBusy(true);setError('');try{onSave(await client.setSkillDefault(bootstrap.state.revision,skillId,selected==='workspace'?null:selected));setNotice('默认版本已更新，已排队运行和历史报告保持原快照。');}catch(e){setError(message(e));}finally{setBusy(false);}}}>设为默认版本</button><button disabled={!current} onClick={()=>downloadJson(`${skillId}-${version?.label??'workspace'}.json`,{skillId,...current})}><Download size={14}/>导出</button></div></div>
      {draft?<form className="lab-version-editor" onSubmit={e=>{e.preventDefault();void save();}}>
        <h3>编辑文档</h3><div className="lab-form-grid"><Field label="保存为版本"><input required disabled={busy} maxLength={80} value={draft.label} onChange={e=>{setDraft({...draft,label:e.target.value});setDirty(true);}}/></Field><Field label="变更说明"><input disabled={busy} maxLength={2000} placeholder="记录这次调整的内容" value={draft.notes} onChange={e=>{setDraft({...draft,notes:e.target.value});setDirty(true);}}/></Field></div>
        <p className="lab-muted">基于 {version?.label??'工作区版本'} · 新增 {packageDiff(current!.snapshot,draft.snapshot).added.length} 个文件 · 修改 {packageDiff(current!.snapshot,draft.snapshot).modified.length} 个 · 删除 {packageDiff(current!.snapshot,draft.snapshot).removed.length} 个</p>
        <SkillDocuments snapshot={draft.snapshot} selectedFile={selectedFile} onSelectFile={setSelectedFile} disabled={busy} onChange={snapshot=>{setDraft({...draft,snapshot});setDirty(true);}}/>
        {draft.snapshot.length>300000&&<p role="alert" className="lab-alert lab-alert-error">完整 Skill 超过 300,000 字符，请精简后保存。</p>}
        {discard&&<div className="lab-alert lab-discard" role="alert"><span>文档修改尚未保存，确定放弃？</span><button type="button" onClick={()=>setDiscard(false)}>继续编辑</button><button type="button" onClick={stopEditing}>放弃修改</button></div>}
        <div className="lab-actions lab-document-save"><small>{dirty?'有未保存的修改':'保存时创建新版本'}</small><button type="button" onClick={()=>downloadJson(`${skillId}-draft.json`,{skillId,...draft})}>导出草稿</button><button type="button" disabled={busy} onClick={()=>dirty?setDiscard(true):stopEditing()}>取消编辑</button><button className="lab-primary" disabled={busy||draft.snapshot.length>300000} type="submit">{busy?'保存中…':'保存新版本'}</button></div>
      </form>:loading?<Empty title="正在读取工作区 Skill"/>:current?<><dl className="lab-facts"><div><dt>当前默认</dt><dd>{versions.find(v=>v.id===defaultId)?.label??'工作区版本'}</dd></div><div><dt>保存时间</dt><dd>{version?new Date(version.createdAt).toLocaleString('zh-CN'):'随工作区文件更新'}</dd></div><div><dt>内容校验值</dt><dd><code>{current.hash}</code></dd></div><div><dt>变更说明</dt><dd>{version?.notes||'项目中的当前规则与引用资料'}</dd></div></dl><SkillDocuments snapshot={current.snapshot} selectedFile={selectedFile} onSelectFile={setSelectedFile} onEdit={startEditing}/></>:<Empty title="版本暂时不可用">切换 Skill 后重新读取。</Empty>}
    </section></div>;
}

export function ModelSettings({bootstrap,client,onSave}:{bootstrap:LabBootstrap;client:Client;onSave:(state:LabState)=>void}){
  const [models,setModels]=useState(bootstrap.state.models??[bootstrap.config.model]);
  const [catalog,setCatalog]=useState<string[]>([]),[query,setQuery]=useState(''),[closed,setClosed]=useState<Set<string>>(new Set());
  const [error,setError]=useState(''),[catalogError,setCatalogError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
  const [revision,setRevision]=useState(bootstrap.state.revision);
  const [custom,setCustom]=useState('');
  async function load(){setLoading(true);setCatalogError('');try{setCatalog((await client.modelCatalog()).models);}catch(e){setCatalogError(message(e));}finally{setLoading(false);}}
  useEffect(()=>{if(bootstrap.config.configured)void load();},[client,bootstrap.config.configured]);
  const all=[...new Set([...catalog,...models,bootstrap.config.model])].filter(Boolean).sort();
  const groups=[...new Set(all.map(modelProvider))].sort();
  const filtered=all.filter(id=>`${id} ${modelProvider(id)}`.toLowerCase().includes(query.toLowerCase()));
  function toggle(id:string){setModels(current=>current.includes(id)?current.filter(m=>m!==id):[...current,id]);setNotice('');}
  return <section className="lab-settings lab-detail-section lab-model-management">
    <div className="lab-run-heading"><div><h3>模型与厂商</h3><p className="lab-muted">{loading?'正在加载完整目录…':`服务目录 ${catalog.length} 个 · 常用模型 ${models.length} 个`}</p></div><button disabled={loading||!bootstrap.config.configured} onClick={()=>void load()}>刷新模型目录</button></div>
    <div className="lab-run-heading"><input type="search" aria-label="搜索模型或厂商" placeholder="搜索模型名称或厂商" value={query} onChange={e=>{setQuery(e.target.value);setClosed(new Set());}}/><div className="lab-actions"><button onClick={()=>setClosed(new Set())}>全部展开</button><button onClick={()=>setClosed(new Set(groups))}>全部收起</button></div></div>
    {catalogError&&<p role="alert" className="lab-alert lab-alert-error">{catalogError}。当前仅展示本地配置，点击刷新可重试。</p>}
    {!bootstrap.config.configured&&<p className="lab-alert">尚未配置 API，完整目录暂不可读取。</p>}
    <div className="lab-provider-list">{groups.map(provider=>{const items=filtered.filter(id=>modelProvider(id)===provider);if(!items.length)return null;return <details key={provider} open={!closed.has(provider)}><summary onClick={e=>{e.preventDefault();setClosed(current=>{const next=new Set(current);if(next.has(provider))next.delete(provider);else next.add(provider);return next;});}}>{provider}<span>{items.length} 个模型</span></summary><ul>{items.map(id=><li key={id}><div><strong>{id}</strong><small>{catalog.includes(id)?'服务目录':'本地配置 · 未在目录确认'}{id===bootstrap.config.model?' · 默认模型':''}</small></div><button disabled={busy||(!models.includes(id)&&models.length>=40)} aria-pressed={models.includes(id)} aria-label={`${models.includes(id)?'移出':'加入'}常用：${id}`} onClick={()=>toggle(id)}>{models.includes(id)?'已设为常用':'加入常用'}</button></li>)}</ul></details>;})}</div>
    {!filtered.length&&!loading&&<Empty title="没有匹配模型">请调整搜索条件。</Empty>}
    <p className="lab-muted">完整目录均可在创建测试运行时选择；常用模型最多保存 40 个。厂商按模型名称识别，无法确认的别名单独列出。</p>
    <details><summary>手动添加模型 ID</summary><div className="lab-run-heading"><input aria-label="手动模型 ID" value={custom} onChange={e=>setCustom(e.target.value)} placeholder="输入服务支持的模型 ID"/><button disabled={busy||!custom.trim()||models.length>=40} onClick={()=>{setModels([...new Set([...models,custom.trim()])]);setCustom('');setNotice('');}}>加入常用</button></div></details>
    {error&&<p role="alert" className="lab-alert lab-alert-error">{error}</p>}{notice&&<p role="status" className="lab-alert lab-alert-success">{notice}</p>}
    <div className="lab-actions"><button className="lab-primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const state=await client.saveModels(revision,models);onSave(state);setRevision(state.revision);setNotice('常用模型已保存。');}catch(e){setError(message(e));}finally{setBusy(false);}}}>保存常用模型</button></div>
  </section>;
}

export function RunSetup({bootstrap,caseIds,preferredActorId,lockActor=false,onSubmit,onClose}:{bootstrap:LabBootstrap;caseIds:string[];preferredActorId?:string;lockActor?:boolean;onSubmit:(selection:LabRunSelection)=>Promise<void>;onClose:()=>void}){
  const cases=caseIds.map(id=>bootstrap.state.cases.find(c=>c.id===id)!);
  const teamIds=[...new Set(cases.map(c=>c.teamId))];const team=teamIds.length===1?bootstrap.state.teams.find(t=>t.id===teamIds[0]):undefined;
  const [models,setModels]=useState<string[]>([bootstrap.state.models?.[0]||bootstrap.config.model]);
  const [customModel,setCustomModel]=useState('');
  const [actor,setActor]=useState(lockActor?'':preferredActorId||(cases.length===1?cases[0].actorId:''));
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const selectedActor=team?.members.find(m=>m.id===actor);
  const unavailable=actor&&team&&cases.some(c=>c.steps.some(s=>s.taskId&&!team.tasks.some(t=>t.id===s.taskId&&(t.visibility==='team'||t.ownerId===actor||t.participantIds.includes(actor)))));
  return <form onSubmit={e=>{e.preventDefault();setBusy(true);setError('');void onSubmit({models,...(actor?{actorId:actor}:{})}).catch(e=>{setError(message(e));setBusy(false);});}}><div className="lab-dialog-body"><p>本次运行 {cases.length} 个用例、{cases.reduce((n,c)=>n+c.steps.length,0)} 个步骤。</p>{error&&<p role="alert" className="lab-alert lab-alert-error">{error}</p>}<fieldset className="lab-model-picker"><legend>选择测试模型（最多 5 个）</legend>{[...new Set([bootstrap.config.model,...(bootstrap.state.models??[]),...models])].map(id=><label className="lab-check" key={id}><input type="checkbox" checked={models.includes(id)} disabled={busy||(!models.includes(id)&&models.length>=5)} onChange={e=>setModels(e.target.checked?[...models,id]:models.filter(m=>m!==id))}/>{id}</label>)}<div className="lab-actions"><input aria-label="其他模型 ID" placeholder="输入其他模型 ID" value={customModel} onChange={e=>setCustomModel(e.target.value)}/><button type="button" disabled={busy||models.length>=5||!customModel.trim()||!/^[a-zA-Z0-9_.:/-]+$/.test(customModel.trim())} onClick={()=>{setModels([...new Set([...models,customModel.trim()])]);setCustomModel('');}}>添加</button></div></fieldset><p role="status">{cases.length} 个用例 × {models.length} 个模型 = {cases.length*models.length} 次运行，共 {cases.reduce((n,c)=>n+c.steps.length,0)*models.length} 次计划调用。同批固定输入与 Skill 版本，逐个执行并保留首次结果。</p>{lockActor?<p className="lab-muted">流程使用各场景保存的人员，依次验证不同角色。</p>:team?<Field label="本次执行人员"><select value={actor} onChange={e=>setActor(e.target.value)}><option value="">沿用各用例保存的人员</option>{team.members.map(m=><option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}</select></Field>:<p className="lab-muted">跨团队批次使用各用例保存的执行人员。</p>}{selectedActor&&<p className="lab-muted">责任范围：{selectedActor.responsibilities.join('；')}</p>}{unavailable&&<p role="alert" className="lab-alert lab-alert-error">所选人员无权查看部分目标任务，请切换人员或调整用例。</p>}<div className="lab-run-preview">{cases.map(c=><section key={c.id}><strong>{c.name}</strong><small>执行人员：{bootstrap.state.teams.find(t=>t.id===c.teamId)?.members.find(m=>m.id===(actor||c.actorId))?.name||"成员不存在"}</small>{c.steps.map((s,i)=>{const versionId=s.skillVersionId===null?null:s.skillVersionId||bootstrap.state.skillDefaults?.[s.skillId];return <p key={s.id}>{i+1}. {bootstrap.skills.find(v=>v.id===s.skillId)?.title} · {bootstrap.state.skillVersions?.find(v=>v.id===versionId)?.label??'工作区版本'}</p>;})}</section>)}</div><p className="lab-muted">确认后调用模型服务并产生相应 API 用量；本次人员选择不修改原用例，报告保留运行配置和上下文快照。</p></div><footer className="lab-dialog-footer"><button type="button" disabled={busy} onClick={onClose}>取消</button><button type="submit" className="lab-primary" disabled={busy||!!unavailable||!models.length}>{busy?'正在提交…':'开始运行'}</button></footer></form>;
}
