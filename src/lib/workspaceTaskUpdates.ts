import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";

export function updateWorkspaceTaskStatus(
  nodes: WorkspaceNode[],
  taskId: string,
  status: TaskNode["status"],
): WorkspaceNode[] {
  return nodes.map((node) => node.kind === "task" && node.id === taskId
    ? { ...node, status, updatedAt: "刚刚" }
    : node);
}
