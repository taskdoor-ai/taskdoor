import type { LabPreflight, LabState } from '../../src/test-lab/types.ts';
import { buildWorkflows } from '../../src/test-lab/workflows.ts';
import { evaluateAssertions } from './assertions.ts';
import { applyEvents, buildModelInput } from './context.ts';
import { resolveSkill } from './skills.ts';
import { caseSchema, validateRelations } from './schema.ts';

export function preflightWorkflow(state:LabState,workflowId:string):LabPreflight {
  const workflow=buildWorkflows(state).find(w=>w.id===workflowId);
  if(!workflow)throw new Error('测试流程不存在或团队已归档');
  const team=state.teams.find(t=>t.id===workflow.teamId)!;
  let stepCount=0;
  const cases=workflow.caseIds.map(caseId=>{
    const item=state.cases.find(c=>c.id===caseId);
    const checks:LabPreflight['cases'][number]['checks']=[];
    const check=(label:string,fn:()=>void)=>{try{fn();checks.push({label,status:'passed',message:'已满足'});}catch(error){checks.push({label,status:'failed',message:error instanceof Error?error.message:'检查未通过'});}};
    check('用例已启用且团队匹配',()=>{if(!item||!item.enabled||item.archived||item.teamId!==team.id)throw new Error('用例缺失、停用、归档或所属团队已改变');});
    if(!item)return {caseId,name:'缺失的用例',checks};
    stepCount+=item.steps.length;
    check('测试目标、逐步预期与断言完整',()=>{
      caseSchema.parse(item);
      if(!item.verification?.objective.trim()||!item.verification.fixtureChecks.length||item.steps.some(s=>!item.verification?.expectedResults.some(r=>r.stepId===s.id&&r.criteria.some(c=>c.trim()))||!item.assertions.some(a=>a.stepId===s.id)))throw new Error('请补齐验证目标、每步预期、前置检查与自动断言');
    });
    for(const rule of item.verification?.fixtureChecks??[])check(rule.label,()=>{
      const collection=rule.subject==='task'?team.tasks:rule.subject==='member'?team.members:team.evidence;
      const subject=collection.find(item=>item.id===rule.subjectId);
      const result=evaluateAssertions(subject,[{...rule,stepId:'preflight'}])[0];
      if(result.status!=='passed')throw new Error('当前资料与场景初始条件不符，请核对资料或编辑前置检查；尚未调用模型');
    });
    check('每步输入、人员可见范围与 Skill 版本有效',()=>{
      let sandbox=structuredClone(team);
      for(const step of item.steps){sandbox=applyEvents(sandbox,step);validateRelations([sandbox],[item]);buildModelInput(sandbox,item,step,'preflight',[]);resolveSkill(state,step.skillId,step.skillVersionId);}
    });
    return {caseId,name:item.name,checks};
  });
  return {workflow,revision:state.revision,ready:stepCount>0&&stepCount<=20&&cases.every(c=>c.checks.every(check=>check.status==='passed')),stepCount,cases};
}
