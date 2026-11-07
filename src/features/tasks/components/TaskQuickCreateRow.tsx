import { useLayoutEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { TaskInlineCreateForm } from "@/features/tasks/components/TaskInlineCreateForm";
import { useI18n } from "@/shared/i18n/I18nProvider";

type TaskQuickCreateRowProps = {
  id: string;
  inputRef: RefObject<HTMLInputElement | null>;
  open: boolean;
  onClose: () => void;
  onCreate: (prompt: string) => Promise<void>;
};

export function TaskQuickCreateRow({ id, inputRef, open, onClose, onCreate }: TaskQuickCreateRowProps) {
  const { locale } = useI18n();
  const en = locale === "en";
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  useLayoutEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [inputRef, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const description = prompt.trim();
    if (!open || !description || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      await onCreate(description);
      setPrompt("");
      onClose();
    } catch (failure) {
      if (!(failure instanceof Error && failure.name === "AbortError")) {
        setError(failure instanceof Error ? failure.message : (en ? "Could not create the task. Your input has been kept. Try again." : "创建失败，输入已保留，请重试。"));
      }
      window.requestAnimationFrame(() => {
        const input = inputRef.current;
        if (input?.isConnected && !input.closest("[hidden]")) input.focus({ preventScroll: true });
      });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return <div hidden={!open}>
    <TaskInlineCreateForm error={error} id={id} inputLabel={en ? "Task request" : "任务需求"} inputRef={inputRef} label={en ? "Quick create task" : "快捷创建任务"} onCancel={onClose} onChange={value => { setPrompt(value); setError(""); }} onSubmit={submit} saving={saving} value={prompt} />
  </div>;
}
