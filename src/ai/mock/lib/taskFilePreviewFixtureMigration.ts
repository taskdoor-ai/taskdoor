import type { TaskFileNode } from "@/shared/model/task-model";
import { isSupportedTaskFileUpload } from "@/features/tasks/files/lib/task-file-capabilities";
import { getTaskFileDrafts } from "@/features/tasks/files/lib/task-file-drafts";
import { readTaskFileEdits } from "@/features/tasks/files/lib/task-file-editing";
import { loadCollaboration, saveCollaboration, TASK_COLLABORATION_STORAGE_PREFIX } from "@/features/tasks/lib/task-collaboration";
import { completeBuiltinFileMetadata } from "@/ai/mock/lib/taskFilePreviewFixtures";

type FixtureScope = { taskId: string; teamId: string; legacyFiles: TaskFileNode[] };
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

/** Reconcile old built-in seeds without overwriting users' changes or discussion references. */
export function migrateUnsupportedBuiltinTaskFiles(storage: Storage, scopes: FixtureScope[]) {
  const report = { retiredFileIds: [] as string[], retainedFileIds: [] as string[], skippedTaskIds: [] as string[] };
  for (const { taskId, teamId, legacyFiles } of scopes) {
    try {
      const scope = JSON.stringify([teamId, taskId]);
      if (storage.getItem(`${TASK_COLLABORATION_STORAGE_PREFIX}${encodeURIComponent(scope)}`) === null) continue;
      const saved = loadCollaboration(storage, scope, []);
      const protectedIds = new Set([...Object.keys(readTaskFileEdits(storage, taskId)), ...Object.keys(getTaskFileDrafts(taskId) ?? {})]);
      const legacy = new Map(legacyFiles.map(file => [file.id, file]));
      const retired: string[] = [];
      const retained: string[] = [];
      let updatedMetadata = false;
      const files = saved.files.map(file => {
        if (file.kind !== "file" || file.attachmentOnly || file.retiredBuiltin) return file;
        const seed = legacy.get(file.id);
        if (!seed) return file;
        // Matching the complete source protects renames, moves, versions,
        // ownership changes and content edits, including old unversioned edits.
        const unchanged = !protectedIds.has(file.id) && JSON.stringify(file) === JSON.stringify(seed);
        if (isSupportedTaskFileUpload(file)) {
          if (!unchanged || file.archived || file.discussionOnly) return file;
          const completed = completeBuiltinFileMetadata(file);
          updatedMetadata ||= completed !== file;
          return completed;
        }
        if (!unchanged) { retained.push(file.id); return file; }
        retired.push(file.id);
        return { ...file, retiredBuiltin: true as const };
      });
      if (retired.length || updatedMetadata) saveCollaboration(storage, scope, saved.revision, { ...saved, revision: saved.revision + 1, files });
      report.retiredFileIds.push(...retired);
      report.retainedFileIds.push(...retained);
    } catch {
      // A damaged record or failed storage write must never trigger cleanup.
      report.skippedTaskIds.push(taskId);
    }
  }
  return report;
}
