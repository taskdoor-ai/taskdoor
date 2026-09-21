import { useMockText } from "../i18n/MockDataProvider";
import { useGlobalUi } from "../i18n/globalUi";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { CheckCircle2, CircleDashed, CornerDownRight, Link2 } from "lucide-react";
import { PersonAvatar, PersonName } from "./PersonAvatar";
import { TaskIcon } from "./TaskIcon";
import { TaskStatusBadge, type TaskStatus } from "./TaskStatusBadge";

export type TaskRelationSummary = {
  childTaskCount?: number;
  createdAt?: string;
  completedAt?: string;
  progressReopenedAt?: string;
  plannedStartOn?: string;
  plannedEndOn?: string;
  completionCriteria?: string[];
  dependsOnTaskIds?: string[];
  parentTaskId?: string;
  dueAt: string;
  goal: string;
  iconName?: TaskIconName;
  iconTone?: TaskIconTone;
  id: string;
  labels?: string[];
  owner: string;
  status: TaskStatus;
  title: string;
  updatedAt?: string;
};

type RelationGroupProps = { icon: typeof Link2; label: string; tasks: TaskRelationSummary[] };

function RelationGroup({ icon: Icon, label, tasks }: RelationGroupProps) {
  const ui = useGlobalUi();
  const mock = useMockText();
  return <div className="task-context-group">
    <span className="task-context-label"><Icon aria-hidden="true" size={14} />{label}</span>
    <div className="task-context-items">{tasks.length ? tasks.map((task) => {
      const ready = task.status === "已完成";
      const readinessLabel = ready ? ui("已完成") : ui("未完成");
      return <div className="task-context-dependency" data-ready={ready ? "true" : "false"} key={task.id}>
      <em aria-label={readinessLabel} title={readinessLabel}>{ready ? <CheckCircle2 aria-hidden="true" size={13} /> : <CircleDashed aria-hidden="true" size={13} />}</em>
      <TaskIcon iconName={task.iconName} tone={task.iconTone} />
      <span>{mock.field(task.id, "title", task.title)}</span>
    </div>;
    }) : <span className="task-context-empty">{ui("无前置依赖，可直接推进")}</span>}</div>
  </div>;
}

function ParentTaskCard({ task }: { task: TaskRelationSummary }) {
  const ui = useGlobalUi();
  const mock = useMockText();
  return <article className="task-parent-card">
    <span className="task-context-label"><CornerDownRight aria-hidden="true" size={14} />{ui("父任务")}</span>
    <div className="task-parent-card-body">
      <TaskIcon iconName={task.iconName} tone={task.iconTone} />
      <span className="task-parent-card-copy">
        <strong>{mock.field(task.id, "title", task.title)}</strong>
        <span className="task-parent-card-meta">
          <TaskStatusBadge size="sm" value={task.status} />
          <span className="task-parent-card-owner"><PersonAvatar name={task.owner} personId={task.owner} profilePreviewFocusable={false} size="xs" /><PersonName name={task.owner} personId={task.owner} /></span>
        </span>
      </span>
    </div>
  </article>;
}

export function TaskRelationsSection({ dependencyTasks = [], hasChildTasks = false, parentTask }: { dependencyTasks?: TaskRelationSummary[]; hasChildTasks?: boolean; parentTask?: TaskRelationSummary }) {
  const ui = useGlobalUi();
  const standalone = !parentTask && !hasChildTasks && dependencyTasks.length === 0;
  if (standalone) return null;
  if (hasChildTasks && !parentTask && dependencyTasks.length === 0) return null;
  return <section aria-label={ui("任务关系")} className="task-context-strip" data-has-parent={parentTask ? "true" : "false"}>
    <>
      {parentTask ? <ParentTaskCard task={parentTask} /> : <RelationGroup icon={CornerDownRight} label={ui("归属于主任务")} tasks={[]} />}
      <RelationGroup icon={Link2} label={ui("前置依赖")} tasks={dependencyTasks} />
    </>
  </section>;
}
