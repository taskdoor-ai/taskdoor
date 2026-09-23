import type { LabTeam, LabCase, LabStep, LabStepResult } from '../../src/test-lab/types.ts';
import { buildView } from '../../src/test-lab/visibility.ts';
export { buildView } from '../../src/test-lab/visibility.ts';
export function buildModelInput(team:LabTeam,c:LabCase,step:LabStep,runId:string,previous:LabStepResult[]){
  const fresh=step.skillId==='agentdoor-task-planner'&&c.creationContext==='fresh';
  if(fresh)team={...team,tasks:[],evidence:[]};
  if(fresh)step={...step,taskId:null};
  const view=buildView(team,c.actorId);if(step.taskId&&!view.team.tasks.some(t=>t.id===step.taskId))throw new Error('当前人员无权查看用例目标任务');
  const time=step.evaluatedAt?new Date(step.evaluatedAt).toISOString():new Date().toISOString(); const v={...view.team,evidence:view.team.evidence.map(({attachment:_attachment,...record})=>record)};
  const history=v.evidence.filter(e=>e.kind==='活动').map(e=>({id:e.id,taskId:e.taskId,occurredAt:e.createdAt,type:'task_activity',summary:e.content,sourceRefs:e.relatedEvidenceIds??[]}));
  const currentUser=v.members.find(m=>m.id===c.actorId)!;
  const base={requestId:`${runId}:${step.id}`,message:step.prompt,principalId:c.actorId,currentUserId:c.actorId,teamId:team.id,currentDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time)),evaluatedAt:time,timezone:'Asia/Shanghai',taskId:step.taskId,
    simulation:true,capabilities:{write:false,tools:[]},coverage:{tasks:{state:'complete',scope:'当前人员有权查看的任务'},evidence:{state:'complete',scope:'当前人员可见的文件、讨论、交付、确认与活动'},history:{state:history.length?'partial':'not_read',scope:history.length?'已提供工作台活动记录；未读取其他业务历史':'未加载其他历史'}},history,
    inputVersions:{team:team.id,tasks:Object.fromEntries(v.tasks.map(t=>[t.id,t.version])),responsibilities:Object.fromEntries(v.members.map(m=>[m.id,m.version])),evidence:Object.fromEntries(v.evidence.map(e=>[e.id,e.version]))},
    currentResponsibility:{memberId:currentUser.id,version:currentUser.version,responsibilities:currentUser.responsibilities},
    members:v.members,tasks:v.tasks,evidence:v.evidence,sources:[...v.tasks.map(t=>({ref:t.id,version:t.version,subjectId:t.id,teamId:team.id,content:t,effectiveAt:null,validity:'current'})),...v.members.map(m=>({ref:m.id,version:m.version,subjectId:m.id,teamId:team.id,content:m,effectiveAt:null,validity:'current'})),...v.evidence.map(e=>({ref:e.id,version:e.version,subjectId:e.taskId,teamId:team.id,content:e.content,effectiveAt:null,validity:'current'}))],
    previousOutputs:step.usePreviousOutput?previous.map(p=>({stepId:p.stepId,output:p.output})):[],
  };
  if(step.skillId!=='agentdoor-task-planner')return base;
  const statuses={'待开始':'open','进行中':'in_progress','已阻塞':'blocked','已完成':'completed','已取消':'cancelled'};
  return {...base,...(fresh?{creationMode:'fresh',constraints:['本次只做基础创建与拆解，团队任务为空；无需查阅历史任务、文件或讨论，不因缺少历史资料要求补读。']}:{ }),authorizedTeamIds:[team.id],revision:c.version,currentTaskId:step.taskId,confirmedFields:[],
    members:v.members.map(m=>({...m,boundaries:[],evidence:[{id:m.id,title:`${m.name}责任说明`,text:m.responsibilities.join('；')}]})),
    context:{snapshotId:`${runId}:${step.id}:snapshot`,asOf:time,acl:{status:'verified',scopeTeamIds:[team.id]},coverage:{tasks:'complete',subtasks:'complete',discussions:'complete',history:history.length?'partial':'not_requested',files:'complete'},
      tasks:v.tasks.map(t=>({...t,status:statuses[t.status],updatedAt:time,dueOn:t.dueAt,sourceRefs:[t.id]})),
      discussions:v.evidence.filter(e=>e.kind==='讨论'||e.kind==='确认').map(e=>({id:e.id,taskId:e.taskId,authorId:e.authorId,createdAt:e.createdAt||time,kind:e.kind==='确认'?'decision':'report',text:e.content,replyTo:e.replyToId,sourceRefs:e.relatedEvidenceIds??[]})),history,files:v.evidence.filter(e=>e.kind==='文件').map(e=>({id:e.id,taskId:e.taskId,title:e.title,fileName:e.title,version:e.version,linkedTaskIds:[e.taskId],content:e.content,authorId:e.authorId,createdAt:e.createdAt||null,supersedesId:e.supersedesId})),stakeholders:[],
      sourceRefs:[...v.tasks.map(t=>({id:t.id,title:t.title,text:`目标：${t.goal}；完成标准：${t.acceptanceCriteria.join('；')}`})),...v.evidence.map(e=>({id:e.id,title:e.title,text:e.content}))]},
    duplicateSearch:{status:'completed',scopeTeamIds:[team.id],matches:v.tasks.map(t=>({taskId:t.id,title:t.title,reason:'当前授权沙箱任务候选，请按实际交付结果核对'})),coverageNote:fresh?'本次为基础创建测试，任务沙箱为空；不查询历史任务、讨论、文件或活动。':'已枚举当前模拟视角可见的全部沙箱任务；不包含其他团队或生产数据。'},
  };
}
export function applyEvents(team:LabTeam,step:LabStep):LabTeam{
  const next=structuredClone(team);
  for(const event of step.events){
    if(event.type==='task_status'){const t=next.tasks.find(t=>t.id===event.taskId);if(!t)throw new Error('事件任务不存在');t.status=event.status;t.version++;}
    if(event.type==='responsibility'){const m=next.members.find(m=>m.id===event.memberId);if(!m)throw new Error('事件成员不存在');m.responsibilities=event.responsibilities;m.version++;}
    if(event.type==='evidence'){const i=next.evidence.findIndex(e=>e.id===event.evidence.id);if(i>=0)next.evidence[i]={...event.evidence,version:next.evidence[i].version+1};else next.evidence.push(event.evidence);}
  }
  return next;
}
