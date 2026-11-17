import type { TaskFileNode } from "@/shared/model/task-model";
import { isSupportedTaskFileUpload } from "@/features/tasks/files/lib/task-file-capabilities";
import { taskFileTimestamp } from "@/features/tasks/files/lib/task-file-time";

// The old relative labels belonged to the fixed September 1 demo scenario.
const builtinUpdateTimes = new Map([
  ["2 天前", "2026-08-30T09:48:00+08:00"],
  ["昨天", "2026-08-31T18:20:00+08:00"],
  ["今天", "2026-09-01T10:00:00+08:00"],
  ["刚刚", "2026-09-01T10:24:00+08:00"],
  ["45 分钟前", "2026-09-01T09:39:00+08:00"],
  ["35 分钟前", "2026-09-01T09:49:00+08:00"],
]);
const textEncoder = new TextEncoder();

export function completeBuiltinFileMetadata(file: TaskFileNode): TaskFileNode {
  if (file.kind !== "file") return file;
  const localTime = file.updatedAt.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/);
  const fixedTime = localTime ? `${localTime[1]}T${localTime[2]}:00+08:00` : builtinUpdateTimes.get(file.updatedAt);
  const updatedAt = fixedTime && taskFileTimestamp(fixedTime) !== null ? fixedTime : file.updatedAt;
  const sizeBytes = file.sizeBytes === undefined && !file.sizeLabel?.trim() && file.format === "MD" && file.content !== undefined
    ? textEncoder.encode(file.content).byteLength
    : file.sizeBytes;
  if (updatedAt === file.updatedAt && sizeBytes === file.sizeBytes) return file;
  return { ...file, updatedAt, ...(sizeBytes === undefined ? {} : { sizeBytes }) };
}

/** This is used only at built-in fixture boundaries, never on user-owned files. */
export function supportedTaskFileFixtures<T extends TaskFileNode>(files: readonly T[]): T[] {
  return files.filter(file => file.kind === "folder" || isSupportedTaskFileUpload(file));
}
