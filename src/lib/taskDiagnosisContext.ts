import type { TaskDetailMock, TaskFileNode } from "../data/taskDetailMocks";
import type { TaskDiagnosisContext } from "./taskDiagnosis";
import { applyTaskFileEdit, getTaskFileContent, readTaskFileEdits } from "./taskFileEditing";

export type TaskDiagnosisFileSnapshot = { files: TaskFileNode[]; unavailableFileCount: number };

/** 只读当前已保存版本；存储损坏时不能用旧 seed 冒充现行正文。 */
export function readTaskDiagnosisFiles(
  taskId: string,
  initialFiles: TaskFileNode[],
  storage?: Pick<Storage, "getItem">,
): TaskDiagnosisFileSnapshot {
  let unavailableFileCount = 0;
  let files: TaskFileNode[] = [];
  try {
    const edits = storage ? readTaskFileEdits(storage, taskId) : {};
    files = initialFiles.flatMap((file) => {
      if (file.kind !== "file") return [file];
      const metadata = file as typeof file & { lifecycle?: string; access?: { visibility?: string } };
      if (file.archived || metadata.lifecycle === "archived" || metadata.lifecycle === "superseded") return [];
      if (metadata.access?.visibility === "restricted") { unavailableFileCount++; return []; }
      try {
        const current = Object.hasOwn(edits, file.id) ? applyTaskFileEdit(file, edits[file.id]) : file;
        if (!getTaskFileContent(current)) { unavailableFileCount++; return []; }
        return [current];
      } catch { unavailableFileCount++; return []; }
    });
  } catch {
    unavailableFileCount = initialFiles.filter((file) => file.kind === "file" && !file.archived).length;
  }
  return { files, unavailableFileCount };
}

export function buildTaskDiagnosisContext(
  taskId: string,
  task: Pick<TaskDetailMock, "goal" | "completionCriteria" | "activities" | "commits" | "files">,
  storage?: Pick<Storage, "getItem">,
): TaskDiagnosisContext {
  return {
    goal: task.goal,
    completionCriteria: task.completionCriteria ?? [],
    activities: task.activities,
    commits: task.commits,
    ...readTaskDiagnosisFiles(taskId, task.files, storage),
  };
}
