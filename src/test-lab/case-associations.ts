import type {LabTeam,LabCase} from '@/test-lab/types';
import {buildView} from '@/test-lab/visibility';
import {selectCaseContext} from '@/test-lab/case-input-context';

export function teamCaseUsages(team:LabTeam,cases:LabCase[]){
 const usages=new Map<string,{testCase:LabCase;matches:{stepId:string;skillId:string;role:string}[]}[]>();
 for(const c of cases.filter(c=>c.teamId===team.id&&!c.archived))for(const step of c.steps){
  const selected=selectCaseContext(c.dataSnapshot??team,c,step);if(!selected.team.members.some(m=>m.id===c.actorId))continue;
  for(const task of buildView(selected.team,c.actorId).team.tasks){
   const rows=usages.get(task.id)??[];let row=rows.find(r=>r.testCase.id===c.id);if(!row){row={testCase:c,matches:[]};rows.push(row);}
   row.matches.push({stepId:step.id,skillId:step.skillId,role:step.taskId===task.id?'目标任务':['agentdoor-responsibility-advisor','agentdoor-member-matcher'].includes(step.skillId)?'本人任务上下文':'相关任务上下文'});usages.set(task.id,rows);
  }
 }
 return usages;
}
export function taskCaseUsages(team:LabTeam,cases:LabCase[],taskId:string){return teamCaseUsages(team,cases).get(taskId)??[];}
