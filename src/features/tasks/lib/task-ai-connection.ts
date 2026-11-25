import type { AiConnectionRequest } from "@/features/ai-connection/components/AiConnectionDialog";
import type { TaskRelationSummary } from "@/features/tasks/components/TaskRelationsSection";
import type { TaskDetailContent } from "@/shared/model/task-model";

export type TaskAiConnectionInput = {
  taskId: string;
  taskNumber?: number;
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
    { label: "任务编号", value: input.taskNumber === undefined ? "" : String(input.taskNumber) },
    { label: "状态", value: task.status },
    { label: "负责人", value: task.owner },
    { label: "截止时间", value: input.due ?? task.due },
    { label: "任务目标", value: task.goal },
  ].filter(item => item.value?.trim());
  return {
    taskId,
    taskNumber: input.taskNumber,
    title: "连接 AI",
    description: "带入任务编号和基础信息；详情可通过 TaskDoor CLI 按需获取。",
    contextPreview: { items: [
      { id: "task", label: "任务名称", value: task.title || "未命名任务" },
      ...context.map((item, index) => ({ ...item, id: `task-field-${index}` })),
    ] },
    workObject: { kind: "任务", title: task.title, meta: input.taskNumber === undefined ? undefined : `任务 #${input.taskNumber}` },
    context,
  };
}
