import type { TaskStatus } from "../components/TaskStatusBadge";

export type TaskDetailId = "coupon-fix" | "inventory-sync" | "member-settlement" | "invoice-validation" | "audit-fields" | "refund-archive";
export type TaskFileNode = {
  id: string;
  kind: "folder" | "file";
  name: string;
  parentId: string | null;
  format?: string;
  content?: string;
  updatedAt: string;
};
export type TaskTodoMock = { id: string; title: string; assignee: string; due: string; status: "待处理" | "进行中" | "已完成" | "等待前置任务"; file: string };
export type TaskActivityMock = { id: string; author: string; message: string; time: string; file?: string; type: "human" | "ai" };
export type TaskCommitMock = { id: string; author: string; message: string; time: string; files: string[] };
export type TaskDetailMock = {
  acceptance: string[];
  activities: TaskActivityMock[];
  commits: TaskCommitMock[];
  due: string;
  files: TaskFileNode[];
  goal: string;
  owner: string;
  participants: string[];
  status: TaskStatus;
  summary: string;
  title: string;
  todos: TaskTodoMock[];
};

const commonFiles = (prefix: string, names: [string, string, string]): TaskFileNode[] => [
  { id: `${prefix}-requirements`, kind: "folder", name: "需求与规则", parentId: null, updatedAt: "2 天前" },
  { id: `${prefix}-evidence`, kind: "folder", name: "证据与记录", parentId: null, updatedAt: "今天" },
  { id: `${prefix}-delivery`, kind: "folder", name: "交付成果", parentId: null, updatedAt: "刚刚" },
  { id: `${prefix}-history`, kind: "folder", name: "历史版本", parentId: `${prefix}-evidence`, updatedAt: "昨天" },
  { id: `${prefix}-rule`, kind: "file", name: names[0], parentId: `${prefix}-requirements`, format: "PDF", updatedAt: "2 天前", content: `# ${names[0]}\n\n记录当前任务适用的业务规则、边界条件和验收口径。\n\n- 所有结论保留来源\n- 原文权限保持不变\n- AI 只读取当前任务需要的内容` },
  { id: `${prefix}-record`, kind: "file", name: names[1], parentId: `${prefix}-evidence`, format: "DOCX", updatedAt: "今天", content: `# ${names[1]}\n\n汇总问题现象、验证证据、成员判断和仍需确认的风险。` },
  { id: `${prefix}-history-file`, kind: "file", name: "历史判断记录.md", parentId: `${prefix}-history`, format: "MD", updatedAt: "昨天", content: "# 历史判断记录\n\n保留历次规则变化和作废结论，便于后续追溯。" },
  { id: `${prefix}-result`, kind: "file", name: names[2], parentId: `${prefix}-delivery`, format: "MD", updatedAt: "刚刚", content: `# ${names[2]}\n\n## 当前结论\n\n已完成内容与待处理事项均记录在任务待办和动态中。\n\n## 验收\n\n- 结论有文件依据\n- 责任人明确\n- 变更可追溯` },
];

const makeTask = (overrides: Partial<TaskDetailMock> & Pick<TaskDetailMock, "title" | "goal" | "owner">): TaskDetailMock => ({
  acceptance: ["关键结论有文件依据", "负责人和到期时间明确", "最终结果可追溯"],
  activities: [{ id: "activity-1", author: "AgentDoor AI", message: "已根据最新文件整理任务摘要和风险提示。", time: "18 分钟前", type: "ai" }],
  commits: [{ id: "commit-1", author: overrides.owner, message: "补充任务目标与文件依据", time: "今天 10:24", files: ["历史判断记录.md"] }],
  due: "8 月 28 日",
  files: [],
  participants: [],
  status: "进行中",
  summary: "任务正在按责任人与文件依据持续推进。",
  todos: [],
  ...overrides,
});

export const taskDetailMocks: Record<TaskDetailId, TaskDetailMock> = {
  "coupon-fix": makeTask({
    title: "评审并灰度验证 POS 优惠券重复核销修复草案", owner: "周岚", participants: ["陈默", "林洁"], goal: "完成重复核销修复，并通过退款、撤单和离线重试验证。", due: "8 月 28 日",
    files: commonFiles("coupon", ["POS 优惠券核销业务规则 v3.2.pdf", "离线交易重放事故复盘.docx", "优惠券重复核销修复确认记录.md"]),
    todos: [
      { id: "coupon-1", title: "确认退款、撤单与离线重试的业务边界", assignee: "周岚", due: "今天 16:00", status: "进行中", file: "POS 优惠券核销业务规则 v3.2.pdf" },
      { id: "coupon-2", title: "完成修复与异常路径测试", assignee: "陈默", due: "明天 16:00", status: "待处理", file: "离线交易重放事故复盘.docx" },
      { id: "coupon-3", title: "准备门店灰度验证", assignee: "林洁", due: "8 月 27 日", status: "等待前置任务", file: "优惠券重复核销修复确认记录.md" },
    ],
    activities: [
      { id: "coupon-a1", author: "陈默", message: "已更新修复草案，补齐稳定幂等键和离线重放日志。", time: "8 分钟前", file: "优惠券重复核销修复确认记录.md", type: "human" },
      { id: "coupon-a2", author: "AgentDoor AI", message: "发现退款和撤单仍有一处规则差异，已标记给周岚。", time: "18 分钟前", file: "POS 优惠券核销业务规则 v3.2.pdf", type: "ai" },
    ],
  }),
  "inventory-sync": makeTask({ title: "门店库存同步异常", owner: "高远", participants: ["林洁"], goal: "补齐断网重连后的库存补偿机制与重复消费保护。", files: commonFiles("inventory", ["库存同步事件规范.pdf", "断网重连异常样本.xlsx", "库存补偿验证记录.md"]), todos: [{ id: "inventory-1", title: "实现库存补偿并验证事件去重", assignee: "高远", due: "今天 18:00", status: "进行中", file: "库存同步事件规范.pdf" }] }),
  "member-settlement": makeTask({ title: "会员等级权益结算规则升级", owner: "梁川", participants: ["周岚", "林洁"], goal: "统一线上与门店会员等级计算口径并完成历史数据回算。", status: "待开始", files: commonFiles("member", ["会员等级计算规则.pdf", "会员等级分布快照.xlsx", "统一结算方案.md"]), todos: [{ id: "member-1", title: "确认跨渠道消费金额去重规则", assignee: "梁川", due: "今天 17:00", status: "待处理", file: "会员等级计算规则.pdf" }] }),
  "invoice-validation": makeTask({ title: "电子发票抬头校验异常专项治理", owner: "陈默", participants: ["林洁", "高远"], goal: "修复税号校验误拦截并建立异常监控。", status: "待审核", files: commonFiles("invoice", ["发票校验业务规则.pdf", "存量失败订单.xlsx", "发票异常治理报告.md"]), todos: [{ id: "invoice-1", title: "确认发票失败率监控阈值", assignee: "陈默", due: "明天 10:00", status: "待处理", file: "发票异常治理报告.md" }] }),
  "audit-fields": makeTask({ title: "历史交易审计字段补齐", owner: "周岚", participants: ["高远"], goal: "确认历史数据范围并补齐审计检索字段。", status: "待开始", files: commonFiles("audit", ["交易审计字段规范.pdf", "历史交易表结构.xlsx", "审计字段回填方案.md"]), todos: [{ id: "audit-1", title: "评估审计字段回填方案", assignee: "高远", due: "8 月 26 日", status: "待处理", file: "历史交易表结构.xlsx" }] }),
  "refund-archive": makeTask({ title: "退款规则历史口径归档", owner: "周岚", participants: ["陈默", "林洁"], goal: "冻结已确认的退款与撤单口径，形成可追溯历史版本。", status: "已完成", files: commonFiles("refund", ["退款与撤单规则.pdf", "规则版本对照表.xlsx", "退款规则归档确认记录.md"]), todos: [{ id: "refund-1", title: "确认归档材料完整且可追溯", assignee: "周岚", due: "已完成", status: "已完成", file: "退款规则归档确认记录.md" }] }),
};
