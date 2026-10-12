import type {LabCase} from '@/test-lab/types';

export function isTaskPreviewSnapshot(snapshot:string){
  // Keep this shared predicate dependency-free: Vite imports it while loading server config,
  // before the frontend path aliases exist.
  const header=/^skills\/[^/]+\/references\/production-runtime\.json ---\r?\n/;
  const manifest=snapshot.split(/^--- FILE: /m).find(document=>header.test(document));
  try{return !!manifest&&JSON.parse(manifest.replace(header,'')).mode==='preview';}catch{return false;}
}

export function isTaskPreviewCase(c:LabCase){
  return c.steps.length>0&&c.steps.every((s,i)=>s.skillId==='agentdoor-task-planner'&&!s.taskId&&!s.events.length&&(i>0||!s.usePreviousOutput))&&!c.assertions.length&&!c.verification?.fixtureChecks.length&&!c.workload&&!c.contextMode;
}

export function availableTaskPreviewCases(cases:LabCase[],teamId:string){
  return cases.filter(c=>c.teamId===teamId&&c.enabled&&!c.archived&&isTaskPreviewCase(c)).sort((a,b)=>Number(!!b.requiresMemberContext)-Number(!!a.requiresMemberContext));
}

const previewCriteria:Record<string,string>={
  '成功创建任务，返回任务名称和可打开的任务编号。':'生成明确任务名称和稳定临时 clientId，供前端预览与编辑。',
  '回读确认目标、完成标准和负责人已保存。':'方案包含明确目标、逐条可检查的完成标准及按输入职责选择的负责人。',
  '一次创建请求落成任务，基础信息完整，回读与输入一致。':'一次需求生成完整任务方案，各业务字段与输入一致，不遗漏已给要求。',
  '逐项回读真实任务，名称、目标、完成标准和层级对应正确，不额外添加先后依赖。':'各任务的名称、目标、完成标准和 children 层级对应正确，不额外添加先后依赖。',
  '真实保存制作到核查、核查到交接的前置关系，回读方向正确。':'用 dependsOnClientIds 表达制作到核查、核查到交接的前置关系，方向正确。',
  '目标和完成标准实际保存，名称没有混入工具指令。':'目标和逐条完成标准完整生成，名称表达业务交付对象。',
  '名称、目标、完成标准分别保存，回读可核对。':'名称、目标和逐条完成标准在各自字段生成，可与原始需求逐项核对。',
  '完成要求整理为逐条可检查的标准，并实际保存。':'完成要求在 acceptanceCriteria 中整理为逐条可检查的标准，不遗漏用户要求。',
  '截止日期保存为2026-12-31，其他基础信息与输入一致。':'dueDate 为2026-12-31，不生成开始日期，其他基础信息与输入一致。',
  '两条建议作为执行建议保存，目标和完成标准仍单独保留。':'executionTips 保留用户指定的两条建议，不扩写；目标和完成标准分别生成。',
  '预计人工投入为45分钟，方法和依据完整保存。':'effortEstimate 保留用户指定的45分钟、人工核对方法及估算依据。',
  '回读记录中的业务数量与输入一致。':'方案中的业务数量与用户输入一致，不新增或遗漏数量要求。',
  '任务名称、目标、逐条完成标准和截止日期全部实际保存。':'方案完整生成名称、目标、逐条完成标准和截止日期，字段表达各自含义。',
  '截止日期为2026-12-25，回读基础信息与用户需求一致。':'dueDate 为2026-12-25，其他基础信息与用户需求一致。',
  '负责人为林洁，tiger huang通过成员工具加入参与，卜佳菲不被无理由加入。':'ownerMemberId 对应林洁，participants 包含 tiger huang 及具体贡献，不无理由加入卜佳菲。',
  '负责人为Jage，tiger huang通过真实成员工具加入为参与者；任务只有一位负责人。':'ownerMemberId 对应 Jage，participants 包含 tiger huang 及具体贡献，任务只有一位负责人。',
  '只有一张图文海报的交付任务；用途、两项卖点、1080×1920和图文交付要求实际保存。':'只生成一项图文海报任务；目标和标准保留用途、两项卖点、1080×1920和图文交付要求。',
  '各节点目标与完成标准均保存，预算2万元及整体截止日期2026-12-31不遗漏；不执行发布。':'各节点都有目标和完成标准；整体预算2万元和截止日期2026-12-31不遗漏，不额外安排发布。',
  '文案600字以内、海报1080×1920、源文件和导出图分别保存至对应任务标准。':'文案标准保留600字以内；海报标准保留1080×1920、源文件和导出图，不错放至其他任务。',
  '源文件、导出图、素材版本说明、商品资料一致性和素材来源完整性保存至各自标准。':'各自的 acceptanceCriteria 保留源文件、导出图、素材版本说明、商品资料一致性和素材来源完整性。',
  '任务名称、目标、Jage负责人和截止日期2026-12-25正确保存。':'任务名称和目标准确，ownerMemberId 对应 Jage，dueDate 为2026-12-25。',
  '只创建一个海报任务，Jage负责，不按源文件、PNG、PDF或版本说明拆成多个任务。':'只生成一个海报任务，由 Jage 负责；源文件、PNG、PDF和版本说明作为标准，不拆成多个任务。',
  '四种交付要求逐条实际保存，任务回读结果与输入对应。':'四种交付要求在 acceptanceCriteria 中逐条保留，方案与输入对应。',
};

// Convert legacy criteria once; source inputs and immutable run snapshots remain intact.
export function previewCaseForEvaluation(source:LabCase):LabCase {
  const item=structuredClone(source);
  if(item.previewCriteriaVersion===1)return item;
  const criterion=(text:string)=>{
    if(previewCriteria[text])return previewCriteria[text];
    if(/^通过真实(?:MCP| MCP|工具)创建/.test(text))return '方案的名称、目标和逐条完成标准与用户需求一致；父级汇总范围，子级对应独立交付，不遗漏要求或额外增加工作。';
    if(/成功创建任务，返回任务名称/.test(text))return '返回明确任务名称和稳定临时 clientId，供前端预览与编辑。';
    return text
      .replace(/真实创建回执[：:]\s*/g,'')
      .replace(/通过真实 MCP 创建任务，并用 get_task 回读同一任务 ID。?/g,'生成结构完整的任务方案，使用方案内临时 clientId。')
      .replace(/创建任务后读取 criteria.version，再用 set_task_criteria 写入/g,'在 acceptanceCriteria 中返回')
      .replace(/通过(?:真实成员工具|成员工具)加入(?:为)?参与(?:者)?/g,'列为参与者')
      .replace(/(?:通过真实MCP创建，)?每个任务get_task回读/g,'各任务节点完整输出')
      .replace(/逐项回读真实任务/g,'逐项检查任务方案')
      .replace(/(?:真实保存|实际保存|正确保存|完整保存|已保存|分别保存|均保存|保存至对应任务标准|保存至各自标准)/g,'在方案对应字段完整生成')
      .replace(/回读确认|回读可核对|回读记录中|回读结果|任务回读结果|回读与输入一致/g,'方案与输入一致')
      .replace(/回读方向正确/g,'依赖方向正确')
      .replace(/回读/g,'预览方案')
      .replace(/一次创建请求落成任务/g,'一次需求生成任务方案')
      .replace(/(?:实际创建|真实创建|只创建|创建对应|创建一个|创建任务)/g,match=>match.startsWith('只')?'只生成':match==='创建一个'?'生成一个':match==='创建对应'?'生成对应':'生成任务方案')
      .replace(/若服务标记需复核，如实说明/g,'估算须提供方法与依据，未知时如实说明')
      .replace(/任务编号|真实任务 ID|各自真实 ID/g,'方案临时 clientId')
      .replace(/parentTaskId/g,'children 层级')
      .replace(/(?:完整)?保存/g,'在方案中保留');
  };
  item.tags=[...new Set((item.tags??[]).map(tag=>tag==='真实 MCP'?'任务预览':tag))];
  item.reviewChecklist=item.reviewChecklist.map(criterion);
  if(item.expectedOutput)item.expectedOutput.checks=item.expectedOutput.checks.map(check=>({...check,criterion:criterion(check.criterion)}));
  if(item.verification)item.verification.expectedResults=item.verification.expectedResults.map(result=>({...result,criteria:result.criteria.map(criterion)}));
  item.previewCriteriaVersion=1;
  return item;
}

/** Analysis uses the saved team tasks and evidence without transforming creation criteria. */
export function availableTaskAnalysisCases(cases:LabCase[],teamId:string){
  return cases.filter(c=>c.teamId===teamId&&c.enabled&&!c.archived&&c.steps.length>0&&c.steps.every(s=>s.skillId==='agentdoor-task-status-analyzer'&&!!s.taskId));
}

export function availablePeopleAnalysisCases(cases:LabCase[],teamId:string,skillId:string){return cases.filter(c=>c.teamId===teamId&&c.enabled&&!c.archived&&c.steps.length>0&&c.steps.every(s=>s.skillId===skillId)&&(skillId==='agentdoor-responsibility-advisor'||skillId==='agentdoor-member-matcher'&&c.steps.every(s=>!!s.taskId)));}
