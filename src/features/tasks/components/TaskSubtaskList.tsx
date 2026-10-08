import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { ChevronRight, ListTree } from "lucide-react";
import { getTaskProgressDisplay } from "@/features/tasks/lib/task-progress-display";
import { getTaskProgressDemoExample } from "@/ai/mock/data/taskProgressDemo";
import type { TaskProgressComparisonSeries } from "@/features/tasks/lib/task-progress-comparison";
import { getTaskEffortDistribution, type TaskEffortDistributionInput } from "@/features/tasks/lib/task-effort-distribution";
import { TaskStatusBadge } from "@/shared/ui/TaskStatusBadge";
import { TaskProgressStage } from "@/features/tasks/components/TaskProgressStage";
import { TaskProgressOverview } from "@/features/tasks/components/TaskProgressOverview";
import { PersonAvatar, PersonName } from "@/shared/ui/PersonAvatar";
import { useResolvedPersonProfile } from "@/shared/ui/PersonDirectory";
import type { TaskRelationSummary } from "@/features/tasks/components/TaskRelationsSection";
import { TaskIcon } from "@/features/tasks/components/TaskIcon";

function SubtaskOwner({ owner }: Pick<TaskRelationSummary, "owner">) {
  const d = useDetailCopy();
  const identity = owner;
  const profile = useResolvedPersonProfile({ identity, name: identity ?? "" });
  const avatarOnly = profile?.membershipStatus === "invited";
  return <span className="task-subtask-list-owner">{identity ? <>
    <PersonAvatar name={identity} personId={identity} profile={profile} profilePreviewFocusable={avatarOnly} size="xs" />
    {!avatarOnly && <PersonName name={identity} personId={identity} profile={profile} />}
  </> : <span>{d('unassigned')}</span>}</span>;
}

export function TaskSubtaskList({ onOpenTask, tasks, effortTasks = [], completedMinutesByTaskId, progressComparisonsByTaskId }: {
  onOpenTask?: (taskId: string) => void;
  tasks: TaskRelationSummary[];
  effortTasks?: TaskEffortDistributionInput[];
  completedMinutesByTaskId?: Readonly<Record<string, number | null>>;
  progressComparisonsByTaskId?: Readonly<Record<string, TaskProgressComparisonSeries | undefined>>;
}) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const mock = useMockText();
  if (!tasks.length) return <div className="task-subtask-list-empty">{d('noSubtasks')}</div>;

  const distribution = getTaskEffortDistribution(effortTasks, "example");
  return <div className="task-subtask-list-items">{tasks.map((task) => {
    const series = getTaskProgressDemoExample(task.id, progressComparisonsByTaskId?.[task.id]);
    const effort = effortTasks.find(item => item.id === task.id);
    const scope = distribution.rows.find(row => row.id === task.id);
    const progress = getTaskProgressDisplay({ series, task: { ...task, ...effort, status: task.status },
      scopeMinutes: scope?.minutes, completedMinutes: series ? undefined : completedMinutesByTaskId?.[task.id] });
    return <details className="task-subtask-list-item" data-tone={task.iconTone ?? "neutral"} key={task.id}><summary aria-label={ui("子任务详情：{0}", {0: task.title})} className="task-subtask-list-row">
      <TaskIcon iconName={task.iconName} tone={task.iconTone} />
      <button aria-label={ui("打开子任务：{0}", {0: task.title})} className="task-subtask-title" data-task-id={task.id} disabled={!onOpenTask} onClick={() => onOpenTask?.(task.id)} type="button">
        <span>{mock.field(task.id, "title", task.title)}</span>
        {Boolean(task.childTaskCount && task.childTaskCount > 0) && <small aria-label={ui("{0} 个直接子任务", {0: task.childTaskCount ?? 0})} className="task-subtask-title-count"><ListTree aria-hidden="true" size={15} /><span>{ui("子任务(")}{task.childTaskCount})</span></small>}
      </button>
      <SubtaskOwner owner={task.owner} />
      <TaskStatusBadge size="sm" value={task.status}/>
      <ChevronRight aria-hidden="true" className="task-subtask-disclosure-icon" size={16}/>
    </summary>
      <div className="task-subtask-list-progress">
        <TaskProgressOverview compact model={progress} showScheduleHeading={false} showScheduleLabel={false} progress={<TaskProgressStage compact model={progress} label={ui("{0} 完成进度", {0: task.title})}/>}/>
        {progress.scheduleIssue && <p className="task-schedule-error">{progress.scheduleIssue}</p>}
      </div>
    </details>;
  })}</div>;
}
