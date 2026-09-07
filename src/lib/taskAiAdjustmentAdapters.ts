import type { TaskActivityMock } from "../data/taskDetailMocks";
import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";
import { createTaskChangeActivity } from "./taskActivity";
import { buildTaskAiAdjustment, getTaskAiContextSignature } from "./taskAiAdjustment";
import type { TaskAiAdjustmentContext, TaskAiAdjustmentProposal, TaskAiEditableTask } from "./taskAiAdjustmentTypes";
import type { CreationForm, CreationTask } from "./taskCreationForm";

type Members = TaskAiAdjustmentContext["members"];
const clone = <T,>(value: T): T => structuredClone(value);
const staleMessage = "任务内容或成员信息已有变化，请重新预览后再应用。";
// Optional profile snapshots support freshness checks, not live capacity analysis.
const memberSnapshots = (members: Members): Members => members.map(({ id, name, availability, currentWork, dynamicResponsibility }) => ({
  id, name,
  ...(availability !== undefined ? { availability } : {}),
  ...(currentWork !== undefined ? { currentWork: [...currentWork] } : {}),
  ...(dynamicResponsibility !== undefined ? { dynamicResponsibility } : {}),
}));

function creationTaskContext(task: CreationTask, goal: string, goalInherited: boolean, parentTaskId?: string): TaskAiEditableTask {
  return {
    id: task.clientId, title: task.title, goal, goalInherited, parentTaskId,
    completionCriteria: [...task.completionCriteria], executionTips: [...task.executionTips],
    ownerId: task.ownerId, participantIds: [...task.participantIds],
    startDate: task.startDate, endDate: task.endDate, dependsOnTaskIds: [...task.dependsOnClientIds],
    ...(task.effortEstimate ? { effortEstimate: clone(task.effortEstimate) } : {}),
  };
}

export function createDraftTaskAiContext(form: CreationForm, members: Members, currentUserId: string): TaskAiAdjustmentContext {
  const goal = (form.decision === "attach" ? form.candidate?.goal : form.mainTask.goal) ?? "";
  const parent = form.decision === "attach" ? form.candidate : undefined;
  const task = creationTaskContext(form.mainTask, goal, form.decision === "attach", parent?.id);
  const subtasks = form.subtasks.map(item => creationTaskContext(item, goal, true, task.id));
  const dependencyTasks: TaskAiAdjustmentContext["dependencyTasks"] = [task, ...subtasks].map(({ id, title, dependsOnTaskIds, parentTaskId, endDate }) => ({ id, title, dependsOnTaskIds, parentTaskId, endDate }));
  if (parent) dependencyTasks.push({ id: parent.id, title: parent.name ?? parent.title ?? "主任务", dependsOnTaskIds: [], parentTaskId: parent.parentTaskId, endDate: parent.plannedEndOn ?? parent.endDate });
  return {
    mode: "draft", currentUserId, task, subtasks, members: memberSnapshots(members),
    dependencyTasks,
    canAddSubtasks: form.decision !== "attach",
  };
}

/** A candidate is checked again at the write boundary, including its declared scope. */
function assertCurrentProposal(context: TaskAiAdjustmentContext, proposal: TaskAiAdjustmentProposal): void {
  if (proposal.baseSignature !== getTaskAiContextSignature(context)) throw new Error(staleMessage);
  const rebuilt = buildTaskAiAdjustment(context, proposal.scope, proposal.instruction);
  if ("error" in rebuilt) throw new Error(rebuilt.error);
  const expected = rebuilt.proposal;
  // A new task receives its stable ID at preview time, not again at apply time.
  const ids = new Map(expected.additions.map((task, index) => [task.id, proposal.additions[index]?.id]));
  const normalized = {
    ...expected,
    additions: expected.additions.map(task => ({ ...task, id: ids.get(task.id) ?? task.id })),
    changes: expected.changes.map(change => ({ ...change, taskId: ids.get(change.taskId) ?? change.taskId })),
  };
  if (JSON.stringify(normalized) !== JSON.stringify(proposal)) throw new Error("当前修改与预览不一致，请重新预览；未应用任何调整。");
  const existingIds = new Set([context.task.id, ...context.subtasks.map(task => task.id), ...context.dependencyTasks.map(task => task.id)]);
  for (const addition of proposal.additions) {
    if (!addition.id || existingIds.has(addition.id)) throw new Error("新增任务标识已被使用，请重新预览。");
    existingIds.add(addition.id);
  }
}

export function applyDraftTaskAiAdjustment(form: CreationForm, context: TaskAiAdjustmentContext, proposal: TaskAiAdjustmentProposal): CreationForm {
  const current = createDraftTaskAiContext(form, context.members, context.currentUserId);
  assertCurrentProposal(current, proposal);
  if (!proposal.changes.length) return form;
  const update = (task: CreationTask): CreationTask => {
    const patch = proposal.updates.find(item => item.taskId === task.clientId)?.patch;
    if (!patch) return task;
    const { dependsOnTaskIds, ...fields } = clone(patch);
    return { ...task, ...fields, ...(dependsOnTaskIds ? { dependsOnClientIds: dependsOnTaskIds } : {}) };
  };
  const additions = proposal.additions.map((task): CreationTask => ({
    clientId: task.id, title: task.title, goal: task.goal, completionCriteria: [...task.completionCriteria],
    executionTips: [...task.executionTips], ownerId: task.ownerId, participantIds: [...task.participantIds],
    startDate: task.startDate, endDate: task.endDate, labels: [], dependsOnClientIds: [...task.dependsOnTaskIds],
  }));
  return { ...form, mainTask: update(form.mainTask), subtasks: [...form.subtasks.map(update), ...additions] };
}

export function getTaskDefinitionGoal(nodes: WorkspaceNode[], task: TaskNode): string {
  let current = task;
  const visited = new Set<string>();
  while (current.parentTaskId && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === current.parentTaskId);
    if (!parent) break;
    current = parent;
  }
  return current.goal ?? "";
}

export function createSavedTaskAiContext(nodes: WorkspaceNode[], taskId: string, members: Members, currentUserId: string, ownerProposals: Record<string, string> = {}): TaskAiAdjustmentContext | null {
  const tasks = nodes.filter((node): node is TaskNode => node.kind === "task");
  const main = tasks.find(task => task.id === taskId);
  if (!main) return null;
  const convert = (task: TaskNode): TaskAiEditableTask => ({
    id: task.id, title: task.name, goal: getTaskDefinitionGoal(nodes, task), parentTaskId: task.parentTaskId,
    goalInherited: Boolean(task.parentTaskId && tasks.some(parent => parent.id === task.parentTaskId)),
    completionCriteria: [...(task.completionCriteria ?? [])], executionTips: [...(task.executionTips ?? [])],
    ownerId: task.ownerId, proposedOwnerId: ownerProposals[task.id] ?? task.proposedOwnerId,
    participantIds: [...(task.participantIds ?? [])], startDate: task.plannedStartOn ?? "",
    endDate: task.plannedEndOn ?? "", endDateLabel: task.dueAt,
    dependsOnTaskIds: [...(task.dependsOnTaskIds ?? [])],
    ...(task.effortEstimate ? { effortEstimate: clone(task.effortEstimate) } : {}),
  });
  return {
    mode: "saved", currentUserId, task: convert(main), subtasks: tasks.filter(task => task.parentTaskId === taskId).map(convert),
    members: memberSnapshots(members), canAddSubtasks: true,
    dependencyTasks: tasks.map(({ id, name, dependsOnTaskIds, parentTaskId, plannedEndOn }) => ({ id, title: name, dependsOnTaskIds: [...(dependsOnTaskIds ?? [])], parentTaskId, endDate: plannedEndOn })),
  };
}

export function applySavedTaskAiAdjustment(nodes: WorkspaceNode[], context: TaskAiAdjustmentContext, proposal: TaskAiAdjustmentProposal, options: { author: string; now?: Date; effectiveNodes?: WorkspaceNode[] }): { nodes: WorkspaceNode[]; activities: Record<string, TaskActivityMock[]>; affectedIds: string[] } {
  const ownerProposals = Object.fromEntries([context.task, ...context.subtasks].filter(task => task.proposedOwnerId).map(task => [task.id, task.proposedOwnerId!]));
  const current = createSavedTaskAiContext(options.effectiveNodes ?? nodes, context.task.id, context.members, context.currentUserId, ownerProposals);
  if (!current) throw new Error("当前任务已不存在，请返回任务列表。");
  if (getTaskAiContextSignature(current) !== getTaskAiContextSignature(context)) throw new Error(staleMessage);
  assertCurrentProposal(current, proposal);
  if (proposal.additions.some(task => nodes.some(node => node.id === task.id))) throw new Error("新增任务标识已被使用，请重新预览。");
  if (!proposal.changes.length) return { nodes, activities: {}, affectedIds: [] };
  const now = options.now ?? new Date();
  const main = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === context.task.id)!;
  const nextNodes = nodes.map((node): WorkspaceNode => {
    if (node.kind !== "task") return node;
    const patch = proposal.updates.find(item => item.taskId === node.id)?.patch;
    if (!patch) return node;
    const next = { ...node, updatedAt: "刚刚" };
    const effectiveTask = [current.task, ...current.subtasks].find(task => task.id === node.id);
    if (effectiveTask?.effortEstimate) next.effortEstimate = clone(effectiveTask.effortEstimate);
    if (patch.title !== undefined) next.name = patch.title;
    if (patch.goal !== undefined) next.goal = patch.goal;
    if (patch.completionCriteria !== undefined) next.completionCriteria = [...patch.completionCriteria];
    if (patch.executionTips !== undefined) next.executionTips = [...patch.executionTips];
    if (patch.effortEstimate !== undefined) next.effortEstimate = clone(patch.effortEstimate);
    if (patch.dependsOnTaskIds !== undefined) next.dependsOnTaskIds = [...patch.dependsOnTaskIds];
    // AI proposes a person. The formal owner and accepted participation stay intact.
    if (patch.ownerId) next.proposedOwnerId = patch.ownerId;
    if (patch.startDate !== undefined) next.plannedStartOn = patch.startDate || undefined;
    if (patch.endDate !== undefined) {
      // Preserve the recorded start even when it currently lives in a legacy snapshot.
      if (patch.startDate === undefined) next.plannedStartOn = effectiveTask?.startDate || undefined;
      next.plannedEndOn = patch.endDate || undefined;
      next.dueAt = patch.endDate ? `${Number(patch.endDate.slice(5, 7))} 月 ${Number(patch.endDate.slice(8, 10))} 日` : "—";
    }
    return next;
  });
  for (const task of proposal.additions) nextNodes.push({
    id: task.id, kind: "task", parentId: main.parentId, parentTaskId: main.id, name: task.title,
    ...(main.teamId ? { teamId: main.teamId } : {}),
    goal: context.task.goal, completionCriteria: [...task.completionCriteria], executionTips: [...task.executionTips],
    ownerId: "", participantIds: [], status: "待开始", dependsOnTaskIds: [...task.dependsOnTaskIds],
    createdFrom: "task-planner", createdBy: context.currentUserId, createdAt: now.toISOString(),
    iconName: "list-todo", iconTone: "blue", updatedAt: "刚刚",
  });
  const activities: Record<string, TaskActivityMock[]> = {};
  const groups = new Map<string, typeof proposal.changes>();
  for (const change of proposal.changes) {
    // Record additions on the parent so a newly created leaf has no invented history.
    const taskId = proposal.additions.some(task => task.id === change.taskId) ? main.id : change.taskId;
    groups.set(taskId, [...(groups.get(taskId) ?? []), change]);
  }
  for (const [taskId, changes] of groups) {
    const ownerOnly = proposal.updates.some(item => item.taskId === taskId && item.patch.ownerId !== undefined) && changes.every(change => change.label.includes("负责人"));
    const activity = createTaskChangeActivity({
      author: options.author, type: ownerOnly ? "owner-proposal" : "task-definition-change",
      message: ownerOnly ? "通过 AI 调整提出负责人变更（待接受）" : "应用 AI 调整，更新任务定义",
      changes: changes.map(({ label, before, after }) => ({ label, before: before || null, after: after || null })),
    }, { now });
    if (activity) activities[taskId] = [activity];
  }
  return { nodes: nextNodes, activities, affectedIds: [...new Set([...proposal.updates.map(item => item.taskId), ...proposal.additions.map(item => item.id), ...groups.keys()])] };
}

export { commitTaskAiStorage } from "./taskAiAdjustmentStorage";
