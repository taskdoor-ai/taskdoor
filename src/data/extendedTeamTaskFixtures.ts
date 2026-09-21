import { getEffortScopeKey } from "../lib/taskEffort";
import type { TaskNode } from "./workspaceNodes";
import { workspaceRootId } from "./workspaceNodes";

export type ExtendedAdditionTeamId = "creator-commerce" | "customer-success";

type AdditionSeed = Omit<TaskNode, "kind" | "parentId" | "teamId" | "updatedAt" | "effortEstimate"> & {
  minutes?: number;
  teamId: ExtendedAdditionTeamId;
  updatedAt?: string;
  workMethod?: string;
  effortReason?: string;
};

const workspaceFolderByTeam: Record<ExtendedAdditionTeamId, string> = {
  "creator-commerce": workspaceRootId,
  "customer-success": "customer-success-workspace",
};

const createTask = (seed: AdditionSeed): TaskNode => {
  const {
    minutes,
    teamId,
    updatedAt = "今天",
    workMethod = "复用团队受控模板和既有协作工具，由负责人完成人工判断、复核与交接",
    effortReason = "根据相近交付的演练记录估算人工投入；自动处理、外部等待和无人值守运行不计入",
    ...fields
  } = seed;
  const base: TaskNode = {
    ...fields,
    kind: "task",
    parentId: workspaceFolderByTeam[teamId],
    teamId,
    updatedAt,
  };
  if (minutes === undefined) return base;
  return {
    ...base,
    effortEstimate: {
      basis: "mock",
      confirmed: false,
      minutes,
      reason: effortReason,
      scopeKey: getEffortScopeKey(base, workMethod),
      version: 1,
      workMethod,
    },
  };
};

const cc = (seed: Omit<AdditionSeed, "teamId">) => createTask({ ...seed, teamId: "creator-commerce" });
const cs = (seed: Omit<AdditionSeed, "teamId">) => createTask({ ...seed, teamId: "customer-success" });

/**
 * 内容电商新增任务池：3 棵完整项目树 + 5 项独立运营／突发工作，共 41 项。
 * 项目树只表达范围归属；dependsOnTaskIds 只表达确实消费前置产出的关系。
 */
export const creatorCommerceAdditionNodes: TaskNode[] = [
  // 秋季抗老精华首发：1 个主任务、3 个工作流、9 个可独立验收叶子任务。
  cc({ id: "ccx-serum-launch", name: "完成秋季抗老精华首发闭环", ownerId: "周岚", participantIds: ["陈默", "林洁", "高远", "梁川", "许宁", "韩序", "苏禾"], status: "进行中", goal: "在 9 月首发窗口内完成达人、内容、商品、投放与数据闭环，并守住宣称和库存边界。", completionCriteria: ["首发范围、预算和目标口径已有受控版本", "达人、内容、商品和合规门禁均形成可核对结论", "首发后数据与复盘责任已明确"], executionTips: ["父任务只汇总叶子结果，不重复累计 EWD", "平台审核和达人等待按外部等待记录"], plannedStartOn: "2026-08-18", plannedEndOn: "2026-09-18", dueAt: "9 月 18 日", labels: ["高优先级", "数据复盘"], iconName: "target", iconTone: "red" }),
  cc({ id: "ccx-serum-creator-track", name: "锁定精华首发达人合作", parentTaskId: "ccx-serum-launch", ownerId: "陈默", participantIds: ["周岚", "苏禾"], status: "进行中", goal: "形成覆盖测评、成分党和熟龄人群的可执行达人合作组合。", completionCriteria: ["名单、报价、档期和合同状态可追溯", "关键达人退出时有替补顺序"], executionTips: ["该工作流不把建联动作拆成无独立结果的任务"], plannedStartOn: "2026-08-18", plannedEndOn: "2026-09-08", dueAt: "9 月 8 日", labels: ["达人商务"], iconName: "briefcase", iconTone: "blue" }),
  cc({ id: "ccx-serum-content-track", name: "交付精华首发内容与直播方案", parentTaskId: "ccx-serum-launch", ownerId: "林洁", participantIds: ["高远", "苏禾"], status: "进行中", goal: "把已确认的产品事实转成可投放、可直播且符合平台规则的内容资产。", completionCriteria: ["核心内容均绑定通过审核的宣称矩阵", "短视频与直播资产具备版本和适用达人"], executionTips: ["父任务不替代素材逐项审核记录"], plannedStartOn: "2026-08-20", plannedEndOn: "2026-09-12", dueAt: "9 月 12 日", labels: ["内容制作", "直播执行"], iconName: "sparkles", iconTone: "purple" }),
  cc({ id: "ccx-serum-commerce-track", name: "建立精华首发交易与增长保障", parentTaskId: "ccx-serum-launch", ownerId: "梁川", participantIds: ["许宁", "韩序"], status: "进行中", goal: "让价格、库存、投放和归因围绕同一首发范围协同运行。", completionCriteria: ["价格库存与预算方案均引用同一 SKU 范围", "归因看板可解释预算调整"], executionTips: ["只在叶子交付中记录人工投入"], plannedStartOn: "2026-08-22", plannedEndOn: "2026-09-18", dueAt: "9 月 18 日", labels: ["商品运营", "投流增长"], iconName: "chart", iconTone: "cyan" }),
  cc({ id: "ccx-serum-creator-longlist", name: "签发精华达人长名单与分层依据", parentTaskId: "ccx-serum-creator-track", ownerId: "陈默", participantIds: ["韩序"], status: "已完成", goal: "基于受众、历史转化和内容适配形成可解释的达人长名单。", completionCriteria: ["不少于 24 位候选达人完成去重和风险标注", "分层依据引用近 90 天有效数据"], executionTips: ["粉丝量只作参考，不替代受众重合和历史履约"], plannedStartOn: "2026-08-18", plannedEndOn: "2026-08-22", dueAt: "8 月 22 日", labels: ["达人商务", "数据复盘"], iconName: "list-todo", iconTone: "blue", minutes: 420, updatedAt: "8 月 22 日" }),
  cc({ id: "ccx-serum-contract-close", name: "收口精华核心达人报价与合同版本", parentTaskId: "ccx-serum-creator-track", ownerId: "陈默", participantIds: ["苏禾"], dependsOnTaskIds: ["ccx-serum-creator-longlist"], status: "进行中", goal: "为核心达人形成报价、权益、排他与交付范围一致的可签版本。", completionCriteria: ["8 位核心达人商务条款已逐项核对", "合同附件与排期、素材授权范围一致", "未接受报价有替补和失效时间"], executionTips: ["口头同意不记作合同已确认"], plannedStartOn: "2026-08-22", plannedEndOn: "2026-09-03", dueAt: "9 月 3 日", labels: ["达人商务", "合规审核"], iconName: "file-check", iconTone: "amber", minutes: 660 }),
  cc({ id: "ccx-serum-creator-calendar", name: "冻结精华达人发布与直播档期", parentTaskId: "ccx-serum-creator-track", ownerId: "陈默", participantIds: ["高远"], dependsOnTaskIds: ["ccx-serum-contract-close"], status: "已阻塞", goal: "形成不冲突且满足预热、首发和追投节奏的达人档期表。", completionCriteria: ["核心达人已确认具体发布日期和时段", "直播与短视频间隔满足投放学习周期", "替补档期可在 24 小时内启用"], executionTips: ["当前等待两位核心达人回签，不把等待计入 EWD"], plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-06", dueAt: "9 月 6 日", labels: ["达人商务"], iconName: "flag", iconTone: "amber", minutes: 300 }),
  cc({ id: "ccx-serum-claim-matrix", name: "签发精华功效宣称证据矩阵", parentTaskId: "ccx-serum-content-track", ownerId: "苏禾", participantIds: ["林洁", "梁川"], status: "已完成", goal: "把检测报告、成分资料和可用表述映射为内容团队可执行的宣称边界。", completionCriteria: ["每条功效表述均有来源版本和适用条件", "禁用词、风险表述和替代表达已列明", "矩阵由合规负责人签发"], executionTips: ["不从达人历史话术反推可用宣称"], plannedStartOn: "2026-08-20", plannedEndOn: "2026-08-26", dueAt: "8 月 26 日", labels: ["合规审核", "内容制作"], iconName: "file-check", iconTone: "green", minutes: 480, updatedAt: "8 月 26 日" }),
  cc({ id: "ccx-serum-asset-batch", name: "交付精华首批短视频母版素材", parentTaskId: "ccx-serum-content-track", ownerId: "林洁", participantIds: ["苏禾"], dependsOnTaskIds: ["ccx-serum-claim-matrix"], status: "进行中", goal: "交付适配测评型与成分型达人的短视频母版、镜头清单和替换规则。", completionCriteria: ["两类母版均包含可替换段和不可修改宣称", "画面、字幕和口播已完成合规校对", "源文件、导出件和版本说明齐全"], executionTips: ["达人个性化改写仍需回到宣称矩阵核对"], plannedStartOn: "2026-08-27", plannedEndOn: "2026-09-05", dueAt: "9 月 5 日", labels: ["内容制作", "合规审核"], iconName: "sparkles", iconTone: "purple", minutes: 900 }),
  cc({ id: "ccx-serum-live-rehearsal", name: "完成精华首发直播全链路彩排", parentTaskId: "ccx-serum-content-track", ownerId: "高远", participantIds: ["林洁", "梁川", "苏禾"], dependsOnTaskIds: ["ccx-serum-asset-batch", "ccx-serum-creator-calendar"], status: "待开始", goal: "验证直播脚本、商品机制、上下架和异常切换能够按首发方案执行。", completionCriteria: ["主备链路各完成一次端到端彩排", "价格、库存和赠品口播与后台配置一致", "断流、缺货和违规提醒均有停止条件"], executionTips: ["彩排录屏和问题清单需绑定同一脚本版本"], plannedStartOn: "2026-09-07", plannedEndOn: "2026-09-10", dueAt: "9 月 10 日", labels: ["直播执行", "商品运营"], iconName: "clipboard-check", iconTone: "amber", minutes: 540 }),
  cc({ id: "ccx-serum-price-stock", name: "冻结精华首发价格与库存分配", parentTaskId: "ccx-serum-commerce-track", ownerId: "梁川", participantIds: ["周岚", "高远"], status: "已完成", goal: "为自播、达人直播和短视频渠道冻结可履约的价格与库存边界。", completionCriteria: ["各渠道到手价无倒挂且审批可追溯", "首批 12,000 件库存按渠道和时间窗分配", "缺货阈值与补货责任人已确认"], executionTips: ["平台券变化通过下一版本调整，不覆盖冻结记录"], plannedStartOn: "2026-08-22", plannedEndOn: "2026-08-29", dueAt: "8 月 29 日", labels: ["商品运营"], iconName: "list-todo", iconTone: "green", minutes: 420, updatedAt: "8 月 29 日" }),
  cc({ id: "ccx-serum-budget-gate", name: "核准精华首发投流预算与止损线", parentTaskId: "ccx-serum-commerce-track", ownerId: "许宁", participantIds: ["周岚", "韩序"], dependsOnTaskIds: ["ccx-serum-price-stock", "ccx-serum-asset-batch"], status: "进行中", goal: "依据毛利、素材供给和人群规模形成分阶段预算与止损条件。", completionCriteria: ["冷启、放量和追投预算分别有触发条件", "ROI 与消耗异常的停止线可自动监测", "追加预算仍需负责人书面决定"], executionTips: ["达人自然流量不计为已购买曝光"], plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-08", dueAt: "9 月 8 日", labels: ["投流增长", "高优先级"], iconName: "chart", iconTone: "red", minutes: 480 }),
  cc({ id: "ccx-serum-attribution-board", name: "上线精华首发归因与库存联动看板", parentTaskId: "ccx-serum-commerce-track", ownerId: "韩序", participantIds: ["许宁", "梁川"], dependsOnTaskIds: ["ccx-serum-budget-gate"], status: "待开始", goal: "让团队按同一口径查看达人、素材、投放、成交和库存变化。", completionCriteria: ["渠道、达人和素材编码可贯通", "GMV、退款、投放和库存更新时间已标明", "异常数据保留缺失状态而非回填为零"], executionTips: ["首日延迟归因需与实时成交分开显示"], plannedStartOn: "2026-09-08", plannedEndOn: "2026-09-14", dueAt: "9 月 14 日", labels: ["数据复盘", "投流增长"], iconName: "chart", iconTone: "cyan", minutes: 600 }),

  // 双十一预售：与首发项目通过已验收的归因结果建立真实跨项目依赖。
  cc({ id: "ccx-double11-presale", name: "完成双十一预售商品与履约准备", ownerId: "周岚", participantIds: ["梁川", "许宁", "韩序", "高远", "林洁"], status: "待开始", goal: "基于已验证销售与库存事实完成双十一预售选品、投放和履约准备。", completionCriteria: ["预售商品、预算和履约能力使用同一预测版本", "高风险 SKU 有降级或退出方案", "预售首日的监控与决策责任明确"], executionTips: ["父任务不汇总未经估算的远期活动", "只纳入已有经营边界内的预售范围"], plannedStartOn: "2026-09-15", plannedEndOn: "2026-10-20", dueAt: "10 月 20 日", labels: ["商品运营", "高优先级"], iconName: "target", iconTone: "red" }),
  cc({ id: "ccx-double11-assortment-track", name: "形成双十一预售商品组合", parentTaskId: "ccx-double11-presale", ownerId: "梁川", participantIds: ["韩序", "苏禾"], status: "待开始", goal: "按利润、库存、退款和宣称风险形成可执行商品组合。", completionCriteria: ["入选、观察和退出 SKU 均有理由", "组合边界经商品与合规复核"], executionTips: ["历史爆款不自动进入本期组合"], plannedStartOn: "2026-09-15", plannedEndOn: "2026-09-30", dueAt: "9 月 30 日", labels: ["商品运营", "合规审核"], iconName: "list-todo", iconTone: "blue" }),
  cc({ id: "ccx-double11-growth-track", name: "准备双十一预售获客计划", parentTaskId: "ccx-double11-presale", ownerId: "许宁", participantIds: ["韩序", "林洁"], status: "待开始", goal: "形成按人群、素材和渠道分阶段验证的获客计划。", completionCriteria: ["预算、素材供给和实验窗口相互匹配", "止损条件可以从看板读取"], executionTips: ["父任务不预估渠道自动投放时间"], plannedStartOn: "2026-09-20", plannedEndOn: "2026-10-12", dueAt: "10 月 12 日", labels: ["投流增长", "内容制作"], iconName: "chart", iconTone: "purple" }),
  cc({ id: "ccx-double11-fulfillment-track", name: "验证双十一预售履约韧性", parentTaskId: "ccx-double11-presale", ownerId: "梁川", participantIds: ["高远", "周岚"], status: "待开始", goal: "验证峰值下单、锁库、赠品和客服升级路径能承受预售首日压力。", completionCriteria: ["压力假设与商品预测版本一致", "故障演练结果有责任人和关闭期限"], executionTips: ["仓配系统无人值守压测时长不计 EWD"], plannedStartOn: "2026-09-25", plannedEndOn: "2026-10-18", dueAt: "10 月 18 日", labels: ["商品运营", "直播执行"], iconName: "clipboard-check", iconTone: "amber" }),
  cc({ id: "ccx-double11-segment-replay", name: "复算双十一候选人群的历史贡献", parentTaskId: "ccx-double11-assortment-track", ownerId: "韩序", participantIds: ["许宁"], dependsOnTaskIds: ["ccx-serum-attribution-board"], status: "待开始", goal: "利用精华首发已统一的归因口径复算候选人群的增量成交和退款表现。", completionCriteria: ["复算引用精华归因看板的冻结口径", "自然成交、付费增量和退款分别呈现", "低样本分组标注不确定性"], executionTips: ["该依赖跨项目，因为本任务直接消费首发归因结果"], plannedStartOn: "2026-09-15", plannedEndOn: "2026-09-19", dueAt: "9 月 19 日", labels: ["数据复盘", "投流增长"], iconName: "chart", iconTone: "cyan", minutes: 480 }),
  cc({ id: "ccx-double11-margin-review", name: "核对双十一候选 SKU 边际利润", parentTaskId: "ccx-double11-assortment-track", ownerId: "梁川", participantIds: ["韩序"], dependsOnTaskIds: ["ccx-double11-segment-replay"], status: "待开始", goal: "在平台券、佣金、投流和退款假设下核对候选 SKU 的边际利润。", completionCriteria: ["成本项与数据版本可追溯", "三种退款情景下均给出利润区间", "亏损 SKU 有退出或限量建议"], executionTips: ["不以 GMV 排名替代利润判断"], plannedStartOn: "2026-09-19", plannedEndOn: "2026-09-24", dueAt: "9 月 24 日", labels: ["商品运营", "数据复盘"], iconName: "chart", iconTone: "amber", minutes: 420 }),
  cc({ id: "ccx-double11-assortment-gate", name: "签发双十一预售选品结论", parentTaskId: "ccx-double11-assortment-track", ownerId: "周岚", participantIds: ["梁川", "苏禾"], dependsOnTaskIds: ["ccx-double11-margin-review"], status: "待开始", goal: "冻结预售入选商品、退出项和待观察项及其边界。", completionCriteria: ["每个 SKU 有利润、库存和合规结论", "观察项设置最晚决策时间", "选品版本由负责人签发"], executionTips: ["签发后新增 SKU 进入下一版本而非覆盖记录"], plannedStartOn: "2026-09-25", plannedEndOn: "2026-09-30", dueAt: "9 月 30 日", labels: ["商品运营", "高优先级"], iconName: "file-check", iconTone: "red", minutes: 300 }),
  cc({ id: "ccx-double11-audience-suppression", name: "建立双十一投放排除人群规则", parentTaskId: "ccx-double11-growth-track", ownerId: "许宁", participantIds: ["韩序", "苏禾"], dependsOnTaskIds: ["ccx-double11-segment-replay"], status: "待开始", goal: "减少已购、高退款和不适用人群的重复触达与浪费。", completionCriteria: ["排除条件绑定可用字段和刷新频率", "敏感字段使用符合合规边界", "小规模回放验证无大面积误伤"], executionTips: ["排除规则变更需保留生效时间和版本"], plannedStartOn: "2026-09-22", plannedEndOn: "2026-09-28", dueAt: "9 月 28 日", labels: ["投流增长", "合规审核"], iconName: "list-todo", iconTone: "green", minutes: 360 }),
  cc({ id: "ccx-double11-creative-matrix", name: "交付双十一分人群素材矩阵", parentTaskId: "ccx-double11-growth-track", ownerId: "林洁", participantIds: ["许宁", "苏禾"], dependsOnTaskIds: ["ccx-double11-audience-suppression", "ccx-double11-assortment-gate"], status: "待开始", goal: "为核心人群与选品组合交付差异化素材主题、证据和投放规格。", completionCriteria: ["每个人群至少有两个可比较创意方向", "商品卖点与合规证据一致", "素材编码可回传归因"], executionTips: ["同一画面尺寸适配不拆成独立任务"], plannedStartOn: "2026-09-29", plannedEndOn: "2026-10-07", dueAt: "10 月 7 日", labels: ["内容制作", "投流增长"], iconName: "sparkles", iconTone: "purple", minutes: 780 }),
  cc({ id: "ccx-double11-channel-budget", name: "冻结双十一渠道预算与迁移条件", parentTaskId: "ccx-double11-growth-track", ownerId: "许宁", participantIds: ["周岚", "韩序"], dependsOnTaskIds: ["ccx-double11-creative-matrix"], status: "待开始", goal: "按素材供给、边际利润和增量回报冻结渠道预算及迁移规则。", completionCriteria: ["渠道初始预算与最高暴露清晰", "跨渠道迁移条件使用统一指标", "人工审批点和自动规则分开记录"], executionTips: ["不把平台建议预算视为团队批准"], plannedStartOn: "2026-10-08", plannedEndOn: "2026-10-12", dueAt: "10 月 12 日", labels: ["投流增长", "高优先级"], iconName: "chart", iconTone: "red", minutes: 420 }),
  cc({ id: "ccx-double11-stock-stress", name: "完成双十一锁库与超卖压力验证", parentTaskId: "ccx-double11-fulfillment-track", ownerId: "梁川", participantIds: ["韩序"], dependsOnTaskIds: ["ccx-double11-assortment-gate"], status: "待开始", goal: "验证峰值并发下库存扣减、回补和渠道隔离不会造成不可控超卖。", completionCriteria: ["压力模型覆盖预售首小时峰值", "锁库失败、超时和回补均有可核对结果", "超卖阈值与下架动作已验证"], executionTips: ["自动压测只计算场景设计与结果复核时间"], plannedStartOn: "2026-10-01", plannedEndOn: "2026-10-09", dueAt: "10 月 9 日", labels: ["商品运营", "数据复盘"], iconName: "chart", iconTone: "amber", minutes: 600 }),
  cc({ id: "ccx-double11-service-macro", name: "签发双十一预售客服处理口径", parentTaskId: "ccx-double11-fulfillment-track", ownerId: "高远", participantIds: ["梁川", "苏禾"], dependsOnTaskIds: ["ccx-double11-assortment-gate"], status: "待开始", goal: "为预售延迟、赠品、改址和退款问题形成一致且不过度承诺的处理口径。", completionCriteria: ["高频问题均有可执行回复和升级条件", "承诺时效与真实履约边界一致", "客服宏通过商品和合规复核"], executionTips: ["不在库存未知时承诺具体发货批次"], plannedStartOn: "2026-10-02", plannedEndOn: "2026-10-10", dueAt: "10 月 10 日", labels: ["内容制作", "合规审核"], iconName: "clipboard-check", iconTone: "blue", minutes: 360 }),
  cc({ id: "ccx-double11-fulfillment-drill", name: "组织双十一预售异常桌面演练", parentTaskId: "ccx-double11-fulfillment-track", ownerId: "高远", participantIds: ["周岚", "梁川", "许宁"], dependsOnTaskIds: ["ccx-double11-stock-stress", "ccx-double11-service-macro", "ccx-double11-channel-budget"], status: "待开始", goal: "验证超卖、券错价、素材下架和直播中断时的决策与对客路径。", completionCriteria: ["四类故障均完成角色演练", "每个动作有停止条件和对客口径", "未通过项有负责人和关闭日期"], executionTips: ["演练通过不替代真实首日监控"], plannedStartOn: "2026-10-13", plannedEndOn: "2026-10-18", dueAt: "10 月 18 日", labels: ["直播执行", "高优先级"], iconName: "clipboard-check", iconTone: "red", minutes: 480 }),

  // 达人池治理：周期性运营树，和双十一项目共享人群结论但不复制项目任务。
  cc({ id: "ccx-creator-pool-governance", name: "完成九月达人池质量治理", ownerId: "陈默", participantIds: ["韩序", "苏禾", "周岚"], status: "进行中", goal: "清理身份、履约和授权风险，形成可用于后续活动的健康达人池。", completionCriteria: ["身份、授权和绩效口径均完成核对", "续约、观察和退出名单有可追溯依据", "治理结果具备下一周期复用边界"], executionTips: ["不因一次低转化直接淘汰达人", "父任务汇总叶子结果"], plannedStartOn: "2026-08-25", plannedEndOn: "2026-09-30", dueAt: "9 月 30 日", labels: ["达人商务", "数据复盘"], iconName: "target", iconTone: "purple" }),
  cc({ id: "ccx-creator-pool-data-track", name: "修复达人池身份与绩效底账", parentTaskId: "ccx-creator-pool-governance", ownerId: "韩序", participantIds: ["陈默", "苏禾"], status: "进行中", goal: "建立去重、可追溯且保留数据缺口的达人基础与绩效记录。", completionCriteria: ["跨平台身份和合同主体可以对应", "缺失绩效不回填为零"], executionTips: ["合并身份需保留原记录映射"], plannedStartOn: "2026-08-25", plannedEndOn: "2026-09-12", dueAt: "9 月 12 日", labels: ["数据复盘", "合规审核"], iconName: "chart", iconTone: "cyan" }),
  cc({ id: "ccx-creator-pool-decision-track", name: "形成达人续约与扩充决策", parentTaskId: "ccx-creator-pool-governance", ownerId: "陈默", participantIds: ["周岚", "韩序"], status: "待开始", goal: "基于清理后的证据形成续约、观察、退出与新增垂类建议。", completionCriteria: ["每项建议有适用活动和证据边界", "执行名单经负责人审核"], executionTips: ["推荐不等于达人已接受合作"], plannedStartOn: "2026-09-10", plannedEndOn: "2026-09-30", dueAt: "9 月 30 日", labels: ["达人商务", "高优先级"], iconName: "briefcase", iconTone: "blue" }),
  cc({ id: "ccx-creator-identity-merge", name: "合并达人跨平台重复身份", parentTaskId: "ccx-creator-pool-data-track", ownerId: "韩序", participantIds: ["陈默"], status: "已完成", goal: "将同一达人在抖音、视频号和合同系统的身份映射为稳定记录。", completionCriteria: ["重复候选均经过人工复核", "原平台账号和合同主体映射可追溯", "无法确认的身份保持分离"], executionTips: ["昵称相同不能单独作为合并依据"], plannedStartOn: "2026-08-25", plannedEndOn: "2026-08-29", dueAt: "8 月 29 日", labels: ["数据复盘", "达人商务"], iconName: "list-todo", iconTone: "green", minutes: 360, updatedAt: "8 月 29 日" }),
  cc({ id: "ccx-creator-consent-audit", name: "核对达人联系方式与素材授权状态", parentTaskId: "ccx-creator-pool-data-track", ownerId: "苏禾", participantIds: ["陈默"], dependsOnTaskIds: ["ccx-creator-identity-merge"], status: "进行中", goal: "确认联系方式使用、素材二次投放和授权到期边界。", completionCriteria: ["核心达人授权文件与主体一致", "到期、限制渠道和禁用素材已标注", "缺授权记录进入待核对而非默认有效"], executionTips: ["不从历史投放成功推断当前仍有授权"], plannedStartOn: "2026-08-29", plannedEndOn: "2026-09-06", dueAt: "9 月 6 日", labels: ["合规审核", "达人商务"], iconName: "file-check", iconTone: "amber", minutes: 480 }),
  cc({ id: "ccx-creator-performance-window", name: "统一达人近九十天绩效窗口", parentTaskId: "ccx-creator-pool-data-track", ownerId: "韩序", participantIds: ["许宁", "陈默"], dependsOnTaskIds: ["ccx-creator-identity-merge"], status: "进行中", goal: "统一成交、退款、内容交付和投流增量的九十天绩效口径。", completionCriteria: ["指标时间窗、归因和退款截点清晰", "自然成交与付费增量分开", "样本不足和数据缺失有显式标记"], executionTips: ["不把不同活动的预算规模直接横向比较"], plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-09", dueAt: "9 月 9 日", labels: ["数据复盘", "投流增长"], iconName: "chart", iconTone: "purple", minutes: 540 }),
  cc({ id: "ccx-creator-risk-score", name: "签发达人履约与合规风险分层", parentTaskId: "ccx-creator-pool-data-track", ownerId: "苏禾", participantIds: ["韩序", "陈默"], dependsOnTaskIds: ["ccx-creator-consent-audit", "ccx-creator-performance-window"], status: "待开始", goal: "把授权、迟交、违规和异常退款证据转为可复核的风险分层。", completionCriteria: ["高风险项均引用具体事件或文件", "风险等级有复核人与失效时间", "未知资料与低风险结论分开"], executionTips: ["风险分层只用于合作判断，不用于绩效惩罚"], plannedStartOn: "2026-09-09", plannedEndOn: "2026-09-14", dueAt: "9 月 14 日", labels: ["合规审核", "达人商务"], iconName: "flag", iconTone: "red", minutes: 420 }),
  cc({ id: "ccx-creator-ratecard-renewal", name: "复核核心达人四季度报价卡", parentTaskId: "ccx-creator-pool-decision-track", ownerId: "陈默", participantIds: ["韩序", "周岚"], dependsOnTaskIds: ["ccx-creator-performance-window", "ccx-creator-risk-score"], status: "待开始", goal: "依据绩效、稀缺档期和风险边界形成四季度谈判底稿。", completionCriteria: ["报价区间区分内容费、佣金和授权费", "谈判上限有利润和风险依据", "底稿未被表述为达人已接受"], executionTips: ["市场传闻报价只作待核对线索"], plannedStartOn: "2026-09-14", plannedEndOn: "2026-09-20", dueAt: "9 月 20 日", labels: ["达人商务", "数据复盘"], iconName: "briefcase", iconTone: "blue", minutes: 480 }),
  cc({ id: "ccx-creator-inactive-exit", name: "关闭失效达人与过期合作入口", parentTaskId: "ccx-creator-pool-decision-track", ownerId: "陈默", participantIds: ["苏禾"], dependsOnTaskIds: ["ccx-creator-risk-score"], status: "待开始", goal: "停止对已确认失效、禁用或无授权达人的后续邀约和素材调用。", completionCriteria: ["退出名单经商务与合规复核", "进行中合作和历史结算未被误关", "停用时间与恢复条件已记录"], executionTips: ["无法联系不自动等同于永久退出"], plannedStartOn: "2026-09-15", plannedEndOn: "2026-09-22", dueAt: "9 月 22 日", labels: ["达人商务", "合规审核"], iconName: "file-check", iconTone: "amber", minutes: 300 }),
  cc({ id: "ccx-creator-vertical-recruit", name: "建立熟龄护肤达人补充名单", parentTaskId: "ccx-creator-pool-decision-track", ownerId: "陈默", participantIds: ["韩序", "林洁"], dependsOnTaskIds: ["ccx-double11-segment-replay"], status: "待开始", goal: "针对双十一人群复算暴露的熟龄内容缺口补充新达人候选。", completionCriteria: ["候选覆盖已确认的人群与内容缺口", "至少 12 位候选完成身份去重", "名单与既有合作达人不重复"], executionTips: ["该跨项目依赖只消费双十一人群复算结果"], plannedStartOn: "2026-09-20", plannedEndOn: "2026-09-27", dueAt: "9 月 27 日", labels: ["达人商务", "内容制作"], iconName: "sparkles", iconTone: "purple", minutes: 420 }),
  cc({ id: "ccx-creator-monthly-committee", name: "召开九月达人池决策会", parentTaskId: "ccx-creator-pool-decision-track", ownerId: "周岚", participantIds: ["陈默", "韩序", "苏禾"], dependsOnTaskIds: ["ccx-creator-ratecard-renewal", "ccx-creator-inactive-exit", "ccx-creator-vertical-recruit"], status: "待开始", goal: "对续约、退出和扩充建议形成可追溯决定及下一步责任。", completionCriteria: ["每位争议达人有决定或待补证据", "决定绑定适用周期与活动范围", "后续动作有唯一负责人和期限"], executionTips: ["会议记录不覆盖已签合同和正式授权"], plannedStartOn: "2026-09-28", plannedEndOn: "2026-09-30", dueAt: "9 月 30 日", labels: ["达人商务", "高优先级"], iconName: "clipboard-check", iconTone: "red", minutes: 240 }),

  // 独立运营、周期工作与突发事件。
  cc({ id: "ccx-weekly-settlement", name: "核对本周达人佣金与退货冲抵", ownerId: "陈默", participantIds: ["梁川", "韩序"], dependsOnTaskIds: ["ccx-serum-contract-close"], status: "进行中", goal: "按已生效合同和退款截点核对本周可结算佣金及冲抵差异。", completionCriteria: ["达人、订单和合同版本可关联", "异常退款和补差单独列示", "结算清单由商务复核"], executionTips: ["周期任务使用本周实例，不复制上周状态"], plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-05", dueAt: "9 月 5 日", labels: ["达人商务", "数据复盘"], iconName: "list-todo", iconTone: "blue", minutes: 300 }),
  cc({ id: "ccx-extreme-claim-incident", name: "处理达人视频极限词下架事件", ownerId: "苏禾", participantIds: ["陈默", "林洁"], dependsOnTaskIds: ["ccx-serum-claim-matrix"], status: "已阻塞", goal: "控制误用极限词视频的传播并形成替换、申诉和复发防控记录。", completionCriteria: ["受影响视频和投放范围已冻结", "下架、替换和申诉状态可追溯", "达人和内容团队收到具体禁用边界"], executionTips: ["当前等待平台返回原视频审核快照", "不把平台受理视为申诉通过"], plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-03", dueAt: "9 月 3 日 12:00", labels: ["合规审核", "高优先级"], iconName: "flag", iconTone: "red", minutes: 420, updatedAt: "15 分钟前" }),
  cc({ id: "ccx-october-studio-calendar", name: "冻结十月直播间资源日历", ownerId: "高远", participantIds: ["林洁", "梁川"], status: "进行中", goal: "协调自播、达人连麦和大促彩排的直播间、场控与设备资源。", completionCriteria: ["所有已确认活动有场地、场控和主备设备", "冲突时段有书面取舍", "临时需求的最晚申请时间已公布"], executionTips: ["未确认活动只保留候选时段"], plannedStartOn: "2026-08-28", plannedEndOn: "2026-09-04", dueAt: "9 月 4 日", labels: ["直播执行"], iconName: "clipboard-check", iconTone: "purple", minutes: 300 }),
  cc({ id: "ccx-holiday-crossplatform-live", name: "国庆专场跨平台联播筹备", ownerId: "高远", participantIds: ["林洁", "许宁"], status: "已取消", goal: "在抖音与视频号同步执行国庆主题联播并统一优惠机制。", completionCriteria: ["双平台直播链路和彩排通过", "素材授权覆盖两个平台", "优惠与库存机制一致"], executionTips: ["因视频号授权范围未能在锁档前确认，本实例已取消；后续重启需新建周期"], plannedStartOn: "2026-08-25", plannedEndOn: "2026-09-25", dueAt: "9 月 25 日", labels: ["直播执行", "合规审核"], iconName: "flag", iconTone: "neutral", minutes: 600, updatedAt: "昨天" }),
  cc({ id: "ccx-creator-collaboration-handbook", name: "维护达人合作异常处理手册", ownerId: "陈默", participantIds: ["苏禾", "高远"], status: "进行中", goal: "持续沉淀达人失联、临时改档、素材授权争议和履约异常的处理边界，供后续合作直接复用。", completionCriteria: ["当前已知异常类型均有事实核对、升级条件和责任角色", "新增案例可以追加且不覆盖历史处理依据", "未经确认的处理方式明确标记待核对"], executionTips: ["这是持续维护任务，不设置人为截止时间；出现新案例或规则变化时再更新"], labels: ["达人商务", "合规审核"], iconName: "file-check", iconTone: "blue", minutes: 180 }),
];

/**
 * 客户成功新增任务池：续约、迁移、健康度治理和权限事件 4 棵项目树，共 40 项。
 */
export const customerSuccessAdditionNodes: TaskNode[] = [
  // 华东零售集团续约：13 项。
  cs({ id: "csx-retail-renewal", name: "完成华东零售集团年度续约", ownerId: "陈沁", participantIds: ["周岚", "江予", "白露", "薛航", "周牧"], status: "进行中", goal: "以可核对的使用价值、风险处置和合同边界完成华东零售集团年度续约。", completionCriteria: ["客户目标、使用价值和未决风险形成一致事实", "续约方案与 SLA、隐私和技术承诺一致", "客户决定与后续责任可追溯"], executionTips: ["父任务只汇总叶子结果，不重复计算 EWD", "口头续约意向不记为已签约"], plannedStartOn: "2026-08-20", plannedEndOn: "2026-09-26", dueAt: "9 月 26 日", labels: ["客户沟通", "高优先级"], iconName: "target", iconTone: "red" }),
  cs({ id: "csx-retail-evidence-track", name: "收口华东零售续约事实底稿", parentTaskId: "csx-retail-renewal", ownerId: "白露", participantIds: ["陈沁", "陆遥"], status: "进行中", goal: "形成使用、工单、目标达成和未决问题的一致事实底稿。", completionCriteria: ["指标和客户反馈均有来源与时间", "状态冲突保留待核对而非静默裁定"], executionTips: ["父任务不替代各来源核验"], plannedStartOn: "2026-08-20", plannedEndOn: "2026-09-08", dueAt: "9 月 8 日", labels: ["数据修复", "客户影响"], iconName: "chart", iconTone: "cyan" }),
  cs({ id: "csx-retail-value-track", name: "形成华东零售下年度成功计划", parentTaskId: "csx-retail-renewal", ownerId: "陈沁", participantIds: ["薛航", "陆遥"], status: "待开始", goal: "把客户业务目标、产品使用差距和可承诺支持转为下年度共同计划。", completionCriteria: ["目标与可衡量结果由客户确认", "未承诺能力和依赖被明确标注"], executionTips: ["建议路线图不等于产品承诺"], plannedStartOn: "2026-09-04", plannedEndOn: "2026-09-17", dueAt: "9 月 17 日", labels: ["客户沟通", "支持准备"], iconName: "briefcase", iconTone: "blue" }),
  cs({ id: "csx-retail-commercial-track", name: "完成华东零售商务与合同收口", parentTaskId: "csx-retail-renewal", ownerId: "江予", participantIds: ["陈沁", "周牧", "周岚"], status: "待开始", goal: "在价值计划和风险边界明确后完成价格、SLA 与合同条款收口。", completionCriteria: ["报价、期限和条款版本一致", "例外承诺均有批准人和失效时间"], executionTips: ["商务提案不表述为已批准合同"], plannedStartOn: "2026-09-12", plannedEndOn: "2026-09-26", dueAt: "9 月 26 日", labels: ["SLA", "客户沟通"], iconName: "file-check", iconTone: "amber" }),
  cs({ id: "csx-retail-usage-baseline", name: "签发华东零售年度使用基线", parentTaskId: "csx-retail-evidence-track", ownerId: "白露", participantIds: ["陈沁"], status: "已完成", goal: "统一活跃组织、关键流程采用、席位和数据同步的年度使用口径。", completionCriteria: ["指标时间窗和排除条件明确", "异常月份有来源说明", "基线由客户成功负责人复核"], executionTips: ["缺失月份保持未知，不用相邻月份回填"], plannedStartOn: "2026-08-20", plannedEndOn: "2026-08-25", dueAt: "8 月 25 日", labels: ["数据修复", "客户影响"], iconName: "chart", iconTone: "green", minutes: 420, updatedAt: "8 月 25 日" }),
  cs({ id: "csx-retail-stakeholder-map", name: "确认华东零售续约决策人图谱", parentTaskId: "csx-retail-evidence-track", ownerId: "陈沁", participantIds: ["江予"], status: "已完成", goal: "确认业务、IT、采购和法务在续约中的决策权、关注点与沟通路径。", completionCriteria: ["关键角色经客户联系人确认", "决策与影响角色分开标注", "离职与代理关系有更新时间"], executionTips: ["职位高低不自动等于签约权"], plannedStartOn: "2026-08-21", plannedEndOn: "2026-08-27", dueAt: "8 月 27 日", labels: ["客户沟通"], iconName: "briefcase", iconTone: "blue", minutes: 300, updatedAt: "8 月 27 日" }),
  cs({ id: "csx-retail-support-closure", name: "关闭华东零售批量导入遗留问题", parentTaskId: "csx-retail-evidence-track", ownerId: "陆遥", participantIds: ["薛航", "白露"], status: "进行中", goal: "验证批量导入超时、错误提示和重试路径已达到客户可接受状态。", completionCriteria: ["三个高频失败场景均有复现与修复证据", "客户样本完成回归", "未解决限制进入成功计划"], executionTips: ["工单回复已发送不等于问题已关闭"], plannedStartOn: "2026-08-25", plannedEndOn: "2026-09-05", dueAt: "9 月 5 日", labels: ["支持准备", "客户影响"], iconName: "clipboard-check", iconTone: "amber", minutes: 660 }),
  cs({ id: "csx-retail-outcome-evidence", name: "核对华东零售门店协同成效", parentTaskId: "csx-retail-evidence-track", ownerId: "陈沁", participantIds: ["白露"], dependsOnTaskIds: ["csx-retail-usage-baseline", "csx-retail-support-closure"], status: "进行中", goal: "核对门店任务准时率、总部催办和异常闭环改善是否可归因于已用能力。", completionCriteria: ["基线期与观察期口径一致", "产品贡献与同时发生的流程调整分开", "结论经客户业务负责人确认或标记待确认"], executionTips: ["相关性不足时不声称因果"], plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-08", dueAt: "9 月 8 日", labels: ["客户影响"], iconName: "chart", iconTone: "purple", minutes: 480 }),
  cs({ id: "csx-retail-risk-workshop", name: "完成华东零售续约风险工作坊", parentTaskId: "csx-retail-value-track", ownerId: "陈沁", participantIds: ["周岚", "江予", "薛航"], dependsOnTaskIds: ["csx-retail-outcome-evidence", "csx-health-score-calibration"], status: "待开始", goal: "基于客户事实与季度健康度校准结果，确认续约阻力、应对动作和责任。", completionCriteria: ["风险按影响和可控性分层", "每项风险有证据、责任人与检查时间", "未知采购边界不被写成确定结论"], executionTips: ["该任务跨项目直接消费健康度校准结论"], plannedStartOn: "2026-09-09", plannedEndOn: "2026-09-11", dueAt: "9 月 11 日", labels: ["客户沟通", "高优先级"], iconName: "flag", iconTone: "red", minutes: 360 }),
  cs({ id: "csx-retail-success-plan", name: "交付华东零售下年度成功计划", parentTaskId: "csx-retail-value-track", ownerId: "陈沁", participantIds: ["薛航", "陆遥"], dependsOnTaskIds: ["csx-retail-risk-workshop"], status: "待开始", goal: "形成按季度推进的业务结果、产品采用和支持协作计划。", completionCriteria: ["每个季度目标有衡量口径和数据责任", "产品限制、客户前置和支持动作分开", "计划获得客户业务负责人的审阅反馈"], executionTips: ["未来功能只标为候选，不写入承诺"], plannedStartOn: "2026-09-11", plannedEndOn: "2026-09-16", dueAt: "9 月 16 日", labels: ["客户沟通", "支持准备"], iconName: "list-todo", iconTone: "blue", minutes: 600 }),
  cs({ id: "csx-retail-security-questionnaire", name: "回复华东零售年度安全问卷", parentTaskId: "csx-retail-value-track", ownerId: "周牧", participantIds: ["薛航", "沈闻"], status: "进行中", goal: "以现行控制和证据回复客户安全、隐私和业务连续性问题。", completionCriteria: ["每项回答引用有效政策或技术证据", "待整改项与现行控制分开", "披露范围经过合规复核"], executionTips: ["不以计划中的控制回答当前已具备"], plannedStartOn: "2026-08-30", plannedEndOn: "2026-09-12", dueAt: "9 月 12 日", labels: ["客户影响"], iconName: "file-check", iconTone: "purple", minutes: 720 }),
  cs({ id: "csx-retail-pricing-proposal", name: "形成华东零售续约报价建议", parentTaskId: "csx-retail-commercial-track", ownerId: "江予", participantIds: ["陈沁", "周岚"], dependsOnTaskIds: ["csx-retail-success-plan", "csx-retail-risk-workshop"], status: "待开始", goal: "根据使用范围、支持计划和风险边界形成可审核的续约报价建议。", completionCriteria: ["席位、服务和折扣假设可追溯", "例外折扣有审批路径", "报价有效期与客户采购窗口一致"], executionTips: ["建议未获批准前不发送正式报价"], plannedStartOn: "2026-09-16", plannedEndOn: "2026-09-19", dueAt: "9 月 19 日", labels: ["SLA", "客户沟通"], iconName: "briefcase", iconTone: "amber", minutes: 420 }),
  cs({ id: "csx-retail-contract-redline", name: "收口华东零售续约合同红线", parentTaskId: "csx-retail-commercial-track", ownerId: "周牧", participantIds: ["江予", "陈沁"], dependsOnTaskIds: ["csx-retail-pricing-proposal", "csx-retail-security-questionnaire"], status: "待开始", goal: "收口 SLA、数据处理、责任限制和支持服务的合同差异。", completionCriteria: ["每项红线有接受、拒绝或升级结论", "技术承诺与成功计划一致", "最新红线版本由双方标识"], executionTips: ["客户批注不自动视为已接受条款"], plannedStartOn: "2026-09-19", plannedEndOn: "2026-09-23", dueAt: "9 月 23 日", labels: ["SLA", "客户影响"], iconName: "file-check", iconTone: "red", minutes: 600 }),
  cs({ id: "csx-retail-signature-gate", name: "确认华东零售续约签署条件", parentTaskId: "csx-retail-commercial-track", ownerId: "周岚", participantIds: ["江予", "陈沁", "周牧"], dependsOnTaskIds: ["csx-retail-contract-redline"], status: "待开始", goal: "在发起签署前确认版本、审批、签署主体和生效条件完整。", completionCriteria: ["内部审批和客户采购批准均可核对", "签署主体与合同抬头一致", "未决附件没有被静默排除"], executionTips: ["电子签平台受理不等于双方签署完成"], plannedStartOn: "2026-09-24", plannedEndOn: "2026-09-26", dueAt: "9 月 26 日", labels: ["SLA", "高优先级"], iconName: "file-check", iconTone: "red", minutes: 240 }),

  // 跨境支付客户迁移：13 项，包含完成的试点和进行中的正式迁移准备。
  cs({ id: "csx-payment-migration", name: "完成跨境支付客户数据域迁移", ownerId: "周岚", participantIds: ["陈沁", "薛航", "白露", "沈闻", "陆遥", "周牧"], status: "进行中", goal: "在可回滚、客户可理解且数据一致的前提下完成跨境支付客户数据域迁移。", completionCriteria: ["范围、映射、回滚和试点证据完整", "客户管理员和支持团队具备迁移准备", "正式切换决定绑定最新风险"], executionTips: ["父任务只汇总叶子 EWD", "后台搬迁运行时间不计人工投入"], plannedStartOn: "2026-08-12", plannedEndOn: "2026-09-22", dueAt: "9 月 22 日", labels: ["客户影响", "高优先级"], iconName: "target", iconTone: "red" }),
  cs({ id: "csx-migration-readiness-track", name: "冻结跨境支付迁移数据边界", parentTaskId: "csx-payment-migration", ownerId: "白露", participantIds: ["薛航", "周牧"], status: "进行中", goal: "冻结租户、字段、保留要求和回滚边界。", completionCriteria: ["迁移对象与排除项有稳定版本", "隐私和数据一致性要求已核对"], executionTips: ["父任务不将数据扫描时长计入 EWD"], plannedStartOn: "2026-08-12", plannedEndOn: "2026-09-05", dueAt: "9 月 5 日", labels: ["数据修复", "可回滚"], iconName: "chart", iconTone: "cyan" }),
  cs({ id: "csx-migration-pilot-track", name: "完成跨境支付迁移试点验证", parentTaskId: "csx-payment-migration", ownerId: "沈闻", participantIds: ["白露", "薛航", "陈沁"], status: "进行中", goal: "用低风险租户验证迁移、回滚、观测和客户确认路径。", completionCriteria: ["试点结果覆盖技术与客户侧验证", "未通过项进入正式迁移门禁"], executionTips: ["试点成功不自动批准全量切换"], plannedStartOn: "2026-08-20", plannedEndOn: "2026-09-09", dueAt: "9 月 9 日", labels: ["服务恢复", "可回滚"], iconName: "clipboard-check", iconTone: "purple" }),
  cs({ id: "csx-migration-adoption-track", name: "完成跨境支付客户切换准备", parentTaskId: "csx-payment-migration", ownerId: "陈沁", participantIds: ["陆遥", "江予"], status: "待开始", goal: "让客户管理员和一线支持理解影响、窗口、验证和升级路径。", completionCriteria: ["管理员确认窗口和验证责任", "支持材料与最新迁移边界一致"], executionTips: ["发送通知不等于客户已确认"], plannedStartOn: "2026-09-05", plannedEndOn: "2026-09-20", dueAt: "9 月 20 日", labels: ["客户沟通", "支持准备"], iconName: "briefcase", iconTone: "blue" }),
  cs({ id: "csx-migration-tenant-inventory", name: "签发跨境支付迁移租户清单", parentTaskId: "csx-migration-readiness-track", ownerId: "白露", participantIds: ["陈沁", "周牧"], status: "已完成", goal: "冻结本轮迁移租户、地区、数据驻留和排除原因。", completionCriteria: ["租户与合同主体一一对应", "地区和驻留限制已核对", "排除租户有原因和复查时间"], executionTips: ["仅有活跃数据不代表租户在迁移授权范围"], plannedStartOn: "2026-08-12", plannedEndOn: "2026-08-18", dueAt: "8 月 18 日", labels: ["数据修复", "客户影响"], iconName: "list-todo", iconTone: "green", minutes: 480, updatedAt: "8 月 18 日" }),
  cs({ id: "csx-migration-field-map", name: "核对跨境支付新旧数据字段映射", parentTaskId: "csx-migration-readiness-track", ownerId: "白露", participantIds: ["薛航", "周牧"], dependsOnTaskIds: ["csx-migration-tenant-inventory"], status: "进行中", goal: "确认新旧数据域字段、枚举、时区与保留策略的可迁移映射。", completionCriteria: ["必填字段和不可逆转换均已标注", "金额、币种和时区样本通过核对", "隐私字段的处理方式经合规复核"], executionTips: ["名称相同不等于字段语义一致"], plannedStartOn: "2026-08-18", plannedEndOn: "2026-09-02", dueAt: "9 月 2 日", labels: ["数据修复"], iconName: "chart", iconTone: "amber", minutes: 900 }),
  cs({ id: "csx-migration-rollback-validation", name: "验证跨境支付迁移回滚脚本", parentTaskId: "csx-migration-readiness-track", ownerId: "薛航", participantIds: ["沈闻", "白露"], dependsOnTaskIds: ["csx-migration-field-map"], status: "已阻塞", goal: "验证在迁移中断或校验失败时可恢复到一致旧域状态。", completionCriteria: ["三类失败点均完成回滚演练", "回滚前后记录数和业务状态一致", "停止条件和授权角色已确认"], executionTips: ["当前等待字段映射签发后开始演练", "自动脚本执行时间不计 EWD，只计场景设计和复核"], plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-05", dueAt: "9 月 5 日", labels: ["可回滚", "服务恢复"], iconName: "clipboard-check", iconTone: "red", minutes: 600 }),
  cs({ id: "csx-migration-pilot-cohort", name: "确认跨境支付迁移试点租户", parentTaskId: "csx-migration-pilot-track", ownerId: "陈沁", participantIds: ["白露", "江予"], dependsOnTaskIds: ["csx-migration-tenant-inventory"], status: "已完成", goal: "选择业务风险可控、覆盖主要数据形态且愿意配合验证的试点租户。", completionCriteria: ["6 个试点租户覆盖主要地区与数据形态", "客户联系人和验证窗口已确认", "补偿与退出条件已说明"], executionTips: ["试点意愿由客户确认，不从活跃度推断"], plannedStartOn: "2026-08-20", plannedEndOn: "2026-08-24", dueAt: "8 月 24 日", labels: ["客户沟通", "可回滚"], iconName: "briefcase", iconTone: "green", minutes: 300, updatedAt: "8 月 24 日" }),
  cs({ id: "csx-migration-pilot-rehearsal", name: "完成跨境支付试点迁移彩排", parentTaskId: "csx-migration-pilot-track", ownerId: "沈闻", participantIds: ["薛航", "白露"], dependsOnTaskIds: ["csx-migration-pilot-cohort", "csx-migration-rollback-validation"], status: "待开始", goal: "在脱敏副本上验证迁移顺序、观测、校验与回滚动作。", completionCriteria: ["端到端步骤在计划窗口内完成", "关键指标和告警可以触发", "演练问题有修复或书面接受"], executionTips: ["脱敏副本结果不能替代客户生产验证"], plannedStartOn: "2026-09-05", plannedEndOn: "2026-09-07", dueAt: "9 月 7 日", labels: ["事件响应", "可回滚"], iconName: "clipboard-check", iconTone: "purple", minutes: 540 }),
  cs({ id: "csx-migration-pilot-observation", name: "签发跨境支付试点观察结论", parentTaskId: "csx-migration-pilot-track", ownerId: "白露", participantIds: ["沈闻", "陈沁"], dependsOnTaskIds: ["csx-migration-pilot-rehearsal"], status: "待开始", goal: "汇总技术校验、客户验证和支持工单形成是否进入正式迁移的结论。", completionCriteria: ["数据一致性和业务验证分别签字", "观察窗口内异常均有解释", "正式迁移的未决条件已列明"], executionTips: ["无新增工单不自动等于客户无影响"], plannedStartOn: "2026-09-07", plannedEndOn: "2026-09-09", dueAt: "9 月 9 日", labels: ["客户影响"], iconName: "file-check", iconTone: "purple", minutes: 420 }),
  cs({ id: "csx-migration-admin-training", name: "完成跨境支付客户管理员培训", parentTaskId: "csx-migration-adoption-track", ownerId: "陆遥", participantIds: ["陈沁", "白露"], dependsOnTaskIds: ["csx-migration-pilot-observation"], status: "待开始", goal: "让客户管理员能够执行切换后验证、常见排查和升级。", completionCriteria: ["管理员完成关键验证场景实操", "地区与角色差异纳入材料", "缺席组织有补训安排"], executionTips: ["签到不等于具备验证能力"], plannedStartOn: "2026-09-10", plannedEndOn: "2026-09-15", dueAt: "9 月 15 日", labels: ["支持准备", "客户沟通"], iconName: "clipboard-check", iconTone: "blue", minutes: 660 }),
  cs({ id: "csx-migration-support-knowledge", name: "发布跨境支付迁移支持知识包", parentTaskId: "csx-migration-adoption-track", ownerId: "陆遥", participantIds: ["沈闻", "白露"], dependsOnTaskIds: ["csx-migration-pilot-observation"], status: "待开始", goal: "为一线支持交付版本识别、数据校验、常见故障与升级材料。", completionCriteria: ["五类高频场景有可执行处理路径", "诊断动作已由技术角色验证", "知识包注明适用迁移批次"], executionTips: ["只发布已验证动作，不复制内部脚本凭据"], plannedStartOn: "2026-09-10", plannedEndOn: "2026-09-16", dueAt: "9 月 16 日", labels: ["支持准备", "服务恢复"], iconName: "list-todo", iconTone: "green", minutes: 480 }),
  cs({ id: "csx-migration-go-live-comms", name: "确认跨境支付正式迁移通知", parentTaskId: "csx-migration-adoption-track", ownerId: "陈沁", participantIds: ["周牧", "陆遥"], dependsOnTaskIds: ["csx-migration-admin-training", "csx-migration-support-knowledge"], status: "待开始", goal: "向各客户提供准确的窗口、影响、验证和升级说明并回收确认。", completionCriteria: ["通知内容与最新批次和回滚边界一致", "重点客户已确认联系人和验证责任", "未回复客户有升级路径"], executionTips: ["邮件投递成功不等于客户已读或接受"], plannedStartOn: "2026-09-16", plannedEndOn: "2026-09-20", dueAt: "9 月 20 日", labels: ["客户沟通", "高优先级"], iconName: "briefcase", iconTone: "red", minutes: 420 }),

  // 季度健康度治理：10 项。完成的校准结果被续约项目直接消费。
  cs({ id: "csx-health-governance", name: "完成三季度企业客户健康度治理", ownerId: "陈沁", participantIds: ["白露", "陆遥", "江予", "周岚"], status: "进行中", goal: "统一健康度数据、阈值与人工判断，减少流失预警遗漏和误报。", completionCriteria: ["评分数据、权重和人工覆盖规则可追溯", "高风险客户有责任人与检查节奏", "模型未知不被展示为健康"], executionTips: ["父任务汇总叶子结果", "健康度用于协作排序，不用于个人绩效"], plannedStartOn: "2026-08-10", plannedEndOn: "2026-09-12", dueAt: "9 月 12 日", labels: ["客户影响", "数据修复"], iconName: "target", iconTone: "cyan" }),
  cs({ id: "csx-health-data-track", name: "修复企业客户健康度数据口径", parentTaskId: "csx-health-governance", ownerId: "白露", participantIds: ["陈沁", "陆遥"], status: "进行中", goal: "统一采用、工单、续约和客户反馈的数据窗口与缺失处理。", completionCriteria: ["字段来源、刷新和缺失语义明确", "异常数据不被静默覆盖"], executionTips: ["父任务不重复估算数据任务"], plannedStartOn: "2026-08-10", plannedEndOn: "2026-09-03", dueAt: "9 月 3 日", labels: ["数据修复"], iconName: "chart", iconTone: "cyan" }),
  cs({ id: "csx-health-action-track", name: "建立企业客户健康度行动闭环", parentTaskId: "csx-health-governance", ownerId: "陈沁", participantIds: ["陆遥", "周岚"], status: "进行中", goal: "将风险信号转为有证据、责任和复查时间的客户行动。", completionCriteria: ["预警路由与行动分级一致", "人工覆盖和关闭原因可审计"], executionTips: ["预警不自动修改正式客户状态"], plannedStartOn: "2026-08-28", plannedEndOn: "2026-09-12", dueAt: "9 月 12 日", labels: ["客户影响", "支持准备"], iconName: "clipboard-check", iconTone: "purple" }),
  cs({ id: "csx-health-usage-window", name: "统一企业客户采用率观察窗口", parentTaskId: "csx-health-data-track", ownerId: "白露", participantIds: ["陈沁"], status: "已完成", goal: "按客户业务周期统一活跃、关键流程和席位采用率的观察窗口。", completionCriteria: ["周、月和季节性客户分别有适用窗口", "计划性停用与异常下降分开", "低样本客户保留不确定性"], executionTips: ["不以全体客户统一七天窗口"], plannedStartOn: "2026-08-10", plannedEndOn: "2026-08-17", dueAt: "8 月 17 日", labels: ["数据修复", "客户影响"], iconName: "chart", iconTone: "green", minutes: 420, updatedAt: "8 月 17 日" }),
  cs({ id: "csx-health-ticket-severity", name: "校准企业工单严重度映射", parentTaskId: "csx-health-data-track", ownerId: "陆遥", participantIds: ["沈闻", "陈沁"], status: "已完成", goal: "统一支持工单、事件和客户自报影响在健康度中的严重度语义。", completionCriteria: ["四级严重度有示例和排除项", "重复工单合并但保留客户范围", "映射经支持和值班团队复核"], executionTips: ["工单数量不直接等于影响等级"], plannedStartOn: "2026-08-15", plannedEndOn: "2026-08-22", dueAt: "8 月 22 日", labels: ["支持准备", "事件响应"], iconName: "list-todo", iconTone: "green", minutes: 360, updatedAt: "8 月 22 日" }),
  cs({ id: "csx-health-data-freshness", name: "修复健康度数据刷新缺口", parentTaskId: "csx-health-data-track", ownerId: "白露", participantIds: ["薛航"], dependsOnTaskIds: ["csx-health-usage-window", "csx-health-ticket-severity"], status: "进行中", goal: "让采用、工单和合同数据在声明的刷新时间内进入健康度计算。", completionCriteria: ["刷新延迟可观测且有告警", "失败批次可重放和核对", "过期数据在界面明确标识"], executionTips: ["重放时不覆盖更晚的人工确认"], plannedStartOn: "2026-08-23", plannedEndOn: "2026-09-03", dueAt: "9 月 3 日", labels: ["数据修复", "服务恢复"], iconName: "chart", iconTone: "amber", minutes: 720 }),
  cs({ id: "csx-health-adoption-threshold", name: "签发企业采用率风险阈值", parentTaskId: "csx-health-action-track", ownerId: "陈沁", participantIds: ["白露", "周岚"], dependsOnTaskIds: ["csx-health-usage-window", "csx-migration-pilot-observation"], status: "待开始", goal: "结合业务周期和跨境迁移试点观察，确定采用率下降的风险阈值与例外。", completionCriteria: ["阈值按客户类型分层", "迁移期下降与真实流失信号分开", "阈值版本和生效时间可追溯"], executionTips: ["该跨项目依赖用于识别迁移期的正常波动"], plannedStartOn: "2026-09-09", plannedEndOn: "2026-09-10", dueAt: "9 月 10 日", labels: ["客户影响", "数据修复"], iconName: "flag", iconTone: "purple", minutes: 360 }),
  cs({ id: "csx-health-score-calibration", name: "完成三季度客户健康分校准", parentTaskId: "csx-health-action-track", ownerId: "白露", participantIds: ["陈沁", "江予"], dependsOnTaskIds: ["csx-health-data-freshness"], status: "进行中", goal: "用已知续约、扩容和流失样本检验健康分分层是否可用于当前行动。", completionCriteria: ["样本来源和时间范围明确", "误报与漏报客户完成原因复核", "校准结论注明不适用客户"], executionTips: ["离线校准不声称预测未来续约概率"], plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-08", dueAt: "9 月 8 日", labels: ["数据修复"], iconName: "chart", iconTone: "purple", minutes: 600 }),
  cs({ id: "csx-health-alert-routing", name: "配置高风险客户预警路由", parentTaskId: "csx-health-action-track", ownerId: "陆遥", participantIds: ["陈沁", "周岚"], dependsOnTaskIds: ["csx-health-score-calibration", "csx-health-adoption-threshold"], status: "待开始", goal: "将不同风险等级路由到客户负责人、支持或重大事件路径。", completionCriteria: ["每级预警有接收角色和响应时限", "无人负责和休假场景有升级", "测试预警可到达正确渠道"], executionTips: ["路由成功不等于负责人已接受行动"], plannedStartOn: "2026-09-10", plannedEndOn: "2026-09-11", dueAt: "9 月 11 日", labels: ["支持准备", "客户影响"], iconName: "flag", iconTone: "amber", minutes: 360 }),
  cs({ id: "csx-health-manual-review", name: "完成高风险客户人工复核", parentTaskId: "csx-health-action-track", ownerId: "陈沁", participantIds: ["陆遥", "江予"], dependsOnTaskIds: ["csx-health-score-calibration"], status: "待开始", goal: "复核高风险客户的最新事实、商业窗口和现有行动，避免机械触达。", completionCriteria: ["每位高风险客户有证据摘要", "误报和真实风险分别标注", "下一步有唯一责任人与复查时间"], executionTips: ["健康分只作为线索，不覆盖客户正式状态"], plannedStartOn: "2026-09-08", plannedEndOn: "2026-09-12", dueAt: "9 月 12 日", labels: ["客户沟通", "高优先级"], iconName: "clipboard-check", iconTone: "red", minutes: 540 }),

  // 华东零售管理员误授权：真实突发事件树，复用续约项目中已确认的联系人图谱。
  cs({ id: "csx-access-incident", name: "关闭华东零售管理员误授权事件", ownerId: "周岚", participantIds: ["沈闻", "陈沁", "周牧", "薛航"], status: "进行中", goal: "撤销误授权、确认访问范围并以一致事实完成客户和合规闭环。", completionCriteria: ["权限已恢复到确认基线", "访问与数据影响分别形成证据", "客户更新和防复发措施已记录"], executionTips: ["权限撤销不等于已排除历史访问", "父任务汇总叶子 EWD"], plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-04", dueAt: "9 月 4 日", labels: ["重大事件", "高优先级"], iconName: "target", iconTone: "red" }),
  cs({ id: "csx-access-containment", name: "撤销华东零售异常管理员权限", parentTaskId: "csx-access-incident", ownerId: "沈闻", participantIds: ["薛航"], status: "已完成", goal: "立即撤销异常授权并冻结相关权限变更证据。", completionCriteria: ["异常角色和会话均已撤销", "权限变更、登录和导出日志完成保全", "恢复条件由事件指挥官确认"], executionTips: ["保全原始日志，不在源数据上直接标注"], plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-01", dueAt: "9 月 1 日 09:40", labels: ["事件响应", "服务恢复"], iconName: "flag", iconTone: "green", minutes: 180, updatedAt: "1 小时前" }),
  cs({ id: "csx-access-impact-review", name: "核对华东零售误授权访问范围", parentTaskId: "csx-access-incident", ownerId: "周牧", participantIds: ["沈闻", "白露"], dependsOnTaskIds: ["csx-access-containment"], status: "进行中", goal: "确认误授权期间可见字段、实际访问和导出行为及披露边界。", completionCriteria: ["可访问与实际访问分别列明", "日志覆盖和缺口有时间范围", "通知义务形成书面判断"], executionTips: ["无导出日志不自动证明没有查看"], plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-02", dueAt: "9 月 2 日 18:00", labels: ["事件响应", "客户影响"], iconName: "file-check", iconTone: "amber", minutes: 480 }),
  cs({ id: "csx-access-customer-update", name: "完成华东零售误授权客户更新", parentTaskId: "csx-access-incident", ownerId: "陈沁", participantIds: ["周牧", "周岚"], dependsOnTaskIds: ["csx-access-impact-review", "csx-retail-stakeholder-map"], status: "待开始", goal: "向已确认的业务、IT 和法务联系人提供一致的影响、处置和下一步说明。", completionCriteria: ["事实与影响核对结论一致", "关键联系人均完成触达与问题回收", "承诺项有责任人与时间"], executionTips: ["该跨项目依赖直接消费续约项目签发的联系人图谱", "根因未确认前不推测责任"], plannedStartOn: "2026-09-02", plannedEndOn: "2026-09-04", dueAt: "9 月 4 日", labels: ["客户沟通", "高优先级"], iconName: "briefcase", iconTone: "red", minutes: 360 }),

  // 独立治理工作：不依附项目树，模拟团队长期存在的权限与知识维护责任。
  cs({ id: "csx-quarterly-access-review", name: "复核三季度客户数据访问授权", ownerId: "周牧", participantIds: ["陈沁", "沈闻"], status: "进行中", goal: "核对客户成功、支持和值班角色的数据访问是否仍与当前职责和客户范围一致。", completionCriteria: ["高权限成员均有保留、收缩或移除结论", "临时授权均有失效时间和业务依据", "抽样租户未发现跨客户访问范围"], executionTips: ["只核对权限事实，不把访问授权推断为实际访问", "离职和岗位变更记录缺失时标记待核对"], plannedStartOn: "2026-08-25", plannedEndOn: "2026-09-05", dueAt: "9 月 5 日", labels: ["客户影响"], iconName: "file-check", iconTone: "purple", minutes: 420 }),
  cs({ id: "csx-support-macro-retirement", name: "清理过期同步故障客服宏", ownerId: "陆遥", participantIds: ["沈闻", "陈沁"], status: "进行中", goal: "下线引用旧队列架构或过期承诺口径的客服宏，避免一线继续发送错误排障步骤。", completionCriteria: ["全部在用宏完成所有者和最后使用时间核对", "过期宏已下线并保留替代路径", "晚班支持完成新版宏抽查"], executionTips: ["近九十天未使用不自动等于可删除", "涉及客户承诺的文本需由客户成功负责人复核"], plannedStartOn: "2026-08-30", plannedEndOn: "2026-09-06", dueAt: "9 月 6 日", labels: ["支持准备", "客户沟通"], iconName: "clipboard-check", iconTone: "blue", minutes: 300 }),
];

const allowedMembers: Record<ExtendedAdditionTeamId, ReadonlySet<string>> = {
  "creator-commerce": new Set(["周岚", "陈默", "林洁", "高远", "梁川", "许宁", "韩序", "苏禾"]),
  "customer-success": new Set(["周岚", "沈闻", "白露", "陈沁", "薛航", "江予", "陆遥", "周牧"]),
};

const allowedLabels = new Set([
  "达人商务", "内容制作", "直播执行", "商品运营", "投流增长", "数据复盘", "合规审核", "高优先级",
  "重大事件", "事件响应", "服务恢复", "客户沟通", "客户影响", "SLA", "根因分析", "防复发",
  "数据修复", "可回滚", "支持准备",
]);

export type ExtendedTeamTaskAdditionValidation = {
  valid: boolean;
  issues: string[];
  counts: Record<ExtendedAdditionTeamId, number>;
  rootCounts: Record<ExtendedAdditionTeamId, number>;
  crossProjectDependencyCounts: Record<ExtendedAdditionTeamId, number>;
};

const findRootTaskId = (node: TaskNode, byId: ReadonlyMap<string, TaskNode>): string | null => {
  const seen = new Set<string>();
  let current: TaskNode = node;
  while (current.parentTaskId) {
    if (seen.has(current.id)) return null;
    seen.add(current.id);
    const parent = byId.get(current.parentTaskId);
    if (!parent) return null;
    current = parent;
  }
  return current.id;
};

const taskDepth = (node: TaskNode, byId: ReadonlyMap<string, TaskNode>): number | null => {
  const seen = new Set<string>();
  let depth = 1;
  let current: TaskNode = node;
  while (current.parentTaskId) {
    if (seen.has(current.id)) return null;
    seen.add(current.id);
    const parent = byId.get(current.parentTaskId);
    if (!parent) return null;
    current = parent;
    depth += 1;
  }
  return depth;
};

/** Deterministic fixture checks; this does not claim production ACL, history, or schedule validity. */
export function validateExtendedTeamTaskAdditions(
  creatorNodes: readonly TaskNode[] = creatorCommerceAdditionNodes,
  customerNodes: readonly TaskNode[] = customerSuccessAdditionNodes,
): ExtendedTeamTaskAdditionValidation {
  const groups: Record<ExtendedAdditionTeamId, readonly TaskNode[]> = {
    "creator-commerce": creatorNodes,
    "customer-success": customerNodes,
  };
  const all = [...creatorNodes, ...customerNodes];
  const byId = new Map(all.map((node) => [node.id, node]));
  const issues: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  const goals = new Set<string>();
  const rootCounts: Record<ExtendedAdditionTeamId, number> = { "creator-commerce": 0, "customer-success": 0 };
  const crossProjectDependencyCounts: Record<ExtendedAdditionTeamId, number> = { "creator-commerce": 0, "customer-success": 0 };

  for (const [teamId, nodes] of Object.entries(groups) as Array<[ExtendedAdditionTeamId, readonly TaskNode[]]>) {
    if (nodes.length < 30) issues.push(`${teamId}: expected at least 30 additions, received ${nodes.length}`);
    rootCounts[teamId] = nodes.filter((node) => !node.parentTaskId).length;
    if (rootCounts[teamId] < 3) issues.push(`${teamId}: expected multiple project roots`);
    const statusCount = new Set(nodes.map((node) => node.status)).size;
    if (statusCount < 5) issues.push(`${teamId}: expected at least five task states, received ${statusCount}`);

    for (const node of nodes) {
      if (ids.has(node.id)) issues.push(`${node.id}: duplicate id`);
      ids.add(node.id);
      if (names.has(node.name)) issues.push(`${node.id}: duplicate task title ${node.name}`);
      names.add(node.name);
      if (node.goal && goals.has(node.goal)) issues.push(`${node.id}: duplicate goal`);
      if (node.goal) goals.add(node.goal);
      if (node.teamId !== teamId) issues.push(`${node.id}: expected team ${teamId}, received ${node.teamId ?? "missing"}`);
      if (!allowedMembers[teamId].has(node.ownerId)) issues.push(`${node.id}: unknown owner ${node.ownerId}`);
      for (const participantId of node.participantIds ?? []) {
        if (!allowedMembers[teamId].has(participantId)) issues.push(`${node.id}: unknown participant ${participantId}`);
      }
      if (!node.goal?.trim()) issues.push(`${node.id}: missing goal`);
      if (!node.completionCriteria?.length) issues.push(`${node.id}: missing completion criteria`);
      if (!node.executionTips?.length) issues.push(`${node.id}: missing execution tips`);
      if (!node.plannedStartOn || !node.plannedEndOn || !node.dueAt) issues.push(`${node.id}: incomplete dates`);
      if (node.plannedStartOn && node.plannedEndOn && node.plannedStartOn > node.plannedEndOn) issues.push(`${node.id}: start is after end`);
      for (const label of node.labels ?? []) if (!allowedLabels.has(label)) issues.push(`${node.id}: unknown label ${label}`);
      if (node.parentTaskId) {
        const parent = byId.get(node.parentTaskId);
        if (!parent) issues.push(`${node.id}: missing parent ${node.parentTaskId}`);
        else if (parent.teamId !== teamId) issues.push(`${node.id}: cross-team parent ${node.parentTaskId}`);
      }
      const depth = taskDepth(node, byId);
      if (depth === null) issues.push(`${node.id}: parent cycle or missing parent`);
      else if (depth > 3) issues.push(`${node.id}: task depth ${depth} exceeds 3`);
      for (const dependencyId of node.dependsOnTaskIds ?? []) {
        const dependency = byId.get(dependencyId);
        if (!dependency) issues.push(`${node.id}: missing dependency ${dependencyId}`);
        else if (dependency.teamId !== teamId) issues.push(`${node.id}: cross-team dependency ${dependencyId}`);
        if (dependencyId === node.id) issues.push(`${node.id}: self dependency`);
        if (dependency) {
          const ownRoot = findRootTaskId(node, byId);
          const dependencyRoot = findRootTaskId(dependency, byId);
          if (ownRoot && dependencyRoot && ownRoot !== dependencyRoot) crossProjectDependencyCounts[teamId] += 1;
        }
      }
    }
  }

  for (const node of all) {
    const hasChildren = all.some((candidate) => candidate.parentTaskId === node.id);
    if (hasChildren && node.effortEstimate) issues.push(`${node.id}: parent task must not duplicate leaf EWD`);
    if (!hasChildren && (!node.effortEstimate || typeof node.effortEstimate.minutes !== "number" || node.effortEstimate.minutes <= 0)) issues.push(`${node.id}: leaf task requires positive EWD`);

    const stack = [...(node.dependsOnTaskIds ?? [])];
    const visited = new Set<string>();
    while (stack.length) {
      const currentId = stack.pop()!;
      if (currentId === node.id) {
        issues.push(`${node.id}: dependency cycle`);
        break;
      }
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const current = byId.get(currentId);
      if (current) stack.push(...(current.dependsOnTaskIds ?? []));
    }
  }

  for (const teamId of Object.keys(groups) as ExtendedAdditionTeamId[]) {
    if (crossProjectDependencyCounts[teamId] === 0) issues.push(`${teamId}: missing cross-project dependency`);
  }

  return {
    valid: issues.length === 0,
    issues,
    counts: { "creator-commerce": creatorNodes.length, "customer-success": customerNodes.length },
    rootCounts,
    crossProjectDependencyCounts,
  };
}

export const extendedTeamTaskAdditionNodes: TaskNode[] = [
  ...creatorCommerceAdditionNodes,
  ...customerSuccessAdditionNodes,
];
