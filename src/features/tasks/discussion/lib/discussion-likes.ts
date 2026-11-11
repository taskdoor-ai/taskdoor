/** One kind of like per message. Counts and "I liked it" are visible to everyone; the likers only to the author. */
export type DiscussionLike = { personId: string; at: string };
export type DiscussionLikes = Readonly<Record<string, readonly DiscussionLike[]>>;

export const discussionLikesStorageKey = (teamId: string, taskId: string) =>
  `agentdoor-discussion-likes:${encodeURIComponent(teamId)}:${encodeURIComponent(taskId)}`;

export function parseDiscussionLikes(raw: string | null): DiscussionLikes | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const likes: Record<string, DiscussionLike[]> = {};
    for (const [messageId, entries] of Object.entries(value)) {
      if (!Array.isArray(entries)) continue;
      const seen = new Set<string>();
      likes[messageId] = entries.filter((entry): entry is DiscussionLike => {
        if (!entry || typeof entry !== "object") return false;
        const { personId, at } = entry as Record<string, unknown>;
        if (typeof personId !== "string" || !personId || seen.has(personId) || typeof at !== "string" || !Number.isFinite(Date.parse(at))) return false;
        seen.add(personId);
        return true;
      });
    }
    return likes;
  } catch {
    return null;
  }
}

export function toggleDiscussionLike(likes: DiscussionLikes, messageId: string, personId: string, at: string): DiscussionLikes {
  const current = likes[messageId] ?? [];
  const next = current.some(like => like.personId === personId)
    ? current.filter(like => like.personId !== personId)
    : [...current, { personId, at }];
  return { ...likes, [messageId]: next };
}

export type LikeNotification = { id: string; messageId: string; likerIds: string[]; createdAt: string };

export const LIKE_NOTIFICATION_DELAY_MS = 3000;
export type LikeNotificationPreview = {
  notifications: LikeNotification[];
  /** The local like timestamp last delivered for each message/person pair. */
  delivered: Record<string, string>;
  nextAt: number | null;
};

/** Local Demo projection: always inspect current likes, never replay queued toggle actions. */
export function advanceLikeNotifications(
  previous: LikeNotificationPreview, likes: DiscussionLikes, now: number,
  isRead: (notificationId: string) => boolean,
): LikeNotificationPreview {
  const current = new Map(Object.entries(likes).flatMap(([messageId, entries]) => entries.map(like =>
    [JSON.stringify([messageId, like.personId]), { messageId, likerId: like.personId, at: like.at }] as const)));
  const delivered = { ...previous.delivered };
  let notifications = previous.notifications;
  for (const [key, at] of Object.entries(delivered)) {
    if (current.get(key)?.at === at) continue;
    const [messageId, likerId] = JSON.parse(key) as [string, string];
    notifications = applyLikeToNotifications(notifications, { messageId, likerId, at, liked: false }, isRead);
    delete delivered[key];
  }
  let nextAt: number | null = null;
  const events = [...current.entries()].sort((left, right) => Date.parse(left[1].at) - Date.parse(right[1].at));
  for (const [key, event] of events) {
    if (delivered[key] === event.at) continue;
    const dueAt = Date.parse(event.at) + LIKE_NOTIFICATION_DELAY_MS;
    if (!Number.isFinite(dueAt)) continue;
    if (dueAt > now) { nextAt = Math.min(nextAt ?? dueAt, dueAt); continue; }
    notifications = applyLikeToNotifications(notifications, { ...event, at: new Date(dueAt).toISOString(), liked: true }, isRead);
    delivered[key] = event.at;
  }
  return { notifications, delivered, nextAt };
}

/**
 * The author's like notification for one comment. While it is unread, further likes merge into it
 * and move it to the latest like's time; once it has been read, the next like starts a new one.
 * Taking a like back removes that person from the unread notification, and drops it when nobody is left.
 */
export function applyLikeToNotifications(
  notifications: readonly LikeNotification[],
  event: { messageId: string; likerId: string; at: string; liked: boolean },
  isRead: (notificationId: string) => boolean,
): LikeNotification[] {
  const open = [...notifications].reverse().find(item => item.messageId === event.messageId && !isRead(item.id));
  if (!event.liked) {
    if (!open) return [...notifications];
    const likerIds = open.likerIds.filter(id => id !== event.likerId);
    return likerIds.length
      ? notifications.map(item => item === open ? { ...item, likerIds } : item)
      : notifications.filter(item => item !== open);
  }
  if (open) {
    return notifications.map(item => item === open
      ? { ...item, likerIds: [event.likerId, ...item.likerIds.filter(id => id !== event.likerId)], createdAt: event.at }
      : item);
  }
  return [...notifications, { id: `like:${event.messageId}:${event.at}`, messageId: event.messageId, likerIds: [event.likerId], createdAt: event.at }];
}
