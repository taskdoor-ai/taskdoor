import { effortEstimateSchema, getEffortScopeKey, type TaskEffortEstimate } from "../lib/taskEffort";

type BaseNode = {
  id: string;
  kind: "folder" | "task" | "file";
  name: string;
  parentId: string | null;
  /** Local fixture projection only. Production authorization must remain server-side. */
  teamId?: string;
  updatedAt: string;
};

export type FolderNode = BaseNode & { kind: "folder" };

export type TaskIconTone = "neutral" | "blue" | "cyan" | "green" | "amber" | "red" | "purple" | "pink";
export type TaskIconName = "list-todo" | "clipboard-check" | "target" | "flag" | "briefcase" | "file-check" | "chart" | "sparkles";
type WorkspaceTaskStatus = "待开始" | "进行中" | "待审核" | "已阻塞" | "已完成" | "已取消";

export type TaskNode = BaseNode & {
  kind: "task";
  completionCriteria?: string[];
  executionTips?: string[];
  effortEstimate?: TaskEffortEstimate;
  proposedOwnerId?: string;
  createdFrom?: "task-planner" | "task-editor";
  createdBy?: string;
  createdAt?: string;
  dependsOnTaskIds?: string[];
  ownerId: string;
  participantIds?: string[];
  parentTaskId?: string;
  plannedEndOn?: string;
  plannedStartOn?: string;
  status: WorkspaceTaskStatus;
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
export const creatorCommerceCampaignId = "fragrance-campaign";
export const creatorCommerceMainTaskId = "fragrance-creator-wrapup";

const fragranceCreatorGoal = "统筹香氛礼盒达人带货项目收尾，确认各责任环节完成并对最终结果负责。";
const productLaunchGoal = "统筹新品发布会场地、流程与宣传物料，确保发布会按期落地。";
const weeklyRetroGoal = "汇总本周关键决定、未解决问题与下周行动项，形成可直接共享的团队复盘纪要。";
const weeklyRetroCriteria = [
  "纪要覆盖本周关键决定与未解决问题，每条决定能定位讨论依据，分歧与待确认项单独标明。",
  "下周行动项写明具体交付、负责人和时间；纪要由参与复盘的成员核对后共享给团队。",
];
const weeklyRetroTips = ["先按决定、问题、行动三类整理，再由参会成员核对遗漏与责任边界。"];

function weeklyRetroEffort(minutes: number, goal: string, completionCriteria: string[], executionTips: string[], workMethod: string): TaskEffortEstimate {
  return {
    basis: "mock",
    confirmed: false,
    minutes,
    reason: "按资料整理、成员核对和修订投入估算；等待回复时间不计入。",
    scopeKey: getEffortScopeKey({ goal, completionCriteria, executionTips }, workMethod),
    version: 1,
    workMethod,
  };
}

function fixtureLeaf(task: TaskNode, inheritedGoal: string, minutes: number, workMethod: string): TaskNode {
  const completionCriteria = task.completionCriteria ?? [];
  const executionTips = task.executionTips ?? [];
  return {
    ...task,
    effortEstimate: {
      basis: "mock",
      confirmed: false,
      minutes,
      reason: "按同类交付的资料量、核对轮次与人工判断环节估算；等待和无人值守运行不计入。",
      scopeKey: getEffortScopeKey({ goal: inheritedGoal, completionCriteria, executionTips }, workMethod),
      version: 1,
      workMethod,
    },
  };
}

/** 当前产品演示基准：一个活动任务组，以及一个不带父子关系的代表性任务。 */
const workspaceNodeSeeds: WorkspaceNode[] = [
  { id: workspaceRootId, kind: "folder", name: "任务", parentId: null, updatedAt: "刚刚" },
  { id: creatorCommerceCampaignId, kind: "folder", name: "香氛礼盒达人带货", parentId: workspaceRootId, updatedAt: "今天" },
  {
    id: creatorCommerceMainTaskId,
    kind: "task",
    name: "香氛礼盒达人带货收尾",
    parentId: creatorCommerceCampaignId,
    ownerId: "周岚",
    participantIds: ["陈默", "林洁", "高远", "梁川", "许宁", "韩序", "苏禾"],
    status: "进行中",
    dueAt: "9 月 12 日",
    goal: fragranceCreatorGoal,
    completionCriteria: ["八个责任环节均形成可核交付或明确未决项；最终投放决定、风险与责任边界已记录。"],
    executionTips: ["父任务只汇总叶子结果和工时；跨环节冲突由周岚基于最新证据决策。"],
    iconName: "target",
    iconTone: "purple",
    labels: ["高优先级"],
    updatedAt: "今天",
  },
  fixtureLeaf({
    id: "fragrance-creator-business",
    kind: "task",
    name: "确认第二批达人名单与合作档期",
    parentId: creatorCommerceCampaignId,
    parentTaskId: creatorCommerceMainTaskId,
    ownerId: "陈默",
    status: "已完成",
    dueAt: "8 月 29 日",
    goal: "完成第二批达人筛选、建联、佣金谈判与合作档期确认。",
    completionCriteria: ["候选达人、佣金与档期均形成可追溯确认记录；未确认项标明责任人和截止时间。"],
    executionTips: ["先用历史表现与受众匹配筛选，再由商务负责人确认佣金、排期和例外条件。"],
    iconName: "briefcase",
    iconTone: "blue",
    labels: ["达人商务", "高优先级"],
    updatedAt: "20 分钟前",
  }, fragranceCreatorGoal, 360, "AI 辅助归并达人数据与档期冲突，由陈默逐一确认合作边界"),
  fixtureLeaf({
    id: "fragrance-content",
    kind: "task",
    name: "终审短视频脚本与直播卖点",
    parentId: creatorCommerceCampaignId,
    parentTaskId: creatorCommerceMainTaskId,
    ownerId: "林洁",
    status: "进行中",
    dueAt: "8 月 30 日",
    goal: "完成核心卖点、短视频脚本、直播话术与素材终审。",
    completionCriteria: ["核心卖点、短视频脚本和直播话术完成品牌、商品与合规核对，并输出受控终审版本。"],
    executionTips: ["工具先检查版本差异和敏感宣称，最终表达与取舍由林洁确认。"],
    iconName: "sparkles",
    iconTone: "purple",
    labels: ["内容制作"],
    updatedAt: "45 分钟前",
  }, fragranceCreatorGoal, 480, "AI 辅助比对脚本版本与敏感宣称，由林洁完成内容终审"),
  fixtureLeaf({
    id: "fragrance-live",
    kind: "task",
    name: "完成直播间彩排与场控清单",
    parentId: creatorCommerceCampaignId,
    parentTaskId: creatorCommerceMainTaskId,
    ownerId: "高远",
    dependsOnTaskIds: ["fragrance-content"],
    status: "已阻塞",
    dueAt: "9 月 3 日",
    goal: "锁定直播排期，完成彩排、场控清单和异常预案。",
    completionCriteria: ["完成全流程彩排，场控清单覆盖关键节点、人员分工与异常处置，并由参与人确认。"],
    executionTips: ["彩排记录可由工具辅助提取问题，现场节奏和预案由高远判断。"],
    iconName: "clipboard-check",
    iconTone: "amber",
    labels: ["直播执行"],
    updatedAt: "今天",
  }, fragranceCreatorGoal, 480, "AI 辅助整理彩排问题与清单缺口，由高远确认现场节奏和预案"),
  fixtureLeaf({
    id: "fragrance-product",
    kind: "task",
    name: "锁定礼盒价格、赠品与库存",
    parentId: creatorCommerceCampaignId,
    parentTaskId: creatorCommerceMainTaskId,
    ownerId: "梁川",
    status: "已完成",
    dueAt: "9 月 1 日",
    goal: "确认礼盒价格机制、赠品方案、库存水位与履约保障。",
    completionCriteria: ["价格、赠品、库存和履约边界形成一致确认记录，异常水位有负责人和处置方案。"],
    executionTips: ["先用库存与毛利模板校验，再由梁川确认商业取舍与履约承诺。"],
    iconName: "list-todo",
    iconTone: "cyan",
    labels: ["商品运营"],
    updatedAt: "1 小时前",
  }, fragranceCreatorGoal, 300, "工具校验库存与毛利边界，由梁川确认价格、赠品和履约取舍"),
  fixtureLeaf({
    id: "fragrance-growth",
    kind: "task",
    name: "调整第二轮投流预算与人群包",
    parentId: creatorCommerceCampaignId,
    parentTaskId: creatorCommerceMainTaskId,
    ownerId: "许宁",
    dependsOnTaskIds: ["fragrance-creator-business"],
    status: "进行中",
    dueAt: "9 月 4 日",
    goal: "根据首轮表现调整投放预算、定向与人群包，控制 ROI。",
    completionCriteria: ["第二轮预算、定向、人群包与止损阈值完成核对，并记录调整依据和观察指标。"],
    executionTips: ["工具生成情景测算，许宁依据业务目标确认预算边界和止损条件。"],
    iconName: "chart",
    iconTone: "amber",
    labels: ["投流增长", "高优先级"],
    updatedAt: "35 分钟前",
  }, fragranceCreatorGoal, 360, "工具生成投流情景测算，由许宁确认预算、人群与止损边界"),
  fixtureLeaf({
    id: "fragrance-data",
    kind: "task",
    name: "更新 GMV 看板与渠道归因",
    parentId: creatorCommerceCampaignId,
    parentTaskId: creatorCommerceMainTaskId,
    ownerId: "韩序",
    status: "已完成",
    dueAt: "9 月 8 日",
    goal: "更新 GMV 指标看板、统一渠道归因口径并准备项目复盘。",
    completionCriteria: ["GMV 看板数据完成抽样核验，渠道归因口径、数据限制与复盘截点均已记录。"],
    executionTips: ["自动化负责取数与异常标记，韩序负责口径判断、抽样核验和限制说明。"],
    iconName: "chart",
    iconTone: "blue",
    labels: ["数据复盘"],
    updatedAt: "15 分钟前",
  }, fragranceCreatorGoal, 240, "自动化更新看板并标记异常，由韩序核验归因口径和数据限制"),
  fixtureLeaf({
    id: "fragrance-compliance",
    kind: "task",
    name: "审核素材宣称与达人合同",
    parentId: creatorCommerceCampaignId,
    parentTaskId: creatorCommerceMainTaskId,
    ownerId: "苏禾",
    dependsOnTaskIds: ["fragrance-content", "fragrance-creator-business"],
    status: "待开始",
    dueAt: "8 月 31 日",
    goal: "完成素材宣称、广告法、达人合同与平台规则审核。",
    completionCriteria: ["素材宣称、达人合同和平台规则逐项形成通过、修改或升级处理结论，证据可追溯。"],
    executionTips: ["工具先做规则与条款比对，苏禾对高风险宣称和合同例外作最终判断。"],
    iconName: "file-check",
    iconTone: "green",
    labels: ["合规审核"],
    updatedAt: "2 小时前",
  }, fragranceCreatorGoal, 180, "AI 辅助比对规则和合同条款，由苏禾逐项签发合规结论"),
  fixtureLeaf({
    id: "fragrance-final-decision",
    kind: "task",
    name: "确认追加投放目标与最终决策",
    parentId: creatorCommerceCampaignId,
    parentTaskId: creatorCommerceMainTaskId,
    ownerId: "周岚",
    dependsOnTaskIds: ["fragrance-data", "fragrance-compliance"],
    participantIds: ["许宁", "韩序"],
    status: "待审核",
    dueAt: "今天 16:00",
    goal: "确认追加投放的 GMV 目标、预算边界与资源优先级，并完成项目最终决策。",
    completionCriteria: ["追加投放目标、预算上限、资源优先级和停止条件形成一份可执行决定，并记录依据与异议。"],
    executionTips: ["工具汇总数据与情景方案，周岚基于合规结论和资源约束作最终取舍。"],
    iconName: "target",
    iconTone: "red",
    labels: ["高优先级"],
    updatedAt: "10 分钟前",
  }, fragranceCreatorGoal, 180, "AI 汇总指标和情景方案，由周岚结合合规与资源约束完成决策"),
  {
    id: "product-launch-planning",
    kind: "task",
    name: "新品发布会筹备",
    parentId: workspaceRootId,
    ownerId: "周岚",
    participantIds: ["陈默", "林洁"],
    status: "进行中",
    dueAt: "9 月 20 日",
    plannedStartOn: "2026-08-30",
    plannedEndOn: "2026-09-20",
    goal: productLaunchGoal,
    completionCriteria: ["场地、流程和宣传物料三个子任务均通过核对，发布会关键责任、期限与备选方案已确认。"],
    executionTips: ["父任务只汇总叶子交付和工时；外部场地等待不计 EWD，变更通过子任务记录。"],
    iconName: "flag",
    iconTone: "red",
    labels: ["高优先级", "内容制作"],
    updatedAt: "今天",
  },
  fixtureLeaf({
    id: "product-launch-venue",
    kind: "task",
    name: "场地确认",
    parentId: workspaceRootId,
    parentTaskId: "product-launch-planning",
    ownerId: "陈默",
    status: "进行中",
    dueAt: "9 月 5 日",
    goal: "确认发布会场地、档期、容量与现场配套条件。",
    completionCriteria: ["场地、档期、容量、设备与费用边界完成书面确认，现场限制和备选方案已记录。"],
    executionTips: ["用模板统一比较报价与配套条件，由陈默确认现场取舍和合同边界。"],
    iconName: "briefcase",
    iconTone: "blue",
    labels: ["高优先级"],
    updatedAt: "1 小时前",
  }, productLaunchGoal, 360, "工具归并场地报价与条件，由陈默完成现场核验和商务确认"),
  fixtureLeaf({
    id: "product-launch-run-of-show",
    kind: "task",
    name: "发布会流程设计",
    parentId: workspaceRootId,
    parentTaskId: "product-launch-planning",
    ownerId: "林洁",
    status: "待开始",
    dueAt: "9 月 10 日",
    goal: "完成发布会完整流程、嘉宾衔接与现场应急预案。",
    completionCriteria: ["完整流程表写明时间、环节、人员、物料和切换信号，嘉宾衔接与关键异常均有预案。"],
    executionTips: ["AI 可生成流程初稿和冲突检查，林洁负责现场节奏、内容顺序与应急取舍。"],
    iconName: "clipboard-check",
    iconTone: "purple",
    labels: ["内容制作"],
    updatedAt: "今天",
  }, productLaunchGoal, 480, "AI 辅助生成流程初稿与冲突检查，由林洁核对嘉宾衔接和现场预案"),
  fixtureLeaf({
    id: "product-launch-promo-assets",
    kind: "task",
    name: "宣传物料制作",
    parentId: workspaceRootId,
    parentTaskId: "product-launch-planning",
    ownerId: "林洁",
    status: "待开始",
    dueAt: "9 月 15 日",
    goal: "完成发布会主视觉、邀请函与渠道宣传物料制作。",
    completionCriteria: ["主视觉、邀请函和各渠道物料按规格交付，文案、品牌与版权检查通过并形成受控版本。"],
    executionTips: ["工具辅助适配尺寸和检查版本差异，林洁负责创意质量、品牌一致性与最终验收。"],
    iconName: "sparkles",
    iconTone: "pink",
    labels: ["内容制作"],
    updatedAt: "今天",
  }, productLaunchGoal, 720, "AI 辅助多尺寸适配与版本检查，由林洁完成创意、品牌和版权终审"),
  {
    id: "weekly-retro-notes",
    kind: "task",
    name: "整理本周团队复盘纪要",
    parentId: workspaceRootId,
    ownerId: "周岚",
    participantIds: ["陈默", "林洁"],
    status: "进行中",
    dueAt: "9 月 1 日",
    goal: weeklyRetroGoal,
    completionCriteria: weeklyRetroCriteria,
    executionTips: weeklyRetroTips,
    plannedStartOn: "2026-08-29",
    plannedEndOn: "2026-09-01",
    iconName: "clipboard-check",
    iconTone: "blue",
    labels: ["内容制作"],
    updatedAt: "12 分钟前",
  },
  {
    id: "weekly-retro-decisions",
    kind: "task",
    name: "汇总本周关键决定与依据",
    parentId: workspaceRootId,
    parentTaskId: "weekly-retro-notes",
    ownerId: "陈默",
    participantIds: ["周岚"],
    status: "已完成",
    dueAt: "8 月 31 日",
    plannedStartOn: "2026-08-29",
    plannedEndOn: "2026-08-31",
    goal: "整理本周已经形成的决定，并把每条结论关联到可核对的讨论或文件依据。",
    completionCriteria: ["关键决定按主题去重，结论、适用范围与原始依据均可定位。"],
    executionTips: ["只记录已形成的决定；仍有分歧的内容转入未解决问题。"],
    effortEstimate: weeklyRetroEffort(120, weeklyRetroGoal, ["关键决定按主题去重，结论、适用范围与原始依据均可定位。"], ["只记录已形成的决定；仍有分歧的内容转入未解决问题。"], "AI 辅助归类讨论记录，由陈默逐条核对决定与依据"),
    iconName: "file-check",
    iconTone: "green",
    labels: ["内容制作"],
    updatedAt: "昨天 18:10",
  },
  {
    id: "weekly-retro-open-issues",
    kind: "task",
    name: "整理未解决问题与责任边界",
    parentId: workspaceRootId,
    parentTaskId: "weekly-retro-notes",
    ownerId: "林洁",
    participantIds: ["周岚", "陈默"],
    status: "进行中",
    dueAt: "9 月 1 日",
    plannedStartOn: "2026-08-29",
    plannedEndOn: "2026-09-01",
    goal: "把仍未收口的问题、影响与需要确认的人整理为可接续的问题清单。",
    completionCriteria: ["每个未解决问题写明当前分歧、影响范围、确认人和下一次核对时间。"],
    executionTips: ["缺少依据时明确标记待核对，不把讨论中的判断写成已确认事实。"],
    effortEstimate: weeklyRetroEffort(180, weeklyRetroGoal, ["每个未解决问题写明当前分歧、影响范围、确认人和下一次核对时间。"], ["缺少依据时明确标记待核对，不把讨论中的判断写成已确认事实。"], "AI 辅助汇总分歧，由林洁核对问题边界并补充上下文"),
    iconName: "list-todo",
    iconTone: "amber",
    labels: ["内容制作"],
    updatedAt: "35 分钟前",
  },
  {
    id: "weekly-retro-actions",
    kind: "task",
    name: "确认下周行动项与负责人",
    parentId: workspaceRootId,
    parentTaskId: "weekly-retro-notes",
    ownerId: "周岚",
    participantIds: ["陈默", "林洁"],
    status: "待开始",
    dueAt: "9 月 1 日",
    plannedStartOn: "2026-08-31",
    plannedEndOn: "2026-09-01",
    goal: "把复盘结论转成下周可执行、可核对且责任清晰的行动项。",
    completionCriteria: ["每个行动项写明具体交付、负责人、期限及依赖，相关成员完成核对。"],
    executionTips: ["建议不等于指派；负责人和期限需由相关成员明确确认。"],
    effortEstimate: weeklyRetroEffort(120, weeklyRetroGoal, ["每个行动项写明具体交付、负责人、期限及依赖，相关成员完成核对。"], ["建议不等于指派；负责人和期限需由相关成员明确确认。"], "AI 辅助生成行动项草案，由周岚与相关成员确认责任和期限"),
    iconName: "clipboard-check",
    iconTone: "blue",
    labels: ["内容制作"],
    updatedAt: "12 分钟前",
  },
];

/** Legacy creator-commerce fixture, now explicitly scoped so team switching cannot mix local data. */
export const workspaceNodes: WorkspaceNode[] = workspaceNodeSeeds.map((node) => ({
  ...node,
  teamId: node.id === workspaceRootId ? "__all__" : "creator-commerce",
}));

const taskStatuses = new Set<WorkspaceTaskStatus>(["待开始", "进行中", "待审核", "已阻塞", "已完成", "已取消"]);
const taskIconNames = new Set<TaskIconName>(["list-todo", "clipboard-check", "target", "flag", "briefcase", "file-check", "chart", "sparkles"]);
const taskIconTones = new Set<TaskIconTone>(["neutral", "blue", "cyan", "green", "amber", "red", "purple", "pink"]);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const asOptionalString = (value: unknown) => typeof value === "string" && value.trim() ? value : undefined;
const asStringList = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
  : undefined;

const normalizeFolderNode = (value: unknown): FolderNode | null => {
  if (!isRecord(value) || value.kind !== "folder") return null;
  if (typeof value.id !== "string" || !value.id.trim() || value.id === workspaceRootId) return null;
  if (typeof value.name !== "string" || !value.name.trim()) return null;
  if (typeof value.updatedAt !== "string" || !value.updatedAt.trim()) return null;
  return {
    id: value.id,
    kind: "folder",
    name: value.name,
    parentId: typeof value.parentId === "string" && value.parentId.trim() ? value.parentId : workspaceRootId,
    teamId: asOptionalString(value.teamId) ?? "creator-commerce",
    updatedAt: value.updatedAt,
  };
};

const normalizeFileNode = (value: unknown): FileNode | null => {
  if (!isRecord(value) || value.kind !== "file") return null;
  if (typeof value.id !== "string" || !value.id.trim() || value.id === workspaceRootId) return null;
  if (typeof value.name !== "string" || !value.name.trim()) return null;
  if (typeof value.updatedAt !== "string" || !value.updatedAt.trim()) return null;
  if (typeof value.fileType !== "string" || !value.fileType.trim()) return null;
  if (value.size !== undefined && (typeof value.size !== "string" || !value.size.trim())) return null;
  return {
    id: value.id,
    kind: "file",
    name: value.name,
    parentId: typeof value.parentId === "string" && value.parentId.trim() ? value.parentId : workspaceRootId,
    teamId: asOptionalString(value.teamId) ?? "creator-commerce",
    updatedAt: value.updatedAt,
    fileType: value.fileType,
    ...(typeof value.size === "string" ? { size: value.size } : {}),
  };
};

const normalizeTaskNode = (value: unknown): TaskNode | null => {
  if (!isRecord(value) || value.kind !== "task") return null;
  if (typeof value.id !== "string" || !value.id.trim() || value.id === workspaceRootId) return null;
  if (typeof value.name !== "string" || !value.name.trim()) return null;
  if (typeof value.ownerId !== "string" || (!value.ownerId.trim() && value.createdFrom !== "task-planner" && value.createdFrom !== "task-editor")) return null;
  if (typeof value.updatedAt !== "string" || !value.updatedAt.trim()) return null;
  if (typeof value.status !== "string" || !taskStatuses.has(value.status as WorkspaceTaskStatus)) return null;

  const labels = asStringList(value.labels);
  const participantIds = asStringList(value.participantIds);
  const dependsOnTaskIds = asStringList(value.dependsOnTaskIds);
  const effortEstimate = effortEstimateSchema.safeParse(value.effortEstimate);
  const iconName = typeof value.iconName === "string" && taskIconNames.has(value.iconName as TaskIconName)
    ? value.iconName as TaskIconName
    : undefined;
  const iconTone = typeof value.iconTone === "string" && taskIconTones.has(value.iconTone as TaskIconTone)
    ? value.iconTone as TaskIconTone
    : undefined;
  return {
    id: value.id,
    kind: "task",
    name: value.name,
    ownerId: value.ownerId,
    parentId: typeof value.parentId === "string" && value.parentId.trim() ? value.parentId : workspaceRootId,
    teamId: asOptionalString(value.teamId) ?? "creator-commerce",
    status: value.status as WorkspaceTaskStatus,
    updatedAt: value.updatedAt,
    ...(dependsOnTaskIds ? { dependsOnTaskIds } : {}),
    ...(asStringList(value.completionCriteria) ? { completionCriteria: asStringList(value.completionCriteria) } : {}),
    ...(asStringList(value.executionTips) ? { executionTips: asStringList(value.executionTips) } : {}),
    ...(effortEstimate.success ? { effortEstimate: effortEstimate.data } : {}),
    ...(value.createdFrom === "task-planner" || value.createdFrom === "task-editor" ? { createdFrom: value.createdFrom } : {}),
    ...(asOptionalString(value.createdBy) ? { createdBy: value.createdBy as string } : {}),
    ...(asOptionalString(value.createdAt) ? { createdAt: value.createdAt as string } : {}),
    ...(asOptionalString(value.proposedOwnerId) ? { proposedOwnerId: value.proposedOwnerId as string } : {}),
    ...(labels ? { labels } : {}),
    ...(participantIds ? { participantIds } : {}),
    ...(asOptionalString(value.parentTaskId) ? { parentTaskId: value.parentTaskId as string } : {}),
    ...(asOptionalString(value.plannedEndOn) ? { plannedEndOn: value.plannedEndOn as string } : {}),
    ...(asOptionalString(value.plannedStartOn) ? { plannedStartOn: value.plannedStartOn as string } : {}),
    // An explicit empty goal is a saved clear; only an absent field may fall back to a seed.
    ...(typeof value.goal === "string" ? { goal: value.goal } : {}),
    ...(asOptionalString(value.dueAt) ? { dueAt: value.dueAt as string } : {}),
    ...(iconName ? { iconName } : {}),
    ...(iconTone ? { iconTone } : {}),
  };
};

const cloneWorkspaceFixture = (): WorkspaceNode[] => workspaceNodes.map((node) => node.kind === "task"
  ? {
      ...node,
      ...(node.labels ? { labels: [...node.labels] } : {}),
      ...(node.dependsOnTaskIds ? { dependsOnTaskIds: [...node.dependsOnTaskIds] } : {}),
      ...(node.participantIds ? { participantIds: [...node.participantIds] } : {}),
    }
  : { ...node });

/** 当前版本只做结构归一，不覆盖用户已创建、修改或删除的任务。 */
export function normalizeWorkspaceNodes(value: unknown): WorkspaceNode[] {
  if (!Array.isArray(value)) return cloneWorkspaceFixture();
  const storedRoot = value.find((node) => isRecord(node)
    && node.id === workspaceRootId
    && node.kind === "folder"
    && typeof node.name === "string"
    && Boolean(node.name.trim())
    && node.parentId === null
    && typeof node.updatedAt === "string"
    && Boolean(node.updatedAt.trim()));
  const root: FolderNode = storedRoot && isRecord(storedRoot)
    ? { id: workspaceRootId, kind: "folder", name: storedRoot.name as string, parentId: null, teamId: "__all__", updatedAt: storedRoot.updatedAt as string }
    : { ...workspaceNodes[0] as FolderNode };
  const seenIds = new Set([workspaceRootId]);
  const nodes = value.flatMap((node) => {
    const normalized = normalizeFolderNode(node) ?? normalizeTaskNode(node) ?? normalizeFileNode(node);
    if (!normalized || seenIds.has(normalized.id)) return [];
    seenIds.add(normalized.id);
    return [normalized];
  });
  const folders = nodes.filter((node): node is FolderNode => node.kind === "folder");
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const directFolderParents = new Map(folders.flatMap((folder) => folder.parentId
    && folder.parentId !== folder.id
    && folderById.get(folder.parentId)?.teamId === folder.teamId
    ? [[folder.id, folder.parentId] as const]
    : []));
  const cyclicFolderIds = new Set<string>();
  const resolvedFolderIds = new Set<string>();
  for (const folder of folders) {
    if (resolvedFolderIds.has(folder.id)) continue;
    const path: string[] = [];
    const positionById = new Map<string, number>();
    let currentId: string | undefined = folder.id;
    while (currentId && !resolvedFolderIds.has(currentId)) {
      const cycleStart = positionById.get(currentId);
      if (cycleStart !== undefined) {
        path.slice(cycleStart).forEach((id) => cyclicFolderIds.add(id));
        break;
      }
      positionById.set(currentId, path.length);
      path.push(currentId);
      currentId = directFolderParents.get(currentId);
    }
    path.forEach((id) => resolvedFolderIds.add(id));
  }
  const tasks = nodes.filter((node): node is TaskNode => node.kind === "task");
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const directTaskParents = new Map(tasks.flatMap((task) => task.parentTaskId
    && task.parentTaskId !== task.id
    && taskById.get(task.parentTaskId)?.teamId === task.teamId
    ? [[task.id, task.parentTaskId] as const]
    : []));
  const cyclicTaskIds = new Set<string>();
  const resolvedTaskIds = new Set<string>();
  for (const task of tasks) {
    if (resolvedTaskIds.has(task.id)) continue;
    const path: string[] = [];
    const positionById = new Map<string, number>();
    let currentId: string | undefined = task.id;
    while (currentId && !resolvedTaskIds.has(currentId)) {
      const cycleStart = positionById.get(currentId);
      if (cycleStart !== undefined) {
        path.slice(cycleStart).forEach((id) => cyclicTaskIds.add(id));
        break;
      }
      positionById.set(currentId, path.length);
      path.push(currentId);
      currentId = directTaskParents.get(currentId);
    }
    path.forEach((id) => resolvedTaskIds.add(id));
  }
  const safeFolderParent = (folder: FolderNode) => {
    if (cyclicFolderIds.has(folder.id)) return workspaceRootId;
    return directFolderParents.get(folder.id) ?? workspaceRootId;
  };

  // Stored local data is untrusted. Cut known cross-team edges and cycles, but
  // retain unresolved IDs so the UI can ask users to verify/remove stale links.
  const safeDependencies = new Map<string, string[]>();
  const reaches = (startId: string, targetId: string) => {
    const pending = [startId];
    const visited = new Set<string>();
    while (pending.length) {
      const currentId = pending.pop()!;
      if (currentId === targetId) return true;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      pending.push(...(safeDependencies.get(currentId) ?? []));
    }
    return false;
  };
  for (const task of tasks) {
    const candidates = [...new Set(task.dependsOnTaskIds ?? [])]
      .filter((dependencyId) => dependencyId !== task.id
        && (!taskById.has(dependencyId) || taskById.get(dependencyId)?.teamId === task.teamId));
    const accepted: string[] = [];
    safeDependencies.set(task.id, accepted);
    for (const dependencyId of candidates) {
      if (reaches(dependencyId, task.id)) continue;
      accepted.push(dependencyId);
    }
  }

  return [root, ...nodes.map((node) => {
    if (node.kind === "folder") return { ...node, parentId: safeFolderParent(node) };
    if (node.kind === "file") {
      return { ...node, parentId: folderById.get(node.parentId ?? "")?.teamId === node.teamId ? node.parentId : workspaceRootId };
    }
    const { dependsOnTaskIds: _dependsOnTaskIds, parentTaskId: _parentTaskId, ...task } = node;
    const parentTaskId = directTaskParents.get(node.id);
    const dependsOnTaskIds = safeDependencies.get(node.id) ?? [];
    return {
      ...task,
      parentId: folderById.get(node.parentId ?? "")?.teamId === node.teamId ? node.parentId : workspaceRootId,
      ...(parentTaskId && !cyclicTaskIds.has(node.id) ? { parentTaskId } : {}),
      ...(dependsOnTaskIds.length || node.dependsOnTaskIds?.length === 0 ? { dependsOnTaskIds } : {}),
    };
  })];
}
