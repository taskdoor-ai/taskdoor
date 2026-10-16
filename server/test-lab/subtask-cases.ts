import {isDeepStrictEqual} from 'node:util';
import type {Json, LabCase, LabEvidence, LabMember, LabState, LabTask, LabTeam} from '../../src/test-lab/types.ts';

export const subtaskCasesOrigin = 'independent-subtasks-v1';
export const subtaskCaseIds = ['remaining-visual', 'atomic-script', 'reply-and-version', 'missing-responsibilities', 'partial-children', 'depth-limit', 'multiple-remaining', 'unread-file', 'edited-plan'].map(key => `case-subtask-v1-${key}`);
const at = '2026-10-16T09:00:00+08:00';
const skillId = 'taskdoor-decompose-task' as const;
type Scope = 'current_task'|'criteria'|'existing_children'|'discussions'|'files'|'responsibilities';
type Check = {subject:string; criterion:string; expected:Json};
const scopes:Scope[] = ['current_task','criteria','existing_children','discussions','files','responsibilities'];

function savedTask(id:string, title:string, goal:string, acceptanceCriteria:string[], ownerId:string|null, parentId:string|null=null):LabTask {
  return {id,title,goal,acceptanceCriteria,status:'进行中',createdById:ownerId,ownerId,participantIds:[],parentId,dependsOnTaskIds:[],executionTips:[],estimatedMinutes:null,dueAt:null,tags:[],visibility:'team',version:3,
    criteria:{taskId:id,version:2,items:acceptanceCriteria.map((text,i)=>({id:`${id}-criterion-${i+1}`,text}))}};
}
function record(taskId:string, authorId:string, suffix:string, kind:LabEvidence['kind'], title:string, content:string, extras:Partial<LabEvidence>={}):LabEvidence {
  return {id:`${taskId}-${suffix}`,taskId,authorId,kind,title,content,createdAt:at,version:1,visibleToIds:[],readState:'read',...extras};
}
function memberFor(team:LabTeam, pattern:RegExp):LabMember|undefined {
  return team.members.find(member=>member.responsibilities.some(line=>pattern.test(line)));
}
function commonChecks():Check[] {
  return [
    {subject:'建议与实际写入边界',criterion:'只返回本次独立 Skill 的 JSON 建议，不输出创建/分配/确认成功回执，不调用外部工具，也不修改父任务、已有子任务或正式职责。',expected:{schemaVersion:'taskdoor.subtask-suggestions.v1',externalWrites:false}},
    {subject:'只生成当前下一层',criterion:'parentTaskId 为输入当前任务；suggestions 是平铺数组，没有 children、孙任务、额外汇总父任务或依赖边；所有引用属于当前快照，成员引用使用团队成员 id 而非 mcpMemberId、姓名或账号。',expected:{flatSuggestions:true,onlyInputSources:true,onlyEffectiveMemberIds:true}},
    {subject:'真实目标与可核查标准',criterion:'候选目标说明使用者或下游工作能够理解、判断或继续做什么；仅“提供准确清晰可用的材料”或标题换称不合格。完成标准核对本项可证明的交付、质量和已给范围，执行步骤放 executionTips。保留有依据的父业务目的，但不把父KPI复制为每项必达承诺，不编造销量、效率、满意度数字，不额外发明指标、用户测试、审核或材料。',expected:{goalIsPurpose:true,artifactQualityIsNotPurpose:true,criteriaAreObservable:true,ordinaryStepsAreNotCriteria:true,unprovidedBusinessMetrics:false}},
    {subject:'日期与估算的依据',criterion:'以2026-10-16及输入日期逐项判断。保留本项明确日期；有限清晰新增交付无日期时给有条件建议，warnings 对应任务、日期、假设和可改/可清空；关键外部等待无窗口或明确不设截止时留空。修改 previousPlan 未要求重排时保留当前日期、人工清空及未变 clientId，不恢复已删除候选。不得直接把人工分钟换日历、宣称核实人员日历或机械复制父日期。估算只覆盖新增工作，不重复已有交付。',expected:{currentDate:'2026-10-16',calendarClaimWithoutEvidence:false,doNotChangeParentDueDate:true,preserveUserEditedPlan:true}},
  ];
}

/** Fixtures use isolated team snapshots; existing library tasks and authored cases remain untouched. */
export function buildSubtaskCases(team:LabTeam):LabCase[] {
  const actor = team.members.find(member=>member.id==='zhou') ?? team.members[0];
  if (!actor) return [];
  const writer = memberFor(team,/脚本|文案/) ?? actor;
  const reviewer = memberFor(team,/核查|校对|审核/) ?? actor;
  const create = (key:string, name:string, parent:LabTask, tasks:LabTask[], evidence:LabEvidence[], checks:Check[], prompt:string, options:{maxTaskDepth?:number; responsibilitiesMissing?:boolean; partialChildren?:boolean; unreadFile?:boolean; status?:string;followups?:{prompt:string;checks:Check[]}[]}={}):LabCase => {
    const snapshot:LabTeam = {...structuredClone(team),tasks:structuredClone(tasks),evidence:structuredClone(evidence),maxTaskDepth:options.maxTaskDepth??10};
    if (options.responsibilitiesMissing) snapshot.members=snapshot.members.map(member=>({...member,responsibilities:[],responsibilityVersion:null}));
    const groups=[{stepId:'s1',prompt,checks:[...commonChecks(),...checks]},...(options.followups??[]).map((followup,i)=>({stepId:`s${i+2}`,prompt:followup.prompt,checks:[...commonChecks(),...followup.checks]}))];
    const allChecks=groups.flatMap(group=>group.checks);
    return {
      id:`case-subtask-v1-${key}`,name:`独立子任务 · ${name}`,category:'独立子任务建议',teamId:team.id,actorId:actor.id,description:'只在冻结业务快照中审阅一层子任务建议；模型与裁判分别记录，不连接生产或执行 MCP。',
      tags:['独立拆解','目标与标准','截止日期','本地快照'],requiresMemberContext:true,enabled:true,archived:false,version:2,origin:subtaskCasesOrigin,dataSnapshot:snapshot,
      subtaskContext:{coverage:scopes.map(scope=>({scope,status:scope==='existing_children'&&options.partialChildren?'partial':scope==='responsibilities'&&options.responsibilitiesMissing?'unavailable':scope==='files'&&options.unreadFile?'partial':'complete',reason:scope==='existing_children'&&options.partialChildren?'只取得直属子任务列表第一页，hasMore=true；续页读取失败，后续可能已有对应工作。':scope==='responsibilities'&&options.responsibilitiesMissing?'当前有效成员目录已取得，但正式职责资料未取得；权限角色与讨论自荐不能代替。':scope==='files'&&options.unreadFile?'相关最终范围附件只取得元数据，正文解析失败；不能确认其中补充物料及例外要求。':'本次授权的任务相关范围完整读取；不表示全团队历史。'}))},
      steps:groups.map((group,i)=>({id:group.stepId,skillId,taskId:parent.id,prompt:group.prompt,evaluatedAt:at,usePreviousOutput:i>0,events:[]})),
      assertions:groups.flatMap(group=>[{id:`${group.stepId}-schema`,stepId:group.stepId,label:'使用独立一层子任务协议',path:'schemaVersion',operator:'equals' as const,expected:'taskdoor.subtask-suggestions.v1'},{id:`${group.stepId}-parent`,stepId:group.stepId,label:'固定当前已保存父任务',path:'parentTaskId',operator:'equals' as const,expected:parent.id},...(options.status?[{id:`${group.stepId}-status`,stepId:group.stepId,label:'状态符合冻结场景边界',path:'status',operator:'equals' as const,expected:options.status}]:[])]),
      reviewChecklist:allChecks.map(check=>check.criterion),
      verification:{rulesVersion:1,objective:'验证已保存任务的独立拆解：真实目的与局部标准、已完成/进行中贡献查重、文件与讨论依据、正式职责及日期；每步仅建议当前下一层，不混入创建主任务流程。',preconditions:['当前任务与标准分别保留真实版本3及2；评测时点固定2026-10-16。','所有模型输入来自该用例 dataSnapshot；无步骤事件，不访问外部服务，不执行 MCP。','多轮仅把同一会话上一建议作为 previousPlan；人工修改按当前步用户要求，不能当作已保存任务或正式分派。'],expectedResults:groups.map(group=>({stepId:group.stepId,criteria:group.checks.map(check=>check.criterion)})),fixtureChecks:[{id:'parent-goal',label:'父任务目标完整冻结',subject:'task',subjectId:parent.id,path:'goal',operator:'equals',expected:parent.goal},{id:'criteria-version',label:'保留标准独立版本',subject:'task',subjectId:parent.id,path:'criteria.version',operator:'equals',expected:2}]},
      expectedOutput:{version:1,checks:groups.flatMap(group=>group.checks.map((check,i)=>({id:`subtask-${key}-${group.stepId}-check-${i+1}`,stepId:group.stepId,...check})))},
    };
  };
  const makeParent=(key:string)=>savedTask(`subtask-v1-${key}`,'准备新品商城介绍资料','让商城访客理解新品350ml容量与可拆洗杯盖特点，支持选购判断。',['交付一份商品介绍文案与一张商城主视觉。','两份资料均准确表达350ml容量与可拆洗杯盖，不新增未经确认的功能承诺。','只准备资料，不拍摄、不投放、不执行发布。'],actor.id);
  const completedCopy=(parent:LabTask)=>({...savedTask(`${parent.id}-copy`,'整理商品介绍文案','让商城访客通过文字理解新品容量与清洁方式。',['介绍文案包含350ml容量与可拆洗杯盖，表述已按产品资料核对。'],writer.id,parent.id),status:'已完成' as const});
  const brief=(parent:LabTask)=>record(parent.id,actor.id,'brief','文件','有效产品资料.md','本次商品为350ml随行杯，可拆洗杯盖；产品资料与文案已确认并可用于制作。只需文案与一张商城主视觉，不拍摄、不投放。商城画幅可在制作前补齐，外部无待确认事项。');

  const remaining=makeParent('remaining-visual');remaining.dueAt='2026-10-23';const copy=completedCopy(remaining);
  const visualCase=create('remaining-visual','已有文案只补商城图',remaining,[remaining,copy],[brief(remaining),record(copy.id,writer.id,'delivery','交付','已交付商品文案','350ml随行杯，杯盖可拆卸清洗。介绍文案已经核对并完成，父任务现有文案工作由此子任务覆盖。')],[
    {subject:'只补真实缺口',criterion:'仅建议一项商城主视觉；coveredByExisting 指向已完成文案子任务并说明覆盖。不得重做文案、把源文件/导出图拆成多个任务，或增加拍摄、投放、发布及素材审批。',expected:{suggestionCount:1,coveredTaskId:copy.id,remainingDeliverable:'商城主视觉'}},
    {subject:'目标标准与责任承接',criterion:'图片目标表达帮助访客理解容量和清洁特点以支持选购，标准检查一张商城图内两项产品信息和范围；普通画幅未给不构成必须补问。按正式视觉职责推荐负责人，职责不要求新增所有常规交付。',expected:{ownerFollowsConfirmedResponsibilities:true,productFacts:['350ml','可拆洗杯盖'],extraDeliverables:false}},
    {subject:'有限交付建议日期',criterion:'本项未指定截止，应建议2026-10-16至2026-10-23内的有效日期；warnings 对应具体图片、日期、假设制作前可补商城画幅与制作核对窗口、人员实际空闲未核实及可修改/清空。日期不要求固定为某一天，不能只因父截止存在就无说明地复制。',expected:{suggestedDueDateRequired:true,notBefore:'2026-10-16',notAfter:'2026-10-23',requiresWarning:true}},
  ],'请根据当前已保存任务、已有直属子任务及材料，只补尚未覆盖的下一层工作建议。文案已经完成，不要重做；按真实目标、可检查标准、正式职责和合理日期输出建议。',{status:'ready'});

  const atomic=savedTask('subtask-v1-atomic-script','整理一份30秒新品口播脚本','使宣传受众在30秒介绍中理解350ml容量和可拆洗杯盖的用途。',['交付一份适合30秒口播的完整脚本。','准确表达350ml容量与可拆洗杯盖，不能新增效果承诺。','不包含拍摄、配音、剪辑或投放。'],writer.id);
  const atomicCase=create('atomic-script','单一脚本不按步骤机械拆分',atomic,[atomic],[record(atomic.id,writer.id,'scope','文件','本次脚本范围.md','只有同一份30秒口播脚本，由一人制作；资料已确认。调研资料、起草、自检是同一交付的工作步骤，没有独立交接、单独验收或并行制作要求。')],[
    {subject:'单一交付无需继续拆解',criterion:'返回 no_split_needed、空 suggestions 和具体理由。不能为凑计划生成调研/起草/自检三项，也不能把父任务改名生成一个重复子任务；不改父目标、标准和日期。',expected:{status:'no_split_needed',suggestions:[],ordinaryStepsAreNotTasks:true}},
  ],'看看这个当前任务是否需要拆下一层。普通执行步骤不用拆任务，也不要重新建一份同名脚本。',{status:'no_split_needed'});

  const revised=makeParent('reply-and-version');revised.dueAt='2026-10-23';const revisedCopy=completedCopy(revised);
  const old=record(revised.id,actor.id,'brief-v1','文件','商城方案-v1.md','早期探索：商城图、门店海报、视频各一份，均写折扣20%。当前仅历史留存；不得视作现行要求。');
  const proposal=record(revised.id,writer.id,'proposal','讨论','早期范围讨论','是否做门店海报和短视频？此前v1还写了折扣20%，请确认。');
  const newest=record(revised.id,actor.id,'brief-v2','文件','商城方案-v2.md','现行确认版，明确替代v1。只交一张商城主视觉，准确表达350ml容量和可拆洗杯盖；没有促销折扣。不做门店海报、不做视频。商城图规格1080×1080。',{version:2,supersedesId:old.id});
  const decision=record(revised.id,actor.id,'confirmed-reply','确认','范围已共同确认','对上条范围问题的正式确认：本人已与内容、设计核对并确认，本轮仅补商城图，按v2的1080×1080制作，2026-10-21交图；文案沿用已完成子任务。不得恢复旧版20%折扣、门店海报或视频。',{replyToId:proposal.id,relatedEvidenceIds:[newest.id]});
  const replyCase=create('reply-and-version','直接回复决定与有效文件版本',revised,[revised,revisedCopy],[old,proposal,newest,decision],[
    {subject:'保留回复语境与明确替代关系',criterion:'读取直接原消息、已确认回复及v2正文；v2明确 supersedes v1，最终只补一项1080×1080商城图。不能把旧版20%折扣、门店海报、视频带入候选，不能按最新时间或讨论人数自行裁决。',expected:{suggestionCount:1,currentFileId:newest.id,supersededFileId:old.id,confirmedReplyId:decision.id,excluded:['20%折扣','门店海报','视频']}},
    {subject:'局部目标标准与明确子截止',criterion:'图片目标服务访客理解产品并选购，标准包含1080×1080及两项有效产品信息；dueDate 精确保留确认回复的2026-10-21，不复制父2026-10-23，也不把明确日期包装为AI预测。来源引用中至少有当前任务和真正支撑范围/日期的已提供材料，不编引用。',expected:{dueDate:'2026-10-21',ownerFollowsConfirmedResponsibilities:true,sourceEvidenceIds:[newest.id,decision.id],coveredTaskId:revisedCopy.id}},
  ],'请按已确认的直接回复与现行文件，只建议当前任务尚缺的一层子任务。保留本项明确截止，不把历史方案恢复进来。',{status:'ready'});

  const missing=savedTask('subtask-v1-missing-responsibilities','形成采购决策依据','让采购决策人能比较可用方案并判断当前采购成本是否可接受。',['交付商品方案比较表及供应商正式报价，供采购决策使用。','报价需包含含税总额、币种、适用数量与有效期；不代替审批或实际下单。'],actor.id);
  const comparison={...savedTask(`${missing.id}-comparison`,'整理商品方案比较','使采购决策人能够比较方案差异。',['两种方案关键规格和适用场景可比较。'],writer.id,missing.id),status:'已完成' as const};
  const missingCase=create('missing-responsibilities','职责缺失保留未分配与未知等待',missing,[missing,comparison],[record(missing.id,actor.id,'conditions','文件','采购条件.md','商品方案比较表已有已完成子任务。只缺供应商书面正式报价，需含含税总额、币种、适用数量及有效期。供应商回复时间未知，没有已承诺窗口；不得据此实际审批或下单。'),record(missing.id,writer.id,'volunteer','讨论','非正式协助意愿','我可以试着帮忙问问报价。这只是自荐，尚无正式职责资料，也未确认由我负责。')],[
    {subject:'不从角色或自荐伪造分工',criterion:'对供应商报价建议 ownerMemberId:null、participants:[]，assignmentReason/contextGaps 说明未取得正式职责；不能默认交父负责人、当前用户、首位成员或讨论自荐者，不能把无职责扩大为没有团队成员。职责缺失本身不阻断范围已清楚的建议。',expected:{ownerMemberId:null,participants:[],missingFormalResponsibilities:true}},
    {subject:'报价用于判断且不承诺外部结果时间',criterion:'只补正式报价，不重做已完成比较表。候选目标是让采购决策人掌握有效成本依据以作判断；标准保留含税总额、币种、数量、有效期与不下单边界。由于关键供应商回复时间未知，dueDate:null，说明具体等待，不编三天内拿到报价或供应商已承诺。',expected:{suggestionCount:1,coveredTaskId:comparison.id,dueDate:null,externalWaitUnknown:true}},
  ],'仅就当前未覆盖工作给下一层建议。正式职责尚未取得，不要从权限角色或自荐分配；供应商何时回复未知。',{responsibilitiesMissing:true});

  const partial=makeParent('partial-children');const partialCopy=completedCopy(partial);
  const partialCase=create('partial-children','子任务续页失败不宣称查重完整',partial,[partial,partialCopy],[brief(partial),record(partial.id,actor.id,'pagination','活动','授权读取覆盖记录','直属子任务仅成功读取第一页，当前可见已完成文案；返回 hasMore=true，下一页读取失败。后续页可能已经存在商城图任务。没有权限或续页正文，不可据空白断定没有。')],[
    {subject:'分页覆盖忠实表达',criterion:'status 为 partial 或 needs_clarification，contextGaps 明确直属子任务只读取第一页、续页失败及可能重复。不得 ready、声称所有子任务已读完/无重复，或把未取得续页当没有其他任务。若能建议商城图，必须是有边界的局部候选并保留查重风险；若缺口决定是否新增则补问，不能编造后续任务ID。',expected:{allowedStatuses:['partial','needs_clarification'],forbiddenStatus:'ready',existingChildrenCoverage:'partial'}},
    {subject:'有据部分不被不完整读取污染',criterion:'保留已完成文案的覆盖事实；只建议本次父范围内的商城图缺口或提出与续页查重有关的业务确认。不重做文案、不增加其他交付。任何候选目标/标准/日期仍遵守共同规则，不能把局部建议说成已经可以完整新增。',expected:{knownCoveredTaskId:partialCopy.id,fullDeduplicationClaim:false}},
  ],'直属子任务列表只取得第一页，续页失败。请只按可见材料给有依据的局部建议；缺口会影响是否新增时提出关键问题，不要声称完整查重。',{partialChildren:true});

  const ancestor=savedTask('subtask-v1-depth-root','新品资料准备','让访客能够理解本次新品的用途。',['商城介绍信息清楚可用。'],actor.id);
  const depth=makeParent('depth-limit');depth.parentId=ancestor.id;
  const depthCase=create('depth-limit','真实团队深度配额已用尽',depth,[ancestor,depth],[brief(depth)],[
    {subject:'按输入实际配额限制继续加深',criterion:'当前任务深度2，团队 maxTaskDepth:2，返回 no_split_needed 与空 suggestions。明确不能继续新增下一层；不能套默认4/10层、越过配额、建议孙任务、创建新汇总父任务或改动已有层级来规避限制。可以建议在当前任务中继续执行或由用户调整层级，不能声称所有交付已完成。',expected:{status:'no_split_needed',currentTaskDepth:2,maxTaskDepth:2,suggestions:[],meansWorkAlreadyDone:false}},
  ],'请基于当前已保存任务建议下一层工作，并遵守本次团队实际层级配额；不要改父级或自动移动任务。',{maxTaskDepth:2,status:'no_split_needed'});

  const makeMultiParent=(key:string)=>savedTask(`subtask-v1-${key}`,'准备新品门店与商城介绍资料','让商城访客和门店顾客理解新品350ml容量与可拆洗杯盖的使用方式，支持选购判断。团队希望新品首周到店购买转化率从8%提升到10%；本任务贡献是准确介绍资料，不承诺资料制作单独达成整体转化结果。',['交付一份商品介绍文案、一张商城主视觉和一份门店讲解问答单，各自可独立交接验收。','三份资料一致表达350ml容量、可拆洗杯盖及已确认使用方式，不新增性能或促销承诺。','本次不包含拍摄、投放、正式发布、培训活动或效果测试。'],actor.id);
  const multiBrief=(parent:LabTask,copyState:'进行中'|'已完成'='进行中')=>record(parent.id,actor.id,'scope','文件','现行三项资料范围.md',`商品介绍文案已有${copyState}子任务承接，范围和负责人有效，不重做。只剩一张商城主视觉与一份门店讲解问答单：视觉供商城访客看清容量和杯盖特点，问答供店员准确回答容量、清洁方式与使用边界。两项可分别制作、交接及验收；不因同一成员可能适合两项而合并。产品事实已经确认。商城图规格1080×1080；问答单只需覆盖容量、杯盖拆洗和已给使用边界，不发明问答条数。正式职责用于推荐，成员可用窗口未核实。8%到10%是团队整体业务目的背景，不作为每份资料独立承诺的验收条件。`);
  const multi=makeMultiParent('multiple-remaining');multi.dueAt='2026-10-23';
  const ongoingCopy={...completedCopy(multi),status:'进行中' as const};
  const multiCase=create('multiple-remaining','多个剩余交付与进行中去重',multi,[multi,ongoingCopy],[multiBrief(multi),record(multi.id,actor.id,'date','确认','商城图局部日期确认','商城图已确认2026-10-21交付；门店讲解问答单尚未约定本项截止，只受整体2026-10-23边界约束。')],[
    {subject:'进行中覆盖与两个独立剩余贡献',criterion:'只建议商城主视觉、门店讲解问答单两项平铺候选；coveredByExisting 指向进行中文案并说明已被承接，不能把进行中等同于完成，也不能因未完成就再建文案。两项分别说明独立使用/交接价值，不能把普通制作步骤或同一文件导出版本扩成第三项。',expected:{suggestionCount:2,coveredTaskId:ongoingCopy.id,coveredStatus:'进行中',remainingDeliverables:['商城主视觉','门店讲解问答单']}},
    {subject:'父业务目的与各项可控贡献分清',criterion:'保留父级已提供的选购判断与团队整体转化目的作为背景。视觉目标说明访客能看清产品特点，问答目标说明店员能准确回答顾客问题；两项目标不能只是交付高质量文件。各自标准检查自身信息、规格/范围且合起来覆盖两项缺口，不要求每项保证8%升到10%、统计转化率、补办培训或用户测试。',expected:{goalIsPurposeForEach:true,observableCriteriaForEach:true,parentMetric:'8%→10%',metricCopiedIntoEveryChild:false,extraMeasurementWork:false}},
    {subject:'分项日期与正式职责推荐',criterion:'商城图保留明确2026-10-21；问答单在2026-10-16至2026-10-23内给有条件建议并有可对应的警告。按两项核心交付与正式职责的语义关联推荐至多一位负责人和必要参与者，不固定姓名、目录顺序或强求不同负责人，不从职责扩出发布等新工作。',expected:{visualDueDate:'2026-10-21',answerSuggestedDueDateRequired:true,answerDateRange:['2026-10-16','2026-10-23'],ownerFollowsConfirmedResponsibilities:true,distinctOwnersRequired:false}},
  ],'当前任务已保存。商品文案已有进行中的直属任务，请保留这份有效工作，只建议尚未覆盖的一层独立交付。父级业务指标是背景，不把它复制成每项制作任务的承诺。',{status:'ready'});

  const unread=makeParent('unread-file');unread.dueAt='2026-10-23';
  unread.acceptanceCriteria.push('最终范围附件中的补充物料与例外要求，以读取并核对有效正文为准；当前正文未取得，不能假设附件没有新增要求。');
  unread.criteria!.items=unread.acceptanceCriteria.map((text,i)=>({id:`${unread.id}-criterion-${i+1}`,text}));
  const unreadCopy=completedCopy(unread);
  const unreadAttachment=record(unread.id,actor.id,'final-attachment','文件','最终验收及例外清单.pdf','',{readState:'unavailable',readReason:'只取得附件名称、类型、大小和版本；PDF正文解析失败，未读到其补充物料与例外条款。',version:4,attachment:{name:'最终验收及例外清单.pdf',mimeType:'application/pdf',size:48211,dataUrl:'data:application/pdf;base64,cGxhY2Vob2xkZXI='}});
  const unreadCase=create('unread-file','文件只有元数据不能声称读完整',unread,[unread,unreadCopy],[brief(unread),unreadAttachment],[
    {subject:'正文读取缺口决定结论边界',criterion:'必须使用 partial 或 needs_clarification，contextGaps 明确最终验收及例外清单v4的正文未取得、PDF解析失败及其可能改变新增范围。不能依据标题、附件数量、版本号或元数据猜出正文，没有“已核对全部文件”“全部要求已覆盖”“无需拆分”或ready等完整结论。',expected:{allowedStatuses:['partial','needs_clarification'],fileReadState:'unavailable',fileVersion:4,metadataIsNotBody:true,fullContextClaim:false}},
    {subject:'有据贡献保留且不虚构附件要求',criterion:'保留已完成文案覆盖；若给商城图，只作为已读资料支持的局部建议并明确未核对附件的风险；若选择补问，问题聚焦补齐有效正文或确认其是否改变本轮物料范围，给可回答的业务选项。不能凭空增加附件未读的物料、标准、审核、负责人、日期承诺或真实引用；已有普通图规格仍不能伪装为未知供应等待。',expected:{coveredTaskId:unreadCopy.id,knownRemainingDeliverable:'商城主视觉',unreadContentInvented:false,questionOrLocalSuggestion:true}},
  ],'请只建议当前任务下一层尚未覆盖的工作。最终验收及例外清单v4只能看到附件元数据，PDF正文解析失败；它可能改变补充物料范围。文件名不是正文，不要假装读过；请说明缺口并给有边界的局部建议或关键确认。',{unreadFile:true});

  const edited=makeMultiParent('edited-plan');edited.dueAt='2026-10-23';
  const editedCopy=completedCopy(edited);
  const editedCase=create('edited-plan','多轮建议保留人工日期与删除',edited,[edited,editedCopy],[multiBrief(edited,'已完成'),record(edited.id,actor.id,'dates','确认','两项初始截止确认','商城图本项截止2026-10-21，门店讲解问答单本项截止2026-10-22。文案沿用已有已完成子任务；这两个新项的日期是用户明确要求，不是AI预测。')],[
    {subject:'第一步只补两项并保留明确日期',criterion:'第一步只建议商城主视觉及门店讲解问答单，分别为2026-10-21、2026-10-22，候选有互异clientId；记录已完成文案覆盖，不生成新父任务或额外工作，不把明确日期改成AI建议。',expected:{suggestionCount:2,visualDueDate:'2026-10-21',answerDueDate:'2026-10-22',coveredTaskId:editedCopy.id,temporaryIdsUnique:true}},
  ],'请只建议商城主视觉和门店讲解问答单两项尚未覆盖的下一层工作；文案已完成。两项本项截止分别明确为2026-10-21和2026-10-22，请保留，给稳定且互异的候选clientId。',{status:'ready',followups:[
    {prompt:'继续修改上一份建议：我已决定商城主视觉不设截止，请把该候选dueDate清空为null；门店讲解问答单的本项截止由我改为2026-10-20。其余目标、标准、推荐人员和两个clientId保持，不重新估日期，不创建任何任务。',checks:[{subject:'第二步应用人工清空及改期',criterion:'同一两个候选保留上一建议clientId。商城图dueDate:null，问答单dueDate精确2026-10-20；保留两项已有目标、标准和人员，不用AI重新填回图日期、不把问答改回10-22/父10-23，不宣称已经设置正式任务截止。',expected:{suggestionCount:2,preserveClientIds:true,visualDueDate:null,answerDueDate:'2026-10-20',unrelatedFieldsPreserved:true,formalDateWritten:false}}]},
    {prompt:'在上一份已编辑建议上继续：商城主视觉只改标题为“制作新品商城展示图”，目标、标准、人员及我清空的日期保持；门店讲解问答单从本次候选删除。不要重算日期或把删除项补回来，不改父任务与已有文案。',checks:[{subject:'第三步仅改名删除且不恢复人工编辑',criterion:'最终只保留商城图同一clientId；标题精确为“制作新品商城展示图”，dueDate仍为null，沿用上一建议目标、标准和人员。问答单从suggestions删除，不用替换/重新补足/复制父标准恢复它，也不能把删除建议说成删除了真实任务。已有文案覆盖与父正式数据保持。',expected:{suggestionCount:1,visualTitle:'制作新品商城展示图',visualDueDate:null,preserveClientId:true,deletedCandidateNotRestored:true,formalTaskDeleted:false,coveredTaskId:editedCopy.id}}]},
  ]});
  return [visualCase,atomicCase,replyCase,missingCase,partialCase,depthCase,multiCase,unreadCase,editedCase];
}

const definitionKeys = ['name','category','teamId','actorId','description','tags','requiresMemberContext','inputFormat','contextMode','dataSnapshot','subtaskContext','previewCriteriaVersion','workload','creationContext','steps','assertions','reviewChecklist','verification','expectedOutput','legacyInput','legacyExpected','origin'] as const;
const sameDefinition=(left:LabCase,right:LabCase)=>definitionKeys.every(key=>isDeepStrictEqual(left[key],right[key]));

/** Pure migration plan. Only a trusted old source definition authorizes refresh;
 * a same-ID user case or any edited business/criteria content stays untouched.
 * Enable/archive choices and historical runs are never rewritten. */
export function planSubtaskCaseRefresh(currentCases:readonly LabCase[],team:LabTeam,previousDefinitions:readonly LabCase[]=[]):{cases:LabCase[];addedIds:string[];updatedIds:string[];preservedIds:string[]} {
  const definitions=buildSubtaskCases(team),byId=new Map(definitions.map(item=>[item.id,item])),previous=new Map(previousDefinitions.map(item=>[item.id,item]));
  const addedIds:string[]=[],updatedIds:string[]=[],preservedIds:string[]=[];
  const cases=currentCases.map(current=>{
    const next=byId.get(current.id);if(!next)return structuredClone(current);
    byId.delete(current.id);
    if(sameDefinition(current,next))return structuredClone(current);
    const baseline=previous.get(current.id);
    if(current.origin!==subtaskCasesOrigin||!baseline||!sameDefinition(current,baseline)){preservedIds.push(current.id);return structuredClone(current);}
    updatedIds.push(current.id);
    return {...structuredClone(next),enabled:current.enabled,archived:current.archived,version:current.version+1};
  });
  for(const definition of definitions)if(byId.has(definition.id)){addedIds.push(definition.id);cases.push(structuredClone(definition));}
  return {cases,addedIds,updatedIds,preservedIds};
}

export function addSubtaskCases(state:LabState):boolean {
  const team=state.teams.find(item=>item.id==='lab-content');
  if (!team) return false;
  const cases=buildSubtaskCases(team).filter(item=>!state.cases.some(existing=>existing.id===item.id));
  state.cases.push(...cases);
  return cases.length>0;
}
