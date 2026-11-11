import { useEffect, useRef, type FormEvent, type RefObject } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Button } from "@/shared/ui/button";
import { TaskStatusIcon } from "@/shared/ui/TaskStatusBadge";
import "@/features/tasks/styles/task-inline-create.css";

type Props = {
  id: string;
  label: string;
  inputLabel: string;
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  saving: boolean;
  error: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onDismiss?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function TaskInlineCreateForm({ id, label, inputLabel, inputRef, value, saving, error, onChange, onCancel, onDismiss, onSubmit }: Props) {
  const { locale } = useI18n();
  const en = locale === "en";
  const formRef = useRef<HTMLFormElement>(null);
  const isEmpty = !value.trim();

  useEffect(() => {
    const form = formRef.current;
    if (!form || !onDismiss || !isEmpty || saving) return;
    const ownerDocument = form.ownerDocument;
    const dismissOnOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || form.contains(target) || form.closest("[hidden], [inert]")) return;
      if (target.closest("[aria-controls]")?.getAttribute("aria-controls") === id) return;
      onDismiss();
    };
    // Wait for click so collapsing the row cannot shift the pointer's target.
    ownerDocument.addEventListener("click", dismissOnOutsideClick, true);
    return () => ownerDocument.removeEventListener("click", dismissOnOutsideClick, true);
  }, [id, isEmpty, onDismiss, saving]);

  return <>
    <form aria-busy={saving} aria-label={label} className="task-inline-create" id={id} ref={formRef} onSubmit={onSubmit} onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) {
        if (event.key === "Enter") event.preventDefault();
        return;
      }
      if (event.key === "Escape" && !saving) {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    }}>
      <TaskStatusIcon status="进行中" aria-hidden="true" size={16} />
      <input aria-describedby={error ? `${id}-error` : undefined} aria-label={inputLabel} aria-required="true" autoComplete="off" disabled={saving} maxLength={2000} onChange={event => onChange(event.target.value)} placeholder={en ? "Describe your task…" : "描述你要完成的任务…"} ref={inputRef} value={value} />
      <Button disabled={saving} onClick={onCancel} size="sm" type="button" variant="ghost">{en ? "Cancel" : "取消"}</Button>
      <Button disabled={saving || isEmpty} size="sm" type="submit">{saving ? (en ? "Generating…" : "生成中…") : (en ? "Create" : "创建")}</Button>
    </form>
    {error && <p className="task-inline-create-error" id={`${id}-error`} role="alert">{error}</p>}
  </>;
}
