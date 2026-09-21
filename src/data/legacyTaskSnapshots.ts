import type { TaskStatus } from "../components/TaskStatusBadge";

export type LegacyTaskSnapshot = {
  childTaskIds?: string[];
  contextIds: string[];
  creatorId?: string;
  createdAt: string;
  goal: string;
  id: string;
  owner?: string[];
  ownerAssignmentStatus?: "confirmed" | "pending-acceptance";
  ownerId?: string;
  parentTaskId?: string;
  participants: string[];
  plannedEndOn?: string;
  plannedStartOn?: string;
  planConfirmed?: boolean;
  proposedOwnerId?: string;
  status?: TaskStatus;
  title: string;
};

export type LegacyTaskSource = {
  id: string;
  snippet: string;
  title: string;
  type: "change" | "data" | "document" | "task";
};

const legacyTaskStorageKey = "agentdoor-created-task";
const legacyTasksStorageKey = "agentdoor-created-tasks";

const loadStoredValue = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

const normalizePeriod = (task: LegacyTaskSnapshot): LegacyTaskSnapshot => {
  const { ownerAssignmentStatus: _legacyStatus, proposedOwnerId: legacyOwnerId, ...current } = task;
  const normalized = { ...current, ownerId: legacyOwnerId ?? task.ownerId };
  if (!task.plannedStartOn || !task.plannedEndOn) {
    return { ...normalized, plannedEndOn: undefined, plannedStartOn: undefined };
  }
  return {
    ...normalized,
    plannedEndOn: task.plannedEndOn < task.plannedStartOn ? task.plannedStartOn : task.plannedEndOn,
  };
};

export const loadLatestLegacyTaskSnapshot = (): LegacyTaskSnapshot | null =>
  (() => {
    const task = loadStoredValue<LegacyTaskSnapshot | null>(legacyTaskStorageKey, null);
    return task ? normalizePeriod(task) : null;
  })();

export const loadLegacyTaskSnapshots = (): Record<string, LegacyTaskSnapshot> => {
  const storedTasks = loadStoredValue<Record<string, LegacyTaskSnapshot>>(legacyTasksStorageKey, {});
  const normalizedTasks = Object.fromEntries(
    Object.entries(storedTasks).map(([id, task]) => [id, normalizePeriod(task)]),
  );
  const latestTask = loadLatestLegacyTaskSnapshot();
  if (!latestTask || normalizedTasks[latestTask.id]) return normalizedTasks;
  return { ...normalizedTasks, [latestTask.id]: normalizePeriod(latestTask) };
};

export const persistLegacyTaskSnapshots = (tasks: Record<string, LegacyTaskSnapshot>) => {
  localStorage.setItem(legacyTasksStorageKey, JSON.stringify(tasks));
};

// Read-only compatibility catalog for Task snapshots created before the
// interactive creation surface was retired. It is not a creation scenario.
export const legacyTaskSources: LegacyTaskSource[] = [
  { id: "one-on-one-notes", title: "周岚 × 陈默上次一对一纪要.docx", snippet: "上次确认了重试链路压力、评审负载和需要产品补充的边界。", type: "document" },
  { id: "member-refund-rule", title: "会员退款与权益回收规则 v2.6.pdf", snippet: "退款后权益回收按原支付批次执行，跨月退款需保留结算快照。", type: "document" },
  { id: "finance-reconciliation-map", title: "会员退款财务对账字段映射.docx", snippet: "列出退款单、权益回收单与总账凭证的关联字段及跨期处理口径。", type: "document" },
  { id: "refund-difference-task", title: "7 月会员退款差异复核", snippet: "历史复核发现 18 笔跨月退款未携带原结算批次。", type: "task" },
  { id: "invoice-fallback-plan", title: "电子发票超时降级方案 v1.4.docx", snippet: "税局接口超过 8 秒时进入延迟开票队列，并向订单侧返回受理状态。", type: "document" },
  { id: "tax-api-contract", title: "税务平台开票接口契约 2026Q3.pdf", snippet: "受理状态不能等同开票成功；重试必须沿用原请求流水号。", type: "document" },
  { id: "invoice-timeout-analysis", title: "电子发票超时分布周报", snippet: "近 7 天 P95 为 6.4 秒，0.7% 请求超过降级阈值。", type: "data" },
  { id: "inventory-compensation-design", title: "库存事件补偿设计 v2.1.pdf", snippet: "补偿任务按门店、商品和事件序列去重，超过 30 分钟进入人工复核。", type: "document" },
  { id: "pilot-store-roster", title: "12 家试点门店与灰度窗口.docx", snippet: "覆盖直营、加盟和弱网门店，列明店长联系人及可执行时段。", type: "document" },
  { id: "inventory-replay-samples", title: "库存补偿异常样本集", snippet: "包含 46 组重复事件、乱序到达和弱网恢复样本。", type: "data" },
  { id: "schema", title: "POS 优惠券核销业务规则 v3.2.pdf", snippet: "交易完成后核销券实例；退款与撤单的恢复规则需要业务负责人确认。", type: "document" },
  { id: "incident", title: "离线交易重放事故复盘 2026-05-18.docx", snippet: "门店恢复联网后重新生成请求标识，同一券实例被重复消费。", type: "document" },
  { id: "commit", title: "coupon-retry 重放修复草案.patch", snippet: "个人 Codex 生成的候选改动，使用订单与券实例组成稳定幂等键。", type: "change" },
];
