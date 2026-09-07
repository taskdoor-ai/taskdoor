import { hasValidCreationDependencies, validateCreationTask, type CreationForm, type CreationTask } from "./taskCreationForm";

/** Merge one input change into the latest plan; final creation checks text completeness. */
export function syncCreationSubtaskEdit(
  form: CreationForm, edited: CreationTask, expected: CreationTask, members: Array<{ id: string }>,
): CreationForm {
  if (edited.clientId !== expected.clientId) throw new Error("子任务标识不一致，请重新打开后再编辑。");
  const index = form.subtasks.findIndex(task => task.clientId === expected.clientId);
  const current = form.subtasks[index];
  if (!current) throw new Error("当前子任务已不存在，请重新打开方案。");
  if (JSON.stringify(current) !== JSON.stringify(expected)) {
    throw new Error("子任务已被其他操作更新，当前输入已保留。请载入最新内容后再编辑。");
  }

  const next: CreationTask = {
    ...structuredClone(edited),
    goal: (form.decision === "attach" ? form.candidate?.goal : form.mainTask.goal) ?? "",
  };
  // Reuse member, date and effort validation without requiring complete text on each
  // keystroke. These validation-only values never enter the returned draft.
  const invalid = validateCreationTask(
    { ...next, title: "编辑中", completionCriteria: ["编辑中"] }, members, `子任务 ${index + 1}`,
  );
  if (invalid) throw new Error(invalid);
  const subtasks = form.subtasks.map(task => task.clientId === current.clientId ? next : task);
  if (!hasValidCreationDependencies(subtasks)) {
    throw new Error("前置依赖存在循环或失效引用，请调整后再编辑。");
  }
  return { ...form, subtasks };
}
