import type { TaskNode } from "@/shared/model/task-model";
import { taskUpdatedTime } from "@/features/tasks/lib/task-list-presentation";

export type TaskHierarchyNode = {
  task: TaskNode;
  children: TaskHierarchyNode[];
  level: number;
  matches: boolean;
  directChildCount: number;
  pinnedBranch: boolean;
  pathUnavailable: boolean;
};

type TaskHierarchyOptions = { sort?: "recent" | "created"; pinnedTaskIds?: readonly string[] };
type BranchOrder = { updatedAt: number | null; createdAt: number | null; allCompleted: boolean };

const compareIds = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;

function compareKnownTime(left: number | null, right: number | null): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return right - left;
}

/** A view projection only: context ancestors never become matching tasks or change task facts. */
export function buildTaskListHierarchy(
  allTasks: readonly TaskNode[],
  matchingTasks: readonly TaskNode[],
  options: TaskHierarchyOptions = {},
): { roots: TaskHierarchyNode[]; matchingTaskIds: string[]; ancestorsByTaskId: ReadonlyMap<string, string[]> } {
  const tasksById = new Map<string, TaskNode>();
  for (const task of allTasks) {
    if (!tasksById.has(task.id)) tasksById.set(task.id, task);
  }
  const matchingIds = new Set(matchingTasks.filter((task) => tasksById.has(task.id)).map((task) => task.id));
  const ancestorsByTaskId = new Map<string, string[]>();
  if (matchingIds.size === 0) return { roots: [], matchingTaskIds: [], ancestorsByTaskId };

  const parentById = new Map<string, string>();
  const directChildCounts = new Map<string, number>();
  const unavailablePaths = new Set<string>();
  for (const task of tasksById.values()) {
    if (!task.parentTaskId) continue;
    const parent = tasksById.get(task.parentTaskId);
    if (!parent || parent.teamId !== task.teamId || parent.id === task.id) {
      unavailablePaths.add(task.id);
      continue;
    }
    parentById.set(task.id, parent.id);
    directChildCounts.set(parent.id, (directChildCounts.get(parent.id) ?? 0) + 1);
  }

  // Invalid legacy cycles are broken at a stable ID, so input order cannot move or duplicate tasks.
  const visited = new Set<string>();
  for (const startId of [...tasksById.keys()].sort(compareIds)) {
    const chain: string[] = [];
    const position = new Map<string, number>();
    let currentId: string | undefined = startId;
    while (currentId && !visited.has(currentId)) {
      const previous = position.get(currentId);
      if (previous !== undefined) {
        const cycle = chain.slice(previous);
        parentById.delete([...cycle].sort(compareIds)[0]);
        for (const id of cycle) unavailablePaths.add(id);
        break;
      }
      position.set(currentId, chain.length);
      chain.push(currentId);
      currentId = parentById.get(currentId);
    }
    for (const id of chain) visited.add(id);
  }

  const includedIds = new Set<string>();
  for (const taskId of matchingIds) {
    let currentId: string | undefined = taskId;
    while (currentId && !includedIds.has(currentId)) {
      includedIds.add(currentId);
      currentId = parentById.get(currentId);
    }
  }

  const nodesById = new Map<string, TaskHierarchyNode>();
  const pinnedIds = new Set(options.pinnedTaskIds);
  for (const taskId of includedIds) {
    nodesById.set(taskId, {
      task: tasksById.get(taskId)!,
      children: [],
      level: 0,
      matches: matchingIds.has(taskId),
      directChildCount: directChildCounts.get(taskId) ?? 0,
      pinnedBranch: matchingIds.has(taskId) && pinnedIds.has(taskId),
      pathUnavailable: unavailablePaths.has(taskId),
    });
  }
  const roots: TaskHierarchyNode[] = [];
  for (const node of nodesById.values()) {
    const parentId = parentById.get(node.task.id);
    const parent = parentId ? nodesById.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  // Iterative traversal keeps even malformed, unusually deep local data bounded by its task count.
  const traversal: TaskHierarchyNode[] = [];
  const pending = [...roots];
  while (pending.length > 0) {
    const node = pending.pop()!;
    traversal.push(node);
    pending.push(...node.children);
  }
  const orderById = new Map<string, BranchOrder>();
  for (let index = traversal.length - 1; index >= 0; index -= 1) {
    const node = traversal[index];
    let updatedAt = node.matches ? taskUpdatedTime(node.task.updatedAt) : null;
    let allCompleted = !node.matches || node.task.status === "已完成";
    for (const child of node.children) {
      const childOrder = orderById.get(child.task.id)!;
      if (childOrder.updatedAt !== null && (updatedAt === null || childOrder.updatedAt > updatedAt)) updatedAt = childOrder.updatedAt;
      allCompleted &&= childOrder.allCompleted;
      node.pinnedBranch ||= child.pinnedBranch;
    }
    orderById.set(node.task.id, {
      updatedAt,
      createdAt: taskUpdatedTime(node.task.createdAt ?? ""),
      allCompleted,
    });
  }

  const compareBranches = (left: TaskHierarchyNode, right: TaskHierarchyNode): number => {
    const leftOrder = orderById.get(left.task.id)!;
    const rightOrder = orderById.get(right.task.id)!;
    return Number(right.pinnedBranch) - Number(left.pinnedBranch)
      || (options.sort === "created" ? 0 : Number(leftOrder.allCompleted) - Number(rightOrder.allCompleted))
      || (options.sort === "created" ? 0 : compareKnownTime(leftOrder.updatedAt, rightOrder.updatedAt))
      || compareKnownTime(leftOrder.createdAt, rightOrder.createdAt)
      || compareIds(left.task.id, right.task.id);
  };
  roots.sort(compareBranches);
  for (const node of nodesById.values()) node.children.sort(compareBranches);

  const matchingTaskIds: string[] = [];
  const entries = roots.map((node) => ({ node, ancestors: [] as string[], pathUnavailable: false })).reverse();
  while (entries.length > 0) {
    const { node, ancestors, pathUnavailable } = entries.pop()!;
    node.level = ancestors.length;
    node.pathUnavailable ||= pathUnavailable;
    ancestorsByTaskId.set(node.task.id, ancestors);
    if (node.matches) matchingTaskIds.push(node.task.id);
    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      entries.push({ node: node.children[index], ancestors: [...ancestors, node.task.id], pathUnavailable: node.pathUnavailable });
    }
  }
  return { roots, matchingTaskIds, ancestorsByTaskId };
}
