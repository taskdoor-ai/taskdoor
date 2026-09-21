import type { CriterionReview } from "../lib/taskCriterionReview";
import { workspaceNodes, type TaskIconName, type TaskIconTone, type TaskNode } from "./workspaceNodes.ts";
import type { TaskBurnUpSeries } from "../lib/taskBurnUp";
import type { TaskDiagnosisSnapshot } from "../lib/taskDiagnosis";
import { getTaskProgressBurnUp, getTaskProgressEvents } from "./taskProgressExamples";
import { getCreatorCommerceDiagnosisExample } from "./creatorCommerceDiagnosisExamples";
import { getCreatorPoolTaskExample } from "./creatorPoolTaskExamples";
import { withResultTaskDecisionExample } from "./resultTaskDecisionExamples";
import { withExpandedTaskDiagnosisExample } from "./expandedTaskDiagnosisExamples";
import { getMockContextDiagnosis } from "../lib/mockTaskDiagnosis";
import { getWeeklyRetroDetailDemo } from "./weeklyRetroDetailDemo";
import { withDemoProgressEvidence } from "./taskProgressEvidenceDetails";

type TaskStatus = TaskNode["status"];

const inferFileFormat = (name: string) => name.split(".").pop()?.toUpperCase() ?? "FILE";

export type TaskDetailId = "fragrance-creator-wrapup" | "fragrance-creator-business" | "fragrance-content" | "fragrance-live" | "fragrance-product" | "fragrance-growth" | "fragrance-data" | "fragrance-compliance" | "fragrance-final-decision";

export type TaskFileNode = {
  blobId?: string;
  sizeBytes?: number;
  originalName?: string;
  archived?: boolean;
  content?: string;
  format?: string;
  iconName?: string;
  id: string;
  kind: "folder" | "file";
  mimeType?: string;
  name: string;
  parentId: string | null;
  previewData?:
    | { kind: "table"; sheets: Array<{ name: string; columns: string[]; rows: string[][] }> }
    | { kind: "image"; alt: string; src: string; width?: number; height?: number }
    | { kind: "pdf"; pages: string[] }
    | { kind: "markdown" | "text" | "document"; text: string };
  sizeLabel?: string;
  updatedAt: string;
  version?: number;
};

export type TaskActivityType =
  | "member-post"
  | "member-reply"
  | "ai-insight"
  | "status-change"
  | "schedule-change"
  | "participant-added"
  | "title-change"
  | "goal-change"
  | "owner-change"
  | "owner-proposal"
  | "participants-change"
  | "tags-change"
  | "appearance-change"
  | "task-definition-change";

export type TaskActivityChange = {
  label: string;
  before: string | null;
  after: string | null;
};

export type TaskActivityMock = {
  author: string;
  changes?: TaskActivityChange[];
  createdAt?: string;
  file?: string;
  id: string;
  insightType?: "协作重点" | "状态一致性" | "证据缺口" | "验收风险";
  message: string;
  replyToActivityId?: string;
  time: string;
  type: TaskActivityType;
};

export type TaskCommitMock = {
  author: string;
  createdAt?: string;
  files: string[];
  id: string;
  message: string;
  time: string;
};

export type TaskDetailMock = {
  burnUp?: TaskBurnUpSeries;
  completionCriteria?: string[];
  criterionReviews?: CriterionReview[];
  executionTips?: string[];
  activities: TaskActivityMock[];
  commits: TaskCommitMock[];
  due: string;
  diagnosis?: TaskDiagnosisSnapshot;
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
    format: inferFileFormat(names[0]),
    sizeLabel: "2.4 MB",
    updatedAt: "2 天前",
    version: 3,
    previewData: { kind: "pdf", pages: ["本文件说明当前任务适用的业务规则、目标边界与人员分工。所有结论保留来源，原文权限保持不变。", "版本说明：本页记录最新确认的适用范围与例外条件。"] },
    content: `# ${names[0]}\n\n记录当前任务适用的业务规则与边界条件。\n\n- 所有结论保留来源\n- 原文权限保持不变\n- AI 只读取当前任务需要的内容`,
  },
  {
    id: `${prefix}-record`,
    kind: "file",
    name: names[1],
    parentId: `${prefix}-evidence`,
    format: inferFileFormat(names[1]),
    sizeLabel: "680 KB",
    updatedAt: "今天",
    version: 7,
    previewData: inferFileFormat(names[1]) === "XLSX" ? { kind: "table", sheets: [
      { name: "进度", columns: ["事项", "状态", "负责人", "更新时间"], rows: [["达人确认", "进行中", "陈默", "今天 10:24"], ["脚本终审", "待审核", "林洁", "今天 09:45"], ["库存核对", "已完成", "梁川", "昨天 18:20"]] },
      { name: "风险", columns: ["风险", "等级", "处理人"], rows: [["素材宣称待复核", "中", "苏禾"], ["追加预算待确认", "高", "周岚"]] },
    ] } : { kind: "document", text: `# ${names[1]}\n\n汇总问题现象、验证证据、成员判断和仍需确认的风险。` },
    content: `# ${names[1]}\n\n汇总问题现象、验证证据、成员判断和仍需确认的风险。`,
  },
  {
    id: `${prefix}-history-file`,
    kind: "file",
    name: "历史判断记录.md",
    parentId: `${prefix}-history`,
    format: inferFileFormat("历史判断记录.md"),
    updatedAt: "昨天",
    version: 2,
    content: "# 历史判断记录\n\n保留历次规则变化和作废结论，便于后续追溯。",
  },
  {
    id: `${prefix}-result`,
    kind: "file",
    name: names[2],
    parentId: `${prefix}-delivery`,
    format: inferFileFormat(names[2]),
    sizeLabel: "18 KB",
    updatedAt: "刚刚",
    version: 4,
    content: `# ${names[2]}\n\n## 当前结论\n\n已完成内容与待处理问题均记录在任务活动中。\n\n## 交付说明\n\n本文件记录本次交付的业务结论、适用范围和已知限制；任务是否完成，由 Task Owner 结合当前结果确认。`,
  },
];

type ScenarioExtraFile = {
  content: string;
  name: string;
  section: "requirements" | "evidence" | "delivery";
  updatedAt: string;
};

const withScenarioExtraFiles = (prefix: string, files: TaskFileNode[], extraFiles: ScenarioExtraFile[] = []) => [
  ...files,
  ...extraFiles.map((file, index): TaskFileNode => ({
    content: `# ${file.name}\n\n${file.content}`,
    format: inferFileFormat(file.name),
    id: `${prefix}-extra-${index + 1}`,
    kind: "file",
    name: file.name,
    parentId: `${prefix}-${file.section}`,
    updatedAt: file.updatedAt,
    version: 1,
  })),
];

// 演示活动和文件提交使用固定时间；不随页面刷新或任务 updatedAt 改写事件发生时刻。
const makeTask = (overrides: Partial<TaskDetailMock> & Pick<TaskDetailMock, "goal" | "owner" | "title">): TaskDetailMock => ({
  activities: [
    { id: "activity-human", author: overrides.owner, message: "已补充当前进展和需要共同确认的问题。", createdAt: "2026-09-01T09:52:00+08:00", time: "2026-09-01 09:52", type: "member-post" },
    { id: "activity-ai", author: "TaskDoor AI", message: "已根据最新文件整理任务摘要和风险提示。", createdAt: "2026-09-01T09:46:00+08:00", time: "2026-09-01 09:46", type: "ai-insight" },
    { id: "activity-status", author: overrides.owner, message: "将任务状态更新为进行中。", createdAt: "2026-09-01T09:42:00+08:00", time: "2026-09-01 09:42", type: "status-change" },
    { id: "activity-schedule", author: overrides.owner, message: "补充了任务开始时间，并调整了计划截止时间。", createdAt: "2026-09-01T09:36:00+08:00", time: "2026-09-01 09:36", type: "schedule-change" },
  ],
  commits: [{ id: "commit-1", author: overrides.owner, message: "更新了任务目标，并补充了相关文件依据。", createdAt: "2026-09-01T10:24:00+08:00", time: "2026-09-01 10:24", files: ["历史判断记录.md"] }],
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

function withResultDecisions(task: TaskNode, detail: TaskDetailMock): TaskDetailMock {
  const enriched = withExpandedTaskDiagnosisExample(task, withDemoProgressEvidence(task, withResultTaskDecisionExample(task, detail)));
  if (enriched === detail) return detail;
  // 旧的无上下文调用也使用同一批原始记录生成快照；页面每次仍按当前可读正文重新核对。
  const findings = getMockContextDiagnosis({ id: task.id, title: task.name, status: task.status, context: {
    goal: enriched.goal, completionCriteria: task.completionCriteria ?? [],
    activities: enriched.activities, commits: enriched.commits, files: enriched.files,
  } }, { id: task.id, title: task.name, path: [task.name] }).filter((finding) => finding.type === "decision-conflict");
  const checkedAt = task.id.startsWith("weekly-retro-") ? "2026-09-14T17:30:00+08:00" : enriched.files.some((file) => file.id === `${task.id}-diagnosis-current`) ? "2026-09-02T18:20:00+08:00" : "2026-09-02T17:00:00+08:00";
  return { ...enriched, diagnosis: { checkedAt, decisionConflicts: findings.map((finding) => ({
    id: finding.id.slice(`decision-conflict:${task.id}:`.length), title: finding.title, conclusion: finding.conclusion,
    impact: finding.impact, recommendation: finding.recommendation, evidence: finding.evidence,
  })) } };
}

export function createWorkspaceTaskDetail(task: TaskNode): TaskDetailMock {
  const weekly = getWeeklyRetroDetailDemo(task);
  if (weekly) return withResultDecisions(task, weekly);
  if (task.createdFrom === "task-planner" || task.createdFrom === "task-editor") return withResultDecisions(task, {
    title: task.name, goal: task.goal ?? "", owner: task.ownerId, participants: task.participantIds ?? [],
    participantInvitationStatus: Object.fromEntries((task.participantIds ?? []).map(id => [id, "accepted" as const])),
    status: task.status, due: task.dueAt ?? "—", iconName: task.iconName, iconTone: task.iconTone,
    completionCriteria: task.completionCriteria, executionTips: task.executionTips,
    summary: "尚未收到执行进展。", activities: [], commits: [], files: [],
  });
  const resultFile = `${task.name}交付确认.md`;
  const ruleFile = `${task.name}业务规则.pdf`;
  const evidenceFile = `${task.name}核对记录.docx`;
  const participants = task.participantIds ?? participantByOwner[task.ownerId] ?? [];
  const burnUp = getTaskProgressBurnUp(task.id);
  const diagnosisExample = getCreatorCommerceDiagnosisExample(task);
  const poolExample = getCreatorPoolTaskExample(task);
  const progressActivities = getTaskProgressEvents(task.id).map((event): TaskActivityMock => ({
    id: event.id,
    author: event.actor,
    createdAt: event.at,
    time: `${event.at.slice(0, 10)} ${event.at.slice(11, 16)}`,
    message: event.note,
    type: event.kind === "accepted" || event.kind === "reopened" ? "status-change" : "task-definition-change",
  }));

  return withResultDecisions(task, makeTask({
    activities: [
      ...(poolExample?.activities ?? [
        // Fixed timestamps belong to these demo fixtures, never inferred from relative labels at render time.
        { id: `${task.id}-activity`, author: participants[0] ?? task.ownerId, message: `已补充“${task.name}”的最新核对信息，等待 Task Owner 确认下一步。`, createdAt: "2026-09-01T10:00:00+08:00", time: "2026-09-01 10:00", file: evidenceFile, type: "member-post" },
        { id: `${task.id}-activity-ai`, author: "TaskDoor AI", insightType: "证据缺口", message: `发现“${task.name}”仍有一项结果依据需要补齐，建议在提交结果前核对。`, createdAt: "2026-09-01T09:48:00+08:00", time: "2026-09-01 09:48", file: ruleFile, type: "ai-insight" },
        { id: `${task.id}-activity-status`, author: task.ownerId, message: `将任务状态更新为“${task.status}”。`, createdAt: "2026-09-01T09:42:00+08:00", time: "2026-09-01 09:42", type: "status-change" },
        { id: `${task.id}-activity-schedule`, author: task.ownerId, message: "调整了任务的计划截止时间。", createdAt: "2026-09-01T09:36:00+08:00", time: "2026-09-01 09:36", type: "schedule-change" },
        { id: `${task.id}-activity-reply`, author: task.ownerId, message: "收到，我会在本轮完成前核对并回传结论。", createdAt: "2026-09-01T10:06:00+08:00", time: "2026-09-01 10:06", replyToActivityId: `${task.id}-activity`, type: "member-reply" },
      ] as TaskActivityMock[]),
      ...progressActivities,
      ...(diagnosisExample?.activities ?? []),
    ],
    ...(burnUp ? { burnUp } : {}),
    ...(diagnosisExample ? { diagnosis: diagnosisExample.diagnosis } : {}),
    ...(poolExample ? { summary: poolExample.summary } : {}),
    commits: poolExample?.commits ?? [{ id: `${task.id}-commit`, author: task.ownerId, message: "更新了任务范围、结果判断与当前依据。", createdAt: "2026-09-01T10:24:00+08:00", time: "2026-09-01 10:24", files: [resultFile] }],
    completionCriteria: task.completionCriteria,
    executionTips: task.executionTips,
    due: task.dueAt ?? "待排期",
    files: poolExample?.files ?? commonFiles(task.id, [ruleFile, evidenceFile, resultFile]),
    goal: task.goal ?? `完成“${task.name}”的范围确认、方案执行与结果确认。`,
    iconName: task.iconName,
    iconTone: task.iconTone,
    owner: task.ownerId,
    participantInvitationStatus: Object.fromEntries(participants.map((participant, index) => [participant, index === 0 ? "accepted" : "pending"])),
    participants,
    status: task.status,
    title: task.name,
  }));
}

type ScenarioDetailSpec = {
  activityAuthor: string;
  activityMessage: string;
  aiMessage: string;
  aiInsightType?: "协作重点" | "状态一致性" | "证据缺口" | "验收风险";
  diagnosis?: TaskDiagnosisSnapshot;
  extraCommits?: Array<{ files: string[]; message: string; createdAt: string; time: string }>;
  extraFiles?: ScenarioExtraFile[];
  fileNames: [string, string, string];
  participants?: string[];
  summary: string;
};

const getScenarioTask = (id: TaskDetailId) => {
  const task = workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === id);
  if (!task) throw new Error(`Missing creator-commerce workspace task: ${id}`);
  return task;
};

const createScenarioTaskDetail = (id: TaskDetailId, spec: ScenarioDetailSpec): TaskDetailMock => {
  const task = getScenarioTask(id);
  const participants = spec.participants ?? task.participantIds ?? participantByOwner[task.ownerId] ?? [];
  const [ruleFile, evidenceFile, resultFile] = spec.fileNames;
  return withResultDecisions(task, makeTask({
    // Keep the scenario's fixed history explicit; never relabel it as recorded progress.
    burnUp: getTaskProgressBurnUp(id),
    activities: [
      { id: `${id}-activity`, author: spec.activityAuthor, message: spec.activityMessage, createdAt: "2026-09-01T10:00:00+08:00", time: "2026-09-01 10:00", file: evidenceFile, type: "member-post" },
      { id: `${id}-activity-ai`, author: "TaskDoor AI", insightType: spec.aiInsightType ?? "验收风险", message: spec.aiMessage, createdAt: "2026-09-01T09:48:00+08:00", time: "2026-09-01 09:48", file: ruleFile, type: "ai-insight" },
      { id: `${id}-activity-status`, author: task.ownerId, message: `将任务状态更新为“${task.status}”。`, createdAt: "2026-09-01T09:42:00+08:00", time: "2026-09-01 09:42", type: "status-change" },
      { id: `${id}-activity-reply`, author: task.ownerId, message: "收到，我会按当前责任边界完成核对并回传结论。", createdAt: "2026-09-01T10:06:00+08:00", time: "2026-09-01 10:06", replyToActivityId: `${id}-activity`, type: "member-reply" },
      // 原活动与引用 ID 保留；新增的固定演示历史和父级燃起图使用同一事件账本。
      ...getTaskProgressEvents(id).map((event): TaskActivityMock => ({
        id: event.id,
        author: event.actor,
        createdAt: event.at,
        time: `${event.at.slice(0, 10)} ${event.at.slice(11, 16)}`,
        message: event.note,
        type: event.kind === "accepted" || event.kind === "reopened" ? "status-change" : "task-definition-change",
      })),
    ],
    commits: [
      { id: `${id}-commit`, author: task.ownerId, message: `更新“${task.name}”的范围、依据与交付结果。`, createdAt: "2026-09-01T10:24:00+08:00", time: "2026-09-01 10:24", files: [resultFile] },
      ...(spec.extraCommits ?? []).map((commit, index) => ({ ...commit, author: task.ownerId, id: `${id}-commit-${index + 2}` })),
    ],
    diagnosis: spec.diagnosis,
    completionCriteria: task.completionCriteria,
    executionTips: task.executionTips,
    due: task.dueAt ?? "待排期",
    files: withScenarioExtraFiles(id, commonFiles(id, spec.fileNames), spec.extraFiles),
    goal: task.goal ?? `完成“${task.name}”。`,
    iconName: task.iconName,
    iconTone: task.iconTone,
    owner: task.ownerId,
    participantInvitationStatus: Object.fromEntries(participants.map((participant, index) => [participant, index === 0 ? "accepted" : "pending"])),
    participants,
    status: task.status,
    summary: spec.summary,
    title: task.name,
  }));
};

export const taskDetailMocks: Record<TaskDetailId, TaskDetailMock> = {
  "fragrance-creator-wrapup": createScenarioTaskDetail("fragrance-creator-wrapup", {
    activityAuthor: "陈默",
    activityMessage: "已汇总第二批达人合作状态，等待周岚确认最终目标与资源优先级。",
    aiMessage: "八个责任环节均已建立，当前重点是收口投流预算、素材合规与数据复盘口径。",
    aiInsightType: "协作重点",
    diagnosis: { checkedAt: "2026-09-01T10:30:00+08:00", decisionConflicts: [] },
    fileNames: ["香氛礼盒项目目标与分工.pdf", "达人带货收尾状态核对表.xlsx", "项目收尾决策记录.md"],
    participants: ["陈默", "林洁", "高远", "梁川", "许宁", "韩序", "苏禾"],
    summary: "香氛礼盒达人带货进入收尾阶段，周岚负责协调八个责任环节并确认最终结果。",
  }),
  "fragrance-creator-business": createScenarioTaskDetail("fragrance-creator-business", {
    activityAuthor: "陈默",
    activityMessage: "第二批达人合作名单、已确认佣金条款与档期已完成核对，合作确认记录已交付。",
    aiMessage: "两位高匹配达人档期重叠，建议在确认合作顺序前核对目标贡献与预算占用。",
    extraCommits: [{ files: ["第二批达人建联进度表.xlsx", "达人候选池.csv"], message: "完成候选达人分层并回填首轮建联结果。", createdAt: "2026-08-31T18:20:00+08:00", time: "2026-08-31 18:20" }],
    extraFiles: [
      { content: "记录候选达人画像、历史带货品类、预估贡献与当前建联阶段。", name: "达人候选池.csv", section: "evidence", updatedAt: "昨天" },
      { content: "汇总佣金、坑位费、档期与排他条款的已确认内容。", name: "商务沟通纪要.md", section: "evidence", updatedAt: "今天" },
    ],
    fileNames: ["香氛礼盒达人筛选标准.pdf", "第二批达人建联进度表.xlsx", "第二批达人合作确认单.md"],
    summary: "陈默已完成第二批达人合作确认；名单、已确认条款与档期记录可供后续执行核对。",
  }),
  "fragrance-content": createScenarioTaskDetail("fragrance-content", {
    activityAuthor: "林洁",
    activityMessage: "短视频脚本、直播话术与核心卖点已整理到最新素材版本；一处功效表述仍待合规复核，终审尚未完成。",
    aiMessage: "直播话术仍有一处功效表达需要苏禾确认，建议在彩排前锁定最终表述。",
    extraFiles: [{ content: "对照初稿、商务反馈和合规意见，标记每一处卖点表述变化。", name: "脚本版本差异对照.md", section: "evidence", updatedAt: "45 分钟前" }],
    fileNames: ["香氛礼盒核心卖点说明.pdf", "脚本素材终审意见.docx", "直播话术与素材交付包.md"],
    summary: "林洁正在推进脚本与素材终审，需先明确功效表述的合规结论，再锁定最终交付版本。",
  }),
  "fragrance-live": createScenarioTaskDetail("fragrance-live", {
    activityAuthor: "高远",
    activityMessage: "@周岚 直播排期、彩排流程与异常预案草案已准备；最终话术版本尚未锁定，请协助确认内容终审安排。",
    aiMessage: "彩排前仍需确认最终商品机制与合规话术版本，避免现场信息不一致。",
    extraCommits: [{ files: ["直播彩排问题记录.docx", "现场异常预案.xlsx"], message: "根据首次走台补充串场节奏和异常切换条件。", createdAt: "2026-08-31T21:10:00+08:00", time: "2026-08-31 21:10" }],
    extraFiles: [
      { content: "按网络、库存、价格机制和主播节奏四类问题记录处理口径。", name: "现场异常预案.xlsx", section: "requirements", updatedAt: "今天" },
      { content: "保留首次彩排录像位置、时间码与对应问题编号。", name: "首次彩排录像索引.md", section: "evidence", updatedAt: "今天" },
    ],
    fileNames: ["香氛礼盒直播执行方案.pdf", "直播彩排问题记录.docx", "直播场控与异常清单.md"],
    summary: "直播彩排等待内容终审；高远可继续核对场控清单与异常预案，尚不能确认彩排完成。",
  }),
  "fragrance-product": createScenarioTaskDetail("fragrance-product", {
    activityAuthor: "梁川",
    activityMessage: "礼盒价格、赠品门槛、库存水位与履约保障已完成联合核对。",
    aiMessage: "高峰库存预留仍需与直播排期联动，建议在最终场次确认后更新安全水位。",
    extraFiles: [{ content: "记录现货、在途、锁定库存和不同场次的安全水位。", name: "库存水位快照.xlsx", section: "evidence", updatedAt: "1 小时前" }],
    fileNames: ["香氛礼盒商品机制说明.pdf", "库存与履约核对表.xlsx", "价格赠品确认单.md"],
    summary: "梁川已完成价格、赠品、库存与履约保障的约定核对；后续场次变更需重新确认安全水位。",
  }),
  "fragrance-growth": createScenarioTaskDetail("fragrance-growth", {
    activityAuthor: "许宁",
    activityMessage: "已根据首轮表现更新预算消耗、定向策略与第二轮人群包组合。",
    aiMessage: "新增人群包预计提升触达，但需按 GMV 目标设置分段止损线并持续观察 ROI。",
    extraCommits: [{ files: ["首轮投放明细.csv"], message: "补录首轮渠道消耗与分时转化，修正两处归因映射。", createdAt: "2026-08-31T16:40:00+08:00", time: "2026-08-31 16:40" }],
    extraFiles: [
      { content: "保留渠道、时段、人群包、消耗、成交和归因状态的原始记录。", name: "首轮投放明细.csv", section: "evidence", updatedAt: "昨天" },
      { content: "定义分段 ROI 阈值、预算暂停条件和恢复观察窗口。", name: "投流止损线说明.md", section: "requirements", updatedAt: "35 分钟前" },
    ],
    fileNames: ["第二轮投流策略.pdf", "人群包效果分析.xlsx", "投流预算调整记录.md"],
    summary: "许宁正在调整媒体投放预算、定向、人群包与 ROI 控制策略。",
  }),
  "fragrance-data": createScenarioTaskDetail("fragrance-data", {
    activityAuthor: "韩序",
    activityMessage: "已交付约定范围的 GMV 看板与归因口径说明，两个缺失渠道已单独标注，不将缺失数据用于最终追加投放决策。",
    aiMessage: "两个渠道仍缺少可比数据，建议在复盘前补齐转化链路并标注口径差异。",
    extraCommits: [
      { files: ["渠道归因原始数据.csv"], message: "导入最新渠道回传并标记缺失的转化节点。", createdAt: "2026-08-31T19:30:00+08:00", time: "2026-08-31 19:30" },
      { files: ["GMV 渠道数据看板.xlsx", "指标口径变更记录.md"], message: "统一 GMV 去重规则并更新看板计算口径。", createdAt: "2026-09-01T08:55:00+08:00", time: "2026-09-01 08:55" },
    ],
    extraFiles: [
      { content: "保留未经汇总的渠道回传、订单、素材与达人标识。", name: "渠道归因原始数据.csv", section: "evidence", updatedAt: "15 分钟前" },
      { content: "逐项记录指标定义、计算规则、变更人和生效时间。", name: "指标口径变更记录.md", section: "requirements", updatedAt: "今天" },
    ],
    fileNames: ["达人带货指标口径说明.pdf", "GMV 渠道数据看板.xlsx", "香氛礼盒项目复盘框架.md"],
    summary: "韩序已交付约定范围的看板与归因口径；两个渠道的数据限制仍需标注，不据此宣称所有数据已齐全。",
  }),
  "fragrance-compliance": createScenarioTaskDetail("fragrance-compliance", {
    activityAuthor: "苏禾",
    activityMessage: "已收集待审素材与达人合同，并标记需要重点核对的功效表述；正式审核等待内容终审稿。",
    aiMessage: "一条直播功效话术尚未关联证据，建议修订后再提交最终合规结论。",
    extraFiles: [{ content: "按广告法、平台规则和合同约定标记风险等级与修改建议。", name: "合同与素材红线批注.docx", section: "evidence", updatedAt: "2 小时前" }],
    fileNames: ["直播素材宣称规范.pdf", "达人合同审核记录.docx", "香氛礼盒合规审核结论.md"],
    summary: "苏禾待启动正式合规审核；需先收到可审核的内容版本，已有材料不等于审核结论。",
  }),
  "fragrance-final-decision": createScenarioTaskDetail("fragrance-final-decision", {
      activityAuthor: "许宁",
      activityMessage: "已提交追加投放预算、人群包与预期 GMV 贡献测算；预算和停止条件需要与本任务讨论中的执行边界核对。",
      aiMessage: "追加投放仍需同时核对 ROI 止损线与渠道归因口径，建议完成最终决策后同步许宁和韩序执行。",
      fileNames: ["追加投放目标与决策边界.pdf", "追加投放测算与风险记录.xlsx", "最终投放决策记录.md"],
      participants: ["许宁", "韩序"],
      summary: "周岚正在确认追加投放的 GMV 目标、预算边界、资源优先级与最终决策。",
  }),
};
