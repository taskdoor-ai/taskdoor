import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import Ajv2020 from 'ajv/dist/2020.js';
import { z } from 'zod';
import { taskProgressPercent } from '../../src/features/tasks/lib/task-progress-percent.ts';
import type { SkillId } from '../../src/test-lab/types.ts';
const ajv=new Ajv2020({allErrors:true,strict:false,validateFormats:false});
const planner=ajv.compile(JSON.parse(readFileSync(new URL('../../skills/agentdoor-task-planner/references/planning-v0.2.schema.json',import.meta.url),'utf8')));
const obj=z.record(z.string(),z.unknown());const array=z.array(z.unknown());const n=z.number().nonnegative().nullable();
const ewdEstimate=z.object({knownEwdMinutes:n,totalEwdMinutes:n,personDays:n}).passthrough();
const envelope=z.object({schemaVersion:z.string(),skillId:z.string(),ruleVersion:z.string().min(1),requestId:z.string(),principalId:z.string(),teamId:z.string(),inputVersions:obj,coverage:obj,evaluatedAt:z.string(),status:z.enum(['ready','partial','needs_context','no_change','stale']),result:obj,evidenceRefs:array,unknowns:array,warnings:array,writeReceipt:z.null()});
const displayPercent = z.union([z.literal(0), z.literal(25), z.literal(50), z.literal(75), z.literal(100)]).nullable();
const chartDay=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const chartPoint=z.object({at:chartDay,completedMinutes:z.number().int().nonnegative()});
const progressComparison=z.object({asOf:chartDay,explanation:z.string(),workload:z.array(chartPoint.extend({scopeMinutes:z.number().int().positive(),scopeVersion:z.string().min(1)})).min(1),expected:z.object({scopeVersion:z.string().min(1),points:z.array(chartPoint)}),timing:z.object({startOn:chartDay,dueOn:chartDay.nullable(),forecastOn:chartDay.nullable(),scopeVersion:z.string().min(1),basis:z.string(),completedOn:chartDay.optional()}),forecastTrend:z.object({asOf:chartDay,scopeVersion:z.string(),startMinutes:z.number().int().nonnegative(),points:z.array(chartPoint.extend({note:z.string()}))}).optional()});
const criterionAssessment = z.object({criterionId:z.string().nullable(),text:z.string(),criteriaVersion:z.number().int().nonnegative().nullable(),state:z.enum(['current','unknown','stale']),percent:displayPercent,completedContent:z.array(z.string()),remainingContent:z.array(z.string()),pendingChecks:z.array(z.string()),reason:z.string(),evidenceRefs:z.array(z.string())});
const schemas={
 'agentdoor-member-matcher':z.object({taskId:z.string(),taskVersion:z.number().int(),candidates:z.array(z.object({memberId:z.string(),responsibilityVersion:z.number().int(),matchLevel:z.enum(['high','partial','low','unknown']),matchPercent:z.union([z.literal(0),z.literal(25),z.literal(50),z.literal(75),z.literal(100)]).nullable().optional(),requirementAssessments:z.array(z.object({requirement:z.string(),coverage:z.enum(['full','partial','none','unknown']),reason:z.string(),evidenceRefs:z.array(z.string())})).optional(),suggestedRole:z.enum(['owner','participant']).nullable(),matchedRequirements:z.array(z.string()),gaps:z.array(z.string()),pendingChecks:z.array(z.string()),reason:z.string(),evidenceRefs:z.array(z.string())})),recommendedOwnerId:z.string().nullable(),assignmentUnchanged:z.literal(true)}),
 'agentdoor-responsibility-advisor':z.object({mode:z.enum(['analyze','prepare_update','apply_confirmed']),responsibilityVersion:z.union([z.string(),z.number()]).nullable(),proposals:z.array(z.object({operation:z.enum(['add','update','deprecate','no_change']),reason:z.string(),evidenceRefs:array})),update:z.null()}),
 'agentdoor-task-status-analyzer':z.object({taskId:z.string(),taskVersion:z.union([z.string(),z.number()]),formalStatus:z.string(),currentSituation:z.object({summary:z.string(),evidenceRefs:array}),nextActions:array,progress:z.object({state:z.enum(['current','unknown','stale']),completionPercent:z.number().min(0).max(100).nullable(),displayPercent:displayPercent.optional(),estimate:ewdEstimate.nullable().optional()}),criteriaVersion:z.number().int().nonnegative().nullable().optional(),criterionAssessments:z.array(criterionAssessment).optional(),formalStatusUnchanged:z.literal(true)}),
 'agentdoor-task-diagnostician':z.object({taskId:z.string(),taskVersion:z.union([z.string(),z.number()]).nullable(),diagnoses:z.array(z.object({type:z.enum(['execution_blockage','decision_conflict']),summary:z.string(),sides:z.array(z.object({claim:z.string(),evidenceRefs:array})).min(2),evidenceRefs:array})),checks:array,unknowns:array,formalStatusUnchanged:z.literal(true)}),
 'agentdoor-personal-priority':z.object({rankedTasks:z.array(z.object({rank:z.number().int().positive(),taskId:z.string(),factors:z.object({B:z.number(),C:z.number(),P:z.number(),D:z.number(),H:z.number(),Q:z.number()}),I:z.number().min(0).max(100),U:z.number().min(0).max(100),W:z.number().min(0).max(100),reason:z.string()})),excluded:array}),
 'agentdoor-ewd-progress':z.object({mode:z.enum(['estimate','progress','trend']),estimate:ewdEstimate.nullable(),progress:z.object({totalEwdMinutes:n,completedEwdMinutes:n,completionPercent:z.number().min(0).max(100).nullable()}).passthrough().nullable(),trend:obj.nullable()}),
};
const versions:Record<string,string>={'agentdoor-member-matcher':'agentdoor.member-match.v0.1','agentdoor-responsibility-advisor':'agentdoor.responsibility-advice.v0.1','agentdoor-task-status-analyzer':'agentdoor.task-status-analysis.v0.1','agentdoor-task-diagnostician':'agentdoor.task-diagnosis.v0.1','agentdoor-personal-priority':'agentdoor.personal-priority.v0.1','agentdoor-ewd-progress':'agentdoor.ewd-progress.v0.1'};
export function validateOutput(id:SkillId,output:unknown,input:any):string[]{
  const errors:string[]=[];const o=output as any;
  const knownRefs=new Set([input.requestId,...(input.sources??[]).map((s:any)=>s.ref),...(input.context?.sourceRefs??[]).map((s:any)=>s.id),...(input.context?.discussions??[]).map((s:any)=>s.id),...(input.analysisContext?.tasks??input.tasks??[]).flatMap((t:any)=>(t.criteria?.items??[]).map((c:any)=>c.id))]);
  const inspectRefs=(value:unknown)=>{if(!value||typeof value!=='object')return;for(const [key,child] of Object.entries(value)){if(key==='evidenceRefs'&&Array.isArray(child)){for(const ref of child){const id=typeof ref==='string'?ref:ref?.ref;if(typeof id!=='string'||!knownRefs.has(id))errors.push('存在未读取或无权使用的证据引用');}}else inspectRefs(child);}};
  inspectRefs(o);
  if(id==='agentdoor-task-planner'){
    if(!planner(output))errors.push(...(planner.errors??[]).map(e=>`${e.instancePath}: ${e.message}`));
    if(o?.requestId!==input.requestId||o?.baseSnapshotId!==input.context?.snapshotId||o?.baseRevision!==input.revision)errors.push('规划未绑定当前请求／快照／修订');
    if(JSON.stringify(Object.entries(o?.baseTaskVersions??{}).sort())!==JSON.stringify((input.context?.tasks??[]).map((t:any)=>[t.id,t.version]).sort()))errors.push('任务版本映射不完整或过期');
  }else{
    const parsed=envelope.safeParse(output);if(!parsed.success)return parsed.error.issues.map(e=>`${e.path.join('.')}: ${e.message}`);
    if(o.schemaVersion!==versions[id]||o.skillId!==id)errors.push('Skill 或输出协议版本错误');
    if(o.requestId!==input.requestId||o.principalId!==input.principalId||o.teamId!==input.teamId)errors.push('输出未绑定当前请求或人员视角');
    if(!isDeepStrictEqual(o.inputVersions,input.inputVersions))errors.push('输入版本未完整回显或已过期');
    const r=schemas[id].safeParse(o.result);if(!r.success)errors.push(...r.error.issues.map(e=>`result.${e.path.join('.')}: ${e.message}`));
    if(id==='agentdoor-member-matcher'&&r.success){
      const result=o.result,task=input.tasks.find((t:any)=>t.id===input.taskId);
      if(!task||result.taskId!==task.id||result.taskVersion!==task.version)errors.push('匹配任务或版本错误');
      const ids=new Set<string>();for(const item of result.candidates){const member=input.members.find((m:any)=>m.id===item.memberId);if(o.ruleVersion==='MEMBER-MATCH-2026-10-11-v2'){if(item.matchPercent===undefined||!item.requirementAssessments?.length)errors.push('缺少匹配百分比或逐项覆盖依据');else{const level=item.matchPercent===null?'unknown':item.matchPercent>=75?'high':item.matchPercent>0?'partial':'low';if(item.matchLevel!==level)errors.push('匹配百分比与梯度不一致');if(item.matchPercent===100&&item.requirementAssessments.some((a:any)=>a.coverage!=='full'))errors.push('100%必须完整覆盖全部结果');if(item.requirementAssessments.some((a:any)=>a.coverage==='unknown')&&item.matchPercent!==null)errors.push('未知覆盖不能生成百分比');}}if(ids.has(item.memberId)||!input.candidateMemberIds?.includes(item.memberId)||!member||item.responsibilityVersion!==member.version)errors.push('候选身份或责任版本错误');ids.add(item.memberId);if(item.matchLevel==='unknown'&&item.suggestedRole!==null||item.matchLevel==='low'&&item.suggestedRole!==null||item.suggestedRole==='owner'&&item.matchLevel!=='high')errors.push('匹配级别与建议角色冲突');}
      if(result.candidates.filter((i:any)=>i.suggestedRole==='owner').length>1||result.recommendedOwnerId!==null&&!result.candidates.some((i:any)=>i.memberId===result.recommendedOwnerId&&i.matchLevel==='high'&&i.suggestedRole==='owner'))errors.push('负责人推荐不一致');
      if(ids.size!==input.candidateMemberIds?.length)errors.push('候选分析未完整覆盖');
    }
    if(id==='agentdoor-responsibility-advisor'&&r.success&&o.result.responsibilityVersion!==input.responsibilityVersion)errors.push('责任基准版本错误');
    if(id==='agentdoor-task-status-analyzer'&&r.success){
      const result=o.result,p=result.progress;
      if(/TASK-ANALYSIS-(2026-10-11-v[67]|2026-10-14-v[89])/.test(o.ruleVersion)){for(const key of ['criteriaVersion','criterionAssessments'])if(!(key in result))errors.push('当前任务分析缺少必填字段：'+key);for(const key of ['displayPercent','comparison','totalEwdMinutes','completedEwdMinutes'])if(!(key in p))errors.push('当前进度缺少必填字段：'+key);const task=(input.analysisContext?.tasks??input.tasks??[]).find((t:any)=>t.id===result.taskId);const criteria=task?.criteria?.items??[];if(criteria.length&&(!result.criterionAssessments||result.criterionAssessments.length!==criteria.length))errors.push('逐条评估未完整覆盖当前完成标准');}

      if(/TASK-ANALYSIS-(2026-10-11-v7|2026-10-14-v[89])/.test(o.ruleVersion)&&p.comparison!==null&&!progressComparison.safeParse(p.comparison).success)errors.push('燃起图比较结构无法被任务详情组件读取：请使用workload数组、asOf、expected.points及timing.startOn/dueOn/forecastOn');
      if(p.displayPercent!==undefined && p.displayPercent!==(p.state==='current'?taskProgressPercent(p.completionPercent):null))errors.push('展示进度与有效原始进度不一致');
      for(const item of result.criterionAssessments??[]){
        if(item.criteriaVersion!==result.criteriaVersion)errors.push('标准评估版本不一致');
        if(item.percent!==null&&(item.state!=='current'||!item.reason.trim()||!item.evidenceRefs.length))errors.push('标准百分比缺乏当前依据');
      }
    }
    if(id==='agentdoor-ewd-progress'&&r.success){
      const e=o.result.estimate,p=o.result.progress;
      if(e&&e.totalEwdMinutes!==null&&e.personDays!==null&&Math.abs(e.totalEwdMinutes/480-e.personDays)>0.011)errors.push('人天与分钟换算不一致');
      if(e?.totalEwdMinutes!==null&&e?.knownEwdMinutes>e?.totalEwdMinutes)errors.push('已知估算不能超过总估算');
      if(p?.totalEwdMinutes!==null&&p?.completedEwdMinutes>p?.totalEwdMinutes)errors.push('完成量不能超过总量');
      if(p?.completionPercent!==null&&p?.completionPercent!==undefined&&(p.totalEwdMinutes===null||p.totalEwdMinutes<=0||p.completedEwdMinutes===null||Math.abs(p.completedEwdMinutes/p.totalEwdMinutes*100-p.completionPercent)>0.11))errors.push('完成比例缺乏有效总量或计算错误');
    }
    if(id==='agentdoor-personal-priority'&&r.success){
      const seen=new Set<string>();let previous:any=null;
      for(const [index,t] of o.result.rankedTasks.entries()){
        const f=t.factors;if(t.I!==f.B+f.C+f.P||t.U!==Math.max(f.D,f.H,f.Q)||Math.abs(t.W-(.6*t.I+.4*t.U))>1e-8)errors.push(`任务 ${t.taskId} 权重计算错误`);
        const original=input.tasks.find((item:any)=>item.id===t.taskId);
        if(!original||!['待开始','进行中','已阻塞'].includes(original.status)||(original.ownerId!==input.principalId&&!original.participantIds.includes(input.principalId)))errors.push(`任务 ${t.taskId} 不符合入选范围`);
        if(original&&t.taskVersion!==original.version)errors.push(`任务 ${t.taskId} 版本错误`);
        if(seen.has(t.taskId)||t.rank!==index+1)errors.push('排序序号重复、缺失或任务重复');seen.add(t.taskId);
        if(previous&&(t.W>previous.W||(t.W===previous.W&&t.I>previous.I)||(t.W===previous.W&&t.I===previous.I&&t.U>previous.U)))errors.push('未按权重、重要度、紧急度降序排列');previous=t;
      }
    }
    if(['agentdoor-task-status-analyzer','agentdoor-task-diagnostician'].includes(id)&&r.success){const task=input.tasks.find((t:any)=>t.id===o.result.taskId);if(!task||o.result.taskId!==input.taskId||o.result.taskVersion!==task.version)errors.push('分析对象或任务版本不匹配');if(id==='agentdoor-task-status-analyzer'&&task&&o.result.formalStatus!==task.status)errors.push('正式任务状态被模型改写');}
  }
  return errors.slice(0,30);
}
