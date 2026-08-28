import type { TaskStatus } from "../components/TaskStatusBadge";
import type { TaskIconName, TaskIconTone, TaskNode } from "./workspaceNodes";

export type TaskDetailId = "coupon-fix" | "inventory-sync" | "member-settlement" | "invoice-validation" | "audit-fields" | "refund-archive";

export type TaskFileNode = {
  content?: string;
  format?: string;
  id: string;
  kind: "folder" | "file";
  name: string;
  parentId: string | null;
  updatedAt: string;
};

export type TaskActivityType = "member-post" | "member-reply" | "ai-insight" | "status-change" | "schedule-change" | "participant-added";

export type TaskActivityMock = {
  author: string;
  file?: string;
  id: string;
  message: string;
  replyToActivityId?: string;
  time: string;
  type: TaskActivityType;
};

export type TaskCommitMock = {
  author: string;
  files: string[];
  id: string;
  message: string;
  time: string;
};

export type TaskDetailMock = {
  activities: TaskActivityMock[];
  commits: TaskCommitMock[];
  due: string;
  files: TaskFileNode[];
  goal: string;
  iconName?: TaskIconName;
  iconTone?: TaskIconTone;
  owner: string;
  participantInvitationStatus?: Record<string, "accepted" | "pending">;
  participants: string[];
  status: TaskStatus;
  summary: string;
  title: string;
};

const commonFiles = (prefix: string, names: [string, string, string]): TaskFileNode[] => [
  { id: `${prefix}-requirements`, kind: "folder", name: "需求与规则", parentId: null, updatedAt: "2 天前" },
  { id: `${prefix}-evidence`, kind: "folder", name: "证据与记录", parentId: null, updatedAt: "今天" },
  { id: `${prefix}-delivery`, kind: "folder", name: "交付成果", parentId: null, updatedAt: "刚刚" },
  { id: `${prefix}-history`, kind: "folder", name: "历史版本", parentId: `${prefix}-evidence`, updatedAt: "昨天" },
  {
    id: `${prefix}-rule`,
    kind: "file",
    name: names[0],
    parentId: `${prefix}-requirements`,
    format: "PDF",
    updatedAt: "2 天前",
    content: `# ${names[0]}\n\n记录当前任务适用的业务规则与边界条件。\n\n- 所有结论保留来源\n- 原文权限保持不变\n- AI 只读取当前任务需要的内容`,
  },
  {
    id: `${prefix}-record`,
    kind: "file",
    name: names[1],
    parentId: `${prefix}-evidence`,
    format: "DOCX",
    updatedAt: "今天",
    content: `# ${names[1]}\n\n汇总问题现象、验证证据、成员判断和仍需确认的风险。`,
  },
  {
    id: `${prefix}-history-file`,
    kind: "file",
    name: "历史判断记录.md",
    parentId: `${prefix}-history`,
    format: "MD",
    updatedAt: "昨天",
    content: "# 历史判断记录\n\n保留历次规则变化和作废结论，便于后续追溯。",
  },
  {
    id: `${prefix}-result`,
    kind: "file",
    name: names[2],
    parentId: `${prefix}-delivery`,
    format: "MD",
    updatedAt: "刚刚",
    content: `# ${names[2]}\n\n## 当前结论\n\n已完成内容与待处理问题均记录在任务活动中。\n\n## 交付说明\n\n本文件记录本次交付的业务结论、适用范围和已知限制；任务是否完成，由 Task Owner 结合当前结果确认。`,
  },
];

const makeTask = (overrides: Partial<TaskDetailMock> & Pick<TaskDetailMock, "goal" | "owner" | "title">): TaskDetailMock => ({
  activities: [
    { id: "activity-human", author: overrides.owner, message: "已补充当前进展和需要共同确认的问题。", time: "8 分钟前", type: "member-post" },
    { id: "activity-ai", author: "AgentDoor AI", message: "已根据最新文件整理任务摘要和风险提示。", time: "18 分钟前", type: "ai-insight" },
    { id: "activity-status", author: overrides.owner, message: "将任务状态更新为进行中。", time: "今天 09:42", type: "status-change" },
    { id: "activity-schedule", author: overrides.owner, message: "补充了任务开始时间，并调整了计划截止时间。", time: "今天 09:36", type: "schedule-change" },
  ],
  commits: [{ id: "commit-1", author: overrides.owner, message: "更新了任务目标，并补充了相关文件依据。", time: "今天 10:24", files: ["历史判断记录.md"] }],
  due: "8 月 28 日",
  files: [],
  participants: [],
  status: "进行中",
  summary: overrides.summary ?? (overrides.status === "待审核"
    ? `${overrides.title}已进入结果核对，当前需要确认结论是否达到目标。`
    : overrides.status === "待开始"
      ? `${overrides.title}的目标已经明确，当前需要确认首个推进动作。`
      : overrides.status === "已完成"
        ? `${overrides.title}已经收口，结果与历史记录可供后续接续。`
        : `${overrides.title}正在围绕目标推进，当前重点是收口未完成问题与前置依赖。`),
  ...overrides,
});

const participantByOwner: Record<string, string[]> = {
  "周岚": ["陈默", "林洁"],
  "陈默": ["周岚", "梁川"],
  "林洁": ["高远", "周岚"],
  "高远": ["林洁", "梁川"],
  "梁川": ["周岚", "韩序"],
  "许宁": ["梁川", "韩序"],
  "韩序": ["苏禾", "周岚"],
  "苏禾": ["韩序", "陈默"],
};

export function createWorkspaceTaskDetail(task: TaskNode): TaskDetailMock {
  const resultFile = `${task.name}交付确认.md`;
  const ruleFile = `${task.name}业务规则.pdf`;
  const evidenceFile = `${task.name}核对记录.docx`;
  const participants = participantByOwner[task.ownerId] ?? [];

  return makeTask({
    activities: [
      { id: `${task.id}-activity`, author: participants[0] ?? task.ownerId, message: `已补充“${task.name}”的最新核对信息，等待 Task Owner 确认下一步。`, time: task.updatedAt, file: evidenceFile, type: "member-post" },
      { id: `${task.id}-activity-ai`, author: "AgentDoor AI", message: `发现“${task.name}”仍有一项结果依据需要补齐，建议在提交结果前核对。`, time: "24 分钟前", file: ruleFile, type: "ai-insight" },
      { id: `${task.id}-activity-status`, author: task.ownerId, message: `将任务状态更新为“${task.status}”。`, time: "今天 09:42", type: "status-change" },
      { id: `${task.id}-activity-schedule`, author: task.ownerId, message: "调整了任务的计划截止时间。", time: "今天 09:36", type: "schedule-change" },
      { id: `${task.id}-activity-reply`, author: task.ownerId, message: "收到，我会在本轮完成前核对并回传结论。", time: "6 分钟前", replyToActivityId: `${task.id}-activity`, type: "member-reply" },
    ],
    commits: [{ id: `${task.id}-commit`, author: task.ownerId, message: "更新了任务范围、结果判断与当前依据。", time: task.updatedAt, files: [resultFile] }],
    due: task.dueAt ?? "待排期",
    files: commonFiles(task.id, [ruleFile, evidenceFile, resultFile]),
    goal: task.goal ?? `完成“${task.name}”的范围确认、方案执行与结果确认。`,
    iconName: task.iconName,
    iconTone: task.iconTone,
    owner: task.ownerId,
    participantInvitationStatus: Object.fromEntries(participants.map((participant, index) => [participant, index === 0 ? "accepted" : "pending"])),
    participants,
    status: task.status,
    title: task.name,
  });
}

export const taskDetailMocks: Record<TaskDetailId, TaskDetailMock> = {
  "coupon-fix": makeTask({
    activities: [
      { id: "coupon-a1", author: "陈默", message: "已更新修复草案，补齐稳定幂等键和离线重放日志。", time: "8 分钟前", file: "优惠券重复核销修复确认记录.md", type: "member-post" },
      { id: "coupon-a2", author: "AgentDoor AI", message: "发现退款和撤单仍有一处规则差异，已标记给周岚。", time: "18 分钟前", file: "POS 优惠券核销业务规则 v3.2.pdf", type: "ai-insight" },
      { id: "coupon-a3", author: "周岚", message: "将任务状态从“待开始”更新为“进行中”。", time: "今天 09:42", type: "status-change" },
      { id: "coupon-a5", author: "周岚", message: "将林洁加入任务参与者。", time: "今天 09:38", type: "participant-added" },
      { id: "coupon-a4", author: "林洁", message: "收到，灰度门店名单会在规则确认后补齐。", time: "5 分钟前", replyToActivityId: "coupon-a1", type: "member-reply" },
    ],
    due: "8 月 28 日",
    files: commonFiles("coupon", ["POS 优惠券核销业务规则 v3.2.pdf", "离线交易重放事故复盘.docx", "优惠券重复核销修复确认记录.md"]),
    goal: "完成重复核销修复，并通过退款、撤单和离线重试验证。",
    owner: "周岚",
    participantInvitationStatus: { "陈默": "accepted", "林洁": "pending" },
    participants: ["陈默", "林洁"],
    title: "评审并灰度验证 POS 优惠券重复核销修复草案",
  }),
  "inventory-sync": makeTask({ title: "门店库存同步异常", owner: "高远", participants: ["林洁"], goal: "补齐断网重连后的库存补偿机制与重复消费保护。", files: commonFiles("inventory", ["库存同步事件规范.pdf", "断网重连异常样本.xlsx", "库存补偿验证记录.md"]) }),
  "member-settlement": makeTask({ title: "会员等级权益结算规则升级", owner: "梁川", participants: ["周岚", "林洁"], goal: "统一线上与门店会员等级计算口径并完成历史数据回算。", status: "待开始", files: commonFiles("member", ["会员等级计算规则.pdf", "会员等级分布快照.xlsx", "统一结算方案.md"]) }),
  "invoice-validation": makeTask({ title: "电子发票抬头校验异常专项治理", owner: "陈默", participants: ["林洁", "高远"], goal: "修复税号校验误拦截并建立异常监控。", status: "待审核", files: commonFiles("invoice", ["发票校验业务规则.pdf", "存量失败订单.xlsx", "发票异常治理报告.md"]) }),
  "audit-fields": makeTask({ title: "历史交易审计字段补齐", owner: "周岚", participants: ["高远"], goal: "确认历史数据范围并补齐审计检索字段。", status: "待开始", files: commonFiles("audit", ["交易审计字段规范.pdf", "历史交易表结构.xlsx", "审计字段回填方案.md"]) }),
  "refund-archive": makeTask({ title: "退款规则历史口径归档", owner: "周岚", participants: ["陈默", "林洁"], goal: "冻结已确认的退款与撤单口径，形成可追溯历史版本。", status: "已完成", files: commonFiles("refund", ["退款与撤单规则.pdf", "规则版本对照表.xlsx", "退款规则归档确认记录.md"]) }),
};
