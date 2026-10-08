import type {LabCase,SkillId} from './types';
export function isMcpCreationCase(c:LabCase){return c.steps.length===1&&c.steps[0].skillId==='agentdoor-task-planner'&&!c.steps[0].taskId&&!c.steps[0].events.length&&!c.steps[0].usePreviousOutput&&!c.assertions.length&&!(c.verification?.fixtureChecks.length)&&!c.workload&&!c.contextMode;}
export function availableMcpCreationCases(cases:LabCase[],teamId:string,skillId:SkillId='agentdoor-task-planner'){
 return cases.filter(c=>c.teamId===teamId&&c.enabled&&!c.archived&&isMcpCreationCase(c)&&c.steps[0].skillId===skillId)
  .sort((a,b)=>Number(!!b.requiresMemberContext)-Number(!!a.requiresMemberContext));
}
