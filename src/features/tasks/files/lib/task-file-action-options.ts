import type { TaskFileNode } from "@/shared/model/task-model";
import { getDescendantIds, sortTaskFileNodes } from "@/features/tasks/files/lib/task-file-tree";

export type TaskFileMoveDestination = { id: string | null; depth: number; node?: TaskFileNode };

export function getTaskFileMoveDestinations(nodes: TaskFileNode[], nodeId: string): TaskFileMoveDestination[] {
  const node = nodes.find((item) => item.id === nodeId && !item.archived);
  if (!node) return [];
  const excluded = new Set([node.id, ...getDescendantIds(nodes, node.id)]);
  const folders = nodes.filter((item) => item.kind === "folder" && !item.archived && !excluded.has(item.id));
  const destinations: TaskFileMoveDestination[] = [{ id: null, depth: 0 }];
  const collect = (parentId: string | null, depth: number) => {
    for (const folder of sortTaskFileNodes(folders.filter((item) => item.parentId === parentId))) {
      destinations.push({ id: folder.id, depth, node: folder });
      collect(folder.id, depth + 1);
    }
  };
  collect(null, 1);
  return destinations;
}

export function canMoveTaskFileTo(nodes: TaskFileNode[], nodeId: string, parentId: string | null): boolean {
  const node = nodes.find((item) => item.id === nodeId && !item.archived);
  return !!node && node.parentId !== parentId && getTaskFileMoveDestinations(nodes, nodeId).some((destination) => destination.id === parentId);
}
