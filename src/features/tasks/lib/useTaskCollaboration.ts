import { useEffect, useRef, useState } from "react";
import type { TaskDetailContent, TaskFileNode } from "@/shared/model/task-model";
import { applyTaskFileEdit, readTaskFileEdits } from "@/features/tasks/files/lib/task-file-editing";
import { createCollaborationSnapshot, getTaskFiles, loadCollaboration, mergeCollaborationMessages, saveCollaboration, TASK_COLLABORATION_STORAGE_PREFIX, type CollaborationSnapshot } from "@/features/tasks/lib/task-collaboration";

export const COLLABORATION_CHANGED = "agentdoor-collaboration-change";
export const collaborationScope = (teamId: string, taskId: string) => JSON.stringify([teamId, taskId]);

function withSavedFiles(snapshot: CollaborationSnapshot, taskId: string): CollaborationSnapshot {
  const records = readTaskFileEdits(window.localStorage, taskId);
  return { ...snapshot, files: snapshot.files.map(file => !file.attachmentOnly && records[file.id] ? applyTaskFileEdit(file, records[file.id]) : file) };
}

/** Projects saved context; the loader durably adds unseen built-in file packs once. */
export function projectTaskCollaboration(teamId: string, taskId: string, detail: TaskDetailContent): TaskDetailContent {
  const projected = { ...detail, files: getTaskFiles(detail.files) };
  if (typeof window === "undefined") return projected;
  try {
    const saved = withSavedFiles(loadCollaboration(window.localStorage, collaborationScope(teamId, taskId), detail.files), taskId);
    return { ...detail, files: getTaskFiles(saved.files), activities: mergeCollaborationMessages(detail.activities, saved.messages).filter(message => !message.deletedAt) };
  } catch { return projected; }
}

export function useTaskCollaboration(teamId: string, taskId: string, seedFiles: TaskFileNode[]) {
  const scopeKey = collaborationScope(teamId, taskId);
  const read = () => typeof window === "undefined" ? createCollaborationSnapshot(seedFiles) : withSavedFiles(loadCollaboration(window.localStorage, scopeKey, seedFiles), taskId);
  const [loaded] = useState(() => {
    try { return { snapshot: read(), error: "" }; }
    catch (failure) { return { snapshot: createCollaborationSnapshot(seedFiles), error: failure instanceof Error ? failure.message : "协作记录读取失败。" }; }
  });
  const [snapshot, setSnapshot] = useState(loaded.snapshot);
  const snapshotRef = useRef(snapshot);
  const [error, setError] = useState(loaded.error);
  const blocked = useRef(Boolean(loaded.error));
  const reload = () => {
    try { const next = read(); snapshotRef.current = next; setSnapshot(next); blocked.current = false; setError(""); return true; }
    catch (failure) { blocked.current = true; setError(failure instanceof Error ? failure.message : "协作记录读取失败。"); return false; }
  };
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === `${TASK_COLLABORATION_STORAGE_PREFIX}${encodeURIComponent(scopeKey)}`) reload(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [scopeKey]);
  const commit = (change: (current: CollaborationSnapshot) => CollaborationSnapshot, persist?: (current: CollaborationSnapshot, next: CollaborationSnapshot) => CollaborationSnapshot) => {
    if (blocked.current) throw new Error(error || "请先重新读取协作记录。");
    try {
      const current = snapshotRef.current;
      const next = change(current);
      if (next === current) return;
      const saved = persist ? persist(current, next) : saveCollaboration(window.localStorage, scopeKey, current.revision, next);
      snapshotRef.current = saved;
      setSnapshot(saved);
      setError("");
      window.dispatchEvent(new CustomEvent(COLLABORATION_CHANGED, { detail: { teamId, taskId } }));
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "保存失败，输入已保留。";
      setError(message);
      throw failure;
    }
  };
  return { snapshot, commit, error, reload, scopeKey };
}
