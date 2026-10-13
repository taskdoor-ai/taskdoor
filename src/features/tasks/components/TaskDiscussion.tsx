import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { contentReading, useMockText } from "@/ai/discussion-reading";
import type { AiShortcutAttempt, AiTransferResult } from "@/features/ai-connection/components/AiConnectionDialog";
import { MessageSquare, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { TaskFileNode } from "@/shared/model/task-model";
import type { CollaborationMessage, DiscussionDraft } from "@/features/tasks/lib/task-collaboration";
import { buildDiscussionFeed } from "@/features/tasks/discussion/lib/discussion-feed";
import type { DiscussionAiTarget } from "@/features/tasks/discussion/lib/task-discussion-ai";
import { PersonAvatar, PersonName } from "@/shared/ui/PersonAvatar";
import { DiscussionComposer } from "@/features/tasks/discussion/components/DiscussionComposer";
import { TaskDiscussionMessage } from "@/features/tasks/discussion/components/TaskDiscussionMessage";

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

type ComposerMode = { kind: "reply"; id: string } | null;
type ScrollRequest = { kind: "locate"; id: string } | { kind: "latest" };

export function TaskDiscussion({ activities, attentionTarget, currentUser, currentUserName, files, draftKey = "task-discussion", onConnectAi, onOpenFile, onPost, onDelete, people }: TaskDiscussionProps) {
  const d = useDetailCopy();
  const { locale, autoTranslate } = useI18n();
  const mock = useMockText();
  const feed = useMemo(() => buildDiscussionFeed(activities), [activities]);
  const records = useMemo(() => {
    const messages = new Map<string, CollaborationMessage>();
    for (const message of activities) {
      if (!message.fileThreadId && (message.type === "member-post" || message.type === "member-reply") && !messages.has(message.id)) messages.set(message.id, message);
    }
    return messages;
  }, [activities]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ComposerMode>(null);
  const [scrollRequest, setScrollRequest] = useState<ScrollRequest | null>(null);
  const [highlightedActivityId, setHighlightedActivityId] = useState<string | null>(null);
  const [highlightSequence, setHighlightSequence] = useState(0);
  const [error, setError] = useState("");
  const [, refreshClock] = useState(0);
  const now = Date.now();
  const composerTarget = mode ? records.get(mode.id) : undefined;
  const targetAvailable = Boolean(composerTarget && !composerTarget.deletedAt);
  const replyId = targetAvailable ? composerTarget?.id : undefined;

  const locate = (id: string) => {
    if (!feed.messages.some(message => message.id === id)) { setError(d('originalError')); return; }
    setError("");
    setScrollRequest({ kind: "locate", id });
    setHighlightedActivityId(null);
  };
  useEffect(() => {
    if (!attentionTarget) return;
    if (!feed.messages.some(message => message.id === attentionTarget.id)) { setError(d('originalError')); return; }
    setScrollRequest({ kind: "locate", id: attentionTarget.id });
    setHighlightedActivityId(attentionTarget.id);
    setHighlightSequence(sequence => sequence + 1);
  }, [attentionTarget?.id, attentionTarget?.sequence]);
  useEffect(() => {
    if (!highlightedActivityId) return;
    const timer = window.setTimeout(() => setHighlightedActivityId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [highlightedActivityId, highlightSequence]);
  useEffect(() => {
    const timer = window.setInterval(() => refreshClock(tick => tick + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!scrollRequest) return;
    const frame = window.requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      if (!scroller) return;
      if (scrollRequest.kind === "locate") {
        const target = [...scroller.querySelectorAll<HTMLElement>('[id]')].find(element => element.id === `task-activity-${scrollRequest.id}`);
        if (target) {
          const top = scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - (scroller.clientHeight - target.offsetHeight) / 2;
          scroller.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? "instant" : "smooth" });
          target.focus({ preventScroll: true });
        } else setError(d('originalError'));
      } else {
        scroller.scrollTop = 0;
      }
      setScrollRequest(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scrollRequest, feed.messages.length]);
  const startReply = (message: CollaborationMessage) => { setMode({ kind: "reply", id: message.id }); setError(""); };
  const cancelContext = () => setMode(null);
  const submit = async (draft: DiscussionDraft) => {
    if (mode && !targetAvailable) throw new Error(d('originalUnavailable'));
    await onPost(draft, replyId);
    setMode(null);
    setScrollRequest({ kind: "latest" });
  };
  const contextSummary = composerTarget && !composerTarget.deletedAt
    ? contentReading(composerTarget.message, mock.discussionTranslation(composerTarget.message), locale, autoTranslate && !composerTarget.updatedAt, false).text.replace(/\s+/g, ' ').trim() || composerTarget.attachmentRefs?.map(ref => ref.name).join('、') || composerTarget.file || d('attachments')
    : d('originalUnavailable');
  const composerKey = replyId ? `${draftKey}:reply:${replyId}` : `${draftKey}:new`;

  return <div className="task-discussion task-discussion-feed">
    <div className="task-discussion-scroll" ref={scrollRef}>
      {error && <p className="task-discussion-feed-error" role="alert">{error}</p>}
      {feed.messages.length === 0 ? <div className="task-record-empty"><MessageSquare aria-hidden="true" size={22} /><strong>{d('noDiscussion')}</strong><p>{d('discussionHint')}</p></div>
        : <ol aria-label={d('taskDiscussion')} className="task-discussion-feed-list">{feed.messages.map(message => <TaskDiscussionMessage currentUser={currentUser} currentUserName={currentUserName} files={files} highlighted={message.id === highlightedActivityId} key={message.id} message={message} now={now} onConnectAi={onConnectAi} onDelete={onDelete ? item => { try { onDelete(item); setError(""); } catch { setError(d('deleteFailed')); } } : undefined} onLocate={locate} onOpenFile={onOpenFile} onReply={startReply} parent={message.replyToActivityId ? records.get(message.replyToActivityId) : undefined} />)}</ol>}
    </div>
    <div className="task-discussion-compose">
      <PersonAvatar name={currentUserName ?? currentUser} personId={currentUser} size="sm" />
      <div className="task-discussion-compose-content">
        {(mode || composerTarget) && <div className="task-discussion-reply-context">
          <button className="task-discussion-reply-summary" disabled={!targetAvailable} onClick={() => composerTarget && locate(composerTarget.id)} title={contextSummary} type="button">
            <span className="task-discussion-reply-label">{d('reply')}{composerTarget && <> <PersonName name={composerTarget.author} personId={composerTarget.author} showProfilePreview={false} /></>}</span><span>{contextSummary}</span>
          </button>
          <button aria-label={d('cancelReply')} className="task-discussion-reply-cancel" onClick={cancelContext} type="button"><X aria-hidden="true" size={15} /></button>
        </div>}
        <DiscussionComposer actionLabel={replyId ? d('reply') : d('post')} allowQuote={false} autoFocus={Boolean(mode)} disabled={Boolean(mode && !targetAvailable)} draftKey={composerKey} files={files} onSubmit={submit} people={people} placeholder={replyId ? d('replyHint') : d('composerHint')} />
      </div>
    </div>
  </div>;
}
