import type { CreationForm, CreationTask } from "./taskCreationForm";
import type { TaskDraft } from "./taskAssistantProtocol";

/** Missing parent means a direct child of the main task. */
export function validateDraftHierarchy(tasks: TaskDraft[]): void {
  for (let index = 0; index < tasks.length; index++) {
    const seen = new Set<number>([index]);
    let parent = tasks[index].parentSubtaskIndex;
    while (parent !== undefined) {
      if (!Number.isInteger(parent) || parent < 0 || parent >= tasks.length || seen.has(parent)) {
        throw new Error("任务层级存在循环或失效上级，请调整后再创建。");
      }
      seen.add(parent);
      parent = tasks[parent].parentSubtaskIndex;
    }
  }
}

export function creationHierarchyError(form: CreationForm): string | null {
  if (new Set([form.mainTask.clientId, ...form.subtasks.map(task => task.clientId)]).size !== form.subtasks.length + 1) return "任务层级标识重复，请重新生成方案。";
  try {
    validateDraftHierarchy(form.subtasks.map(task => ({ ...task, parentSubtaskIndex: task.parentClientId === undefined ? undefined : form.subtasks.findIndex(parent => parent.clientId === task.parentClientId) })));
    return null;
  } catch (error) { return (error as Error).message; }
}

export function getCreationDescendantIds(form: CreationForm, clientId: string): Set<string> {
  const ids = new Set<string>();
  const queue = [clientId];
  for (let index = 0; index < queue.length; index++) {
    for (const task of form.subtasks) {
      if (task.parentClientId !== queue[index] || ids.has(task.clientId) || task.clientId === clientId) continue;
      ids.add(task.clientId);
      queue.push(task.clientId);
    }
  }
  return ids;
}

export function getCreationBranchLeaves(form: CreationForm, clientId?: string): CreationTask[] {
  const parents = new Set(form.subtasks.map(task => task.parentClientId).filter(Boolean));
  const descendants = clientId ? getCreationDescendantIds(form, clientId) : undefined;
  return form.subtasks.filter(task => !parents.has(task.clientId) && (!descendants || descendants.has(task.clientId)));
}

export function getCreationHierarchyDepth(form: CreationForm): number {
  const byId = new Map(form.subtasks.map(task => [task.clientId, task]));
  return form.subtasks.reduce((max, task) => {
    const seen = new Set([task.clientId]);
    let depth = 2;
    let parent = task.parentClientId;
    while (parent && byId.has(parent) && !seen.has(parent)) {
      seen.add(parent); depth++; parent = byId.get(parent)!.parentClientId;
    }
    return Math.max(max, depth);
  }, 1);
}
