import type { TaskActivityMock, TaskNode, WorkspaceNode } from "@/shared/model/task-model";
import { createTaskChangeActivity } from "@/features/tasks/lib/task-activity";

/** Prepare a text edit without changing live nodes; publish only after persistence. */
export function applyCurrentTaskTextField(
  nodes: WorkspaceNode[], taskId: string, field: "name" | "goal", value: string,
  author: string, currentGoalFallback?: string,
): { nodes: WorkspaceNode[]; original: TaskNode; activity: TaskActivityMock | null } {
  const original = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === taskId);
  if (!original) throw new Error("当前任务已不存在，请返回任务列表。");
  const before = field === "name" ? original.name : original.goal ?? currentGoalFallback ?? "";
  if (before === value) return { nodes, original, activity: null };
  const now = new Date();
  const activity = createTaskChangeActivity({
    author,
    type: field === "name" ? "title-change" : "goal-change",
    message: field === "name" ? "修改任务名称" : "修改任务目标",
    changes: [{ label: field === "name" ? "任务名称" : "任务目标", before: before || null, after: value || null }],
  }, { now });
  return {
    nodes: nodes.map(node => node === original ? { ...original, [field]: value, updatedAt: now.toISOString() } : node),
    original,
    activity,
  };
}
