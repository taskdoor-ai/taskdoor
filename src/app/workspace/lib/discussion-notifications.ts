import { loadCollaboration } from "@/features/tasks/lib/task-collaboration";
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
    return snapshot.notifications.flatMap(notification => {
      if (notification.recipientId !== userId || notification.actor === userId) return [];
      const message = messages.get(notification.messageId);
      if (!message) return [];
      const author = names.get(message.author);
      const action = notification.reason === "reply"
        ? { en: " replied to you in the discussion.", "zh-CN": "在讨论中回复了你。" }
        : message.mentionsAllTaskMembers
          ? { en: " mentioned all members in the discussion.", "zh-CN": "在讨论中提及了全体成员。" }
          : { en: " mentioned you in the discussion.", "zh-CN": "在讨论中提及了你。" };
      const content = (author ? `@${author}` : locale === "en" ? "Someone" : "有成员") + action[locale];
      return [{
        id: notification.id, teamId, kind: notification.reason, content, excerpt: message.message.trim().slice(0, 160),
        people: author ? [{ id: message.author, name: author }] : [], task: { id: task.id, title: task.name },
        target: { area: "discussion" as const, activityId: message.id }, createdAt: notification.createdAt, time: "", read: false,
      }];
    });
  }).sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}
