import type { TaskRelationSummary } from "../components/TaskRelationsSection";
import type { TaskActivityMock, TaskDetailMock } from "../data/taskDetailMocks";

export type TaskSituationReference = {
  kind: "task" | "file" | "activity" | "subtasks" | "criteria" | "details" | "discussion";
  id?: string;
  label: string;
};
export type TaskSituationItem = { text: string; reference?: TaskSituationReference };
export type TaskSituationGroup = {
  id: "delivery" | "attention" | "next";
  label: string;
  items: TaskSituationItem[];
};
export type TaskSituationModel = {
  source: "example" | "recorded";
  freshness: "current" | "stale" | "missing";
  asOf?: string;
  asOfSource?: "discussion";
  summary: string;
  notice?: string;
  groups: TaskSituationGroup[];
};
export type TaskSituationInput = {
  taskId: string;
  task: TaskDetailMock;
  /** 仅用于文案；任务责任与关系仍以 task.owner 的稳定 ID 为准。 */
  ownerName?: string;
  childTasks: TaskRelationSummary[];
  dependencyTasks?: TaskRelationSummary[];
  /** 缺失的依赖仍保留 ID；显式空数组表示依赖已经移除。 */
  dependencyTaskIds?: string[];
  /** 调用方明确提供的本任务已保存活动；不从 task.activities 的混合历史推测来源。 */
  recordedActivities?: TaskActivityMock[];
};

export type DefaultTaskSituationSummaryInput = {
  status: TaskDetailMock["status"];
  completedChildCount: number;
  remainingChildCount: number;
  cancelledChildCount: number;
  latestDiscussionAuthor?: string;
};

const criteriaReference = (): TaskSituationReference => ({ kind: "criteria", label: "核对完成标准" });
const subtaskReference = (): TaskSituationReference => ({ kind: "subtasks", label: "查看子任务" });
const taskReference = (task: TaskRelationSummary): TaskSituationReference => ({ kind: "task", id: task.id, label: "查看任务" });
const detailsReference = (): TaskSituationReference => ({ kind: "details", label: "查看任务信息" });
const discussionReference = (): TaskSituationReference => ({ kind: "discussion", label: "前往讨论" });

/** 只接受带时区的真实日期时间，不把相对标签或溢出日期变成摘要时间。 */
function recordedTime(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const time = Date.parse(value);
  return month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1] && Number.isFinite(time) ? time : undefined;
}

function latestRecordedDiscussion(activities: TaskActivityMock[]): TaskActivityMock | undefined {
  let latest: TaskActivityMock | undefined;
  let latestTime = -Infinity;
  for (const activity of activities) {
    if (activity.type !== "member-post" && activity.type !== "member-reply") continue;
    if (!activity.id.trim() || !activity.author.trim() || !activity.message.trim()) continue;
    const time = recordedTime(activity.createdAt);
    if (time !== undefined && time > latestTime) {
      latest = activity;
      latestTime = time;
    }
  }
  return latest;
}

function discussionItem(activity: TaskActivityMock): TaskSituationItem {
  const characters = Array.from(activity.message);
  const excerpt = characters.length > 120 ? characters.slice(0, 119).join("") + "…" : activity.message;
  return {
    text: activity.author.trim() + "记录：“" + excerpt + "”",
    reference: { kind: "activity", id: activity.id, label: "查看讨论依据" },
  };
}

/** 由来源任务的真实状态生成兜底摘要；终止与阻塞状态不得借用进行中语义。 */
export function defaultTaskSituationSummary(input: DefaultTaskSituationSummaryInput): string {
  const childCount = input.completedChildCount + input.remainingChildCount + input.cancelledChildCount;
  if (childCount) {
    return "任务" + input.status + "；" + input.completedChildCount + "项子任务标记已完成，" + input.remainingChildCount
      + "项待收口" + (input.cancelledChildCount ? "，" + input.cancelledChildCount + "项已取消" : "") + "。";
  }

  const discussionAuthor = input.latestDiscussionAuthor?.trim();
  const discussionLead = discussionAuthor ? "最新讨论由" + discussionAuthor + "补充；" : "";
  if (input.status === "已取消") return "任务已取消，" + discussionLead + "停止范围与需保留结果待核对。";
  if (input.status === "已阻塞") return "任务已阻塞，" + discussionLead + "阻塞原因与解除条件待核对。";
  return "任务" + input.status + "，" + (discussionAuthor ? "最新讨论由" + discussionAuthor + "补充。" : "尚未记录交付进展。");
}

/** 仅按当前字段和明确提供的本地记录投影；不分析发言含义、不验收或改变责任。 */
export function getTaskSituationModel(input: TaskSituationInput): TaskSituationModel {
  const { task, childTasks } = input;
  const owner = input.ownerName?.trim() ?? task.owner.trim();
  const criteria = task.completionCriteria ?? [];
  const dependencyIds = new Set(input.dependencyTaskIds ?? (input.dependencyTasks ?? []).map(dependency => dependency.id));
  const dependencies = (input.dependencyTasks ?? []).filter(dependency => dependencyIds.has(dependency.id));
  const missingDependencyCount = [...dependencyIds].filter(id => !dependencies.some(dependency => dependency.id === id)).length;
  const pendingDependencies = dependencies.filter(dependency => dependency.status !== "已完成");
  const latestDiscussion = latestRecordedDiscussion(input.recordedActivities ?? []);
  const done = childTasks.filter(child => child.status === "已完成");
  const remaining = childTasks.filter(child => child.status !== "已完成" && child.status !== "已取消");
  const cancelled = childTasks.filter(child => child.status === "已取消");
  const blocked = remaining.filter(child => child.status === "已阻塞");
  const inconsistent = done.filter(child => child.dependsOnTaskIds?.some(id => childTasks.some(dependency => dependency.id === id && dependency.status !== "已完成")));
  const attention: TaskSituationItem[] = [];

  if (!owner) attention.push({ text: "负责人尚未明确。", reference: detailsReference() });
  if (missingDependencyCount) attention.push({ text: missingDependencyCount + "项前置任务资料未提供，依赖是否满足待核对。", reference: detailsReference() });
  for (const dependency of pendingDependencies) {
    attention.push({
      text: (task.status === "已完成" ? "本任务标记已完成，但前置「" : "前置「") + dependency.title + "」仍为" + dependency.status + "。",
      reference: taskReference(dependency),
    });
  }
  for (const child of remaining) {
    if (task.status === "已完成") attention.push({
      text: "父任务标记已完成，但子任务「" + child.title + "」仍为" + child.status + "，尚未收口。",
      reference: taskReference(child),
    });
    if (task.status === "已取消") attention.push({
      text: "任务已取消，但子任务「" + child.title + "」仍为" + child.status + "，停止范围需核对。",
      reference: taskReference(child),
    });
  }
  for (const child of blocked) attention.push({
    text: "「" + child.title + "」标记已阻塞，解除条件待核对。",
    reference: taskReference(child),
  });
  for (const child of inconsistent) attention.push({
    text: "「" + child.title + "」标记已完成，但其前置仍未完成。",
    reference: taskReference(child),
  });
  if (task.status === "已阻塞" && !blocked.length) attention.push({ text: "当前标记已阻塞，具体原因与解除条件待核对。", reference: detailsReference() });
  if (!attention.length) attention.push({
    text: criteria.length ? "交付结果与完成标准尚待核对。" : "尚未设置完成标准。",
    reference: criteriaReference(),
  });

  const delivery: TaskSituationItem[] = done.map(child => ({
    text: "「" + child.title + "」标记已完成。",
    reference: taskReference(child),
  }));
  if (!childTasks.length && task.status === "已完成") delivery.push({
    text: "本任务标记已完成，交付结果仍需核对。",
    reference: criteriaReference(),
  });
  if (!delivery.length) delivery.push({ text: childTasks.length ? "尚无子任务标记已完成。" : "尚未记录已完成内容。" });
  // 成员发言保留原文和入口，不因落入完成分组而被解读为已经核实的成果。
  if (latestDiscussion) attention.push(discussionItem(latestDiscussion));

  const suggest = (action: string) => owner ? "建议" + owner + action : "建议先明确负责人，再" + action.replace(/^先/, "");
  let next: TaskSituationItem = { text: suggest("补充已交付结果和下一项行动。"), reference: discussionReference() };
  if (task.status === "已取消") next = {
    text: suggest("核对停止范围及需保留的结果。"),
    reference: childTasks.length ? subtaskReference() : detailsReference(),
  };
  else if (missingDependencyCount) next = { text: suggest("先补齐前置任务资料，再核对可推进的范围。"), reference: detailsReference() };
  else if (pendingDependencies.length) next = {
    text: suggest("先核对前置「" + pendingDependencies[0].title + "」的产出及依赖关系。"),
    reference: taskReference(pendingDependencies[0]),
  };
  else if (blocked.length) next = {
    text: suggest("先核对「" + blocked[0].title + "」的解除条件。"),
    reference: taskReference(blocked[0]),
  };
  else if (task.status === "已阻塞") next = { text: suggest("明确阻塞原因、解除条件和需要的支持。"), reference: detailsReference() };
  else if (childTasks.length) next = {
    text: suggest(remaining.length ? "核对未收口子任务的结果与下一步。" : "核对整体交付结果与完成标准。"),
    reference: remaining.length ? subtaskReference() : criteriaReference(),
  };
  else if (!criteria.length) next = { text: suggest("先明确可核对的完成标准。"), reference: criteriaReference() };
  else if (task.status === "待审核" || task.status === "已完成") next = { text: suggest("对照完成标准核对结果与来源。"), reference: criteriaReference() };
  else if (latestDiscussion) next = {
    text: suggest("对照最新讨论，明确已交付结果和剩余事项。"),
    reference: { kind: "activity", id: latestDiscussion.id, label: "查看讨论依据" },
  };

  const summary = defaultTaskSituationSummary({
    status: task.status,
    completedChildCount: done.length,
    remainingChildCount: remaining.length,
    cancelledChildCount: cancelled.length,
    latestDiscussionAuthor: latestDiscussion?.author,
  });
  return {
    source: "recorded",
    freshness: missingDependencyCount || (!childTasks.length && !latestDiscussion) ? "missing" : "current",
    ...(latestDiscussion ? { asOf: latestDiscussion.createdAt, asOfSource: "discussion" as const } : {}),
    summary,
    groups: [
      { id: "delivery", label: "已完成内容", items: delivery },
      { id: "attention", label: "需要关注", items: attention },
      { id: "next", label: "下一步", items: [next] },
    ],
  };
}
