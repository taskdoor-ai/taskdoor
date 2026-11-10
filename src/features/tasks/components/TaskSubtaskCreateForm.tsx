import { TaskCriteriaFields } from "@/features/tasks/components/TaskCriteriaFields";
import { TaskInlineCreateForm } from "@/features/tasks/components/TaskInlineCreateForm";
import "@/features/tasks/styles/task-criteria-fields.css";
import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { TaskStatusIcon } from "@/shared/ui/TaskStatusBadge";
import type { Member } from "@/features/members/components/MemberSelector";
import { PersonPicker } from "@/features/members/components/PersonPicker";
import { TagPicker } from "@/features/me/components/TagPicker";
import { getNewSubtaskDraftError, type NewSubtaskDraft } from "@/features/tasks/lib/workspace-subtask-editing";
import { TaskDueDatePicker } from "@/features/tasks/components/TaskDueDatePicker";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Button } from "@/shared/ui/button";
import { Input, Textarea } from "@/shared/ui/input";

type Props = {
  id: string;
  inline?: boolean;
  generating?: boolean;
  showTags?: boolean;
  endDateSuggestion?: string;
  open: boolean;
  currentUserId?: string;
  members: Member[];
  tags: ComponentProps<typeof TagPicker>["tags"];
  initialDraft?: Partial<Pick<NewSubtaskDraft, "title" | "goal" | "completionCriteria" | "participantIds" | "ownerId" | "labels" | "endDate" | "sourceDiscussion">>;
  onCreate: (draft: NewSubtaskDraft) => void | Promise<void>;
  onCancel: () => void;
};

export function TaskSubtaskCreateForm({ id, inline = false, generating = false, showTags = true, endDateSuggestion, open, currentUserId = "", members, tags, initialDraft, onCreate, onCancel }: Props) {
  const { locale } = useI18n();
  const copy = (zh: string, en: string) => locale === "en" ? en : zh;
  const [title, setTitle] = useState(() => initialDraft?.title ?? "");
  const [sourceDiscussion] = useState(() => initialDraft?.sourceDiscussion ? { ...initialDraft.sourceDiscussion } : undefined);
  const [criteria, setCriteria] = useState<string[]>(() => [...initialDraft?.completionCriteria ?? []]);
  const [goal, setGoal] = useState(() => initialDraft?.goal ?? "");
  const [ownerId, setOwnerId] = useState(() => initialDraft?.ownerId ?? "");
  const [labels, setLabels] = useState<string[]>(() => [...initialDraft?.labels ?? []]);
  const [endDate, setEndDate] = useState(() => initialDraft?.endDate ?? "");
  const [dateEdited, setDateEdited] = useState(false);
  const showDateSuggestion = Boolean(endDateSuggestion && endDate && !dateEdited);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const savingRef = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const goalRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => titleRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    const input = goalRef.current;
    if (!open || !input) return;
    input.style.height = "auto";
    input.style.height = `${Math.max(28, input.scrollHeight)}px`;
  }, [goal, open]);

  const close = () => {
    if (!savingRef.current) onCancel();
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!open || savingRef.current) return;
    const draft: NewSubtaskDraft = {
      title: title.trim(), goal: goal.trim(), ownerId, labels, endDate,
      participantIds: [...new Set([...(initialDraft?.participantIds ?? []), ...(currentUserId && currentUserId !== ownerId ? [currentUserId] : [])])].filter(id => id !== ownerId),
      completionCriteria: criteria.map(value => value.trim()).filter(Boolean),
      ...(sourceDiscussion ? { sourceDiscussion } : {}),
    };
    const validationError = getNewSubtaskDraftError(draft);
    setNotice("");
    if (validationError) { setError(inline ? copy("请描述要创建的子任务。", "Describe the subtask you want to create.") : copy(validationError, "Enter a subtask name.")); titleRef.current?.focus(); return; }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await onCreate(draft);
      setTitle("");
      setGoal("");
      setCriteria([]);
      setOwnerId("");
      setLabels([]);
      setEndDate("");
      setNotice(copy("子任务已创建。", "Subtask created."));
      onCancel();
    } catch (caught) {
      if (!(caught instanceof Error && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : copy("创建失败，输入已保留，请重试。", "Could not create the subtask. Your input has been kept. Try again."));
    } finally {
      savingRef.current = false;
      setSaving(false);
      if (inline) window.requestAnimationFrame(() => {
        const input = titleRef.current;
        if (input?.isConnected && !input.closest("[hidden]")) input.focus({ preventScroll: true });
      });
    }
  };

  if (inline) return <div hidden={!open}>
    <TaskInlineCreateForm error={error} id={id} inputLabel={copy("子任务需求", "Subtask request")} inputRef={titleRef} label={copy("新增子任务", "Add subtask")} onCancel={close} onChange={value => { setTitle(value); setError(""); }} onSubmit={submit} saving={saving} value={title} />
  </div>;

  return <>
    <form aria-busy={saving || generating} aria-describedby={error ? `${id}-error` : undefined} aria-label={copy("新增子任务", "Add subtask")} className="task-subtask-create-form" data-generating={generating || undefined} hidden={!open} id={id} noValidate onKeyDown={event => {
      if (event.defaultPrevented) return;
      // Portalled pickers own their keyboard events, including Escape.
      if (typeof Node !== "undefined" && event.target instanceof Node && !event.currentTarget.contains(event.target)) return;
      if (event.key === "Enter" && event.nativeEvent.isComposing) { event.preventDefault(); return; }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) {
        event.preventDefault();
        if (!savingRef.current) event.currentTarget.requestSubmit();
      }
      if (event.key === "Escape" && !event.nativeEvent.isComposing && !savingRef.current) {
        event.preventDefault(); event.stopPropagation(); close();
      }
    }} onSubmit={submit}>
      <fieldset className="task-subtask-create-fields" disabled={saving}>
      <legend className="sr-only">{copy("子任务内容", "Subtask details")}</legend>
      {generating && <>
        <span className="sr-only" role="status">{copy("正在生成子任务草稿", "Preparing subtask draft")}</span>
        <div aria-hidden="true" className="task-subtask-draft-loading"><span className="task-loading-bar task-subtask-loading-title" /><span className="task-loading-bar task-subtask-loading-goal" /></div>
      </>}
      <div className="task-subtask-create-title-row">
        <TaskStatusIcon status="进行中" progressRatio={null} aria-hidden="true" className="task-subtask-create-status" size={20} />
        <Input aria-label={copy("子任务名称", "Subtask name")} aria-required="true" autoComplete="off" className="task-subtask-create-title" disabled={saving} id={`${id}-title`} onChange={event => {
          if (savingRef.current) return;
          setTitle(event.target.value); setError("");
        }} placeholder={copy("子任务名称", "Subtask name")} ref={titleRef} value={title} />
      </div>
      <Textarea id={`${id}-goal`} aria-label={copy("子任务目标", "Subtask goal")} className="task-subtask-create-goal" disabled={saving} onChange={event => {
        if (savingRef.current) return;
        setGoal(event.target.value); setError("");
      }} placeholder={copy("补充任务目标…", "Add a goal…")} ref={goalRef} rows={1} value={goal} />
      {initialDraft?.completionCriteria !== undefined && <TaskCriteriaFields disabled={saving} idPrefix={`${id}-criteria`} label={copy("任务完成标准", "Completion criteria")} values={criteria} onChange={setCriteria} />}
      </fieldset>
      {error && <p className="task-subtask-create-error" id={`${id}-error`} role="alert">{error}</p>}
      {showDateSuggestion && <p className="task-subtask-create-hint" id={`${id}-date-suggestion`}>{copy("AI 预计完成日期，可修改或清除。", "AI estimated completion date. You can change or clear it.")} {endDateSuggestion}</p>}
      <footer className="task-subtask-create-toolbar">
        <fieldset aria-label={copy("子任务属性", "Subtask properties")} className="task-subtask-create-properties" disabled={saving}>
          <PersonPicker allowInvitations={false} allowUnassigned ariaLabel={copy("子任务负责人", "Subtask assignee")} className="task-subtask-create-chip task-subtask-create-owner" disabled={saving} members={members} menuLabel={copy("选择子任务负责人", "Select subtask assignee")} onChange={id => { if (!savingRef.current) { setOwnerId(id); setError(""); } }} showTriggerProfilePreview={false} triggerVariant="identity" unassignedLabel={copy("暂不分配", "Unassigned")} value={ownerId} />
          <div className="task-subtask-create-date" aria-describedby={showDateSuggestion ? `${id}-date-suggestion` : undefined}><TaskDueDatePicker emptyLabel={copy("截止日期", "Due date")} initialValue={endDate} label={showDateSuggestion ? copy("预计完成日期（AI 建议）", "Estimated completion date (AI suggestion)") : copy("子任务截止日期", "Subtask due date")} onChange={value => { if (!savingRef.current) { setEndDate(value); setDateEdited(true); setError(""); } }} /></div>
          {showTags && <div className="task-subtask-create-tags"><TagPicker disabled={saving} onChange={values => { if (!savingRef.current) { setLabels(values); setError(""); } }} selected={labels} tags={tags} triggerLabel={copy(labels.length ? `标签 · ${labels.length}` : "标签", labels.length ? `Labels · ${labels.length}` : "Labels")} /></div>}
        </fieldset>
        <div className="task-subtask-create-actions">
          <Button disabled={saving} onClick={close} size="sm" type="button" variant="ghost">{copy("取消", "Cancel")}</Button>
          <Button className="task-subtask-create-submit" disabled={saving || !title.trim()} size="sm" title={copy("创建子任务（⌘ / Ctrl + Enter）", "Create subtask (⌘ / Ctrl + Enter)")} type="submit" variant="default">{saving ? copy("创建中…", "Creating…") : copy("创建", "Create")}</Button>
        </div>
      </footer>
    </form>
    <span aria-live="polite" className="sr-only" role="status">{notice}</span>
  </>;
}
