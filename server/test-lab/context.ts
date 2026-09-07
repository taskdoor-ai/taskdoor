import type { LabTeam, LabCase, LabStep, LabView, LabStepResult } from '../../src/test-lab/types.ts';
export function buildView(team:LabTeam,actorId:string):LabView{
  if(!team.members.some(m=>m.id===actorId))throw new Error('当前视角成员不存在');
  const tasks=team.tasks.filter(t=>t.visibility==='team'||t.ownerId===actorId||t.participantIds.includes(actorId));
  const ids=new Set(tasks.map(t=>t.id));
  return {team:structuredClone({...team,tasks:tasks.map(t=>({...t,parentId:t.parentId&&ids.has(t.parentId)?t.parentId:null,dependsOnTaskIds:t.dependsOnTaskIds.filter(id=>ids.has(id))})),evidence:team.evidence.filter(e=>ids.has(e.taskId)&&(!e.visibleToIds.length||e.visibleToIds.includes(actorId)))}),actorId,hiddenTaskCount:team.tasks.length-tasks.length,simulation:true};
}
export function buildModelInput(team:LabTeam,c:LabCase,step:LabStep,runId:string,previous:LabStepResult[]){
  const view=buildView(team,c.actorId);if(step.taskId&&!view.team.tasks.some(t=>t.id===step.taskId))throw new Error('当前人员无权查看用例目标任务');
  const time=new Date().toISOString(); const v=view.team;
  const currentUser=v.members.find(m=>m.id===c.actorId)!;
  const base={requestId:`${runId}:${step.id}`,message:step.prompt,principalId:c.actorId,currentUserId:c.actorId,teamId:team.id,currentDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time)),evaluatedAt:time,timezone:'Asia/Shanghai',taskId:step.taskId,
    simulation:true,capabilities:{write:false,tools:[]},coverage:{tasks:{state:'complete',scope:'当前模拟视角有权查看的任务'},evidence:{state:'complete',scope:'已提供的模拟证据'},history:{state:'not_read',scope:'未加载其他历史'}},
    inputVersions:{team:team.id,tasks:Object.fromEntries(v.tasks.map(t=>[t.id,t.version])),responsibilities:Object.fromEntries(v.members.map(m=>[m.id,m.version])),evidence:Object.fromEntries(v.evidence.map(e=>[e.id,e.version]))},
    currentResponsibility:{memberId:currentUser.id,version:currentUser.version,responsibilities:currentUser.responsibilities},
    members:v.members,tasks:v.tasks,evidence:v.evidence,sources:[...v.tasks.map(t=>({ref:t.id,version:t.version,subjectId:t.id,teamId:team.id,content:t,effectiveAt:null,validity:'current'})),...v.members.map(m=>({ref:m.id,version:m.version,subjectId:m.id,teamId:team.id,content:m,effectiveAt:null,validity:'current'})),...v.evidence.map(e=>({ref:e.id,version:e.version,subjectId:e.taskId,teamId:team.id,content:e.content,effectiveAt:null,validity:'current'}))],
    previousOutputs:step.usePreviousOutput?previous.map(p=>({stepId:p.stepId,output:p.output})):[],
  };
  if(step.skillId!=='agentdoor-task-planner')return base;
  const statuses={'待开始':'open','进行中':'in_progress','已阻塞':'blocked','已完成':'completed','已取消':'cancelled'};
  return {...base,authorizedTeamIds:[team.id],revision:c.version,currentTaskId:step.taskId,confirmedFields:[],
    members:v.members.map(m=>({...m,boundaries:[],evidence:[{id:m.id,title:`${m.name}责任说明`,text:m.responsibilities.join('；')}]})),
    context:{snapshotId:`${runId}:${step.id}:snapshot`,asOf:time,acl:{status:'verified',scopeTeamIds:[team.id]},coverage:{tasks:'complete',subtasks:'complete',discussions:'complete',history:'not_requested',files:'complete'},
      tasks:v.tasks.map(t=>({...t,status:statuses[t.status],updatedAt:time,dueOn:t.dueAt,sourceRefs:[t.id]})),
      discussions:v.evidence.filter(e=>e.kind==='讨论'||e.kind==='确认').map(e=>({id:e.id,taskId:e.taskId,authorId:e.authorId,createdAt:e.createdAt||time,kind:e.kind==='确认'?'decision':'report',text:e.content})),history:[],files:v.evidence.filter(e=>e.kind==='文件').map(e=>({id:e.id,taskId:e.taskId,title:e.title,content:e.content,authorId:e.authorId,createdAt:e.createdAt||null})),stakeholders:[],
      sourceRefs:[...v.tasks.map(t=>({id:t.id,title:t.title,text:`目标：${t.goal}；完成标准：${t.acceptanceCriteria.join('；')}`})),...v.evidence.map(e=>({id:e.id,title:e.title,text:e.content}))]},
    duplicateSearch:{status:'completed',scopeTeamIds:[team.id],matches:v.tasks.map(t=>({taskId:t.id,title:t.title,reason:'当前授权沙箱任务候选，请按实际交付结果核对'})),coverageNote:'已枚举当前模拟视角可见的全部沙箱任务；不包含其他团队或生产数据。'},
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
