import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import type { AiShortcutAttempt, AiTransferResult } from "@/features/ai-connection/components/AiConnectionDialog";
import { MessageSquare } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TaskFileNode } from "@/shared/model/task-model";
import type { CollaborationMessage, DiscussionDraft } from "@/features/tasks/lib/task-collaboration";
import { buildDiscussionFeed } from "@/features/tasks/discussion/lib/discussion-feed";
import type { DiscussionAiTarget } from "@/features/tasks/discussion/lib/task-discussion-ai";
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import { DiscussionComposer } from "@/features/tasks/discussion/components/DiscussionComposer";
import { TaskDiscussionMessage } from "@/features/tasks/discussion/components/TaskDiscussionMessage";
import type { DiscussionDraftInsertion } from "@/features/tasks/discussion/lib/discussion-draft-insertion";
import { reportVisibleDiscussionRead } from "@/features/tasks/discussion/lib/discussion-read";
import { toast } from "@/shared/ui/toast";

type TaskDiscussionProps = {
  active?: boolean;
  readable?: boolean;
  readRequestSequence?: number;
  onRead?: (activityIds: string[], readThrough: string) => void;
  activities: CollaborationMessage[];
  attentionTarget?: { id: string; sequence: number };
  currentUser: string;
  currentUserName?: string;
  files: TaskFileNode[];
  draftKey?: string;
  draftInsertion?: DiscussionDraftInsertion;
  onConnectAi?: (target: DiscussionAiTarget, trigger: HTMLElement, shortcut?: AiShortcutAttempt) => void | Promise<AiTransferResult | void>;
  onOpenFile: (fileId: string, version?: number) => void;
  onPost: (draft: DiscussionDraft, replyToActivityId?: string) => void | Promise<void>;
  onEdit?: (message: CollaborationMessage, draft: DiscussionDraft) => void | Promise<void>;
  onDelete?: (message: CollaborationMessage) => void;
  people: string[];
};

type ComposerMode = { kind: "reply"; id: string } | null;
type ScrollRequest = { kind: "locate"; id: string } | { kind: "latest" } | { kind: "restore"; id: string; top: number };

export function TaskDiscussion({ active = true, readable = true, readRequestSequence, onRead, activities, attentionTarget, currentUser, currentUserName, files, draftKey = "task-discussion", draftInsertion, onConnectAi, onOpenFile, onPost, onDelete, people }: TaskDiscussionProps) {
  const d = useDetailCopy();
  const ui = useGlobalUi();
  const feed = useMemo(() => buildDiscussionFeed(activities), [activities]);
  const records = useMemo(() => {
    const messages = new Map<string, CollaborationMessage>();
    for (const message of activities) {
      if ((message.type === "member-post" || message.type === "member-reply") && !messages.has(message.id)) messages.set(message.id, message);
    }
    return messages;
  }, [activities]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const inlineReplyRef = useRef<HTMLDivElement>(null);
  const returnReplyFocusRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const [mode, setMode] = useState<ComposerMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scrollRequest, setScrollRequest] = useState<ScrollRequest | null>(null);
  const [highlightedActivityId, setHighlightedActivityId] = useState<string | null>(null);
  const [highlightSequence, setHighlightSequence] = useState(0);
  const [error, setError] = useState("");
  const [, refreshClock] = useState(0);
  const now = Date.now();
  const composerTarget = mode ? records.get(mode.id) : undefined;
  const targetAvailable = Boolean(composerTarget && !composerTarget.deletedAt);
  const replyId = mode?.id;
  const insertionIdRef = useRef<string | undefined>(undefined);
  const readCallbackRef = useRef(onRead);
  readCallbackRef.current = onRead;
  const readActivityIds = feed.messages.map(message => message.id);
  const readActivitySignature = JSON.stringify(readActivityIds);
  const readActivityIdsRef = useRef(readActivityIds);
  readActivityIdsRef.current = readActivityIds;
  const reportRead = useCallback((source?: HTMLElement | null) => reportVisibleDiscussionRead({
    active, readable, content: scrollRef.current, source, visibilityState: document.visibilityState,
    activityIds: readActivityIdsRef.current, onRead: readCallbackRef.current,
  }), [active, readable]);
  useEffect(() => {
    if (!active || !readable || !readCallbackRef.current) return;
    let frame = 0;
    const report = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        reportRead();
      });
    };
    report();
    document.addEventListener("visibilitychange", report);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", report); };
  }, [reportRead, readActivitySignature, readRequestSequence]);

  useEffect(() => {
    if (!draftInsertion || insertionIdRef.current === draftInsertion.id) return;
    insertionIdRef.current = draftInsertion.id;
    setMode(null);
    setError("");
  }, [draftInsertion?.id]);

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
    const revealReply = () => {
      const messages = scrollRef.current;
      if (!messages) return;
      if (!mode) {
        const id = returnReplyFocusRef.current;
        returnReplyFocusRef.current = null;
        if (id) {
          const record = [...messages.querySelectorAll<HTMLElement>('[id]')].find(element => element.id === `task-activity-${id}`);
          (record?.querySelector<HTMLElement>(".task-discussion-feed-reply") ?? messages.closest<HTMLElement>('[role="tabpanel"]'))?.focus({ preventScroll: true });
        }
        return;
      }
      const inline = inlineReplyRef.current;
      const detail = messages.closest<HTMLElement>(".task-detail-split");
      if (!inline || !detail || messages.closest<HTMLElement>('[hidden]')) return;
      const bounds = detail.getBoundingClientRect();
      const styles = window.getComputedStyle(detail);
      const topInset = (parseFloat(styles.getPropertyValue("--task-detail-summary-height")) || 52) + (parseFloat(styles.getPropertyValue("--task-detail-tabs-height")) || 54) + 12;
      const viewport = window.visualViewport;
      const visibleTop = Math.max(bounds.top + topInset, viewport?.offsetTop ?? 0);
      const visibleBottom = Math.min(bounds.bottom, (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight)) - 12;
      const rect = inline.getBoundingClientRect();
      const delta = rect.bottom > visibleBottom ? rect.bottom - visibleBottom : rect.top < visibleTop ? rect.top - visibleTop : 0;
      if (delta) detail.scrollTop += delta;
    };
    const frame = window.requestAnimationFrame(revealReply);
    const keepFocusedReplyVisible = () => {
      if (inlineReplyRef.current?.contains(document.activeElement)) revealReply();
    };
    window.visualViewport?.addEventListener("resize", keepFocusedReplyVisible);
    return () => {
      window.cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener("resize", keepFocusedReplyVisible);
    };
  }, [mode?.id, targetAvailable]);
  useEffect(() => {
    if (!scrollRequest) return;
    const frame = window.requestAnimationFrame(() => {
      const messages = scrollRef.current;
      if (!messages) return;
      const detail = messages.closest<HTMLElement>(".task-detail-split");
      const scroller = detail ?? messages;
      if (scrollRequest.kind === "restore") {
        const target = [...messages.querySelectorAll<HTMLElement>('[id]')].find(element => element.id === `task-activity-${scrollRequest.id}`);
        if (target) scroller.scrollTop += target.getBoundingClientRect().top - scrollRequest.top;
      } else if (scrollRequest.kind === "locate") {
        const target = [...messages.querySelectorAll<HTMLElement>('[id]')].find(element => element.id === `task-activity-${scrollRequest.id}`);
        if (target) {
          const styles = detail && window.getComputedStyle(detail);
          const topInset = styles ? (parseFloat(styles.getPropertyValue("--task-detail-summary-height")) || 52) + (parseFloat(styles.getPropertyValue("--task-detail-tabs-height")) || 54) + 16 : 0;
          const bottomInset = detail ? composerRef.current?.offsetHeight ?? 0 : 0;
          const readingHeight = Math.max(0, scroller.clientHeight - topInset - bottomInset);
          const top = scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - topInset - Math.max(0, (readingHeight - target.offsetHeight) / 2);
          scroller.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? "instant" : "smooth" });
          target.focus({ preventScroll: true });
          reportRead(target);
        } else setError(d('originalError'));
      } else {
        scroller.scrollTop = 0;
      }
      setScrollRequest(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scrollRequest, feed.messages.length, reportRead]);
  const startReply = (message: CollaborationMessage) => {
    if (submittingRef.current) return;
    if (mode?.id === message.id) inlineReplyRef.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus({ preventScroll: true });
    returnReplyFocusRef.current = null;
    setMode({ kind: "reply", id: message.id });
    setError("");
  };
  const cancelContext = () => {
    if (submittingRef.current) return;
    returnReplyFocusRef.current = mode?.id ?? null;
    setMode(null);
  };
  const submit = async (draft: DiscussionDraft) => {
    if (mode && !targetAvailable) throw new Error(d('originalUnavailable'));
    if (submittingRef.current) return;
    const anchor = replyId ? [...(scrollRef.current?.querySelectorAll<HTMLElement>('[id]') ?? [])].find(element => element.id === `task-activity-${replyId}`) : undefined;
    const anchorTop = anchor?.getBoundingClientRect().top;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onPost(draft, replyId);
      returnReplyFocusRef.current = replyId ?? null;
      setMode(current => current?.id === replyId ? null : current);
      if (replyId) {
        if (anchorTop !== undefined) setScrollRequest({ kind: "restore", id: replyId, top: anchorTop });
        toast.success(ui("回复已发送"));
      } else setScrollRequest({ kind: "latest" });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  const composerKey = replyId ? `${draftKey}:reply:${replyId}` : `${draftKey}:new`;
  const replyComposer = mode && <div className="task-discussion-inline-reply" data-reply-to={mode.id} ref={inlineReplyRef}>
    {!targetAvailable && <p className="task-discussion-feed-error" role="alert">{d('originalUnavailable')}</p>}
    <DiscussionComposer actionLabel={d('reply')} allowQuote={false} autoFocus={targetAvailable} disabled={!targetAvailable} draftKey={composerKey} files={files} onCancel={cancelContext} onSubmit={submit} people={people} placeholder={d('replyHint')} />
  </div>;

  return <div className="task-discussion task-discussion-feed">
    <div className="task-discussion-scroll" ref={scrollRef}>
      {error && <p className="task-discussion-feed-error" role="alert">{error}</p>}
      {feed.messages.length === 0 ? <div className="task-record-empty"><MessageSquare aria-hidden="true" size={22} /><strong>{d('noDiscussion')}</strong><p>{d('discussionHint')}</p></div>
        : <ol aria-label={d('taskDiscussion')} className="task-discussion-feed-list">{feed.messages.map(message => <TaskDiscussionMessage currentUser={currentUser} currentUserName={currentUserName} files={files} highlighted={message.id === highlightedActivityId} key={message.id} message={message} now={now} onConnectAi={onConnectAi} onDelete={onDelete ? item => { try { onDelete(item); setError(""); } catch { setError(d('deleteFailed')); } } : undefined} onLocate={locate} onOpenFile={onOpenFile} onReply={startReply} parent={message.replyToActivityId ? records.get(message.replyToActivityId) : undefined} replyDisabled={submitting} replyExpanded={mode?.id === message.id}>{mode?.id === message.id ? replyComposer : undefined}</TaskDiscussionMessage>)}</ol>}
      {mode && !targetAvailable && replyComposer}
    </div>
    {!mode && <div className="task-discussion-compose" ref={composerRef}>
      <PersonAvatar name={currentUserName ?? currentUser} personId={currentUser} size="sm" />
      <div className="task-discussion-compose-content">
        <DiscussionComposer actionLabel={d('post')} allowQuote={false} draftInsertion={draftInsertion} draftKey={composerKey} files={files} onSubmit={submit} people={people} placeholder={d('composerHint')} />
      </div>
    </div>}
  </div>;
}
