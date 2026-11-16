import { useProgressCopy } from "@/features/tasks/i18n/progress-copy";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { ChevronRight } from "lucide-react";
import { getTaskProgressDisplay } from "@/features/tasks/lib/task-progress-display";
import { useTeamTimeZone } from "@/shared/lib/useTeamTimeZone";
import { getTaskProgressDemoExample } from "@/ai/mock/data/taskProgressDemo";
import type { TaskProgressComparisonSeries } from "@/features/tasks/lib/task-progress-comparison";
import { getTaskEffortDistribution, type TaskEffortDistributionInput } from "@/features/tasks/lib/task-effort-distribution";
import { TaskListRow } from "@/features/tasks/components/TaskListRow";
import { TaskProgressStage } from "@/features/tasks/components/TaskProgressStage";
import { TaskProgressOverview } from "@/features/tasks/components/TaskProgressOverview";
import { PersonName, usePersonLabels } from "@/shared/ui/PersonAvatar";
import { useResolvedPersonProfile } from "@/shared/ui/PersonDirectory";
import type { TaskRelationSummary } from "@/features/tasks/components/TaskRelationsSection";
import type { ReactNode } from "react";

function SubtaskRow({ task, title, now, series, onOpen }: {
  task: TaskRelationSummary;
  title: string;
  now: Date;
  series?: TaskProgressComparisonSeries;
  onOpen?: () => void;
}) {
  const { t } = useI18n();
  const ui = useGlobalUi();
  const { name: personLabel } = usePersonLabels();
  const profile = useResolvedPersonProfile({ identity: task.owner, name: task.owner });
  const name = profile ? personLabel(profile) : task.owner || t("list.unassigned");
  const avatarOnly = profile?.membershipStatus === "invited";
  return <TaskListRow
    as="span"
    descriptionId={`subtask-row-description-${task.id}`}
    now={now}
    onOpen={onOpen}
    openLabel={ui("打开子任务：{0}", {0: title})}
    owner={{
      id: task.owner,
      name,
      profile,
      avatarFocusable: avatarOnly,
      nameContent: avatarOnly ? null : task.owner ? <PersonName name={name} personId={task.owner} profile={profile} /> : undefined,
    }}
    series={series}
    task={task}
    title={title}
  />;
}

export function TaskSubtaskList({ emptyAction, onOpenTask, tasks, effortTasks = [], completedMinutesByTaskId, progressComparisonsByTaskId }: {
  emptyAction?: ReactNode;
  onOpenTask?: (taskId: string) => void;
  tasks: TaskRelationSummary[];
  effortTasks?: TaskEffortDistributionInput[];
  completedMinutesByTaskId?: Readonly<Record<string, number | null>>;
  progressComparisonsByTaskId?: Readonly<Record<string, TaskProgressComparisonSeries | undefined>>;
}) {
  const ui = useGlobalUi();
  const p = useProgressCopy();
  const timeZone = useTeamTimeZone();
  const d = useDetailCopy();
  const mock = useMockText();
  if (!tasks.length) return <div className="task-subtask-list-empty">{emptyAction || <p>{d('noSubtasks')}</p>}</div>;

  const now = new Date();
  const distribution = getTaskEffortDistribution(effortTasks, "example");
  return <div className="task-subtask-list-items task-list-refresh task-list-row-layout">{tasks.map((task) => {
    const series = getTaskProgressDemoExample(task.id, progressComparisonsByTaskId?.[task.id]);
    const effort = effortTasks.find(item => item.id === task.id);
    const scope = distribution.rows.find(row => row.id === task.id);
    const progress = getTaskProgressDisplay({ timeZone, series, task: { ...task, ...effort, status: task.status },
      scopeMinutes: scope?.minutes, completedMinutes: series ? undefined : completedMinutesByTaskId?.[task.id] });
    const title = mock.field(task.id, "title", task.title);
    return <details className="task-subtask-list-item" key={task.id}><summary aria-label={ui("子任务详情：{0}", {0: title})} className="task-subtask-list-row task-workspace-row-entry" data-has-owner>
      <SubtaskRow now={now} onOpen={onOpenTask ? () => onOpenTask(task.id) : undefined} series={series} task={task} title={title} />
      <ChevronRight aria-hidden="true" className="task-subtask-disclosure-icon" size={16}/>
    </summary>
      <div className="task-subtask-list-progress">
        <TaskProgressOverview compact model={progress} showScheduleHeading={false} showScheduleLabel={false} progress={<TaskProgressStage compact model={progress} label={ui("{0} 完成进度", {0: task.title})}/>}/>
        {progress.scheduleIssue && <p className="task-schedule-error">{p(progress.scheduleIssue)}</p>}
      </div>
    </details>;
  })}</div>;
}
