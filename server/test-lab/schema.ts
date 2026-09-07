import { z } from 'zod';
import { maxActiveTeamLimit, skillIds, taskStatuses, type LabTeam, type LabCase } from '../../src/test-lab/types.ts';
const id=z.string().trim().min(1).max(160).regex(/^[\p{L}\p{N}_.:-]+$/u,'ID 仅支持字母、数字、中文及 _ . : -');
const text=z.string().max(20000);
const ids=z.array(id).max(500);
const lines=z.array(text).max(100);
const version=z.number().int().min(1);
export const memberSchema=z.object({id,name:z.string().trim().min(1).max(160),role:text,responsibilities:lines,version}).strict();
export const taskSchema=z.object({id,title:z.string().trim().min(1).max(400),goal:text,status:z.enum(taskStatuses),createdById:id.nullable(),ownerId:id.nullable(),participantIds:ids,parentId:id.nullable(),dependsOnTaskIds:ids,acceptanceCriteria:lines,executionTips:lines,estimatedMinutes:z.number().nonnegative().max(1e7).nullable(),dueAt:z.string().max(100).nullable(),tags:lines,visibility:z.enum(['team','restricted']),version}).strict();
export const evidenceSchema=z.object({id,taskId:id,authorId:id,kind:z.enum(['文件','讨论','交付','确认']),title:z.string().max(400),content:text,createdAt:z.string().max(100),version,visibleToIds:ids}).strict();
export const teamSchema=z.object({id,name:z.string().trim().min(1).max(200),industry:text,description:text,archived:z.boolean(),members:z.array(memberSchema).max(100),tasks:z.array(taskSchema).max(1000),evidence:z.array(evidenceSchema).max(2000)}).strict();
const eventSchema=z.discriminatedUnion('type',[
  z.object({type:z.literal('task_status'),taskId:id,status:z.enum(taskStatuses)}).strict(),
  z.object({type:z.literal('responsibility'),memberId:id,responsibilities:lines}).strict(),
  z.object({type:z.literal('evidence'),evidence:evidenceSchema}).strict(),
]);
export const caseSchema=z.object({id,name:z.string().trim().min(1).max(300),category:text,teamId:id,actorId:id,description:text,archived:z.boolean(),enabled:z.boolean(),version,
  steps:z.array(z.object({id,prompt:z.string().trim().min(1).max(20000),skillId:z.enum(skillIds),taskId:id.nullable(),usePreviousOutput:z.boolean(),events:z.array(eventSchema).max(50)}).strict()).min(1).max(10),
  assertions:z.array(z.object({id,label:text,stepId:id,path:z.string().max(300).refine(p=>!/(?:__proto__|constructor|prototype)/.test(p),'不支持该路径'),operator:z.enum(['exists','equals','contains','not_contains','length','gte','lte']),expected:z.json()}).strict()).max(100),
  reviewChecklist:lines,legacyInput:z.record(z.string(),z.unknown()).optional(),legacyExpected:z.unknown().optional(),origin:z.string().max(300).optional(),
}).strict();
export const editableSchema=z.object({expectedRevision:z.number().int().nonnegative(),teams:z.array(teamSchema).max(150),cases:z.array(caseSchema).max(1000)}).strict();
function unique(items:{id:string}[], label:string){if(new Set(items.map(i=>i.id)).size!==items.length)throw new Error(`${label} ID 重复`);}
function checkGraph(team:LabTeam, field:'parentId'|'dependsOnTaskIds'){
  const done=new Set<string>(); const visiting=new Set<string>();
  const byId=new Map(team.tasks.map(t=>[t.id,t]));
  function visit(id:string){if(done.has(id))return;if(visiting.has(id))throw new Error('任务层级或前置依赖不能有循环');visiting.add(id);const task=byId.get(id)!;const next=field==='parentId'?(task.parentId?[task.parentId]:[]):task.dependsOnTaskIds;next.forEach(visit);visiting.delete(id);done.add(id);}
  team.tasks.forEach(t=>visit(t.id));
}
export function validateRelations(teams:LabTeam[],cases:LabCase[]){
  unique(teams,'团队');unique(cases,'用例');
  if(teams.filter(team=>!team.archived).length>maxActiveTeamLimit)throw new Error(`测试工作台最多保留 ${maxActiveTeamLimit} 个活跃团队，请先归档一个团队`);
  for(const team of teams){
    unique(team.members,'成员');unique(team.tasks,'任务');unique(team.evidence,'证据');
    const members=new Set(team.members.map(m=>m.id)), tasks=new Set(team.tasks.map(t=>t.id));
    for(const t of team.tasks){
      if(t.createdById!==null&&!members.has(t.createdById))throw new Error('任务创建人必须是当前团队成员');
      if([t.ownerId,...t.participantIds].some(id=>id!==null&&!members.has(id)))throw new Error('任务引用不存在的成员');
      if(t.ownerId&&t.participantIds.includes(t.ownerId))throw new Error('负责人不能重复列为参与人');
      if([t.parentId,...t.dependsOnTaskIds].some(id=>id!==null&&!tasks.has(id)))throw new Error('任务引用不存在的父任务或前置');
    }
    checkGraph(team,'parentId');checkGraph(team,'dependsOnTaskIds');
    for(const e of team.evidence)if(!tasks.has(e.taskId)||!members.has(e.authorId)||e.visibleToIds.some(id=>!members.has(id)))throw new Error('证据关联任务或成员不存在');
  }
  for(const c of cases){
    const team=teams.find(t=>t.id===c.teamId);if(!team||!team.members.some(m=>m.id===c.actorId))throw new Error('用例的团队或执行成员不存在');
    unique(c.steps,'步骤');unique(c.assertions,'断言');
    if(c.assertions.some(a=>!c.steps.some(s=>s.id===a.stepId)))throw new Error('断言引用不存在的步骤');
    for(const s of c.steps){
      if(s.taskId&&!team.tasks.some(t=>t.id===s.taskId))throw new Error('步骤关联任务不存在');
      for(const e of s.events){
        if(e.type==='task_status'&&!team.tasks.some(t=>t.id===e.taskId))throw new Error('步骤事件的任务不存在');
        if(e.type==='responsibility'&&!team.members.some(m=>m.id===e.memberId))throw new Error('步骤事件的成员不存在');
        if(e.type==='evidence'&&(!team.tasks.some(t=>t.id===e.evidence.taskId)||!team.members.some(m=>m.id===e.evidence.authorId)||e.evidence.visibleToIds.some(id=>!team.members.some(m=>m.id===id))))throw new Error('步骤证据的关联无效');
      }
    }
  }
}
