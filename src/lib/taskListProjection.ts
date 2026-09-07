import { taskMatchesListFilters, type TaskListFilters } from "../components/taskListFilters.ts";
import type { TagDefinition } from "../data/sharedTypes.ts";
import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes.ts";
import { taskBoardStatusOrder } from "./taskBoard.ts";

export type TaskListProjection = {
  allTasks: TaskNode[];
  visibleTasks: TaskNode[];
  tagFacets: Array<{ tag: TagDefinition; count: number }>;
  allTagsCount: number;
  untaggedCount?: number;
  statuses: TaskNode["status"][];
};

export type PersonalTaskTagGroup = {
  key: string;
  label: string;
  tasks: TaskNode[];
};

/** 个人索引既保留正式负责人的任务，也保留本人创建但尚未分配负责人的恢复入口。 */
export function isTaskInPersonalIndex(task: TaskNode, currentUserId: string): boolean {
  if (!currentUserId.trim()) return false;
  return task.ownerId === currentUserId || (!task.ownerId && task.createdBy === currentUserId);
}

/** 有标签筛选时按首个命中标签展示，否则按首个已有标签；不改变任务数据。 */
export function buildPersonalTaskTagGroups(
  visibleTasks: TaskNode[],
  tagDefinitions: TagDefinition[],
  selectedTags: string[] = [],
): PersonalTaskTagGroup[] {
  const selectedTagNames = new Set(selectedTags.filter((name) => name.trim().length > 0));
  const tagsByName = new Map<string, TagDefinition>();
  for (const tag of tagDefinitions) {
    if (!tagsByName.has(tag.name)) tagsByName.set(tag.name, tag);
  }
  const groups = new Map<string, PersonalTaskTagGroup>();
  const seenTaskIds = new Set<string>();
  for (const task of visibleTasks) {
    if (seenTaskIds.has(task.id)) continue;
    seenTaskIds.add(task.id);
    const labels = task.labels?.filter((name) => name.trim().length > 0) ?? [];
    const label = selectedTagNames.size > 0
      ? labels.find((name) => selectedTagNames.has(name)) ?? labels[0]
      : labels[0];
    const tag = label === undefined ? undefined : tagsByName.get(label);
    const key = label === undefined ? "untagged" : tag ? `tag:${tag.id}` : `label:${label}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, label: label ?? "未打标签", tasks: [] };
      groups.set(key, group);
    }
    group.tasks.push(task);
  }

  const ordered: PersonalTaskTagGroup[] = [];
  for (const tag of tagDefinitions) {
    const key = `tag:${tag.id}`;
    const group = groups.get(key);
    if (group) {
      ordered.push(group);
      groups.delete(key);
    }
  }
  const untagged = groups.get("untagged");
  groups.delete("untagged");
  ordered.push(...[...groups.values()].sort((a, b) => a.label.localeCompare(b.label, "zh-CN") || a.key.localeCompare(b.key)));
  if (untagged) ordered.push(untagged);
  return ordered;
}

/** 标签是可重叠的筛选入口，不是任务归属；数量先于标签筛选计算。 */
export function buildTaskListProjection(
  nodes: WorkspaceNode[],
  query: string,
  filters: TaskListFilters,
  tagDefinitions: TagDefinition[],
): TaskListProjection {
  const tasksById = new Map<string, TaskNode>();
  for (const node of nodes) {
    if (node.kind === "task" && !tasksById.has(node.id)) tasksById.set(node.id, node);
  }
  const allTasks = [...tasksById.values()];
  const scopeFilters = { ...filters, tag: "all", tags: [], includeUntagged: false };
  const scopedTasks = allTasks.filter((task) => taskMatchesListFilters(task, query, scopeFilters));
  const visibleTasks = scopedTasks
    .filter((task) => taskMatchesListFilters(task, query, filters))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN") || a.id.localeCompare(b.id));
  const presentStatuses = new Set(allTasks.map((task) => task.status));

  return {
    allTasks,
    visibleTasks,
    tagFacets: tagDefinitions.map((tag) => ({ tag, count: scopedTasks.filter((task) => task.labels?.includes(tag.name)).length })),
    allTagsCount: scopedTasks.length,
    untaggedCount: scopedTasks.filter((task) => !task.labels?.some((label) => label.trim().length > 0)).length,
    statuses: taskBoardStatusOrder.filter((status) => presentStatuses.has(status)),
  };
}
