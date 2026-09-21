import { taskDetailMocks } from "./taskDetailMocks";

export type WorkspaceNotification = {
  id: string;
  kind: "invitation" | "member-joined" | "mention";
  content: string;
  people?: { id: string; name: string }[];
  task?: { id: string; title: string };
  createdAt: string;
  time: string;
  read: boolean;
};

export const notificationTypeLabels: Record<WorkspaceNotification["kind"], string> = {
  invitation: "协作邀请",
  "member-joined": "成员加入",
  mention: "讨论提及",
};

// 通知以类型和事件文案呈现，不要求消息来源必须是成员。
export const notificationExamples: WorkspaceNotification[] = [
  { id: "live-discussion-mention", kind: "mention", people: [{ id: "高远", name: "高远" }], task: { id: "fragrance-live", title: taskDetailMocks["fragrance-live"].title }, content: ` @高远 在任务 ${taskDetailMocks["fragrance-live"].title} 的讨论中提到了你。`, createdAt: "2026-09-01T10:00:00+08:00", time: "2026-09-01 10:00", read: false },
  { id: "content-member-joined", kind: "member-joined", people: [{ id: "林洁", name: "林洁" }], content: " @林洁 加入了 达人带货运营团队 。", createdAt: "2026-08-30T09:00:00+08:00", time: "2026-08-30 09:00", read: false },
  { id: "creator-business-assignment", kind: "invitation", people: [{ id: "陈默", name: "陈默" }], task: { id: "fragrance-creator-business", title: taskDetailMocks["fragrance-creator-business"].title }, content: ` @陈默 邀请你参与任务 ${taskDetailMocks["fragrance-creator-business"].title} 。`, createdAt: "2026-08-29T09:00:00+08:00", time: "2026-08-29 09:00", read: false },
];
