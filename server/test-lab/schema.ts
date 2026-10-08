import { z } from 'zod';
import { maxActiveTeamLimit, skillIds, taskStatuses, type LabTeam, type LabCase } from '../../src/test-lab/types.ts';
const id=z.string().trim().min(1).max(160).regex(/^[\p{L}\p{N}_.:-]+$/u,'ID 仅支持字母、数字、中文及 _ . : -');
const text=z.string().max(20000);
const ids=z.array(id).max(500);
const lines=z.array(text).max(100);
const version=z.number().int().min(1);
export const memberSchema=z.object({mcpMemberId:z.string().uuid().optional(),id,name:z.string().trim().min(1).max(160),role:text,responsibilities:lines,version}).strict();
export const taskSchema=z.object({id,title:z.string().trim().min(1).max(400),goal:text,status:z.enum(taskStatuses),createdById:id.nullable(),ownerId:id.nullable(),participantIds:ids,parentId:id.nullable(),dependsOnTaskIds:ids,acceptanceCriteria:lines,executionTips:lines,estimatedMinutes:z.number().nonnegative().max(1e7).nullable(),dueAt:z.string().max(100).nullable(),tags:lines,visibility:z.enum(['team','restricted']),version}).strict();
export const evidenceSchema=z.object({replyToId:id.optional(),relatedEvidenceIds:ids.optional(),supersedesId:id.optional(),attachment:z.object({name:z.string().min(1).max(400),mimeType:z.string().max(160),size:z.number().int().min(0).max(1000000),dataUrl:z.string().max(1400000).regex(/^data:[a-zA-Z0-9!#$&^_.+\/-]*;base64,[A-Za-z0-9+/]*={0,2}$/)}).strict().optional(),id,taskId:id,authorId:id,kind:z.enum(['文件','讨论','交付','确认','活动']),title:z.string().max(400),content:text,createdAt:z.string().max(100),version,visibleToIds:ids}).strict();
export const teamSchema=z.object({mcpWorkspaceId:z.string().uuid().optional(),testMemberLimit:z.literal(5).optional(),testRosterVersion:z.literal(1).optional(),id,name:z.string().trim().min(1).max(200),industry:text,description:text,archived:z.boolean(),scenarioCatalogVersion:z.literal(1).optional(),members:z.array(memberSchema).max(100),tasks:z.array(taskSchema).max(1000),evidence:z.array(evidenceSchema).max(2000)}).strict();
const eventSchema=z.discriminatedUnion('type',[
  z.object({type:z.literal('task_status'),taskId:id,status:z.enum(taskStatuses)}).strict(),
  z.object({type:z.literal('responsibility'),memberId:id,responsibilities:lines}).strict(),
  z.object({type:z.literal('evidence'),evidence:evidenceSchema}).strict(),
]);
const checkFields={id,label:text,path:z.string().max(300).refine(p=>!/(?:__proto__|constructor|prototype)/.test(p),'不支持该路径'),operator:z.enum(['exists','equals','contains','not_contains','length','gte','lte']),expected:z.json()};
export const verificationSchema=z.object({rulesVersion:z.literal(1).optional(),objective:text,preconditions:lines,expectedResults:z.array(z.object({stepId:id,criteria:lines}).strict()).max(10),fixtureChecks:z.array(z.object({...checkFields,subject:z.enum(['task','evidence','member']),subjectId:id}).strict()).max(100)}).strict();
export const workloadSchema=z.object({asOf:z.string().datetime({offset:true}),windowEnd:z.string().datetime({offset:true}),members:z.array(z.object({memberId:id,currentWork:text,remainingMinutes:z.number().nonnegative().max(1000000).nullable(),availableMinutes:z.number().nonnegative().max(1000000).nullable()}).strict()).max(100)}).strict().refine(v=>Date.parse(v.windowEnd)>Date.parse(v.asOf),'可用时间窗口结束必须晚于统计时间');
export const expectedOutputSchema=z.object({version:z.literal(1),checks:z.array(z.object({id,stepId:id.nullable(),subject:z.string().trim().min(1).max(200),criterion:z.string().trim().min(1).max(4000),expected:z.json()}).strict()).min(1).max(100)}).strict();
export const caseSchema=z.object({requiresMemberContext:z.boolean().optional(),inputFormat:z.literal("natural-v1").optional(),contextMode:z.literal("team_tasks").optional(),expectedOutput:expectedOutputSchema.optional(),tags:z.array(z.string().trim().min(1).max(40)).max(20).refine(v=>new Set(v).size===v.length,'标签不能重复').optional(),workload:workloadSchema.optional(),creationContext:z.literal("fresh").optional(),id,name:z.string().trim().min(1).max(300),category:text,teamId:id,actorId:id,description:text,archived:z.boolean(),enabled:z.boolean(),version,verification:verificationSchema.optional(),
  steps:z.array(z.object({id,prompt:z.string().trim().min(1).max(20000),skillId:z.enum(skillIds),skillVersionId:id.nullable().optional(),evaluatedAt:z.string().datetime({offset:true}).optional(),taskId:id.nullable(),usePreviousOutput:z.boolean(),events:z.array(eventSchema).max(50)}).strict()).min(1).max(10),
  assertions:z.array(z.object({id,label:text,stepId:id,path:z.string().max(300).refine(p=>!/(?:__proto__|constructor|prototype)/.test(p),'不支持该路径'),operator:z.enum(['exists','equals','contains','not_contains','length','gte','lte']),expected:z.json()}).strict()).max(100),
  reviewChecklist:lines,legacyInput:z.record(z.string(),z.unknown()).optional(),legacyExpected:z.unknown().optional(),origin:z.string().max(300).optional(),
}).strict();
export const editableSchema=z.object({expectedRevision:z.number().int().nonnegative(),teams:z.array(teamSchema).max(150),cases:z.array(caseSchema).max(5000)}).strict();
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
    const records=new Set(team.evidence.map(e=>e.id));
    for(const e of team.evidence){
      if(!tasks.has(e.taskId)||!members.has(e.authorId)||e.visibleToIds.some(id=>!members.has(id)))throw new Error('证据关联任务或成员不存在');
      if([e.replyToId,e.supersedesId,...(e.relatedEvidenceIds??[])].some(ref=>ref!==undefined&&(!records.has(ref)||ref===e.id)))throw new Error('记录引用的文件或讨论不存在，或引用了自身');
    }
  }
  for(const c of cases){
    const team=teams.find(t=>t.id===c.teamId);if(!team||!team.members.some(m=>m.id===c.actorId))throw new Error('用例的团队或执行成员不存在');
    if(c.workload){unique(c.workload.members.map(m=>({id:m.memberId})),'负荷成员');if(c.workload.members.some(m=>!team.members.some(x=>x.id===m.memberId)))throw new Error('负荷场景引用不存在的成员');}
    if(c.expectedOutput){unique(c.expectedOutput.checks,'预期检查');if(c.expectedOutput.checks.some(x=>x.stepId!==null&&!c.steps.some(s=>s.id===x.stepId)))throw new Error('预期检查引用不存在的步骤');}
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

export const skillVersionInputSchema=z.object({skillId:z.enum(skillIds),label:z.string().trim().min(1).max(80),notes:z.string().max(2000),baseVersionId:id.nullable().optional(),snapshot:z.string().trim().min(1).max(300000)}).strict();
export const modelIdSchema=z.string().trim().min(1).max(160).regex(/^[a-zA-Z0-9_.:/-]+$/, '请输入模型服务支持的模型 ID');
export const runSelectionSchema=z.object({executionMode:z.enum(['proposal','mcp']).optional(),skillVersionIds:z.array(id).min(1).max(5).refine(v=>new Set(v).size===v.length,"版本不能重复").optional(),skillId:z.enum(skillIds).optional(),skillVersionId:id.nullable().optional(),judgeModel:modelIdSchema.optional(),models:z.array(modelIdSchema).min(1).max(5).refine(v=>new Set(v).size===v.length,"模型不能重复").optional(),model:modelIdSchema.optional(),actorId:id.optional(),workflowId:id.optional()}).strict().refine(v=>!(v.model&&v.models),'model 与 models 只能选择一种').refine(v=>!v.skillVersionIds||!!v.skillId&&v.skillVersionId===undefined,'多版本需选择 Skill，且不可同时传入单版本').refine(v=>v.skillVersionId===undefined||!!v.skillId,'选择文件包版本时必须选择 Skill');
