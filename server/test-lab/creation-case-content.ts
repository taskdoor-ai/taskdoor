import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import type {LabCase,LabTeam} from '../../src/test-lab/types.ts';
import {isTaskPreviewCase,previewCaseForEvaluation} from '../../src/test-lab/task-preview-case.ts';
import {assignmentCriterionNote} from './assignment-review-policy.ts';

// Exact input fingerprints protect edited fixtures and user-authored cases. This
// is a curated migration, never an instruction rewrite based on a title keyword.
const baseline=JSON.parse(readFileSync(new URL('./fixtures/creation-case-input-baseline-2026-10-16.json',import.meta.url),'utf8')) as {id:string;origin?:string;promptHash:string}[];
const knownInputs=new Map(baseline.map(item=>[item.id,item]));
const generatedOrigins=new Set(['planning-core-v1','workflow-focus-v1','content-jage-v1','task-preview-flow-v1','expanded-skills-v1','complex-skills-v1','creation-outcome/2026-10-16']);
export const creationMainOnlyCriterion='仅整理当前一项新任务，所有候选 tasks 至多一项且 children=[]；合理补问时允许 tasks=[]。同一当前任务内的多个交付结果保留在主任务标准中；互不相关且会改变当前创建对象的请求须澄清，不拼空汇总、不丢范围。普通执行步骤留 executionTips，不在创建中生成子树、子任务候选或下层人员分派。独立拆解须在任务保存后使用 taskdoor-decompose-task，本次不执行。';
export const creationAssignmentCriterion='只使用本次输入有效成员ID和已确认职责，按主任务整体交付推荐至多一位负责人及确有具体贡献的参与者。保留用户点名及独立核查分工；不得将权限角色、自荐、任务数量或未经采纳建议当正式职责、能力或忙闲。职责不足可留未分配并说明；合理语义关联不要求岗位逐字匹配。推荐不等于人员已接受或正式任务已分派。 '+assignmentCriterionNote;
export const creationNoWriteCriterion='仅返回符合 taskdoor.task-preview.v1 的可编辑方案和临时 clientId，不调用任务或职责写入、不伪造真实任务ID、创建回执或人工确认。用户说确认也仍只返回方案；未知事实、排期假设及职责缺口如实说明。';
const scopeCriterion='每条完成标准对应当前主任务的明确交付与用途，保留数量、质量、排除项及各交付适用范围；不把某项的格式或要求扩到其他物料，不从成员职责扩出额外交付。多个结果在当前主任务中可分别核对，不生成子任务。';
const currentContent='当前主任务的名称、真实用途目标与逐条完成标准对应用户需求，完整覆盖交付范围，不重复或增加工作，不输出子任务。';
const singleAssignment='当前主任务按整体交付推荐一位负责人；其他已知制作、核查或交接工作以必要参与者及具体贡献表达，不生成子任务或下层负责人。';
const edits=new Map<string,string>([
 ['方案的名称、目标和逐条完成标准与用户需求一致；父级汇总范围，子级对应独立交付，不遗漏要求或额外增加工作。',currentContent],
 ['方案的名称、目标和逐条完成标准与用户需求一致，不遗漏要求或额外增加工作；仅用户明确要求拆解时才生成对应子任务。',currentContent],
 ['总任务下有脚本、主视觉、活动方案三个独立交付。','只生成当前首发准备主任务；标准分别覆盖30秒脚本、商城主视觉、门店活动方案及其各自要求，整体预算不超过2万元；不建子任务。'],
 ['三种渠道交付独立拆分，不按制作步骤拆分。','只生成当前新品发布资料主任务；标准分别核对官网用途介绍、门店卖点海报、使用与售后问答，保留各渠道独立核对和可并行的要求，不建子任务。'],
 ['官网和门店分支各包含对应独立结果；上级任务范围清楚，叶子不重复。','当前主任务标准明确官网文案/配图、门店海报/现场清单及两部分交接范围；齐套不漏项、不重做，不生成渠道分支或子任务。'],
 ['两项独立结果，核查依赖海报制作，不同负责人。','当前主任务标准保留海报文件及独立内容核查记录；执行建议保留先有海报再核查，制作与独立核查由不同成员贡献，不生成依赖字段或子任务。'],
 ['拆成对应四项独立交付，整体由卜佳菲统筹。','只生成当前首发准备主任务，标准分别覆盖官网文案、主视觉、客服问答和门店执行清单，整体负责人按职责推荐，保留2万元总预算与不执行发布。'],
 ['文案和海报均依赖口径确认，最终核查依赖两份物料；无制作互相依赖。','标准及执行建议保留先确认卖点口径、文案与海报可并行、最终核查需两份定稿；不输出依赖字段，不增加相互等待或子任务。'],
 ['两款不同验收对象独立交付，不合并导致范围混淆。','当前主任务逐条标准清楚区分甲款与乙款介绍、各自卖点及验收对象，不混用名称；不因两个对象自动拆子任务。'],
 ['渠道分支与叶子交付清晰，不只生成一层标题列表。','当前主任务标准清楚列出官网文案与配图、门店海报与现场清单，以及每个渠道交接记录；不以空标题代替标准，不生成渠道分支或子任务。'],
 ['父与文案、海报子任务日期分别为2026-12-31、2026-12-20、2026-12-25。','当前主任务 dueDate=2026-12-31；文案2026-12-20、海报2026-12-25的交付条件保留在各自标准中，不另建节点或日期字段。'],
 ['两项独立可验收任务，人员与用户选择一致；验收依赖制作。','当前主任务标准覆盖产品简介与独立验收记录；保留林洁制作、tiger huang独立验收及先最终稿后验收，以负责人/必要参与者说明贡献，不建子任务或依赖字段。'],
 ['不同交付物形成可独立验收的任务，上级任务准确汇总本次范围。','当前主任务目标说明整批工作用途，标准分别覆盖本次各项交付、已知质量及范围；不把多个交付自动变成子树。'],
 ['各任务的名称、目标、完成标准和 children 层级对应正确，不额外添加先后依赖。',currentContent],
 ['生成对应制作、核查、交接的独立任务，每项有目标和完成标准。','当前主任务标准分别保留成果、逐项核查记录和交接清单，不遗漏交接；制作、核查和交接不在本次创建中生成独立节点。'],
 ['用 dependsOnClientIds 表达制作到核查、核查到交接的前置关系，方向正确。','制作后核查、核查通过后交接的材料条件和顺序留在标准或执行建议中；不输出 dependsOnClientIds 或任何关系字段。'],
 ['官网横幅和门店海报分别形成任务，由Jage负责，不因为同一负责人合并或添加串行依赖。','当前视觉资料主任务由职责相关成员负责，标准分别对应官网横幅1920×600和门店A3海报及各自源文件/导出图；可以并行，不另建任务或串行依赖。'],
 ['文案、主视觉、门店方案、核查记录是四项独立交付；核查依赖文案和主视觉，制作之间可以并行。','当前主任务标准分别核对文案、主视觉、门店方案和文字/素材来源核查记录；先定稿后独立核查，制作可并行，顺序只保留为正文，不生成子任务。'],
 ['各节点都有目标和完成标准；整体预算2万元和截止日期2026-12-31不遗漏，不额外安排发布。','当前主任务具有真实用途目标及覆盖各交付的标准；保留2万元整体预算、dueDate=2026-12-31及不实际发布边界。'],
 ['Jage负责主视觉，tiger huang负责独立核查；两项可验收交付分开，核查依赖主视觉。','当前主任务保留视觉制作与独立核查的不同成员贡献；标准分别核对视觉文件和核查记录，顺序为先视觉定稿再核查，不生成下层节点或依赖字段。'],
 ['删除门店执行清单，不在标题、标准或建议中恢复该交付；父级范围和标准同步移除该项。','从当前主任务目标、标准和建议移除门店执行清单，不在后续修改中恢复该交付；只保留文案和海报范围。'],
 ['每项只有一个负责人，其余必要贡献作为参与者，不按成员数量机械拆分。','当前主任务只有一位负责人，其余已点名的必要贡献作为参与者，不按成员数量机械拆分。'],
 ['各节点保留原方案的临时 clientId，不重建不相关任务。','保留当前主任务的临时 clientId，不重建任务或下层节点。'],
 ['文案和海报保留各自 clientId、分工和标准，删除失效依赖，不添加拍摄或投放。','保留当前主任务 clientId、未授权变化的人员、日期及文案/海报标准；只移除本轮删除范围，不添加拍摄、投放或子任务。'],
 ['文案和海报保留各自 clientId、分工和标准，不添加拍摄或投放。','保留当前主任务 clientId、未授权变化的人员、日期及文案/海报标准；只移除本轮删除范围，不添加拍摄、投放或子任务。'],
 ['文案 dueDate 为2026-12-20，海报为2026-12-25，整体为2026-12-31；同步标准和建议中直接关联的旧日期表述，其余分工、目标、交付要求不变。','保留当前主任务 dueDate=2026-12-31和clientId；只把文案、海报各自交付条件改为2026-12-20、2026-12-25，同步直接关联旧日期表述，其余目标、标准和人员不变，不创建日期子节点。'],
 ['保留三份独立交付，不增加官网先完成的依赖。','当前主任务标准保留三份交付和各自独立核对条件，不增加官网先完成的要求或子任务。'],
 ['按三个成果拆分，复用已确认资料，不重复增加资料核对或预算任务。','当前主任务标准完整覆盖三个成果，复用已确认商品资料，不重复增加资料核对、预算任务或任何子任务。'],
 ['范围清晰且条件足以估算的无子任务节点提供有效 effortEstimate：非负整数 minutes、工作方法与依据；不因字段在创建界面隐藏而省略估算。汇总父节点从有效叶子去重汇总，不重复累计父级工时；依据不足可为 null，但须说明缺口，不能补零。','范围清晰且可估的当前主任务提供非负整数minutes、工作方法和依据的初始effortEstimate；覆盖本次必要工作且不重复计量。明细不是子任务；依据不足可null并说明，不能补零或声称已人工确认。'],
 ['本轮需求未明确拆解，默认仅整理主任务，不新增子任务；所有节点 children=[]，不因工作明细、交付数量或成员分工强制拆解。修改时保留已有明确范围、用户编辑与删除。',creationMainOnlyCriterion],
 ['未要求拆解时只生成一个主任务，children=[]；主任务目标与完成标准覆盖脚本、主视觉、活动方案三项结果及其各自要求。','只生成当前首发准备主任务，children=[]；目标及标准覆盖脚本、主视觉、活动方案三项结果及各自要求，独立拆解在保存后另行发起。'],
]);
const groupedAssignmentPatterns=[
 /^总任务由卜佳菲统筹，脚本/, /^文案、配图、海报由林洁负责/, /^整体负责人卜佳菲，叶子/,
 /^林洁承担文案与视觉制作/, /^林洁承担制作，tiger huang承担现场清单/,
 /^整体由卜佳菲统筹，官网介绍/, /^文案由林洁负责，海报由Jage负责；海报依赖/,
 /^官网介绍由林洁负责，海报由Jage负责；两个独立交付/, /^林洁负责文案，Jage负责海报，卜佳菲统筹/,
 /^整体负责人卜佳菲，文案由林洁负责/, /^口径确认由卜佳菲负责，制作由林洁/, /^依赖对应口径确认和最终物料/,
];
function correctCriterion(text:string){
 const hasAssignmentNote=text.endsWith(' '+assignmentCriterionNote),base=hasAssignmentNote?text.slice(0,-assignmentCriterionNote.length-1):text;
 const mapped=edits.get(base)??(groupedAssignmentPatterns.some(pattern=>pattern.test(base))?singleAssignment:base);
 return mapped+(hasAssignmentNote?' '+assignmentCriterionNote:'');
}
const creationBoundary='本次只整理当前一项新任务的方案；把各项交付与各自要求保留在这项任务的完成标准中，不在创建流程里拆子任务。任务保存后，如需拆解再单独发起。';
function baseId(id:string){return id.replace(/^regression-20261014-create-/,'').split('--')[0];}
const purposes:Record<string,string>={
 'planning-core-v1-d-single':'用途是帮助顾客理解产品已确认的容量和清洁特点，支持选购判断。',
 'planning-core-v1-d-three':'用途是让首发面向顾客的产品信息保持一致，并让门店团队能按已确认安排准备现场活动。',
 'planning-core-v1-d-channels':'用途是让官网、门店和客服基于一致的已确认信息帮助顾客理解产品用途、特点及使用售后事项。',
 'planning-core-v1-d-bundle':'用途是让接收人能使用按本次范围校正后的文本，并据改动清单核对修改。',
 'planning-core-v1-d-stage':'用途是使传播制作和渠道接收人依据同一套已确认信息推进准备与交接。',
 'planning-core-v1-d-tree':'用途是使官网和门店接收人分别获得可用于已确认发布范围的齐套资料。',
 'planning-core-v1-d-review':'用途是让发布准备人员能识别海报内容与已确认产品信息是否一致，避免带着未核对表述交接。',
 'planning-core-v1-d-reuse':'用途是让官网访客和客服能分别获取同一套已确认产品信息。',
 'planning-core-v1-d-delivery':'用途是让接收人使用不含本次范围错别字的商品标题，并能据清单核对改动。',
 'planning-core-v1-a-writing':'用途是帮助潜在客户理解产品用途、适用对象和已确认特点。',
 'planning-core-v1-a-design':'用途是帮助海报受众识别新品及已确认的发布信息。',
 'planning-core-v1-a-check':'用途是让发布准备人员能识别错字、不准确承诺及缺少来源的表述。',
 'planning-core-v1-a-budget':'用途是使活动协作者依据同一套获确认范围和预算安排后续工作。',
 'planning-core-v1-a-ops':'用途是使门店执行人员能按现场安排明确步骤、交接责任和检查项。',
 'planning-core-v1-a-support':'用途是帮助受众据已核对产品表述理解产品用途和特点。',
 'planning-core-v1-a-explicit':'用途是让接收人使用本次范围内无错字的文本，并核对已作修改。',
 'planning-core-v1-a-no-extra':'用途是帮助受众理解已确认的产品用途和特点。',
 'planning-core-v1-c-release':'用途是让首发各渠道能基于一致的已确认产品信息准备对外呈现和门店交接。',
 'planning-core-v1-c-consistency':'用途是使各渠道受众接收到一致且已经核对的产品表述。',
 'planning-core-v1-c-two-batches':'用途是让甲款和乙款的接收人分别理解对应产品信息，不误用另一款资料。',
 'planning-core-v1-c-channel-review':'用途是使官网和门店接收人分别拿到本渠道所需资料，并能核对交接是否齐备。',
 'planning-core-v1-c-deadline':'用途是让年底发布接收人按各项交付窗口取得齐套且信息一致的产品资料。',
 'planning-core-v1-c-independent-check':'用途是让接收人能据独立验收记录判断产品简介是否满足已确认要求。',
 'planning-core-v1-c-owner':'用途是使各协作者围绕已确认范围完成一致资料，并让渠道接收人能够核对交接。',
};
function revisedPrompt(prompt:string,id:string,index:number){
 let next=prompt
  .replace(/\n请在一个主任务下拆成官网介绍、门店海报和客服问答三个子任务，分别安排负责人。/g,'')
  .replace(/\n请在整体主任务下拆成介绍文案和海报两个子任务。/g,'')
  .replace(/\n请在整体主任务下拆成介绍文案、海报和门店执行清单三个子任务。/g,'')
  .replace('官网横幅和门店海报各安排一个任务，两份独立验收、可以同时做。','新建一项官网横幅与门店海报资料准备任务，两份交付分别核对、可以同时做。')
  .replace('安排新品文案定稿和海报设计两个任务','新建一项新品文案与海报资料准备任务')
  .replace('帮我建一套新品发布任务','帮我新建一项新品发布资料准备任务')
  .replace('帮我建任务并安排制作与核查的人','帮我新建一项包含两款介绍的资料准备任务，并安排制作与核查贡献')
  .replace('请整理成合适的任务','请整理为当前一项主任务')
  .replaceAll('形成准确清晰的新品宣传脚本','让宣传受众理解已确认的产品用途与特点')
  .replaceAll('根据活动标题与优惠信息完成海报定稿','帮助受众准确辨识活动标题与已确认优惠信息')
  .replace('目标是交付门店可打印的新品海报','目标是帮助门店顾客辨识新品及已确认的商品信息');
 if(index===0&&!id.startsWith('creation-outcome-v1-')){
  const purpose=purposes[baseId(id)];if(purpose&&!next.includes(purpose))next+='\n'+purpose;
  if(!next.includes(creationBoundary))next+='\n'+creationBoundary;
 }
 return next;
}
export type CreationCaseContentConflict={caseId:string;reason:string};
export function creationCaseContentConflicts(teams:LabTeam[],cases:LabCase[]):CreationCaseContentConflict[]{
 const activeTeams=new Set(teams.filter(team=>!team.archived).map(team=>team.id));
 return cases.flatMap(item=>{
  if(item.archived||!item.enabled||!activeTeams.has(item.teamId)||!isTaskPreviewCase(item))return [];
  const known=knownInputs.get(item.id),hash=createHash('sha256').update(JSON.stringify(item.steps.map(step=>step.prompt))).digest('hex');
  const alreadyCurrent=item.steps[0]?.prompt.includes(creationBoundary)||item.id.startsWith('creation-outcome-v1-');
  const generatedUntouched=item.version===1&&generatedOrigins.has(item.origin??'');
  if(known&&!alreadyCurrent&&!generatedUntouched&&hash!==known.promptHash&&/拆(?:成|分|解).*(?:子任务|层)|子任务.*拆|任务树/.test(item.steps.map(step=>step.prompt).join('\n')))return [{caseId:item.id,reason:'内置用例输入已被另行编辑，未自动改写；请核对是否仍含创建内拆解要求。'}];
  if(!known&&!generatedUntouched&&/拆(?:成|分|解).*(?:子任务|层)|子任务.*拆|任务树/.test(item.steps.map(step=>step.prompt).join('\n')))return [{caseId:item.id,reason:'用户自编创建用例包含拆解意图，已保留原文；须改为当前主任务范围或另建有真实父任务上下文的独立拆解用例。'}];
  return [];
 });
}
/** Pure/idempotent; the store owns revision/version assignment and frozen runs. */
export function refreshCreationCaseContent(teams:LabTeam[],cases:LabCase[]):LabCase[]{
 const activeTeams=new Set(teams.filter(team=>!team.archived).map(team=>team.id));
 const blocked=new Set(creationCaseContentConflicts(teams,cases).map(conflict=>conflict.caseId));
 return cases.map(source=>{
  if(source.archived||!source.enabled||!activeTeams.has(source.teamId)||!isTaskPreviewCase(source)||blocked.has(source.id))return source;
  const known=knownInputs.has(source.id)||source.version===1&&generatedOrigins.has(source.origin??'');
  if(!known)return source;
  const item=previewCaseForEvaluation(source);
  const inputHash=createHash('sha256').update(JSON.stringify(source.steps.map(step=>step.prompt))).digest('hex');
  const canRefreshInput=source.version===1&&generatedOrigins.has(source.origin??'')||inputHash===knownInputs.get(source.id)?.promptHash||source.steps[0]?.prompt.includes(creationBoundary);
  if(canRefreshInput)item.steps=item.steps.map((step,index)=>({...step,prompt:revisedPrompt(step.prompt,item.id,index)}));
  const rename=(text:string)=>text.replace('任务拆解 ·','创建范围 ·').replace('拆解与分工 ·','整体分工 ·').replace('多项交付拆解方案','多项交付范围整理').replace('制作与核对拆解后创建','制作与核对范围整理');
  item.name=rename(item.name);item.tags=(item.tags??[]).map(tag=>tag==='重点：任务拆解'?'重点：交付范围':tag);
  item.reviewChecklist=item.reviewChecklist.map(correctCriterion);
  if(item.expectedOutput)item.expectedOutput.checks=item.expectedOutput.checks.map(check=>({...check,criterion:correctCriterion(check.criterion)}));
  if(item.verification)item.verification.expectedResults=item.verification.expectedResults.map(result=>({...result,criteria:result.criteria.map(correctCriterion)}));
  return JSON.stringify(item)===JSON.stringify(source)?source:item;
 });
}
export {scopeCriterion as creationScopeCriterion};
