import { parseCreationSessions, type CreationSession, type CreationWorkspaceDraft } from "@/features/tasks/lib/task-creation-sessions";

export type CreationExitController = {
  hasUnsavedChanges: () => boolean;
  discard: () => void;
};

export function hasUnsubmittedCreation({ workspace, completed = false, discarded = false, pendingEdits = false }: {
  workspace: CreationWorkspaceDraft;
  completed?: boolean;
  discarded?: boolean;
  pendingEdits?: boolean;
}): boolean {
  if (completed || discarded) return false;
  return Boolean(pendingEdits || workspace.request.trim() || workspace.planning
    || workspace.processes.length || Object.values(workspace.answers).some(answer => answer?.trim()));
}

export function discardCreationSession(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, key: string, sessionId: string): void {
  let raw: string | null;
  try { raw = storage.getItem(key); }
  catch (cause) { throw new Error("创建历史暂时无法读取，输入和方案已保留，请重试。", { cause }); }
  const parsed = parseCreationSessions(raw);
  if (parsed.error) throw new Error("创建历史暂时无法读取，原有记录和本次内容已保留，请重试。");
  if (raw === null || !parsed.sessions.some(session => session.id === sessionId && !session.created)) return;
  // Keep the order and all stored metadata of other sessions unchanged.
  const remaining = (JSON.parse(raw) as CreationSession[]).filter(session => session.id !== sessionId || session.created);
  try {
    if (remaining.length) storage.setItem(key, JSON.stringify(remaining));
    else storage.removeItem(key);
  } catch (cause) { throw new Error("未能丢弃本次内容，输入和方案已保留，请重试。", { cause }); }
}
