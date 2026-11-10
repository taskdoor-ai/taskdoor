import { getDiscussionAttachment, loadCollaboration } from "@/features/tasks/lib/task-collaboration";
import { getTaskFileVersion, readTaskFileEdits } from "@/features/tasks/files/lib/task-file-editing";
import { discussionNotificationExcerpt } from "@/features/notifications/lib/discussion-notification-content";
import { collaborationScope } from "@/features/tasks/lib/useTaskCollaboration";
import type { Locale } from "@/shared/i18n/core";
import type { PersonOption, WorkspaceNode } from "@/shared/model/task-model";

export function readTaskDiscussionNotifications(
  storage: Pick<Storage, "getItem" | "setItem">,
  teamId: string,
  userId: string,
  accessibleNodes: readonly WorkspaceNode[],
  members: readonly Pick<PersonOption, "id" | "name">[],
  locale: Locale,
) {
  const names = new Map(members.map(member => [member.id, member.name]));
  return accessibleNodes.flatMap(task => {
    if (task.kind !== "task" || task.teamId !== teamId) return [];
    let snapshot;
    try { snapshot = loadCollaboration(storage, collaborationScope(teamId, task.id), []); }
    catch { return []; } // A damaged source cannot safely expose a notification or excerpt.
    const messages = new Map(snapshot.messages.filter(message => !message.deletedAt).map(message => [message.id, message]));
    let edits: ReturnType<typeof readTaskFileEdits> | null | undefined;
    return snapshot.notifications.flatMap(notification => {
      if (notification.recipientId !== userId || notification.actor === userId) return [];
      const message = messages.get(notification.messageId);
      if (!message) return [];
      const author = names.get(message.author);
      const action = notification.reason === "discussion"
        ? { en: " posted in the discussion on", "zh-CN": " 在" }
        : notification.reason === "reply"
        ? { en: " replied to you in the discussion on", "zh-CN": " 在" }
        : message.mentionsAllTaskMembers
          ? { en: " mentioned all members in the discussion on", "zh-CN": " 在" }
          : { en: " mentioned you in the discussion on", "zh-CN": " 在" };
      const content = (author ? `@${author}` : locale === "en" ? "Someone" : "有成员") + action[locale];
      const contentAfterTask = locale === "en" ? "." : notification.reason === "discussion" ? " 的讨论中发了新消息。" : notification.reason === "reply" ? " 的讨论中回复了你。"
        : ` 的讨论中提及了${message.mentionsAllTaskMembers ? "全体成员" : "你"}。`;
      const attachments = message.attachmentRefs?.map(ref => {
        const source = getDiscussionAttachment(snapshot.files, ref);
        let available = Boolean(source && ref.name.trim());
        if (available && source && (source.version ?? 1) !== ref.version) {
          if (edits === undefined) {
            try { edits = readTaskFileEdits(storage, task.id); }
            catch { edits = null; }
          }
          try { available = Boolean(edits && getTaskFileVersion(source, ref.version, edits[source.id])); }
          catch { available = false; }
        }
        return { fileId: ref.fileId, version: ref.version, name: ref.name, ...(!available ? { unavailable: true } : {}) };
      });
      return [{
        id: notification.id, teamId, kind: notification.reason, content, contentAfterTask,
        excerpt: discussionNotificationExcerpt(message.message, members.map(member => member.name), message.mentionsAllTaskMembers), attachments,
        people: author ? [{ id: message.author, name: author }] : [], task: { id: task.id, title: task.name },
        target: { area: "discussion" as const, activityId: message.id }, createdAt: notification.createdAt, time: "", read: false,
      }];
    });
  }).sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}
