import Ajv2020, {type ErrorObject} from 'ajv/dist/2020.js';
import type {LabCase, LabTeam, LabStep} from '../../src/test-lab/types.ts';

export type PreviewInput = {
  requestId:string; userRequest:string; currentDate:string; timezone:string; currentMemberId:string;
  members:{id:string;name:string;responsibilities:string[]}[]; previousPlan?:unknown;
};

// The application supplies the directory once. Generating a preview has no tool calls.
export function buildPreviewInput(team:LabTeam, c:LabCase, requestId:string,step:LabStep=c.steps[0],previousPlan?:unknown):PreviewInput {
  const members=team.members.map(m=>({id:m.mcpMemberId??m.id,name:m.name,responsibilities:m.responsibilities}));
  return {requestId,userRequest:step.prompt,currentDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(step.evaluatedAt??Date.now())),timezone:'Asia/Shanghai',currentMemberId:members[team.members.findIndex(m=>m.id===c.actorId)]?.id??c.actorId,members,...(previousPlan!==undefined?{previousPlan}: {})};
}

// Bind only runtime identity constraints. Keep the frozen Skill schema unchanged.
export function buildTaskPreviewResponseSchema(schema:object,input:PreviewInput):Record<string,any>{
  const result:Record<string,any>=structuredClone(schema);
  delete result.$schema;delete result.$id;
  result.properties.requestId={...result.properties.requestId,const:input.requestId};
  const ids=[...new Set(input.members.map(member=>member.id))];
  const task=result.$defs.task.properties;
  task.ownerMemberId=ids.length?{anyOf:[{type:'string',enum:ids},{type:'null'}]}:{type:'null'};
  if(ids.length)task.participants.items.properties.memberId={type:'string',enum:ids};
  else task.participants.maxItems=0;
  return result;
}

export function validateTaskPreview(schema:object, output:unknown, input:PreviewInput):string[] {
  const validate=new Ajv2020({allErrors:true,strict:false,verbose:true}).compile(schema);
  if(!validate(output))return formatSchemaErrors(schema,output,validate.errors??[]);
  const plan=output as any, errors:string[]=[];
  if(plan.requestId!==input.requestId)errors.push('requestId 必须保留当前请求标识');
  if(plan.status==='ready'&&(!plan.tasks.length||plan.questions.length))errors.push('ready 方案必须包含任务且没有待澄清问题');
  if(plan.status==='needs_clarification'&&!plan.questions.length)errors.push('needs_clarification 必须说明待澄清问题');
  const members=new Set(input.members.map(m=>m.id)), nodes=new Map<string,any>();
  const walk=(tasks:any[],depth=0)=>{
    if(depth>20){errors.push('任务层级超过 20 层');return;}
    const deliveries=new Map<string,string>();
    for(const task of tasks){
      if(nodes.has(task.clientId))errors.push(`临时任务 ID 重复：${task.clientId}`);
      nodes.set(task.clientId,task);
      if(!task.title.trim()||!task.goal.trim()||task.acceptanceCriteria.some((c:string)=>!c.trim()))errors.push(`${task.clientId} 名称、目标或完成标准不能为空白`);
      for(const [field,label] of [['acceptanceCriteria','完成标准'],['executionTips','执行建议']] as const){
        if(task[field].some(invalidTextItem))errors.push(`${task.clientId} ${label}必须是有效文本，不能仅含标点、JSON 分隔符或序列化任务`);
      }
      // Compare only leaves in the same branch. Identical labels in different
      // channels, or tasks with distinct criteria/dates/assignees, are valid.
      if(!task.children.length){
        const signature=JSON.stringify([task.title.trim(),task.goal.trim(),task.acceptanceCriteria,task.ownerMemberId,task.participants,task.dueDate,task.executionTips,task.effortEstimate,task.dependsOnClientIds]);
        const previous=deliveries.get(signature);
        if(previous)errors.push(`重复交付：${task.clientId} 与 ${previous} 内容完全相同；按用户要求合并或明确不同交付范围`);
        else deliveries.set(signature,task.clientId);
      }
      if(task.ownerMemberId!==null&&!members.has(task.ownerMemberId))errors.push(`${task.clientId} 负责人不在当前成员目录`);
      const participants=new Set<string>();
      for(const p of task.participants){
        if(!members.has(p.memberId))errors.push(`${task.clientId} 参与者不在当前成员目录`);
        if(participants.has(p.memberId)||p.memberId===task.ownerMemberId)errors.push(`${task.clientId} 参与者重复或包含负责人`);
        if(!p.contribution.trim())errors.push(`${task.clientId} 参与贡献不能为空白`);
        participants.add(p.memberId);
      }
      if(task.dueDate){
        const date=new Date(task.dueDate+'T00:00:00Z');
        if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==task.dueDate)errors.push(`${task.clientId} 截止日期无效`);
      }
      walk(task.children,depth+1);
    }
  };
  walk(plan.tasks);
  if(nodes.size>500)errors.push('方案任务总数超过 500');
  for(const [id,task] of nodes)for(const dep of task.dependsOnClientIds){
    if(dep===id||!nodes.has(dep))errors.push(`${id} 前置任务不存在或指向自身`);
  }
  const visiting=new Set<string>(),done=new Set<string>();
  const visit=(id:string)=>{
    if(visiting.has(id)){errors.push(`任务前置关系循环：${id}`);return;}
    if(done.has(id)||!nodes.has(id))return;
    visiting.add(id);nodes.get(id).dependsOnClientIds.forEach(visit);visiting.delete(id);done.add(id);
  };
  nodes.forEach((_,id)=>visit(id));
  return errors;
}

function invalidTextItem(text:string):boolean{
  if(!/[\p{L}\p{N}]/u.test(text)||/^\s*,\s*"/.test(text))return true;
  // Do not reject normal prose containing code or a small JSON example.
  try{
    const value=JSON.parse(text);
    return !!value&&typeof value==='object'&&!Array.isArray(value)&&'clientId' in value&&'title' in value&&'goal' in value;
  }catch{return false;}
}

function formatSchemaErrors(schema:object,output:unknown,errors:ErrorObject[]):string[]{
  const pointer=(root:any,path:string)=>path.replace(/^#/,'').split('/').slice(1).reduce((value,key)=>value?.[key.replace(/~1/g,'/').replace(/~0/g,'~')],root);
  const matchesType=(value:unknown,type:unknown):boolean=>Array.isArray(type)?type.some(t=>matchesType(value,t)):type==='null'?value===null:type==='array'?Array.isArray(value):type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):type==='integer'?Number.isInteger(value):type===undefined||typeof value===type;
  // Nullable unions report both branches. Show the actual object's field errors.
  const relevant=errors.filter(error=>{
    const branch=error.schemaPath.match(/^(.*\/anyOf)\/(\d+)\//);
    if(!branch)return true;
    const alternatives=(errors.find(e=>e.schemaPath===branch[1]&&e.instancePath===error.instancePath)?.parentSchema as any)?.anyOf??pointer(schema,branch[1]);
    const value=pointer(output,error.instancePath);
    return !alternatives?.some((node:any)=>node.type!==undefined&&matchesType(value,node.type))||matchesType(value,alternatives[Number(branch[2])]?.type);
  });
  return [...new Set(relevant.filter(error=>error.keyword!=='anyOf'||!relevant.some(other=>other!==error&&other.keyword!=='anyOf'&&(other.instancePath===error.instancePath||other.instancePath.startsWith(error.instancePath+'/')))).map(error=>{
    const path=error.instancePath||'/';
    if(error.keyword==='additionalProperties')return `${path} 不允许字段「${error.params.additionalProperty}」`;
    if(error.keyword==='required')return `${path} 缺少字段「${error.params.missingProperty}」`;
    return `${path} ${error.message}`;
  }))];
}
