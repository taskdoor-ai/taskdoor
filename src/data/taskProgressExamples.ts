import type { TaskBurnUpSeries } from "../lib/taskBurnUp";

export type TaskProgressEventKind = "scope-added" | "accepted" | "estimate-revised" | "reopened" | "scope-removed";

/**
 * 固定演示事件，不是实际执行报告、业务验收或浏览器状态变更。
 * 账本只记录末梢任务。`ewdHours=null` 表示该叶子当时没有可用估算；
 * 它会进入叶子总数，但不会被当成 0 h，也不会被后续估算回填。
 */
export type TaskProgressEvent = {
  id: string;
  source: "example";
  taskId: string;
  taskTitle: string;
  parentTaskId: string;
  at: string;
  kind: TaskProgressEventKind;
  /** 初始范围不计作观察期内新增，只用于明确基线由哪些叶子构成。 */
  isBaseline?: boolean;
  /** 事件发生时有效的叶子 EWD；改估记录修订后的值，null 表示缺估。 */
  ewdHours: number | null;
  note: string;
  actor: string;
};

export type TaskProgressScenario = {
  parentTaskId: string;
  /** 明确观察点；没有事件的日期保留阶梯状态，不从当前任务倒推。 */
  snapshotDates: readonly string[];
  events: readonly TaskProgressEvent[];
};

type LeafSeed = {
  taskId: string;
  taskTitle: string;
  ewdHours: number | null;
  addedAt: string;
  isBaseline: boolean;
  actor: string;
};

type FollowUpSeed = {
  taskId: string;
  at: string;
  kind: TaskProgressEventKind;
  ewdHours?: number | null;
  note: string;
  actor: string;
};

const amount = (value: number | null) => value === null ? "尚缺估算" : `估算 ${value} h`;

function scenario(
  parentTaskId: string,
  snapshotDates: readonly string[],
  leaves: readonly LeafSeed[],
  followUps: readonly FollowUpSeed[],
): TaskProgressScenario {
  const byTaskId = new Map(leaves.map((leaf) => [leaf.taskId, leaf]));
  const followUpCounts = new Map(leaves.map((leaf) => [`${leaf.taskId}-scope-added`, 1]));
  const events: TaskProgressEvent[] = [
    ...leaves.map((leaf): TaskProgressEvent => ({
      id: `example-progress-${leaf.taskId}-added`,
      source: "example",
      taskId: leaf.taskId,
      taskTitle: leaf.taskTitle,
      parentTaskId,
      at: leaf.addedAt,
      kind: "scope-added",
      isBaseline: leaf.isBaseline,
      ewdHours: leaf.ewdHours,
      note: `${leaf.isBaseline ? "初始范围纳入" : "新增子任务"}「${leaf.taskTitle}」，${amount(leaf.ewdHours)}。`,
      actor: leaf.actor,
    })),
    ...followUps.map((followUp): TaskProgressEvent => {
      const leaf = byTaskId.get(followUp.taskId);
      if (!leaf) throw new Error(`Missing task seed for progress event: ${followUp.taskId}`);
      const key = `${followUp.taskId}-${followUp.kind}`;
      const occurrence = (followUpCounts.get(key) ?? 0) + 1;
      followUpCounts.set(key, occurrence);
      return {
        // 保留旧香氛账本首个事件的稳定 ID；同一叶子的同类后续事件再追加序号。
        id: `example-progress-${key}${occurrence === 1 ? "" : `-${occurrence}`}`,
        source: "example",
        taskId: followUp.taskId,
        taskTitle: leaf.taskTitle,
        parentTaskId,
        at: followUp.at,
        kind: followUp.kind,
        ewdHours: followUp.ewdHours === undefined ? leaf.ewdHours : followUp.ewdHours,
        note: followUp.note,
        actor: followUp.actor,
      };
    }),
  ];
  return { parentTaskId, snapshotDates, events };
}

const fragranceScenario = scenario(
  "fragrance-creator-wrapup",
  ["2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31"],
  [
    { taskId: "fragrance-creator-business", taskTitle: "确认第二批达人名单与合作档期", ewdHours: 6, addedAt: "2026-08-25T09:00:00+08:00", isBaseline: true, actor: "周岚" },
    { taskId: "fragrance-content", taskTitle: "终审短视频脚本与直播卖点", ewdHours: 8, addedAt: "2026-08-25T09:00:00+08:00", isBaseline: true, actor: "周岚" },
    { taskId: "fragrance-live", taskTitle: "完成直播间彩排与场控清单", ewdHours: 8, addedAt: "2026-08-25T09:00:00+08:00", isBaseline: true, actor: "周岚" },
    { taskId: "fragrance-product", taskTitle: "锁定礼盒价格、赠品与库存", ewdHours: 5, addedAt: "2026-08-25T09:00:00+08:00", isBaseline: true, actor: "周岚" },
    { taskId: "fragrance-growth", taskTitle: "调整第二轮投流预算与人群包", ewdHours: 6, addedAt: "2026-08-25T09:00:00+08:00", isBaseline: true, actor: "周岚" },
    { taskId: "fragrance-data", taskTitle: "更新 GMV 看板与渠道归因", ewdHours: 4, addedAt: "2026-08-25T09:00:00+08:00", isBaseline: true, actor: "周岚" },
    { taskId: "fragrance-compliance", taskTitle: "审核素材宣称与达人合同", ewdHours: 3, addedAt: "2026-08-27T10:00:00+08:00", isBaseline: false, actor: "周岚" },
    { taskId: "fragrance-final-decision", taskTitle: "确认追加投放目标与最终决策", ewdHours: 3, addedAt: "2026-08-29T10:00:00+08:00", isBaseline: false, actor: "周岚" },
  ],
  [
    { taskId: "fragrance-creator-business", at: "2026-08-27T16:00:00+08:00", kind: "accepted", note: "达人合作确认记录完成核对，验收商务交付 6 h。", actor: "周岚" },
    { taskId: "fragrance-product", at: "2026-08-29T16:00:00+08:00", kind: "accepted", note: "价格、赠品与库存确认记录完成核对，验收商品交付 5 h。", actor: "周岚" },
    { taskId: "fragrance-data", at: "2026-08-31T09:00:00+08:00", kind: "accepted", note: "看板与归因口径完成约定范围的核对，验收数据交付 4 h；保留已注明的数据限制。", actor: "周岚" },
  ],
);

const weeklyRetroScenario = scenario(
  "weekly-retro-notes",
  ["2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01"],
  [
    { taskId: "weekly-retro-decisions", taskTitle: "汇总本周关键决定与依据", ewdHours: 2, addedAt: "2026-08-29T09:00:00+08:00", isBaseline: true, actor: "周岚" },
    { taskId: "weekly-retro-open-issues", taskTitle: "整理未解决问题与责任边界", ewdHours: 3, addedAt: "2026-08-29T09:05:00+08:00", isBaseline: true, actor: "周岚" },
    { taskId: "weekly-retro-actions", taskTitle: "确认下周行动项与负责人", ewdHours: 2, addedAt: "2026-08-31T09:00:00+08:00", isBaseline: false, actor: "周岚" },
  ],
  [
    { taskId: "weekly-retro-decisions", at: "2026-08-31T16:20:00+08:00", kind: "accepted", note: "关键决定与对应依据完成复盘成员核对，验收纪要决定部分 2 h。", actor: "周岚" },
  ],
);

const platformScenario = scenario(
  "platform-mobile-release",
  ["2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01"],
  [
    { taskId: "platform-api-contract", taskTitle: "冻结离线同步 API 契约", ewdHours: 6, addedAt: "2026-08-25T09:10:00+08:00", isBaseline: true, actor: "程砚" },
    { taskId: "platform-ios-review", taskTitle: "完成 iOS 候选版审核材料", ewdHours: 12, addedAt: "2026-08-25T09:12:00+08:00", isBaseline: true, actor: "乔安" },
    { taskId: "platform-android-staged", taskTitle: "验证 Android 分阶段发布与回滚", ewdHours: 10, addedAt: "2026-08-25T09:14:00+08:00", isBaseline: true, actor: "唐澈" },
    { taskId: "platform-observability-alerts", taskTitle: "配置同步链路 SLO 与灰度告警", ewdHours: 7, addedAt: "2026-08-25T09:16:00+08:00", isBaseline: true, actor: "叶宁" },
    { taskId: "platform-security-gate", taskTitle: "签发移动数据安全门禁结论", ewdHours: 9, addedAt: "2026-08-25T09:18:00+08:00", isBaseline: true, actor: "宋衡" },
    { taskId: "platform-support-runbook", taskTitle: "更新同步故障支持手册", ewdHours: 6, addedAt: "2026-08-28T11:30:00+08:00", isBaseline: false, actor: "许悦" },
  ],
  [
    { taskId: "platform-api-contract", at: "2026-08-27T15:00:00+08:00", kind: "estimate-revised", ewdHours: 8, note: "兼容旧客户端冲突重放的范围明确后，将 API 契约 EWD 从 6 h 修订为 8 h；这是改估，不是新增任务。", actor: "程砚" },
    { taskId: "platform-api-contract", at: "2026-08-29T17:20:00+08:00", kind: "accepted", ewdHours: 8, note: "API 契约经双端客户端与网关回放核对，验收 8 h。", actor: "程砚" },
    { taskId: "platform-observability-alerts", at: "2026-08-30T10:10:00+08:00", kind: "accepted", note: "错误率、积压和同步延迟告警完成演练，验收 7 h。", actor: "叶宁" },
    { taskId: "platform-android-staged", at: "2026-08-30T14:30:00+08:00", kind: "scope-removed", note: "厂商通道回滚能力待核对，Android 分阶段发布暂时移出本轮门禁范围。", actor: "唐澈" },
    { taskId: "platform-observability-alerts", at: "2026-08-31T08:40:00+08:00", kind: "reopened", note: "灰度环境出现告警合并遗漏，撤回监控交付验收并重开处理。", actor: "叶宁" },
    { taskId: "platform-android-staged", at: "2026-09-01T09:05:00+08:00", kind: "scope-added", ewdHours: 10, note: "完成回滚桌面演练后，将 Android 分阶段发布重新纳入本轮门禁范围，估算仍为 10 h。", actor: "唐澈" },
  ],
);

const factoryScenario = scenario(
  "factory-pilot-ramp",
  ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01"],
  [
    { taskId: "factory-supplier-ppap", taskTitle: "签收电芯与锁体供应商 PPAP", ewdHours: 10, addedAt: "2026-08-24T08:30:00+08:00", isBaseline: true, actor: "沈工" },
    { taskId: "factory-line-validation", taskTitle: "完成工装与首件参数验证", ewdHours: 12, addedAt: "2026-08-24T08:32:00+08:00", isBaseline: true, actor: "赵妍" },
    { taskId: "factory-quality-gate", taskTitle: "签发 PVT 质量门禁结论", ewdHours: 10, addedAt: "2026-08-24T08:34:00+08:00", isBaseline: true, actor: "贺青" },
    { taskId: "factory-operator-training", taskTitle: "完成关键工位培训与技能确认", ewdHours: 14, addedAt: "2026-08-24T08:36:00+08:00", isBaseline: true, actor: "唐静" },
    { taskId: "factory-packaging-readiness", taskTitle: "验证包装、运输与标签版本", ewdHours: 11, addedAt: "2026-08-24T08:38:00+08:00", isBaseline: true, actor: "冯维" },
    { taskId: "factory-capacity-trial", taskTitle: "执行 4 小时产能试跑", ewdHours: 13, addedAt: "2026-08-24T08:40:00+08:00", isBaseline: true, actor: "罗骁" },
    { taskId: "factory-label-rework", taskTitle: "完成 PVT 标签错版返工", ewdHours: 8, addedAt: "2026-08-24T08:42:00+08:00", isBaseline: true, actor: "冯维" },
  ],
  [
    { taskId: "factory-supplier-ppap", at: "2026-08-25T17:10:00+08:00", kind: "accepted", note: "首版尺寸报告、材质证明和样件签署完成核对，按当时范围验收 PPAP 交付 10 h。", actor: "沈工" },
    { taskId: "factory-supplier-ppap", at: "2026-08-26T09:20:00+08:00", kind: "reopened", note: "供应商补发的阻燃报告版本不一致，撤回 PPAP 验收并重开核对。", actor: "贺青" },
    { taskId: "factory-supplier-ppap", at: "2026-08-27T11:00:00+08:00", kind: "estimate-revised", ewdHours: 12, note: "加入补充报告审阅与批次追溯后，将 PPAP EWD 从 10 h 修订为 12 h。", actor: "沈工" },
    { taskId: "factory-packaging-readiness", at: "2026-08-28T10:10:00+08:00", kind: "scope-removed", note: "欧盟标签图纸未受控，包装验证暂时移出 PVT 放行范围。", actor: "冯维" },
    { taskId: "factory-line-validation", at: "2026-08-29T16:00:00+08:00", kind: "estimate-revised", ewdHours: 15, note: "增加换型与异常停线复测后，将产线验证 EWD 从 12 h 修订为 15 h；历史按事件时间生效。", actor: "赵妍" },
    { taskId: "factory-packaging-readiness", at: "2026-08-30T08:45:00+08:00", kind: "scope-added", ewdHours: 11, note: "受控标签图纸已发布，将包装验证重新纳入 PVT 放行范围，估算仍为 11 h。", actor: "冯维" },
    { taskId: "factory-supplier-ppap", at: "2026-08-30T16:30:00+08:00", kind: "accepted", ewdHours: 12, note: "补充报告、批次追溯和样件签署均完成复核，重新验收 PPAP 交付 12 h。", actor: "沈工" },
  ],
);

const serviceScenario = scenario(
  "service-incident-recovery",
  ["2026-08-30", "2026-08-31", "2026-09-01"],
  [
    { taskId: "service-traffic-mitigation", taskTitle: "执行同步流量削峰与租户隔离", ewdHours: null, addedAt: "2026-08-30T02:05:00+08:00", isBaseline: true, actor: "沈闻" },
    { taskId: "service-data-repair", taskTitle: "修复受影响同步状态记录", ewdHours: null, addedAt: "2026-08-30T02:15:00+08:00", isBaseline: true, actor: "白露" },
    { taskId: "service-customer-comms", taskTitle: "完成受影响客户分层沟通", ewdHours: 10, addedAt: "2026-08-31T08:30:00+08:00", isBaseline: false, actor: "陈沁" },
    { taskId: "service-root-cause", taskTitle: "签发队列竞态根因分析", ewdHours: 12, addedAt: "2026-08-31T10:00:00+08:00", isBaseline: false, actor: "薛航" },
    { taskId: "service-compensation-review", taskTitle: "核对 SLA 与补偿适用范围", ewdHours: 8, addedAt: "2026-09-01T08:15:00+08:00", isBaseline: false, actor: "江予" },
    { taskId: "service-runbook-update", taskTitle: "更新同步积压处置手册", ewdHours: 9, addedAt: "2026-09-01T08:30:00+08:00", isBaseline: false, actor: "陆遥" },
  ],
  [
    { taskId: "service-traffic-mitigation", at: "2026-08-31T07:20:00+08:00", kind: "estimate-revised", ewdHours: 4, note: "止损动作稳定后首次形成可核对范围，记录 EWD 4 h；不回填 8 月 30 日的未知值。", actor: "沈闻" },
    { taskId: "service-traffic-mitigation", at: "2026-08-31T07:50:00+08:00", kind: "accepted", ewdHours: 4, note: "队列积压停止增长且租户隔离持续两个观察窗稳定，验收止损交付 4 h。", actor: "沈闻" },
    { taskId: "service-data-repair", at: "2026-08-31T09:00:00+08:00", kind: "estimate-revised", ewdHours: 15, note: "完成受影响分片抽样后，将数据修复从缺估更新为 15 h；此前快照继续保持缺估。", actor: "白露" },
    { taskId: "service-data-repair", at: "2026-08-31T20:10:00+08:00", kind: "accepted", ewdHours: 15, note: "首轮修复、全量对账和抽样复核完成，按当时证据验收数据修复 15 h。", actor: "白露" },
    { taskId: "service-data-repair", at: "2026-09-01T09:20:00+08:00", kind: "reopened", ewdHours: 15, note: "长尾租户对账出现两笔差异，撤回数据修复验收并重开。", actor: "白露" },
  ],
);

const creatorPoolScenario = scenario(
  "ccx-creator-pool-governance",
  ["2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02"],
  [
    { taskId: "ccx-creator-identity-merge", taskTitle: "合并达人跨平台重复身份", ewdHours: 4, addedAt: "2026-08-25T09:00:00+08:00", isBaseline: true, actor: "韩序" },
    { taskId: "ccx-creator-consent-audit", taskTitle: "核对达人联系方式与素材授权状态", ewdHours: 6, addedAt: "2026-08-25T09:05:00+08:00", isBaseline: true, actor: "苏禾" },
    { taskId: "ccx-creator-performance-window", taskTitle: "统一达人近九十天绩效窗口", ewdHours: 7, addedAt: "2026-08-25T09:10:00+08:00", isBaseline: true, actor: "韩序" },
    { taskId: "ccx-creator-risk-score", taskTitle: "签发达人履约与合规风险分层", ewdHours: 5, addedAt: "2026-08-25T09:15:00+08:00", isBaseline: true, actor: "苏禾" },
    { taskId: "ccx-creator-ratecard-renewal", taskTitle: "复核核心达人四季度报价卡", ewdHours: 6, addedAt: "2026-08-26T10:00:00+08:00", isBaseline: false, actor: "陈默" },
    { taskId: "ccx-creator-monthly-committee", taskTitle: "召开九月达人池决策会", ewdHours: 3, addedAt: "2026-08-26T10:30:00+08:00", isBaseline: false, actor: "周岚" },
    { taskId: "ccx-creator-inactive-exit", taskTitle: "关闭失效达人与过期合作入口", ewdHours: 5, addedAt: "2026-08-30T10:00:00+08:00", isBaseline: false, actor: "陈默" },
    { taskId: "ccx-creator-vertical-recruit", taskTitle: "建立熟龄护肤达人补充名单", ewdHours: 6, addedAt: "2026-08-30T10:30:00+08:00", isBaseline: false, actor: "陈默" },
  ],
  [
    { taskId: "ccx-creator-identity-merge", at: "2026-08-27T10:00:00+08:00", kind: "estimate-revised", ewdHours: 6, actor: "韩序", note: "身份合并补入 18 组合同主体核对，EWD 从 4 h 改为 6 h；任务范围不新增叶子。" },
    { taskId: "ccx-creator-identity-merge", at: "2026-08-27T17:00:00+08:00", kind: "accepted", ewdHours: 6, actor: "韩序", note: "首版身份映射完成 42 组候选复核，按当时记录验收身份合并 6 h。" },
    { taskId: "ccx-creator-identity-merge", at: "2026-08-28T09:30:00+08:00", kind: "reopened", ewdHours: 6, actor: "韩序", note: "抽检发现 3 组合同主体不同或证明不足的候选被误合并，撤回身份合并验收，已完成量退回 0 h。" },
    { taskId: "ccx-creator-performance-window", at: "2026-08-28T14:00:00+08:00", kind: "estimate-revised", ewdHours: 9, actor: "韩序", note: "绩效预检发现 37 笔跨窗退款与 2 位短样本达人，增加退款截点和缺样本核对，EWD 从 7 h 改为 9 h。" },
    { taskId: "ccx-creator-identity-merge", at: "2026-08-29T11:00:00+08:00", kind: "accepted", ewdHours: 6, actor: "韩序", note: "3 组误合并已拆回；42 组候选最终为 34 组合并、8 组保留分离，原 ID 与合同映射复核通过，再次验收 6 h。" },
    { taskId: "ccx-creator-consent-audit", at: "2026-08-29T14:00:00+08:00", kind: "estimate-revised", ewdHours: 8, actor: "苏禾", note: "24 位核心达人中有 7 位待补证、2 位受渠道限制，授权核对增加逐素材检查，EWD 从 6 h 改为 8 h。" },
    { taskId: "ccx-creator-risk-score", at: "2026-08-31T10:00:00+08:00", kind: "estimate-revised", ewdHours: 7, actor: "苏禾", note: "风险签发标准补入 5 起履约事件的复核人与失效日核对，EWD 从 5 h 改为 7 h；仍待授权和绩效交付。" },
    { taskId: "ccx-creator-ratecard-renewal", at: "2026-08-31T11:00:00+08:00", kind: "estimate-revised", ewdHours: 8, actor: "陈默", note: "四季度报价卡增加 3 位核心达人的内容费、佣金和授权费分项测算，EWD 从 6 h 改为 8 h；尚未开展正式谈判。" },
    { taskId: "ccx-creator-monthly-committee", at: "2026-09-01T11:00:00+08:00", kind: "scope-removed", ewdHours: 3, actor: "周岚", note: "拟将九月决策会并入月度经营会，暂从本轮治理执行范围移出 3 h；会议准备草稿保留，未形成达人决定。" },
    { taskId: "ccx-creator-performance-window", at: "2026-09-01T16:00:00+08:00", kind: "accepted", ewdHours: 9, actor: "韩序", note: "首版近 90 天绩效表完成 37 笔跨窗退款回放与自然/付费拆分，按当时抽样验收 9 h。" },
    { taskId: "ccx-creator-performance-window", at: "2026-09-02T09:00:00+08:00", kind: "reopened", ewdHours: 9, actor: "韩序", note: "次日全量复核发现 2 笔边界退款仍按支付日归窗，撤回绩效表验收；修订稿待审核，已完成量扣回 9 h。" },
    { taskId: "ccx-creator-monthly-committee", at: "2026-09-02T11:00:00+08:00", kind: "scope-added", ewdHours: 4, actor: "周岚", note: "3 项口径争议需要单独决策，九月决策会重新纳入治理范围；增加逐项责任与期限记录，按 4 h 登记，计划仍为 9 月 28–30 日。" },
    { taskId: "ccx-creator-vertical-recruit", at: "2026-09-02T14:00:00+08:00", kind: "estimate-revised", ewdHours: 7, actor: "陈默", note: "18 条熟龄护肤线索预检出 4 条既有合作重复、2 条身份待查，补入人工去重与候选备选量，EWD 从 6 h 改为 7 h。" },
  ],
);

// 中间层仅投影根账本，不另造验收事件，也不把父级估算叠加进叶子总量。
const creatorPoolGroups = new Map<string, readonly string[]>([
  ["ccx-creator-pool-data-track", ["ccx-creator-identity-merge", "ccx-creator-consent-audit", "ccx-creator-performance-window", "ccx-creator-risk-score"]],
  ["ccx-creator-pool-decision-track", ["ccx-creator-ratecard-renewal", "ccx-creator-inactive-exit", "ccx-creator-vertical-recruit", "ccx-creator-monthly-committee"]],
]);

/** 每个顶层范围拥有独立账本；中间层读取同一账本的子集。 */
export const taskProgressScenarioIds = [
  fragranceScenario.parentTaskId,
  weeklyRetroScenario.parentTaskId,
  platformScenario.parentTaskId,
  factoryScenario.parentTaskId,
  serviceScenario.parentTaskId,
  creatorPoolScenario.parentTaskId,
] as const;

const scenarios = new Map<string, TaskProgressScenario>([
  fragranceScenario,
  weeklyRetroScenario,
  platformScenario,
  factoryScenario,
  serviceScenario,
  creatorPoolScenario,
].map((item) => [item.parentTaskId, item]));

const validDay = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
};
const validInstant = (value: string) => {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || !validDay(match[1]) || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4] ?? 0) > 59) return false;
  return Number.isFinite(Date.parse(value));
};
const validHours = (value: number | null) => value === null || (Number.isFinite(value) && value >= 0);
const byTime = (left: TaskProgressEvent, right: TaskProgressEvent) => Date.parse(left.at) - Date.parse(right.at);

/**
 * 校验演示账本的结构与状态迁移。它不会修改数据，也不会用当前 Task 状态修复错误。
 * 返回空数组表示可投影；异常记录必须在夹具层修正，不能在 UI 层静默过滤。
 */
export function validateTaskProgressScenario(input: TaskProgressScenario): string[] {
  const issues: string[] = [];
  if (!input.parentTaskId.trim()) issues.push("父任务 ID 为空");
  const snapshotDates = [...input.snapshotDates];
  if (snapshotDates.some((date) => !validDay(date))) issues.push("快照日期必须是有效 ISO 日期");
  if (snapshotDates.some((date, index) => index > 0 && date <= snapshotDates[index - 1])) issues.push("快照日期必须严格升序且不重复");
  const ids = new Set<string>();
  const scope = new Map<string, { accepted: boolean; ewdHours: number | null }>();
  const knownKinds = new Set<TaskProgressEventKind>(["scope-added", "accepted", "estimate-revised", "reopened", "scope-removed"]);
  for (const event of [...input.events].sort(byTime)) {
    if (ids.has(event.id)) issues.push(`事件 ID 重复：${event.id}`);
    ids.add(event.id);
    if (event.source !== "example") issues.push(`事件来源无效：${event.id}`);
    if (event.parentTaskId !== input.parentTaskId) issues.push(`事件父任务不一致：${event.id}`);
    if (!event.taskId.trim() || event.taskId === input.parentTaskId) issues.push(`事件必须指向叶子任务：${event.id}`);
    if (!validInstant(event.at)) issues.push(`事件时间无效：${event.id}`);
    if (!validHours(event.ewdHours)) issues.push(`事件 EWD 无效：${event.id}`);
    if (!event.note.trim()) issues.push(`事件说明不能为空：${event.id}`);
    if (!knownKinds.has(event.kind)) {
      issues.push(`事件类型无效：${event.id}`);
      continue;
    }
    const current = scope.get(event.taskId);
    switch (event.kind) {
      case "scope-added":
        if (current) issues.push(`重复纳入范围：${event.id}`);
        else scope.set(event.taskId, { accepted: false, ewdHours: event.ewdHours });
        break;
      case "accepted":
        if (!current) issues.push(`范围外验收：${event.id}`);
        else if (current.accepted) issues.push(`重复验收：${event.id}`);
        else {
          if (event.ewdHours !== current.ewdHours) issues.push(`验收事件的 EWD 与当时有效估算不一致：${event.id}`);
          scope.set(event.taskId, { ...current, accepted: true });
        }
        break;
      case "estimate-revised":
        if (!current) issues.push(`范围外改估：${event.id}`);
        else scope.set(event.taskId, { ...current, ewdHours: event.ewdHours });
        break;
      case "reopened":
        if (!current?.accepted) issues.push(`未验收任务不能重开：${event.id}`);
        else {
          if (event.ewdHours !== current.ewdHours) issues.push(`重开事件的 EWD 与当时有效估算不一致：${event.id}`);
          scope.set(event.taskId, { ...current, accepted: false });
        }
        break;
      case "scope-removed":
        if (!current) issues.push(`范围外移出：${event.id}`);
        else {
          if (event.ewdHours !== current.ewdHours) issues.push(`移出事件的 EWD 与当时有效估算不一致：${event.id}`);
          scope.delete(event.taskId);
        }
        break;
    }
  }
  if (snapshotDates.length > 0 && input.events.some((event) => event.at.slice(0, 10) > snapshotDates.at(-1)!)) {
    issues.push("存在晚于最后快照的事件");
  }
  return issues;
}

/**
 * 从一份有效事件账本生成每日阶梯快照。
 *
 * - 只累计当前范围内的叶子 EWD，父任务本身永远不入账。
 * - 改估会同时改变已验收叶子的范围值与完成值，但不会伪装成范围新增。
 * - 重开撤回完成量；移出同时撤出该叶子的范围与已验收量。
 * - 缺估叶子计入 totalLeafCount，不计入 estimatedLeafCount；已估子集仍可显示，
 *   全部缺估时两条工时值均为 null，而不是 0。
 * - 每个观察点只回放当时及以前的事件；后续估算不会回填过去。
 */
export function buildTaskProgressBurnUp(input: TaskProgressScenario): TaskBurnUpSeries {
  const issues = validateTaskProgressScenario(input);
  if (issues.length > 0) throw new Error(`Invalid task progress scenario: ${issues.join("；")}`);
  const events = [...input.events].sort(byTime);
  const scope = new Map<string, { ewdHours: number | null; accepted: boolean }>();
  let cursor = 0;
  return {
    source: "example",
    points: input.snapshotDates.map((at) => {
      const dayEvents: TaskProgressEvent[] = [];
      while (cursor < events.length && events[cursor].at.slice(0, 10) <= at) {
        const event = events[cursor++];
        dayEvents.push(event);
        const current = scope.get(event.taskId);
        switch (event.kind) {
          case "scope-added":
            scope.set(event.taskId, { ewdHours: event.ewdHours, accepted: false });
            break;
          case "accepted":
            if (current) scope.set(event.taskId, { ...current, accepted: true });
            break;
          case "estimate-revised":
            if (current) scope.set(event.taskId, { ...current, ewdHours: event.ewdHours });
            break;
          case "reopened":
            if (current) scope.set(event.taskId, { ...current, accepted: false });
            break;
          case "scope-removed":
            scope.delete(event.taskId);
            break;
        }
      }
      const leafValues = [...scope.values()];
      const estimated = leafValues.filter((leaf): leaf is { ewdHours: number; accepted: boolean } => leaf.ewdHours !== null);
      const hasAnyEstimate = estimated.length > 0 || leafValues.length === 0;
      return {
        at,
        scopeHours: hasAnyEstimate ? estimated.reduce((total, leaf) => total + leaf.ewdHours, 0) : null,
        completedHours: hasAnyEstimate ? estimated.reduce((total, leaf) => total + (leaf.accepted ? leaf.ewdHours : 0), 0) : null,
        estimatedLeafCount: estimated.length,
        totalLeafCount: leafValues.length,
        note: dayEvents.length > 0
          ? dayEvents.map((event) => event.note).join(" ")
          : "当日无范围、改估、验收、重开或移出事件，账本状态保持不变。",
      };
    }),
  };
}

/** 升序返回本任务或父级范围的固定演示事件；读取结果可独立编辑。 */
export function getTaskProgressEvents(taskId: string): TaskProgressEvent[] {
  if (!taskId) return [];
  const groupLeaves = creatorPoolGroups.get(taskId);
  return [...scenarios.values()]
    .flatMap((item) => item.events)
    .filter((event) => event.taskId === taskId || event.parentTaskId === taskId || groupLeaves?.includes(event.taskId))
    .sort(byTime)
    .map((event) => ({ ...event }));
}

/** Projects the latest explicit leaf acceptance state; missing ledgers stay unknown. */
export function getTaskAcceptedEffortMinutes(taskId: string): Record<string, number | null> {
  const state = new Map<string, { accepted: boolean; minutes: number | null }>();
  for (const event of getTaskProgressEvents(taskId)) {
    if (event.kind === "scope-removed") {
      state.delete(event.taskId);
      continue;
    }
    const current = state.get(event.taskId) ?? { accepted: false, minutes: null };
    const minutes = event.ewdHours === null ? null : Math.round(event.ewdHours * 60);
    if (event.kind === "accepted") state.set(event.taskId, { accepted: true, minutes });
    else if (event.kind === "reopened" || event.kind === "scope-added") state.set(event.taskId, { accepted: false, minutes });
    else state.set(event.taskId, { ...current, minutes });
  }
  return Object.fromEntries([...state].map(([id, value]) => [id, value.accepted ? value.minutes : 0]));
}

/**
 * 按父任务 ID 投影固定演示账本；无已登记账本（包括叶子和无历史父任务）返回 undefined。
 */
export function getTaskProgressBurnUp(taskId: string): TaskBurnUpSeries | undefined {
  const groupLeaves = creatorPoolGroups.get(taskId);
  const item = scenarios.get(taskId) ?? (groupLeaves ? {
    parentTaskId: taskId,
    snapshotDates: creatorPoolScenario.snapshotDates,
    events: creatorPoolScenario.events.filter((event) => groupLeaves.includes(event.taskId)).map((event) => ({ ...event, parentTaskId: taskId })),
  } : undefined);
  if (!item) return undefined;
  const series = buildTaskProgressBurnUp(item);
  return { ...series, points: series.points.map((point) => ({ ...point })) };
}
