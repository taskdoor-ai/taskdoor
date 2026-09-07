import type { TaskAiAdjustmentProposal, TaskAiAdjustmentScope } from "./taskAiAdjustmentTypes";

export type TaskAiAdjustmentDraft = {
  instruction: string;
  proposal: TaskAiAdjustmentProposal | null;
  progressId?: string;
  error: string;
  notice: string;
};

export type TaskAiAdjustmentDrafts = Record<string, TaskAiAdjustmentDraft>;

export const emptyTaskAiAdjustmentDraft: TaskAiAdjustmentDraft = {
  instruction: "",
  proposal: null,
  error: "",
  notice: "",
};

export function getTaskAiAdjustmentDraftKey(
  mode: "draft" | "saved",
  taskId: string,
  scope: TaskAiAdjustmentScope,
): string {
  return JSON.stringify([mode, taskId, scope.kind, scope.kind === "subtask" ? scope.taskId : null]);
}

export function taskAiAdjustmentDraftReducer(
  state: TaskAiAdjustmentDrafts,
  action:
    | { type: "patch"; key: string; patch: Partial<TaskAiAdjustmentDraft> }
    | { type: "discard"; key: string },
): TaskAiAdjustmentDrafts {
  const hasDraft = Object.hasOwn(state, action.key);
  if (action.type === "discard") {
    if (!hasDraft) return state;
    const next = { ...state };
    delete next[action.key];
    return next;
  }

  return {
    ...state,
    [action.key]: {
      ...(hasDraft ? state[action.key] : emptyTaskAiAdjustmentDraft),
      ...action.patch,
    },
  };
}
