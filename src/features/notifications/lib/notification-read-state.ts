export type NotificationRegionTarget = {
  area: "discussion" | "files" | "activity" | "information";
  activityId?: string;
  fileId?: string;
};

export type DiscussionReadReceipt = {
  teamId: string;
  userId: string;
  taskId: string;
  readThrough: string;
  activityIds: readonly string[];
  sequence: number;
};

export type NotificationReadState = { version: 1; readIds: string[] };

type ReadableNotification = {
  id: string;
  createdAt: string;
  read: boolean;
  task?: { id: string };
  target?: NotificationRegionTarget;
};

export function notificationReadStateKey(teamId: string, userId: string): string {
  return `agentdoor:notification-read-state:v1:${encodeURIComponent(teamId)}:${encodeURIComponent(userId)}`;
}

export function parseNotificationReadState(raw: string | null): NotificationReadState {
  if (raw === null) return { version: 1, readIds: [] };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid notification read state");
  const state = value as Record<string, unknown>;
  if (state.version !== 1 || !Array.isArray(state.readIds) || !state.readIds.every(id => typeof id === "string" && id.trim().length > 0)) {
    throw new Error("Invalid notification read state");
  }
  return { version: 1, readIds: [...new Set(state.readIds as string[])] };
}

export function mergeNotificationReadIds(state: NotificationReadState, ids: readonly string[]): NotificationReadState {
  return { version: 1, readIds: [...new Set([...state.readIds, ...ids])] };
}

function readTimestamp(value: string): number | undefined {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts) return undefined;
  const [, rawYear, rawMonth, rawDay, rawHour, rawMinute, rawSecond] = parts;
  const [year, month, day, hour, minute, second] = [rawYear, rawMonth, rawDay, rawHour, rawMinute, rawSecond].map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1] || hour > 23 || minute > 59 || second > 59) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function getDiscussionReadIds(
  items: readonly ReadableNotification[],
  receipt: DiscussionReadReceipt,
  scope: { teamId: string; userId: string },
): string[] {
  if (!scope.teamId.trim() || !scope.userId.trim() || !receipt.taskId.trim() || receipt.teamId !== scope.teamId || receipt.userId !== scope.userId) return [];
  const readThrough = readTimestamp(receipt.readThrough);
  if (readThrough === undefined) return [];
  const displayedActivities = new Set(receipt.activityIds);
  const readIds = new Set<string>();
  for (const item of items) {
    if (item.read || item.task?.id !== receipt.taskId || item.target?.area !== "discussion") continue;
    const createdAt = readTimestamp(item.createdAt);
    if (createdAt === undefined || createdAt > readThrough) continue;
    const activityId = item.target.activityId;
    if (activityId !== undefined && (!activityId || !displayedActivities.has(activityId))) continue;
    readIds.add(item.id);
  }
  return [...readIds];
}
