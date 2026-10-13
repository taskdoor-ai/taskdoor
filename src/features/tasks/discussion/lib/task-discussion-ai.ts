import type { AiConnectionRequest, AiContextAttachment } from "@/features/ai-connection/components/AiConnectionDialog";
import type { TaskDetailContent, TaskFileNode } from "@/shared/model/task-model";
import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";
import { isDiscussionActivity } from "@/features/tasks/lib/task-activity";

export type DiscussionAiTarget = { kind: "discussion" | "reply"; activityId: string };

type DiscussionAiInput = {
  taskId: string;
  task: Omit<TaskDetailContent, "activities"> & { activities: CollaborationMessage[] };
  tags?: string[];
  target: DiscussionAiTarget;
  currentUser: string;
};

function savedTimestamp(activity: CollaborationMessage) {
  return activity.createdAt && Number.isFinite(Date.parse(activity.createdAt)) ? activity.createdAt : undefined;
}

function savedAttachments(activity: CollaborationMessage, files: TaskFileNode[]): AiContextAttachment[] {
  if (activity.attachmentRefs?.length) return activity.attachmentRefs.map(ref => ({ id: ref.fileId, name: ref.name }));
  if (!activity.file?.trim()) return [];
  const matches = files.filter(file => file.kind === "file" && !file.archived && file.name === activity.file);
  return [{ ...(matches.length === 1 ? { id: matches[0].id } : {}), name: activity.file }];
}

/** Export a saved message and its direct reply target from the visible snapshot only. */
export function buildDiscussionAiRequest({ taskId, task, target }: DiscussionAiInput): AiConnectionRequest | null {
  if (target.kind !== "discussion" && target.kind !== "reply") return null;
  const activity = task.activities.find(item => item.id === target.activityId);
  if (!activity || activity.deletedAt || activity.fileThreadId || !isDiscussionActivity(activity)) return null;
  const isReply = Boolean(activity.replyToActivityId) || activity.type === "member-reply";
  const parent = activity.replyToActivityId && activity.replyToActivityId !== activity.id
    ? task.activities.find(item => item.id === activity.replyToActivityId)
    : undefined;
  const parentAvailable = Boolean(parent && !parent.deletedAt && !parent.fileThreadId && isDiscussionActivity(parent));
  const publishedAt = savedTimestamp(activity);
  const parentPublishedAt = parentAvailable && parent ? savedTimestamp(parent) : undefined;
  const context = [
    { label: "任务 ID", value: taskId },
    { label: "任务名称", value: task.title },
    { label: "任务目标", value: task.goal },
    { label: "讨论 ID", value: activity.id },
    { label: "用户", value: activity.author },
    ...(publishedAt ? [{ label: "发布时间", value: publishedAt }] : []),
    ...(isReply ? [
      ...(activity.replyToActivityId ? [{ label: "被回复原消息 ID", value: activity.replyToActivityId }] : []),
      ...(parentAvailable && parent ? [
        { label: "被回复原消息用户", value: parent.author },
        ...(parentPublishedAt ? [{ label: "被回复原消息发布时间", value: parentPublishedAt }] : []),
        { label: "被回复原消息内容", value: parent.message },
      ] : [{ label: "来源缺口", value: "被回复原消息不可用" }]),
    ] : []),
  ].filter(item => item.value.trim());
  const content = activity.message;
  const currentAttachments = savedAttachments(activity, task.files);
  const parentAttachments = parentAvailable && parent ? savedAttachments(parent, task.files) : [];
  return {
    taskId,
    title: "连接 AI",
    description: "带入任务、当前消息和直接被回复原消息；更多信息可通过 TaskDoor CLI 按需获取。",
    contextPreview: { items: [
      ...context.map((item, index) => ({ ...item, id: `discussion-field-${index}` })),
      { id: "excerpt", label: "讨论内容", value: content },
    ] },
    workObject: {
      kind: isReply ? "回复" : "讨论",
      title: `${activity.author}的讨论`,
      meta: `记录 ${activity.id}`,
      content,
    },
    context,
    ...(currentAttachments.length || parentAttachments.length ? { messageAttachments: {
      current: currentAttachments,
      ...(parentAttachments.length ? { parent: parentAttachments } : {}),
    } } : {}),
  };
}
