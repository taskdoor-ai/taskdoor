import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { PersonAvatar } from "./PersonAvatar";
import { TaskIcon } from "./TaskIcon";
import { TaskStatusBadge, type TaskStatus } from "./TaskStatusBadge";

export type TaskRelationSummary = {
  dueAt: string;
  goal: string;
  iconName?: TaskIconName;
  iconTone?: TaskIconTone;
  id: string;
  owner: string;
  status: TaskStatus;
  title: string;
};

type TaskRelationRow = {
  task: TaskRelationSummary;
  type: "上级任务" | "下级任务";
};

export function TaskRelationsSection({ childTasks = [], onOpenTask, parentTask }: { childTasks?: TaskRelationSummary[]; onOpenTask?: (taskId: string) => void; parentTask?: TaskRelationSummary }) {
  const total = childTasks.length + (parentTask ? 1 : 0);
  if (total === 0) return null;

  const relations: TaskRelationRow[] = [
    ...(parentTask ? [{ task: parentTask, type: "上级任务" as const }] : []),
    ...childTasks.map((task) => ({ task, type: "下级任务" as const })),
  ];

  return <section aria-labelledby="task-relations-heading" className="task-detail-section first-section task-relations-section">
    <div className="task-section-heading"><h2 id="task-relations-heading">关联任务</h2><span>{total} 项</span></div>
    <p className="task-section-intro">展示当前任务直接关联的上级和下级任务；点击任一行进入对应任务。</p>
    <div className="task-relation-table">
      <div aria-hidden="true" className="task-relation-columns"><span>任务名称</span><span>类型</span><span>状态</span><span>负责人</span></div>
      <ul className="task-relation-list">
        {relations.map(({ task, type }) => <li key={task.id}>
          <button className="task-relation-row" onClick={() => onOpenTask?.(task.id)} type="button">
            <span className="task-relation-field task-relation-row-title"><small aria-hidden="true" className="task-relation-inline-label">任务名称</small><span className="task-relation-title-content"><span className="sr-only">任务名称：</span><TaskIcon iconName={task.iconName} tone={task.iconTone} /><strong>{task.title}</strong></span></span>
            <span className="task-relation-field task-relation-type"><small aria-hidden="true" className="task-relation-inline-label">类型</small><span><span className="sr-only">类型：</span>{type}</span></span>
            <span className="task-relation-field task-relation-row-status"><small aria-hidden="true" className="task-relation-inline-label">状态</small><span className="sr-only">状态：</span><TaskStatusBadge size="sm" value={task.status} /></span>
            <span className="task-relation-field task-relation-owner"><small aria-hidden="true" className="task-relation-inline-label">负责人</small><span className="task-relation-owner-content"><span className="sr-only">负责人：</span><PersonAvatar name={task.owner} size="xs" /><span>{task.owner}</span></span></span>
          </button>
        </li>)}
      </ul>
    </div>
  </section>;
}
