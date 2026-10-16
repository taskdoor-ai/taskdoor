import type { TaskFileNode } from "@/shared/model/task-model";
import { isSupportedTaskFileUpload } from "@/features/tasks/files/lib/task-file-capabilities";

/** This is used only at built-in fixture boundaries, never on user-owned files. */
export function supportedTaskFileFixtures<T extends TaskFileNode>(files: readonly T[]): T[] {
  return files.filter(file => file.kind === "folder" || isSupportedTaskFileUpload(file));
}
