import type { AiConnectionRequest } from "@/features/ai-connection/components/AiConnectionDialog";
import type { TaskDetailContent } from "@/shared/model/task-model";
import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";
import { isDiscussionActivity } from "@/features/tasks/lib/task-activity";

export type DiscussionAiTarget =
  | { kind: "discussion" | "reply"; activityId: string }
  | { kind: "reply-draft"; activityId: string; draft: string };

type DiscussionAiInput = {
  taskId: string;
  task: Omit<TaskDetailContent, "activities"> & { activities: CollaborationMessage[] };
  tags?: string[];
  target: DiscussionAiTarget;
  currentUser: string;
};

/** Export the selected record only; never include the rest of the thread or deleted text. */
export function buildDiscussionAiRequest({ taskId, task, target }: DiscussionAiInput): AiConnectionRequest | null {
  const activity = task.activities.find(item => item.id === target.activityId);
  if (!activity || activity.deletedAt || !isDiscussionActivity(activity)) return null;
  const context = [
    { label: "任务 ID", value: taskId },
    { label: "任务目标", value: task.goal },
    { label: "完成标准", value: (task.completionCriteria ?? []).filter(value => value.trim()).map((value, index) => `${index + 1}. ${value}`).join("\n") },
    { label: "任务名称", value: task.title },
    { label: "讨论 ID", value: activity.id },
    { label: "作者", value: activity.author },
    ...(activity.createdAt ? [{ label: "发布时间", value: activity.createdAt }] : []),
    ...(target.kind === "reply-draft" && target.draft.trim() ? [{ label: "未发送的回复草稿", value: target.draft.trim() }] : []),
  ].filter(item => item.value.trim());
  const content = activity.message.trim();
  return {
    taskId,
    title: "连接 AI",
    description: "带入任务、讨论 ID 和当前讨论内容；详情可通过 TaskDoor CLI 按需获取。",
    contextPreview: { items: [
      ...context.map((item, index) => ({ ...item, id: `discussion-field-${index}` })),
      { id: "excerpt", label: "讨论内容", value: content },
    ] },
    workObject: {
      kind: target.kind === "reply-draft" ? "回复草稿" : activity.replyToActivityId ? "回复" : "讨论",
      title: `${activity.author}的讨论`,
      meta: `记录 ${activity.id}`,
      content,
    },
    context,
  };
}
