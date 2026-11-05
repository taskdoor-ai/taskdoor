import type { TaskFileNode } from "@/shared/model/task-model";
import { deleteFile, deleteFolder, getDescendantIds, type FolderDeletePolicy } from "@/features/tasks/files/lib/task-file-tree";

export type TaskFileDeletionAccess = {
  actorId: string;
  ownerId: string;
  participantIds: readonly string[];
  activeMemberIds: readonly string[];
};

export function canDeleteTaskFileNode(nodes: TaskFileNode[], nodeId: string, access: TaskFileDeletionAccess, policy: FolderDeletePolicy = "move-contents"): boolean {
  const node = nodes.find(item => item.id === nodeId && !item.archived);
  const { actorId, ownerId, participantIds, activeMemberIds } = access;
  if (!node || !actorId || !activeMemberIds.includes(actorId) || (actorId !== ownerId && !participantIds.includes(actorId))) return false;
  if (actorId === ownerId) return true;
  if (node.createdById !== actorId) return false;
  if (node.kind !== "folder" || policy !== "archive") return true;
  const descendants = new Set(getDescendantIds(nodes, nodeId));
  return nodes.every(item => !descendants.has(item.id) || item.createdById === actorId);
}

export function deleteTaskFileNode(nodes: TaskFileNode[], nodeId: string, access: TaskFileDeletionAccess, policy: FolderDeletePolicy = "move-contents"): TaskFileNode[] {
  if (!canDeleteTaskFileNode(nodes, nodeId, access, policy)) throw new Error("没有删除权限，请按当前任务成员、负责人及原始上传者身份重新核对。");
  const node = nodes.find(item => item.id === nodeId);
  return node?.kind === "folder" ? deleteFolder(nodes, nodeId, policy) : deleteFile(nodes, nodeId);
}
