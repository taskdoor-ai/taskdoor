import type { CreationForm, CreationTask } from "@/features/tasks/lib/task-creation-form";
import { getEffortScopeKey, getTaskEffortState } from "@/features/tasks/lib/task-effort";

/** Date changes and explicit clearing make the old suggestion inapplicable. */
export function getCreationDeadlineNote(task: Pick<CreationTask, "endDate" | "executionTips">): string | undefined {
  if (!task.endDate) return undefined;
  return task.executionTips.find(tip => tip.startsWith(`AI 建议截止：${task.endDate}。`) || tip.startsWith(`AI suggested deadline: ${task.endDate}.`));
}

/** Fields omitted from review must not be silently submitted as user-confirmed facts. */
export function simplifyCreationReview(form: CreationForm): CreationForm {
  const simplify = (task: CreationTask): CreationTask => {
    const deadlineNote = getCreationDeadlineNote(task);
    const next = { ...task, dependsOnClientIds: [], executionTips: deadlineNote ? [deadlineNote] : [], labels: [], effortEstimate: undefined as CreationTask["effortEstimate"] };
    const state = getTaskEffortState(task);
    if (task.effortEstimate && (state === "proposed" || state === "confirmed")) {
      next.effortEstimate = { ...task.effortEstimate, confirmed: false, scopeKey: getEffortScopeKey(next, task.effortEstimate.workMethod) };
    }
    return next;
  };
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
