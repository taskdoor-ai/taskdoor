import type { DiscussionDraft } from "@/features/tasks/lib/task-collaboration";

export type DiscussionDraftInsertion = { id: string; draft: DiscussionDraft };

export function mergeDiscussionDraft(current: DiscussionDraft, incoming: DiscussionDraft): DiscussionDraft {
  const attachments = new Map(current.attachments.map(file => [file.id, file]));
  for (const file of incoming.attachments) if (!attachments.has(file.id)) attachments.set(file.id, file);
  return {
    ...current,
    body: [current.body, incoming.body].filter(Boolean).join("\n\n"),
    mentions: [...new Set([...current.mentions, ...incoming.mentions])],
    attachments: [...attachments.values()],
    ...(current.quote || incoming.quote ? { quote: current.quote ?? incoming.quote } : {}),
  };
}
