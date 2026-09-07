import type { LegacyTaskSnapshot } from "../data/legacyTaskSnapshots";
import type { TaskActivityMock } from "../data/taskDetailMocks";
import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";
import { appendTaskActivity, createTaskChangeActivity, type TaskActivityStore } from "./taskActivity";
import { getTaskDefinitionGoal } from "./taskAiAdjustmentAdapters";
import { validateTaskCriteria } from "./taskCriteriaEditing";
import { TASK_FILE_EDITS_STORAGE_PREFIX } from "./taskFileEditing";
import { createWorkspaceTasksFromDraft } from "./workspaceTaskCreation";

export type NewSubtaskDraft = { title: string; completionCriteria: string[] };

export function getNewSubtaskDraftError(draft: NewSubtaskDraft): string | null {
  if (!draft.title.trim()) return "请填写子任务名称。";
  try { validateTaskCriteria(draft.completionCriteria); }
  catch (error) { return error instanceof Error ? error.message : "请核对完成标准。"; }
  return null;
}

/** Prepare one explicit local addition; the caller must persist before publishing it. */
export function addWorkspaceSubtask(
  nodes: WorkspaceNode[], parentTaskId: string, draft: NewSubtaskDraft,
  options: { currentUserId: string; author: string; id?: string },
): { nodes: WorkspaceNode[]; parent: TaskNode; createdTask: TaskNode; activity: TaskActivityMock | null } {
  const invalid = getNewSubtaskDraftError(draft);
  if (invalid) throw new Error(invalid);
  const parent = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === parentTaskId);
  if (!parent) throw new Error("父任务已不存在，未创建子任务。请返回任务列表核对。");
  const result = createWorkspaceTasksFromDraft(nodes, {
    mainTask: {
      title: draft.title.trim(), goal: getTaskDefinitionGoal(nodes, parent),
      completionCriteria: validateTaskCriteria(draft.completionCriteria), executionTips: [],
      ownerId: "", participantIds: [], labels: [], startDate: "", endDate: "",
      iconName: "list-todo", iconTone: "blue",
    },
    subtasks: [],
  }, { parentTaskId, currentUserId: options.currentUserId, ...(options.id ? { idForIndex: () => options.id! } : {}) });
  const createdTask: TaskNode = { ...result.createdNodes[0], createdFrom: "task-editor", goal: getTaskDefinitionGoal(nodes, parent) };
  const activity = createTaskChangeActivity({
    author: options.author, type: "task-definition-change", message: "新增子任务",
    changes: [{ label: "子任务", before: null, after: createdTask.name }],
  });
  return {
    nodes: result.nodes.map(node => node.id === createdTask.id ? createdTask : node.id === parent.id ? { ...node, updatedAt: "刚刚" } : node),
    parent, createdTask, activity,
  };
}

export type SubtaskDeletionPreview = {
  parent: TaskNode;
  task: TaskNode;
  deletedTasks: TaskNode[];
  deletedTaskIds: string[];
  descendantCount: number;
  dependencyTasks: TaskNode[];
  signature: string;
};

export type TaskDeletionPreview = {
  parent?: TaskNode;
  task: TaskNode;
  deletedTasks: TaskNode[];
  deletedTaskIds: string[];
  descendantCount: number;
  dependencyTasks: TaskNode[];
  signature: string;
};

/** Build the exact task tree and external dependency impact shown before deletion. */
export function getTaskDeletionPreview(nodes: WorkspaceNode[], taskId: string): TaskDeletionPreview {
  const tasks = nodes.filter((node): node is TaskNode => node.kind === "task");
  const byId = new Map(tasks.map(task => [task.id, task]));
  if (byId.size !== tasks.length) throw new Error("任务记录存在重复标识，请先核对，暂不能删除。");
  const task = byId.get(taskId);
  if (!task) throw new Error("当前任务已不存在，请关闭后核对任务列表。");
  const parent = task.parentTaskId ? byId.get(task.parentTaskId) : undefined;
  if (task.parentTaskId && !parent) throw new Error("任务的主任务已不存在，请先核对归属，暂不能删除。");
  const children = new Map<string, TaskNode[]>();
  for (const item of tasks) if (item.parentTaskId) children.set(item.parentTaskId, [...(children.get(item.parentTaskId) ?? []), item]);
  const deletedTasks: TaskNode[] = [task];
  const deletedIds = new Set<string>();
  for (const item of deletedTasks) {
    if (deletedIds.has(item.id)) throw new Error("任务关系存在循环，不能删除。请先核对归属。");
    deletedIds.add(item.id);
    deletedTasks.push(...(children.get(item.id) ?? []));
  }
  const dependencyTasks = tasks.filter(item => !deletedIds.has(item.id) && item.dependsOnTaskIds?.some(id => deletedIds.has(id)));
  const signature = JSON.stringify({
    taskId,
    tasks: deletedTasks.map(item => [item.id, item.parentTaskId, item.name]).sort((a, b) => a[0]!.localeCompare(b[0]!)),
    dependencies: dependencyTasks.map(item => [item.id, item.name, item.dependsOnTaskIds] as const).sort((a, b) => a[0].localeCompare(b[0])),
  });
  return { parent, task, deletedTasks, deletedTaskIds: [...deletedIds], descendantCount: deletedTasks.length - 1, dependencyTasks, signature };
}

/** The selected parent is the mutation scope, not a grant to delete arbitrary tasks. */
export function getSubtaskDeletionPreview(nodes: WorkspaceNode[], parentTaskId: string, taskId: string): SubtaskDeletionPreview {
  const tasks = nodes.filter((node): node is TaskNode => node.kind === "task");
  const byId = new Map(tasks.map(task => [task.id, task]));
  if (byId.size !== tasks.length) throw new Error("任务记录存在重复标识，请先核对，暂不能删除。");
  const parent = byId.get(parentTaskId);
  const task = byId.get(taskId);
  if (!parent || !task) throw new Error("当前任务已不存在，请关闭后核对任务列表。");
  if (task.id === parent.id || task.parentTaskId !== parent.id) throw new Error("只能删除当前任务的直属子任务，归属可能已有变化。");
  const preview = getTaskDeletionPreview(nodes, taskId);
  if (preview.deletedTaskIds.includes(parent.id)) throw new Error("任务关系存在循环，不能连同父任务删除。请先核对归属。");
  return { ...preview, parent };
}

export type SubtaskWorkspaceState = {
  nodes: WorkspaceNode[];
  activities: TaskActivityStore;
  detailSeeds: TaskNode[];
  ownerProposals: Record<string, string>;
  participantInvitations: Record<string, Record<string, "accepted" | "pending">>;
  periodOverrides: Record<string, { start: string; end: string } | null>;
  legacySnapshots: Record<string, LegacyTaskSnapshot>;
  latestLegacySnapshot: LegacyTaskSnapshot | null;
};
export type SubtaskDeletionResult = SubtaskWorkspaceState & { deletedTaskIds: string[]; parentTaskId: string };
export type TaskDeletionResult = SubtaskWorkspaceState & { deletedTaskIds: string[]; returnTaskId: string | null };

function withoutTasks<T>(record: Record<string, T>, deletedIds: Set<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([id]) => !deletedIds.has(id)));
}

/** Delete an arbitrary task tree after revalidating the preview shown to the user. */
export function deleteWorkspaceTask(
  state: SubtaskWorkspaceState, taskId: string, expectedSignature: string, author: string,
): TaskDeletionResult {
  const preview = getTaskDeletionPreview(state.nodes, taskId);
  if (preview.signature !== expectedSignature) throw new Error("任务或依赖范围已有变化，请核对最新提示后重新确认删除。");
  const deletedIds = new Set(preview.deletedTaskIds);
  const dependencyIds = new Set(preview.dependencyTasks.map(task => task.id));
  const taskNames = new Map(state.nodes.filter(node => node.kind === "task").map(node => [node.id, node.name]));
  const dependencyLabel = (ids: string[]) => ids.map(id => taskNames.get(id) ?? id).join("、") || null;
  let activities = withoutTasks(state.activities, deletedIds);
  if (preview.parent) {
    const parentActivity = createTaskChangeActivity({
      author, type: "task-definition-change", message: "删除子任务",
      changes: [{ label: "子任务", before: preview.deletedTasks.map(task => task.name).join("、"), after: null }],
    });
    if (parentActivity) activities = appendTaskActivity(activities, preview.parent.id, parentActivity);
  }
  for (const task of preview.dependencyTasks) {
    const activity = createTaskChangeActivity({
      author, type: "task-definition-change", message: "移除已删除任务的前置依赖",
      changes: [{ label: "前置依赖", before: dependencyLabel(task.dependsOnTaskIds ?? []), after: dependencyLabel((task.dependsOnTaskIds ?? []).filter(id => !deletedIds.has(id))) }],
    });
    if (activity) activities = appendTaskActivity(activities, task.id, activity);
  }
  const nodes = state.nodes.filter(node => !deletedIds.has(node.id)).map((node): WorkspaceNode => {
    const isParent = node.kind === "task" && node.id === preview.parent?.id;
    if (node.kind !== "task" || (!isParent && !dependencyIds.has(node.id))) return node;
    return {
      ...node, updatedAt: "刚刚",
      ...(dependencyIds.has(node.id) ? { dependsOnTaskIds: node.dependsOnTaskIds!.filter(id => !deletedIds.has(id)) } : {}),
      ...(isParent && node.effortEstimate ? { effortEstimate: { ...node.effortEstimate, confirmed: false, scopeKey: "needs-review:subtasks" } } : {}),
    };
  });
  const detailSeeds = state.detailSeeds.filter(task => !deletedIds.has(task.id));
  for (const original of [...(preview.parent ? [preview.parent] : []), ...preview.dependencyTasks]) if (!detailSeeds.some(task => task.id === original.id)) detailSeeds.push({ ...original });
  const cleanLegacy = (task: LegacyTaskSnapshot): LegacyTaskSnapshot => task.childTaskIds?.some(id => deletedIds.has(id))
    ? { ...task, childTaskIds: task.childTaskIds.filter(id => !deletedIds.has(id)) } : task;
  return {
    nodes, activities, detailSeeds,
    ownerProposals: withoutTasks(state.ownerProposals, deletedIds),
    participantInvitations: withoutTasks(state.participantInvitations, deletedIds),
    periodOverrides: withoutTasks(state.periodOverrides, deletedIds),
    legacySnapshots: Object.fromEntries(Object.entries(withoutTasks(state.legacySnapshots, deletedIds)).map(([id, task]) => [id, cleanLegacy(task)])),
    latestLegacySnapshot: state.latestLegacySnapshot && !deletedIds.has(state.latestLegacySnapshot.id) ? cleanLegacy(state.latestLegacySnapshot) : null,
    deletedTaskIds: preview.deletedTaskIds, returnTaskId: preview.parent?.id ?? null,
  };
}

/** No in-place mutation: cancel or failed persistence leaves all live state untouched. */
export function deleteWorkspaceSubtask(
  state: SubtaskWorkspaceState, parentTaskId: string, taskId: string, expectedSignature: string, author: string,
): SubtaskDeletionResult {
  const preview = getSubtaskDeletionPreview(state.nodes, parentTaskId, taskId);
  if (preview.signature !== expectedSignature) throw new Error("子任务或依赖范围已有变化，请核对最新提示后重新确认删除。");
  const result = deleteWorkspaceTask(state, taskId, expectedSignature, author);
  return { ...result, parentTaskId };
}

/** Empty snapshots participate in the existing recoverable multi-key transaction. */
export function getSubtaskDeletionWrites(result: SubtaskDeletionResult): Array<[string, string]> {
  return getTaskDeletionWrites(result);
}

export function getTaskDeletionWrites(result: TaskDeletionResult | SubtaskDeletionResult): Array<[string, string]> {
  return [
    ["agentdoor-workspace-nodes", JSON.stringify(result.nodes)],
    ["agentdoor-task-activity", JSON.stringify(result.activities)],
    ["agentdoor-task-detail-seeds", JSON.stringify(result.detailSeeds)],
    ["agentdoor-task-owner-proposals", JSON.stringify(result.ownerProposals)],
    ["agentdoor-task-participant-invitations", JSON.stringify(result.participantInvitations)],
    ["agentdoor-created-tasks", JSON.stringify(result.legacySnapshots)],
    ["agentdoor-created-task", JSON.stringify(result.latestLegacySnapshot)],
    ...result.deletedTaskIds.map(id => [`${TASK_FILE_EDITS_STORAGE_PREFIX}${encodeURIComponent(id)}`, "{}"] as [string, string]),
  ];
}
