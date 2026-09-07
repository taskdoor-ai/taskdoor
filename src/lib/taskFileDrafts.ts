import type { TaskFileContent } from "./taskFileEditing";

export type TaskFileDraft = { content: TaskFileContent; baseVersion: number };

// Unsaved drafts survive task navigation in this application session.
const draftSessions = new Map<string, Record<string, TaskFileDraft>>();
let hasUnloadWarning = false;
const warnUnsavedFiles = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };

export function syncTaskFileDraftWarning() {
  if (typeof window === "undefined") return;
  const hasDrafts = draftSessions.size > 0;
  if (hasDrafts && !hasUnloadWarning) window.addEventListener("beforeunload", warnUnsavedFiles);
  if (!hasDrafts && hasUnloadWarning) window.removeEventListener("beforeunload", warnUnsavedFiles);
  hasUnloadWarning = hasDrafts;
}

export function getTaskFileDrafts(taskId: string): Record<string, TaskFileDraft> | undefined {
  return draftSessions.get(taskId);
}

export function updateTaskFileDrafts(taskId: string, drafts: Record<string, TaskFileDraft>): void {
  if (Object.keys(drafts).length) draftSessions.set(taskId, drafts);
  else draftSessions.delete(taskId);
  syncTaskFileDraftWarning();
}

/** Call only after task deletion has been persisted successfully. */
export function clearTaskFileDraftSessions(taskIds: readonly string[]): void {
  for (const taskId of taskIds) draftSessions.delete(taskId);
  syncTaskFileDraftWarning();
}
