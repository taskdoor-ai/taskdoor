import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";

export type DiscussionFeed = {
  messages: CollaborationMessage[];
};

function publicationTime(message: CollaborationMessage): number | null {
  const created = Date.parse(message.createdAt ?? "");
  if (Number.isFinite(created)) return created;
  // Relative or yearless labels are display text, not durable publication facts.
  if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[ T].*)?$/.test(message.time.trim())) return null;
  const timestamp = Date.parse(message.time);
  return Number.isFinite(timestamp) ? timestamp : null;
}

/** Latest published messages first, without changing stored reply relationships. */
export function buildDiscussionFeed(messages: readonly CollaborationMessage[]): DiscussionFeed {
  const records: CollaborationMessage[] = [];
  const seenIds = new Set<string>();
  for (const message of messages) {
    if (message.fileThreadId || (message.type !== "member-post" && message.type !== "member-reply") || seenIds.has(message.id)) continue;
    seenIds.add(message.id);
    if (message.deletedAt) continue;
    records.push(message);
  }
  const ordered = records.map((record, index) => ({ record, index, timestamp: publicationTime(record) }))
    .sort((left, right) => {
      // Undated history stays stable at the end; edits do not change publication order.
      if (left.timestamp === null) return right.timestamp === null ? left.index - right.index : 1;
      if (right.timestamp === null) return -1;
      return right.timestamp - left.timestamp || left.index - right.index;
    });
  return { messages: ordered.map(({ record }) => record) };
}
