import { taskDetailMocks } from "@/ai/mock/data/taskDetailMocks";
import { getNotificationReadTestExamples } from "@/ai/mock/data/notificationReadScenario";
import type { NotificationRegionTarget } from "@/features/notifications/lib/notification-read-state";
import { seedDiscussionLikes } from "@/ai/discussion-reactions";
import { mockWorkspaceUserId } from "@/ai/mock/lib/mockWorkspaceAccount";
import { applyLikeToNotifications, type LikeNotification } from "@/features/tasks/discussion/lib/discussion-likes";
import { buildDiscussionFeed } from "@/features/tasks/discussion/lib/discussion-feed";

export { isNotificationReadTestMode } from "@/ai/mock/data/notificationReadScenario";

export type WorkspaceNotification = {
  id: string;
  kind: "invitation" | "member-joined" | "mention" | "reply" | "discussion" | "like" | "handoff";
  content: string;
  excerpt?: string;
  teamId?: string;
  people?: { id: string; name: string }[];
  task?: { id: string; title: string };
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
export const notificationExamples: WorkspaceNotification[] = [
  { id: "live-discussion-mention", kind: "mention", teamId: "creator-commerce", excerpt: taskDetailMocks["fragrance-live"].activities.find(activity => activity.author === "高远" && activity.message?.trim())?.message, people: [{ id: "高远", name: "高远" }], task: { id: "fragrance-live", title: taskDetailMocks["fragrance-live"].title }, target: { area: "discussion" }, content: " @高远 在讨论中提到了你。", createdAt: "2026-09-01T10:00:00+08:00", time: "2026-09-01 10:00", read: false },
  ...likeNotificationExamples("fragrance-final-decision"),
  { id: "content-member-joined", kind: "member-joined", teamId: "creator-commerce", people: [{ id: "林洁", name: "林洁" }], content: " @林洁 加入了团队。", createdAt: "2026-08-30T09:00:00+08:00", time: "2026-08-30 09:00", read: false },
  { id: "creator-business-assignment", kind: "invitation", teamId: "creator-commerce", people: [{ id: "陈默", name: "陈默" }], task: { id: "fragrance-creator-business", title: taskDetailMocks["fragrance-creator-business"].title }, content: " @陈默 邀请你参与任务。", createdAt: "2026-08-29T09:00:00+08:00", time: "2026-08-29 09:00", read: false },
];

export const notificationReadTestExamples = getNotificationReadTestExamples(Object.fromEntries(Object.entries(taskDetailMocks).map(([id, detail]) => [id, detail.title])));
