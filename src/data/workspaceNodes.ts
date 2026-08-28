import type { TaskStatus } from "../components/TaskStatusBadge";

type BaseNode = {
  id: string;
  kind: "folder" | "task" | "file";
  name: string;
  parentId: string | null;
  updatedAt: string;
};

export type FolderNode = BaseNode & {
  kind: "folder";
};

export type TaskIconTone = "neutral" | "blue" | "cyan" | "green" | "amber" | "red" | "purple" | "pink";
export type TaskIconName = "list-todo" | "clipboard-check" | "target" | "flag" | "briefcase" | "file-check" | "chart" | "sparkles";

export type TaskNode = BaseNode & {
  kind: "task";
  ownerId: string;
  parentTaskId?: string;
  status: TaskStatus;
  goal?: string;
  dueAt?: string;
  iconName?: TaskIconName;
  iconTone?: TaskIconTone;
  labels?: string[];
};

export type FileNode = BaseNode & {
  kind: "file";
  fileType: string;
  size?: string;
};

export type WorkspaceNode = FolderNode | TaskNode | FileNode;

export const workspaceRootId = "workspace-root";

const workspaceNodeSeeds: WorkspaceNode[] = [
  { id: workspaceRootId, kind: "folder", name: "任务", parentId: null, updatedAt: "刚刚" },
  { id: "retail", kind: "folder", name: "零售业务", parentId: workspaceRootId, updatedAt: "今天" },
  { id: "retail-pos", kind: "folder", name: "POS 与交易", parentId: "retail", updatedAt: "10 分钟前" },
  { id: "coupon-ops", kind: "folder", name: "优惠券核销", parentId: "retail-pos", updatedAt: "10 分钟前" },
  { id: "refund-ops", kind: "folder", name: "退款与撤单", parentId: "retail-pos", updatedAt: "今天" },
  { id: "offline-trade", kind: "folder", name: "离线交易", parentId: "retail-pos", updatedAt: "昨天" },
  { id: "retail-fulfillment", kind: "folder", name: "门店履约", parentId: "retail", updatedAt: "28 分钟前" },
  { id: "inventory-flow", kind: "folder", name: "库存流转", parentId: "retail-fulfillment", updatedAt: "28 分钟前" },
  { id: "order-delivery", kind: "folder", name: "订单交付", parentId: "retail-fulfillment", updatedAt: "今天" },
  { id: "retail-member", kind: "folder", name: "会员经营", parentId: "retail", updatedAt: "昨天" },
  { id: "member-tier", kind: "folder", name: "等级与权益", parentId: "retail-member", updatedAt: "昨天" },
  { id: "member-points", kind: "folder", name: "积分结算", parentId: "retail-member", updatedAt: "2 天前" },

  { id: "finance", kind: "folder", name: "财务与合规", parentId: workspaceRootId, updatedAt: "今天" },
  { id: "finance-invoice", kind: "folder", name: "发票治理", parentId: "finance", updatedAt: "4 小时前" },
  { id: "invoice-issue", kind: "folder", name: "开票与校验", parentId: "finance-invoice", updatedAt: "4 小时前" },
  { id: "invoice-after-sales", kind: "folder", name: "红冲与作废", parentId: "finance-invoice", updatedAt: "昨天" },
  { id: "finance-audit", kind: "folder", name: "交易审计", parentId: "finance", updatedAt: "2 天前" },
  { id: "audit-trace", kind: "folder", name: "审计留痕", parentId: "finance-audit", updatedAt: "2 天前" },
  { id: "audit-backfill", kind: "folder", name: "历史回填", parentId: "finance-audit", updatedAt: "3 天前" },

  { id: "data-platform", kind: "folder", name: "数据平台", parentId: workspaceRootId, updatedAt: "今天" },
  { id: "data-quality-domain", kind: "folder", name: "数据质量", parentId: "data-platform", updatedAt: "今天" },
  { id: "settlement-reconciliation", kind: "folder", name: "对账一致性", parentId: "data-quality-domain", updatedAt: "1 小时前" },
  { id: "anomaly-monitor", kind: "folder", name: "异常监控", parentId: "data-quality-domain", updatedAt: "今天" },
  { id: "data-metrics", kind: "folder", name: "经营指标", parentId: "data-platform", updatedAt: "昨天" },
  { id: "retail-metrics", kind: "folder", name: "门店指标", parentId: "data-metrics", updatedAt: "昨天" },
  { id: "member-metrics", kind: "folder", name: "会员指标", parentId: "data-metrics", updatedAt: "2 天前" },

  { id: "retail-stability-program", kind: "task", name: "零售业务核心链路治理", parentId: "retail", ownerId: "周岚", status: "进行中", dueAt: "9 月 12 日", goal: "统筹 POS 与交易、门店履约和会员经营三条核心链路，收口关键风险并完成整体结果确认。", labels: ["跨团队"], updatedAt: "今天" },
  { id: "coupon-fix", kind: "task", name: "评审并灰度验证 POS 优惠券重复核销修复草案", parentId: "coupon-ops", parentTaskId: "retail-stability-program", ownerId: "周岚", status: "进行中", dueAt: "8 月 28 日", goal: "完成重复核销修复并通过退款、撤单和离线重试验证。", labels: ["高风险", "灰度发布"], updatedAt: "10 分钟前" },
  { id: "coupon-budget", kind: "task", name: "优惠券预算占用与释放一致性治理", parentId: "coupon-ops", parentTaskId: "retail-stability-program", ownerId: "陈默", status: "待审核", dueAt: "9 月 3 日", goal: "消除领券、核销和退款链路中的预算占用差异。", labels: ["跨团队"], updatedAt: "2 小时前" },
  { id: "refund-archive", kind: "task", name: "退款规则历史口径归档", parentId: "refund-ops", parentTaskId: "retail-stability-program", ownerId: "周岚", status: "已完成", labels: ["规则基线"], updatedAt: "8 月 18 日" },
  { id: "refund-timeout", kind: "task", name: "跨渠道退款超时补偿机制", parentId: "refund-ops", parentTaskId: "retail-stability-program", ownerId: "陈默", status: "进行中", dueAt: "8 月 31 日", goal: "统一线上、POS 和第三方支付退款超时后的补偿与告警。", labels: ["高风险", "客户影响"], updatedAt: "35 分钟前" },
  { id: "offline-idempotency", kind: "task", name: "门店离线交易幂等键升级", parentId: "offline-trade", parentTaskId: "retail-stability-program", ownerId: "陈默", status: "待开始", dueAt: "9 月 6 日", goal: "建立跨设备稳定的离线订单幂等标识。", labels: ["门店影响"], updatedAt: "昨天" },
  { id: "offline-replay", kind: "task", name: "断网恢复后交易重放压测", parentId: "offline-trade", parentTaskId: "retail-stability-program", ownerId: "梁川", status: "待开始", dueAt: "9 月 8 日", goal: "覆盖长时间断网、时钟漂移和批量重放场景。", labels: ["灰度发布"], updatedAt: "2 天前" },
  { id: "inventory-sync", kind: "task", name: "门店库存同步异常", parentId: "inventory-flow", parentTaskId: "retail-stability-program", ownerId: "高远", status: "进行中", dueAt: "8 月 29 日", labels: ["高风险", "门店影响"], updatedAt: "28 分钟前" },
  { id: "negative-stock", kind: "task", name: "促销高峰负库存保护", parentId: "inventory-flow", parentTaskId: "retail-stability-program", ownerId: "高远", status: "待审核", dueAt: "9 月 1 日", goal: "降低并发销售造成的负库存与跨仓超卖。", labels: ["门店影响"], updatedAt: "1 小时前" },
  { id: "split-order", kind: "task", name: "拆单履约状态回传统一", parentId: "order-delivery", parentTaskId: "retail-stability-program", ownerId: "林洁", status: "进行中", dueAt: "9 月 4 日", goal: "统一到店自提、门店配送和仓配拆单的状态回传。", labels: ["跨团队", "客户影响"], updatedAt: "45 分钟前" },
  { id: "pickup-timeout", kind: "task", name: "到店自提超时释放库存", parentId: "order-delivery", parentTaskId: "retail-stability-program", ownerId: "林洁", status: "待开始", dueAt: "9 月 7 日", goal: "明确自提超时、延长保留和库存释放规则。", labels: ["规则评审"], updatedAt: "昨天" },
  { id: "member-settlement", kind: "task", name: "会员等级权益结算规则升级", parentId: "member-tier", parentTaskId: "retail-stability-program", ownerId: "梁川", status: "待开始", dueAt: "9 月 2 日", labels: ["跨团队"], updatedAt: "昨天" },
  { id: "tier-downgrade", kind: "task", name: "会员降级保护期口径统一", parentId: "member-tier", parentTaskId: "retail-stability-program", ownerId: "许宁", status: "待审核", dueAt: "9 月 5 日", goal: "统一自然降级、人工保级和退款回退后的等级口径。", labels: ["规则评审", "客户影响"], updatedAt: "3 小时前" },
  { id: "points-expiry", kind: "task", name: "年度积分到期批处理演练", parentId: "member-points", parentTaskId: "retail-stability-program", ownerId: "许宁", status: "待开始", dueAt: "9 月 10 日", goal: "验证大规模积分到期、通知和补偿链路。", labels: ["批量回算"], updatedAt: "2 天前" },
  { id: "points-reconciliation", kind: "task", name: "积分商城扣减对账差异清理", parentId: "member-points", parentTaskId: "retail-stability-program", ownerId: "韩序", status: "进行中", dueAt: "9 月 3 日", goal: "清理积分商城订单与积分账户之间的扣减差异。", labels: ["历史数据"], updatedAt: "50 分钟前" },

  { id: "invoice-validation", kind: "task", name: "电子发票抬头校验异常专项治理", parentId: "invoice-issue", ownerId: "陈默", status: "待审核", dueAt: "8 月 30 日", goal: "修复税号校验误拦截并建立异常监控。", labels: ["客户影响", "需合规复核"], updatedAt: "4 小时前" },
  { id: "invoice-retry", kind: "task", name: "开票失败自动重试与人工接管", parentId: "invoice-issue", parentTaskId: "invoice-validation", ownerId: "林洁", status: "进行中", dueAt: "9 月 2 日", goal: "建立开票失败分级重试和人工接管闭环。", labels: ["客户影响"], updatedAt: "40 分钟前" },
  { id: "red-invoice", kind: "task", name: "部分退款红字发票拆分规则", parentId: "invoice-after-sales", ownerId: "苏禾", status: "待开始", dueAt: "9 月 6 日", goal: "确认多税率订单部分退款后的红字发票拆分方式。", labels: ["需合规复核", "规则评审"], updatedAt: "昨天" },
  { id: "invoice-void", kind: "task", name: "跨月作废转红冲流程改造", parentId: "invoice-after-sales", parentTaskId: "invoice-retry", ownerId: "苏禾", status: "待审核", dueAt: "9 月 8 日", goal: "将跨月不可作废场景稳定转入红冲流程。", labels: ["需合规复核"], updatedAt: "2 天前" },
  { id: "audit-fields", kind: "task", name: "历史交易审计字段补齐", parentId: "audit-trace", ownerId: "周岚", status: "待开始", dueAt: "9 月 5 日", labels: ["需合规复核"], updatedAt: "2 天前" },
  { id: "sensitive-access", kind: "task", name: "敏感交易查询访问留痕", parentId: "audit-trace", ownerId: "苏禾", status: "进行中", dueAt: "9 月 1 日", goal: "补齐敏感交易查询的人员、原因和导出记录。", labels: ["高风险", "需合规复核"], updatedAt: "20 分钟前" },
  { id: "trade-backfill", kind: "task", name: "2024 年交易主表审计字段回填", parentId: "audit-backfill", ownerId: "高远", status: "进行中", dueAt: "9 月 12 日", goal: "按可恢复批次回填历史交易审计字段。", labels: ["历史数据", "可回滚"], updatedAt: "1 小时前" },
  { id: "audit-sampling", kind: "task", name: "历史回填结果分层抽样复核", parentId: "audit-backfill", ownerId: "梁川", status: "已阻塞", dueAt: "9 月 15 日", goal: "按渠道、年份和金额分层验证回填准确性。", labels: ["历史数据"], updatedAt: "昨天" },

  { id: "settlement-gap", kind: "task", name: "门店日结与支付清算差异治理", parentId: "settlement-reconciliation", ownerId: "韩序", status: "进行中", dueAt: "8 月 31 日", goal: "定位门店日结与支付清算差异并形成自动核对规则。", labels: ["高风险", "跨团队"], updatedAt: "15 分钟前" },
  { id: "payment-reconcile", kind: "task", name: "聚合支付订单三方对账", parentId: "settlement-reconciliation", ownerId: "韩序", status: "待审核", dueAt: "9 月 4 日", goal: "统一业务订单、支付网关和渠道账单的核对主键。", labels: ["规则评审"], updatedAt: "3 小时前" },
  { id: "anomaly-threshold", kind: "task", name: "交易失败率动态阈值上线", parentId: "anomaly-monitor", ownerId: "韩序", status: "进行中", dueAt: "9 月 2 日", goal: "按门店与时段建立动态基线，降低固定阈值误报。", labels: ["灰度发布"], updatedAt: "25 分钟前" },
  { id: "alert-routing", kind: "task", name: "经营异常告警责任路由", parentId: "anomaly-monitor", ownerId: "林洁", status: "待开始", dueAt: "9 月 7 日", goal: "将不同异常稳定路由给业务、技术和门店责任人。", labels: ["跨团队"], updatedAt: "昨天" },
  { id: "sales-metric", kind: "task", name: "门店净销售额指标口径统一", parentId: "retail-metrics", ownerId: "韩序", status: "待审核", dueAt: "9 月 3 日", goal: "统一退款、储值和券抵扣后的净销售额口径。", labels: ["规则基线"], updatedAt: "4 小时前" },
  { id: "store-close-dashboard", kind: "task", name: "闭店日经营看板异常修正", parentId: "retail-metrics", ownerId: "韩序", status: "已完成", dueAt: "8 月 25 日", goal: "修正闭店日被误判为零销售异常的问题。", labels: [], updatedAt: "2 天前" },
  { id: "member-ltv", kind: "task", name: "会员 LTV 分层口径重算", parentId: "member-metrics", ownerId: "韩序", status: "进行中", dueAt: "9 月 6 日", goal: "统一退款、跨店消费和沉默期对 LTV 的影响。", labels: ["批量回算"], updatedAt: "1 小时前" },
  { id: "campaign-attribution", kind: "task", name: "会员活动跨渠道归因校准", parentId: "member-metrics", ownerId: "许宁", status: "待开始", dueAt: "9 月 11 日", goal: "校准小程序、短信和门店导购触点的活动归因。", labels: ["跨团队"], updatedAt: "2 天前" },

  { id: "schema", kind: "file", name: "POS 优惠券核销业务规则 v3.2.pdf", parentId: "coupon-ops", fileType: "PDF", size: "2.4 MB", updatedAt: "2 天前" },
  { id: "incident", kind: "file", name: "离线交易重放事故复盘 2026-05-18.docx", parentId: "offline-trade", fileType: "DOCX", size: "840 KB", updatedAt: "4 个月前" },
  { id: "commit", kind: "file", name: "coupon-retry 重放修复草案.patch", parentId: "coupon-ops", fileType: "PATCH", size: "18 KB", updatedAt: "刚刚" },
];

const mockTaskIconTones: Record<string, TaskIconTone> = {
  "retail-stability-program": "purple",
  "coupon-fix": "blue",
  "coupon-budget": "purple",
  "refund-archive": "green",
  "refund-timeout": "red",
  "offline-idempotency": "amber",
  "offline-replay": "cyan",
  "inventory-sync": "blue",
  "negative-stock": "amber",
  "split-order": "purple",
  "pickup-timeout": "pink",
  "member-settlement": "green",
  "tier-downgrade": "amber",
  "points-expiry": "cyan",
  "points-reconciliation": "blue",
  "invoice-validation": "red",
  "invoice-retry": "purple",
  "red-invoice": "pink",
  "invoice-void": "amber",
  "audit-fields": "cyan",
  "sensitive-access": "red",
  "trade-backfill": "green",
  "audit-sampling": "purple",
  "settlement-gap": "blue",
  "payment-reconcile": "cyan",
  "anomaly-threshold": "amber",
  "alert-routing": "pink",
  "sales-metric": "purple",
  "store-close-dashboard": "green",
  "member-ltv": "blue",
  "campaign-attribution": "cyan",
};

const mockTaskIcons: Record<string, TaskIconName> = {
  "retail-stability-program": "target",
  "coupon-fix": "clipboard-check",
  "coupon-budget": "chart",
  "refund-archive": "file-check",
  "refund-timeout": "flag",
  "offline-idempotency": "target",
  "offline-replay": "list-todo",
  "inventory-sync": "briefcase",
  "negative-stock": "flag",
  "split-order": "list-todo",
  "pickup-timeout": "target",
  "member-settlement": "briefcase",
  "tier-downgrade": "clipboard-check",
  "points-expiry": "flag",
  "points-reconciliation": "chart",
  "invoice-validation": "file-check",
  "invoice-retry": "list-todo",
  "red-invoice": "clipboard-check",
  "invoice-void": "file-check",
  "audit-fields": "chart",
  "sensitive-access": "clipboard-check",
  "trade-backfill": "chart",
  "audit-sampling": "target",
  "settlement-gap": "briefcase",
  "payment-reconcile": "clipboard-check",
  "anomaly-threshold": "sparkles",
  "alert-routing": "flag",
  "sales-metric": "chart",
  "store-close-dashboard": "file-check",
  "member-ltv": "target",
  "campaign-attribution": "sparkles",
};

const restoredMockTaskLabels: Record<string, string[]> = {
  "retail-stability-program": ["POS 治理", "数据治理", "会员权益"],
  "coupon-fix": ["POS", "灰度验证"],
  "coupon-budget": ["POS 治理", "问题调查", "POS"],
  "refund-archive": ["退款"],
  "refund-timeout": ["POS 治理", "修复与灰度", "退款"],
  "offline-idempotency": ["POS 治理", "修复与灰度", "POS"],
  "offline-replay": ["POS 治理", "灰度验证", "POS"],
  "inventory-sync": ["库存"],
  "negative-stock": ["POS 治理", "修复与灰度", "库存"],
  "split-order": ["POS 治理", "修复与灰度", "POS"],
  "pickup-timeout": ["POS 治理", "问题调查", "库存"],
  "member-settlement": ["会员"],
  "tier-downgrade": ["会员权益", "问题调查", "会员"],
  "points-expiry": ["会员权益", "灰度验证", "会员"],
  "points-reconciliation": ["会员权益", "问题调查", "会员"],
  "invoice-validation": ["发票"],
  "invoice-retry": ["数据治理", "修复与灰度", "发票"],
  "red-invoice": ["数据治理", "问题调查", "发票"],
  "invoice-void": ["数据治理", "修复与灰度", "发票"],
  "audit-fields": ["审计"],
  "sensitive-access": ["数据治理", "验证", "审计"],
  "trade-backfill": ["数据治理", "修复与灰度", "审计"],
  "audit-sampling": ["数据治理", "验证", "审计"],
  "settlement-gap": ["数据治理", "问题调查", "POS"],
  "payment-reconcile": ["数据治理", "验证", "POS"],
  "anomaly-threshold": ["数据治理", "灰度验证", "POS"],
  "alert-routing": ["数据治理", "修复与灰度", "POS"],
  "sales-metric": ["数据治理", "验证", "POS"],
  "store-close-dashboard": ["数据治理", "验证", "POS"],
  "member-ltv": ["会员权益", "验证", "会员"],
  "campaign-attribution": ["会员权益", "问题调查", "会员"],
};

export const workspaceNodes: WorkspaceNode[] = workspaceNodeSeeds
  .filter((node) => node.id === workspaceRootId || node.kind === "task")
  .map((node) => node.kind === "task"
    ? { ...node, iconName: mockTaskIcons[node.id] ?? "list-todo", iconTone: mockTaskIconTones[node.id] ?? "neutral", labels: restoredMockTaskLabels[node.id] ?? node.labels, parentId: workspaceRootId }
    : node);

const retiredMockParentMap: Record<string, string> = {
  pos: "retail-pos",
  governance: "data-platform",
  research: "refund-ops",
  delivery: "coupon-ops",
  "store-fulfillment": "retail-fulfillment",
  member: "retail-member",
  "data-quality": "data-quality-domain",
  compliance: "finance-audit",
};

export function upgradeWorkspaceMockNodes(value: unknown): WorkspaceNode[] {
  if (!Array.isArray(value)) return workspaceNodes;
  const seedIds = new Set(workspaceNodeSeeds.map((node) => node.id));
  Object.keys(retiredMockParentMap).forEach((id) => seedIds.add(id));
  const customNodes = (value as WorkspaceNode[])
    .filter((node): node is TaskNode => node.kind === "task" && !seedIds.has(node.id))
    .map((node) => ({ ...node, parentId: workspaceRootId }));
  return [...workspaceNodes, ...customNodes];
}

export function normalizeWorkspaceNodes(value: unknown): WorkspaceNode[] {
  if (!Array.isArray(value)) return workspaceNodes;
  const storedNodes = value as WorkspaceNode[];
  const storedRoot = storedNodes.find((node) => node.id === workspaceRootId && node.kind === "folder") ?? workspaceNodes[0];
  const flatStoredNodes: WorkspaceNode[] = [storedRoot, ...storedNodes
    .filter((node): node is TaskNode => node.kind === "task")
    .map((node) => ({ ...node, parentId: workspaceRootId }))];
  const denseMockLabels: Record<string, string[]> = {
    "coupon-fix": ["缺陷修复", "高风险", "灰度发布", "离线重试"],
    "inventory-sync": ["缺陷修复", "高风险", "门店影响", "可回滚"],
    "member-settlement": ["规则评审", "跨团队", "批量回算", "客户影响"],
    "invoice-validation": ["数据质量", "客户影响", "需合规复核"],
    "audit-fields": ["数据补齐", "历史数据", "需合规复核", "跨团队"],
    "refund-archive": ["历史归档", "退款规则", "规则基线"],
  };
  const sparseMockLabels: Record<string, string[]> = {
    "coupon-fix": ["高风险", "灰度发布"],
    "inventory-sync": ["高风险", "门店影响"],
    "member-settlement": ["跨团队"],
    "invoice-validation": ["客户影响", "需合规复核"],
    "audit-fields": ["需合规复核"],
    "refund-archive": ["规则基线"],
  };
  const matchesSeedLabels = (expected: Record<string, string[]>) => Object.entries(expected).every(([id, labels]) => {
      const node = storedNodes.find((item) => item.id === id);
      return node?.kind === "task" && node.labels?.length === labels.length && labels.every((label) => node.labels?.includes(label));
    });
  const isLegacyMockSeed = matchesSeedLabels(denseMockLabels) || matchesSeedLabels(sparseMockLabels);
  if (!isLegacyMockSeed) return flatStoredNodes;
  return upgradeWorkspaceMockNodes(storedNodes);
}
