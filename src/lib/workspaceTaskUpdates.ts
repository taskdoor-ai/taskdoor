import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";

export function updateWorkspaceTaskStatus(
  nodes: WorkspaceNode[],
  taskId: string,
  status: TaskNode["status"],
): WorkspaceNode[] {
  const now = new Date().toISOString();
  return nodes.map((node) => node.kind === "task" && node.id === taskId
    ? node.status === status ? node : { ...node, status, updatedAt: now,
        completedAt: status === "已完成" ? now : status === "已取消" ? node.completedAt : undefined,
        progressReopenedAt: status === "已完成" || status === "已取消" ? undefined : node.status === "已完成" || node.status === "已取消" ? now : node.progressReopenedAt,
      }
    : node);
}
