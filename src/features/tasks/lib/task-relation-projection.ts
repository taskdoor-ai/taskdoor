import type { TaskNode, WorkspaceNode } from "@/shared/model/task-model";
import type { TaskRelationSummary } from "@/features/tasks/components/TaskRelationsSection";

export const getDirectChildTaskCounts = (nodes: readonly WorkspaceNode[]) => {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    if (node.kind !== "task" || !node.parentTaskId) continue;
    counts.set(node.parentTaskId, (counts.get(node.parentTaskId) ?? 0) + 1);
  }
  return counts;
};

/** Keep a related task's own dates even when its effort comes from descendant leaves. */
export const toTaskRelationSummary = (task: TaskNode): TaskRelationSummary => ({
  completionCriteria: task.completionCriteria,
  parentTaskId: task.parentTaskId,
  dueAt: task.dueAt && task.dueAt !== "—" ? task.dueAt : "未设置截止时间",
  goal: task.goal?.trim() || "暂未填写任务目标。",
  iconName: task.iconName,
  iconTone: task.iconTone,
  id: task.id,
  labels: task.labels,
  owner: task.ownerId,
  status: task.status,
  title: task.name,
  updatedAt: task.updatedAt,
  createdAt: task.createdAt,
  completedAt: task.completedAt,
  progressReopenedAt: task.progressReopenedAt,
  plannedStartOn: task.plannedStartOn,
  plannedEndOn: task.plannedEndOn,
});

/** Counts only accessible direct children; completed is an explicit task status. */
export function getDirectChildTaskCompletion(nodes: readonly WorkspaceNode[]) {
  const counts = new Map<string, { total: number; completed: number }>();
  for (const node of nodes) {
    if (node.kind !== "task" || !node.parentTaskId) continue;
    const count = counts.get(node.parentTaskId) ?? { total: 0, completed: 0 };
    count.total += 1;
    if (node.status === "已完成") count.completed += 1;
    counts.set(node.parentTaskId, count);
  }
  return counts;
}
