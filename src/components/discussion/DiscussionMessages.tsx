import { useI18n } from '../../i18n/I18nProvider';
import { contentReading } from '../../i18n/contentReading';
import { useGlobalUi } from "../../i18n/globalUi";
import { useDetailCopy } from "../../i18n/detailMessages";
import { useMockText } from "../../i18n/MockDataProvider";
import type { AiShortcutAttempt, AiTransferResult } from "../AiConnectionDialog";
import { FileText, Quote, X } from "lucide-react";
import React, { useEffect, useId, useRef, useState } from "react";
import type { TaskFileNode } from "../../data/taskDetailMocks";
import type { CollaborationMessage, DiscussionDraft } from "../../lib/taskCollaboration";
import type { DiscussionAiTarget } from "../../lib/taskDiscussionAi";
import { PersonAvatar, PersonName } from "../PersonAvatar";
import { usePersonOptions } from "../PersonDirectory";
import { AiConnectionButton } from "../AiConnectionButton";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { DiscussionComposer } from "./DiscussionComposer";

type Props = {
  messages: CollaborationMessage[];
  allMessages?: CollaborationMessage[];
  files: TaskFileNode[];
  people: string[];
  currentUser: string;
  currentUserName?: string;
  draftKey: string;
  onPost: (draft: DiscussionDraft, replyToId: string) => void | Promise<void>;
  onEdit?: (message: CollaborationMessage, draft: DiscussionDraft) => void | Promise<void>;
  onDelete?: (message: CollaborationMessage) => void;
  onOpenFile: (id: string, version?: number) => void;
  onConnectAi?: (target: DiscussionAiTarget, trigger: HTMLElement, shortcut?: AiShortcutAttempt) => void | Promise<AiTransferResult | void>;
  highlightedId?: string | null;
  compact?: boolean;
  allowQuote?: boolean;
};

function MessageText({ message, text }: { message: CollaborationMessage; text: string }) {
  const mentioned = usePersonOptions(message.mentionedPrincipalIds ?? []);
  const names = new Map(mentioned.flatMap(person => [[`@${person.name}`, person.id], [`@${person.id}`, person.id]]));
  if (!names.size) return <>{text}</>;
  const pattern = new RegExp(`(${[...names.keys()].sort((a, b) => b.length - a.length).map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return <>{text.split(pattern).map((part, index) => names.has(part) ? <span className="discussion-saved-mention" key={index}>@<PersonName name={part.slice(1)} personId={names.get(part)!} /></span> : part)}</>;
}

const messageTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function messageTimestamp(message: CollaborationMessage) {
  // Legacy records may contain an absolute label; never infer a date from "刚刚" or "N 分钟前".
  const recorded = message.createdAt ?? (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(message.time) ? `${message.time.replace(" ", "T")}+08:00` : "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(recorded) || !Number.isFinite(Date.parse(recorded))) return null;
  const date = new Date(recorded);
  const parts = messageTimeFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value;
  return { dateTime: date.toISOString(), label: `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}` };
}

function messageSummary(message: CollaborationMessage, mock: ReturnType<typeof useMockText>, ui: ReturnType<typeof useGlobalUi>) {
  const body = (message.updatedAt ? message.message : mock.text(message.message)).replace(/\s+/g, " ").trim();
  const attachmentNames = message.attachmentRefs?.map(ref => mock.text(ref.name)).join(", ") || (message.file ? mock.text(message.file) : "");
  const summary = body || (attachmentNames ? ui("附件：{0}", {0: attachmentNames}) : ui("（无文字内容）"));
  return summary.length > 160 ? `${summary.slice(0, 160)}…` : summary;
}

function ReplyContext({ message }: { message: CollaborationMessage | undefined }) {
  const mock = useMockText();
  const ui = useGlobalUi();
  const d = useDetailCopy();
  return <>{d('reply')}{message && <><PersonName name={message.author} personId={message.author} />：</>}{!message ? d('originalMissing') : message.deletedAt ? d('originalDeleted') : messageSummary(message, mock, ui)}</>;
}

export function ReplyReference({ message, onLocate }: { message: CollaborationMessage | undefined; onLocate: (id: string) => void }) {
  const d = useDetailCopy();
  const [open, setOpen] = useState(false);
  const pointerType = useRef("");
  const available = Boolean(message && !message.deletedAt);
  const locate = () => { if (message && available) { setOpen(false); onLocate(message.id); } };
  return <Popover onOpenChange={setOpen} open={open}>
    <PopoverTrigger aria-label={available ? d('viewOriginal') : d('originalUnavailable')} className="discussion-reference-icon" closeDelay={150} delay={150}
      onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setOpen(true); }}
      onPointerDown={event => { pointerType.current = event.pointerType; }}
      onClick={event => { if (available && (event.detail === 0 || pointerType.current !== "touch")) { event.preventDefault(); locate(); } }} openOnHover type="button"><Quote aria-hidden="true" size={13} /></PopoverTrigger>
    <PopoverContent aria-label={d('replyOriginal')} className="discussion-reference-popover" finalFocus={false} initialFocus={false}>
      <p><ReplyContext message={message} /></p>
      {available && <button onClick={locate} type="button">{d('locateOriginal')}</button>}
    </PopoverContent>
  </Popover>;
}

export function DiscussionMessages({ messages, allMessages = messages, files, people, currentUser, currentUserName, draftKey, onPost, onEdit, onDelete, onOpenFile, onConnectAi, highlightedId, compact, allowQuote = true }: Props) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const { locale, autoTranslate } = useI18n();
  const [originalMessages, setOriginalMessages] = useState<Set<string>>(() => new Set());
  const [reply, setReply] = useState<{ id: string; quoted: boolean } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"collapsed" | "expanded">("collapsed");
  const [error, setError] = useState("");
  const [jumpTarget, setJumpTarget] = useState<string | null>(null);
  const listId = useId();
  const rootId = messages[0]?.id;
  const visibleMessages = messages.filter(message => !message.deletedAt);
  const replies = visibleMessages.filter(message => message.id !== rootId);
  const root = visibleMessages.find(message => message.id === rootId);
  const highlightedReplyId = replies.find(message => message.id === highlightedId)?.id;
  useEffect(() => {
    if (highlightedReplyId) setVisibility("expanded");
  }, [highlightedReplyId]);
  const jumpTo = (id: string) => {
    setError("");
    setVisibility("expanded");
    setJumpTarget(id);
  };
  useEffect(() => {
    if (!jumpTarget) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(`task-activity-${jumpTarget}`);
      if (target) {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ block: "center", behavior: reducedMotion ? "instant" : "smooth" });
        target.focus({ preventScroll: true });
      } else setError(d('originalError'));
      setJumpTarget(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [jumpTarget]);
  const replyControls = replies.length > 0 && <div className="discussion-replies-controls">
      <button aria-controls={listId} aria-expanded={visibility === "expanded"} className={visibility === "expanded" ? "discussion-collapse" : "discussion-expand"} onClick={event => {
        event.currentTarget.focus();
        setVisibility(visibility === "expanded" ? "collapsed" : "expanded");
      }} type="button">{visibility === "expanded" ? d('collapseReplies') : ` ${d("replies")} (${replies.length})`}</button>
    </div>;
  const mock = useMockText();
  const renderMessage = (message: CollaborationMessage) => {
      const isReply = message.id !== rootId;
      const own = message.author === currentUser || message.author === currentUserName;
      const parent = allMessages.find(item => item.id === message.replyToActivityId);
      const quoted = message.quote ? allMessages.find(item => item.id === message.quote!.messageId) : undefined;
      const refs = message.attachmentRefs ?? [];
      const legacyFile = !refs.length && message.file ? files.find(file => file.kind === "file" && !file.archived && file.name === message.file) : undefined;
      const attachments = refs.map(ref => files.find(file => file.id === ref.fileId && !file.archived)).filter((file): file is TaskFileNode => Boolean(file));
      const timestamp = messageTimestamp(message);
      const readingKey = JSON.stringify([message.id, message.updatedAt, message.message, locale]);
      const candidate = message.updatedAt ? message.message : mock.originalRecord(message.message);
      const reading = contentReading(message.message, candidate, locale, autoTranslate, originalMessages.has(readingKey));
      const toggleOriginal = () => setOriginalMessages(previous => { const next = new Set(previous); if (next.has(readingKey)) next.delete(readingKey); else next.add(readingKey); return next; });
      return <li className={isReply ? "discussion-message is-reply" : "discussion-message"} key={message.id}>
        <PersonAvatar name={message.author} personId={message.author} size={compact || isReply ? "xs" : "sm"} />
        <div className={`task-discussion-record${highlightedId === message.id ? " is-attention" : ""}`} id={`task-activity-${message.id}`} tabIndex={-1}>
          <header><span className="discussion-message-authors"><strong><PersonName name={message.author} personId={message.author} /></strong>
            {message.replyToActivityId && <ReplyReference message={parent} onLocate={jumpTo} />}
          </span>
            {onConnectAi && !isReply && <AiConnectionButton compact contextLabel={ui("{0}的讨论", {0: message.author})} onConnect={(trigger, shortcut) => onConnectAi({ kind: message.replyToActivityId ? "reply" : "discussion", activityId: message.id }, trigger, shortcut)} />}
          </header>
          {editing === message.id ? <DiscussionComposer actionLabel={d('save')} allowQuote={allowQuote} autoFocus compact draftKey={`${draftKey}:edit:${message.id}`} files={files} initialValue={{ body: message.message, mentions: message.mentionedPrincipalIds ?? [], attachments, quote: allowQuote && !quoted?.deletedAt ? message.quote : undefined }} onCancel={() => setEditing(null)} onSubmit={async draft => { await onEdit?.(message, { ...draft, quote: allowQuote ? draft.quote : undefined }); setEditing(null); }} people={people} /> : <>
            {allowQuote && message.quote && message.quote.messageId !== message.replyToActivityId && (quoted && !quoted.deletedAt
              ? <button className="discussion-inline-quote" onClick={() => jumpTo(quoted.id)} type="button"><PersonName name={quoted.author} personId={quoted.author} />：{message.quote.text}</button>
              : <div className="discussion-inline-quote is-unavailable">{quoted?.deletedAt ? d('quoteDeleted') : d('quoteUnavailable')}</div>)}
            <p className="task-discussion-message"><MessageText message={message} text={reading.text} /></p>
            {(refs.length > 0 || message.file) && <div className="discussion-attachments">{refs.map(ref => {
              const file = files.find(file => file.id === ref.fileId && !file.archived);
              return <button className="task-record-file-link" disabled={!file} key={ref.fileId} onClick={() => onOpenFile(ref.fileId, ref.version)} type="button"><FileText size={15} /><span>{mock.text(ref.name)}</span><small>{file ? `v${ref.version}` : d('fileRemoved')}</small></button>;
            })}{!refs.length && message.file && <button className="task-record-file-link" disabled={!legacyFile} onClick={() => legacyFile && onOpenFile(legacyFile.id)} type="button"><FileText size={15} /><span>{mock.text(message.file)}</span>{!legacyFile && <small>{d('unavailable')}</small>}</button>}</div>}
          </>}
          <div className="discussion-message-footer">
            {(timestamp || message.updatedAt || reading.state !== "same" || (!isReply && !compact && replyControls)) && <div className="discussion-message-meta">
              {timestamp && <time dateTime={timestamp.dateTime}>{timestamp.label}</time>}
              {editing !== message.id && (reading.state === 'translated' || reading.state === 'original') && <span className="content-translation-control"><span>{reading.state === 'translated' ? ui('已翻译') : ui('原文')}</span><span aria-hidden="true"> · </span><button type="button" aria-label={reading.state === 'translated' ? ui('查看原文') : ui('显示译文')} onClick={toggleOriginal}>{reading.state === 'translated' ? ui('查看原文') : ui('显示译文')}</button></span>}
              {editing !== message.id && reading.state === 'unavailable' && <small className="content-translation-unavailable" title={ui('本地演示尚无此内容的译文，原文已保留。')}>{ui('暂无译文')}</small>}
              {editing === message.id && <small>{ui('正在编辑原文')}</small>}
              {message.updatedAt && <small>{d('edited')}</small>}
              {!isReply && !compact && replyControls}
            </div>}
            {editing !== message.id && <div className="task-discussion-actions">
              <button aria-expanded={reply?.id === message.id} onClick={() => setReply(reply?.id === message.id ? null : { id: message.id, quoted: false })} type="button">{d('reply')}</button>
              {allowQuote && <button onClick={() => setReply({ id: message.id, quoted: true })} type="button"><Quote size={13} />{d('quote')}</button>}
              {own && onEdit && <button onClick={() => setEditing(message.id)} type="button">{d('edit')}</button>}
              {own && onDelete && <button onClick={() => { try { onDelete(message); setError(""); } catch (failure) { setError(failure instanceof Error ? failure.message : d('deleteFailed')); } }} type="button">{d('delete')}</button>}
            </div>}
          </div>
          {reply?.id === message.id && <div className="task-discussion-reply-compose">
            <div className="discussion-composer-context"><span><ReplyContext message={message} /></span><button aria-label={d('cancelReply')} onClick={() => setReply(null)} title={d('cancelReply')} type="button"><X aria-hidden="true" size={14} /></button></div>
            <DiscussionComposer actionLabel={d('reply')} allowQuote={allowQuote} autoFocus compact showShortcutHint={false} draftKey={`${draftKey}:reply:${message.id}`} files={files} onCancel={() => setReply(null)} onConnectAi={onConnectAi ? (draft, trigger) => onConnectAi({ kind: "reply-draft", activityId: message.id, draft }, trigger) : undefined} onSubmit={async draft => { await onPost({ ...draft, quote: allowQuote && reply.quoted ? { messageId: message.id, text: message.message.slice(0, 300), author: message.author } : undefined }, message.id); setVisibility("expanded"); setReply(null); }} people={people} placeholder={d('replyHint')} />
          </div>}
        </div>
      </li>;
  };
  return <div className={`discussion-messages${compact ? " is-compact" : ""}`}>
    {error && <p className="discussion-message-error" role="alert">{error}</p>}
    {root && <ol aria-label={d('discussionContent')}>{renderMessage(root)}</ol>}
    {(!root || compact) && replyControls}
    <ol aria-label={d('replies')} hidden={visibility === "collapsed"} id={listId}>{replies.map(renderMessage)}</ol>
  </div>;
}
