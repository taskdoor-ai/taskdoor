import type {LabCase,LabExpectedOutput,LabState,LabTeam} from '../../src/test-lab/types.ts';
import {expectedOutputFor} from '../../src/test-lab/expected-output.ts';
import {isTaskPreviewCase,previewCaseForEvaluation} from '../../src/test-lab/task-preview-case.ts';
import {creationCaseContentConflicts,creationAssignmentCriterion,creationMainOnlyCriterion,creationNoWriteCriterion,creationScopeCriterion,refreshCreationCaseContent} from './creation-case-content.ts';

const initialGoalCriterion='逐节点核对 goal：说明为什么做、帮助谁理解/判断/继续工作或希望改变的状态，不能只是“完成/交付+标题”的换称。目的来自本次原话、已知上下文或紧邻用途；合理用途推断须简短标为建议，不能虚构痛点或收益。实质目的未知且会影响交付边界时补问，不把猜测写成 ready 的最终目标。';
const oldGoalCriterion='仅核对已输出的候选节点；合理 needs_clarification 且 tasks 为空时，不要求虚构目标字段，检查问题及已知边界即可。候选节点的 goal 说明为什么做、帮助谁理解/判断/继续工作或希望改变的状态，不能只是“完成/交付+标题”的换称。目的来自本次原话、已知上下文或紧邻用途；合理用途推断须简短标为建议，不能虚构痛点或收益。实质目的未知且会影响交付边界时补问，不把猜测写成 ready 的最终目标。';
const goalCriterion='仅核对已输出的候选节点；合理 needs_clarification 且 tasks 为空时，不要求虚构目标字段，检查问题及已知边界即可。候选节点的 goal 说明为什么做、帮助谁理解/判断/继续工作或希望改变的状态，不能只是“完成/交付+标题”的换称。仅写“为XX提供一份准确/清晰/可使用的交付物”本身仍不够：还须说明受益对象或下游工作获得何种具体理解、判断或行动能力，或本次希望改善的明确业务状态；不要求固定句式，不由此增加访谈、效果测试或KPI。目的来自本次原话、已知上下文或紧邻用途；合理用途推断须简短标为建议，不能虚构痛点或收益。实质目的未知且会影响交付边界时补问，不把猜测写成 ready 的最终目标。';
const oldDeadlineCriterion='只生成 dueDate、不生成开始日期。合理 needs_clarification 且 tasks 为空时，不强求虚构日期或排期。已输出候选须保留用户明确日期，相对日期按 input.currentDate/timezone 换算；用户过去日期保留并提示过期风险、补问或要求修正，不能静默改成未来或视为可提交。首次未给日期时，范围清楚的有限任务默认给可修改/清空的 AI 建议，并在 warnings 对应任务说明日期和关键假设；持续维护、整体范围不定或关键外部等待无法判断时留 null 并说明。不把人工工时直接换算为日历历时，不伪称查过日历、人员空闲或排除了法定假日。';
const deadlineCriterion='只生成 dueDate、不生成开始日期。合理 needs_clarification 且 tasks 为空时，不强求虚构日期或排期。已输出候选须保留用户明确日期，相对日期按 input.currentDate/timezone 换算；用户过去日期保留并提示过期风险、补问或要求修正，不能静默改成未来或视为可提交。首次未给日期时，范围清楚的有限任务默认给可修改/清空的 AI 建议，并在 warnings 对应任务说明日期和关键假设。仅缺可补的制作规格（如尺寸或格式），而交付规模、用途明确时，不自动归类为未知外部等待；应以制作前可补齐规格等明确且可核对的条件给建议，不把条件说成已核实。持续维护、整体范围不定可留 null；若因外部等待留 null，须是输入明确关键等待时间未知且无法合理假设窗口，不能将普通可补信息当成无限等待。不把人工工时直接换算为日历历时，不伪称查过日历、人员空闲或排除了法定假日。';
const initialNoMetricsCriterion='目标表达帮助商城访客理解容量和可拆洗特点、支持选购，不是“交付主视觉”换称；标准核对一张商城可用主视觉、350ml和可拆洗杯盖清楚呈现。不新增销量、转化率或KPI，不编尺寸，不因成员职责增加源文件/多渠道物料/访谈/效果测试；不要求制作任务保证访客已理解。';
const previousNoMetricsCriterion='目标表达帮助商城访客理解容量和可拆洗特点、支持选购，不是“交付主视觉”换称；标准核对一张商城可用主视觉、350ml和可拆洗杯盖清楚呈现。不新增销量、转化率或KPI，不编尺寸；尺寸待核对可在warnings说明，不因这个可补信息阻断范围明确的方案。不因成员职责增加源文件/多渠道物料/访谈/效果测试，不要求制作任务保证访客已理解。';
const noMetricsCriterion='目标表达帮助商城访客理解容量和可拆洗特点、支持选购，不是“交付主视觉”换称；标准核对一张商城可用主视觉、350ml和可拆洗杯盖清楚呈现。不新增销量、转化率或KPI，不编尺寸；尺寸待核对可在warnings说明，不因这个可补信息阻断范围明确的方案。不因成员职责增加源文件/多渠道物料/访谈/效果测试，不要求制作任务保证访客已理解。本例是一张图的有限交付，dueDate 必须是不早于2026-10-16的有效建议日期；warnings 对应任务说明建议日期、制作前可取得商城规格等关键假设及可修改/清空性，不把假设说成已确认。不得仅因缺少商城尺寸就返回null，输入并未提供不可合理估计窗口的关键外部等待。';

// OKR informs the distinction between purpose and evidence, not a requirement to invent KPIs.
export const creationOutcomeCriteria:LabExpectedOutput['checks']=[
  {id:'creation-outcome-v1-goal',stepId:null,subject:'真实目标（O）',criterion:goalCriterion,expected:null},
  {id:'creation-outcome-v1-criteria',stepId:null,subject:'可核验的完成标准',criterion:'仅核对已输出的候选节点；合理 needs_clarification 且 tasks 为空时，不强求虚构完成标准，已知数量、范围与排除项不被改写即可。候选节点的 acceptanceCriteria 逐条说明本次结果、必要交付及可观察通过条件，覆盖原话数量、质量和排除项，不能只写高质量、专业、满意或完成任务。普通调研、制作、自检步骤放 executionTips；用户要求的独立操作结果可以验收，但操作动作本身不能证明结果。',expected:null},
  {id:'creation-outcome-v1-okr-evidence',stepId:null,subject:'OKR 结果证据与指标边界',criterion:'已有业务指标时保留提供的基线、目标值、统计对象、来源与时间窗口；没有可靠数字时允许定性或行为条件，不为 OKR 强加数字、增长率或销量承诺。区分真实业务目标、本次可控交付与实际效果证据：制作完成不等于业务效果已实现，研究交付不等于假设成立。',expected:null},
  {id:'creation-outcome-v1-scope',stepId:null,subject:'目标与标准的范围承接',criterion:creationScopeCriterion,expected:null},
  {id:'creation-main-only-v2',stepId:null,subject:'创建与独立拆解分离',criterion:creationMainOnlyCriterion,expected:null},
  {id:'creation-assignment-v2',stepId:null,subject:'按正式职责推荐整体分工',criterion:creationAssignmentCriterion,expected:null},
  {id:'creation-no-write-v2',stepId:null,subject:'方案输出与确认写入边界',criterion:creationNoWriteCriterion,expected:null},
  {id:'creation-outcome-v1-deadline',stepId:null,subject:'合理截止日期及依据',criterion:deadlineCriterion,expected:null},
  {id:'creation-outcome-v1-edit-protection',stepId:null,subject:'多轮修改与人工决定保护',criterion:'仅在存在 previousPlan 或本轮修改时核对：保留未授权改动的目标、标准、clientId、人员、日期及用户删除；改名、改文案或人员不自动重排。保留现有 dueDate，包括 null；明确清空后不因下一轮优化补回。用户明确要求改期时只调整对应日期及直接关联的旧日期表述；首次生成无 previousPlan 时此项不要求虚构历史。',expected:null},
];

const prefix='creation-outcome-v1-';
const evaluatedAt='2026-10-16T04:00:00Z';
type Scenario={key:string;name:string;prompts:string[];checks:{stepId:string;criterion:string}[]};
const scenarios:Scenario[]=[
  {key:'supplied-metrics',name:'OKR · 保留有来源的业务指标',prompts:['为团队建一项交接差错改善任务。真实目标是减少交接错误造成的返工：2026年10月交接登记表中，出现资料遗漏或错误版本的交接占全部交接的10%；希望2026年11月这一比例降至不高于3%。口径是当月有遗漏或错误版本的交接次数除以当月全部交接次数，来源为团队交接登记表，统计窗口为2026年11月1日至30日。请整理目标、可核验的完成标准和截止日期，不拆子任务，不额外承诺成本或收入变化。'],checks:[{stepId:'s1',criterion:'目标说明减少交接错误及返工的真实用途；标准保留10%基线、2026年11月不高于3%的目标、交接差错次数/全部交接次数口径、交接登记表来源和11月1日至30日窗口；dueDate=2026-11-30。不以提交改善报告替代业务结果，也不新增成本/收入指标。'}]},
  {key:'no-metrics-delivery',name:'OKR · 制作交付不虚构业务KPI',prompts:['商城展示需要帮助访客看清新品350ml容量和可拆洗杯盖，支持选购判断。只做一张商城主视觉，使用已确认的产品资料；不增加其他物料、用户访谈或效果测试，未提供商城尺寸。请生成任务方案。'],checks:[{stepId:'s1',criterion:noMetricsCriterion}]},
  {key:'unknown-purpose',name:'目标 · 目的缺失影响交付时补问',prompts:['帮我整理一批文件。我还没决定是为了方便检索、给同事交接，还是长期归档，这几种用途会改变怎么整理。现在不要擅自确定整理方式或最终交付格式，先帮我把关键目的问清楚。'],checks:[{stepId:'s1',criterion:'输出 needs_clarification，问题针对整理用途，给贴合检索/交接/归档的可选项并允许自填；不把某个用途猜成已确认目标，不编造文件种类、数量或格式。若保留候选任务，goal 明确待确认；范围未定的整体 dueDate=null，不能声称方案已可确认。'}]},
  {key:'research-evidence',name:'OKR · 验证证据不等于假设成立',prompts:['已有5份匿名用户访谈记录，本次只整理这些记录，帮助产品团队判断“找不到当前入口”是否可能是新用户卡住的原因。交付一份证据摘要，逐条标注来源，保留支持与反例，并说明样本局限；不新增招募、访谈或实验，不要求证明假设成立，也还没有成功阈值。请生成一项任务，不拆分。'],checks:[{stepId:'s1',criterion:'目标是减少入口问题原因的不确定性、支持产品判断；标准检查覆盖5份已有记录、可追溯来源、支持与反例及样本局限。不把研究完成当作假设已成立，不强设转化率/样本达标阈值，不因没有成功阈值而阻断这项证据整理，不额外增加访谈/招募/实验。'}]},
  {key:'finite-suggestion',name:'日期 · 有限小任务给有条件建议',prompts:['根据已有两页会议记录，整理本次会议纪要并共享给参会人，让大家能明确已经作出的决定和各自下一步行动。记录中已写清决定、推进人及行动项；只整理现有内容，不新增会议或审批。截止日期没定，你给一个可以修改或清空的合理建议。'],checks:[{stepId:'s1',criterion:'目标表达参会人对已作决定和下一步行动形成共同认识；标准核对决定、推进人、行动项与已有记录一致并共享给参会人。dueDate 为不早于2026-10-16的有效建议日期；warnings 对应任务说明日期、AI建议来源及安排假设，可修改/清空。不得声称已查询日历或核实人员空闲，也不能只把估算分钟除480充当排期依据。'}]},
  {key:'ongoing',name:'日期 · 持续维护没有整体硬截止',prompts:['持续维护团队常见问题，帮助成员找到当前有效答案。维护范围是已有FAQ：标出已失效答案，更新已确认变化，保留问题到有效答案的入口。作为持续工作保留，不拆成一次性小任务，不增加响应时限或业务指标。'],checks:[{stepId:'s1',criterion:'目标表达成员能够找到当前有效答案；标准核对已有FAQ的有效入口、失效标识和已确认变更。整体 dueDate=null，不人为设置季度末/30天后等结束点，不添加响应时限/KPI或擅自建立周期子任务；可提出非强制阶段回顾。'}]},
  {key:'external-wait',name:'日期 · 关键外部等待未知时留空',prompts:['建一项供应商测试报告核对任务，让采购团队能据有效报告判断这批候选产品是否满足已确认的采购要求。供应商还没有补齐报告，什么时候回复未知，也没有可比历史。收到后只核对资料版本、检测结果与现有采购要求是否一致，列出缺项；不代替采购作通过承诺，不新增检测。请给方案。'],checks:[{stepId:'s1',criterion:'目标支持采购依据有效报告判断候选产品；标准检查收到报告的版本、检测结果与已有采购要求对应及缺项。dueDate=null，说明关键外部报告等待时间未知；不把核对人工时长当作整体日历历时，不虚构供应商承诺或固定等待天数，不额外增加检测或承诺产品已通过。'}]},
  {key:'clear-then-edit',name:'日期 · 人工清空后改名不恢复',prompts:['只建一项商城主视觉任务，帮助访客理解新品350ml容量与可拆洗杯盖，标准是交付一张商城图且两项信息清楚可读。不增加物料，截止日期2026年11月6日。','把这项任务的截止日期清空，不设截止时间，其余内容不变。','只把任务名称改为“制作新品商城展示图”，其他内容不变。'],checks:[{stepId:'s1',criterion:'一项主视觉任务，目标保留访客理解用途，标准覆盖一张图、350ml和可拆洗信息；dueDate=2026-11-06。'},{stepId:'s2',criterion:'保留同一 clientId 和原目标/标准/人员，仅将 dueDate 清为 null，并移除标准/建议中直接关联的原截止表述。'},{stepId:'s3',criterion:'标题为“制作新品商城展示图”，dueDate 仍为 null；不补回原日期或另给AI日期，保留clientId、目标、标准、人员及层级。'}]},
  {key:'relative-date',name:'日期 · 相对日期按当前时区换算',prompts:['根据已有会议记录，整理一份决定与行动项纪要，让参会人知道已作决定及各自下一步。标准是决定、推进人、行动项均与记录一致，链接可共享给参会人。下周三前交付，不新增会议或审批。'],checks:[{stepId:'s1',criterion:'按本次 currentDate=2026-10-16、Asia/Shanghai（周五）将“下周三”解析为 dueDate=2026-10-21，不生成开始日期。目标保留参会人明确决定/行动的用途，标准保留记录一致性及可共享链接，不新增会议或审批。'}]},
  {key:'past-explicit-date',name:'日期 · 用户过去日期保留并提示风险',prompts:['建一项会议纪要整理任务，帮助参会人明确已作决定和行动分工。只整理现有记录，完成标准为决定、推进人和行动项与记录一致。截止2026年10月15日；这个日期已过去，先保留原要求作为候选，提示我确认如何调整，不要擅自改成未来日期。'],checks:[{stepId:'s1',criterion:'候选任务保留 dueDate=2026-10-15，明确提示相对 currentDate=2026-10-16已过期的风险，输出 needs_clarification 并针对改期/不设截止等安排补问，不能静默改成未来日期、清空或当作可提交的最终安排；保留原目标及标准范围。'}]},
];

export const creationOutcomeCaseIds=scenarios.map(scenario=>prefix+scenario.key);

function addFocusedCases(state:LabState){
  const team=state.teams.find(candidate=>candidate.id==='lab-content'&&!candidate.archived&&candidate.members.length);
  if(!team)return false;
  let changed=false;
  for(const definition of scenarios){
    const id=prefix+definition.key;
    if(state.cases.some(item=>item.id===id))continue;
    const checks:LabExpectedOutput['checks']=[...definition.checks.map((check,index)=>({id:`scenario-${index+1}`,stepId:check.stepId,subject:'本例目标、标准与日期',criterion:check.criterion,expected:null})),...structuredClone(creationOutcomeCriteria)];
    state.cases.push({id,name:definition.name,teamId:team.id,actorId:team.members[0].id,category:'目标、完成标准与截止日期',description:'用OKR的目的与结果证据区分核对任务方案；不虚构业务指标，不执行真实任务写入。',tags:['任务预览','重点：真实目标','重点：完成标准','重点：截止日期'],origin:'creation-outcome/2026-10-16',previewCriteriaVersion:1,requiresMemberContext:true,inputFormat:'natural-v1',enabled:true,archived:false,version:1,
      steps:definition.prompts.map((prompt,index)=>({id:`s${index+1}`,skillId:'agentdoor-task-planner',prompt,evaluatedAt,taskId:null,usePreviousOutput:index>0,events:[]})),assertions:[],reviewChecklist:checks.map(check=>check.criterion),expectedOutput:{version:1,checks}});
    changed=true;
  }
  return changed;
}

const oldQuantityCriterion='目标和完成标准保留20条、逐条对应、结果和核对依据。';
const quantityCriterion='完成标准保留20条记录、逐条对应交付项目、每条注明结果和核对依据；目标说明记录用于何种核对或交接，不强制重复数量。';
const initialCriteriaCriterion='acceptanceCriteria 逐条说明本次结果、必要交付及可观察通过条件，覆盖原话数量、质量和排除项，不能只写高质量、专业、满意或完成任务。普通调研、制作、自检步骤放 executionTips；用户要求的独立操作结果可以验收，但操作动作本身不能证明结果。';
const initialDeadlineCriterion='只生成 dueDate、不生成开始日期。保留用户明确日期，相对日期按 input.currentDate/timezone 换算；用户过去日期保留并提示过期风险、补问或要求修正，不能静默改成未来或视为可提交。首次未给日期时，范围清楚的有限任务默认给可修改/清空的 AI 建议，并在 warnings 对应任务说明日期和关键假设；持续维护、整体范围不定或关键外部等待无法判断时留 null 并说明。不把人工工时直接换算为日历历时，不伪称查过日历、人员空闲或排除了法定假日。';
const knownCriterionUpgrades=new Map([
  ['每条标准服务本次目标或明确要求，既不遗漏关键承诺，也不从成员职责、示例或行业习惯增加版本、素材、访谈或审批。若已有或明确要求子任务，父级保留整体目的并检查齐套，子级只验自身贡献，不把整体业务指标套给每个节点；未要求拆解时不为估算或标准另建子任务。',creationScopeCriterion],
  [oldQuantityCriterion,quantityCriterion],
  [initialGoalCriterion,goalCriterion],
  [oldGoalCriterion,goalCriterion],
  [initialCriteriaCriterion,creationOutcomeCriteria.find(check=>check.id==='creation-outcome-v1-criteria')!.criterion],
  [initialDeadlineCriterion,creationOutcomeCriteria.find(check=>check.id==='creation-outcome-v1-deadline')!.criterion],
  [oldDeadlineCriterion,deadlineCriterion],
]);
const knownNoMetricsUpgrades=new Map([[initialNoMetricsCriterion,noMetricsCriterion],[previousNoMetricsCriterion,noMetricsCriterion]]);

// Saving user imports needs the same coverage without inserting library cases or
// assigning versions; the store assigns a new version only after comparing values.
export function applyCreationOutcomeCriteria(teams:LabTeam[],cases:LabCase[]):LabCase[]{
  const activeTeams=new Set(teams.filter(team=>!team.archived).map(team=>team.id));
  const blocked=new Set(creationCaseContentConflicts(teams,cases).map(conflict=>conflict.caseId));
  return refreshCreationCaseContent(teams,cases).map(source=>{
    if(blocked.has(source.id))return source;
    if(source.archived||!source.enabled||!activeTeams.has(source.teamId)||!isTaskPreviewCase(source))return source;
    const item=previewCaseForEvaluation(source);
    const before=JSON.stringify(source);
    item.expectedOutput=structuredClone(expectedOutputFor(item));
    const correct=(text:string)=>knownCriterionUpgrades.get(text)??(item.id===prefix+'no-metrics-delivery'?knownNoMetricsUpgrades.get(text)??text:text);
    item.reviewChecklist=item.reviewChecklist.map(correct);
    item.expectedOutput.checks=item.expectedOutput.checks.map(check=>({...check,criterion:correct(check.criterion)}));
    if(item.verification)item.verification.expectedResults=item.verification.expectedResults.map(result=>({...result,criteria:result.criteria.map(correct)}));
    for(const check of creationOutcomeCriteria){
      // This controlled ID may have been deliberately edited by the user.
      // Upgrade only the exact known text, never replace or reinstate a custom goal rule.
      if(item.expectedOutput.checks.some(existing=>existing.id===check.id&&existing.criterion!==check.criterion))continue;
      if(!item.expectedOutput.checks.some(existing=>existing.id===check.id||existing.criterion===check.criterion))item.expectedOutput.checks.push(structuredClone(check));
      if(!item.reviewChecklist.includes(check.criterion))item.reviewChecklist.push(check.criterion);
    }
    return JSON.stringify(item)===before?source:item;
  });
}

// No global version shortcut: a later user import must receive the same coverage.
// Curated built-in inputs follow the current creation boundary; edited/custom inputs
// are preserved or reported as conflicts. Immutable run snapshots are never changed.
export function updateCreationOutcomeCriteria(state:LabState){
  let changed=false;
  const cases=applyCreationOutcomeCriteria(state.teams,state.cases);
  for(const [index,item] of cases.entries())if(item!==state.cases[index]){
    Object.assign(state.cases[index],item,{version:state.cases[index].version+1});changed=true;
  }
  changed=addFocusedCases(state)||changed;
  return changed;
}
