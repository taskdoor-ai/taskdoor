import type { LabCase, LabEvidence, LabTask, LabTeam } from '../../src/test-lab/types.ts';

type Industry = {
  id: string; name: string; industry: string; description: string;
  members: [string, string, string][];
  tasks: [string, string, number, LabTask['status'], string | null, string[], string, string][];
  records: [string, number, LabEvidence['kind'], string, string, number[]?][];
  change: string;
};
const industries: Industry[] = [
  {
    id: 'lab-manufacturing', name: '启衡 X7 量产交付团队', industry: '制造与供应链',
    description: 'X7 网关首批 2,000 台交付。硬件、固件、供应商质量、工厂和客户交付共同推进；覆盖试产良率、替代物料、版本冻结及发运验收。',
    members: [
      ['顾澄', '项目经理', '交付范围、里程碑、变更升级及客户承诺；不能代替质量负责人放行'],
      ['陆骁', '硬件工程师', '电路与器件选型、设计验证、替代料兼容性'],
      ['林知夏', '固件工程师', '固件版本、升级回滚与设备日志；不负责供应商价格谈判'],
      ['陈砚', '供应商质量', '来料检验、缺陷闭环及供应商纠正措施'],
      ['周妍', '采购计划', '物料到货、供方承诺和采购预算'],
      ['谢恒', '制造工程师', '工艺、烧录、产线节拍、批次追溯和操作员培训'],
      ['孟宁', '质量负责人', '量产门禁、可靠性证据核验与出货质量放行'],
      ['方晴', '客户交付', '交付清单、客户验收窗口及安装资料'],
    ],
    tasks: [
      ['release', '完成 X7 首批 2,000 台量产交付', 0, '进行中', null, [], '按 9 月 25 日客户窗口交付可安装、可追溯的设备', '完成质量放行、序列号台账、安装包和客户签收'],
      ['pilot', '关闭 200 台试产验证问题', 5, '进行中', 'release', [], '确认产线和产品具备稳定生产条件', '首检良率达到 98%；A 类问题清零'],
      ['thermal', '复测高温断连问题', 1, '已阻塞', 'pilot', [], '定位 45℃ 下长连接中断原因并完成复测', '同批次 20 台持续运行 48 小时无复现；附完整日志'],
      ['firmware', '冻结 1.8.3 固件并验证回滚', 2, '进行中', 'pilot', [], '修复看门狗配置并验证设备可恢复', '升级和回滚各 30 台通过；发布包校验值一致'],
      ['material', '确认电源芯片替代料方案', 4, '进行中', 'release', [], '原料延期情况下保障交付且不降低规格', '替代料经硬件、质量签字；采购变更获批准'],
      ['compatibility', '完成 B 供应商电源芯片兼容性验证', 1, '待开始', 'material', [], '验证启动电流、EMC 与高温稳定性', '三项验证有原始曲线与结论'],
      ['incoming', '完成替代料批次来料检验', 3, '待开始', 'material', ['compatibility'], '识别物料一致性和批次偏差', 'IQC 报告关联批号、抽样数和不良处置'],
      ['line', '更新烧录工艺并培训两班人员', 5, '待开始', 'release', ['firmware'], '防止旧固件流入量产批次', '烧录校验、异常拦截和班组培训均留档'],
      ['trace', '打通序列号与固件批次追溯', 5, '进行中', 'line', [], '可以按 SN 回查物料批号与烧录记录', '抽取 30 台可完整回溯，导出台账无重复'],
      ['gate', '核验量产放行门禁', 6, '待开始', 'release', ['thermal', 'incoming', 'line'], '以有效测试证据作出质量放行决定', '高温复测、IQC 和工艺确认全部签署'],
      ['pack', '确认包装跌落报告和标签', 3, '已完成', 'release', [], '保证运输保护和客户资产标识', '六面跌落通过，标签与客户料号一致'],
      ['ship', '预约发运并交付安装资料', 7, '待开始', 'release', ['gate', 'pack'], '按客户到货窗口交付完整资料', '签收预约、装箱单及安装包版本确认'],
      ['quote', '审批替代料加价 3.6 万元', 0, '进行中', 'material', [], '明确加价承担方与预算授权', '采购报价、毛利影响和审批意见一致'],
      ['cancel', '取消旧版 1.8.1 烧录包投产', 2, '已取消', 'release', [], '防止旧版配置重新投入产线', '旧版发布入口关闭，工艺库只引用受控版本'],
    ],
    records: [
      ['pilot', 5, '文件', 'X7-200台试产日报-0907.csv', '批次 X7-P0907，投入 200，首检合格 192，良率 96%。不良：高温断连 5 台、烧录校验失败 3 台。返修合格不能并入首检良率。'],
      ['thermal', 1, '文件', '高温长稳测试-v1.md', '20 台、45℃、持续连接；第 11 小时 3 台断连。仅完成 24 小时采样，未满足 48 小时标准。原始日志编号 LOG-X7-0907。'],
      ['firmware', 2, '文件', '固件1.8.3验证记录-v2.md', '修改看门狗窗口 8s→15s。升级 30/30 成功，回滚 28/30 成功；两台回滚后配置丢失尚未解释。不能宣称回滚全部通过。'],
      ['thermal', 2, '讨论', '先完成固件修复再复测', '复测依赖 1.8.3 修复包，但回滚问题未关闭。今天可以整理复现日志，不能发布高温通过结论。'],
      ['material', 4, '文件', '供应商到货计划-0908.md', 'A 供应商推迟到 9 月 22 日，B 供应商可在 9 月 15 日提供 2,200 颗。B 料未完成 EMC，采购承诺不等于工程批准。'],
      ['quote', 4, '文件', '替代料价格对比-v2.csv', 'A 单价 18 元；B 单价 36 元；2,000 台增加 36,000 元。现有预算未包含这笔费用，客户未同意承担。', [0, 4]],
      ['release', 7, '讨论', '客户收货窗口不能提前', '客户仅安排 9 月 25 日 10:00–16:00 入库；安装培训可远程，但质量门禁未通过前不能承诺发货。'],
      ['gate', 6, '确认', '量产门禁要求', '维持 98% 首检良率和 48 小时高温标准。允许并行准备包装，未批准降低测试时长或先发货补报告。'],
      ['pack', 3, '交付', '包装验证交付', '六面跌落报告 PKG-X7-0828 已签字，标签文件 X7-LABEL-v3 与客户料号一致。'],
      ['trace', 5, '讨论', '追溯台账缺失项', '30 台抽查中有 4 台缺失烧录包校验值；SN、物料批号已齐，需补录后再核验。'],
    ],
    change: '新增复测记录：1.8.3 回滚 30/30 通过，20 台高温 48 小时无断连；报告由质量负责人确认。仅技术问题关闭，替代料 IQC 与量产门禁还未完成。',
  },
  {
    id: 'lab-retail', name: '木里徐汇旗舰店筹开团队', industry: '连锁零售',
    description: '9 月 26 日旗舰店开业，统筹工程移交、冷链验收、商品备货、POS、排班和会员活动；区分试营业准备与正式开业批准。',
    members: [
      ['许棠', '区域项目经理', '开业目标、跨岗位依赖、资源协调和升级决策'],
      ['江岚', '店长', '门店人员、试营业演练及现场交接'],
      ['黎川', '工程经理', '装修整改、设施移交、消防资料和承包商沟通'],
      ['顾禾', '商品计划', '首批 SKU、补货节奏和陈列库存'],
      ['赵予', '系统工程师', 'POS、支付、退款和库存接口联调'],
      ['宋沐', '会员运营', '活动权益、会员触达与核销流程'],
      ['唐宁', '食品质量', '冷链记录、设备温度校准和食安验收'],
      ['季文', '人事培训', '岗位排班、操作培训与应急演练'],
    ],
    tasks: [
      ['opening', '完成徐汇旗舰店正式开业', 0, '进行中', null, [], '9 月 26 日按核准范围营业并完成运营交接', '工程、食安、系统、库存和人员五项门禁确认'],
      ['handover', '完成工程整改和设施移交', 2, '进行中', 'opening', [], '保障门店具备安全运营条件', '整改清单闭环，移交图纸和设备台账签字'],
      ['cold', '核验冷柜温度稳定性', 6, '已阻塞', 'handover', [], '确认冷柜在满载条件持续满足内部验收标准', '连续 24 小时记录处于 0–4℃；传感器校准完成'],
      ['power', '整改冷柜独立电源回路', 2, '进行中', 'handover', [], '消除空调启停导致冷柜断电的问题', '独立回路测试通过且配电标识更新'],
      ['stock', '完成首批 380 个 SKU 备货', 3, '进行中', 'opening', [], '按陈列和首周销量准备可售库存', '数量、效期和批次齐全；生鲜满足冷链接货条件'],
      ['fresh', '预约 96 个生鲜 SKU 入库', 3, '待开始', 'stock', ['cold'], '按已验证冷藏容量接收生鲜', '到货温度、效期和入库批次均可追溯'],
      ['display', '完成常温商品陈列与价签', 1, '进行中', 'stock', [], '保证顾客可找到商品且价签正确', '常温 284 个 SKU 与 POS 售价一一对应'],
      ['system', '完成 POS 支付与退款联调', 4, '进行中', 'opening', [], '验证交易全流程和库存同步', '支付、退款、断网重传及交班结算均通过'],
      ['coupon', '修正会员券叠加规则', 5, '已阻塞', 'system', [], '确保营销权益与收银实际一致', '券互斥、退款返券和限领规则通过 12 条验收'],
      ['training', '完成两班员工操作培训', 7, '进行中', 'opening', [], '员工能够执行补货、收银及异常升级', '18 人培训留档，收银和冷链岗位完成实操'],
      ['drill', '执行试营业退款与停电演练', 1, '待开始', 'training', ['system', 'power'], '验证关键异常的现场处置', '异常记录责任人和恢复时间，未关闭项明确升级'],
      ['approval', '核对五项开业门禁', 0, '待开始', 'opening', ['handover', 'stock', 'system', 'training'], '以签字证据决定正式开业范围', '五项门禁均有负责人确认，不以排期代替验收'],
      ['budget', '核定活动预算与折扣成本', 0, '进行中', 'opening', [], '控制活动成本在已批额度内', '满减、券核销和物料合计不超过 8 万元'],
      ['poster', '完成门店活动物料', 5, '已完成', 'opening', [], '交付可用于门店的活动画面', '画面、尺寸与已批准文案一致'],
      ['cancel', '取消全店无门槛券叠加方案', 5, '已取消', 'opening', [], '避免折扣成本超出批准范围', '旧规则从活动配置中移除并留存变更记录'],
    ],
    records: [
      ['handover', 2, '文件', '徐汇店整改清单-v4.csv', '共 23 项，已关闭 20 项。未关闭：冷柜独立供电、后仓门封、应急照明标识。未签署最终工程移交。'],
      ['cold', 6, '文件', '冷柜温度记录-0908.csv', '10:00 2.1℃；12:00 2.8℃；14:00 7.2℃；14:20 6.6℃；16:00 3.4℃。14:00 空调启动引发断电。只有 6 小时记录。'],
      ['cold', 6, '讨论', '生鲜入库暂缓', '当前记录不满足内部 24 小时稳定性标准。常温陈列可以继续，生鲜到货需等电源整改和重新测温。'],
      ['stock', 3, '文件', '开业首单-v3.csv', '380 个 SKU，常温 284、生鲜 96；常温已到 268，16 个 SKU 待补。生鲜原约 9 月 12 日，可顺延一次至 9 月 15 日。'],
      ['system', 4, '文件', 'POS联调报告-v2.md', '12 条验收：9 通过；退款返券、跨日交班、断网重传待修复。库存同步 500 笔无重复；此项成功不代表全流程通过。'],
      ['coupon', 5, '讨论', '文案与系统规则不一致', '活动物料注明满 100 减 20 不与会员 9 折同享，但当前 POS 可叠加。需先修正规则，再确认物料是否需要改版。'],
      ['budget', 5, '文件', '开业活动预算-v2.csv', '券预算 5 万、物料 1.5 万、触达 1 万、临促 1.2 万，合计 8.7 万。已批准上限为 8 万，差额尚未批准。', [0, 5]],
      ['training', 7, '文件', '培训签到-0908.csv', '18 名员工，14 名完成通识；收银实操 6/8，冷链实操 2/4。排班名单不能当作实操通过记录。'],
      ['approval', 0, '确认', '正式开业确认边界', '允许先进行员工内测，不允许向顾客试售生鲜。五项门禁未完成前不对外发布正式开业公告。'],
      ['poster', 5, '交付', '活动画面交付', '门头、收银台立牌、会员券规则说明已出 PDF v3，文案标明优惠不叠加，店长核对尺寸完成。'],
    ],
    change: '工程经理提交独立回路复验，食品质量负责人确认满载 24 小时测温 1.8–3.6℃ 且传感器校准完成。允许预约生鲜入库；系统退款返券及开业五项门禁仍未完成。',
  },
];

export function industrySeed(): { teams: LabTeam[]; cases: LabCase[] } {
  const teams: LabTeam[] = []; const cases: LabCase[] = [];
  for (const spec of industries) {
    const id = (key: string) => `${spec.id}-${key}`;
    const member = (index: number) => id(`member-${index}`);
    const team: LabTeam = { id: spec.id, name: spec.name, industry: spec.industry, description: spec.description, archived: false,
      members: spec.members.map(([name, role, responsibility], index) => ({ id: member(index), name, role, responsibilities: responsibility.split('；'), version: 1 })),
      tasks: spec.tasks.map(([key, title, owner, status, parent, dependencies, goal, criterion], index) => ({
        id: id(key), title, ownerId: member(owner), createdById: member(0), participantIds: owner === 0 ? [member(1), member(6)] : [member(0)],
        status, parentId: parent ? id(parent) : null, dependsOnTaskIds: dependencies.map(id), goal, acceptanceCriteria: criterion.split('；'), executionTips: ['按最新文件和确认记录核对，缺失证据逐项保留。'],
        estimatedMinutes: index === 0 ? null : [240, 480, 960, 180][index % 4], dueAt: `2026-09-${String(Math.min(25, 10 + index)).padStart(2, '0')}T10:00:00+08:00`,
        tags: index === 0 ? ['本月交付'] : status === '已阻塞' ? ['待解阻'] : [], visibility: ['quote', 'budget'].includes(key) ? 'restricted' : 'team', version: 1,
      })),
      evidence: spec.records.map(([key, author, kind, title, content, viewers], index) => ({ id: id(`record-${index}`), taskId: id(key), authorId: member(author), kind, title, content,
        createdAt: `2026-09-08T${String(1 + index).padStart(2, '0')}:00:00.000Z`, version: 1, visibleToIds: viewers?.map(member) ?? [] })),
    };
    // The restricted record is accessible to its actual contributors as well as its owner.
    const restricted = team.tasks.find(t => t.visibility === 'restricted')!;
    const restrictedRecord = team.evidence.find(e => e.taskId === restricted.id)!;
    restricted.participantIds = restrictedRecord.visibleToIds.filter(m => m !== restricted.ownerId);
    const root = team.tasks[0], blocked = team.tasks.find(t => t.status === '已阻塞')!;
    const base: LabCase = { id: id('case-recovery'), name: `${spec.name} · 受阻、补证与重新排序`, category: '多轮协作', teamId: team.id, actorId: member(0), description: '先诊断受阻任务，再加入复测确认，最后从执行人员视角重新安排工作。只更新本次运行上下文。', archived: false, enabled: true, version: 1,
      steps: [
        { id: 's1', skillId: 'agentdoor-task-diagnostician', taskId: blocked.id, prompt: '根据文件和讨论诊断阻塞、决策冲突和可并行工作。必须区分记录缺失与已知失败，不调整门禁标准。', usePreviousOutput: false, events: [] },
        { id: 's2', skillId: 'agentdoor-task-status-analyzer', taskId: blocked.id, prompt: '结合新增确认和前次分析，说明哪些阻塞已解除、哪些依赖仍然存在。不把单项通过扩大为整个项目完成。', usePreviousOutput: true, events: [
          { type: 'evidence', evidence: { id: id('follow-up'), taskId: blocked.id, authorId: member(6), kind: '确认', title: '复验结果确认', content: spec.change, createdAt: '2026-09-09T09:00:00.000Z', version: 1, visibleToIds: [] } },
          { type: 'task_status', taskId: blocked.id, status: '已完成' },
        ] },
        { id: 's3', skillId: 'agentdoor-personal-priority', taskId: null, prompt: '根据更新后的上下文推荐我接下来应处理的任务；完成和取消的任务不纳入待办，不把他人的工作当成本人责任。', usePreviousOutput: true, events: [] },
      ], assertions: [
        { id: 's1-readonly', label: '诊断不改写正式数据', stepId: 's1', path: 'writeReceipt', operator: 'equals', expected: null },
        { id: 's2-status', label: '使用事件后的任务状态', stepId: 's2', path: 'result.formalStatus', operator: 'equals', expected: '已完成' },
        { id: 's3-actor', label: '绑定本次执行人员', stepId: 's3', path: 'principalId', operator: 'exists', expected: null },
      ], reviewChecklist: ['引用具体文件版本和动态', '区分局部问题关闭与整个项目放行', '人员切换后不引用不可见报价或预算', '不凭空给出完成率或操作回执'] };
    cases.push(base,
      { ...structuredClone(base), id: id('case-plan'), name: `${spec.name} · 缺口补齐与重复任务识别`, category: '任务规划', steps: [{ id: 's1', skillId: 'agentdoor-task-planner', taskId: root.id, prompt: '检查当前交付链，补充确实缺失的验收工作，并推荐责任人。不要重建已有任务，不把父子归属当作前置依赖，受限资料不可推测。', usePreviousOutput: false, events: [] }], assertions: [{ id: 'readonly', label: '不产生外部写入', stepId: 's1', path: 'externalEffects', operator: 'equals', expected: 'none' }] },
      { ...structuredClone(base), id: id('case-role'), name: `${spec.name} · 岗位责任与临时协助`, category: '人员责任', actorId: member(1), steps: [{ id: 's1', skillId: 'agentdoor-responsibility-advisor', taskId: null, prompt: '依据我实际负责与参与的任务核对责任范围，临时协助不等于长期职责。提出建议并说明依据，不直接更新责任。', usePreviousOutput: false, events: [] }], assertions: [{ id: 'readonly', label: '保留责任确认边界', stepId: 's1', path: 'writeReceipt', operator: 'equals', expected: null }] },
    );
    teams.push(team);
  }
  return { teams, cases };
}

export function cleanLabLabel(value: string) {
  return value.replace(/[（(](?:全)?合成[）)]/g, '').replace(/(?:全)?合成[·：:]?/g, '').replace('不对应真实个人。', '').trim();
}
