import { validateCreationTask, type CreationForm, type CreationTask } from "@/features/tasks/lib/task-creation-form";

const editableSnapshot = ({ dependsOnClientIds: _legacy, ...task }: CreationTask) => task;

/** Merge one input change into the latest plan; final creation checks text completeness. */
export function syncCreationSubtaskEdit(
  form: CreationForm, edited: CreationTask, expected: CreationTask, members: Array<{ id: string }>,
): CreationForm {
  if (edited.clientId !== expected.clientId) throw new Error("子任务标识不一致，请重新打开后再编辑。");
  const index = form.subtasks.findIndex(task => task.clientId === expected.clientId);
  const current = form.subtasks[index];
  if (!current) throw new Error("当前子任务已不存在，请重新打开方案。");
  const taskIds = [form.mainTask, ...form.subtasks].map(task => task.clientId);
  if (taskIds.some(id => !id) || new Set(taskIds).size !== taskIds.length) throw new Error("方案存在缺失或重复的任务标识，请载入最新方案后再编辑。");
  if (JSON.stringify(editableSnapshot(current)) !== JSON.stringify(editableSnapshot(expected))) {
    throw new Error("子任务已被其他操作更新，当前输入已保留。请载入最新内容后再编辑。");
  }

  const next: CreationTask = { ...structuredClone(edited), dependsOnClientIds: [...current.dependsOnClientIds] };
  // Reuse member, date and effort validation without requiring complete text on each
  // keystroke. These validation-only values never enter the returned draft.
  const invalid = validateCreationTask(
    { ...next, title: "编辑中", completionCriteria: ["编辑中"] }, members, `子任务 ${index + 1}`,
  );
  if (invalid) throw new Error(invalid);
  const subtasks = form.subtasks.map(task => task.clientId === current.clientId ? next : task);
  return { ...form, subtasks };
}
