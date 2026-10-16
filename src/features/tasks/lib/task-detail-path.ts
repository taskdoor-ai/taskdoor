import { workspaceRootId } from "@/shared/model/task-model";

export type TaskDetailPathItem = { id: string; label: string };

/** A workspace entry is not a task parent; only show a path backed by its real parent. */
export function getTaskDetailPathItems(
  pathItems: readonly TaskDetailPathItem[] | undefined,
  taskId: string,
  parentTaskId?: string,
): TaskDetailPathItem[] {
  if (!parentTaskId) return [];
  const taskItems = (pathItems ?? []).filter(item => item.id !== workspaceRootId);
  if (taskItems.at(-1)?.id !== taskId || taskItems.at(-2)?.id !== parentTaskId) return [];
  return taskItems;
}
