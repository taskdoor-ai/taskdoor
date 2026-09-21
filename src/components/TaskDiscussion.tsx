import { useGlobalUi } from "../i18n/globalUi";
import { useDetailCopy } from "../i18n/detailMessages";
import type { AiShortcutAttempt, AiTransferResult } from "./AiConnectionDialog";
import { MessageSquare } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { TaskFileNode } from "../data/taskDetailMocks";
import type { CollaborationMessage, DiscussionDraft } from "../lib/taskCollaboration";
import { getTaskDiscussionThreads } from "../lib/taskActivity";
import type { DiscussionAiTarget } from "../lib/taskDiscussionAi";
import { PersonAvatar } from "./PersonAvatar";
import { DiscussionComposer } from "./discussion/DiscussionComposer";
import { DiscussionMessages } from "./discussion/DiscussionMessages";

type TaskDiscussionProps = {
  activities: CollaborationMessage[];
  attentionTarget?: { id: string; sequence: number };
  currentUser: string;
  currentUserName?: string;
  files: TaskFileNode[];
  draftKey?: string;
  onConnectAi?: (target: DiscussionAiTarget, trigger: HTMLElement, shortcut?: AiShortcutAttempt) => void | Promise<AiTransferResult | void>;
  onOpenFile: (fileId: string, version?: number) => void;
  onPost: (draft: DiscussionDraft, replyToActivityId?: string) => void | Promise<void>;
  onEdit?: (message: CollaborationMessage, draft: DiscussionDraft) => void | Promise<void>;
  onDelete?: (message: CollaborationMessage) => void;
  people: string[];
};

export function TaskDiscussion({ activities, attentionTarget, currentUser, currentUserName, files, draftKey = "task-discussion", onConnectAi, onOpenFile, onPost, onEdit, onDelete, people }: TaskDiscussionProps) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const deletedIds = new Set(activities.filter(message => message.deletedAt).map(message => message.id));
  // Build reply relationships first so removing a parent does not split its surviving replies.
  const threads = getTaskDiscussionThreads(activities.filter(message => !message.fileThreadId))
    .filter(({ activity, replies }) => [activity, ...replies].some(message => !deletedIds.has(message.id)));
  const [highlightedActivityId, setHighlightedActivityId] = useState<string | null>(null);
  useEffect(() => {
    setHighlightedActivityId(attentionTarget?.id ?? null);
    if (!attentionTarget) return;
    const timer = window.setTimeout(() => setHighlightedActivityId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [attentionTarget?.id, attentionTarget?.sequence]);
  return <div className="task-discussion">
    <div className="task-discussion-scroll">
    {threads.length === 0 ? <div className="task-record-empty"><MessageSquare aria-hidden="true" size={22} /><strong>{d('noDiscussion')}</strong><p>{d('discussionHint')}</p></div> : <ol aria-label={d('taskDiscussion')} className="task-discussion-threads">{threads.map(({ activity, replies, context }) => <li className="task-discussion-group" key={activity.id}>
      {context && <blockquote className="task-discussion-context"><small>{ui("回复原活动记录 ·")}{context.author}</small><p>{context.message}</p></blockquote>}
      <DiscussionMessages allMessages={activities} allowQuote={false} currentUser={currentUser} currentUserName={currentUserName} draftKey={draftKey} files={files} highlightedId={highlightedActivityId} messages={[activity, ...replies]} onConnectAi={onConnectAi} onDelete={onDelete} onEdit={onEdit} onOpenFile={onOpenFile} onPost={onPost} people={people} />
    </li>)}</ol>}
    </div>
    <div className="task-discussion-compose">
      <PersonAvatar name={currentUserName ?? currentUser} personId={currentUser} size="sm" />
      <DiscussionComposer actionLabel={d('post')} allowQuote={false} draftKey={`${draftKey}:new`} files={files} onSubmit={draft => onPost(draft)} people={people} placeholder={d('composerHint')} />
    </div>
  </div>;
}
