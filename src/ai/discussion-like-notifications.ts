import { seedDiscussionLikes } from "@/ai/discussion-reactions";
import { taskDetailMocks } from "@/ai/mock/data/taskDetailMocks";
import { getTeamTaskDetailFixture } from "@/ai/mock/data/teamTaskDetailFixtures";
import { applyLikeToNotifications, discussionLikesStorageKey, parseDiscussionLikes, LIKE_NOTIFICATION_DELAY_MS, type DiscussionLikes, type LikeNotificationPreview } from "@/features/tasks/discussion/lib/discussion-likes";
import { buildDiscussionFeed } from "@/features/tasks/discussion/lib/discussion-feed";
import { loadCollaboration, mergeCollaborationMessages } from "@/features/tasks/lib/task-collaboration";
import type { TaskNode } from "@/shared/model/task-model";

export type { WorkspaceNotification } from "@/ai/mock/data/notificationExamples";

/** Read current local likes and the author's visible messages, including unchanged Demo seeds. */
export function readDiscussionLikeNotificationSource(storage: Pick<Storage, "getItem" | "setItem">, task: TaskNode, userId: string, demo: boolean, now = Date.now()) {
  const teamId = task.teamId ?? "creator-commerce";
  const detail = demo ? taskDetailMocks[task.id as keyof typeof taskDetailMocks] ?? getTeamTaskDetailFixture(task) : undefined;
  const snapshot = loadCollaboration(storage, JSON.stringify([teamId, task.id]), detail?.files ?? []);
  const messages = buildDiscussionFeed(mergeCollaborationMessages(detail?.activities ?? [], snapshot.messages)).messages;
  const own = new Map(messages.filter(message => message.author === userId).map(message => [message.id, message]));
  const seeded = demo ? seedDiscussionLikes(messages, userId) : {};
  const likes = parseDiscussionLikes(storage.getItem(discussionLikesStorageKey(teamId, task.id))) ?? seeded;
  const eligible: DiscussionLikes = Object.fromEntries(Object.entries(likes).filter(([id]) => own.has(id))
    .map(([id, entries]) => [id, entries.filter(like => like.personId !== userId)]));
  // Keep the existing historical notification examples and their read IDs. Other seeded likes
  // remain visible in discussion, but loading a task must not manufacture new inbox history.
  const initial: LikeNotificationPreview = { notifications: [], delivered: {}, nextAt: null };
  const events = Object.entries(seeded).filter(([id]) => own.has(id)).flatMap(([messageId, entries]) => entries
    .filter(like => like.personId !== userId && Date.parse(like.at) + LIKE_NOTIFICATION_DELAY_MS <= now)
    .map(like => ({ messageId, likerId: like.personId, at: like.at, liked: true })));
  for (const event of events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    initial.delivered[JSON.stringify([event.messageId, event.likerId])] = event.at;
    if (task.id === "fragrance-final-decision") initial.notifications = applyLikeToNotifications(initial.notifications, event, () => false);
  }
  return { own, likes: eligible, initial };
}
