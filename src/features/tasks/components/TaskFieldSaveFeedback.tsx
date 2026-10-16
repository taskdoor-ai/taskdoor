import { Check } from "lucide-react";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import type { TaskTextSaveStatus } from "@/features/tasks/lib/useTaskTextSaveFeedback";

export function TaskFieldSaveFeedback({ status }: { status: TaskTextSaveStatus }) {
  const d = useDetailCopy();
  const visible = status === "saved" || status === "saving";
  return <span className="task-field-save-feedback" data-visible={visible} data-status={status} role="status" aria-live="polite" aria-atomic="true">
    {status === "saved" && <><Check aria-hidden="true" size={13} strokeWidth={2} />{d("fieldSaved")}</>}
    {status === "saving" && d("fieldSaving")}
  </span>;
}
