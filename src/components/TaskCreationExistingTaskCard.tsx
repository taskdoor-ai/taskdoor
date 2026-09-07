import type { TagDefinition } from "../data/tagGroups";
import type { ExistingTaskCandidate } from "../lib/taskCreationScenario";
import { CalendarDays, GitBranch, Link2 } from "lucide-react";
import React from "react";
import { PersonAvatar } from "./PersonAvatar";
import { TagBadge } from "./TagBadge";
import { TaskIcon } from "./TaskIcon";
import { TaskStatusBadge, taskStatusOptions, type TaskStatus } from "./TaskStatusBadge";

type TaskCreationExistingTaskCardProps = {
  kind: "similar" | "parent";
  ownerName?: string;
  reason: string;
  tags: TagDefinition[];
  task: ExistingTaskCandidate;
};

export function TaskCreationExistingTaskCard({ kind, ownerName, reason, tags, task }: TaskCreationExistingTaskCardProps) {
  const title = task.name ?? task.title ?? "未命名任务";
  const kindLabel = kind === "similar" ? "相似任务" : "主任务";
  const taskTags = (task.labels ?? []).map((label) => tags.find((tag) => tag.name === label)).filter((tag): tag is TagDefinition => Boolean(tag));
  const unresolvedLabels = (task.labels ?? []).filter((label) => !taskTags.some((tag) => tag.name === label));
  const schedule = task.plannedStartOn && task.plannedEndOn
    ? `${task.plannedStartOn} 至 ${task.plannedEndOn}`
    : task.plannedEndOn ?? task.dueAt ?? task.endDate;
  const knownStatus = task.status && taskStatusOptions.includes(task.status as TaskStatus)
    ? task.status as TaskStatus
    : null;
  const childTaskNames = task.childTaskNames ?? [];

  return <article aria-label={`${kindLabel}：${title}`} className="task-creation-existing-task-card" data-kind={kind}>
    <header className="task-creation-existing-task-header">
      <span className="task-creation-existing-task-kind">{kind === "similar" ? <Link2 aria-hidden="true" /> : <GitBranch aria-hidden="true" />}{kindLabel}</span>
      <span className="task-creation-existing-task-readonly">只读</span>
    </header>

    <div className="task-creation-existing-task-main">
      <TaskIcon iconName={task.iconName} size="lg" tone={task.iconTone} />
      <div className="task-creation-existing-task-copy">
        <h3>{title}</h3>
        {task.goal && <p>{task.goal}</p>}
      </div>
    </div>

    <div aria-label="已有任务信息" className="task-creation-existing-task-meta">
      {task.ownerId && <div className="task-detail-property task-creation-existing-task-owner"><small>负责人</small><PersonAvatar name={ownerName ?? task.ownerId} personId={task.ownerId} profilePreviewFocusable={false} size="xs" /><span>{ownerName ?? task.ownerId}</span></div>}
      {task.status && <div className="task-detail-property"><small>状态</small>{knownStatus ? <TaskStatusBadge size="sm" value={knownStatus} /> : <span>{task.status}</span>}</div>}
      {schedule && <span><CalendarDays aria-hidden="true" />{schedule}</span>}
      {(taskTags.length > 0 || unresolvedLabels.length > 0) && <span aria-label="任务标签" className="task-creation-existing-task-tags">
        {taskTags.map((tag) => <TagBadge key={tag.id} size="xs" tag={tag} />)}
        {unresolvedLabels.map((label) => <span className="task-creation-existing-task-tag" key={label}>{label}</span>)}
      </span>}
    </div>

    {kind === "parent" && childTaskNames.length > 0 && <section aria-label="已有子任务" className="task-creation-existing-task-children">
      <strong><GitBranch aria-hidden="true" />已有 {childTaskNames.length} 个子任务</strong>
      <ul>{childTaskNames.slice(0, 3).map((name) => <li key={name}>{name}</li>)}</ul>
      {childTaskNames.length > 3 && <small>另有 {childTaskNames.length - 3} 个</small>}
    </section>}

    <div className="task-creation-existing-task-reason"><span>匹配依据</span><p>{reason}</p></div>
  </article>;
}
