import { useStoredValue } from "@/shared/lib/useStoredValue";

/**
 * What a participant hears from a task's discussion. The owner always receives every message;
 * a participant receives only @ and replies unless they choose the whole discussion.
 */
export type DiscussionNotificationPreference = "all" | "mentions";
export const DEFAULT_DISCUSSION_NOTIFICATION_PREFERENCE: DiscussionNotificationPreference = "mentions";

export const discussionNotificationPreferenceKey = (teamId: string, taskId: string, memberId: string) =>
  `agentdoor-discussion-notification:${encodeURIComponent(teamId)}:${encodeURIComponent(taskId)}:${encodeURIComponent(memberId)}`;

export const parseDiscussionNotificationPreference = (raw: string | null): DiscussionNotificationPreference =>
  raw === '"all"' || raw === "all" ? "all" : DEFAULT_DISCUSSION_NOTIFICATION_PREFERENCE;

/** Who receives every new message: the owner, and the participants who chose the whole discussion. */
export function discussionFollowers(ownerId: string, participantIds: readonly string[], preferenceOf: (memberId: string) => DiscussionNotificationPreference) {
  return [...new Set([ownerId, ...participantIds.filter(id => id !== ownerId && preferenceOf(id) === "all")].filter(Boolean))];
}

export function readDiscussionNotificationPreference(storage: Pick<Storage, "getItem">, teamId: string, taskId: string, memberId: string) {
  try { return parseDiscussionNotificationPreference(storage.getItem(discussionNotificationPreferenceKey(teamId, taskId, memberId))); }
  catch { return DEFAULT_DISCUSSION_NOTIFICATION_PREFERENCE; }
}

export function useDiscussionNotificationPreference(teamId: string, taskId: string, memberId: string) {
  return useStoredValue(discussionNotificationPreferenceKey(teamId, taskId, memberId), parseDiscussionNotificationPreference);
}
