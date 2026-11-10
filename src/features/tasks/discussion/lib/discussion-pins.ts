/** A task keeps at most three pinned discussion messages; pinning a fourth replaces the oldest pin. */
export const MAX_PINNED_DISCUSSION_MESSAGES = 3;

export type DiscussionPin = { messageId: string; pinnedAt: string; pinnedBy: string };

export const discussionPinsStorageKey = (teamId: string, taskId: string) =>
  `agentdoor-discussion-pins:${encodeURIComponent(teamId)}:${encodeURIComponent(taskId)}`;

export function parseDiscussionPins(raw: string | null): DiscussionPin[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((pin): pin is DiscussionPin => {
      if (!pin || typeof pin !== "object") return false;
      const { messageId, pinnedAt, pinnedBy } = pin as Record<string, unknown>;
      if (typeof messageId !== "string" || !messageId || seen.has(messageId) || typeof pinnedAt !== "string" || !Number.isFinite(Date.parse(pinnedAt)) || typeof pinnedBy !== "string") return false;
      seen.add(messageId);
      return true;
    }).slice(-MAX_PINNED_DISCUSSION_MESSAGES);
  } catch {
    return [];
  }
}

const byPinnedAt = (left: DiscussionPin, right: DiscussionPin) => Date.parse(left.pinnedAt) - Date.parse(right.pinnedAt);

export function pinDiscussionMessage(pins: readonly DiscussionPin[], messageId: string, pinnedAt: string, pinnedBy: string): DiscussionPin[] {
  if (pins.some(pin => pin.messageId === messageId)) return [...pins];
  const next = [...pins, { messageId, pinnedAt, pinnedBy }].sort(byPinnedAt);
  return next.slice(Math.max(0, next.length - MAX_PINNED_DISCUSSION_MESSAGES));
}

export function unpinDiscussionMessage(pins: readonly DiscussionPin[], messageId: string): DiscussionPin[] {
  return pins.filter(pin => pin.messageId !== messageId);
}

/** Pinned messages move to the top, latest pin first; every other message keeps its place in time order. */
export function splitPinnedMessages<T extends { id: string }>(messages: readonly T[], pins: readonly DiscussionPin[]) {
  const byId = new Map(messages.map(message => [message.id, message]));
  const pinned = [...pins].sort(byPinnedAt).reverse().flatMap(pin => {
    const message = byId.get(pin.messageId);
    return message ? [message] : [];
  });
  const pinnedIds = new Set(pinned.map(message => message.id));
  return { pinned, timeline: messages.filter(message => !pinnedIds.has(message.id)) };
}
