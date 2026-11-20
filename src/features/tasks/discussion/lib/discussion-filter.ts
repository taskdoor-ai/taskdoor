import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";

export type DiscussionScope = "all" | "related" | "mine" | "my-replies" | "replies-to-me";

export function filterDiscussionMessages(messages: readonly CollaborationMessage[], {
  query, scope, attachmentsOnly, currentUser, currentUserName, records, searchText,
}: {
  query: string;
  scope: DiscussionScope;
  attachmentsOnly: boolean;
  currentUser: string;
  currentUserName?: string;
  records: ReadonlyMap<string, CollaborationMessage>;
  searchText?: (message: CollaborationMessage) => string;
}): CollaborationMessage[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const own = (author: string) => author === currentUser || Boolean(currentUserName && author === currentUserName);
  return messages.filter(message => {
    if (message.deletedAt) return false;
    const parent = message.replyToActivityId ? records.get(message.replyToActivityId) : undefined;
    const toMe = Boolean(parent && !parent.deletedAt && own(parent.author) && !own(message.author));
    const fromMe = own(message.author);
    const toOthers = Boolean(fromMe && parent && !parent.deletedAt && !own(parent.author));
    const related = fromMe || toMe || message.mentionsAllTaskMembers || message.mentionedPrincipalIds?.includes(currentUser);
    if (scope === "related" && !related || scope === "mine" && !fromMe || scope === "my-replies" && !toOthers || scope === "replies-to-me" && !toMe) return false;
    if (attachmentsOnly && !message.attachmentRefs?.length && !message.file) return false;
    const text = [message.message, message.author, message.file, ...(message.attachmentRefs?.map(ref => ref.name) ?? []), searchText?.(message)].filter(Boolean).join(" ").toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  });
}
