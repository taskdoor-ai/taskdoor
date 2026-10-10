import type { AiConnectionRequest } from "@/features/ai-connection/components/AiConnectionDialog";
import type { TaskRelationSummary } from "@/features/tasks/components/TaskRelationsSection";
import type { TaskDetailContent } from "@/shared/model/task-model";

export type TaskAiConnectionInput = {
  taskId: string;
  task: TaskDetailContent;
  currentUser: string;
  due?: string;
  tags?: string[];
  parentTask?: TaskRelationSummary;
};

/** A small locator snapshot; the CLI supplies task details on demand. */
export function buildTaskAiConnectionRequest(input: TaskAiConnectionInput): AiConnectionRequest {
  const { taskId, task } = input;
  const context = [
    { label: "任务 ID", value: taskId },
    { label: "任务目标", value: task.goal },
    { label: "完成标准", value: (task.completionCriteria ?? []).filter(value => value.trim()).map((value, index) => `${index + 1}. ${value}`).join("\n") },
    { label: "状态", value: task.status },
    { label: "负责人", value: task.owner },
    { label: "截止时间", value: input.due ?? task.due },
  ].filter(item => item.value?.trim());
  return {
    taskId,
    title: "连接 AI",
    description: "带入任务 ID 和基础信息；详情可通过 TaskDoor CLI 按需获取。",
    contextPreview: { items: [
      { id: "task", label: "任务名称", value: task.title || "未命名任务" },
      ...context.map((item, index) => ({ ...item, id: `task-field-${index}` })),
    ] },
    workObject: { kind: "任务", title: task.title, meta: `任务 ${taskId}` },
    context,
  };
}
