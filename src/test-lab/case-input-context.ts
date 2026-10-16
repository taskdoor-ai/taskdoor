import type {LabTeam,LabCase,LabStep} from '@/test-lab/types';

export function selectCaseContext(team:LabTeam,c:LabCase,step:LabStep){
  const tasksOnly=c.contextMode==='team_tasks';
  if(tasksOnly)team={...team,evidence:[]};
  const fresh=step.skillId==='agentdoor-task-planner';
  if(fresh)team={...team,tasks:[],evidence:[]};
  if(fresh)step={...step,taskId:null};
  if(step.skillId==='taskdoor-decompose-task'&&step.taskId){
    const ids=new Set([step.taskId,...team.tasks.filter(task=>task.parentId===step.taskId).map(task=>task.id)]);
    team={...team,tasks:team.tasks.filter(task=>ids.has(task.id)),evidence:team.evidence.filter(record=>ids.has(record.taskId))};
  }
  if(step.skillId==='agentdoor-task-status-analyzer'&&step.taskId){
    const ids=new Set([step.taskId]);let changed=true;while(changed){changed=false;for(const t of team.tasks)if(t.parentId&&ids.has(t.parentId)&&!ids.has(t.id)){ids.add(t.id);changed=true;}}
    for(const t of team.tasks.filter(t=>ids.has(t.id)))for(const id of t.dependsOnTaskIds)ids.add(id);
    team={...team,tasks:team.tasks.filter(t=>ids.has(t.id)),evidence:team.evidence.filter(e=>ids.has(e.taskId))};
  }
  if(['agentdoor-responsibility-advisor','agentdoor-member-matcher'].includes(step.skillId)){
    const tasks=team.tasks.filter(t=>t.ownerId===c.actorId||t.participantIds.includes(c.actorId)||t.id===step.taskId);const ids=new Set(tasks.map(t=>t.id));
    const evidence=team.evidence.filter(e=>ids.has(e.taskId));const memberIds=new Set([c.actorId,...tasks.flatMap(t=>[t.ownerId,...t.participantIds]),...evidence.map(e=>e.authorId)]);
    team={...team,tasks,evidence,members:team.members.filter(m=>memberIds.has(m.id))};
  }
  return {team,step};
}
