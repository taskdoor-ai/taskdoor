import type { TaskDetailContent } from "@/shared/model/task-model";
import type { AttachmentRef, CollaborationMessage } from "@/features/tasks/lib/task-collaboration";

/** These notifications point to published fixture messages, rather than invented file events. */
export function withNotificationDiscussionExamples(detail: TaskDetailContent): TaskDetailContent {
  const refs: AttachmentRef[] = ["fragrance-live-rule", "fragrance-live-result"].flatMap(id => {
    const file = detail.files.find(node => node.id === id && node.kind === "file" && !node.archived);
    return file ? [{ fileId: file.id, name: file.name, version: file.version ?? 1 }] : [];
  });
  if (!refs.length) return detail;
  const activities: CollaborationMessage[] = detail.activities.map(message => message.id === "fragrance-live-activity"
    ? { ...message, attachmentRefs: refs.map(ref => ({ ...ref })), mentionedPrincipalIds: ["周岚"] }
    : message);
  activities.push({
    id: "fragrance-live-notification-attachments-only", type: "member-post", author: "高远", message: "@周岚",
    mentionedPrincipalIds: ["周岚"], attachmentRefs: refs.map(ref => ({ ...ref })),
    createdAt: "2026-09-01T10:05:00+08:00", time: "2026-09-01 10:05",
  });
  return { ...detail, activities };
}
