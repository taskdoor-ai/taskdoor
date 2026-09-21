import type { LabState, LabWorkflow, LabRun } from './types.ts';

export const workflowDefinitions=[
  {key:'delivery',title:'交付判断与当前风险',objective:'验证文件进度、正式状态、决策冲突、执行阻塞和当前工作顺序。',cases:['status-current','diagnosis-conflict','diagnosis-block','priority-lead']},
  {key:'changes',title:'变更后的多轮回归',objective:'验证补证、修订和异常解除后重新判断，旧依据失效且变化不扩大。',cases:['plan-revise','status-recovery','diagnosis-resolve','priority-change']},
  {key:'responsibility',title:'任务规划与责任边界',objective:'验证新范围、查重复用、实际贡献、临时协助和责任版本更新。',cases:['plan-new','plan-reuse','role-history','role-temporary','role-prepare']},
  {key:'effort',title:'人员权限与工作量',objective:'验证人员范围、私密资料过滤、三点估算、核对撤销和历史趋势。',cases:['priority-specialist','status-private','ewd-estimate','ewd-progress','ewd-trend']},
];
export function buildWorkflows(state:Pick<LabState,'teams'>):LabWorkflow[]{
  return state.teams.filter(t=>!t.archived&&t.scenarioCatalogVersion===1).flatMap(team=>workflowDefinitions.map(def=>({id:`${team.id}::${def.key}`,teamId:team.id,title:`${team.name} · ${def.title}`,objective:def.objective,caseIds:def.cases.map(key=>`${team.id}-journey-${key}`)})));
}
export function summarizeWorkflow(runs:LabRun[]) {
  const rows=runs.map(run=>{
    const failures=run.steps.flatMap(step=>[...(step.error?[step.error]:[]),...step.structureErrors,...step.assertions.filter(a=>a.status==='failed').map(a=>a.label)]);
    const incomplete=run.steps.length!==run.caseSnapshot.steps.length||run.steps.some(step=>step.structure==='unknown'||step.assertions.some(a=>a.status==='unknown')||!step.assertions.length);
    const automatic=run.status==='queued'||run.status==='running'?'running':run.status==='cancelled'||run.status==='interrupted'?'incomplete':failures.length||run.status==='failed'?'failed':incomplete?'unknown':'passed';
    return {id:run.id,caseId:run.caseId,name:run.caseName,objective:run.caseSnapshot.verification?.objective??run.caseSnapshot.description,expected:run.caseSnapshot.verification?.expectedResults??[],automatic,review:run.review?.verdict??(run.caseSnapshot.reviewChecklist.length?'pending':'not_required'),failures,error:run.error,model:run.model,steps:run.steps.map(step=>({id:step.stepId,structure:step.structure,assertions:step.assertions,output:step.output,error:step.error})),completedSteps:run.steps.length,totalSteps:run.caseSnapshot.steps.length};
  });
  const counts={total:rows.length,running:rows.filter(r=>r.automatic==='running').length,passed:rows.filter(r=>r.automatic==='passed').length,failed:rows.filter(r=>r.automatic==='failed').length,unknown:rows.filter(r=>['unknown','incomplete'].includes(r.automatic)).length,reviewPending:rows.filter(r=>r.review==='pending').length};
  const verdict=!rows.length?'not_run':counts.running?'running':counts.failed||rows.some(r=>r.review==='failed')?'failed':counts.unknown?'incomplete':counts.reviewPending?'needs_review':'passed';
  return {batchId:runs[0]?.batchId??null,workflowId:runs[0]?.selection?.workflowId??null,verdict,counts,rows};
}
