import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useI18n } from "@/shared/i18n/I18nProvider";
import type { AiShortcutAttempt, AiTransferResult } from "@/features/ai-connection/components/AiConnectionDialog";
import { MessageSquare } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { TaskFileNode, TaskNode } from "@/shared/model/task-model";
import type { CollaborationMessage, DiscussionDraft } from "@/features/tasks/lib/task-collaboration";
import { buildDiscussionFeed } from "@/features/tasks/discussion/lib/discussion-feed";
import type { DiscussionAiTarget } from "@/features/tasks/discussion/lib/task-discussion-ai";
import { DiscussionComposer } from "@/features/tasks/discussion/components/DiscussionComposer";
import { TaskDiscussionMessage } from "@/features/tasks/discussion/components/TaskDiscussionMessage";
import type { DiscussionTaskLink } from "@/features/tasks/discussion/components/TaskDiscussionTaskLinks";
import type { DiscussionReferenceTask } from "@/features/tasks/discussion/lib/discussion-task-reference";
import { usePersonOptions } from "@/shared/ui/PersonDirectory";
import type { DiscussionDraftInsertion } from "@/features/tasks/discussion/lib/discussion-draft-insertion";
import { reportVisibleDiscussionRead } from "@/features/tasks/discussion/lib/discussion-read";
import { toast } from "@/shared/ui/toast";
import { splitPinnedMessages } from "@/features/tasks/discussion/lib/discussion-pins";
import { useDiscussionReactions } from "@/features/tasks/discussion/lib/useDiscussionReactions";

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
  onPreviewAttachment?: (file: TaskFileNode, trigger: HTMLElement) => void;
  onPost: (draft: DiscussionDraft, replyToActivityId?: string) => void | Promise<void>;
  onEdit?: (message: CollaborationMessage, draft: DiscussionDraft) => void | Promise<void>;
  onDelete?: (message: CollaborationMessage) => void;
  onCreateSubtask?: (message: CollaborationMessage, trigger: HTMLElement) => void;
  creatingSubtask?: boolean;
  retainedSubtaskSources?: NonNullable<TaskNode["sourceDiscussion"]>[];
  renderAfterMessage?: (message: CollaborationMessage) => ReactNode;
  people: string[];
  followupsByMessageId?: Readonly<Record<string, { tasks: DiscussionTaskLink[]; suggestionCount: number; hasOutdated?: boolean }>>;
  onOpenFollowupTask?: (taskId: string) => void;
  referenceTasks?: DiscussionReferenceTask[];
  onOpenReferenceTask?: (taskId: string) => void;
  renderSuggestions?: (messageId: string) => ReactNode;
  /** Where this discussion's pins and likes are kept. */
  teamId?: string;
  taskId?: string;
  /** The task owner, the team Owner and Admins may pin; participants may not. */
  canPin?: boolean;
};

type ComposerMode = { kind: "reply"; id: string } | null;
type ScrollRequest = { kind: "locate"; id: string } | { kind: "latest" } | { kind: "restore"; id: string; top: number };

export function TaskDiscussion({ active = true, readable = true, readRequestSequence, onRead, activities, attentionTarget, currentUser, currentUserName, files, draftKey = "task-discussion", draftInsertion, onConnectAi, onOpenFile, onPreviewAttachment, onPost, onDelete, onCreateSubtask, creatingSubtask = false, retainedSubtaskSources = [], renderAfterMessage, people, followupsByMessageId, onOpenFollowupTask, referenceTasks, onOpenReferenceTask, renderSuggestions, teamId = "", taskId = "", canPin = false }: TaskDiscussionProps) {
  const d = useDetailCopy();
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const followupPeople = usePersonOptions(people);
  const publishedFeed = useMemo(() => buildDiscussionFeed(activities), [activities]);
  const retainedMessageSnapshots = useRef(new Map<string, CollaborationMessage>());
  const { feed, unavailableSubtaskSources } = useMemo(() => {
    const messages = [...activities];
    const unavailableSubtaskSources = new Set<string>();
    const retainedIds = new Set(retainedSubtaskSources.map(source => source.messageId));
    for (const id of retainedMessageSnapshots.current.keys()) if (!retainedIds.has(id)) retainedMessageSnapshots.current.delete(id);
    for (const source of retainedSubtaskSources) {
      const index = messages.findIndex(message => message.id === source.messageId);
      const current = index >= 0 ? messages[index] : undefined;
      const snapshot = retainedMessageSnapshots.current.get(source.messageId) ?? current ?? {
        id: source.messageId, author: source.author, type: "member-post" as const, message: source.body, time: "",
      };
      retainedMessageSnapshots.current.set(source.messageId, snapshot);
      if (current && !current.deletedAt && ["member-post", "member-reply"].includes(current.type) && current.message === source.body && current.author === source.author) continue;
      unavailableSubtaskSources.add(source.messageId);
      const retained: CollaborationMessage = {
        ...snapshot, id: source.messageId, author: source.author, type: snapshot.type === "member-reply" ? "member-reply" : "member-post",
        message: "", file: undefined, attachmentRefs: [], deletedAt: undefined,
      };
      if (index >= 0) messages[index] = retained;
      else messages.push(retained);
    }
    return { feed: buildDiscussionFeed(messages), unavailableSubtaskSources };
  }, [activities, retainedSubtaskSources]);
  const reactions = useDiscussionReactions(teamId, taskId, publishedFeed.messages, currentUser);
  const { pinned: pinnedMessages, timeline: timelineMessages } = useMemo(() => splitPinnedMessages(feed.messages, reactions.pins), [feed.messages, reactions.pins]);
  const togglePin = (message: CollaborationMessage, pinned: boolean) => {
    const replaced = !pinned && pinnedMessages.length >= 3;
    if (!(pinned ? reactions.unpin(message.id) : reactions.pin(message.id))) { toast.error(locale === "en" ? "Could not update the pin. Please try again." : "置顶未能更新，请重试。"); return; }
    toast.success(pinned ? (locale === "en" ? "Unpinned" : "已取消置顶") : replaced ? (locale === "en" ? "Pinned. The earliest pin was replaced." : "已置顶，最早的置顶已被替换") : (locale === "en" ? "Pinned" : "已置顶"));
  };
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
  const readActivityIds = publishedFeed.messages.map(message => message.id);
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
          (record?.querySelector<HTMLElement>(".task-discussion-feed-menu-trigger") ?? messages.closest<HTMLElement>('[role="tabpanel"]'))?.focus({ preventScroll: true });
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
    if (submittingRef.current || creatingSubtask) return;
    const collapse = mode?.id === message.id;
    returnReplyFocusRef.current = collapse ? message.id : null;
    setMode(collapse ? null : { kind: "reply", id: message.id });
    setError("");
  };
  const startSubtask = (message: CollaborationMessage, trigger: HTMLElement) => {
    if (!readable || !onCreateSubtask || creatingSubtask || submittingRef.current || unavailableSubtaskSources.has(message.id)) return;
    returnReplyFocusRef.current = null;
    setMode(null);
    setError("");
    onCreateSubtask(message, trigger);
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
    <DiscussionComposer actionLabel={d('reply')} allowQuote={false} autoFocus={targetAvailable} disabled={!targetAvailable} draftKey={composerKey} files={files} onCancel={cancelContext} onPreviewAttachment={onPreviewAttachment} onSubmit={submit} people={people} placeholder={d(referenceTasks?.length ? 'taskReplyHint' : 'replyHint')} referenceTasks={referenceTasks} />
  </div>;

  const renderMessage = (message: CollaborationMessage, pinned: boolean) => {
          const sourceUnavailable = unavailableSubtaskSources.has(message.id);
          return <TaskDiscussionMessage taskId={taskId} pinned={pinned} onTogglePin={canPin && taskId ? () => togglePin(message, pinned) : undefined} likes={reactions.likes[message.id]} onToggleLike={taskId ? () => { if (!reactions.toggleLike(message.id)) toast.error(locale === "en" ? "Could not save your like. Please try again." : "未能保存赞，请重试。"); } : undefined} followupPeople={followupPeople} followups={followupsByMessageId?.[message.id]} onOpenFollowupTask={onOpenFollowupTask} referenceTasks={referenceTasks} onOpenReferenceTask={onOpenReferenceTask} renderSuggestions={renderSuggestions ? () => renderSuggestions(message.id) : undefined} currentUser={currentUser} currentUserName={currentUserName} files={files} highlighted={message.id === highlightedActivityId} key={message.id} message={message} now={now} onConnectAi={sourceUnavailable ? undefined : onConnectAi} onDelete={!sourceUnavailable && onDelete ? item => { try { onDelete(item); setError(""); } catch { setError(d('deleteFailed')); } } : undefined} onCreateSubtask={!sourceUnavailable && readable && onCreateSubtask ? startSubtask : undefined} subtaskCreateDisabled={creatingSubtask || submitting} onLocate={locate} onOpenFile={onOpenFile} onReply={startReply} parent={message.replyToActivityId ? records.get(message.replyToActivityId) : undefined} replyDisabled={submitting || creatingSubtask || sourceUnavailable} replyExpanded={!creatingSubtask && mode?.id === message.id}>
            {sourceUnavailable && <p className="task-discussion-feed-error" role="alert">{locale === "en" ? "The source discussion changed or was deleted. Your subtask draft has been kept. Check the latest discussion." : "来源讨论已变更或删除，子任务草稿已保留，请核对最新讨论。"}</p>}
            {!creatingSubtask && mode?.id === message.id ? replyComposer : undefined}
            {renderAfterMessage?.(message)}
          </TaskDiscussionMessage>;
        };

  return <div className="task-discussion task-discussion-feed">
    <div className="task-discussion-scroll" ref={scrollRef}>
      {error && <p className="task-discussion-feed-error" role="alert">{error}</p>}
      {feed.messages.length === 0 ? <div className="task-record-empty"><MessageSquare aria-hidden="true" size={22} /><strong>{d('noDiscussion')}</strong><p>{d('discussionHint')}</p></div>
        : <>{pinnedMessages.length > 0 && <ol aria-label={locale === "en" ? "Pinned messages" : "已置顶的讨论"} className="task-discussion-feed-list task-discussion-pinned-list">{pinnedMessages.map(message => renderMessage(message, true))}</ol>}
          {timelineMessages.length > 0 && <ol aria-label={d('taskDiscussion')} className="task-discussion-feed-list">{timelineMessages.map(message => renderMessage(message, false))}</ol>}</>}
      {!creatingSubtask && mode && !targetAvailable && replyComposer}
    </div>
    {!mode && !creatingSubtask && <div className="task-discussion-compose" ref={composerRef}>
      <div className="task-discussion-compose-content">
        <DiscussionComposer actionLabel={d('post')} allowQuote={false} draftInsertion={draftInsertion} draftKey={composerKey} files={files} onPreviewAttachment={onPreviewAttachment} onSubmit={submit} people={people} placeholder={d(referenceTasks?.length ? 'taskCommentHint' : 'composerHint')} referenceTasks={referenceTasks} />
      </div>
    </div>}
  </div>;
}
