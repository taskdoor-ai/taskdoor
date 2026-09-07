import { PersonAvatar, PersonName } from "./PersonAvatar";
import type { TaskRelationSummary } from "./TaskRelationsSection";
import { TaskIcon } from "./TaskIcon";
import { getTaskDependencySummary } from "../lib/taskDependencies";

export function TaskSubtaskList({ onOpenTask, tasks, dependencyTasks = [] }: {
  onOpenTask?: (taskId: string) => void;
  tasks: TaskRelationSummary[];
  dependencyTasks?: TaskRelationSummary[];
}) {
  if (!tasks.length) return <div className="task-subtask-list-empty">当前任务还没有子任务</div>;

  return <div className="task-subtask-list-items">{tasks.map((task) => {
    const displayedOwner = task.owner || task.proposedOwnerId;
    const isPending = !task.owner && Boolean(task.proposedOwnerId);
    const dependencySummary = getTaskDependencySummary(task.dependsOnTaskIds ?? [], [...tasks, ...dependencyTasks]);
    return <div className="task-subtask-list-item" data-tone={task.iconTone ?? "neutral"} key={task.id}><div className="task-subtask-list-row">
      <TaskIcon iconName={task.iconName} tone={task.iconTone} />
      <button aria-label={`打开子任务：${task.title}`} className="task-subtask-title" data-task-id={task.id} disabled={!onOpenTask} onClick={() => onOpenTask?.(task.id)} type="button">{task.title}{dependencySummary && <small className="task-subtask-dependency-note">{dependencySummary}</small>}</button>
      <span className="task-subtask-list-owner">{displayedOwner ? <><PersonAvatar invitationStatus={isPending ? "pending" : undefined} name={displayedOwner} personId={displayedOwner} profilePreviewFocusable={false} size="xs" /><PersonName name={displayedOwner} personId={displayedOwner} />{isPending && <small>待接受</small>}</> : <span>待定</span>}</span>
    </div></div>;
  })}</div>;
}
