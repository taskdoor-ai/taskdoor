import type { LabCase, LabFixtureCheck, LabTeam } from '../../src/test-lab/types.ts';

const scenarios:Record<string,{objective:string;before:string[];after?:string[]}>= {
  'plan-new':{objective:'验证新增独立交付能复用已有资料，并按实际责任推荐人员。',before:['识别本期新增范围，已有交付结果继续复用。','只形成必要的任务草稿，不执行业务写入。']},
  'plan-reuse':{objective:'验证查重能保留已完成结果，同时识别同次请求中的新缺口。',before:['不重新创建已完成的历史任务。','独立的新范围有明确处理建议，不因同名或相似任务而全部拦截。']},
  'plan-revise':{objective:'验证新讨论和补证只引起必要的局部重规划。',before:['指出当前仍缺少的必需输入和可继续的工作。'],after:['基于新确认识别已完成的单项工作。','保留其他有效分工、日期和已完成结果，只提出受影响部分的差异。']},
  'role-history':{objective:'验证责任判断有具体交付贡献依据，而非仅使用岗位或参与身份。',before:['引用两次已确认交付中的具体承担。','主体制作、资料支持与他人复核分别归属，不平均分配功劳。']},
  'role-temporary':{objective:'验证临时协助不会被固化成长期责任，且本人纠正优先进入后续判断。',before:['将整理目录识别为临时协助。'],after:['保留本人明确的责任边界。','不再次推荐已被否定的长期责任，不声称已写回。']},
  'role-prepare':{objective:'验证责任版本更新后，旧建议不能覆盖当前正式责任。',before:['按当前责任与具体贡献形成可审阅建议。'],after:['返回新责任版本对应的建议。','旧输出仅作为历史，不当作当前事实或已应用结果。']},
  'status-current':{objective:'验证文件内容进展、正式状态和加权完成度分别判断。',before:['采用 v2 的有效内容，同时保留正式状态“进行中”。','720 分钟基线中已完成 552 分钟，完成比例约 76.7%。','文件上传或数量增加不直接等于完成。']},
  'status-recovery':{objective:'验证补齐关键输入只解除对应受阻项，不扩大为整体完成。',before:['识别必需输入仍缺少、当前工作无法继续。'],after:['正式状态变为“已完成”，引用本轮新确认。','项目中复核、交接和最终接收仍分别保留。']},
  'status-private':{objective:'验证普通成员的分析只使用本人可见资料。',before:['可见任务和公开资料可用于分析。','内部商务金额、私密正文及不可见引用不得进入输出；未提供的信息保持未知。']},
  'diagnosis-conflict':{objective:'验证下游仍使用旧结论时能识别当前决策冲突。',before:['诊断列表包含 decision_conflict，并提供要求与旧内容的双方依据。','不把上游 v2 修订等同于下游已经同步。']},
  'diagnosis-block':{objective:'验证只有当前必需输入缺失且工作实际无法继续才确诊执行阻塞。',before:['诊断列表包含 execution_blockage。','说明已进入执行、当前必需输入、输入未满足及实际无法继续的证据。']},
  'diagnosis-resolve':{objective:'验证冲突消除后旧诊断失效，正常等待不被误诊为停工。',before:['指出待同步清单与当前要求的冲突。'],after:['不继续确诊已修订的旧冲突。','待开始工作正常等待前置，不仅凭依赖未完成判断当前停工。']},
  'priority-lead':{objective:'验证当前损失、协作停等和本人可采取的行动能影响工作顺序。',before:['当前异常与已停等协作优先得到判断，不能先排完所有逾期事项。','已完成和已取消任务不进入待办；无日期不等于不紧急。']},
  'priority-specialist':{objective:'验证切换执行人员后，推荐只落在本人负责或参与范围及可采取的行动上。',before:['本人负责与参与的任务都被核对。','不把负责人的全部统筹工作变成本人的责任。']},
  'priority-change':{objective:'验证异常解除后重新计算顺序，不沿用旧损失和停等依据。',before:['依据当前异常和两个等待方的实际影响推荐本人行动。'],after:['已完成的异常任务排除。','等待方恢复执行后不再使用旧停等信号，排序回到剩余工作。']},
  'ewd-estimate':{objective:'验证三点估算只覆盖新增人工投入，并保留未知条件。',before:['返回 estimate 模式，逐项说明 O/M/P、单位、完成标准与依据。','不重复已有交付投入，外部等待不计人工投入，关键条件未知项待估。']},
  'ewd-progress':{objective:'验证已知完成量计算正确，核对撤销后不会把未知当成零。',before:['返回 progress 模式；总量 720 分钟、完成量 552 分钟。'],after:['保留仍有效的已知完成量。','整体 completionPercent 为 null，列明待确认项，不沿用旧比例。']},
  'ewd-trend':{objective:'验证范围缩减与实际完成增量能够分开解释。',before:['返回 trend 模式且仅有三个已提供时点。','960→720 是范围减少，同期完成量仍是 240；之后完成量到 552 才是内容完成变化。']},
};

export function enrichVerificationPlans(teams:LabTeam[],cases:LabCase[]) {
  let changed=false;
  for(const item of cases) {
    if(item.origin!=='industry-journeys/2026-09')continue;
    const prefix=`${item.teamId}-journey-`,key=item.id.slice(prefix.length),spec=scenarios[key],team=teams.find(t=>t.id===item.teamId);
    if(!spec||!team)continue;
    if(!item.verification){
      const checks:LabFixtureCheck[]=[];
      const check=(subject:LabFixtureCheck['subject'],suffix:string,path:string,expected:LabFixtureCheck['expected'],label:string,operator:LabFixtureCheck['operator']='equals')=>checks.push({id:`fixture-${checks.length+1}`,subject,subjectId:prefix+suffix,path,expected,label,operator});
      const target=team.tasks.find(t=>t.id===item.steps[0]?.taskId);
      if(target)check('task',target.id.slice(prefix.length),'status',target.status,`初始任务“${target.title}”为${target.status}`);
      if(key.includes('diagnosis')||key==='status-recovery'){
        check('task','input','status','进行中','关键输入尚未完成交付');
        check('task','verify','status','已阻塞','关键项核对当前受阻');
      }
      if(['diagnosis-conflict','diagnosis-resolve'].includes(key)){
        const file=team.evidence.find(e=>e.id===prefix+'handoff-old');
        if(file)check('evidence','handoff-old','content',file.content,'下游清单仍保留待同步内容');
      }
      if(['status-current','ewd-progress','ewd-trend'].includes(key))for(const suffix of ['ewd-baseline','ewd-content-check','ewd-history']){
        const record=team.evidence.find(e=>e.id===prefix+suffix);
        if(record)check('evidence',suffix,'content',record.content,`核对基线资料：${record.title}`);
      }
      if(key.startsWith('priority'))for(const suffix of ['incident','waiting-a','waiting-b'])check('task',suffix,'status','已阻塞','初始异常与等待方尚未恢复');
      if(key==='status-private'){
        check('task','commercial','visibility','restricted','商务任务限定人员可见');
        check('evidence','private-ledger','visibleToIds',item.actorId,'执行人员不在商务底稿授权名单','not_contains');
      }
      if(!checks.length)checks.push({id:'fixture-1',subject:'member',subjectId:item.actorId,path:'id',operator:'equals',expected:item.actorId,label:'既定执行成员仍在团队中'});
      item.verification={objective:spec.objective,preconditions:['使用本用例保存的执行人员与固定判断时间。',...checks.map(c=>c.label)],fixtureChecks:checks,expectedResults:item.steps.map((step,index)=>({stepId:step.id,criteria:index===0?spec.before:spec.after??spec.before}))};
      item.version++;changed=true;
    }
    if(item.verification.rulesVersion===1)continue;
    for(const assertion of item.assertions)if(assertion.path==='result.diagnoses.0.type'&&assertion.operator==='equals'){
      assertion.path='result.diagnoses.*.type';assertion.operator='contains';changed=true;
    }
    const add=(suffix:string,label:string,path:string,expected:LabCase['assertions'][number]['expected'],operator:LabCase['assertions'][number]['operator'],stepId:string)=>{
      const id=`contract-${suffix}-${stepId}`;
      if(!item.assertions.some(a=>a.id===id)){item.assertions.push({id,label,path,expected,operator,stepId});item.version++;changed=true;}
    };
    if(key==='priority-lead'||key==='priority-change'){
      add('incident','当前异常进入本人候选','result.rankedTasks.*.taskId',prefix+'incident','contains',item.steps[0].id);
      if(key==='priority-change'&&item.steps[1])add('resolved','异常完成后退出候选','result.rankedTasks.*.taskId',prefix+'incident','not_contains',item.steps[1].id);
    }
    if(key==='ewd-progress')for(const step of item.steps)add('mode','按进度模式判断','result.mode','progress','equals',step.id);
    if(key.startsWith('role-')){
      const actor=team.members.find(m=>m.id===item.actorId);
      if(actor){
        if(!item.verification.fixtureChecks.some(c=>c.id==='contract-member-version')){item.verification.fixtureChecks.push({id:'contract-member-version',label:'责任基准版本与场景一致',subject:'member',subjectId:actor.id,path:'version',operator:'equals',expected:actor.version});item.version++;changed=true;}
        const baseline=item.verification.fixtureChecks.find(c=>c.id==='contract-member-version')!.expected;
        if(typeof baseline==='number'){let current=baseline;for(const step of item.steps){current+=step.events.filter(e=>e.type==='responsibility'&&e.memberId===actor.id).length;add('responsibility-version','使用本轮责任版本','result.responsibilityVersion',current,'equals',step.id);}}
      }
    }
    item.verification.rulesVersion=1;changed=true;
  }
  return changed;
}
