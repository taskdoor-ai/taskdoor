import type { TaskActivityMock } from "@/shared/model/task-model";
import type { WorkspaceNotification } from "@/ai/mock/data/notificationExamples";

export function isNotificationReadTestMode(search: string, development: boolean): boolean {
  return development && new URLSearchParams(search).get("notificationTest") === "1";
}

export const notificationReadTestActivitiesByTask: Record<string, TaskActivityMock[]> = {
  "fragrance-live": [
    { id: "r10-demo-live-mention-1", author: "高远", message: "[通知测试] @周岚 请确认直播彩排时间，收到后我们安排首次走台。", type: "member-post", createdAt: "2026-10-16T02:00:00Z", time: "2026-10-16 10:00" },
    { id: "r10-demo-live-mention-2", author: "林洁", message: "[通知测试] @周岚 彩排脚本已核对，请确认本场使用的最终话术版本。", type: "member-post", createdAt: "2026-10-16T02:01:00Z", time: "2026-10-16 10:01" },
    { id: "r10-demo-live-mention-3", author: "梁川", message: "[通知测试] @周岚 直播库存与异常切换安排已整理，请确认场控清单。", type: "member-post", createdAt: "2026-10-16T02:02:00Z", time: "2026-10-16 10:02" },
  ],
  "fragrance-content": [
    { id: "r10-demo-content-mention-1", author: "林洁", message: "[通知测试] @周岚 请确认短视频脚本终审安排，这条通知属于另一个任务的讨论区。", type: "member-post", createdAt: "2026-10-16T02:03:00Z", time: "2026-10-16 10:03" },
  ],
};

export const notificationReadTestActivityIds = Object.values(notificationReadTestActivitiesByTask).flatMap(activities => activities.map(activity => activity.id));

/** A separate six-item batch keeps a repeatable test from changing ordinary demo notifications. */
export function getNotificationReadTestExamples(titles: Record<string, string>): WorkspaceNotification[] {
  const mentions = Object.entries(notificationReadTestActivitiesByTask).flatMap(([taskId, activities]) => activities.map((activity): WorkspaceNotification => {
    const title = titles[taskId] ?? taskId;
    return {
      id: activity.id.replace("r10-demo-", "r10-demo-notification-"),
      kind: "mention",
      people: [{ id: activity.author, name: activity.author }],
      task: { id: taskId, title },
      target: { area: "discussion", activityId: activity.id },
      content: ` [通知测试] @${activity.author} 在任务 ${title} 的讨论中提到了你：${activity.message.replace("[通知测试] ", "")}`,
      createdAt: activity.createdAt!,
      time: activity.time,
      read: false,
    };
  }));
  const examples: WorkspaceNotification[] = [
    ...mentions,
    { id: "r10-demo-member-joined", kind: "member-joined", people: [{ id: "林洁", name: "林洁" }], content: " [通知测试] @林洁 加入了 达人带货运营团队 。", createdAt: "2026-10-16T01:59:00Z", time: "2026-10-16 09:59", read: false },
    { id: "r10-demo-invitation", kind: "invitation", people: [{ id: "陈默", name: "陈默" }], task: { id: "fragrance-creator-business", title: titles["fragrance-creator-business"] ?? "fragrance-creator-business" }, content: ` [通知测试] @陈默 邀请你参与任务 ${titles["fragrance-creator-business"] ?? "fragrance-creator-business"} 。`, createdAt: "2026-10-16T01:58:00Z", time: "2026-10-16 09:58", read: false },
  ];
  return examples.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}
