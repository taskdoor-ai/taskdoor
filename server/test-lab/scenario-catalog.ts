import type { LabAssertion, LabCase, LabEvidence, LabMember, LabStep, LabTask, LabTeam, SkillId } from '../../src/test-lab/types.ts';
import { scenarioProfiles, type ScenarioProfile } from './scenario-profiles.ts';
import { enrichVerificationPlans } from './scenario-verification.ts';

const clock='2026-09-08T10:00:00+08:00';
const skill={plan:'agentdoor-task-planner',role:'agentdoor-responsibility-advisor',status:'agentdoor-task-status-analyzer',diagnosis:'agentdoor-task-diagnostician',priority:'agentdoor-personal-priority',ewd:'agentdoor-ewd-progress'} as const;

function createJourney(team:LabTeam,p:ScenarioProfile){
  const id=(key:string)=>`${team.id}-journey-${key}`;
  const extras:LabMember[]=p.staff.map(([name,role,responsibility],index)=>({id:id(`member-${index}`),name,role,responsibilities:[responsibility.replace(/[。；]+$/,''),`本期协作范围：${p.project}。跨范围的临时支援需单独说明。`],version:1}));
  const lead=team.members[p.lead],specialist=team.members[p.specialist],reviewer=team.members[p.reviewer],coordinator=team.members[p.coordinator];
  const [documenter,analyst,finance,collaborator]=extras;
  const name=(memberId:string)=>[...team.members,...extras].find(m=>m.id===memberId)?.name??'待确认';
  const tasks:LabTask[]=[];
  function task(key:string,title:string,owner:LabMember|null,status:LabTask['status'],parent:string|null,depends:string[],criteria:string[],minutes:number|null,dueDay:number|null,participants:LabMember[]=[]){
    const t:LabTask={id:id(key),title,goal:`为${p.client}完成${title}，支撑${p.outcome}；仅处理本任务列明的结果和范围。`,createdById:lead.id,ownerId:owner?.id??null,participantIds:[...new Set(participants.map(m=>m.id))].filter(m=>m!==owner?.id),status,parentId:parent?id(parent):null,dependsOnTaskIds:depends.map(id),acceptanceCriteria:criteria,executionTips:[`使用${p.project}的当前范围及对应文件版本，发现差异先注明出处。`,'将已完成内容、待确认内容与实际等待分别记录，单项确认不扩大为整项交付。'],estimatedMinutes:minutes,dueAt:dueDay?`2026-09-${String(dueDay).padStart(2,'0')}T18:00:00+08:00`:null,tags:[],visibility:'team',version:1};
    tasks.push(t);return t;
  }
  const root=task('root',p.project,lead,'进行中',null,[],p.standards,null,15,[specialist,reviewer,coordinator]);root.goal=p.scope;root.tags=['本月交付','重点任务'];
  task('scope','确认本期交付范围与排除项',lead,'已完成','root',[],[p.scope,'客户确认的当前范围与未确认变更分开保存。'],180,4,[coordinator]);
  task('source','整理当前资料与版本目录',documenter,'已完成','root',['scope'],['每份资料包含版本、适用范围、提供人和更新时间。','旧版只作历史对照，目录不代替正文核对。'],240,5,[specialist]);
  task('draft',p.deliverables[0],specialist,'进行中','root',['scope','source'],[p.standards[0],p.conflict.required,'当前交付保留可核对正文及版本差异。'],720,9,[documenter,reviewer]);
  task('quality','完成关键项复核与补证',reviewer,'进行中','root',[],[p.standards[1],'复核结论覆盖当前对象和版本，保留缺口与原始结果。'],null,12,[analyst,specialist]);
  task('input','取得并核对当前关键输入',documenter,'进行中','root',['scope'],[p.blockage.required,'收到当前版本后核对适用对象，将有效结果交给关键项复核人员；预计回传不等于已经取得。'],180,8,[coordinator]);
  task('verify',p.blockage.work,reviewer,'已阻塞','quality',['input'],[p.blockage.required,'所需输入与当前对象匹配，核对后记录实际结论。'],360,8,[specialist,documenter]);
  task('repair',p.deliverables[1],analyst,'进行中','quality',['draft'],[p.standards[1],p.conflict.correction],600,10,[specialist,reviewer]);
  task('handoff',p.deliverables[2],coordinator,'待开始','root',['verify','repair'],[p.standards[2],'交接材料、范围和接收对象逐项核对。'],480,13,[collaborator,documenter]);
  task('launch','完成本期对外交付与接收确认',lead,'待开始','root',['handoff'],['只交付已确认的当前版本，未满足项另列处理计划。','接收方明确确认本次范围，不能把文件发出视为已接受。'],180,15,[coordinator]);
  task('review','核对当前方案与客户要求',reviewer,'进行中','root',['draft'],[p.conflict.required,'列出差异双方的内容、版本和待决定事项。'],240,8,[specialist]);
  const budget=task('commercial','核对本期商务范围与结算',finance,'进行中','root',[],['核对授权范围内的费用、付款节点和变更依据。','对外只使用已经确认且允许公开的商务口径。'],240,10,[lead]);budget.visibility='restricted';
  task('external','确认新增渠道的独立交付范围',null,'待开始','root',[],[p.extra,'范围确认后选择适合负责的人，不能为填满人员而擅自指派。'],null,null,[collaborator]);
  task('history-a',p.historical[0],specialist,'已完成',null,[],['保留该次已经确认的交付版本及具体贡献，不改写历史完成结果。'],420,1,[reviewer]);
  task('history-b',p.historical[1],specialist,'已完成',null,[],['保存本人具体承担内容和接收记录，区分团队共同成果与个人贡献。'],360,2,[documenter]);
  task('cancelled','已取消的整包重做方案',lead,'已取消',null,[],['本方案已被局部修订路径替代；仅保留取消前实际完成的资料整理记录。'],null,null,[specialist]);
  const incident=task('incident','处理当前渠道与执行异常',lead,'已阻塞',null,[],[p.risk,'完成影响范围核对、恢复或纠正，以及等待方反馈。'],240,null,[specialist,coordinator]);incident.tags=['高优先级'];
  task('waiting-a','恢复受影响工作并回应等待方',coordinator,'已阻塞',null,['incident'],['当前工作必须等异常处理结果才能恢复，记录等待与恢复时间。'],120,8,[lead]);
  task('waiting-b','确认受影响记录可以继续使用',documenter,'已阻塞',null,['incident'],['明确需要异常处理后的有效记录，复用前核对影响范围。'],120,9,[lead]);
  task('routine','归档上周例行协作记录',lead,'进行中',null,[],['整理已有记录的目录与负责人，不修改原始正文。'],90,7,[]);
  task('optional','整理可选的经验索引',collaborator,'待开始',null,[],['这是已明确的可选优化，不是本期硬性交付要求。'],null,null,[lead]);

  const evidence:LabEvidence[]=[];
  function record(key:string,taskKey:string,author:LabMember,kind:LabEvidence['kind'],title:string,content:string,day=7,hour=9,options:Partial<LabEvidence>={}){
    const e:LabEvidence={id:id(key),taskId:id(taskKey),authorId:author.id,kind,title,content,createdAt:`2026-09-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:00:00+08:00`,version:1,visibleToIds:[],...options};
    if(kind==='文件'){
      const mimeType=title.endsWith('.json')?'application/json':title.endsWith('.csv')?'text/csv':'text/markdown';
      const bytes=Buffer.from(content,'utf8');e.attachment={name:title,mimeType,size:bytes.length,dataUrl:`data:${mimeType};base64,${bytes.toString('base64')}`};
    }
    evidence.push(e);return e;
  }
  for(const t of tasks){
    const key=t.id.slice(id('').length),owner=[...team.members,...extras].find(m=>m.id===t.ownerId)??lead;
    const viewers=t.visibility==='restricted'?[finance.id,lead.id]:[];
    const content=`# ${t.title} · 工作说明\n\n项目：${p.project}\n服务对象：${p.client}\n\n## 本项结果\n${t.goal}\n\n## 完成标准\n${t.acceptanceCriteria.map((c,i)=>`${i+1}. ${c}`).join('\n')}\n\n## 分工\n| 角色 | 人员 | 本项承担 |\n| --- | --- | --- |\n| 负责人 | ${t.ownerId?name(t.ownerId):'待确定'} | ${t.ownerId?'核对本项整体结果与交接':'范围确认后再明确负责人'} |\n${t.participantIds.map(m=>`| 参与 | ${name(m)} | 按本人当前职责完成相关贡献 |`).join('\n')}\n\n## 状态与边界\n当前正式状态：${t.status}。状态本身不代替文件内容、交付覆盖和确认记录。\n${t.parentId?'属于本期任务范围，父子归属不自动产生前置等待。':'本项独立保留，不因其他任务更新而改写原始记录。'}\n\n## 下一次核对\n对照本说明及关联资料记录实际完成项；未确定的内容由负责人与相关人员核对。\n`;
    const file=record(`${key}-brief`,key,owner,'文件',`${t.title}-工作说明.md`,content,3,10,{visibleToIds:viewers});
    record(`${key}-discussion`,key,owner,'讨论',`${t.title} · 分工与范围`,`${t.ownerId?`${owner.name}：`:'范围记录：'}本项以工作说明列出的结果为边界。${t.status==='已完成'?'该项历史结果已完成，请引用既有交付，不重新创建。':t.status==='已取消'?'本方案已取消，只保留已经发生的资料整理，不再继续整包重做。':t.status==='待开始'?'当前尚未开始，不要把未来需要的资料描述成正在停工。':'请各参与人明确自己提供的结果，若需改变范围先列具体差异。'}`,4,10,{relatedEvidenceIds:[file.id],visibleToIds:viewers});
  }

  const source=record('source-index','source',documenter,'文件',`${p.project}-资料目录.csv`,'文件,适用范围,版本,来源状态\n交付范围,本期范围,v2,已确认\n方案初稿,本期第一项交付,v1,待修订\n复核记录,关键输入与核对,v1,部分资料未齐\n历史交付,上一周期,v1,仅供历史参考\n商务底稿,授权人员,v1,限定可见',5);
  const scope=record('scope-confirm','scope',lead,'确认','本期范围已确认',`${p.client}已经确认本期范围：${p.scope}新增范围需单独形成可审阅差异，不能重开已完成历史工作。`,5,11,{relatedEvidenceIds:[id('scope-brief'),source.id]});
  const old=record('draft-v1','draft',specialist,'文件',`${p.deliverables[0]}-v1.md`,`# ${p.deliverables[0]}\n\n版本：v1，当前待修订初稿。\n\n## 本次内容\n${p.scope}\n\n## 初稿中的表述\n${p.conflict.observed}\n\n## 尚待补充\n本稿尚未完成质量复核，不作为已确认的发布或交付依据。\n`,6,10,{relatedEvidenceIds:[scope.id]});
  const revised=record('draft-v2','draft',specialist,'文件',`${p.deliverables[0]}-v2.md`,`# ${p.deliverables[0]}\n\n版本：v2，替代 v1 的相关初稿表述，等待最终核对。\n\n## 已修订\n${p.conflict.correction}\n\n## 当前交付范围\n${p.scope}\n\n## 待核对项\n- [x] 目标、适用对象和资料目录已经对应。\n- [x] 已删除或标明初稿中超出依据的结论。\n- [ ] ${p.blockage.required}\n- [ ] 完成最终交接和接收确认。\n\n旧版仍保留用于差异追溯；v2 的修订不表示整项结果已验收。\n`,7,8,{supersedesId:old.id,relatedEvidenceIds:[scope.id]});
  const question=record('conflict-question','review',reviewer,'讨论','复核发现要求与旧结论不一致',`${reviewer.name}：当前要求是“${p.conflict.required}”；v1 的实际内容为“${p.conflict.observed}”。${p.conflict.impact}请说明目前哪份对外交付仍在使用旧结论。`,7,9,{relatedEvidenceIds:[old.id,id('review-brief')]});
  record('conflict-reply','review',specialist,'讨论','回复：修订稿与下游版本需要分别处理',`${specialist.name}：v2 已按要求修订，但下游交接清单尚未替换旧摘要。请保留差异，核对交接清单后再确认；不要把 v2 上传视为下游已同步。`,7,10,{replyToId:question.id,relatedEvidenceIds:[revised.id]});
  record('handoff-old','handoff',coordinator,'文件',`${p.deliverables[2]}-待同步清单.md`,`# 待同步交接清单\n\n当前范围：${p.project}\n\n## 仍在使用的旧结论\n${p.conflict.observed}\n\n## 版本核对\n清单尚未同步最新修订，当前要求是：${p.conflict.required}\n\n## 接收状态\n接收方尚未确认，不把本清单当作正式放行。\n`,7,9,{relatedEvidenceIds:[old.id]});
  const blocker=record('blockage-report','verify',reviewer,'讨论','当前工作缺少必要输入，暂时无法继续',`${p.blockage.work}已进入执行阶段。继续该工作必须使用：${p.blockage.required}。${p.blockage.missing}前置任务“取得并核对当前关键输入”尚未交付有效结果；已完成的资料目录不能替代它。当前先保留已完成核对项，等待所需输入后继续。`,7,11,{relatedEvidenceIds:[source.id,id('verify-brief'),id('input-brief')]});
  record('blockage-reply','verify',documenter,'讨论','回复：当前已取得与尚未取得的资料',`${documenter.name}：目录中的旧资料可作对照，但不能替代本次所需输入。我负责向来源方补取并核对版本；预计回传不是实际收到。`,7,12,{replyToId:blocker.id,relatedEvidenceIds:[source.id]});
  record('verify-log','verify',analyst,'文件',`${p.deliverables[1]}-核对日志.csv`,`核对项,当前记录,结论,后续\n适用对象,${p.project},已定位,保留对象编号\n关键输入,${p.blockage.required},未齐,向来源方补取\n当前工作,${p.blockage.work},无法继续,输入核对后继续\n最终结论,尚未形成,待核对,不以阶段结果替代\n`,7,13,{relatedEvidenceIds:[blocker.id]});
  record('private-ledger','commercial',finance,'文件',`${p.project}-商务底稿.md`,`# 商务底稿\n\n${p.confidential}\n\n## 预算与结算\n| 项目 | 计划金额 | 当前处理 |\n| --- | ---: | --- |\n| 本期服务与支持 | 120000 | 核对当前范围 |\n| 新增范围备选报价 | 24000 | 尚未批准 |\n\n新增报价不代表已获批准，不能写入公开交付承诺。\n\n## 授权边界\n仅本任务授权成员读取；对外只提供已确认且允许公开的信息。\n`,6,14,{visibleToIds:[finance.id,lead.id]});
  record('commercial-check','commercial',lead,'确认','商务变更仍待最终确认','已核对现有合同范围。新增报价仅用于比选，尚未批准付款或扩大交付范围。',7,14,{visibleToIds:[finance.id,lead.id],relatedEvidenceIds:[id('private-ledger')]});
  const incidentRecord=record('incident-live','incident',coordinator,'讨论','当前异常仍持续，等待协调处理',`${p.risk} ${lead.name}需要现在协调处理。两个后续任务“恢复受影响工作并回应等待方”和“确认受影响记录可以继续使用”都需要该异常的处理结果，当前仍在停等。`,8,9,{relatedEvidenceIds:[id('incident-brief')]});
  for(const key of ['waiting-a','waiting-b'])record(`${key}-wait`,key,coordinator,'讨论','明确等待：收到异常处理结果后才能恢复',`本项已开始处理，当前必须等待“处理当前渠道与执行异常”的结果，才能确认可继续使用的版本与受影响范围。${lead.name}现在可以协调处理，单纯转发旧记录不能解除等待。`,8,9,{relatedEvidenceIds:[incidentRecord.id]});
  record('routine-purpose','routine',lead,'确认','例行归档的用途与边界','本项是内部支持工作，截止时间为 9 月 7 日；没有已确认下游必需输入，也没有当前损失或等待。不改变已有正式记录。',7,8);
  record('optional-purpose','optional',lead,'确认','经验索引属于可选优化','该索引明确为可选优化，没有本期硬性交付要求，也没有指定截止时间。未安排日期不代表其他任务可以被忽略。',7,9);
  for(const [key,title,day] of [['history-a',p.historical[0],1],['history-b',p.historical[1],2]] as const){
    const delivery=record(`${key}-delivery`,key,specialist,'交付',`${title} · 已交付版本`,`${specialist.name}实际承担了本项主体内容制作与交付；${reviewer.name}负责范围核对，${documenter.name}提供资料整理。不能把共同成果全部归为负责人独立完成。`,day,15);
    record(`${key}-accepted`,key,lead,'确认',`${title} · 接收确认`,'接收方已确认当次交付范围和版本。本期可引用该历史结果，不重开已完成工作，也不自动把当次投入当成本期估算。',day,16,{relatedEvidenceIds:[delivery.id]});
  }
  record('draft-delivery','draft',specialist,'交付','修订稿已提交，最终核对仍待完成',`${specialist.name}提交 v2 供核对。实际贡献为主体内容与差异修订；资料补取和最终接收仍由对应人员处理。`,7,15,{relatedEvidenceIds:[revised.id]});
  record('source-delivery','source',documenter,'交付','当前资料目录交付','已整理来源、版本和授权范围；缺少的当前输入在核对日志中单列，目录交付不等于所有材料已齐。',7,15,{relatedEvidenceIds:[source.id]});
  const temporary=record('temporary-help','draft',collaborator,'讨论','临时协助的责任边界',`${collaborator.name}：我本次临时帮助${specialist.name}整理了两个附件目录，不负责整项专业结论，也没有接受长期承担${p.deliverables[0]}的职责。`,7,16,{relatedEvidenceIds:[revised.id]});
  record('feedback-boundary','draft',collaborator,'确认','本人纠正：目录协助不作为长期专业责任','本人已核对：本次为临时资料协助，不将其归纳为长期专业责任。后续责任建议需保留这条边界，同一份记录不重复推送。',7,17,{relatedEvidenceIds:[temporary.id]});
  for(const [i,key] of ['scope','source','draft','quality','verify','handoff'].entries())record(`${key}-activity`,key,lead,'活动',`${tasks.find(t=>t.id===id(key))!.title} · 变更记录`,i===0?'范围由初始意向更新为当前已确认版本；旧范围继续保留。':i===2?'收到修订稿 v2，关联替代 v1；任务仍为进行中，未执行自动完成。':i===4?'根据实际缺少必要输入的记录，将当前任务登记为已阻塞；补证后需重新核对。':'更新了当前工作分工与资料关联；未修改其他任务的负责人或已完成记录。',7,10+i,{relatedEvidenceIds:[id(`${key}-brief`)]});

  const estimate={taskId:id('draft'),taskVersion:1,estimateVersion:1,criteriaVersion:1,confirmed:true,unit:'minutes',estimationRuleVersion:'EWD-2026-09-08-v10',items:[
    {id:id('ewd-scope'),breakdownItem:'明确目标、范围与当前依据',criteriaRefs:[{taskId:id('draft'),index:0,text:p.standards[0]}],ewdMinutes:120,threePoint:{optimisticMinutes:60,mostLikelyMinutes:120,pessimisticMinutes:180}},
    {id:id('ewd-main'),breakdownItem:p.deliverables[0],criteriaRefs:[{taskId:id('draft'),index:1,text:p.conflict.required}],ewdMinutes:480,threePoint:{optimisticMinutes:240,mostLikelyMinutes:480,pessimisticMinutes:720}},
    {id:id('ewd-review'),breakdownItem:'核对内容并交付当前版本',criteriaRefs:[{taskId:id('draft'),index:2,text:'当前交付保留可核对正文及版本差异。'}],ewdMinutes:120,threePoint:{optimisticMinutes:60,mostLikelyMinutes:120,pessimisticMinutes:180}},
  ],totalEwdMinutes:720,personDays:1.5,scope:'当前第一项交付；不包括另列的复核、补证、对外交接任务。'};
  record('ewd-baseline','draft',lead,'文件',`${p.deliverables[0]}-预计投入基线.json`,JSON.stringify(estimate,null,2),6,15,{relatedEvidenceIds:[id('draft-brief')]});
  record('ewd-content-check','draft',reviewer,'确认','逐项内容核对：范围完整、主体八成、核对四成',`当前估算基线为 720 分钟。逐项核对：${id('ewd-scope')} 对应目标与范围已完整，进度 100%；${id('ewd-main')} 对应主体结果已完成主要内容但仍需补齐明确缺口，进度 80%；${id('ewd-review')} 对应格式检查已完成、最终内容与接收核对尚未结束，进度 40%。这是当前内容核对记录，不代表整项正式验收。`,7,16,{relatedEvidenceIds:[id('ewd-baseline'),revised.id]});
  record('ewd-history','draft',lead,'文件',`${p.deliverables[0]}-工作量历史.json`,JSON.stringify({taskId:id('draft'),points:[{at:'2026-09-05T10:00:00+08:00',totalEwdMinutes:960,completedEwdMinutes:240,unconfirmedEwdMinutes:0,inputVersions:{estimate:0},changeReasons:['初次保存估算范围']},{at:'2026-09-06T15:00:00+08:00',totalEwdMinutes:720,completedEwdMinutes:240,unconfirmedEwdMinutes:0,inputVersions:{estimate:1},changeReasons:['明确已有资料可复用，删除重复准备工作 240 分钟；完成量未增加']},{at:'2026-09-07T16:00:00+08:00',totalEwdMinutes:720,completedEwdMinutes:552,unconfirmedEwdMinutes:0,inputVersions:{estimate:1,contentCheck:1},changeReasons:['按当前文件逐项核对后更新完成量']}],note:'仅使用这三个真实记录时点，不回填其他日期；范围缩减与内容完成分开。'},null,2),7,17,{relatedEvidenceIds:[id('ewd-baseline'),id('ewd-content-check')]});

  const cases:LabCase[]=[];
  const assertion=(key:string,label:string,path:string,expected:LabAssertion['expected'],operator:LabAssertion['operator']='equals',stepId='s1'):LabAssertion=>({id:key,label,stepId,path,operator,expected});
  function step(which:keyof typeof skill,target:string|null,prompt:string,events:LabStep['events']=[],index=1):LabStep{return {id:`s${index}`,skillId:skill[which],taskId:target?id(target):null,prompt,evaluatedAt:clock,usePreviousOutput:index>1,events};}
  function scenario(key:string,title:string,category:string,actor:LabMember,steps:LabStep[],checks:string[],assertions:LabAssertion[]=[]){
    const readonly=steps.map(s=>assertion(`readonly-${s.id}`,'建议不产生业务写入',s.skillId===skill.plan?'externalEffects':'writeReceipt',s.skillId===skill.plan?'none':null,'equals',s.id));
    cases.push({id:id(key),name:`${p.project}：${title}`,category,teamId:team.id,actorId:actor.id,description:`${p.scope}\n本例重点：${checks.map(check=>check.replace(/[。；]+$/,'')).join('；')}。读取团队中相关任务、文件版本、讨论和确认后判断；时间固定为 2026 年 9 月 8 日 10:00。`,archived:false,enabled:true,version:1,steps,assertions:[...readonly,...assertions],reviewChecklist:checks,origin:'industry-journeys/2026-09'});
  }
  const cloneEvent=(key:string,patch:Partial<LabEvidence>):LabStep['events'][number]=>{
    const updated={...structuredClone(evidence.find(e=>e.id===id(key))!),...patch};
    if(updated.kind==='文件'&&updated.attachment&&patch.content!==undefined){
      const bytes=Buffer.from(updated.content,'utf8');
      updated.attachment={...updated.attachment,size:bytes.length,dataUrl:`data:${updated.attachment.mimeType};base64,${bytes.toString('base64')}`};
    }
    return {type:'evidence',evidence:updated};
  };
  const receipt:LabEvidence={id:id('input-received'),taskId:id('verify'),authorId:reviewer.id,kind:'确认',title:'当前必要输入已收到并核对',content:p.blockage.resolution,createdAt:'2026-09-08T09:30:00+08:00',version:1,visibleToIds:[],relatedEvidenceIds:[blocker.id]};

  scenario('plan-new','新增渠道交付与责任匹配','任务规划',lead,[step('plan','root',`在${p.project}下面准备一项新工作：${p.extra}先检查已有覆盖和相关资料，给出必要草稿、人员依据和预计投入。`)],[`新增的是独立结果，复用${p.deliverables[0]}的有效资料。`,'不重复历史任务，不加入范围外工作；未分配不被错误阻断。']);
  scenario('plan-reuse','复用已完成结果并保留独立缺口','查重与复用',specialist,[step('plan','root',`请再安排一次${p.historical[0]}，同时为本期补充${p.extra}。先检查现有结果与周期，说明哪些复用、哪些确有新范围。`)],[`识别已完成的${p.historical[0]}，不能整项重新创建。`,'新范围不能因发现相似任务而遗漏。']);
  scenario('plan-revise','讨论变更后的局部重规划','多轮规划',lead,[step('plan','root',`根据当前讨论，核对${p.project}的交付安排，先指出仍缺什么及可继续的工作。`),step('plan','root',`现在必要输入已补齐：${p.blockage.resolution}请只调整受影响的未完成安排，保留仍有效的日期、已完成任务和责任。`,[{type:'evidence',evidence:receipt},{type:'task_status',taskId:id('input'),status:'已完成'},{type:'task_status',taskId:id('verify'),status:'已完成'}],2)],['前轮分析与新确认分别引用。','不因一项已完成就宣告整个项目完成。','只提交实际必要差异，不重排所有任务。']);
  scenario('role-history','从两次实际交付校准本人责任','人员责任',specialist,[step('role',null,`结合${p.historical[0]}、${p.historical[1]}和本期实际贡献，核对我的当前责任，区分主体工作与他人核对或资料支持。`)],[`两项历史交付仍可作为${specialist.name}的承担依据。`,'不得按团队成员名单平均分配功劳，不做能力评分。']);
  scenario('role-temporary','临时帮助与用户纠正','多轮责任',collaborator,[step('role',null,'根据我参与的工作核对责任，特别注意临时协助与已确认的责任边界。'),step('role',null,`我再明确一次：本期只临时整理附件目录，不长期负责${p.deliverables[0]}。请重新核对建议。`,[{type:'responsibility',memberId:collaborator.id,responsibilities:[p.staff[3][2],`本期附件目录整理只是临时帮助，不长期负责${p.deliverables[0]}。`]}],2)],['用户纠正进入后续依据。','参与身份不等于整项实际承担，更新责任文本不代表接受任务。']);
  scenario('role-prepare','责任版本改变后旧建议失效','责任版本',specialist,[step('role',null,'先按当前正式责任与实际贡献整理可核对建议。'),step('role',null,'本人已经更新了责任边界，请基于新版本核对，旧候选不能覆盖当前责任，也不要声称已经写回。',[{type:'responsibility',memberId:specialist.id,responsibilities:[...specialist.responsibilities,'本期只负责明确分工中的主体交付，商务确认由对应授权人员处理。']}],2)],['回显新责任版本。','旧结果只能作为历史，不输出 applied。']);
  scenario('status-current','新版文件与正式状态分别判断','任务状态',lead,[step('status','draft',`结合 v1、v2、逐项核对记录和估算基线，说明${p.deliverables[0]}当前情况、下一步与进度。`)],[`采用 v2 的当前内容；旧版问题是否仍影响下游需分别检查。`,'完成度使用已有明细核对，不按文件数估计。'],[assertion('status','保留进行中状态','result.formalStatus','进行中'),assertion('percent','按明细加权约为 76.7%','result.progress.completionPercent',76.6,'gte'),assertion('percent-upper','不扩大完成度','result.progress.completionPercent',76.8,'lte')]);
  scenario('status-recovery','补齐输入后的单项解除与整体缺口','多轮协作',reviewer,[step('status','verify','说明当前缺少的必需输入、已做的核对和下一步。'),step('status','verify','新输入已经收到并完成本项核对。说明本项变化和仍需独立完成的项目工作。',[{type:'evidence',evidence:receipt},{type:'task_status',taskId:id('input'),status:'已完成'},{type:'task_status',taskId:id('verify'),status:'已完成'}],2)],['前后使用不同任务版本。','本项完成不扩大为整项验收。'],[assertion('after-status','事件后该项已完成','result.formalStatus','已完成','equals','s2')]);
  scenario('status-private','换人后仅使用可见文件','资料权限',collaborator,[step('status','root','概括本期可见的交付情况和我能够配合的事项；未提供的商务内容保持未知。')],['普通成员看不到商务任务和底稿。','不能推测内部报价或把缺少私有信息解释为没有成本。']);
  scenario('diagnosis-conflict','文件结论与正式要求冲突','决策冲突',reviewer,[step('diagnosis','handoff',`核对当前交接清单与要求：${p.conflict.required}。当前哪些内容不能同时成立，依据是什么？`)],[`指出待同步清单中的“${p.conflict.observed}”与当前要求。`,'不把上游 v2 修订误认为下游已同步。'],[assertion('kind','存在决策冲突','result.diagnoses.0.type','decision_conflict')]);
  scenario('diagnosis-block','必要输入缺失与实际无法继续','执行阻塞',reviewer,[step('diagnosis','verify','根据执行讨论、资料目录和核对日志判断当前是否构成执行阻塞，指出必需输入及实际影响。')],['需要实际执行、当前必需输入、尚未满足及无法继续的完整依据。'],[assertion('kind','存在执行阻塞','result.diagnoses.0.type','execution_blockage')]);
  scenario('diagnosis-resolve','冲突修订前后与正常等待','多轮诊断',reviewer,[step('diagnosis','handoff','先核对交接清单中的版本冲突及当前尚未开始的交接工作。'),step('diagnosis','handoff','交接清单已按当前要求修订；重新检查。待开始的工作正常等待前置，不能仅凭依赖未完成确诊当前停工。',[cloneEvent('handoff-old',{content:`# 当前交接清单\n\n${p.conflict.required}\n\n${p.conflict.correction}\n\n本次只完成清单修订，最终接收尚未完成。`,createdAt:'2026-09-08T09:20:00+08:00',relatedEvidenceIds:[revised.id]})],2)],['文件事件覆盖同一 ID 并提升版本。','已修订旧冲突不继续确诊，未来依赖与当前阻塞分开。']);
  scenario('priority-lead','当前损失与例行逾期的先后','我的工作',lead,[step('priority',null,'在我负责或参与的三状态任务中推荐先做什么，重点比较当前异常、已停等的协作和例行逾期。按固定规则给出分项和行动。')],['有当前持续影响和本人行动，不能把全部逾期先排完。','已完成与取消任务排除，无日期不等于不紧急。']);
  scenario('priority-specialist','执行人员视角与本人行动','人员切换',specialist,[step('priority',null,'以我的分工推荐当前应先处理什么，参与任务也要检查，但不能把负责人统筹工作全部变成我的责任。')],['本人负责和参与范围正确。','同一交付影响下游与下游当前停等分别取证。']);
  scenario('priority-change','异常解除后的重新排序','多轮排序',lead,[step('priority',null,'先按当前资料给出本人任务顺位。'),step('priority',null,'当前异常已处理，两个等待方已收到有效结果并恢复工作。请重新排序，不复用旧损失与停等信号。',[{type:'task_status',taskId:id('incident'),status:'已完成'},cloneEvent('incident-live',{kind:'确认',content:'当前异常已处理，受影响范围已核对；两个等待方已收到结果，原持续损失和停等信号失效。',createdAt:'2026-09-08T09:40:00+08:00'}),...(['waiting-a','waiting-b'] as const).flatMap(key=>[{type:'task_status' as const,taskId:id(key),status:'进行中' as const},cloneEvent(`${key}-wait`,{kind:'确认',content:'已收到异常处理后的有效结果，本项恢复执行，不再等待原异常处理。',createdAt:'2026-09-08T09:45:00+08:00'})])],2)],['完成的异常任务不继续进入待办。','旧等待记录被当前确认替代，下一步回到剩余工作。']);
  scenario('ewd-estimate','新增范围的三点估算与等待排除','EWD 估算',specialist,[step('ewd','external',`以 estimate 模式估算新增范围：${p.extra}。人工整理、制作、核对和交接分别列明；等待外部确认不计人工投入，关键条件未知的项待估。`)],[`EWD 只覆盖新增独立范围，不重复${p.deliverables[0]}的已完成部分。`,'逐项给 O/M/P、单位、标准关联和依据，不套固定 240 分钟。'],[assertion('mode','估算模式','result.mode','estimate')]);
  scenario('ewd-progress','已知完成量与核对撤销','EWD 进度',reviewer,[step('ewd','draft','使用 progress 模式，按当前估算基线及逐项内容核对计算完成量和比例。'),step('ewd','draft','一项内容核对已撤销；重算时将该项保持待确认，不把未知记为 0，也不沿用旧整体百分比。',[cloneEvent('ewd-content-check',{content:`当前 ${id('ewd-main')} 的核对因来源版本发生变化已撤销，进度待确认；${id('ewd-scope')} 仍为 100%，${id('ewd-review')} 仍为 40%。有效估算总量仍为 720 分钟。`,createdAt:'2026-09-08T09:30:00+08:00'})],2)],['首轮 720 分钟总量、552 分钟完成量。','后轮已知完成量保留，整体比例为空并列待确认明细。'],[assertion('completed','首轮完成量','result.progress.completedEwdMinutes',552),assertion('unknown','核对撤销后整体比例未知','result.progress.completionPercent',null,'equals','s2')]);
  scenario('ewd-trend','范围缩减与实际新增完成分开','EWD 趋势',lead,[step('ewd','draft','用 trend 模式读取已有三个历史时点，解释总量与完成量变化，不补画缺少日期；区分范围缩减与新完成。')],['960→720 是范围变化，完成量同期仍为 240。','后续完成量到 552 才是内容核对变化，不改写旧历史。'],[assertion('mode','趋势模式','result.mode','trend'),assertion('points','仅保留三个历史点','result.trend.points',3,'length')]);
  return {members:extras,tasks,evidence,cases};
}

/** Add a versioned scenario pack once per known team; never replace user objects or historical runs. */
export function enrichScenarioCatalog(teams:LabTeam[],cases:LabCase[]){
  let changed=false;
  const wording:Record<string,string>={
    '兼容接口通过合成回归并留有回退说明':'兼容接口通过回归验证并留有回退说明',
    '禁限词与标签文本通过合成复核':'禁限词与标签文本通过内容复核',
    '合成订单从下单到面单生成走通并留证':'订单从下单到面单生成走通并留证',
    '恢复合成服务请求处理并以证据控制客户结论':'恢复服务请求处理并以证据控制客户结论',
    '合成环境复现队列锁竞争并保留步骤':'在隔离环境复现队列锁竞争并保留步骤',
    '负责合成员工记录和薪资登记':'负责员工记录和薪资登记',
  };
  for(const team of teams){
    const profile=scenarioProfiles.find(p=>p.teamId===team.id);
    if(!profile)continue;
    for(const member of team.members){
      const cleaned=member.name.replace(/^(?:全)?合成(?:成员)?[·：:\s]*/,'');
      const responsibilities=member.responsibilities.map(value=>wording[value]??value);
      if(cleaned!==member.name||responsibilities.some((value,index)=>value!==member.responsibilities[index])){member.name=cleaned;member.responsibilities=responsibilities;member.version++;changed=true;}
    }
    for(const task of team.tasks){
      const goal=wording[task.goal]??task.goal,criteria=task.acceptanceCriteria.map(value=>wording[value]??value);
      if(goal!==task.goal||criteria.some((value,index)=>value!==task.acceptanceCriteria[index])){task.goal=goal;task.acceptanceCriteria=criteria;task.version++;changed=true;}
    }
    if(team.scenarioCatalogVersion===1)continue;
    const required=Math.max(profile.lead,profile.specialist,profile.reviewer,profile.coordinator);
    if(team.members.length<=required)continue;
    const additions=createJourney(team,profile);
    for(const member of additions.members)if(!team.members.some(m=>m.id===member.id))team.members.push(member);
    for(const task of additions.tasks)if(!team.tasks.some(t=>t.id===task.id))team.tasks.push(task);
    for(const record of additions.evidence)if(!team.evidence.some(e=>e.id===record.id))team.evidence.push(record);
    for(const item of additions.cases)if(!cases.some(c=>c.id===item.id))cases.push(item);
    if(team.description.startsWith('历史资料待迁移复核：'))team.description=`负责${profile.outcome}。本期项目：${profile.project}。${profile.scope}`;
    team.industry=profile.industry;
    team.scenarioCatalogVersion=1;changed=true;
  }
  return enrichVerificationPlans(teams,cases)||changed;
}
