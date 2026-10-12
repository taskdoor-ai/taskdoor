import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";
import type { TaskFileNode } from "@/shared/model/task-model";

export type TaskContentIndicatorInput = {
  enabled: boolean;
  messages: readonly CollaborationMessage[];
  files: readonly TaskFileNode[];
};
export type TaskContentIndicators = {
  discussionCount: number | null;
  fileCount: number | null;
};

const validId = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const uniqueById = <T extends { id: string }>(items: readonly T[]): T[] => [...new Map(items.filter(item => validId(item.id)).map(item => [item.id, item])).values()];

/** Count loaded task content; an unavailable source must not look like empty content. */
export function getTaskContentIndicators(input: TaskContentIndicatorInput): TaskContentIndicators {
  if (!input.enabled) return { discussionCount: null, fileCount: null };
  const discussions = uniqueById(input.messages).filter(message => !message.deletedAt && !message.fileThreadId
    && validId(message.author) && typeof message.message === "string"
    && (message.type === "member-post" || message.type === "member-reply"));
  const files = uniqueById(input.files).filter(file => file.kind === "file" && !file.archived);
  return { discussionCount: discussions.length, fileCount: files.length };
}
