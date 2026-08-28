import type { TaskNode } from "../data/workspaceNodes";

export type TaskListFilters = {
  owner: string;
  status: string;
  tag: string;
};

export const initialTaskListFilters: TaskListFilters = { owner: "all", status: "all", tag: "all" };

export function taskMatchesListFilters(task: TaskNode, query: string, filters: TaskListFilters) {
  return task.name.toLowerCase().includes(query.trim().toLowerCase())
    && (filters.status === "all" || task.status === filters.status)
    && (filters.owner === "all" || task.ownerId === filters.owner)
    && (filters.tag === "all" || Boolean(task.labels?.includes(filters.tag)));
}
