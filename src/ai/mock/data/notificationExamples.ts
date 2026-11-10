import { taskDetailMocks } from "@/ai/mock/data/taskDetailMocks";
import { getNotificationReadTestExamples } from "@/ai/mock/data/notificationReadScenario";
import type { NotificationRegionTarget } from "@/features/notifications/lib/notification-read-state";
import { getDiscussionAttachment, loadCollaboration, mergeCollaborationMessages, type CollaborationMessage, type CollaborationStorage } from "@/features/tasks/lib/task-collaboration";
import { getTaskFileVersion, readTaskFileEdits } from "@/features/tasks/files/lib/task-file-editing";
import { discussionNotificationExcerpt } from "@/features/notifications/lib/discussion-notification-content";

import { seedDiscussionLikes } from "@/ai/discussion-reactions";
import { mockWorkspaceUserId } from "@/ai/mock/lib/mockWorkspaceAccount";
import { applyLikeToNotifications, type LikeNotification } from "@/features/tasks/discussion/lib/discussion-likes";
import { buildDiscussionFeed } from "@/features/tasks/discussion/lib/discussion-feed";

export { isNotificationReadTestMode } from "@/ai/mock/data/notificationReadScenario";

export type WorkspaceNotification = {
  id: string;
  kind: "invitation" | "member-joined" | "mention" | "reply" | "discussion" | "like" | "handoff" | "file-added" | "file-version-added" | "file-deleted";
  audience?: "direct" | "activity";
  content: string;
  // 可点击任务名接在 content 后，再接这段文字，组成完整通知。
  contentAfterTask?: string;
  contentAfterFile?: string;
  excerpt?: string;
  attachments?: { fileId: string; version: number; name: string; unavailable?: boolean }[];
  teamId?: string;
  people?: { id: string; name: string }[];
  task?: { id: string; title: string };
  file?: { id: string; name: string; state?: "available" | "deleted" | "unavailable" };
  target?: NotificationRegionTarget;
  createdAt: string;
  time: string;
  read: boolean;
};

export const notificationTypeLabels: Record<WorkspaceNotification["kind"], string> = {
  handoff: "任务交接",
  invitation: "协作邀请",
  "member-joined": "成员加入",
  mention: "讨论提及",
  reply: "讨论回复",
  discussion: "新讨论",
  like: "讨论赞",
  "file-added": "文件新增",
  "file-version-added": "文件更新",
  "file-deleted": "文件删除",
};

/**
 * Like notifications for the demo viewer's own comments, from the seeded likes in one task: while a
 * comment's notification is unread, each later like merges into it (「@韩序等 2 个人赞了你的评论」).
 */
function likeNotificationExamples(taskId: keyof typeof taskDetailMocks): WorkspaceNotification[] {
  const detail = taskDetailMocks[taskId];
  const messages = buildDiscussionFeed(detail.activities).messages;
  const likes = seedDiscussionLikes(messages, mockWorkspaceUserId);
  const own = new Map(messages.filter(message => message.author === mockWorkspaceUserId).map(message => [message.id, message]));
  const events = Object.entries(likes).filter(([messageId]) => own.has(messageId))
    .flatMap(([messageId, entries]) => entries.map(like => ({ messageId, likerId: like.personId, at: like.at, liked: true })))
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
  const notifications = events.reduce<LikeNotification[]>((current, event) => applyLikeToNotifications(current, event, () => false), []);
  return notifications.map(item => {
    const [latest] = item.likerIds;
    const content = item.likerIds.length > 1 ? ` @${latest}等 ${item.likerIds.length} 个人赞了你的评论。` : ` @${latest} 赞了你的评论。`;
    return { id: item.id, kind: "like", teamId: "creator-commerce", excerpt: own.get(item.messageId)?.message, people: [{ id: latest, name: latest }], task: { id: taskId, title: detail.title }, target: { area: "discussion", activityId: item.messageId }, content, createdAt: item.createdAt, time: item.createdAt.slice(0, 16).replace("T", " "), read: false };
  });
}

// 通知以类型和事件文案呈现，不要求消息来源必须是成员。
const liveDiscussionMentions: WorkspaceNotification[] = [
  { notificationId: "live-discussion-mention-attachments-only", messageId: "fragrance-live-notification-attachments-only" },
  { notificationId: "live-discussion-mention", messageId: "fragrance-live-activity" },
].flatMap(({ notificationId, messageId }) => {
  const detail = taskDetailMocks["fragrance-live"];
  const message = detail.activities.find(activity => activity.id === messageId) as CollaborationMessage | undefined;
  if (!message || message.deletedAt) return [];
  return [{ id: notificationId, kind: "mention", teamId: "creator-commerce",
    excerpt: discussionNotificationExcerpt(message.message, ["周岚"], message.mentionsAllTaskMembers),
    attachments: message.attachmentRefs?.map(ref => {
      const source = detail.files.find(file => file.id === ref.fileId && file.kind === "file" && !file.archived && (file.version ?? 1) === ref.version);
      return { ...ref, ...(!source || !ref.name.trim() ? { unavailable: true } : {}) };
    }),
    people: [{ id: message.author, name: message.author }], task: { id: "fragrance-live", title: detail.title },
    target: { area: "discussion", activityId: message.id }, content: ` @${message.author} 在`, contentAfterTask: " 的讨论中提及了你。",
    createdAt: message.createdAt!, time: message.time, read: false }];
});

export const notificationExamples: WorkspaceNotification[] = [
  ...liveDiscussionMentions,
  ...likeNotificationExamples("fragrance-final-decision"),
  { id: "content-member-joined", kind: "member-joined", teamId: "creator-commerce", people: [{ id: "林洁", name: "林洁" }], content: " @林洁 加入了团队。", createdAt: "2026-08-30T09:00:00+08:00", time: "2026-08-30 09:00", read: false },
  { id: "creator-business-assignment", kind: "invitation", teamId: "creator-commerce", people: [{ id: "陈默", name: "陈默" }], task: { id: "fragrance-creator-business", title: taskDetailMocks["fragrance-creator-business"].title }, content: " @陈默 邀请你参与任务", contentAfterTask: "。", createdAt: "2026-08-29T09:00:00+08:00", time: "2026-08-29 09:00", read: false },
];

/** Discussion examples follow their current source; SSR keeps the unmodified fixtures. */
export function readNotificationExamples(storage?: CollaborationStorage): WorkspaceNotification[] {
  if (!storage && typeof window === "undefined") return notificationExamples;
  return notificationExamples.flatMap(item => {
    const { task, target } = item;
    if (!task || target?.area !== "discussion" || !target.activityId) return [item];
    try {
      const detail = taskDetailMocks[task.id as keyof typeof taskDetailMocks];
      if (!detail) return [];
      const sourceStorage = storage ?? localStorage;
      const snapshot = loadCollaboration(sourceStorage, JSON.stringify([item.teamId, task.id]), detail.files);
      const message = mergeCollaborationMessages(detail.activities, snapshot.messages).find(message => message.id === target.activityId);
      if (!message || message.deletedAt) return [];
      let edits: ReturnType<typeof readTaskFileEdits> | null | undefined;
      const attachments = message.attachmentRefs?.map(ref => {
        const source = getDiscussionAttachment(snapshot.files, ref);
        let available = Boolean(source && ref.name.trim());
        if (available && source && (source.version ?? 1) !== ref.version) {
          if (edits === undefined) {
            try { edits = readTaskFileEdits(sourceStorage, task.id); }
            catch { edits = null; }
          }
          try { available = Boolean(edits && getTaskFileVersion(source, ref.version, edits[source.id])); }
          catch { available = false; }
        }
        return { fileId: ref.fileId, version: ref.version, name: ref.name, ...(!available ? { unavailable: true } : {}) };
      });
      return [{ ...item, excerpt: discussionNotificationExcerpt(message.message, message.mentionedPrincipalIds ?? ["周岚"], message.mentionsAllTaskMembers), attachments }];
    } catch { return []; }
  });
}

export const notificationReadTestExamples = getNotificationReadTestExamples(Object.fromEntries(Object.entries(taskDetailMocks).map(([id, detail]) => [id, detail.title])));
