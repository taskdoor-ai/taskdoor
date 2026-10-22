import type { TaskFileNode } from "@/shared/model/task-model";
import { getDescendantIds, sortTaskFileNodes } from "@/features/tasks/files/lib/task-file-tree";

export type TaskFileMoveDestination = { id: string | null; depth: number; node?: TaskFileNode };

export function getTaskFileFolderDestinations(nodes: TaskFileNode[], excluded = new Set<string>()): TaskFileMoveDestination[] {
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

export function getTaskFileMoveDestinations(nodes: TaskFileNode[], nodeId: string): TaskFileMoveDestination[] {
  const node = nodes.find((item) => item.id === nodeId && !item.archived);
  if (!node) return [];
  return getTaskFileFolderDestinations(nodes, new Set([node.id, ...getDescendantIds(nodes, node.id)]));
}

export function canMoveTaskFileTo(nodes: TaskFileNode[], nodeId: string, parentId: string | null): boolean {
  const node = nodes.find((item) => item.id === nodeId && !item.archived);
  return !!node && node.parentId !== parentId && getTaskFileMoveDestinations(nodes, nodeId).some((destination) => destination.id === parentId);
}

export function searchTaskFileMoveDestinations(destinations: TaskFileMoveDestination[], query: string, displayName: (name: string) => string = name => name): { destinations: TaskFileMoveDestination[]; matches: number } {
  const needle = query.trim().toLocaleLowerCase();
  const folders = destinations.filter(destination => destination.node);
  if (!needle) return { destinations, matches: folders.length };
  const matches = folders.filter(destination => displayName(destination.node!.name).toLocaleLowerCase().includes(needle));
  const byId = new Map(destinations.map(destination => [destination.id, destination]));
  const kept = new Set<string | null>();
  for (const match of matches) {
    let cursor: TaskFileMoveDestination | undefined = match;
    while (cursor && !kept.has(cursor.id)) {
      kept.add(cursor.id);
      cursor = cursor.node ? byId.get(cursor.node.parentId) : undefined;
    }
  }
  return { destinations: destinations.filter(destination => kept.has(destination.id)), matches: matches.length };
}
