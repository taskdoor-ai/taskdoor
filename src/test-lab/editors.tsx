import { VerificationEditor } from "./verification";
import React, { useState, type ReactNode } from "react";
import { lines, newStep, newTask, uid } from "./model";
import { MarkdownEditor } from "./markdown";
import { evidenceDownload, isMarkdownEvidence, updateEvidenceContent } from "./markdown-files";
import { selectableSkillIds, taskStatuses, type Json, type LabAssertion, type LabCase, type LabEvidence, type LabEvent, type LabMember, type LabState, type LabSkill, type LabTask, type LabTeam } from "./types";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="lab-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
function Text({ label, value, onChange, multiline = false, required = false, hint }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; required?: boolean; hint?: string }) {
  return <Field label={label} hint={hint}>{multiline ? <textarea value={value} required={required} rows={3} onChange={(event) => onChange(event.target.value)} /> : <input value={value} required={required} onChange={(event) => onChange(event.target.value)} />}</Field>;
}
function Lines({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  const [text, setText] = useState(value.join("\n"));
  return <Text label={label} value={text} multiline hint="每行一项" onChange={(next) => { setText(next); onChange(lines(next)); }} />;
}
export function MemberResponsibilityFields({ member, onChange }: { member: LabMember; onChange: (responsibilities: string[]) => void }) {
  return <><p><strong>{member.name}</strong> · {member.role || "未设角色"}</p><Lines label="责任范围" value={member.responsibilities} onChange={onChange} /><p className="lab-muted">可添加、修改或删除责任，每行一项。保存后用于后续测试，不会修改历史运行快照或自动发起 AI 分析。</p></>;
}
function Choices({ label, items, value, onChange }: { label: string; items: { id: string; name: string }[]; value: string[]; onChange: (value: string[]) => void }) {
  return <fieldset className="lab-choices"><legend>{label}</legend>{items.length === 0 ? <small>暂无可选项</small> : items.map((item) => <label key={item.id}><input type="checkbox" checked={value.includes(item.id)} onChange={(event) => onChange(event.target.checked ? [...value, item.id] : value.filter((id) => id !== item.id))} />{item.name}</label>)}</fieldset>;
}
function JsonField({ label, value, onChange, hint }: { label: string; value: unknown; onChange: (value: unknown) => void; hint?: string }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState("");
  return <Field label={label} hint={hint}><textarea className="lab-code" rows={5} value={text} onChange={(event) => {
    setText(event.target.value);
    try { const parsed: unknown = JSON.parse(event.target.value); onChange(parsed); setError(""); event.target.setCustomValidity(""); }
    catch { setError("请输入有效 JSON；错误内容不会提交。"); event.target.setCustomValidity("请输入有效 JSON"); }
  }} />{error && <small role="alert" className="lab-error-text">{error}</small>}</Field>;
}

const resourceNames:Record<LabEvidence["kind"],string>={文件:"新文件",讨论:"任务讨论",交付:"交付记录",确认:"确认记录",活动:"任务活动"};
function newResource(taskId:string,authorId:string,kind:LabEvidence["kind"]):LabEvidence{return {id:uid(),taskId,authorId,kind,title:resourceNames[kind],content:"",createdAt:new Date().toISOString(),version:1,visibleToIds:[]};}

export function TaskFields({team,task,onTaskChange,onEvidenceChange,showResources=false,requireCreator=false}:{team:LabTeam;task:LabTask;onTaskChange:(patch:Partial<LabTask>)=>void;onEvidenceChange?:(items:LabEvidence[])=>void;showResources?:boolean;requireCreator?:boolean}){
  const taskEvidence=team.evidence.filter((item)=>item.taskId===task.id);
  const changeEvidence=(id:string,patch:Partial<LabEvidence>)=>onEvidenceChange?.(team.evidence.map((item)=>{if(item.id!==id)return item;const next={...item,...patch,version:item.version+1};return typeof patch.content==='string'?updateEvidenceContent(next,patch.content):next;}));
  const addEvidence=(kind:LabEvidence["kind"])=>{const authorId=task.ownerId||task.createdById||team.members[0]?.id;if(authorId)onEvidenceChange?.([...team.evidence,newResource(task.id,authorId,kind)]);};
  const resources=(kinds:LabEvidence["kind"][])=>taskEvidence.filter((item)=>kinds.includes(item.kind));
  const ResourceList=({title,kinds}:{title:string;kinds:LabEvidence["kind"][]})=><section className="lab-task-resource"><header><h4>{title} <small>{resources(kinds).length}</small></h4><div>{kinds.map((kind)=><button type="button" key={kind} disabled={!team.members.length} onClick={()=>addEvidence(kind)}>＋ {kind}</button>)}</div></header>
    {resources(kinds).map((item)=><fieldset key={item.id} className="lab-resource-card"><legend>{item.kind}</legend><div className="lab-form-grid"><Text label={item.kind==="文件"?"文件名称":"记录标题"} value={item.title} required onChange={(title)=>changeEvidence(item.id,{title})}/><Field label={item.kind==="讨论"?"发言人":"记录人"}><select value={item.authorId} onChange={(event)=>changeEvidence(item.id,{authorId:event.target.value})}>{team.members.map((member)=><option key={member.id} value={member.id}>{member.name}</option>)}</select></Field><Field label="记录时间"><input type="datetime-local" value={item.createdAt?localDateTime(item.createdAt):""} onChange={(event)=>changeEvidence(item.id,{createdAt:event.target.value?new Date(event.target.value).toISOString():""})}/></Field></div><>{item.kind==="文件"&&<FileAttachmentField item={item} onChange={patch=>changeEvidence(item.id,patch)}/>}</>{isMarkdownEvidence(item)?<MarkdownEditor label="文件正文" value={item.content} onChange={content=>changeEvidence(item.id,{content})}/>:<Text label={item.kind==="文件"?"文件内容或摘要":item.kind==="讨论"?"讨论内容":"记录内容"} multiline value={item.content} onChange={(content)=>changeEvidence(item.id,{content})}/>}<Choices label="限定可见成员（不选则沿用任务范围）" items={team.members} value={item.visibleToIds} onChange={(visibleToIds)=>changeEvidence(item.id,{visibleToIds})}/><button type="button" className="lab-danger-link" onClick={()=>onEvidenceChange?.(team.evidence.filter((entry)=>entry.id!==item.id))}>移除此{item.kind}</button></fieldset>)}
    {!resources(kinds).length&&<p className="lab-muted">暂无{title}。</p>}
  </section>;
  return <>
    <Text label="任务标题" required value={task.title} onChange={(title)=>onTaskChange({title})}/><Text label="任务目的" multiline value={task.goal} onChange={(goal)=>onTaskChange({goal})}/>
    <div className="lab-form-grid"><Field label="任务状态"><select value={task.status} onChange={(event)=>onTaskChange({status:event.target.value as LabTask["status"]})}>{taskStatuses.map((status)=><option key={status}>{status}</option>)}</select></Field>
      <Field label="创建人" hint="表示以哪个团队成员身份创建；创建后仍可调整。"><select required={requireCreator} value={task.createdById||""} onChange={(event)=>onTaskChange({createdById:event.target.value||null})}><option value="">{requireCreator?"请选择创建人":"历史数据未记录"}</option>{team.members.map((member)=><option key={member.id} value={member.id}>{member.name}</option>)}</select></Field>
      <Field label="负责人"><select value={task.ownerId||""} onChange={(event)=>onTaskChange({ownerId:event.target.value||null,participantIds:task.participantIds.filter(id=>id!==event.target.value)})}><option value="">未指派</option>{team.members.map((member)=><option key={member.id} value={member.id}>{member.name}</option>)}</select></Field>
      <Field label="父任务"><select value={task.parentId||""} onChange={(event)=>onTaskChange({parentId:event.target.value||null})}><option value="">主任务（无父任务）</option>{team.tasks.filter((item)=>item.id!==task.id).map((item)=><option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
      <Field label="预计工时（分钟）"><input type="number" min="0" step="1" value={task.estimatedMinutes??""} placeholder="尚未估算" onChange={(event)=>onTaskChange({estimatedMinutes:event.target.value===""?null:Number(event.target.value)})}/></Field>
      <Field label="截止时间"><input type="datetime-local" value={task.dueAt?localDateTime(task.dueAt):""} onChange={(event)=>onTaskChange({dueAt:event.target.value?new Date(event.target.value).toISOString():null})}/></Field>
      <Field label="可见范围" hint="限定任务仅负责人、参与人可见；最终由服务器校验。"><select value={task.visibility} onChange={(event)=>onTaskChange({visibility:event.target.value as LabTask["visibility"]})}><option value="team">团队公开</option><option value="restricted">限定人员</option></select></Field></div>
    <Choices label="参与人" items={team.members.filter(m=>m.id!==task.ownerId)} value={task.participantIds} onChange={(participantIds)=>onTaskChange({participantIds})}/><Choices label="前置任务" items={team.tasks.filter((item)=>item.id!==task.id).map((item)=>({id:item.id,name:item.title}))} value={task.dependsOnTaskIds} onChange={(dependsOnTaskIds)=>onTaskChange({dependsOnTaskIds})}/><Lines label="完成标准" value={task.acceptanceCriteria} onChange={(acceptanceCriteria)=>onTaskChange({acceptanceCriteria})}/><Lines label="执行建议" value={task.executionTips} onChange={(executionTips)=>onTaskChange({executionTips})}/><Lines label="标签" value={task.tags} onChange={(tags)=>onTaskChange({tags})}/>
    {showResources&&<div className="lab-task-resources">{ResourceList({title:"任务文件",kinds:["文件"]})}{ResourceList({title:"任务讨论",kinds:["讨论"]})}{ResourceList({title:"交付、确认与活动",kinds:["交付","确认","活动"]})}<p className="lab-muted">附件保存在测试工作台。文本文件可自动读取正文；PDF、表格等文件请补充供模型分析的内容摘要。</p></div>}
  </>;
}

export function TaskCreateFields({team,value,onChange}:{team:LabTeam;value:LabTask;onChange:(value:LabTask)=>void}){
  return <><div className="lab-scope-card"><span>所属团队</span><strong>{team.name}</strong><small>任务、文件和讨论都保存在此团队的隔离测试数据中。</small></div><TaskFields team={team} task={value} onTaskChange={(patch)=>onChange({...value,...patch})} requireCreator/></>;
}

export function TeamEditorFields({ value, onChange }: { value: LabTeam; onChange: (value: LabTeam) => void }) {
  const set=(patch:Partial<LabTeam>)=>onChange({...value,...patch});
  const changeTask=(id:string,patch:Partial<LabTask>)=>set({tasks:value.tasks.map((task)=>task.id===id?{...task,...patch,version:task.version+1}:task)});
  return <><div className="lab-form-grid"><Text label="团队名称" required value={value.name} onChange={(name)=>set({name})}/><Text label="行业" value={value.industry} onChange={(industry)=>set({industry})}/></div><Text label="团队说明" value={value.description} multiline onChange={(description)=>set({description})}/>
    <section className="lab-editor-section"><header><h3>成员与责任</h3><button type="button" onClick={()=>set({members:[...value.members,{id:uid(),name:"新成员",role:"",responsibilities:[],version:1}]})}>＋ 添加成员</button></header>{value.members.map((member,index)=><fieldset className="lab-form-card" key={member.id}><legend>成员 {index+1}</legend><div className="lab-form-grid"><Text label="成员姓名" required value={member.name} onChange={(name)=>set({members:value.members.map((item)=>item.id===member.id?{...item,name,version:item.version+1}:item)})}/><Text label="角色" value={member.role} onChange={(role)=>set({members:value.members.map((item)=>item.id===member.id?{...item,role,version:item.version+1}:item)})}/></div><Lines label="责任范围" value={member.responsibilities} onChange={(responsibilities)=>set({members:value.members.map((item)=>item.id===member.id?{...item,responsibilities,version:item.version+1}:item)})}/><button className="lab-danger-link" type="button" onClick={()=>set({members:value.members.filter((item)=>item.id!==member.id)})}>移除此成员</button></fieldset>)}{!value.members.length&&<p className="lab-muted">先添加团队成员，再创建任务和用例人员视角。</p>}</section>
    <section className="lab-editor-section"><header><h3>主任务与子任务</h3><button type="button" disabled={!value.members.length} onClick={()=>set({tasks:[...value.tasks,newTask(value.members[0]?.id||null)]})}>＋ 添加任务</button></header>{value.tasks.map((task,index)=><details className="lab-form-card" key={task.id} open={value.tasks.length<3||undefined}><summary>{index+1}. {task.title||"未命名任务"} <small>{task.status}</small></summary><TaskFields team={value} task={task} onTaskChange={(patch)=>changeTask(task.id,patch)} onEvidenceChange={(evidence)=>set({evidence})} showResources/><button type="button" className="lab-danger-link" onClick={()=>set({tasks:value.tasks.filter((item)=>item.id!==task.id),evidence:value.evidence.filter((item)=>item.taskId!==task.id)})}>移除此任务及其资料</button></details>)}{!value.tasks.length&&<p className="lab-muted">暂无任务。任务创建后，其文件、讨论和交付记录都在任务卡片内管理。</p>}<small className="lab-muted">删除仍被其他任务引用的成员或任务会被服务器拦截；请先清理关联关系。</small></section>
  </>;
}

function localDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

export function CaseEditorFields({ value, categories = [], teams, skills, versions = [], defaults = {}, onChange }: { value: LabCase; categories?:string[]; teams: LabTeam[]; skills: LabSkill[]; versions?:LabState["skillVersions"]; defaults?:LabState["skillDefaults"]; onChange: (value: LabCase) => void }) {
  const set = (patch: Partial<LabCase>) => onChange({ ...value, ...patch });
  const team = teams.find((item) => item.id === value.teamId);
  const skillOptions = skills.length ? skills : selectableSkillIds.map((id) => ({ id, title: id, outputVersion: "" }));
  return <>
    <div className="lab-form-grid"><Text label="用例名称" value={value.name} required onChange={(name) => set({ name })} /><Field label="测试分类" hint="选择已有分类，或输入新分类名称；分类说明可在管理分类中维护。"><input list="lab-case-categories" value={value.category} maxLength={80} onChange={e=>set({category:e.target.value})}/><datalist id="lab-case-categories">{categories.map(c=><option key={c} value={c}/>)}</datalist></Field>
      <Field label="所属团队"><select required value={value.teamId} onChange={(event) => { const selected = teams.find((item) => item.id === event.target.value); set({ teamId: event.target.value, actorId: selected?.members[0]?.id || "", steps: value.steps.map((step) => ({ ...step, taskId: null, events: [] })) }); }}><option value="">请选择团队</option>{teams.filter((item) => !item.archived || item.id === value.teamId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="执行成员视角"><select required value={value.actorId} onChange={(event) => set({ actorId: event.target.value })}><option value="">请选择成员</option>{team?.members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}</select></Field>
    </div>
    <Text label="测试目的与说明" multiline value={value.description} onChange={(description) => set({ description })} /><VerificationEditor key={value.id} value={value} onChange={onChange} />
    <label className="lab-check"><input type="checkbox" checked={value.enabled} onChange={(event) => set({ enabled: event.target.checked })} />启用此用例</label>
    <section className="lab-editor-section"><header><h3>执行步骤</h3><button type="button" onClick={() => set({ steps: [...value.steps, newStep()] })}>＋ 添加步骤</button></header>
      {value.steps.map((step, index) => { const update = (patch: Partial<typeof step>) => set({ steps: value.steps.map((item) => item.id === step.id ? { ...item, ...patch } : item) }); return <fieldset key={step.id} className="lab-form-card"><legend>步骤 {index + 1}</legend>
        <div className="lab-form-grid"><Field label="测试技能"><select value={step.skillId} onChange={(event) => update({ skillId: event.target.value as typeof step.skillId, skillVersionId: undefined })}>{!skillOptions.some(skill=>skill.id===step.skillId)&&<option value={step.skillId} disabled>历史用例规则（保留原版本）</option>}{skillOptions.map((skill) => <option key={skill.id} value={skill.id}>{skill.title}</option>)}</select></Field>
          <Field label="Skill 版本"><select value={step.skillVersionId===null?"workspace":step.skillVersionId||"default"} onChange={e=>update({skillVersionId:e.target.value==="default"?undefined:e.target.value==="workspace"?null:e.target.value})}><option value="default">跟随默认 · {versions.find(v=>v.id===defaults[step.skillId])?.label||"工作区版本"}</option><option value="workspace">固定使用工作区版本</option>{versions.filter(v=>v.skillId===step.skillId).map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></Field><Field label="目标任务"><select value={step.taskId || ""} onChange={(event) => update({ taskId: event.target.value || null })}><option value="">全部可见任务 / 规划新任务</option>{team?.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></Field></div>
        <Text label="步骤输入" multiline required value={step.prompt} onChange={(prompt) => update({ prompt })} />
        <Field label="判断时间（留空使用运行时间）"><input type="datetime-local" value={step.evaluatedAt?localDateTime(step.evaluatedAt):""} onChange={e=>update({evaluatedAt:e.target.value?new Date(e.target.value).toISOString():undefined})}/><small>固定时间可重复核对期限与优先级；不改变实际运行时间。</small></Field>
        <label className="lab-check"><input type="checkbox" checked={step.usePreviousOutput} disabled={index === 0} onChange={(event) => update({ usePreviousOutput: event.target.checked })} />使用前一步输出</label>
        <details className="lab-advanced"><summary>高级事件 JSON</summary><p>步骤执行前向隔离沙箱应用事件；支持 task_status、responsibility、evidence。更换团队会清空任务引用与事件。</p><JsonField label="事件列表" value={step.events} hint="输入事件对象数组；保存时由服务器验证类型、引用与权限。" onChange={(events) => { if (!Array.isArray(events)) throw new Error("必须是数组"); update({ events: events as LabEvent[] }); }} /></details>
        <div className="lab-actions"><button type="button" disabled={index === 0} onClick={() => { const steps = [...value.steps]; [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]]; steps[0] = { ...steps[0], usePreviousOutput: false }; set({ steps }); }}>上移</button><button type="button" className="lab-danger-link" onClick={() => { const steps = value.steps.filter((item) => item.id !== step.id); if (steps[0]) steps[0] = { ...steps[0], usePreviousOutput: false }; set({ steps, assertions: value.assertions.filter((assertion) => assertion.stepId !== step.id) }); }}>移除步骤及其断言</button></div>
      </fieldset>; })}
    </section>
    <section className="lab-editor-section"><header><h3>自动断言</h3><button type="button" disabled={!value.steps.length} onClick={() => set({ assertions: [...value.assertions, { id: uid(), label: "新断言", stepId: value.steps[0].id, path: "", operator: "exists", expected: null }] })}>＋ 添加断言</button></header>
      {value.assertions.map((assertion) => { const update = (patch: Partial<LabAssertion>) => set({ assertions: value.assertions.map((item) => item.id === assertion.id ? { ...item, ...patch } : item) }); return <fieldset key={assertion.id} className="lab-form-card"><legend>{assertion.label || "自动断言"}</legend><Text label="断言说明" value={assertion.label} required onChange={(label) => update({ label })} /><div className="lab-form-grid">
        <Field label="对应步骤"><select value={assertion.stepId} onChange={(event) => update({ stepId: event.target.value })}>{value.steps.map((step, index) => <option key={step.id} value={step.id}>步骤 {index + 1}</option>)}</select></Field>
        <Field label="判断方式"><select value={assertion.operator} onChange={(event) => update({ operator: event.target.value as LabAssertion["operator"] })}>{Object.entries({ exists: "存在", equals: "等于", contains: "包含", not_contains: "不包含", length: "长度等于", gte: "大于等于", lte: "小于等于" }).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></Field></div>
        <Text label="结果字段路径" value={assertion.path} onChange={(path) => update({ path })} hint="例如 tasks.0.title；留空表示整个输出" />
        {assertion.operator !== "exists" && <JsonField label="期望值 JSON" value={assertion.expected} hint={'字符串需带引号，例如 "已完成"；数字直接填 3。'} onChange={(expected) => update({ expected: expected as Json })} />}
        <button type="button" className="lab-danger-link" onClick={() => set({ assertions: value.assertions.filter((item) => item.id !== assertion.id) })}>移除此断言</button>
      </fieldset>; })}
      {!value.assertions.length && <p className="lab-muted">暂无自动断言。结构检查与人工核对会单独保留。</p>}
    </section>
    <section className="lab-editor-section"><h3>人工核对项</h3><Lines label="人工核对清单" value={value.reviewChecklist} onChange={(reviewChecklist) => set({ reviewChecklist })} /></section>
  </>;
}

export function MemberEditorFields({member,onChange}:{member:LabMember;onChange:(member:LabMember)=>void}){
  return <><div className="lab-form-grid"><Text label="姓名" required value={member.name} onChange={name=>onChange({...member,name})}/><Text label="岗位" value={member.role} onChange={role=>onChange({...member,role})}/></div><Lines label="责任范围" value={member.responsibilities} onChange={responsibilities=>onChange({...member,responsibilities})}/></>;
}
export function TaskEditorFields({value,taskId,onChange}:{value:LabTeam;taskId:string;onChange:(value:LabTeam)=>void}){
  const task=value.tasks.find(t=>t.id===taskId);if(!task)return <p role="alert">任务不存在</p>;
  return <TaskFields team={value} task={task} onTaskChange={patch=>onChange({...value,tasks:value.tasks.map(t=>t.id===taskId?{...t,...patch}:t)})} onEvidenceChange={evidence=>onChange({...value,evidence})} showResources/>;
}

export function MarkdownFileFields({value,evidenceId,onChange,disabled=false}:{value:LabTeam;evidenceId:string;onChange:(value:LabTeam)=>void;disabled?:boolean}){
  const item=value.evidence.find(record=>record.id===evidenceId);
  if(!item||!isMarkdownEvidence(item))return <p role="alert">Markdown 文件不存在，请关闭后刷新。</p>;
  return <><p className="lab-file-context"><strong>{item.title}</strong><small>保存正文后，下载文件同步更新。</small></p><MarkdownEditor label="Markdown 正文" value={item.content} disabled={disabled} onChange={content=>onChange({...value,evidence:value.evidence.map(record=>record.id===item.id?updateEvidenceContent(record,content):record)})}/></>;
}

function FileAttachmentField({item,onChange}:{item:LabEvidence;onChange:(patch:Partial<LabEvidence>)=>void}){
  const [error,setError]=useState('');const [reading,setReading]=useState(false);
  return <Field label="上传文件" hint="单个附件最多 1 MB；文本正文最多 20,000 字符。"><input type="file" disabled={reading} onChange={async e=>{
    const file=e.target.files?.[0];if(!file)return;setError('');
    if(file.size>1000000){setError('文件超过 1 MB，请精简后上传。');e.target.value='';return;}
    setReading(true);try{
      const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('文件读取失败'));reader.readAsDataURL(file);});
      const isText=/\.(md|markdown|mdown|txt|csv|json|yaml|yml|log)$/i.test(file.name)||file.type.startsWith('text/');
      const content=isText?await file.text():item.content;
      if(content.length>20000)throw new Error('文件正文超过 20,000 字符，请拆分文件后上传。');
      onChange({title:file.name,content,attachment:{name:file.name,mimeType:file.type||'application/octet-stream',size:file.size,dataUrl}});
    }catch(error){setError(error instanceof Error?error.message:'文件读取失败');}finally{setReading(false);}
  }}/>{reading&&<small role="status">正在读取文件…</small>}{error&&<small role="alert" className="lab-error-text">{error}</small>}{item.attachment&&<span className="lab-actions"><a href={evidenceDownload(item).dataUrl} download={item.attachment.name}>{item.attachment.name} · {(item.attachment.size/1024).toFixed(1)} KB</a><button type="button" onClick={()=>onChange({attachment:undefined})}>移除附件</button></span>}</Field>;
}
