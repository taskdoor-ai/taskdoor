import type { CreationForm, CreationTask } from "@/features/tasks/lib/task-creation-form";

/** Fields omitted from review must not be silently submitted as user-confirmed facts. */
export function simplifyCreationReview(form: CreationForm): CreationForm {
  const simplify = (task: CreationTask): CreationTask => ({ ...task, dependsOnClientIds: [], executionTips: [], labels: [], effortEstimate: undefined });
  return { ...form, tagOperations: undefined, mainTask: { ...simplify(form.mainTask), dependsOnClientIds: [] }, subtasks: form.subtasks.map(simplify) };
}

export function mainTaskReview(form: CreationForm): CreationForm {
  return simplifyCreationReview({ ...form, subtasks: [] });
}

/** Local review fallback when planning supplied no decomposition. */
export function splitCreationReview(form: CreationForm): CreationForm {
  if (form.subtasks.length) return simplifyCreationReview(form);
  return simplifyCreationReview({ ...form, subtasks: form.mainTask.completionCriteria.filter(item => item.trim()).map(criterion => ({
    ...form.mainTask, clientId: crypto.randomUUID(), parentClientId: undefined,
    title: criterion.replace(/[。；]+$/u, ""), goal: `交付可核对的结果：${criterion}`,
    completionCriteria: [criterion], ownerId: "", participantIds: [...form.mainTask.participantIds],
    endDate: "", dependsOnClientIds: [],
  })) });
}
