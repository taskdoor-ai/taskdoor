import { normalizeTaskStatus, type WorkspaceTaskStatus } from "@/shared/model/task-model";
import type { TaskNode } from "@/shared/model/task-model";
import { taskCalendarDate } from "@/features/tasks/lib/task-schedule";
import { isValidTimeZone, LEGACY_TEAM_TIME_ZONE } from "@/shared/lib/team-time-zone";
import { formatDisplayDate } from "@/shared/lib/date-time";

export const taskDateFilterLabels = {
  today: "今天", "this-week": "本周", "next-7-days": "未来 7 天", "past-7-days": "最近 7 天",
  overdue: "已逾期", unknown: "日期未知", custom: "自定义日期",
} as const;
export type TaskListDateFilter = { preset: keyof typeof taskDateFilterLabels; from?: string; to?: string };

export const taskScopeLabels = { all: "全部", owned: "我负责的", participating: "我参与的" } as const;
export type TaskListScope = keyof typeof taskScopeLabels;

export type TaskListFilters = {
  scope?: TaskListScope;
  view?: "owned" | "participating" | "all";
  completion?: "open" | "all" | "done";
  sort?: "recent" | "created";
  owner: string;
  status: string;
  tag: string;
  statuses?: string[];
  tags?: string[];
  includeUntagged?: boolean;
  ownerIds?: string[];
  participantIds?: string[];
  ownerIsMe?: boolean;
  participantIsMe?: boolean;
  creatorIds?: string[];
  includeUnassigned?: boolean;
  includeNoParticipants?: boolean;
  includeUnknownCreator?: boolean;
  deadline?: TaskListDateFilter;
  created?: TaskListDateFilter;
};

/** 清除条件并恢复全部任务，保留排序。 */
export const clearedTaskListConditions = {
  scope: "all", view: "all", owner: "all", completion: "all", status: "all", tag: "all", statuses: [], tags: [], includeUntagged: false,
  ownerIds: [], participantIds: [], creatorIds: [], includeUnassigned: false,
  ownerIsMe: false, participantIsMe: false,
  includeNoParticipants: false, includeUnknownCreator: false, deadline: undefined, created: undefined,
} satisfies Partial<TaskListFilters>;

export const createInitialTaskListFilters = (_currentUserId: string): TaskListFilters => ({ scope: "all", view: "all", completion: "all", owner: "all", status: "all", tag: "all" });

function uniqueSelections(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

/** 数组条件覆盖旧单选字段；空数组表示该维度不限。 */
export function getTaskStatusFilters(filters: TaskListFilters): string[] {
  return uniqueSelections((filters.statuses ?? (filters.status === "all" ? [] : [filters.status])).map(status => normalizeTaskStatus(status as WorkspaceTaskStatus)));
}

/** Only unambiguous former “me” selections migrate; removed legacy views stay removed. */
export function getTaskScopeFilter(filters: TaskListFilters): TaskListScope {
  if (filters.scope !== undefined) return Object.hasOwn(taskScopeLabels, filters.scope) ? filters.scope : "all";
  if (filters.ownerIds?.length || filters.participantIds?.length || filters.creatorIds?.length
    || filters.includeUnassigned || filters.includeNoParticipants || filters.includeUnknownCreator) return "all";
  if (Boolean(filters.ownerIsMe) === Boolean(filters.participantIsMe)) return "all";
  return filters.ownerIsMe ? "owned" : "participating";
}

/** 普通任务列表只保留可见筛选；旧范围不再限制结果。 */
export function normalizeTaskWorkspaceFilters(filters: TaskListFilters): TaskListFilters {
  const statuses = filters.statuses !== undefined || filters.status !== "all"
    ? getTaskStatusFilters(filters)
    : filters.completion === "done" ? ["已完成"]
      : filters.completion === "open" ? ["进行中", "已阻塞"]
        : [];
  return { ...filters, scope: getTaskScopeFilter(filters), view: "all", owner: "all", completion: "all", status: "all", statuses,
    ownerIds: [], participantIds: [], creatorIds: [], ownerIsMe: false, participantIsMe: false,
    includeUnassigned: false, includeNoParticipants: false, includeUnknownCreator: false };
}

export function getTaskTagFilters(filters: TaskListFilters): string[] {
  return uniqueSelections(filters.tags ?? (filters.tag === "all" ? [] : [filters.tag]));
}

export function taskDateFilterLabel(filter: TaskListDateFilter): string {
  if (filter.preset !== "custom") return taskDateFilterLabels[filter.preset];
  if (filter.from && filter.to) return `${formatDisplayDate(filter.from, { locale: "zh-CN" }) ?? "—"} 至 ${formatDisplayDate(filter.to, { locale: "zh-CN" }) ?? "—"}`;
  return filter.from ? `${formatDisplayDate(filter.from, { locale: "zh-CN" }) ?? "—"} 起` : `${filter.to ? formatDisplayDate(filter.to, { locale: "zh-CN" }) ?? "—" : "—"} 及以前`;
}

function matchesPeople(values: string[], selections: string[] = [], includeEmpty = false, currentUserSelection?: string): boolean {
  const present = values.filter(value => value.trim());
  return (!selections.length && !includeEmpty && currentUserSelection === undefined)
    || present.some(value => selections.includes(value) || value === currentUserSelection)
    || (includeEmpty && !present.length);
}

function matchesDate(value: string | undefined, filter: TaskListDateFilter | undefined, now: Date, timeZone: string): boolean {
  if (!filter) return true;
  // Keep the list readable when the saved team clock is invalid; the UI reports
  // that these conditions are suspended instead of presenting a false empty result.
  if (!isValidTimeZone(timeZone)) return true;
  const calendarDate = taskCalendarDate(value, timeZone);
  if (filter.preset === "unknown") return calendarDate === null;
  const todayDate = taskCalendarDate(now.toISOString(), timeZone);
  if (calendarDate === null || todayDate === null) return false;
  const day = Date.parse(`${calendarDate}T00:00:00Z`);
  const today = Date.parse(`${todayDate}T00:00:00Z`);
  const delta = (day - today) / 86400000;
  switch (filter.preset) {
    case "today": return delta === 0;
    case "overdue": return delta < 0;
    case "next-7-days": return delta >= 0 && delta < 7;
    case "past-7-days": return delta <= 0 && delta > -7;
    case "this-week": {
      const weekday = (new Date(today).getUTCDay() + 6) % 7;
      return delta >= -weekday && delta < 7 - weekday;
    }
    case "custom": {
      const from = taskCalendarDate(filter.from, timeZone);
      const to = taskCalendarDate(filter.to, timeZone);
      if ((filter.from && from === null) || (filter.to && to === null)) return false;
      return (from === null || calendarDate >= from) && (to === null || calendarDate <= to);
    }
  }
}

export function taskMatchesListFilters(task: TaskNode, query: string, filters: TaskListFilters, currentUserId = filters.owner, now = new Date(), timeZone = LEGACY_TEAM_TIME_ZONE) {
  const statuses = getTaskStatusFilters(filters);
  const tags = getTaskTagFilters(filters);
  const labels = task.labels?.filter((label) => label.trim().length > 0) ?? [];
  const matchesTags = (tags.length === 0 && !filters.includeUntagged)
    || labels.some((label) => tags.includes(label))
    || (Boolean(filters.includeUntagged) && labels.length === 0);
  const hasCurrentUser = Boolean(currentUserId.trim()) && currentUserId !== "all";
  // “我”每次按当前用户解析；未知用户保留条件，但不能匹配任何人员。
  const me = hasCurrentUser ? currentUserId : "";
  // 关系视图替代旧负责人单选；拟负责人、创建人不等于正式负责人或参与人。
  const scope = filters.scope === undefined ? undefined : getTaskScopeFilter(filters);
  const matchesView = scope !== undefined ? (scope === "all" || (hasCurrentUser && (scope === "owned" ? task.ownerId === currentUserId : Boolean(task.participantIds?.includes(currentUserId)))))
    : filters.view === "all" ? true
    : filters.view === "owned" ? hasCurrentUser && task.ownerId === currentUserId
    : filters.view === "participating" ? hasCurrentUser && Boolean(task.participantIds?.includes(currentUserId))
    : filters.owner === "all" || task.ownerId === filters.owner;

  return task.name.toLowerCase().includes(query.trim().toLowerCase())
    && (filters.completion !== "open" || !["已完成", "已取消"].includes(task.status))
    && (filters.completion !== "done" || task.status === "已完成")
    && (statuses.length === 0 || statuses.includes(normalizeTaskStatus(task.status)))
    && matchesView
    && matchesTags
    && (scope !== undefined || (
      matchesPeople([task.ownerId], filters.ownerIds, filters.includeUnassigned, filters.ownerIsMe ? me : undefined)
      && matchesPeople(task.participantIds ?? [], filters.participantIds, filters.includeNoParticipants, filters.participantIsMe ? me : undefined)
      && matchesPeople([task.createdBy ?? ""], filters.creatorIds, filters.includeUnknownCreator)))
    && (filters.deadline?.preset !== "overdue" || !isValidTimeZone(timeZone) || !["已完成", "已取消"].includes(task.status))
    && matchesDate(task.plannedEndOn || task.dueAt, filters.deadline, now, timeZone)
    && matchesDate(task.createdAt, filters.created, now, timeZone);
}
