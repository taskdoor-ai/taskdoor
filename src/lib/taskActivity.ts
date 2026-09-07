import type { TaskActivityChange, TaskActivityMock, TaskActivityType, TaskCommitMock } from "../data/taskDetailMocks.ts";

export type TaskActivityStore = Record<string, TaskActivityMock[]>;
export type TaskDiscussionThread = { activity: TaskActivityMock; replies: TaskActivityMock[]; context?: TaskActivityMock };
export type TaskChangeItem =
  | { id: string; kind: "activity"; activity: TaskActivityMock }
  | { id: string; kind: "commit"; commit: TaskCommitMock };
export type TaskActivityItem = TaskChangeItem;
export type TaskActivityCategory = "task" | "discussion" | "file";
export type TaskDetailTab = "discussion" | "subtasks" | "files" | "activity";

const activityTypes = new Set<TaskActivityType>([
  "member-post", "member-reply", "ai-insight", "status-change", "schedule-change", "participant-added",
  "title-change", "goal-change", "owner-change", "owner-proposal", "participants-change", "tags-change", "appearance-change", "task-definition-change",
]);
const insightTypes = new Set(["协作重点", "状态一致性", "证据缺口", "验收风险"]);
const relativeTimeUnits: Record<string, number> = { 秒: 1_000, 分钟: 60_000, 小时: 3_600_000, 天: 86_400_000, 周: 604_800_000 };
type SortTime = { recorded: boolean; timestamp: number | null };

function isDiscussionType(type: TaskActivityType): boolean {
  return type === "member-post" || type === "member-reply";
}

export function isDiscussionActivity(activity: TaskActivityMock): boolean {
  return isDiscussionType(activity.type);
}

// Legacy labels only order their own history cohort, never compete with recorded event times.
function legacySortTimestamp(time: string, now: Date): number | null {
  const label = time.trim();
  if (label === "刚刚") return now.getTime();
  const relative = label.match(/^(\d+(?:\.\d+)?)\s*(秒|分钟|小时|天|周)前$/);
  if (relative) return now.getTime() - Number(relative[1]) * relativeTimeUnits[relative[2]];

  const dayTime = label.match(/^(今天|昨天|前天)(?:\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dayTime) {
    const hours = Number(dayTime[2] ?? 0);
    const minutes = Number(dayTime[3] ?? 0);
    const seconds = Number(dayTime[4] ?? 0);
    if (hours > 23 || minutes > 59 || seconds > 59) return null;
    const date = new Date(now);
    date.setDate(date.getDate() - (dayTime[1] === "昨天" ? 1 : dayTime[1] === "前天" ? 2 : 0));
    date.setHours(hours, minutes, seconds, 0);
    return date.getTime();
  }

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[ T].*)?$/.test(label)) {
    const timestamp = Date.parse(label);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return null;
}

function sortTime(record: { createdAt?: string; time: string }, now: Date): SortTime {
  const timestamp = Date.parse(record.createdAt ?? "");
  return Number.isFinite(timestamp)
    ? { recorded: true, timestamp }
    : { recorded: false, timestamp: legacySortTimestamp(record.time, now) };
}

function compareTimes(left: number | null, right: number | null, newestFirst = true): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return newestFirst ? right - left : left - right;
}

function compareSortTimes(left: SortTime, right: SortTime, newestFirst = true): number {
  if (left.recorded !== right.recorded) {
    // Reverse both cohorts for replies, whose reading order remains historical-to-recent.
    return newestFirst ? Number(right.recorded) - Number(left.recorded) : Number(left.recorded) - Number(right.recorded);
  }
  return compareTimes(left.timestamp, right.timestamp, newestFirst);
}

function sortRecords<T extends { createdAt?: string; time: string }>(records: T[], now: Date, newestFirst = true): T[] {
  return records
    .map((record, index) => ({ record, index, time: sortTime(record, now) }))
    .sort((left, right) => compareSortTimes(left.time, right.time, newestFirst) || left.index - right.index)
    .map(({ record }) => record);
}

export function getTaskInsightSource(activities: TaskActivityMock[], targetId: string): TaskActivityMock | null {
  const insights = activities.filter((activity) => activity.type === "ai-insight");
  if (targetId !== "latest") return insights.find((activity) => activity.id === targetId) ?? null;
  return sortRecords(insights, new Date())[0] ?? null;
}

export function getTaskDiscussionThreads(activities: TaskActivityMock[]): TaskDiscussionThread[] {
  type Root = { index: number; context?: TaskActivityMock };
  const byId = new Map<string, number>();
  activities.forEach((record, index) => {
    if (!byId.has(record.id)) byId.set(record.id, index);
  });
  const roots = new Map<number, Root>();

  const findRoot = (startIndex: number): Root => {
    const path: number[] = [];
    const positions = new Map<number, number>();
    let index = startIndex;
    let root: Root;
    while (true) {
      const cached = roots.get(index);
      if (cached) {
        root = cached;
        break;
      }
      const cycleStart = positions.get(index);
      if (cycleStart !== undefined) {
        // A broken reply cycle gets one deterministic human root; nothing is discarded.
        root = { index: path.slice(cycleStart).reduce((earliest, item) => Math.min(earliest, item)) };
        break;
      }
      positions.set(index, path.length);
      path.push(index);
      const record = activities[index];
      const parentIndex = record.replyToActivityId ? byId.get(record.replyToActivityId) : undefined;
      if (parentIndex === undefined) {
        root = { index };
        break;
      }
      const parent = activities[parentIndex];
      if (!isDiscussionActivity(parent)) {
        root = { index, context: parent };
        break;
      }
      index = parentIndex;
    }
    for (const pathIndex of path) roots.set(pathIndex, root);
    return root;
  };

  const threads = new Map<number, TaskDiscussionThread>();
  activities.forEach((record, index) => {
    if (!isDiscussionActivity(record)) return;
    const root = findRoot(index);
    let thread = threads.get(root.index);
    if (!thread) {
      thread = { activity: activities[root.index], replies: [], ...(root.context ? { context: root.context } : {}) };
      threads.set(root.index, thread);
    }
    if (index !== root.index) thread.replies.push(record);
  });

  const now = new Date();
  return [...threads.entries()]
    .map(([index, thread]) => ({
      index,
      thread: { ...thread, replies: sortRecords(thread.replies, now, false) },
      time: [thread.activity, ...thread.replies].reduce<SortTime>((latest, record) => {
        const time = sortTime(record, now);
        return compareSortTimes(time, latest) < 0 ? time : latest;
      }, { recorded: false, timestamp: null }),
    }))
    .sort((left, right) => compareSortTimes(left.time, right.time) || left.index - right.index)
    .map(({ thread }) => thread);
}

export function getTaskChangeItems(activities: TaskActivityMock[], commits: TaskCommitMock[], now = new Date()): TaskChangeItem[] {
  const items: TaskChangeItem[] = [
    ...activities
      .filter((activity) => !isDiscussionActivity(activity) && activity.type !== "ai-insight")
      .map((activity): TaskChangeItem => ({ id: `activity:${activity.id}`, kind: "activity", activity })),
    ...commits.map((commit): TaskChangeItem => ({ id: `commit:${commit.id}`, kind: "commit", commit })),
  ];
  return items
    .map((item, index) => ({ item, index, time: sortTime(item.kind === "activity" ? item.activity : item.commit, now) }))
    .sort((left, right) => compareSortTimes(left.time, right.time) || left.index - right.index)
    .map(({ item }) => item);
}

export function getTaskActivityCategory(item: TaskActivityItem): TaskActivityCategory {
  if (item.kind === "commit") return "file";
  return isDiscussionActivity(item.activity) ? "discussion" : "task";
}

export function getTaskActivityItems(activities: TaskActivityMock[], commits: TaskCommitMock[], now = new Date()): TaskActivityItem[] {
  const items: TaskActivityItem[] = [
    ...activities
      .filter((activity) => activity.type !== "ai-insight")
      .map((activity): TaskActivityItem => ({ id: `activity:${activity.id}`, kind: "activity", activity })),
    ...commits.map((commit): TaskActivityItem => ({ id: `commit:${commit.id}`, kind: "commit", commit })),
  ];
  return items
    .map((item, index) => ({ item, index, time: sortTime(item.kind === "activity" ? item.activity : item.commit, now) }))
    .sort((left, right) => compareSortTimes(left.time, right.time) || left.index - right.index)
    .map(({ item }) => item);
}

export function createTaskChangeActivity(
  input: { author: string; type: TaskActivityType; message: string; changes: TaskActivityChange[] },
  options: { id?: string; now?: Date } = {},
): TaskActivityMock | null {
  if (isDiscussionType(input.type) || input.type === "ai-insight") return null;
  const changes = input.changes.filter((change) => change.before !== change.after).map((change) => ({ ...change }));
  if (changes.length === 0) return null;
  const now = options.now ?? new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    id: options.id ?? globalThis.crypto.randomUUID(),
    author: input.author,
    type: input.type,
    message: input.message,
    changes,
    createdAt: now.toISOString(),
    time: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  };
}

export function appendTaskActivity(store: TaskActivityStore, taskId: string, activity: TaskActivityMock): TaskActivityStore {
  const existing = Object.hasOwn(store, taskId) ? store[taskId] : [];
  if (existing.some((record) => record.id === activity.id)) return store;
  return { ...store, [taskId]: [activity, ...existing] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseActivity(value: unknown): TaskActivityMock | null {
  if (!isRecord(value)
    || typeof value.id !== "string" || !value.id.trim()
    || typeof value.author !== "string"
    || typeof value.message !== "string"
    || typeof value.time !== "string"
    || typeof value.type !== "string" || !activityTypes.has(value.type as TaskActivityType)) return null;

  if (value.file !== undefined && typeof value.file !== "string") return null;
  if (value.replyToActivityId !== undefined && typeof value.replyToActivityId !== "string") return null;
  if (value.createdAt !== undefined && (typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt)))) return null;
  if (value.insightType !== undefined && (typeof value.insightType !== "string" || !insightTypes.has(value.insightType))) return null;

  let changes: TaskActivityChange[] | undefined;
  if (value.changes !== undefined) {
    if (!Array.isArray(value.changes)) return null;
    changes = [];
    for (const change of value.changes) {
      if (!isRecord(change) || typeof change.label !== "string"
        || (change.before !== null && typeof change.before !== "string")
        || (change.after !== null && typeof change.after !== "string")) return null;
      changes.push({ label: change.label, before: change.before, after: change.after });
    }
  }

  return {
    id: value.id,
    author: value.author,
    message: value.message,
    time: value.time,
    type: value.type as TaskActivityType,
    ...(value.file !== undefined ? { file: value.file as string } : {}),
    ...(value.replyToActivityId !== undefined ? { replyToActivityId: value.replyToActivityId as string } : {}),
    ...(value.createdAt !== undefined ? { createdAt: value.createdAt as string } : {}),
    ...(value.insightType !== undefined ? { insightType: value.insightType as TaskActivityMock["insightType"] } : {}),
    ...(changes ? { changes } : {}),
  };
}

export function parseTaskActivityStore(value: unknown): TaskActivityStore {
  let source = value;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source) as unknown;
    } catch {
      return {};
    }
  }
  if (!isRecord(source)) return {};
  const tasks: Array<[string, TaskActivityMock[]]> = [];
  for (const [taskId, records] of Object.entries(source)) {
    if (!taskId.trim() || !Array.isArray(records)) continue;
    const activities: TaskActivityMock[] = [];
    const ids = new Set<string>();
    for (const record of records) {
      const activity = parseActivity(record);
      if (!activity || ids.has(activity.id)) continue;
      ids.add(activity.id);
      activities.push(activity);
    }
    tasks.push([taskId, activities]);
  }
  // Object.fromEntries keeps even "__proto__" as ordinary own data, not a prototype setter.
  return Object.fromEntries(tasks);
}

export function getTaskDetailTabForTarget(
  activities: TaskActivityMock[],
  target?: { kind: "activity" | "commit" | "file" | "insight" | "criteria" | "subtasks" | "details" | "discussion"; targetId: string } | null,
): TaskDetailTab {
  if (target?.kind === "subtasks") return "subtasks";
  if (target?.kind === "file") return "files";
  if (target?.kind === "commit") return "activity";
  if (target?.kind === "activity") {
    const activity = activities.find((record) => record.id === target.targetId);
    if (activity && !isDiscussionActivity(activity) && activity.type !== "ai-insight") return "activity";
  }
  return "discussion";
}
