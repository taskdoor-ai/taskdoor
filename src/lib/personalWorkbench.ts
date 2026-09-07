import type { TaskRelationSummary } from "../components/TaskRelationsSection";
import type { TaskActivityMock, TaskDetailMock } from "../data/taskDetailMocks";
import { getTaskProgressEvents } from "../data/taskProgressExamples";
import { workspaceNodes, type TaskNode } from "../data/workspaceNodes";
import { summarizeTaskEffort } from "./taskEffort";
import { getWorkspaceEffortLeaves } from "./taskEffortEditing";
import { getTaskSituationModel, type TaskSituationReference } from "./taskSituation";

export type PersonalWorkbenchEvidence = TaskSituationReference & { taskId: string };
export type PersonalWorkbenchRole = "coordination" | "execution";
export type PersonalWorkbenchDueState = "overdue" | "today" | "upcoming" | "unknown" | "none";
export type PersonalWorkbenchEffort = {
  value: string;
  detail?: string;
};
type PersonalWorkbenchPriorityContext = {
  completionCriterion?: string;
  pendingDependencyCount: number;
  missingDependencyCount: number;
  childCount: number;
  completedChildCount: number;
  remainingChildCount: number;
  cancelledChildCount: number;
};
export type PersonalWorkbenchTask = {
  taskId: string;
  title: string;
  iconName?: TaskNode["iconName"];
  iconTone?: TaskNode["iconTone"];
  role: PersonalWorkbenchRole;
  status: TaskNode["status"];
  dueLabel: string;
  dueState: PersonalWorkbenchDueState;
  source: "example" | "recorded";
  freshness: "current" | "stale" | "missing";
  summary: string;
  effort: PersonalWorkbenchEffort;
  priorityContext?: PersonalWorkbenchPriorityContext;
};
export type PersonalWorkbenchAction = PersonalWorkbenchTask & {
  id: string;
  action: string;
  urgencyReason?: string;
  reason: string;
  focus?: PersonalWorkbenchAttention["kind"];
  relatedStatus?: TaskNode["status"];
  evidence?: PersonalWorkbenchEvidence;
};
export type PersonalWorkbenchAttention = {
  id: string;
  taskId: string;
  title: string;
  kind: "blocked" | "dependency" | "evidence" | "unknown" | "status-conflict";
  relatedStatus?: TaskNode["status"];
  text: string;
  source: "example" | "recorded";
  evidence?: PersonalWorkbenchEvidence;
};
export type PersonalWorkbenchChange = {
  id: string;
  taskId: string;
  title: string;
  at: string;
  text: string;
  source: "example" | "recorded";
  evidence: PersonalWorkbenchEvidence;
};
export type PersonalWorkbenchInvitation = {
  taskId: string;
  title: string;
  text: string;
  source: "example" | "recorded";
  evidence: PersonalWorkbenchEvidence;
};
export type PersonalWorkbenchModel = {
  asOf: string;
  summary: string;
  notice: string;
  counts: {
    owned: number; active: number; coordinating: number; executing: number;
    completed: number; cancelled: number; awaitingAcceptance: number; attention: number;
  };
  actions: PersonalWorkbenchAction[];
  attention: PersonalWorkbenchAttention[];
  recentChanges: PersonalWorkbenchChange[];
  /** 当前可访问任务的统一快照，供相关任务核对项复用真实状态与当前情况。 */
  taskSnapshots: PersonalWorkbenchTask[];
  ownedTasks: PersonalWorkbenchTask[];
  awaitingAcceptance: PersonalWorkbenchInvitation[];
};
export type PersonalWorkbenchInput = {
  tasks: TaskNode[];
  currentUserId: string;
  asOf: string;
  detailsByTaskId?: Record<string, TaskDetailMock>;
  /** 与任务详情共用的可信本地记录；不能用混合历史 activities 代替。 */
  recordedActivitiesByTaskId?: Record<string, TaskActivityMock[]>;
};

const exampleDay = "2026-08-31";
const exampleNodes = new Map(workspaceNodes.filter((node): node is TaskNode => node.kind === "task").map((node) => [node.id, structuredClone(node)]));
const isActive = (task: Pick<TaskNode, "status">) => task.status !== "已完成" && task.status !== "已取消";
const unique = (ids: string[] = []) => [...new Set(ids)];
const validDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T12:00:00Z`))
  && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const absoluteInstant = (value?: string): number | undefined => {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || !validDay(value.slice(0, 10)) || Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59
    || (value[16] === ":" && Number(value.slice(17, 19)) > 59)) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
};
const shanghaiDay = (timestamp: number) => new Date(timestamp + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
type Clock = { day?: string; timestamp?: number };
function clockFor(asOf: string): Clock {
  if (validDay(asOf)) return { day: asOf };
  const timestamp = absoluteInstant(asOf);
  return timestamp === undefined ? {} : { day: shanghaiDay(timestamp), timestamp };
}

type Due = { state: PersonalWorkbenchDueState; label: string; day?: string; timestamp?: number; example: boolean };
function dueFor(task: TaskNode, clock: Clock): Due {
  // dueAt 是任务明确承诺；plannedEndOn 只是没有明确截止时的计划兜底。
  // 周期安排不是一个单次截止日，不能拿计划范围终点冒充本次期限。
  // 但用户明确修改过示例排期时，以本次修改后的计划结束日为准。
  const seed = exampleNodes.get(task.id);
  const changedPlan = Boolean(seed && (task.plannedStartOn !== seed.plannedStartOn || task.plannedEndOn !== seed.plannedEndOn));
  const raw = ((changedPlan ? task.plannedEndOn ?? task.dueAt : task.dueAt ?? task.plannedEndOn) ?? "").trim();
  if (!raw || raw === "—" || /未设置|待排期|待确认/.test(raw)) return { state: "none", label: "无截止时间", example: false };
  if (/^每(?:个工作日|周)/.test(raw)) return { state: "none", label: "周期安排", example: false };
  let day: string | undefined;
  let timestamp: number | undefined;
  let example = false;
  let time = "";
  if (validDay(raw)) day = raw;
  else if (absoluteInstant(raw) !== undefined) {
    timestamp = absoluteInstant(raw)!;
    day = shanghaiDay(timestamp);
    time = new Date(timestamp + 8 * 60 * 60 * 1000).toISOString().slice(11, 16);
  } else {
    // 只有未改动的固定示例才能补齐缺失的年份/相对日期，绝不绑定运行当天。
    if (task.createdFrom !== "task-planner" && seed?.dueAt === raw) {
      const monthDay = raw.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*日(?:\s*(\d{1,2}):(\d{2}))?$/);
      const relative = raw.match(/^(今天|明天|昨天)(?:\s*(\d{1,2}):(\d{2}))?$/);
      if (monthDay) {
        day = `2026-${monthDay[1].padStart(2, "0")}-${monthDay[2].padStart(2, "0")}`;
        if (monthDay[3]) time = `${monthDay[3].padStart(2, "0")}:${monthDay[4]}`;
      } else if (relative) {
        const offset = relative[1] === "明天" ? 1 : relative[1] === "昨天" ? -1 : 0;
        day = new Date(Date.parse(`${exampleDay}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
        if (relative[2]) time = `${relative[2].padStart(2, "0")}:${relative[3]}`;
      }
      example = Boolean(day);
      if (day && time) timestamp = absoluteInstant(`${day}T${time}:00+08:00`);
    }
  }
  if (!day || !validDay(day) || (time && timestamp === undefined) || !clock.day) {
    return { state: "unknown", label: "截止日期待核对", example: false };
  }
  const overdue = timestamp !== undefined && clock.timestamp !== undefined ? timestamp < clock.timestamp : day < clock.day;
  return {
    state: overdue ? "overdue" : day === clock.day ? "today" : "upcoming",
    label: `${Number(day.slice(5, 7))} 月 ${Number(day.slice(8, 10))} 日${time ? ` ${time}` : ""}`,
    day, timestamp, example,
  };
}

function relation(task: TaskNode): TaskRelationSummary {
  return {
    id: task.id, title: task.name, owner: task.ownerId, goal: task.goal ?? "", status: task.status,
    dueAt: task.dueAt ?? "未设置截止时间", completionCriteria: task.completionCriteria,
    dependsOnTaskIds: task.dependsOnTaskIds,
  };
}

function detailFor(task: TaskNode, byId: Map<string, TaskNode>, supplied?: TaskDetailMock): TaskDetailMock {
  let root = task;
  const visited = new Set<string>();
  while (root.parentTaskId && !visited.has(root.id)) {
    visited.add(root.id);
    const parent = byId.get(root.parentTaskId);
    if (!parent) break;
    root = parent;
  }
  const seed = exampleNodes.get(task.id);
  const changedPlan = seed && (task.plannedStartOn !== seed.plannedStartOn || task.plannedEndOn !== seed.plannedEndOn);
  return {
    ...supplied,
    title: task.name, goal: root.goal ?? task.goal ?? "", owner: task.ownerId, status: task.status,
    due: changedPlan ? task.plannedEndOn ?? task.dueAt ?? "—" : task.dueAt ?? supplied?.due ?? "—",
    completionCriteria: task.completionCriteria ?? supplied?.completionCriteria,
    executionTips: task.executionTips ?? supplied?.executionTips,
    participants: task.participantIds ?? supplied?.participants ?? [],
    activities: supplied?.activities ?? [], files: supplied?.files ?? [], commits: supplied?.commits ?? [],
    summary: supplied?.summary ?? "尚无可核对的进展记录。",
  };
}

const taskEvidence = (task: TaskNode): PersonalWorkbenchEvidence => ({ taskId: task.id, kind: "task", id: task.id, label: "查看任务" });
const sourceFor = (task: TaskNode): "example" | "recorded" => exampleNodes.has(task.id) && task.createdFrom !== "task-planner" ? "example" : "recorded";
const evidenceFor = (taskId: string, reference?: TaskSituationReference): PersonalWorkbenchEvidence | undefined => reference
  ? { ...reference, taskId: reference.kind === "task" && reference.id ? reference.id : taskId }
  : undefined;

type Issue = PersonalWorkbenchAttention & { action?: string; weight: number };
function dependencyIssues(task: TaskNode, byId: Map<string, TaskNode>): Issue[] {
  const ids = unique(task.dependsOnTaskIds);
  const missing = ids.some((id) => !byId.has(id));
  const pending = ids.map((id) => byId.get(id)).filter((dependency): dependency is TaskNode => Boolean(dependency && dependency.status !== "已完成"));
  const base = { taskId: task.id, title: task.name, source: sourceFor(task) };
  const issues: Issue[] = [];
  if (missing) issues.push({
    ...base, id: `${task.id}:missing-dependency`, kind: "unknown", weight: 0,
    text: "部分前置任务的资料当前不可用，依赖是否满足仍待核对。",
    action: "先核对前置资料与交付条件，再判断可以推进的部分。", evidence: taskEvidence(task),
  });
  if (pending.length) {
    const dependency = pending[0];
    issues.push({
      ...base, id: `${task.id}:dependency`, kind: task.status === "已完成" ? "status-conflict" : "dependency", weight: 1,
      text: task.status === "已完成"
        ? `任务标记已完成，但前置「${dependency.name}」仍为${dependency.status}；需核对依赖与交付范围。`
        : `前置「${dependency.name}」为${dependency.status}，相关产出尚需核对。`,
      action: `先核对「${dependency.name}」的交付条件，再确认本任务可推进的范围。`,
      relatedStatus: dependency.status,
      evidence: { ...taskEvidence(dependency), label: "查看前置任务" },
    });
  }
  if (task.status === "已阻塞" && !pending.length && !missing) issues.push({
    ...base, id: `${task.id}:blocked`, kind: "blocked", weight: 2,
    text: "当前标记已阻塞，具体阻塞原因与解除条件仍需核对。",
    action: "核对阻塞原因、解除条件与需要谁处理。", evidence: taskEvidence(task),
  });
  return issues;
}

function collectChanges(input: PersonalWorkbenchInput, owned: TaskNode[], byId: Map<string, TaskNode>, clock: Clock): PersonalWorkbenchChange[] {
  if (!clock.day) return [];
  const relevant = new Set<string>();
  const children = new Map<string, TaskNode[]>();
  for (const task of byId.values()) if (task.parentTaskId) children.set(task.parentTaskId, [...(children.get(task.parentTaskId) ?? []), task]);
  const addDescendants = (task: TaskNode) => {
    if (relevant.has(task.id)) return;
    relevant.add(task.id);
    for (const child of children.get(task.id) ?? []) addDescendants(child);
  };
  owned.forEach(addDescendants);
  const changes = new Map<string, PersonalWorkbenchChange>();
  const beforeAsOf = (at: string) => {
    const timestamp = absoluteInstant(at);
    return timestamp !== undefined && (clock.timestamp !== undefined ? timestamp <= clock.timestamp : shanghaiDay(timestamp) <= clock.day!);
  };
  for (const id of relevant) {
    const task = byId.get(id)!;
    const progress = sourceFor(task) === "example" ? getTaskProgressEvents(id) : [];
    for (const event of progress) {
      const target = byId.get(event.taskId);
      if (event.isBaseline || !target || sourceFor(target) !== "example" || !relevant.has(event.taskId) || !beforeAsOf(event.at)) continue;
      const key = `${event.taskId}:${event.id}`;
      const direct = input.detailsByTaskId?.[event.taskId]?.activities.some((activity) => activity.id === event.id);
      const parent = input.detailsByTaskId?.[event.parentTaskId]?.activities.some((activity) => activity.id === event.id);
      changes.set(key, {
        id: key, taskId: target.id, title: target.name, at: event.at, text: event.note, source: "example",
        evidence: direct ? { taskId: target.id, kind: "activity", id: event.id, label: "查看来源记录" }
          : parent && byId.has(event.parentTaskId) ? { taskId: event.parentTaskId, kind: "activity", id: event.id, label: "查看来源记录" }
            : taskEvidence(target),
      });
    }
    const progressIds = new Set(progress.map((event) => event.id));
    for (const activity of input.detailsByTaskId?.[id]?.activities ?? []) {
      // 固定账本在父与子详情都有投影；包括初始范围的投影都不能作为本地新事件再加一遍。
      if (progressIds.has(activity.id) || !activity.createdAt || !beforeAsOf(activity.createdAt)) continue;
      const key = `${id}:${activity.id}`;
      changes.set(key, {
        id: key, taskId: id, title: task.name, at: activity.createdAt,
        text: `${activity.author}：${activity.message}`, source: "recorded",
        evidence: { taskId: id, kind: "activity", id: activity.id, label: "查看来源记录" },
      });
    }
  }
  return [...changes.values()].sort((left, right) => Date.parse(right.at) - Date.parse(left.at) || left.id.localeCompare(right.id));
}

function formatWorkbenchMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${remainingMinutes} 分钟`;
  if (!remainingMinutes) return `${hours} 小时`;
  return `${hours} 小时 ${remainingMinutes} 分钟`;
}

/**
 * 只展示任务范围内可验证的预计人类总投入，不把它冒充成个人当天剩余工时。
 * 父任务从叶子任务汇总，缺失与过期估算都不会默认为 0。
 */
function effortFor(tasks: TaskNode[], task: TaskNode): PersonalWorkbenchEffort {
  const leaves = getWorkspaceEffortLeaves(tasks, task.id);
  if (!leaves.length) return { value: "待估算" };
  const summary = summarizeTaskEffort(leaves);
  const isLeaf = leaves.length === 1 && leaves[0].id === task.id;
  const detail = isLeaf ? undefined : `含 ${leaves.length} 项子任务`;
  if (summary.totalMinutes !== null) return { value: `约 ${formatWorkbenchMinutes(summary.totalMinutes)}`, ...(detail ? { detail } : {}) };
  if (summary.estimatedCount > 0) return { value: `已估部分约 ${formatWorkbenchMinutes(summary.knownMinutes)}`, ...(detail ? { detail } : {}) };
  if (summary.staleCount > 0) return { value: "需复核", ...(detail ? { detail } : {}) };
  return { value: "待估算", ...(detail ? { detail } : {}) };
}

/** 当前有权任务的个人投影；调用方必须传完整任务集合，不能传列表分页/标签筛选结果。 */
export function buildPersonalWorkbenchModel(input: PersonalWorkbenchInput): PersonalWorkbenchModel {
  const byId = new Map(input.tasks.map((task) => [task.id, task]));
  const tasks = [...byId.values()];
  const owned = input.currentUserId.trim() ? tasks.filter((task) => task.ownerId === input.currentUserId) : [];
  const clock = clockFor(input.asOf);
  const ownedTasks: PersonalWorkbenchTask[] = [];
  const actions: Array<PersonalWorkbenchAction & { order: number; dateKey: string; dueTimestamp?: number; position: number }> = [];
  const allIssues = new Map<string, Issue>();
  const usedInAction = new Set<string>();
  const childrenById = new Map<string, TaskNode[]>();
  for (const task of tasks) if (task.parentTaskId) childrenById.set(task.parentTaskId, [...(childrenById.get(task.parentTaskId) ?? []), task]);
  const descendantsOf = (parentId: string) => {
    const descendants: TaskNode[] = [];
    const visited = new Set<string>([parentId]);
    const visit = (id: string) => {
      for (const child of childrenById.get(id) ?? []) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        descendants.push(child);
        visit(child.id);
      }
    };
    visit(parentId);
    return descendants;
  };
  // 一项问题由最近的本人责任节点承担行动，避免父级与本人叶子重复安排同一阻塞。
  const nearestOwnedId = (taskId: string) => {
    let current = byId.get(taskId);
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      if (current.ownerId === input.currentUserId) return current.id;
      current = current.parentTaskId ? byId.get(current.parentTaskId) : undefined;
    }
    return undefined;
  };
  const taskContext = new Map<string, {
    children: TaskNode[];
    descendants: TaskNode[];
    due: Due;
    projection: PersonalWorkbenchTask;
    situation: ReturnType<typeof getTaskSituationModel>;
  }>();
  const contextFor = (task: TaskNode) => {
    const cached = taskContext.get(task.id);
    if (cached) return cached;
    const children = childrenById.get(task.id) ?? [];
    const descendants = descendantsOf(task.id);
    const dependencies = unique(task.dependsOnTaskIds).map((id) => byId.get(id)).filter((dependency): dependency is TaskNode => Boolean(dependency));
    const detail = detailFor(task, byId, input.detailsByTaskId?.[task.id]);
    let situation = getTaskSituationModel({
      taskId: task.id, task: detail, childTasks: children.map(relation),
      dependencyTaskIds: task.dependsOnTaskIds ?? [], dependencyTasks: dependencies.map(relation),
      recordedActivities: input.recordedActivitiesByTaskId?.[task.id] ?? [],
    });
    // 当前详情示例只有一层；新增更深范围不能沿用其固定结论。
    if (situation.source === "example" && situation.freshness === "current" && descendants.length > children.length) situation = {
      ...situation, freshness: "stale", asOf: undefined, groups: [],
      summary: "下级范围已增加层级，当前交付与依赖需按完整范围重新核对。",
    };
    const due = dueFor(task, clock);
    const projection: PersonalWorkbenchTask = {
      taskId: task.id, title: task.name, role: children.length ? "coordination" : "execution", status: task.status,
      iconName: task.iconName, iconTone: task.iconTone,
      dueLabel: due.label, dueState: due.state, source: sourceFor(task), freshness: situation.freshness, summary: situation.summary,
      effort: effortFor(tasks, task),
      priorityContext: {
        completionCriterion: detail.completionCriteria?.find(criterion => criterion.trim())?.trim(),
        pendingDependencyCount: dependencies.filter(dependency => dependency.status !== "已完成").length,
        missingDependencyCount: unique(task.dependsOnTaskIds).length - dependencies.length,
        childCount: children.length,
        completedChildCount: children.filter(child => child.status === "已完成").length,
        remainingChildCount: children.filter(isActive).length,
        cancelledChildCount: children.filter(child => child.status === "已取消").length,
      },
    };
    const context = { children, descendants, due, projection, situation };
    taskContext.set(task.id, context);
    return context;
  };
  owned.forEach((task, position) => {
    const { children, descendants, due, projection, situation } = contextFor(task);
    ownedTasks.push(projection);
    if (task.status === "已取消") return;
    const issues = dependencyIssues(task, byId);
    if (children.length) {
      for (const child of descendants) if (child.status !== "已取消") issues.push(...dependencyIssues(child, byId));
      for (const scope of [task, ...descendants]) if (scope.status === "已完成" && descendantsOf(scope.id).some(isActive)) issues.unshift({
        id: `${scope.id}:children-status`, taskId: scope.id, title: scope.name, kind: "status-conflict", weight: 0,
        text: "父任务标记已完成，但仍有下级任务未收口，需要核对整体完成边界。", source: sourceFor(scope),
        action: "核对未收口的下级结果与完成边界，不自动修改状态。",
        evidence: { taskId: scope.id, kind: "subtasks", label: "查看子任务" },
      });
    }
    if (isActive(task)) {
      const evidenceGap = situation.groups.find((group) => group.id === "attention")?.items.find((item) => item.reference?.kind === "criteria");
      const hasCompletionCriteria = Boolean(task.completionCriteria?.some((criterion) => criterion.trim()));
      if (evidenceGap && (task.status === "待审核" || !hasCompletionCriteria)) issues.push({
        id: `${task.id}:criteria`, taskId: task.id, title: task.name, kind: "evidence", weight: 5,
        text: evidenceGap.text, source: sourceFor(task), evidence: evidenceFor(task.id, evidenceGap.reference),
      });
      if (due.state === "unknown") issues.push({
        id: `${task.id}:due`, taskId: task.id, title: task.name, kind: "unknown", weight: 6,
        text: "当前截止信息缺少可核对的完整日期，不能据此判断今天到期或已逾期。",
        source: sourceFor(task), evidence: taskEvidence(task),
      });
    }
    issues.sort((left, right) => left.weight - right.weight);
    for (const issue of issues) allIssues.set(issue.id, issue);
    if (!isActive(task)) return;
    // 直属责任优先于协调范围：前置待核对时，不能用具体示例建议越过已知阻塞。
    const eligibleIssues = issues.filter((issue) => nearestOwnedId(issue.taskId) === task.id && !usedInAction.has(issue.id));
    const direct = eligibleIssues.find((issue) => issue.taskId === task.id && issue.weight < 5);
    const issue = direct ?? eligibleIssues[0];
    if (issue) usedInAction.add(issue.id);
    const next = situation.groups.find((group) => group.id === "next")?.items[0];
    let action = issue?.action ?? next?.text ?? (children.length ? "核对子任务结果与需要协调的事项。" : "明确当前可推进的结果与下一步。");
    if (children.length && issue?.taskId !== task.id && issue?.action) action = `协调「${issue.title}」：${issue.action}`;
    const selfOwnedWorkIsSeparate = children.length > 0 && issues.some((item) => nearestOwnedId(item.taskId) !== task.id) && (!issue || issue.weight >= 5);
    if (selfOwnedWorkIsSeparate) action = "核对整体交付边界与整合结果；本人子任务在其行动中单独处理。";
    // Owner 用稳定 ID 筛选，但个人行动不把该 ID 当作显示姓名输出。
    if (task.ownerId && action.startsWith(`建议${task.ownerId}`)) action = `建议你${action.slice(task.ownerId.length + 2)}`;
    else if (task.ownerId && action.startsWith(task.ownerId)) action = `你${action.slice(task.ownerId.length)}`;
    const dateReason = due.state === "overdue" ? `截止为${due.label}，截至当前仍未结束。`
      : due.state === "today" ? `截止为${due.label}，属于本日需要核对的承诺。` : "";
    const reason = issue?.text ?? (selfOwnedWorkIsSeparate ? "你负责父级结果统筹；本人子任务的执行动作已单列，不重复安排。" : task.status === "待审核" ? "当前待审核，需要核对结果依据。" : children.length ? "你承担父任务的协调责任，不承担全部子任务的执行投入。" : "按当前任务记录继续推进，未推算个人剩余工时。");
    const order = due.state === "overdue" ? 0 : due.state === "today" ? 1 : issue && issue.weight < 5 ? 2 : task.status === "待审核" ? 3 : due.state === "upcoming" ? 4 : 5;
    actions.push({
      ...projection, id: `${task.id}:action`, action, urgencyReason: dateReason || undefined, reason, focus: issue?.kind,
      relatedStatus: issue?.relatedStatus,
      evidence: issue?.evidence ?? evidenceFor(task.id, next?.reference) ?? taskEvidence(task),
      order, dateKey: due.day ?? "9999-12-31", dueTimestamp: due.timestamp, position,
    });
  });
  const attention = [...allIssues.values()].filter((issue) => !usedInAction.has(issue.id)).map(({ action: _action, weight: _weight, ...issue }) => issue);
  const sortedActions = actions.sort((left, right) => left.order - right.order || left.dateKey.localeCompare(right.dateKey) || left.position - right.position);
  // 同档同日只重排有明确时刻的槽位；日期型任务保留位置，不被推断为午夜或最晚截止。
  for (let start = 0; start < sortedActions.length;) {
    let end = start + 1;
    while (end < sortedActions.length && sortedActions[end].order === sortedActions[start].order && sortedActions[end].dateKey === sortedActions[start].dateKey) end += 1;
    const timed = sortedActions.slice(start, end).filter((action) => action.dueTimestamp !== undefined).sort((left, right) => left.dueTimestamp! - right.dueTimestamp! || left.position - right.position);
    let timedIndex = 0;
    for (let index = start; index < end; index += 1) if (sortedActions[index].dueTimestamp !== undefined) sortedActions[index] = timed[timedIndex++];
    start = end;
  }
  const orderedActions = sortedActions
    .map(({ order: _order, dateKey: _dateKey, dueTimestamp: _dueTimestamp, position: _position, ...action }) => action);
  const awaitingAcceptance: PersonalWorkbenchInvitation[] = input.currentUserId.trim()
    ? tasks.filter((task) => isActive(task) && task.ownerId !== input.currentUserId && task.proposedOwnerId === input.currentUserId).map((task) => ({
      taskId: task.id, title: task.name, text: "你被提议为负责人，正式责任尚未变更。", source: sourceFor(task), evidence: taskEvidence(task),
    })) : [];
  const counts = {
    owned: owned.length, active: orderedActions.length,
    coordinating: orderedActions.filter((action) => action.role === "coordination").length,
    executing: orderedActions.filter((action) => action.role === "execution").length,
    completed: owned.filter((task) => task.status === "已完成").length,
    cancelled: owned.filter((task) => task.status === "已取消").length,
    awaitingAcceptance: awaitingAcceptance.length,
    attention: attention.length,
  };
  return {
    asOf: input.asOf,
    summary: counts.active ? `你负责${counts.active}项未结束任务：${counts.executing}项由你推进，${counts.coordinating}项需要统筹协调。`
      : counts.owned ? attention.some((issue) => issue.kind === "status-conflict")
        ? "你负责的任务均标记已结束，但状态与交付边界仍有待核对的问题。"
        : "你负责的任务目前均标记已结束，可回看结果与近期变化。"
        : "当前可见任务中，尚无你正式负责的任务。",
    notice: `${clock.day ? "按逾期、今日截止、依赖与待核对情况组织行动，顺序是建议。" : "分析日期不可用，仅显示当前任务与依赖事实。"}原始记录日期保持固定，分析时点以当前数据快照为准；未接入实时 AI 或个人日历，不推算负荷。`,
    counts, actions: orderedActions, attention, taskSnapshots: tasks.map((task) => contextFor(task).projection), ownedTasks, awaitingAcceptance,
    recentChanges: collectChanges(input, owned, byId, clock),
  };
}

export type PersonalWorkbenchItem = Omit<PersonalWorkbenchAction, "status" | "freshness" | "dueLabel"> & {
  status?: PersonalWorkbenchTask["status"];
  freshness?: PersonalWorkbenchTask["freshness"];
  dueLabel?: string;
  actionLabel: string;
  isFollowUp: boolean;
  additionalAttention: PersonalWorkbenchAttention[];
};
export type PersonalWorkbenchItems = {
  items: PersonalWorkbenchItem[];
};

export type PersonalWorkbenchPriority = {
  item: Pick<PersonalWorkbenchItem, "taskId" | "title" | "iconName" | "iconTone" | "summary" | "effort"> & {
    priorityReason: string;
  };
  rank: number;
};

/**
 * Agent 在内部综合当前可见的时间、阻塞、依赖、交付核对与信息新鲜度信号。
 * 分值只用于排序；交给界面的只有详情同源的当前状态总结、优先原因和安全的预计投入结论。
 */
function agentPriorityScore(item: PersonalWorkbenchItem): number {
  const dueScore: Record<PersonalWorkbenchDueState, number> = {
    overdue: 400, today: 300, upcoming: 20, unknown: 35, none: 0,
  };
  const focusScore: Record<NonNullable<PersonalWorkbenchItem["focus"]>, number> = {
    blocked: 110, "status-conflict": 100, dependency: 80, evidence: 60, unknown: 50,
  };
  let score = dueScore[item.dueState];
  if (item.focus) score += focusScore[item.focus];
  if (item.relatedStatus === "已阻塞") score += 20;
  if (item.status === "待审核" && item.focus !== "evidence") score += 40;
  if (item.freshness === "stale") score += 25;
  if (item.freshness === "missing" && item.focus !== "unknown") score += 10;
  return score;
}

function priorityReasonFor(item: PersonalWorkbenchItem): string {
  const context = item.priorityContext;
  const date = item.dueLabel ? `（${item.dueLabel}）` : "";
  const timePressure = item.dueState === "overdue" ? `已超过承诺时间${date}`
    : item.dueState === "today" ? `今天到期${date}`
      : item.dueState === "upcoming" && item.dueLabel ? `计划于 ${item.dueLabel}截止` : "";
  const dependencies = [
    context?.pendingDependencyCount ? `${context.pendingDependencyCount} 项前置交付尚未完成` : "",
    context?.missingDependencyCount ? `${context.missingDependencyCount} 项前置资料不可用，交付条件待核对` : "",
  ].filter(Boolean).join("；");
  const risk = item.focus === "status-conflict" ? "任务状态与依赖或下级交付记录不一致，需核对完成边界"
    : dependencies || (item.focus === "blocked" ? "当前标记已阻塞，需明确解除条件与所需支持"
      : item.focus === "dependency" ? "下级任务的前置交付尚未完成，需先核对依赖条件"
        : item.focus === "evidence" || item.status === "待审核" ? "交付结果待核对，需确认是否满足完成标准"
          : item.focus === "unknown" ? "当前记录有信息缺口，需先补齐判断依据" : "");
  const sentences = [timePressure, risk].filter(Boolean).join("，");
  const parts = sentences ? [`${sentences}。`] : [];
  if (context?.childCount) {
    parts.push(`${context.childCount} 项直属子任务中，${context.completedChildCount} 项标记已完成、${context.remainingChildCount} 项待收口${context.cancelledChildCount ? `、${context.cancelledChildCount} 项已取消` : ""}，需要你核对整体交付。`);
  }
  if (context?.completionCriterion) {
    const text = context.completionCriterion.replace(/[。！？；.!?;]+$/u, "");
    const characters = Array.from(text);
    const criterion = characters.length > 64 ? `${characters.slice(0, 64).join("")}…` : text;
    parts.push(`本次需核对「${criterion}」。`);
  } else if (context) {
    parts.push("尚未设置完成标准，先明确交付结果与核对条件。");
  } else if (!parts.length) {
    parts.push(item.role === "coordination" ? "你负责整合下级交付，需核对整体结果。" : "当前缺少具体交付记录，先确认需要完成的结果。");
  }
  return parts.join("");
}

export function buildPersonalWorkbenchPriorities(items: PersonalWorkbenchItem[]) {
  return items
    .map((item, position) => ({ item, position, score: agentPriorityScore(item) }))
    .sort((left, right) => right.score - left.score || left.position - right.position)
    .map(({ item }, index): PersonalWorkbenchPriority => ({
      item: {
        taskId: item.taskId,
        title: item.title,
        iconName: item.iconName,
        iconTone: item.iconTone,
        summary: item.summary,
        priorityReason: priorityReasonFor(item),
        effort: { ...item.effort },
      },
      rank: index + 1,
    }));
}

function workbenchActionLabel(item: Pick<PersonalWorkbenchItem, "focus" | "status" | "role" | "isFollowUp">): string {
  if (item.focus === "blocked") return item.isFollowUp ? "核对阻塞记录" : "协调解除阻塞";
  if (item.focus === "dependency") return "核对前置交付";
  if (item.focus === "evidence") return "核对完成依据";
  if (item.focus === "status-conflict") return "核对完成边界";
  if (item.focus === "unknown") return "核对任务信息";
  if (item.status === "待审核") return "核对交付结果";
  return item.role === "coordination" ? "协调子任务交付" : "推进当前任务";
}

const followUpActions: Record<PersonalWorkbenchAttention["kind"], string> = {
  blocked: "核对当前阻塞记录，协调所需交付或决定。",
  dependency: "核对前置产出与交付条件，确认需要跟进的范围。",
  evidence: "对照完成标准核对现有交付与依据，确认仍需补充的信息。",
  "status-conflict": "核对任务状态与完成边界，确认现有记录是否一致。",
  unknown: "核对当前记录中的信息缺口，确认判断下一步所需的依据。",
};
const attentionOrder: Record<PersonalWorkbenchAttention["kind"], number> = {
  "status-conflict": 0, blocked: 1, dependency: 2, evidence: 3, unknown: 4,
};

/**
 * 仅把既有个人分析投影为一项 Task 一行的处理入口，不重新分析、指派或改变完成状态。
 * 主行动顺序沿用 model；剩余关注并入同 Task，未在行动里的 Task 只生成核对记录的跟进项。
 */
export function buildPersonalWorkbenchItems(model: PersonalWorkbenchModel): PersonalWorkbenchItems {
  const itemsByTask = new Map<string, PersonalWorkbenchItem>();
  const snapshotByTask = new Map(model.taskSnapshots.map((item) => [item.taskId, item]));
  for (const action of model.actions) {
    if (itemsByTask.has(action.taskId)) continue;
    const item: PersonalWorkbenchItem = {
      ...action,
      id: `personal-work:${action.taskId}`,
      evidence: action.evidence ? { ...action.evidence } : undefined,
      actionLabel: "",
      isFollowUp: false,
      additionalAttention: [],
    };
    item.actionLabel = workbenchActionLabel(item);
    itemsByTask.set(item.taskId, item);
  }

  const attentionByTask = new Map<string, PersonalWorkbenchAttention[]>();
  const seenAttention = new Set<string>();
  for (const attention of model.attention) {
    const key = `${attention.taskId}\u0000${attention.id}`;
    if (seenAttention.has(key)) continue;
    seenAttention.add(key);
    const copy = { ...attention, evidence: attention.evidence ? { ...attention.evidence } : undefined };
    attentionByTask.set(attention.taskId, [...(attentionByTask.get(attention.taskId) ?? []), copy]);
  }
  for (const [taskId, attention] of attentionByTask) {
    const existing = itemsByTask.get(taskId);
    if (existing) {
      existing.additionalAttention = attention;
      continue;
    }
    // 跟进项以最需核对的冲突为主，其余原文和来源完整保留；不借此恢复已结束任务。
    const ordered = [...attention].sort((left, right) => attentionOrder[left.kind] - attentionOrder[right.kind]);
    const [primary, ...additionalAttention] = ordered;
    const snapshot = snapshotByTask.get(taskId);
    const item: PersonalWorkbenchItem = {
      id: `personal-work:${taskId}`,
      taskId, title: primary.title,
      iconName: snapshot?.iconName,
      iconTone: snapshot?.iconTone,
      role: snapshot?.role ?? "coordination",
      status: snapshot?.status,
      summary: snapshot?.summary ?? primary.text,
      effort: snapshot?.effort ?? { value: "待估算" },
      priorityContext: snapshot?.priorityContext,
      action: followUpActions[primary.kind],
      actionLabel: "",
      reason: primary.text,
      evidence: primary.evidence,
      source: primary.source,
      freshness: snapshot?.freshness,
      // 已结束任务的跟进项是在核对记录，不沿用原任务期限制造新的逾期语义。
      dueLabel: undefined,
      dueState: snapshot ? "none" : "unknown",
      focus: primary.kind,
      relatedStatus: primary.relatedStatus,
      isFollowUp: true,
      additionalAttention,
    };
    item.actionLabel = workbenchActionLabel(item);
    itemsByTask.set(taskId, item);
  }
  return { items: [...itemsByTask.values()] };
}
