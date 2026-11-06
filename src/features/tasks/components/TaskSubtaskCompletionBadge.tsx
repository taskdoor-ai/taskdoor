import { useI18n } from "@/shared/i18n/I18nProvider";
import "@/features/tasks/styles/task-subtask-completion-badge.css";

export function TaskSubtaskCompletionBadge({ total, completed }: { total: number; completed?: number }) {
  const { locale } = useI18n();
  if (total <= 0) return null;
  const label = locale === "en" ? `${completed ?? "Unknown"} of ${total} direct subtasks completed` : `直属子任务：${completed ?? "未知"}/${total} 已完成`;
  return <span aria-label={label} className="task-subtask-completion-badge" title={label}>
    <svg aria-hidden="true" viewBox="0 0 20 20"><circle className="task-subtask-completion-track" cx="10" cy="10" r="7" /><circle className="task-subtask-completion-value" cx="10" cy="10" r="7" pathLength="100" strokeDasharray={`${completed === undefined ? 0 : completed / total * 100} 100`} /></svg>
    <span aria-hidden="true">{completed ?? "—"}/{total}</span>
  </span>;
}
