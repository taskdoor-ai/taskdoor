import type { TaskAiAdjustmentContext } from "@/features/tasks/lib/task-ai-adjustment-types";

export type TaskCreationAnnotationField = "task" | "title" | "goal" | "completionCriteria" | "ownerId" | "participantIds" | "endDate";

export type TaskCreationAnnotationTarget = {
  taskId: string;
  field: TaskCreationAnnotationField;
  criterionIndex?: number;
};

export type TaskCreationAnnotation = {
  id: string;
  target: TaskCreationAnnotationTarget;
  taskTitle: string;
  quote: string;
  valueSignature: string;
  instruction: string;
};

export const creationAnnotationLabels: Record<TaskCreationAnnotationField, { zh: string; en: string }> = {
  task: { zh: "任务卡片", en: "Task" },
  title: { zh: "任务名称", en: "Task name" },
  goal: { zh: "目标", en: "Goal" },
  completionCriteria: { zh: "完成标准", en: "Completion criteria" },
  ownerId: { zh: "负责人", en: "Owner" },
  participantIds: { zh: "参与人", en: "Participants" },
  endDate: { zh: "截止日期", en: "Due date" },
};

export function getCreationAnnotationTargetKey(target: TaskCreationAnnotationTarget): string {
  return JSON.stringify([target.taskId, target.field, target.criterionIndex ?? null]);
}

export function getCreationAnnotationValue(context: TaskAiAdjustmentContext, target: TaskCreationAnnotationTarget): { quote: string; valueSignature: string } | null {
  const task = [context.task, ...context.subtasks].find(item => item.id === target.taskId);
  if (!task) return null;
  if (target.field === "task") {
    const memberName = (id: string) => context.members.find(member => member.id === id)?.name ?? id;
    const snapshot = { title: task.title, goal: task.goal, completionCriteria: task.completionCriteria, ownerId: task.ownerId, participantIds: task.participantIds, endDate: task.endDate };
    return {
      quote: [`名称：${task.title}`, `目标：${task.goal || "未设置"}`, "完成标准：", ...task.completionCriteria.map((item, index) => `${index + 1}. ${item}`), `负责人：${memberName(task.ownerId) || "待定"}`, `参与人：${task.participantIds.map(memberName).join("、") || "无"}`, `截止日期：${task.endDate || "未设置"}`].join("\n"),
      valueSignature: JSON.stringify(snapshot),
    };
  }
  const value = task[target.field];
  if (target.field === "completionCriteria" && target.criterionIndex !== undefined) {
    if (!Number.isInteger(target.criterionIndex) || target.criterionIndex < 0 || target.criterionIndex >= task.completionCriteria.length) return null;
    return { quote: task.completionCriteria[target.criterionIndex], valueSignature: JSON.stringify(task.completionCriteria) };
  }
  const memberName = (id: string) => context.members.find(member => member.id === id)?.name ?? id;
  const quote = target.field === "ownerId" ? memberName(task.ownerId)
    : target.field === "participantIds" ? task.participantIds.map(memberName).join("、")
    : Array.isArray(value) ? value.join("\n") : value;
  return { quote, valueSignature: JSON.stringify(value) };
}

export function isCreationAnnotationStale(context: TaskAiAdjustmentContext, annotation: TaskCreationAnnotation): boolean {
  return getCreationAnnotationValue(context, annotation.target)?.valueSignature !== annotation.valueSignature;
}

export function describeCreationAnnotations(annotations: TaskCreationAnnotation[], instruction = ""): string {
  return [...annotations.map((annotation, index) => {
    const label = creationAnnotationLabels[annotation.target.field].zh;
    const suffix = annotation.target.criterionIndex === undefined ? "" : ` ${annotation.target.criterionIndex + 1}`;
    return `${index + 1}. ${annotation.taskTitle} · ${label}${suffix}\n标注：${annotation.instruction}`;
  }), ...(instruction.trim() ? [`补充要求：${instruction.trim()}`] : [])].join("\n\n");
}

/** Freeze the request identity and text without carrying retired image metadata. */
export function snapshotCreationAnnotations(annotations: TaskCreationAnnotation[]): TaskCreationAnnotation[] {
  return annotations.map(({ id, target, taskTitle, quote, valueSignature, instruction }) => ({
    id, target: { ...target }, taskTitle, quote, valueSignature, instruction,
  }));
}
