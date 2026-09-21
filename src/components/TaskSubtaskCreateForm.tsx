import { useEffect, useRef, useState, type FormEvent } from "react";
import { getNewSubtaskDraftError, type NewSubtaskDraft } from "../lib/workspaceSubtaskEditing";
import { TaskCriteriaFields } from "./TaskCriteriaFields";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type Props = {
  id: string;
  open: boolean;
  onCreate: (draft: NewSubtaskDraft) => void | Promise<void>;
  onCancel: () => void;
};

export function TaskSubtaskCreateForm({ id, open, onCreate, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [completionCriteria, setCompletionCriteria] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const savingRef = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => titleRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const close = () => {
    if (!savingRef.current) onCancel();
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!open || savingRef.current) return;
    const draft = { title: title.trim(), completionCriteria: completionCriteria.map(value => value.trim()) };
    const validationError = getNewSubtaskDraftError(draft);
    setNotice("");
    if (validationError) { setError(validationError); return; }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await onCreate(draft);
      setTitle("");
      setCompletionCriteria([""]);
      setNotice("子任务已创建，可打开详情继续编辑。");
      onCancel();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "创建失败，输入已保留，请重试。");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return <>
    <form aria-busy={saving} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} aria-label="新增子任务" className="task-subtask-create-form" hidden={!open} id={id} noValidate onKeyDown={event => {
      if (event.key === "Escape" && !event.nativeEvent.isComposing && !savingRef.current) {
        event.preventDefault(); event.stopPropagation(); close();
      }
    }} onSubmit={submit}>
      <div className="task-subtask-create-field">
        <label htmlFor={`${id}-title`}>子任务名称</label>
        <Input autoComplete="off" disabled={saving} id={`${id}-title`} onChange={event => {
          if (savingRef.current) return;
          setTitle(event.target.value); setError("");
        }} placeholder="这项子任务要交付什么？" ref={titleRef} value={title} />
      </div>
      <div className="task-subtask-create-field">
        <span>完成标准</span>
        <TaskCriteriaFields disabled={saving} idPrefix={`${id}-criteria`} label="新子任务完成标准" onChange={values => {
          if (savingRef.current) return;
          setCompletionCriteria(values); setError("");
        }} values={completionCriteria} />
      </div>
      <p className="task-subtask-create-hint" id={`${id}-hint`}>初始目标带入当前任务目标，创建后可独立修改；负责人和期限可在详情中继续设置。</p>
      {error && <p className="task-subtask-create-error" id={`${id}-error`} role="alert">{error}</p>}
      <footer className="task-subtask-create-actions">
        <Button disabled={saving} onClick={close} size="sm" type="button" variant="ghost">取消</Button>
        <Button disabled={saving} size="sm" type="submit">{saving ? "创建中…" : "创建子任务"}</Button>
      </footer>
    </form>
    {notice && <p className="task-subtask-create-notice" role="status">{notice}</p>}
  </>;
}
