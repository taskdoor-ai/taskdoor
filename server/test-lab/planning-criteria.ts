import type {LabState} from '../../src/test-lab/types.ts';
import {planningCriteria,scriptCreationCriteria} from '../../src/test-lab/planning-criteria.ts';
export function migratePlanningCriteria(state:LabState){
 if(state.planningCriteriaVersion===1)return false;
 const generic=new Set(['判断是否有可追溯依据','未知是否如实保留','是否遵守角色与确认边界']);
 for(const c of state.cases){
  if(!c.steps.every(s=>s.skillId==='agentdoor-task-planner'))continue;
  if(c.creationContext!=='fresh'&&c.id!=='case-create')continue;
  c.reviewChecklist=[...new Set([...c.reviewChecklist.filter(s=>!generic.has(s)),...(c.id==='case-create'?scriptCreationCriteria:[]),...planningCriteria])];
  c.version++;
 }
 state.planningCriteriaVersion=1;return true;
}
