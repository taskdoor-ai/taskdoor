import { useEffect, useId, useRef, useState } from "react";
import { validateTaskCriteria } from "../lib/taskCriteriaEditing";
import { TaskAiAdjustButton } from "./TaskAiAdjustmentPopover";
import { TaskCriteriaFields } from "./TaskCriteriaFields";
import { Button } from "./ui/button";

type Props = {
  criteria: string[];
  label: string;
  disabled?: boolean;
  mode?: "draft" | "saved";
  variant?: "default" | "heading";
  onSave?: (values: string[], expected: string[]) => void | Promise<void>;
  onAiAdjust?: (returnFocus?: HTMLElement | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function TaskCriteriaEditor({ criteria, label, disabled = false, mode = "saved", variant = "default", onSave, onAiAdjust, onDirtyChange }: Props) {
  const [open, setOpen] = useState(false);
  const [baseline, setBaseline] = useState(() => [...criteria]);
  const [values, setValues] = useState(() => criteria.length ? [...criteria] : [""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const dirtyCallback = useRef(onDirtyChange);
  dirtyCallback.current = onDirtyChange;
  const inputId = useId();
  const panelId = `${inputId}-panel`;
  const visibleCriteria = criteria.filter(value => value.trim());
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline.length ? baseline : [""]);
  const sourceSignature = JSON.stringify(criteria);
  const stale = sourceSignature !== JSON.stringify(baseline);
  const editable = Boolean(onSave) && !disabled;
  const inline = variant === "heading";
  const triggerText = open ? "收起编辑" : variant === "heading" && !visibleCriteria.length ? "新增完成标准" : "编辑";
  const triggerLabel = `${open ? "收起编辑" : variant === "heading" && !visibleCriteria.length ? "新增" : "编辑"}${label}的完成标准`;

  useEffect(() => {
    if (!dirty && stale) { setBaseline([...criteria]); setValues(criteria.length ? [...criteria] : [""]); }
  }, [sourceSignature, dirty, stale]);
  useEffect(() => { dirtyCallback.current?.((inline || open) && dirty); }, [inline, open, dirty]);
  useEffect(() => () => dirtyCallback.current?.(false), []);
  useEffect(() => {
    if (!open || variant !== "heading") return;
    const frame = requestAnimationFrame(() => panel.current?.querySelector("textarea")?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, variant]);

  const reload = () => { setBaseline([...criteria]); setValues(criteria.length ? [...criteria] : [""]); setError(""); setNotice(""); };
  const close = () => { reload(); setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); };
  const toggleEditor = () => {
    if (savingRef.current) return;
    if (open && dirty) { setError("请先保存或取消当前修改。"); return; }
    if (open) { close(); return; }
    reload(); setOpen(true);
  };
  const save = async () => {
    if (!onSave || disabled || savingRef.current || stale || (inline && !dirty)) return;
    setError("");
    try {
      const next = validateTaskCriteria(values);
      savingRef.current = true; setSaving(true);
      await onSave(next, [...baseline]);
      setBaseline(next); setValues(next.length ? next : [""]);
      if (!inline) setOpen(false);
      setNotice(JSON.stringify(next) === JSON.stringify(baseline) ? "" : mode === "draft" ? "完成标准已保存到草稿" : "完成标准已保存");
      if (!inline) requestAnimationFrame(() => trigger.current?.focus());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败，输入已保留，请重试。");
    } finally { savingRef.current = false; setSaving(false); }
  };

  if (inline && editable) return <div className="task-criteria-editor" data-editing="true" data-variant="heading">
    <TaskCriteriaFields disabled={saving} idPrefix={inputId} label={`${label}完成标准`} onChange={next => {
      if (savingRef.current) return;
      setValues(next); setError(""); setNotice("");
    }} onCommit={() => { void save(); }} values={values} />
    {stale && <div className="task-criteria-error" role="alert">完成标准已被其他操作更新，当前输入已保留。请先核对最新内容，避免覆盖。<Button onClick={reload} size="sm" type="button" variant="ghost">放弃当前修改，载入最新标准</Button></div>}
    {error && <p className="task-criteria-error" role="alert">{error}</p>}
    {saving && <p className="task-criteria-notice" role="status">正在保存完成标准…</p>}
    {!saving && notice && <p className="task-criteria-notice" role="status">{notice}</p>}
  </div>;

  return <div className="task-criteria-editor" data-editing={open && editable} data-variant={variant}>
    <div className="task-criteria-display-heading">
      {variant !== "heading" && <><span>完成标准</span><span className="task-criteria-count">共 {visibleCriteria.length} 条</span></>}
      {editable && <Button aria-controls={panelId} aria-expanded={open} aria-label={triggerLabel} className="task-criteria-edit-trigger" disabled={saving} onClick={toggleEditor} ref={trigger} size="sm" type="button" variant="ghost">{triggerText}</Button>}
    </div>
    {open && editable ? <div aria-label={`${label}完成标准编辑`} className="task-criteria-editor-panel" id={panelId} ref={panel} onKeyDown={event => {
      if (event.key === "Escape" && !event.nativeEvent.isComposing && !savingRef.current) { event.preventDefault(); event.stopPropagation(); close(); }
    }}>
      {variant !== "heading" && <div className="task-criteria-editor-heading"><strong>完成标准</strong><span>每条写清一个可核对的交付结果</span></div>}
      <TaskCriteriaFields disabled={saving} idPrefix={inputId} label={`${label}完成标准`} onChange={next => {
        if (savingRef.current) return;
        setValues(next); setError("");
      }} values={values} />
      {stale && <div className="task-criteria-error" role="alert">完成标准已被其他操作更新，当前输入已保留。请先核对最新内容，避免覆盖。<Button onClick={reload} size="sm" type="button" variant="ghost">放弃当前修改，载入最新标准</Button></div>}
      {error && <p className="task-criteria-error" role="alert">{error}</p>}
      <footer className="task-criteria-actions">
        {onAiAdjust && <TaskAiAdjustButton disabled={saving || dirty || stale} label={`AI 调整${label}完成标准`} onClick={anchor => onAiAdjust(anchor)} />}
        <span />
        <Button disabled={saving} onClick={close} size="sm" type="button" variant="ghost">取消</Button>
        <Button disabled={saving || stale} onClick={() => void save()} size="sm" type="button">{saving ? "保存中…" : "保存"}</Button>
      </footer>
      {dirty && onAiAdjust && <p className="task-criteria-hint">先保存或取消手工修改，再使用 AI 调整。</p>}
    </div> : visibleCriteria.length ? <ul aria-label={`${label}完成标准`} className="task-criteria-readonly">{visibleCriteria.map((value, index) => <li key={index}>{value}</li>)}</ul> : <p className="task-criteria-empty">{variant === "heading" ? "尚未设置完成标准" : "尚未填写完成标准"}</p>}
    {notice && <p className="task-criteria-notice" role="status">{notice}</p>}
  </div>;
}
