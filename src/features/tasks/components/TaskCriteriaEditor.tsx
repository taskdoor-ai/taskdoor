import type { ComponentProps } from "react";
import { useGlobalUi } from "../i18n/globalUi";
import { useDetailCopy } from "../i18n/detailMessages";
import { useEffect, useId, useRef, useState } from "react";
import { validateTaskCriteria } from "../lib/taskCriteriaEditing";
import { TaskAiAdjustButton } from "./TaskAiAdjustmentPopover";
import { TaskCriteriaFields } from "./TaskCriteriaFields";
import { Button } from "./ui/button";

type Props = {
  renderMark?: ComponentProps<typeof TaskCriteriaFields>["renderMark"];
  renderAction?: ComponentProps<typeof TaskCriteriaFields>["renderAction"];
  criteria: string[];
  label: string;
  disabled?: boolean;
  mode?: "draft" | "saved";
  variant?: "default" | "heading";
  onSave?: (values: string[], expected: string[]) => void | Promise<void>;
  onAiAdjust?: (returnFocus?: HTMLElement | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function TaskCriteriaEditor({ renderMark, renderAction, criteria, label, disabled = false, mode = "saved", variant = "default", onSave, onAiAdjust, onDirtyChange }: Props) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const inline = variant === "heading";
  const [open, setOpen] = useState(false);
  const [baseline, setBaseline] = useState(() => [...criteria]);
  const [values, setValues] = useState(() => criteria.length || inline ? [...criteria] : [""]);
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
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline.length || inline ? baseline : [""]);
  const sourceSignature = JSON.stringify(criteria);
  const stale = sourceSignature !== JSON.stringify(baseline);
  const editable = Boolean(onSave) && !disabled;
  const triggerText = open ? d('collapseEditor') : variant === "heading" && !visibleCriteria.length ? d('addCriteria') : d('edit');
  const triggerLabel = `${open ? d('collapseEditor') : variant === "heading" && !visibleCriteria.length ? d('add') : d('edit')} ${label}: ${d("criteria")}`;

  useEffect(() => {
    if (!dirty && stale) { setBaseline([...criteria]); setValues(criteria.length || inline ? [...criteria] : [""]); }
  }, [sourceSignature, dirty, stale]);
  useEffect(() => { dirtyCallback.current?.((inline || open) && dirty); }, [inline, open, dirty]);
  useEffect(() => () => dirtyCallback.current?.(false), []);
  useEffect(() => {
    if (!open || variant !== "heading") return;
    const frame = requestAnimationFrame(() => panel.current?.querySelector("textarea")?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, variant]);

  const reload = () => { setBaseline([...criteria]); setValues(criteria.length || inline ? [...criteria] : [""]); setError(""); setNotice(""); };
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
      setBaseline(next); setValues(next.length || inline ? next : [""]);
      if (!inline) setOpen(false);
      setNotice(JSON.stringify(next) === JSON.stringify(baseline) ? "" : mode === "draft" ? "完成标准已保存到草稿" : "完成标准已保存");
      if (!inline) requestAnimationFrame(() => trigger.current?.focus());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败，输入已保留，请重试。");
    } finally { savingRef.current = false; setSaving(false); }
  };

  if (inline && editable) return <div className="task-criteria-editor" data-editing="true" data-variant="heading">
    <TaskCriteriaFields renderMark={renderMark ? (index, value) => renderMark(index, value, editable && !dirty && !saving && !stale) : undefined} renderAction={!dirty && !saving && !stale ? renderAction : undefined} disabled={saving} idPrefix={inputId} label={`${label}: ${d("criteria")}`} onChange={next => {
      if (savingRef.current) return;
      setValues(next); setError(""); setNotice("");
    }} onCommit={() => { void save(); }} showInitialEmptyRow={false} values={values} />
    {stale && <div className="task-criteria-error" role="alert">{d('criteriaStale')}<Button onClick={reload} size="sm" type="button" variant="ghost">{d('reloadCriteria')}</Button></div>}
    {error && <p className="task-criteria-error" role="alert">{ui(error)}</p>}
    {saving && <p className="task-criteria-notice" role="status">{d('savingCriteria')}</p>}
    {!saving && notice && <p className="task-criteria-notice" role="status">{ui(notice)}</p>}
  </div>;

  return <div className="task-criteria-editor" data-editing={open && editable} data-variant={variant}>
    <div className="task-criteria-display-heading">
      {variant !== "heading" && <><span>{d('criteria')}</span><span className="task-criteria-count">{ui("共")}{visibleCriteria.length}{ui("条")}</span></>}
      {editable && <Button aria-controls={panelId} aria-expanded={open} aria-label={triggerLabel} className="task-criteria-edit-trigger" disabled={saving} onClick={toggleEditor} ref={trigger} size="sm" type="button" variant="ghost">{triggerText}</Button>}
    </div>
    {open && editable ? <div aria-label={`${d("edit")} ${label}: ${d("criteria")}`} className="task-criteria-editor-panel" id={panelId} ref={panel} onKeyDown={event => {
      if (event.key === "Escape" && !event.nativeEvent.isComposing && !savingRef.current) { event.preventDefault(); event.stopPropagation(); close(); }
    }}>
      {variant !== "heading" && <div className="task-criteria-editor-heading"><strong>{d('criteria')}</strong><span>{d('criteriaGuidance')}</span></div>}
      <TaskCriteriaFields renderMark={renderMark ? (index, value) => renderMark(index, value, editable && !dirty && !saving && !stale) : undefined} renderAction={!dirty && !saving && !stale ? renderAction : undefined} disabled={saving} idPrefix={inputId} label={`${label}: ${d("criteria")}`} onChange={next => {
        if (savingRef.current) return;
        setValues(next); setError("");
      }} values={values} />
      {stale && <div className="task-criteria-error" role="alert">{d('criteriaStale')}<Button onClick={reload} size="sm" type="button" variant="ghost">{d('reloadCriteria')}</Button></div>}
      {error && <p className="task-criteria-error" role="alert">{ui(error)}</p>}
      <footer className="task-criteria-actions">
        {onAiAdjust && <TaskAiAdjustButton disabled={saving || dirty || stale} label={ui("AI 调整{0}完成标准", {0: label})} onClick={anchor => onAiAdjust(anchor)} />}
        <span />
        <Button disabled={saving} onClick={close} size="sm" type="button" variant="ghost">{d('cancel')}</Button>
        <Button disabled={saving || stale} onClick={() => void save()} size="sm" type="button">{saving ? ui("保存中…") : d('save')}</Button>
      </footer>
      {dirty && onAiAdjust && <p className="task-criteria-hint">{ui("先保存或取消手工修改，再使用 AI 调整。")}</p>}
    </div> : visibleCriteria.length ? <ul aria-label={`${label}: ${d("criteria")}`} className="task-criteria-readonly">{visibleCriteria.map((value, index) => <li key={index}>{value}</li>)}</ul> : <p className="task-criteria-empty">{variant === "heading" ? d('noCriteria') : ui("尚未填写完成标准")}</p>}
    {notice && <p className="task-criteria-notice" role="status">{ui(notice)}</p>}
  </div>;
}
