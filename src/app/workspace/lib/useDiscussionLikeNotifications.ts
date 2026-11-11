import { useEffect, useRef, useState } from "react";
import { readDiscussionLikeNotificationSource, type WorkspaceNotification } from "@/ai/discussion-like-notifications";
import { advanceLikeNotifications, type LikeNotificationPreview } from "@/features/tasks/discussion/lib/discussion-likes";
import { COLLABORATION_CHANGED } from "@/features/tasks/lib/useTaskCollaboration";
import { notificationReadStateKey, parseNotificationReadState } from "@/features/notifications/lib/notification-read-state";
import type { Locale } from "@/shared/i18n/core";
import type { TaskNode } from "@/shared/model/task-model";

/** Browser-only Demo notifications. No backend queue or notification frames are simulated. */
export function useDiscussionLikeNotifications(tasks: readonly TaskNode[], userId: string, demo: boolean, locale: Locale) {
  const [items, setItems] = useState<{ userId: string; items: WorkspaceNotification[] }>({ userId, items: [] });
  const savedPreviews = useRef(new Map<string, LikeNotificationPreview>());
  useEffect(() => {
    const previews = savedPreviews.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      let nextAt: number | null = null;
      const now = Date.now();
      const result: WorkspaceNotification[] = [];
      for (const task of tasks) {
        const teamId = task.teamId ?? "creator-commerce";
        const key = JSON.stringify([teamId, task.id]);
        try {
          const { own, likes, initial } = readDiscussionLikeNotificationSource(localStorage, task, userId, demo, now);
          const readIds = new Set(parseNotificationReadState(localStorage.getItem(notificationReadStateKey(teamId, userId))).readIds);
          const previewKey = JSON.stringify([userId, teamId, task.id]);
          const preview = advanceLikeNotifications(previews.get(previewKey) ?? initial, likes, now, id => readIds.has(id));
          previews.set(previewKey, preview);
          if (preview.nextAt !== null) nextAt = Math.min(nextAt ?? preview.nextAt, preview.nextAt);
          for (const notification of preview.notifications) {
            const message = own.get(notification.messageId);
            if (!message) continue;
            const [latest] = notification.likerIds;
            const count = notification.likerIds.length;
            const content = locale === "en"
              ? ` @${latest}${count > 1 ? ` and ${count - 1} ${count === 2 ? "other" : "others"}` : ""} liked your comment.`
              : ` @${latest}${count > 1 ? `等 ${count} 个人` : ""}赞了你的评论。`;
            result.push({ id: notification.id, kind: "like", teamId, content,
              excerpt: message.message, people: [{ id: latest, name: latest }], task: { id: task.id, title: task.name },
              target: { area: "discussion", activityId: message.id }, createdAt: notification.createdAt, time: "", read: false });
          }
        } catch { /* An unreadable local source cannot safely produce a notification. */ }
      }
      setItems({ userId, items: result.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)) });
      // A timeout only wakes this projection; it always re-reads the latest likes before delivery.
      if (nextAt !== null) timer = setTimeout(refresh, Math.max(1, Math.min(2_147_483_647, nextAt - Date.now())));
    };
    refresh();
    const events = ["storage", "agentdoor-stored-value-changed", COLLABORATION_CHANGED, "taskdoor-notification-read-changed"];
    for (const event of events) window.addEventListener(event, refresh);
    return () => { clearTimeout(timer); for (const event of events) window.removeEventListener(event, refresh); };
  }, [tasks, userId, demo, locale]);
  return items.userId === userId ? items.items : [];
}
