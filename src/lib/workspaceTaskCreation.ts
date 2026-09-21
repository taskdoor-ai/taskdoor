import { taskScheduleError } from "./taskSchedule";
import { workspaceRootId, type TaskNode, type WorkspaceNode } from "../data/workspaceNodes";
import type { TaskDraft, TaskPlanDraft } from "./taskAssistantProtocol";
import { effortEstimateSchema, type TaskEffortEstimate } from "./taskEffort";
import { commitTaskAiStorage } from "./taskAiAdjustmentStorage";
import { createTaskEffortBaseline } from "./taskEffortBaseline";
import { defaultCreationParticipantIds } from "./taskCreationParticipants";
import { getTaskDefinitionGoal } from "./taskGoal";
import { validateDraftHierarchy } from "./taskCreationHierarchy";

export type WorkspaceTaskCreationOptions = {
  currentUserId?: string;
  /** The creation form has shown the defaults and the user has reviewed its participants. */
  participantsReviewed?: boolean;
  idForIndex?: (index: number) => string;
  parentTaskId?: string;
  /** Local demo data scope. A child always inherits the saved parent's team. */
  teamId?: string;
};

export class WorkspaceTaskCreationError extends Error {
  readonly code = "PARENT_TASK_NOT_FOUND";

  constructor(readonly parentTaskId: string) {
    super(`父任务“${parentTaskId}”已不存在，请改为独立创建。`);
    this.name = "WorkspaceTaskCreationError";
  }
}

const dateLabel = (value: string) => {
  if (!value) return "—";
  const [, month, day] = value.split("-").map(Number);
  return `${month} 月 ${day} 日`;
};

const randomId = () => globalThis.crypto?.randomUUID?.()
  ?? `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const uniqueId = (candidate: string, used: Set<string>) => {
  const base = candidate.trim() || randomId();
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
};

const savedEffort = (estimate: TaskEffortEstimate | undefined) => {
  if (estimate === undefined) return {};
  const parsed = effortEstimateSchema.safeParse(estimate);
  if (!parsed.success) throw new Error("工时估算无效，请核对分钟、工作方式、依据与版本后再创建。");
  return { effortEstimate: parsed.data };
};

const invalidateSplitEffort = (task: TaskNode): TaskNode => task.effortEstimate ? {
  ...task,
  effortEstimate: { ...task.effortEstimate, confirmed: false, scopeKey: "needs-review:split" },
} : task;

const toTaskNode = (draft: TaskDraft, id: string, parentId: string, parentTaskId?: string, teamId?: string): TaskNode => ({
  id,
  kind: "task",
  name: draft.title,
  parentId,
  updatedAt: new Date().toISOString(),
  ownerId: draft.ownerId,
  participantIds: [...draft.participantIds],
  status: "待开始",
  goal: draft.goal,
  ...(draft.completionCriteria ? { completionCriteria: [...draft.completionCriteria] } : {}),
  ...(draft.executionTips ? { executionTips: [...draft.executionTips] } : {}),
  ...savedEffort(draft.effortEstimate),
  dueAt: dateLabel(draft.endDate),
  ...(draft.startDate ? { plannedStartOn: draft.startDate } : {}),
  ...(draft.endDate ? { plannedEndOn: draft.endDate } : {}),
  ...(draft.labels.length ? { labels: [...draft.labels] } : {}),
  ...(draft.iconName ? { iconName: draft.iconName } : {}),
  ...(draft.iconTone ? { iconTone: draft.iconTone } : {}),
  ...(parentTaskId ? { parentTaskId } : {}),
  ...(teamId ? { teamId } : {}),
});

export function createWorkspaceTasksFromDraft(
  nodes: WorkspaceNode[],
  draft: TaskPlanDraft,
  options: WorkspaceTaskCreationOptions = {},
): { createdNodes: TaskNode[]; mainTaskId: string; nodes: WorkspaceNode[] } {
  validateDraftHierarchy(draft.subtasks);
  const createdAt = new Date().toISOString();
  for (const task of [draft.mainTask, ...draft.subtasks]) {
    const error = taskScheduleError(task.endDate, createdAt, task.startDate);
    if (error) throw new Error(`「${task.title}」${error}`);
  }
  const usedIds = new Set(nodes.map(({ id }) => id));
  const idForIndex = options.idForIndex ?? (() => randomId());
  const prepareNewTask = (task: TaskNode): TaskNode => {

    const effortBaseline = createTaskEffortBaseline(task,createdAt);
    return {...task,createdAt,...(effortBaseline ? {effortBaseline} : {}),
      ...(options.currentUserId ? {
        createdFrom: "task-planner" as const,createdBy: options.currentUserId,
        participantIds: options.participantsReviewed ? task.participantIds : defaultCreationParticipantIds(task, options.currentUserId),
      } : {})};
  };

  if (options.parentTaskId) {
    const parent = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === options.parentTaskId);
    if (!parent) throw new WorkspaceTaskCreationError(options.parentTaskId);
    const ids = [draft.mainTask, ...draft.subtasks].map((_, index) => uniqueId(idForIndex(index), usedIds));
    const childNode = toTaskNode(
      { ...draft.mainTask, goal: draft.mainTask.goal ?? getTaskDefinitionGoal(nodes, parent) },
      ids[0],
      parent.parentId ?? workspaceRootId,
      parent.id,
      parent.teamId ?? options.teamId,
    );
    const child = draft.subtasks.length ? invalidateSplitEffort(childNode) : childNode;
    const subtasks = draft.subtasks.map((task, index) => {
      const taskId = ids[index + 1];
      const dependsOnTaskIds = [...new Set((draft.dependencies ?? [])
        .filter((dependency) => dependency.subtaskIndex === index)
        .flatMap((dependency) => dependency.dependsOnSubtaskIndexes)
        .filter((dependencyIndex) => dependencyIndex >= 0 && dependencyIndex < draft.subtasks.length && dependencyIndex !== index)
        .map((dependencyIndex) => ids[dependencyIndex + 1]))];
      return {
        ...toTaskNode(task, taskId, child.parentId ?? workspaceRootId, task.parentSubtaskIndex === undefined ? child.id : ids[task.parentSubtaskIndex + 1], child.teamId),
        ...(dependsOnTaskIds.length ? { dependsOnTaskIds } : {}),
      };
    });
    const wasLeaf = !nodes.some(node => node.kind === "task" && node.parentTaskId === parent.id);
    const nextNodes = wasLeaf && parent.effortEstimate
      ? nodes.map(node => node.id === parent.id ? invalidateSplitEffort(parent) : node)
      : nodes;
    const createdNodes = [child, ...subtasks].map(task => prepareNewTask(subtasks.some(item => item.parentTaskId === task.id) ? invalidateSplitEffort(task) : task));
    return { createdNodes, mainTaskId: child.id, nodes: [...nextNodes, ...createdNodes] };
  }

  const ids = [draft.mainTask, ...draft.subtasks].map((_, index) => uniqueId(idForIndex(index), usedIds));
  const mainNode = toTaskNode(draft.mainTask, ids[0], workspaceRootId, undefined, options.teamId);
  const main = draft.subtasks.length ? invalidateSplitEffort(mainNode) : mainNode;
  const subtasks = draft.subtasks.map((task, index) => {
    const taskId = ids[index + 1];
    const dependsOnTaskIds = [...new Set((draft.dependencies ?? [])
      .filter((dependency) => dependency.subtaskIndex === index)
      .flatMap((dependency) => dependency.dependsOnSubtaskIndexes)
      .filter((dependencyIndex) => dependencyIndex >= 0 && dependencyIndex < draft.subtasks.length && dependencyIndex !== index)
      .map((dependencyIndex) => ids[dependencyIndex + 1]))];
    return {
      ...toTaskNode(task, taskId, main.parentId ?? workspaceRootId, task.parentSubtaskIndex === undefined ? main.id : ids[task.parentSubtaskIndex + 1], main.teamId),
      ...(dependsOnTaskIds.length ? { dependsOnTaskIds } : {}),
    };
  });
  const createdNodes = [main, ...subtasks].map(task => prepareNewTask(subtasks.some(item => item.parentTaskId === task.id) ? invalidateSplitEffort(task) : task));
  return { createdNodes, mainTaskId: main.id, nodes: [...nodes, ...createdNodes] };
}

/** The manual plus button creates one blank task before opening its editable detail. */
export function commitManualWorkspaceTask(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  nodes: WorkspaceNode[],
  options: { currentUserId: string; teamId: string; idForIndex?: (index: number) => string },
) {
  const result = createWorkspaceTasksFromDraft(nodes, {
    mainTask: {
      title: "未命名任务", goal: "", completionCriteria: [], executionTips: [],
      ownerId: "", participantIds: [], labels: [], startDate: "", endDate: "",
    },
    subtasks: [],
  }, options);
  const created: TaskNode = { ...result.createdNodes[0], createdFrom: "task-editor" };
  const next = { ...result, createdNodes: [created], nodes: result.nodes.map(node => node.id === created.id ? created : node) };
  commitTaskAiStorage(storage, [["agentdoor-workspace-nodes", JSON.stringify(next.nodes)]]);
  return next;
}
