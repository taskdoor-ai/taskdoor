import type { LabAssertion, LabState } from '../../src/test-lab/types.ts';
import { scenarioProfiles } from './scenario-profiles.ts';

// Per-team migration: restarting must not restore cases the user edited or removed.
export function addDecompositionCases(state: LabState): boolean {
  state.decompositionTeamIds ??= [];
  let changed = false;
  for (const p of scenarioProfiles) {
    if (state.decompositionTeamIds.includes(p.teamId)) continue;
    const team = state.teams.find(t => t.id === p.teamId);
    const source = state.cases.find(c => c.id === `${p.teamId}-journey-plan-new`);
    if (!team || !source) continue;
    const lead = team.members.find(m => m.id === source.actorId)!;
    const context = `这是“${p.project}”的新一期内部交接演练，尚无对应演练任务；已有项目成果只作参考，不能当成本期演练已完成。业务背景：${p.scope}\n交付质量参考：${p.standards.join(' ')}\n本次仅生成待确认草稿，不写入正式任务，不编造日期。`;
    const variants = [
      {key:'single',title:'单一结果不过度拆分',count:1,prompt:`仅交付一份“${p.deliverables[0]}演练检查表”，包含检查项、依据和通过条件。搜集资料、编写、自检只是完成过程，不是独立交付。只建一个任务，不建父任务。`,criteria:['只创建一个检查表任务；资料收集、编写、自检保留为工作内容。','完成标准覆盖检查项、依据和通过条件，不能用“认真完成”替代。']},
      {key:'parallel',title:'三个独立结果平行拆分',count:3,prompt:`分别交付“${p.deliverables[0]}演练检查表”、“${p.deliverables[1]}演练检查表”和“${p.deliverables[2]}演练检查表”。三份各自验收，互不等待，直接创建三个平行任务，不创建父任务。`,criteria:['三个交付各有唯一任务与各自完成标准，不合并为一个模糊大任务。','不存在输入依赖，不因排列顺序编造前后置关系。']},
      {key:'nested',title:'三层任务树与叶子验收',count:7,prompt:'请创建“交接演练”总任务，下设“操作演练”和“验收演练”两个分组。操作演练下分别交付操作手册、异常处理卡；验收演练下分别交付验收检查表、演练结果报告。明确只要这七个节点、四个叶子；分组不是额外可交付结果。',criteria:['七个节点形成三层树：一个总任务、两个分组、四个叶子；父子关系正确且无环。','每个叶子可独立验收；父级不重复计算叶子的预计投入，也不成为叶子的前置依赖。']},
      {key:'dependency',title:'交付依赖与归属分开',count:2,prompt:'只创建两个平行任务：演练验收检查表、演练结果报告。结果报告必须使用已经确认的检查表作为输入，不能先出最终结论。不要创建父任务，也不要把检查表设成报告的父任务。',criteria:['恰好两个交付，报告依赖检查表；二者不互为父子。','依赖单向无环；检查表完成不能自动视为报告完成。']},
      {key:'owner',title:'拆分后保留明确责任',count:3,prompt:`请建立演练总任务，下设演练检查表、演练记录两个子任务。三项均明确由${lead.name}（${lead.id}）负责；有需要的专业协助可以提出，但不能擅自替换已指定负责人。`,criteria:[`一个父任务、两个子任务，三个负责人均为明确指定的${lead.name}。`,'每个子任务分别验收，参与者贡献与负责人责任区分。']},
      {key:'unassigned',title:'拆解成立但暂不分配',count:2,prompt:'只建立演练检查表、演练记录两个平行任务，分别验收。这两个任务暂时都不分配负责人，也不要推荐成员；责任稍后由我决定，不阻止保存草稿。',criteria:['两个独立交付均保留未分配，不默认为请求人或项目负责人。','不因为缺少负责人阻断已清楚的任务拆解，不创建额外协调任务。']},
      {key:'scope',title:'排除项不能变成子任务',count:2,prompt:'本期只交付内部演练手册、内部演练记录两个平行任务。明确不做对外宣传、商务报价、客户签约或正式生产发布；这些排除项不要创建成“待开始”或“已取消”任务，也不要创建父任务。',criteria:['仅两个范围内交付；排除项可在说明中列出，但不能成为任务。','内部演练完成不代表客户验收或正式生产发布。']},
      {key:'dedupe',title:'重复措辞合并为同一结果',count:2,prompt:'需求来自两条消息：“做一份演练操作手册和异常处理卡”；“补一份演练操作指南，附异常应对卡”。我确认操作手册就是操作指南，异常处理卡就是异常应对卡，读者和验收口径完全相同。合并成两个平行交付，不建父任务。',criteria:['识别同义重复，仅创建操作手册、异常处理卡两个任务。','合并保留全部有效要求，不以消息条数拆成四个任务。']},
      {key:'revisions',title:'第二轮缩减未确认草稿',count:3,prompt:'先拟三个平行任务：演练操作手册、异常处理卡、演练记录表。每份单独验收，不建父任务，先给草稿等我确认。',followup:'上轮方案尚未确认，没有创建任何正式任务。我现在取消演练记录表，只保留操作手册和异常处理卡。请返回这两个任务的完整替代草稿；不要给取消项创建任务，也不要删除任何既有正式任务。',criteria:['首轮三个任务；第二轮完整替代草稿仅保留两个交付。','草稿从未应用，不能声称已删除正式任务；原有项目和历史结果保持不变。']},
      {key:'acceptance',title:'验收维度不等于任务数量',count:1,prompt:'只交付一份交接演练手册，不建父任务。验收包含四项：覆盖正常流程、列明异常分支、注明适用资料版本、给出接收人核对清单。这四项是同一份手册的完成标准，不分别生成子任务。',criteria:['只有一个手册任务，四个验收维度完整进入该任务完成标准。','不得按验收条数拆成四份交付；未知接收人不虚构为已确认人员。']},
    ];
    for (const v of variants) {
      const id = `${team.id}-decomposition-${v.key}`;
      if (state.cases.some(c => c.id === id)) continue;
      const c = structuredClone(source);
      Object.assign(c, {id, name:`${p.project} · 拆解：${v.title}`, category:'任务拆解与分配', origin:'decomposition/2026-09', version:1, enabled:true, archived:false});
      c.description = `${p.industry}团队的任务拆解专项。${v.criteria.join(' ')} 数量断言只验证明确要求的节点数，语义、层级与范围仍需逐项验收。`;
      c.steps = [{...c.steps[0], taskId:null, prompt:context+'\n'+v.prompt, events:[], usePreviousOutput:false}];
      if (v.followup) c.steps.push({...c.steps[0],id:'s2',prompt:v.followup,usePreviousOutput:true});
      c.reviewChecklist = v.criteria;
      c.verification!.objective = c.name;
      c.verification!.expectedResults = c.steps.map((s,i) => ({stepId:s.id,criteria:[`本轮应返回 ${i ? 2 : v.count} 个待确认任务节点。`,...v.criteria]}));
      c.assertions = [];
      const check = (stepId:string,label:string,path:string,expected:LabAssertion['expected'],operator:LabAssertion['operator']='equals') => c.assertions.push({id:`decompose-${c.assertions.length}`,stepId,label,path,expected,operator});
      for (const [i,s] of c.steps.entries()) {
        check(s.id,'可供确认的草稿','disposition','ready_for_confirmation');
        check(s.id,'完成已有任务查重','duplicateCheck.status','completed');
        check(s.id,'不产生正式写入','externalEffects','none');
        check(s.id,'按明确结果数量拆解','proposal.changes',i ? 2 : v.count,'length');
        if(v.key==='owner'||v.key==='unassigned')for(let n=0;n<v.count;n++)check(s.id,`第${n+1}项责任边界`,`proposal.changes.${n}.fields.ownerRecommendation.${v.key==='owner'?'memberId':'basis'}`,v.key==='owner'?lead.id:'unassigned');
      }
      state.cases.push(c);
    }
    state.decompositionTeamIds.push(team.id);
    changed = true;
  }
  if(changed){state.categories??=[];if(!state.categories.some(c=>c.name==='任务拆解与分配'))state.categories.push({name:'任务拆解与分配',description:'以可独立验收的结果拆分，核对任务层级、依赖、范围与分配；包含不应拆分的反例。'});}
  return changed;
}
