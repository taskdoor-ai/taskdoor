import { useEffect, useRef, useState } from "react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { validateTaskFileAnnotations, type TaskFileAnnotation } from "@/features/tasks/files/lib/task-file-annotations";

export type FileAnnotationExitController = { hasUnsavedChanges: () => boolean; discard: () => void };

/** Each mounted task has its own transient annotations; nothing is auto-stored. */
export function useTaskFileAnnotations(taskId: string, actorId: string, files: TaskFileNode[]) {
  const [annotations, setAnnotations] = useState<TaskFileAnnotation[]>([]);
  const latest = useRef(annotations);
  useEffect(() => { latest.current = []; setAnnotations([]); }, [taskId, actorId]);
  const commit = (update: (current: TaskFileAnnotation[]) => TaskFileAnnotation[]) => {
    const next = validateTaskFileAnnotations(taskId, latest.current, update(latest.current), { actorId, files });
    latest.current = next;
    setAnnotations(next);
  };
  const discard = () => { latest.current = []; setAnnotations([]); };
  return { annotations, commit, discard };
}
