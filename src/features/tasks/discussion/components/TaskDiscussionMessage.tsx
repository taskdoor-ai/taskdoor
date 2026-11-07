import { useEffect, useId, useState, type ReactNode } from "react";
import { ListTree, MessageSquareText, Plus } from "lucide-react";
import { useDiscussionReading, useMockText } from "@/ai/discussion-reading";
import type { AiShortcutAttempt, AiTransferResult } from "@/features/ai-connection/components/AiConnectionDialog";
import type { DiscussionAiTarget } from "@/features/tasks/discussion/lib/task-discussion-ai";
import type { DiscussionReferenceTask } from "@/features/tasks/discussion/lib/discussion-task-reference";
import { relativeTaskTime } from "@/features/tasks/lib/relative-time";
import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useI18n } from "@/shared/i18n/I18nProvider";
import type { PersonOption, TaskFileNode } from "@/shared/model/task-model";
import { PersonAvatar, PersonName } from "@/shared/ui/PersonAvatar";
import { DiscussionMarkdown } from "@/features/tasks/discussion/components/DiscussionMarkdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { AiConnectionButton } from "@/features/ai-connection/components/AiConnectionButton";
import { DiscussionAttachmentGallery } from "@/features/tasks/discussion/components/DiscussionAttachmentGallery";
import { TaskDiscussionTaskLinks, type DiscussionTaskLink } from "@/features/tasks/discussion/components/TaskDiscussionTaskLinks";

type TaskDiscussionMessageProps = {
  message: CollaborationMessage;
  parent?: CollaborationMessage;
  currentUser: string;
  currentUserName?: string;
  files: TaskFileNode[];
  highlighted?: boolean;
  children?: ReactNode;
  replyExpanded?: boolean;
  replyDisabled?: boolean;
  onReply: (message: CollaborationMessage) => void;
  onLocate: (id: string) => void;
  onDelete?: (message: CollaborationMessage) => void;
  onCreateSubtask?: (message: CollaborationMessage, trigger: HTMLElement) => void;
  subtaskCreateDisabled?: boolean;
  onOpenFile: (id: string, version?: number) => void;
  onConnectAi?: (target: DiscussionAiTarget, trigger: HTMLElement, shortcut?: AiShortcutAttempt) => void | Promise<AiTransferResult | void>;
  now: number;
  followups?: { tasks: DiscussionTaskLink[]; suggestionCount: number; hasOutdated?: boolean };
  followupPeople?: PersonOption[];
  onOpenFollowupTask?: (taskId: string) => void;
  renderSuggestions?: () => ReactNode;
  referenceTasks?: DiscussionReferenceTask[];
  onOpenReferenceTask?: (id: string) => void;
};

function timestampFor(message: CollaborationMessage, locale: string, now: number) {
  const recorded = message.createdAt ?? (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(message.time) ? `${message.time.replace(" ", "T")}+08:00` : "");
  const formatted = relativeTaskTime(recorded, locale, now);
  return formatted ? { ...formatted, dateTime: new Date(recorded).toISOString() } : null;
}

export function TaskDiscussionMessage({ message, parent, currentUser, currentUserName, files, highlighted, children, replyExpanded, replyDisabled, onReply, onLocate, onDelete, onCreateSubtask, subtaskCreateDisabled, onOpenFile, onConnectAi, now, followups, followupPeople = [], onOpenFollowupTask, renderSuggestions, referenceTasks, onOpenReferenceTask }: TaskDiscussionMessageProps) {
  const mock = useMockText();
  const d = useDetailCopy();
  const ui = useGlobalUi();
  const { locale, autoTranslate } = useI18n();
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const followupId = useId();
  const reading = useDiscussionReading(message);
  const own = message.author === currentUser || message.author === currentUserName;
  const isReply = Boolean(message.replyToActivityId);
  const originalAvailable = Boolean(parent && !parent.deletedAt);
  const parentBody = parent && (parent.updatedAt || !autoTranslate ? parent.message : mock.discussionTranslation(parent.message));
  const parentAttachments = parent?.attachmentRefs?.map(ref => mock.text(ref.name)).join(", ") || (parent?.file ? mock.text(parent.file) : "");
  const parentSummary = !parent ? d("originalMissing") : parent.deletedAt ? d("originalDeleted") : (parentBody?.trim() || (parentAttachments ? ui("附件：{0}", { 0: parentAttachments }) : ui("（无文字内容）")));
  const timestamp = timestampFor(message, locale, now);
  const suggestionCount = followups?.suggestionCount ?? 0;
  const linkedCount = followups?.tasks.length ?? 0;
  const hasSuggestions = suggestionCount > 0 || Boolean(followups?.hasOutdated);
  useEffect(() => { if (!hasSuggestions) setSuggestionsExpanded(false); }, [hasSuggestions]);
  useEffect(() => { if (!linkedCount) setTasksExpanded(false); }, [linkedCount]);

  const canCreateFromDiscussion = !message.deletedAt && Boolean(onCreateSubtask);
  const followupEntries = (canCreateFromDiscussion || hasSuggestions || linkedCount > 0) && <div className="task-discussion-followup-entries">
    {linkedCount > 0 && <button aria-controls={`${followupId}-tasks`} aria-expanded={tasksExpanded} aria-label={locale === "en" ? `Subtasks: ${linkedCount}` : `子任务：${linkedCount}`} className="task-discussion-subtasks-trigger" onClick={() => setTasksExpanded(value => !value)} title={locale === "en" ? "Subtasks" : "子任务"} type="button">
      <ListTree aria-hidden="true" size={14} />
      <span className="task-discussion-ai-suggestions-count">{linkedCount}</span>
    </button>}
    {(canCreateFromDiscussion || hasSuggestions) && <button disabled={subtaskCreateDisabled} aria-controls={`${followupId}-suggestions`} aria-expanded={suggestionsExpanded} className="task-discussion-ai-suggestions-trigger" data-has-suggestions={suggestionCount > 0 || undefined} onClick={event => { if (hasSuggestions) setSuggestionsExpanded(value => !value); else onCreateSubtask?.(message, event.currentTarget); }} type="button">
      <Plus aria-hidden="true" size={13} />
      <span>{locale === "en" ? "Create Task from discussion" : "从讨论创建任务"}</span>
      {followups?.hasOutdated && <span className="task-discussion-ai-suggestions-updated">{locale === "en" ? "Updated" : "已更新"}</span>}
    </button>}
  </div>;

  return <li className="task-discussion-feed-message">
    <PersonAvatar className="task-discussion-feed-avatar" name={message.author} personId={message.author} size="sm" />
    <div className={`task-discussion-record${highlighted ? " is-attention" : ""}`} data-subtask-suggestion-focus-return id={`task-activity-${message.id}`} tabIndex={-1}>
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
        {!message.deletedAt && onConnectAi && <div className="task-discussion-feed-header-actions">
          {onConnectAi && <span className="task-discussion-hover-ai"><AiConnectionButton compact contextLabel={locale === "en" ? "this discussion" : "这条讨论"} onConnect={(trigger, shortcut) => onConnectAi({ kind: message.replyToActivityId ? "reply" : "discussion", activityId: message.id, ...(message.fileThreadId ? { fileThreadId: message.fileThreadId } : {}) }, trigger, shortcut)} /></span>}


        </div>}
      </header>
      {message.message.trim() && <div className="task-discussion-feed-body"><DiscussionMarkdown text={reading.text} mentionedPrincipalIds={message.mentionedPrincipalIds} mentionsAllTaskMembers={message.mentionsAllTaskMembers} referenceTasks={referenceTasks} onOpenReferenceTask={onOpenReferenceTask} /></div>}
      <DiscussionAttachmentGallery attachmentRefs={message.attachmentRefs} files={files} legacyFileName={message.file} onOpenFile={onOpenFile} />
      <footer className="task-discussion-feed-footer">
        <div className="task-discussion-feed-meta">
          {timestamp && <time aria-label={timestamp.full} className="task-discussion-feed-time" dateTime={timestamp.dateTime} tabIndex={0} title={timestamp.full}>{timestamp.label}</time>}
          {followupEntries}
          {(reading.canTranslate || reading.state === "translated" || reading.state === "original") && <span className="task-discussion-feed-translation">
            {(reading.state === "translated" || reading.state === "original") && <><span>{reading.state === "translated" ? ui("已翻译") : ui("原文")}</span><span aria-hidden="true"> · </span></>}
            <button aria-busy={reading.translating} className={reading.canTranslate ? "task-discussion-translate-trigger" : undefined} disabled={reading.translating} onClick={reading.canTranslate ? reading.translate : reading.toggleOriginal} type="button">{reading.canTranslate ? (reading.translating ? ui("翻译中…") : ui("翻译")) : reading.state === "translated" ? ui("查看原文") : ui("显示译文")}</button>
          </span>}
          {message.updatedAt && <small>{d("edited")}</small>}
        </div>
        {!message.deletedAt && <div className="task-discussion-feed-direct-actions">

          {own && onDelete && <button onClick={() => onDelete(message)} type="button">{d("delete")}</button>}
          <button aria-expanded={Boolean(replyExpanded)} disabled={replyDisabled} onClick={() => onReply(message)} type="button">{replyExpanded ? d("cancelReply") : d("reply")}</button>
        </div>}
      </footer>
      <div className="task-discussion-followups" hidden={(!hasSuggestions || !suggestionsExpanded) && (!linkedCount || !tasksExpanded)}>
        <div className="task-discussion-followup-content" hidden={!hasSuggestions || !suggestionsExpanded} id={`${followupId}-suggestions`}>
          {renderSuggestions && <div className="task-discussion-inline-suggestions">{renderSuggestions()}</div>}
        </div>
        <div className="task-discussion-followup-content" hidden={!linkedCount || !tasksExpanded} id={`${followupId}-tasks`}>
          {followups && <TaskDiscussionTaskLinks onOpenTask={onOpenFollowupTask} people={followupPeople} tasks={followups.tasks} />}
        </div>
      </div>
      {children}
    </div>
  </li>;
}
