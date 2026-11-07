import type { TagDefinition } from "@/shared/model/task-model";

export type TagDropPlacement = "before" | "after";

/** Move one catalog entry without changing tag definitions or other relative positions. */
export function reorderTags(tags: TagDefinition[], sourceId: string, targetId: string, placement: TagDropPlacement): TagDefinition[] {
  const sourceIndex = tags.findIndex(tag => tag.id === sourceId);
  if (sourceIndex < 0 || sourceId === targetId || !tags.some(tag => tag.id === targetId)) return tags;
  const next = tags.filter(tag => tag.id !== sourceId);
  const targetIndex = next.findIndex(tag => tag.id === targetId) + (placement === "after" ? 1 : 0);
  if (sourceIndex === targetIndex) return tags;
  next.splice(targetIndex, 0, tags[sourceIndex]);
  return next;
}

export function moveTagByOffset(tags: TagDefinition[], id: string, offset: number): TagDefinition[] {
  const from = tags.findIndex(tag => tag.id === id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= tags.length || from === to) return tags;
  return reorderTags(tags, id, tags[to].id, offset > 0 ? "after" : "before");
}
