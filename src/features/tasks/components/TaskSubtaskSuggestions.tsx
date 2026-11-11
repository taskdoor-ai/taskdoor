import type { NewSubtaskDraft } from "@/features/tasks/lib/workspace-subtask-editing";
import type { TagDefinition } from "@/shared/model/task-model";
import { LoaderCircle, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Member } from "@/features/members/components/MemberSelector";
import type { SubtaskSuggestion, SubtaskSuggestionOutcome } from "@/features/tasks/lib/task-subtask-suggestions";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { PersonAvatar, PersonName } from "@/shared/ui/PersonAvatar";
import "@/features/tasks/styles/task-subtask-suggestions.css";

type Props = {
  suggestions: SubtaskSuggestion[];
  currentUserId?: string;
  tags?: TagDefinition[];
  members: Member[];
  variant?: "subtasks" | "discussion";
  disabled?: boolean;
  outdatedIds?: string[];
  outcomes?: SubtaskSuggestionOutcome[];
  refreshing?: boolean;
  onRefresh?: () => void;
  onChange?: (id: string, patch: Partial<SubtaskSuggestion>) => void;
  onOpenTask?: (id: string) => void;
  onOpenSource?: (messageId: string) => void;
  onDismissSelected: (ids: string[]) => boolean;
  onConfirm: (ids: string[], draft?: NewSubtaskDraft) => Promise<void>;
};

function SuggestionTransition({ children, reducedMotion }: { children: ReactNode; reducedMotion: boolean }) {
  const present = useIsPresent();
  return <motion.div
    animate="visible"
    aria-hidden={present ? undefined : true}
    className="task-subtask-suggestion-motion"
    exit="removed"
    inert={!present}
    initial={false}
    style={{ overflow: present ? "visible" : "clip" }}
    variants={{
      visible: { height: "auto", opacity: 1 },
      removed: { height: 0, opacity: 0, transition: { duration: reducedMotion ? 0 : .3, ease: [.22, 1, .36, 1] } },
    }}
  >
    <motion.div className="task-subtask-suggestion" variants={{
      visible: { x: 0, scaleY: 1, rotate: 0, opacity: 1, filter: "blur(0px)" },
      removed: { x: 32, scaleY: .72, rotate: -1, opacity: 0, filter: "blur(2px)", transition: { duration: reducedMotion ? 0 : .24, ease: [.4, 0, 1, 1] } },
    }}>{children}</motion.div>
  </motion.div>;
}

/** A suggestion stays a read-only proposal until the user creates its task. */
export function TaskSubtaskSuggestions({ suggestions, members, variant = "subtasks", disabled = false, outdatedIds = [], outcomes = [], refreshing = false, onRefresh, onChange, onOpenTask, onOpenSource, onDismissSelected, onConfirm }: Props) {
  const { locale } = useI18n();
  const english = locale === "en";
  const root = useRef<HTMLElement>(null);
  const submitting = useRef(false);
  const focusAfterExit = useRef<HTMLElement | null>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const [creatingId, setCreatingId] = useState("");
  const [settledIds, setSettledIds] = useState<string[]>([]);
  const [hasPresence, setHasPresence] = useState(suggestions.length > 0);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const count = suggestions.length;
  const exiting = settledIds.some(id => !suggestions.some(item => item.id === id));
  const blocked = disabled || Boolean(creatingId) || exiting;

  useEffect(() => { if (count > 0) setHasPresence(true); }, [count]);
  const prepareFocus = () => {
    const section = root.current;
    if (section?.contains(document.activeElement)) focusAfterExit.current = section.parentElement?.closest<HTMLElement>("[data-subtask-suggestion-focus-return]") ?? null;
  };
  const finishExit = () => {
    setSettledIds([]);
    setHasPresence(count > 0);
    const fallback = focusAfterExit.current;
    focusAfterExit.current = null;
    if (fallback) window.requestAnimationFrame(() => (root.current?.querySelector<HTMLElement>("[data-suggestion-focus-target]:not(:disabled)") ?? fallback).focus({ preventScroll: true }));
  };
  const dismiss = (id: string) => {
    if (blocked) return;
    setError("");
    prepareFocus();
    if (onDismissSelected([id])) setSettledIds([id]);
    else focusAfterExit.current = null;
  };
  const create = async (suggestion: SubtaskSuggestion) => {
    if (blocked || submitting.current || !suggestion.title.trim() || outdatedIds.includes(suggestion.id) || suggestion.contextGap) return;
    submitting.current = true;
    setCreatingId(suggestion.id);
    setError("");
    prepareFocus();
    try {
      await onConfirm([suggestion.id]);
      setSettledIds([suggestion.id]);
    } catch (cause) {
      focusAfterExit.current = null;
      setError(cause instanceof Error && cause.message.trim() ? cause.message : english ? "Could not create the task. Please try again." : "创建失败，请重试。");
    } finally {
      submitting.current = false;
      setCreatingId("");
    }
  };
  const heading = english ? "AI-suggested subtasks" : "AI 建议的子任务";
  if (!count && !hasPresence && !outcomes.length && !onRefresh) return null;
  return <section aria-label={heading} aria-busy={Boolean(creatingId) || refreshing} className={`task-subtask-suggestions${variant === "discussion" ? " task-subtask-suggestions-discussion" : ""}`} ref={root} tabIndex={-1}>
    <header className="task-subtask-suggestions-toolbar"><h3 className="task-subtask-suggestions-heading"><Sparkles aria-hidden="true" size={13} />{heading}</h3>
      {onRefresh && <button className="task-subtask-suggestions-reload" disabled={blocked || refreshing} onClick={onRefresh} type="button">{refreshing ? (english ? "Reviewing…" : "正在整理…") : (english ? "Review suggestions" : "重新整理")}</button>}
    </header>
    {!count && !outcomes.length && !refreshing && <p className="task-subtask-suggestions-notice">{english ? "No unhandled suggestions." : "暂无待处理建议。"}</p>}
    <AnimatePresence initial={false} onExitComplete={finishExit}>{suggestions.map(suggestion => {
      const owner = members.find(member => member.id === suggestion.ownerId);
      const stale = outdatedIds.includes(suggestion.id);
      const expanded = expandedId === suggestion.id;
      const detailsId = `suggestion-details-${variant}-${encodeURIComponent(suggestion.id)}`;
      return <SuggestionTransition key={suggestion.id} reducedMotion={reducedMotion}>
        <div aria-label={english ? `Suggested task: ${suggestion.title}` : `建议任务：${suggestion.title}`} className="task-subtask-suggestion-row">
          <button aria-controls={detailsId} aria-expanded={expanded} className="task-subtask-suggestion-name" title={suggestion.title} onClick={() => setExpandedId(expanded ? "" : suggestion.id)} type="button">{suggestion.title || (english ? "Untitled task" : "未命名任务")}</button>
          <span aria-label={english ? "Suggested assignee" : "建议负责人"} className="task-subtask-suggestion-owner">{owner ? <><PersonAvatar name={owner.name} personId={owner.id} profile={owner} showProfilePreview={false} size="xs" /><PersonName name={owner.name} personId={owner.id} profile={owner} showProfilePreview={false} /></> : (english ? "Unassigned" : "暂不分配")}</span>
          {!disabled && <div className="task-subtask-suggestion-actions">
            <button aria-label={english ? `Add subtask: ${suggestion.title}` : `添加子任务：${suggestion.title}`} className="task-subtask-suggestion-create" data-suggestion-focus-target disabled={blocked || refreshing || stale || Boolean(suggestion.contextGap) || !suggestion.title.trim()} onClick={() => { void create(suggestion); }} type="button">{creatingId === suggestion.id && <LoaderCircle aria-hidden="true" className="task-subtask-suggestions-spinner" size={12} />}{english ? "Add" : "添加"}</button>
            <button aria-label={english ? `Ignore: ${suggestion.title}` : `忽略：${suggestion.title}`} className="task-subtask-suggestion-remove" disabled={blocked} onClick={() => dismiss(suggestion.id)} type="button">{english ? "Ignore" : "忽略"}</button>
          </div>}
        </div>
        {(stale || suggestion.contextGap) && <p className="task-subtask-suggestions-notice" role="status">{stale ? (english ? "Needs review · Related discussion has changed." : "待复核 · 相关讨论已更新。") : suggestion.contextGap}</p>}
        {expanded && <div className="task-subtask-suggestion-details" id={detailsId}>
          <label>{english ? "Name" : "名称"}<input disabled={disabled || Boolean(creatingId)} value={suggestion.title} onChange={event => onChange?.(suggestion.id, { title: event.target.value })} /></label>
          <label>{english ? "Goal" : "目标"}<textarea disabled={disabled || Boolean(creatingId)} value={suggestion.goal} onChange={event => onChange?.(suggestion.id, { goal: event.target.value })} /></label>
          <label>{english ? "Completion criteria" : "任务完成标准"}<textarea disabled={disabled || Boolean(creatingId)} value={suggestion.completionCriteria.join("\n")} onChange={event => onChange?.(suggestion.id, { completionCriteria: event.target.value.split("\n") })} /></label>
          <div className="task-subtask-suggestion-fields"><label>{english ? "Assignee" : "负责人"}<select disabled={disabled || Boolean(creatingId)} value={suggestion.ownerId} onChange={event => onChange?.(suggestion.id, { ownerId: event.target.value })}><option value="">{english ? "Unassigned" : "暂不分配"}</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
          <label>{english ? "Due date" : "截止日期"}<input type="date" disabled={disabled || Boolean(creatingId)} value={suggestion.endDate} onChange={event => onChange?.(suggestion.id, { endDate: event.target.value })} /></label></div>
          <blockquote>{suggestion.source.body}</blockquote>
          {onOpenSource && <button className="task-subtask-suggestions-reload" onClick={() => onOpenSource(suggestion.source.messageId)} type="button">{english ? "View source" : "查看依据"}</button>}
        </div>}
      </SuggestionTransition>;
    })}</AnimatePresence>
    {outcomes.length > 0 && <details className="task-subtask-suggestion-outcomes"><summary>{english ? "Handled" : "已处理"} · {outcomes.length}</summary>{outcomes.map(item => <div key={item.suggestion.id} className="task-subtask-suggestion-outcome"><span>{item.suggestion.title}</span>{item.status === "added" && item.taskId && onOpenTask ? <button className="task-subtask-suggestions-reload" onClick={() => onOpenTask(item.taskId!)} type="button">{english ? "Open created subtask" : "查看已添加的子任务"}</button> : <em>{item.status === "ignored" ? (english ? "Ignored" : "已忽略") : (english ? "Added" : "已添加")}</em>}</div>)}</details>}
    {(error || disabled) && <p className={`task-subtask-suggestions-notice${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>{error || (english ? "View only" : "仅可查看")}</p>}
  </section>;
}
