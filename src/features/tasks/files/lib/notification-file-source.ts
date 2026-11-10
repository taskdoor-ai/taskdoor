import type { TaskFileNode } from "@/shared/model/task-model";

/** An ordinary file notification must resolve its exact, currently visible task-tree identity. */
export function findNotificationFile(files: readonly TaskFileNode[], fileId: string): TaskFileNode | undefined {
  const byId = new Map(files.map(file => [file.id, file]));
  const file = byId.get(fileId);
  if (!file || file.kind !== "file" || file.archived || file.retiredBuiltin || file.attachmentOnly || file.discussionOnly) return undefined;
  const seen = new Set([file.id]);
  let parentId = file.parentId;
  while (parentId) {
    if (seen.has(parentId)) return undefined;
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent || parent.kind !== "folder" || parent.archived || parent.retiredBuiltin || parent.attachmentOnly || parent.discussionOnly) return undefined;
    parentId = parent.parentId;
  }
  return file;
}
