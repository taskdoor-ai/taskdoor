import type { AttachmentRef, CollaborationMessage } from "@/features/tasks/lib/task-collaboration";
import type { TaskFileNode } from "@/shared/model/task-model";

export type DiscussionNotificationAttachmentTarget = { messageId: string; fileId: string; version: number };
export type DiscussionNotificationAttachmentSource = { message: CollaborationMessage; ref: AttachmentRef; file: TaskFileNode };

/** Lists must belong to the current readable task; ordinary historical content is resolved by the viewer. */
export function resolveDiscussionNotificationAttachment(
  messages: readonly CollaborationMessage[],
  files: readonly TaskFileNode[],
  target: DiscussionNotificationAttachmentTarget,
): DiscussionNotificationAttachmentSource | undefined {
  if (!target.messageId || !target.fileId || !Number.isInteger(target.version) || target.version < 1) return undefined;
  const message = messages.find(item => item.id === target.messageId);
  if (!message || message.deletedAt || !["member-post", "member-reply"].includes(message.type)) return undefined;
  const ref = message.attachmentRefs?.find(item => item.fileId === target.fileId && item.version === target.version);
  if (!ref) return undefined;
  const file = files.find(item => item.id === ref.fileId && item.kind === "file" && !item.archived);
  if (!file || (file.attachmentOnly && (file.version ?? 1) !== ref.version)) return undefined;
  return { message, ref, file };
}
