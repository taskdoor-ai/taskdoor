import Ajv2020 from 'ajv/dist/2020.js';
import type {LabCase,LabEvidence,LabStep,LabTask,LabTeam} from '../../src/test-lab/types.ts';
import {buildView} from '../../src/test-lab/visibility.ts';

type CoverageScope='current_task'|'criteria'|'existing_children'|'discussions'|'files'|'responsibilities';
type ReadState='read'|'partial'|'unavailable';
type Coverage={scope:CoverageScope;status:'complete'|'partial'|'unavailable';reason:string};
type TaskSnapshot={id:string;sourceId:string;version:number;criteriaVersion:number|null;title:string;goal:string;acceptanceCriteria:string[];status:string;ownerMemberId:string|null;participants:string[];dueDate:string|null;depth:number|null};
type Source={id:string;kind:'discussion'|'file'|'activity';subjectId:string;version:number;title:string;content:string;readState:ReadState;readReason?:string;authorMemberId:string;createdAt:string;replyToId?:string;replyToSourceId?:string;supersedesId?:string;supersedesSourceId?:string;relatedSourceIds?:string[];attachment?:{name:string;mimeType:string;size:number}};
export type SubtaskInput={requestId:string;userRequest:string;currentDate:string;timezone:string;locale:'zh-CN';currentMemberId:string|null;currentTask:TaskSnapshot;existingChildren:TaskSnapshot[];members:{id:string;name:string;responsibilities:string[];responsibilityVersion:number|null;responsibilitySourceId:string}[];sources:Source[];coverage:Coverage[];maxTaskDepth:number|null;previousPlan?:unknown};

const sourceId=(kind:'task'|'responsibility'|'evidence',id:string)=>`${kind}:${id}`;
const scopes:CoverageScope[]=['current_task','criteria','existing_children','discussions','files','responsibilities'];
const rank={complete:0,partial:1,unavailable:2};
const isFile=(e:LabEvidence)=>e.kind==='文件'||e.kind==='交付';

// Count ancestors in the private caller snapshot, but never inject their fields.
function taskDepth(team:LabTeam,task:LabTask):number|null{
  const tasks=new Map(team.tasks.map(t=>[t.id,t])),seen=new Set<string>();let current:LabTask|undefined=task,depth=0;
  while(current){if(seen.has(current.id))return null;seen.add(current.id);depth++;if(!current.parentId)return depth;current=tasks.get(current.parentId);}
  return null;
}
function taskSnapshot(task:LabTask,team:LabTeam):TaskSnapshot{
  return {id:task.id,sourceId:sourceId('task',task.id),version:task.version,criteriaVersion:task.criteria?.version??null,title:task.title,goal:task.goal,acceptanceCriteria:task.criteria?task.criteria.items.map(item=>item.text):[...task.acceptanceCriteria],status:task.status,ownerMemberId:task.ownerId,participants:[...task.participantIds],dueDate:task.dueAt,depth:taskDepth(team,team.tasks.find(original=>original.id===task.id)??task)};
}

// Only the actor's authorized current task and direct children enter the model
// context. Binary attachments are metadata, never body text or data URLs.
export function buildSubtaskInput(team:LabTeam,c:LabCase,step:LabStep,requestId:string,previousPlan?:unknown):SubtaskInput{
  const view=buildView(team,c.actorId),current=view.team.tasks.find(task=>task.id===step.taskId);
  if(!current)throw Error('当前人员无权查看用例目标任务，或目标任务未指定');
  const children=view.team.tasks.filter(task=>task.parentId===current.id),taskIds=new Set([current.id,...children.map(task=>task.id)]);
  const evidence=c.contextMode==='team_tasks'?[]:view.team.evidence.filter(record=>taskIds.has(record.taskId));
  const evidenceIds=new Set(evidence.map(record=>record.id));
  const sources:Source[]=evidence.map(record=>{
    const empty=!record.content.trim();
    const textAttachment=record.attachment&&/^(?:text\/|application\/(?:json|xml|javascript)(?:$|;))/i.test(record.attachment.mimeType);
    const metadataOnly=!!record.attachment&&!(textAttachment&&record.readState==='read'&&!empty);
    const readState:ReadState=record.readState==='unavailable'||metadataOnly||(empty&&record.readState!=='read')?'unavailable':record.readState??'read';
    const readReason=record.readReason?.trim()||(readState==='unavailable'?(record.attachment?'仅取得附件元数据；二进制附件或未经确认的文字描述不能代替正文':'未提供可读取正文'):readState==='partial'?'仅提供部分正文，相关内容尚未读取完整':isFile(record)?record.attachment?'调用方明确标记文本附件正文已读取':'本次授权快照已提供该记录正文，不以附件名称或数量推断正文':undefined);
    return {id:sourceId('evidence',record.id),kind:isFile(record)?'file':record.kind==='活动'?'activity':'discussion',subjectId:record.taskId,version:record.version,title:record.title,content:readState==='unavailable'?'':record.content,readState,...(readReason?{readReason}:{}),authorMemberId:record.authorId,createdAt:record.createdAt,
      ...(record.replyToId&&evidenceIds.has(record.replyToId)?{replyToId:record.replyToId,replyToSourceId:sourceId('evidence',record.replyToId)}:{}),
      ...(record.supersedesId&&evidenceIds.has(record.supersedesId)?{supersedesId:record.supersedesId,supersedesSourceId:sourceId('evidence',record.supersedesId)}:{}),
      ...(record.relatedEvidenceIds?{relatedSourceIds:record.relatedEvidenceIds.filter(id=>evidenceIds.has(id)).map(id=>sourceId('evidence',id))}:{}),
      ...(record.attachment?{attachment:{name:record.attachment.name,mimeType:record.attachment.mimeType,size:record.attachment.size}}:{})};
  });
  const members=view.team.members.map(member=>({id:member.id,name:member.name,responsibilities:[...member.responsibilities],responsibilityVersion:member.responsibilityVersion??null,responsibilitySourceId:sourceId('responsibility',member.id)}));
  const coverage:Coverage[]=scopes.map(scope=>({scope,status:'complete',reason:'当前授权快照中与本任务及可见直属子任务相关的材料已完整提供'}));
  const downgrade=(scope:CoverageScope,status:Coverage['status'],reason:string)=>{
    const target=coverage.find(item=>item.scope===scope)!;
    if(rank[status]>rank[target.status])target.status=status;
    if(status!=='complete')target.reason=target.reason==='当前授权快照中与本任务及可见直属子任务相关的材料已完整提供'?reason:`${target.reason}；${reason}`;
  };
  for(const declared of c.subtaskContext?.coverage??[])downgrade(declared.scope,declared.status,declared.reason);
  for(const scope of ['discussions','files'] as const){
    if(c.contextMode==='team_tasks')downgrade(scope,'unavailable','本例仅注入任务，未读取相关讨论及文件正文');
    const records=sources.filter(source=>scope==='files'?source.kind==='file':source.kind==='discussion');
    if(records.some(record=>record.readState!=='read'))downgrade(scope,'partial',records.filter(record=>record.readState!=='read').map(record=>`${record.id}：${record.readReason}`).join('；'));
  }
  if(members.some(member=>!member.responsibilities.some(text=>text.trim())))downgrade('responsibilities','partial','部分有效成员尚无已保存职责，不能据角色或目录顺序推定分工');
  // A reply/supersession may have lost its source to ACL or task-scope filtering.
  // Keep the gap, but never reveal the inaccessible source identity or content.
  const originals=new Map(team.evidence.map(record=>[record.id,record]));
  for(const record of evidence){const original=originals.get(record.id)!;if((original.replyToId&&!evidenceIds.has(original.replyToId))||(original.supersedesId&&!evidenceIds.has(original.supersedesId)))downgrade(isFile(record)?'files':'discussions','partial','部分直接原消息或被替代正文未在本次授权相关范围内取得');}
  const time=new Date(step.evaluatedAt??Date.now());
  if(Number.isNaN(time.getTime()))throw Error('评测时间无效');
  const currentTask=taskSnapshot(current,team);
  if(currentTask.depth===null)downgrade('current_task','partial','无法从已取得父链核实当前绝对层级');
  return {requestId,userRequest:step.prompt,currentDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(time),timezone:'Asia/Shanghai',locale:'zh-CN',currentMemberId:members.some(member=>member.id===c.actorId)?c.actorId:null,currentTask,existingChildren:children.map(task=>taskSnapshot(task,team)),members,sources,coverage,maxTaskDepth:team.maxTaskDepth??null,...(previousPlan!==undefined?{previousPlan:structuredClone(previousPlan)}:{})};
}

const refs=(input:SubtaskInput)=>[input.currentTask.sourceId,...input.existingChildren.map(task=>task.sourceId),...input.members.map(member=>member.responsibilitySourceId),...input.sources.map(source=>source.id)];
export function buildSubtaskResponseSchema(schema:object,input:SubtaskInput):Record<string,any>{
  const bound:Record<string,any>=structuredClone(schema);delete bound.$schema;delete bound.$id;
  bound.properties.requestId={...bound.properties.requestId,const:input.requestId};
  bound.properties.parentTaskId={...bound.properties.parentTaskId,const:input.currentTask.id};
  const properties=bound.$defs.suggestion.properties,memberIds=input.members.map(member=>member.id);
  properties.ownerMemberId=memberIds.length?{anyOf:[{type:'string',enum:memberIds},{type:'null'}]}:{type:'null'};
  if(memberIds.length)properties.participants.items.properties.memberId={type:'string',enum:memberIds};else properties.participants.maxItems=0;
  properties.sourceRefs.items={type:'string',enum:refs(input)};
  const childIds=input.existingChildren.map(child=>child.id);
  if(childIds.length)bound.properties.coveredByExisting.items.properties.taskId={type:'string',enum:childIds};else bound.properties.coveredByExisting.maxItems=0;
  if(input.maxTaskDepth!==null&&input.currentTask.depth!==null&&input.currentTask.depth>=input.maxTaskDepth)bound.properties.suggestions.maxItems=0;
  return bound;
}

const validDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(`${date}T00:00:00Z`))&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date;
const normalized=(value:string)=>value.trim().replace(/\s+/g,' ');
// Deliberately exact: similar names are not proof of the same delivery.
const deliverySignature=(task:{title:string;goal:string;acceptanceCriteria:string[]})=>JSON.stringify([normalized(task.title),normalized(task.goal),task.acceptanceCriteria.map(normalized)]);
const scopeSignature=(task:{goal:string;acceptanceCriteria:string[]})=>JSON.stringify([normalized(task.goal),task.acceptanceCriteria.map(normalized)]);

export function validateSubtaskSuggestions(schema:object,output:unknown,input:SubtaskInput):string[]{
  const validate=new Ajv2020({allErrors:true,strict:false}).compile(schema);
  if(!validate(output))return [...new Set((validate.errors??[]).map(error=>`${error.instancePath||'/'} ${error.keyword==='additionalProperties'?`不允许字段「${error.params.additionalProperty}」`:error.message}`))];
  const plan=output as any,errors:string[]=[];
  if(plan.requestId!==input.requestId)errors.push('requestId 必须保留当前请求标识');
  if(plan.parentTaskId!==input.currentTask.id)errors.push('parentTaskId 必须是当前任务');
  if(plan.status==='ready'&&(!plan.suggestions.length||plan.questions.length))errors.push('ready 必须包含建议且没有关键问题');
  if(plan.status==='partial'&&(!plan.contextGaps.length||!input.coverage.some(item=>item.status!=='complete')))errors.push('partial 必须说明真实读取缺口');
  if(plan.status==='needs_clarification'&&!plan.questions.length)errors.push('needs_clarification 必须有业务问题');
  if(plan.status==='no_split_needed'&&(plan.suggestions.length||plan.questions.length))errors.push('no_split_needed 不能生成候选或待答问题');
  const criticalGaps=input.coverage.filter(item=>item.scope!=='responsibilities'&&item.status!=='complete');
  if(criticalGaps.length&&(plan.status==='ready'||plan.status==='no_split_needed'))errors.push('必要范围未完整读取，不能声称可完整审阅或无需拆解；应 partial 或 needs_clarification');
  if(criticalGaps.length&&!plan.contextGaps.length)errors.push('必要读取缺口必须在 contextGaps 说明');
  if(plan.questions.length&&plan.status!=='needs_clarification')errors.push('存在待答关键问题时必须 needs_clarification');
  if(input.maxTaskDepth!==null&&input.currentTask.depth!==null&&input.currentTask.depth>=input.maxTaskDepth&&plan.suggestions.length)errors.push('当前层级已达到团队配额，不能再建议子任务');
  const memberMap=new Map(input.members.map(member=>[member.id,member])),allowedRefs=new Set(refs(input)),childMap=new Map(input.existingChildren.map(child=>[child.id,child])),ids=new Set<string>(),deliveries=new Map<string,string>();
  const parentSignature=scopeSignature(input.currentTask),childSignatures=new Map(input.existingChildren.map(child=>[deliverySignature(child),child.id]));
  for(const suggestion of plan.suggestions){
    if(!suggestion.clientId.trim()||ids.has(suggestion.clientId))errors.push(`候选临时 ID 为空或重复：${suggestion.clientId}`);ids.add(suggestion.clientId);
    if(!suggestion.title.trim()||!suggestion.goal.trim()||suggestion.acceptanceCriteria.some((text:string)=>!text.trim()))errors.push(`${suggestion.clientId} 名称、目标和标准不能为空白`);
    if(suggestion.ownerMemberId!==null){const owner=memberMap.get(suggestion.ownerMemberId);if(!owner)errors.push(`${suggestion.clientId} 负责人不在有效成员目录`);else if(!owner.responsibilities.some(text=>text.trim()))errors.push(`${suggestion.clientId} 缺少已保存职责，应保持未分配`);}
    const participants=new Set<string>();for(const participant of suggestion.participants){if(!memberMap.has(participant.memberId))errors.push(`${suggestion.clientId} 参与者不在有效成员目录`);if(participants.has(participant.memberId)||participant.memberId===suggestion.ownerMemberId)errors.push(`${suggestion.clientId} 参与者重复或包含负责人`);participants.add(participant.memberId);if(!participant.contribution.trim())errors.push(`${suggestion.clientId} 参与贡献不能为空白`);}
    for(const ref of suggestion.sourceRefs)if(!allowedRefs.has(ref))errors.push(`${suggestion.clientId} 引用了输入范围外的来源：${ref}`);
    if(!suggestion.sourceRefs.includes(input.currentTask.sourceId))errors.push(`${suggestion.clientId} 至少应引用当前任务来源`);
    if(suggestion.dueDate){
      if(!validDate(suggestion.dueDate))errors.push(`${suggestion.clientId} 截止日期无效`);
      else if((suggestion.dueDate<input.currentDate||(input.currentTask.dueDate&&validDate(input.currentTask.dueDate)&&suggestion.dueDate>input.currentTask.dueDate))&&(plan.status!=='needs_clarification'||!plan.questions.length))errors.push(`${suggestion.clientId} 日期已过期或超过父任务硬截止，必须 needs_clarification 并提出业务问题`);
    }
    const signature=deliverySignature(suggestion);
    if(scopeSignature(suggestion)===parentSignature)errors.push(`${suggestion.clientId} 只是完整复制父任务，不构成独立拆解`);
    if(deliveries.has(signature))errors.push(`${suggestion.clientId} 与 ${deliveries.get(signature)} 是完全相同的交付`);else deliveries.set(signature,suggestion.clientId);
    if(childSignatures.has(signature))errors.push(`${suggestion.clientId} 重复了已有直属子任务 ${childSignatures.get(signature)} 的同一交付`);
  }
  const covered=new Set<string>();for(const record of plan.coveredByExisting){if(!childMap.has(record.taskId))errors.push(`coveredByExisting 只能引用当前真实直属子任务：${record.taskId}`);if(covered.has(record.taskId))errors.push(`coveredByExisting 重复引用：${record.taskId}`);covered.add(record.taskId);if(!record.reason.trim())errors.push('已有覆盖说明不能为空白');}
  for(const question of plan.questions){if(!question.question.trim()||question.choices.some((choice:string)=>!choice.trim())||new Set(question.choices.map(normalized)).size!==question.choices.length||!question.choices.includes(question.recommended))errors.push('关键问题须有 2–4 个互异有效选项，推荐项逐字来自选项');}
  return errors;
}
