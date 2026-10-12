import { useState } from "react";
import { FileText, MessageSquareText } from "lucide-react";
import { contentReading, useMockText } from "@/ai/discussion-reading";
import { AiConnectionButton } from "@/features/ai-connection/components/AiConnectionButton";
import type { AiShortcutAttempt, AiTransferResult } from "@/features/ai-connection/components/AiConnectionDialog";
import type { DiscussionAiTarget } from "@/features/tasks/discussion/lib/task-discussion-ai";
import { relativeTaskTime } from "@/features/tasks/lib/relative-time";
import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useI18n } from "@/shared/i18n/I18nProvider";
import type { TaskFileNode } from "@/shared/model/task-model";
import { PersonAvatar, PersonName } from "@/shared/ui/PersonAvatar";
import { usePersonOptions } from "@/shared/ui/PersonDirectory";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

type TaskDiscussionMessageProps = {
  message: CollaborationMessage;
  parent?: CollaborationMessage;
  currentUser: string;
  currentUserName?: string;
  files: TaskFileNode[];
  highlighted?: boolean;
  onReply: (message: CollaborationMessage) => void;
  onLocate: (id: string) => void;
  onDelete?: (message: CollaborationMessage) => void;
  onOpenFile: (id: string, version?: number) => void;
  onConnectAi?: (target: DiscussionAiTarget, trigger: HTMLElement, shortcut?: AiShortcutAttempt) => void | Promise<AiTransferResult | void>;
  now: number;
};

function MessageText({ message, text }: { message: CollaborationMessage; text: string }) {
  const mentioned = usePersonOptions(message.mentionedPrincipalIds ?? []);
  const names = new Map(mentioned.flatMap(person => [[`@${person.name}`, person.id], [`@${person.id}`, person.id]]));
  if (!names.size) return <>{text}</>;
  const pattern = new RegExp(`(${[...names.keys()].sort((a, b) => b.length - a.length).map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return <>{text.split(pattern).map((part, index) => names.has(part)
    ? <span className="discussion-saved-mention" key={index}>@<PersonName name={part.slice(1)} personId={names.get(part)!} /></span>
    : part)}</>;
}

function timestampFor(message: CollaborationMessage, locale: string, now: number) {
  const recorded = message.createdAt ?? (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(message.time) ? `${message.time.replace(" ", "T")}+08:00` : "");
  const formatted = relativeTaskTime(recorded, locale, now);
  return formatted ? { ...formatted, dateTime: new Date(recorded).toISOString() } : null;
}

export function TaskDiscussionMessage({ message, parent, currentUser, currentUserName, files, highlighted, onReply, onLocate, onDelete, onOpenFile, onConnectAi, now }: TaskDiscussionMessageProps) {
  const mock = useMockText();
  const d = useDetailCopy();
  const ui = useGlobalUi();
  const { locale, autoTranslate } = useI18n();
  const [originalReadingKey, setOriginalReadingKey] = useState<string | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const readingKey = JSON.stringify([message.id, message.updatedAt, message.message, locale]);
  const reading = contentReading(message.message, mock.discussionTranslation(message.message), locale, autoTranslate, originalReadingKey === readingKey);
  const own = message.author === currentUser || message.author === currentUserName;
  const isReply = Boolean(message.replyToActivityId);
  const originalAvailable = Boolean(parent && !parent.deletedAt);
  const parentBody = parent && (parent.updatedAt || !autoTranslate ? parent.message : mock.discussionTranslation(parent.message));
  const parentAttachments = parent?.attachmentRefs?.map(ref => mock.text(ref.name)).join(", ") || (parent?.file ? mock.text(parent.file) : "");
  const parentSummary = !parent ? d("originalMissing") : parent.deletedAt ? d("originalDeleted") : (parentBody?.trim() || (parentAttachments ? ui("附件：{0}", { 0: parentAttachments }) : ui("（无文字内容）")));
  const timestamp = timestampFor(message, locale, now);
  const refs = message.attachmentRefs ?? [];
  const legacyFile = !refs.length && message.file ? files.find(file => file.kind === "file" && !file.archived && file.name === message.file) : undefined;
  const toggleOriginal = () => setOriginalReadingKey(originalReadingKey === readingKey ? null : readingKey);

  return <li className="task-discussion-feed-message">
    <PersonAvatar className="task-discussion-feed-avatar" name={message.author} personId={message.author} size="sm" />
    <div className={`task-discussion-record${highlighted ? " is-attention" : ""}`} id={`task-activity-${message.id}`} tabIndex={-1}>
      <header className="task-discussion-feed-header">
        <div className="task-discussion-feed-identity">
          <strong><PersonName name={message.author} personId={message.author} /></strong>
          {isReply && <span className="task-discussion-feed-recipient">
            <span>{d("reply")}</span>
            {parent ? <button disabled={!originalAvailable} onClick={() => originalAvailable && onLocate(parent.id)} title={originalAvailable ? d("locateOriginal") : d("originalUnavailable")} type="button"><PersonName name={parent.author} personId={parent.author} showProfilePreview={false} /></button> : <span>{d("originalMissing")}</span>}
            <Popover open={referenceOpen} onOpenChange={(open, details) => {
              if (details.reason === "trigger-press" && originalAvailable) { details.cancel(); return; }
              setReferenceOpen(open);
            }}>
              <PopoverTrigger aria-label={originalAvailable ? d("locateOriginal") : `${d("viewQuotedMessage")}：${parentSummary}`} className="task-discussion-feed-reference" data-unavailable={!originalAvailable} openOnHover delay={180} closeDelay={120} onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setReferenceOpen(true); }} onClick={() => {
                if (!parent || !originalAvailable) return;
                setReferenceOpen(false);
                onLocate(parent.id);
              }} type="button"><MessageSquareText aria-hidden="true" size={15} /></PopoverTrigger>
              <PopoverContent aria-label={d("viewQuotedMessage")} className="task-discussion-reference-popover" align="start" side="top" collisionPadding={16} initialFocus={false} finalFocus={false}>
                <p className="task-discussion-reference-body">{parentSummary}</p>
              </PopoverContent>
            </Popover>
          </span>}
        </div>
        {onConnectAi && <AiConnectionButton compact contextLabel={ui("{0}的讨论", { 0: message.author })} onConnect={(trigger, shortcut) => onConnectAi({ kind: isReply ? "reply" : "discussion", activityId: message.id }, trigger, shortcut)} />}
      </header>
      {message.message.trim() && <p className="task-discussion-feed-body"><MessageText message={message} text={reading.text} /></p>}
      {(refs.length > 0 || message.file) && <div className="task-discussion-feed-attachments">
        {refs.map(ref => {
          const file = files.find(file => file.id === ref.fileId && !file.archived);
          return <button className="task-discussion-feed-file" disabled={!file} key={ref.fileId} onClick={() => onOpenFile(ref.fileId, ref.version)} title={mock.text(ref.name)} type="button"><FileText aria-hidden="true" size={14} /><span>{mock.text(ref.name)}</span><small>{file ? `v${ref.version}` : d("fileRemoved")}</small></button>;
        })}
        {!refs.length && message.file && <button className="task-discussion-feed-file" disabled={!legacyFile} onClick={() => legacyFile && onOpenFile(legacyFile.id)} title={mock.text(message.file)} type="button"><FileText aria-hidden="true" size={14} /><span>{mock.text(message.file)}</span>{!legacyFile && <small>{d("unavailable")}</small>}</button>}
      </div>}
      <footer className="task-discussion-feed-footer">
        <div className="task-discussion-feed-meta">
          {timestamp && <time aria-label={timestamp.full} className="task-discussion-feed-time" dateTime={timestamp.dateTime} tabIndex={0} title={timestamp.full}>{timestamp.label}</time>}
          {(reading.state === "translated" || reading.state === "original") && <span className="task-discussion-feed-translation"><span>{reading.state === "translated" ? ui("已翻译") : ui("原文")}</span><span aria-hidden="true"> · </span><button aria-label={reading.state === "translated" ? ui("查看原文") : ui("显示译文")} onClick={toggleOriginal} type="button">{reading.state === "translated" ? ui("查看原文") : ui("显示译文")}</button></span>}
          {reading.state === "unavailable" && <small title={ui("本地演示尚无此内容的译文，原文已保留。")}>{ui("暂无译文")}</small>}
          {message.updatedAt && <small>{d("edited")}</small>}
        </div>
        <div className="task-discussion-feed-actions">
          {own && onDelete && <button className="task-discussion-feed-delete" onClick={() => onDelete(message)} type="button">{d("delete")}</button>}
          <button className="task-discussion-feed-reply" onClick={() => onReply(message)} type="button">{d("reply")}</button>
        </div>
      </footer>
    </div>
  </li>;
}
