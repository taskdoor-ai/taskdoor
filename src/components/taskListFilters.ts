import type { TaskNode } from "../data/workspaceNodes";

export type TaskListFilters = {
  owner: string;
  status: string;
  tag: string;
  statuses?: string[];
  tags?: string[];
  includeUntagged?: boolean;
};

export const createInitialTaskListFilters = (currentUserId: string): TaskListFilters => ({ owner: currentUserId, status: "all", tag: "all" });

function uniqueSelections(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

/** 数组条件覆盖旧单选字段；空数组表示该维度不限。 */
export function getTaskStatusFilters(filters: TaskListFilters): string[] {
  return uniqueSelections(filters.statuses ?? (filters.status === "all" ? [] : [filters.status]));
}

export function getTaskTagFilters(filters: TaskListFilters): string[] {
  return uniqueSelections(filters.tags ?? (filters.tag === "all" ? [] : [filters.tag]));
}

export function taskMatchesListFilters(task: TaskNode, query: string, filters: TaskListFilters) {
  const statuses = getTaskStatusFilters(filters);
  const tags = getTaskTagFilters(filters);
  const labels = task.labels?.filter((label) => label.trim().length > 0) ?? [];
  const matchesTags = (tags.length === 0 && !filters.includeUntagged)
    || labels.some((label) => tags.includes(label))
    || (Boolean(filters.includeUntagged) && labels.length === 0);

  return task.name.toLowerCase().includes(query.trim().toLowerCase())
    && (statuses.length === 0 || statuses.includes(task.status))
    && (filters.owner === "all" || task.ownerId === filters.owner)
    && matchesTags;
}
