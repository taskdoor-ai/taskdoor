import { ChevronRight } from "lucide-react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { statusMessageKey } from "@/shared/i18n/task-status";
import { formatLegacyDateLabel } from "@/shared/lib/date-time";
import { normalizeTaskStatus, type PersonOption } from "@/shared/model/task-model";
import { PersonAvatar, PersonName } from "@/shared/ui/PersonAvatar";
import { TaskStatusBadge, type TaskStatus } from "@/shared/ui/TaskStatusBadge";
import "@/features/tasks/styles/discussion-task-links.css";

export type DiscussionTaskLink = {
  id: string;
  title: string;
  ownerId?: string;
  owner?: string;
  status: TaskStatus;
  goal?: string;
  completionCriteria?: string[];
  endDate?: string;
};

type Props = {
  tasks: readonly DiscussionTaskLink[];
  people: readonly PersonOption[];
  onOpenTask?: (taskId: string) => void;
};

export function TaskDiscussionTaskLinks({ tasks, people, onOpenTask }: Props) {
  const { locale, t } = useI18n();
  const english = locale === "en";
  if (!tasks.length) return null;

  return <div aria-label={english ? "Created subtasks" : "已创建的子任务"} className="task-discussion-task-links">
    {tasks.map(task => {
      const owner = people.find(person => person.id === task.ownerId)
        ?? people.find(person => person.name === task.owner || person.id === task.owner);
      const ownerName = owner?.name || task.owner?.trim() || (task.ownerId
        ? english ? "Assignee unavailable" : "负责人不可用"
        : english ? "Unassigned" : "暂不分配");
      const status = normalizeTaskStatus(task.status);
      const statusLabel = t(statusMessageKey[status]);
      const criteria = (task.completionCriteria ?? []).filter(criterion => criterion.trim());
      const endDate = task.endDate?.trim();

      return <details className="task-discussion-task-link" key={task.id}>
        <summary className="task-discussion-task-link-summary">
          <span className="task-discussion-task-link-title" title={task.title}>{task.title}</span>
          <span aria-label={`${english ? "Assignee" : "负责人"}：${ownerName}`} className="task-discussion-task-link-owner" title={ownerName}>
            {owner || task.owner?.trim() ? <><PersonAvatar name={ownerName} personId={owner?.id ?? task.ownerId} profile={owner} showProfilePreview={false} size="xs" /><PersonName name={ownerName} personId={owner?.id ?? task.ownerId} profile={owner} showProfilePreview={false} /></> : ownerName}
          </span>
          <div className="task-discussion-task-link-trailing">
            <div aria-label={`${english ? "Status" : "状态"}：${statusLabel}`} className="task-discussion-task-link-status"><TaskStatusBadge size="sm" value={status} /></div>
            <ChevronRight aria-hidden="true" className="task-discussion-task-link-chevron" size={14} />
          </div>
        </summary>
        <div className="task-discussion-task-link-card">
          <strong>{task.title}</strong>
          {(task.goal?.trim() || criteria.length > 0 || endDate) && <dl>
            {task.goal?.trim() && <div><dt>{english ? "Goal" : "目标"}</dt><dd>{task.goal}</dd></div>}
            {criteria.length > 0 && <div><dt>{english ? "Completion criteria" : "完成标准"}</dt><dd><ul>{criteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul></dd></div>}
            {endDate && <div><dt>{english ? "Due date" : "截止日期"}</dt><dd>{formatLegacyDateLabel(endDate, locale)}</dd></div>}
          </dl>}
          {onOpenTask && <button className="task-discussion-task-link-open" onClick={() => onOpenTask(task.id)} type="button">{english ? "Open task" : "打开任务"}<ChevronRight aria-hidden="true" size={13} /></button>}
        </div>
      </details>;
    })}
  </div>;
}
