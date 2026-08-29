import { CalendarDays, ChevronRight } from "lucide-react";
import { PersonAvatar, PersonName } from "./PersonAvatar";
import type { TaskRelationSummary } from "./TaskRelationsSection";
import { TaskIcon } from "./TaskIcon";
import { TaskStatusBadge } from "./TaskStatusBadge";

export function TaskSubtaskList({ onOpenTask, tasks }: { onOpenTask?: (taskId: string) => void; tasks: TaskRelationSummary[] }) {
  if (!tasks.length) return <div className="task-subtask-list-empty">当前任务还没有子任务</div>;

  return <div className="task-subtask-list-items">{tasks.map((task) => <button
    className="task-subtask-list-row"
    data-task-id={task.id}
    disabled={!onOpenTask}
    key={task.id}
    onClick={() => onOpenTask?.(task.id)}
    type="button"
  >
    <TaskIcon iconName={task.iconName} tone={task.iconTone} />
    <span className="task-subtask-list-copy"><strong>{task.title}</strong><small>{task.goal}</small></span>
    <TaskStatusBadge size="sm" value={task.status} />
    <span className="task-subtask-list-owner"><PersonAvatar name={task.owner} personId={task.owner} profilePreviewFocusable={false} size="xs" /><PersonName name={task.owner} personId={task.owner} /></span>
    <span className="task-subtask-list-due"><CalendarDays aria-hidden="true" size={14} />{task.dueAt}</span>
    <ChevronRight aria-hidden="true" size={16} />
  </button>)}</div>;
}
