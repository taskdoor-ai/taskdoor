import { TaskSubtaskCreateForm } from "@/features/tasks/components/TaskSubtaskCreateForm";
import type { NewSubtaskDraft } from "@/features/tasks/lib/workspace-subtask-editing";
import type { TagDefinition } from "@/shared/model/task-model";
import { LoaderCircle, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Member } from "@/features/members/components/MemberSelector";
import type { SubtaskSuggestion } from "@/features/tasks/lib/task-subtask-suggestions";
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
export function TaskSubtaskSuggestions({ suggestions, members, currentUserId, tags = [], variant = "subtasks", disabled = false, onDismissSelected, onConfirm }: Props) {
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
    if (blocked || submitting.current || !suggestion.title.trim()) return;
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
  if (!count && !hasPresence) return null;
  if (variant === "discussion") return <section className="task-subtask-suggestions-discussion" aria-label={english ? "Create subtasks" : "创建子任务"}>
    {suggestions.map(suggestion => <TaskSubtaskCreateForm key={JSON.stringify([suggestion.id, suggestion.discussionContextKey])} id={`discussion-suggestion-${suggestion.id}`} open currentUserId={currentUserId} members={members} tags={tags} initialDraft={{ title: suggestion.title, goal: suggestion.goal, completionCriteria: suggestion.completionCriteria, participantIds: suggestion.participantIds, ownerId: suggestion.ownerId, endDate: suggestion.endDate }} onCancel={() => { if (!disabled) onDismissSelected([suggestion.id]); }} onCreate={async draft => {
      if (disabled) throw new Error(english ? "This suggestion is no longer available." : "当前建议已不可创建，请核对最新讨论。");
      await onConfirm([suggestion.id], draft);
    }} />)}
  </section>;


  const heading = english ? "AI-suggested subtasks" : "AI 建议的子任务";
  return <section aria-label={heading} aria-busy={Boolean(creatingId) || exiting} className="task-subtask-suggestions" ref={root} tabIndex={-1}>
    <h3 className="task-subtask-suggestions-heading"><Sparkles aria-hidden="true" size={13} />{heading}</h3>
    <AnimatePresence initial={false} onExitComplete={finishExit}>{suggestions.map(suggestion => {
      const owner = members.find(member => member.id === suggestion.ownerId);
      return <SuggestionTransition key={suggestion.id} reducedMotion={reducedMotion}>
        <div aria-label={english ? `Suggested task: ${suggestion.title}` : `建议任务：${suggestion.title}`} className="task-subtask-suggestion-row">
          <span className="task-subtask-suggestion-name" title={suggestion.title}>{suggestion.title || (english ? "Untitled task" : "未命名任务")}</span>
          <span aria-label={english ? "Suggested assignee" : "建议负责人"} className="task-subtask-suggestion-owner">{owner ? <><PersonAvatar name={owner.name} personId={owner.id} profile={owner} showProfilePreview={false} size="xs" /><PersonName name={owner.name} personId={owner.id} profile={owner} showProfilePreview={false} /></> : (english ? "Unassigned" : "暂不分配")}</span>
          {!disabled && <div className="task-subtask-suggestion-actions">
            <button aria-label={english ? `Add subtask: ${suggestion.title}` : `添加子任务：${suggestion.title}`} className="task-subtask-suggestion-create" data-suggestion-focus-target disabled={blocked || !suggestion.title.trim()} onClick={() => { void create(suggestion); }} type="button">{creatingId === suggestion.id && <LoaderCircle aria-hidden="true" className="task-subtask-suggestions-spinner" size={12} />}{english ? "Add" : "添加"}</button>
            <button aria-label={english ? `Ignore: ${suggestion.title}` : `忽略：${suggestion.title}`} className="task-subtask-suggestion-remove" disabled={blocked} onClick={() => dismiss(suggestion.id)} type="button">{english ? "Ignore" : "忽略"}</button>
          </div>}
        </div>
      </SuggestionTransition>;
    })}</AnimatePresence>
    {(error || disabled) && <p className={`task-subtask-suggestions-notice${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>{error || (english ? "View only" : "仅可查看")}</p>}
  </section>;
}
