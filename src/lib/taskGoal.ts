import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";

/** Creation copies the parent goal once. Only legacy records without a goal need a fallback. */
export function getTaskDefinitionGoal(nodes: WorkspaceNode[], task: TaskNode): string {
  let current = task;
  const visited = new Set<string>();
  while (!visited.has(current.id)) {
    if (typeof current.goal === "string") return current.goal; // An explicit empty goal stays empty.
    visited.add(current.id);
    const parent = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === current.parentTaskId);
    if (!parent) break;
    current = parent;
  }
  return "";
}
