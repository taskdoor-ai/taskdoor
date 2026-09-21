import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";
import type { TaskRelationSummary } from "../components/TaskRelationsSection";

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
  dependsOnTaskIds: task.dependsOnTaskIds,
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
