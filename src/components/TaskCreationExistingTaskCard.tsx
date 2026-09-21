import { mockPersonName } from "../i18n/mockContent";
import { useCreationI18n } from "../i18n/creationMessages";
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
  const { c, locale, localize } = useCreationI18n();
  const displayedOwner = mockPersonName(locale, task.ownerId ?? "", ownerName ?? task.ownerId ?? "");
  const title = task.name ?? task.title ?? c("untitledTask");
  const kindLabel = kind === "similar" ? c("similarTask") : c("mainTask");
  const taskTags = (task.labels ?? []).map((label) => tags.find((tag) => tag.name === label)).filter((tag): tag is TagDefinition => Boolean(tag));
  const unresolvedLabels = (task.labels ?? []).filter((label) => !taskTags.some((tag) => tag.name === label));
  const schedule = task.plannedStartOn && task.plannedEndOn
    ? c("to", { v0: task.plannedStartOn, v1: task.plannedEndOn })
    : task.plannedEndOn ?? task.dueAt ?? task.endDate;
  const knownStatus = task.status && taskStatusOptions.includes(task.status as TaskStatus)
    ? task.status as TaskStatus
    : null;
  const childTaskNames = task.childTaskNames ?? [];

  return <article aria-label={`${kindLabel}：${title}`} className="task-creation-existing-task-card" data-kind={kind}>
    <header className="task-creation-existing-task-header">
      <span className="task-creation-existing-task-kind">{kind === "similar" ? <Link2 aria-hidden="true" /> : <GitBranch aria-hidden="true" />}{kindLabel}</span>
      <span className="task-creation-existing-task-readonly">{c("readOnly")}</span>
    </header>

    <div className="task-creation-existing-task-main">
      <TaskIcon iconName={task.iconName} size="lg" tone={task.iconTone} />
      <div className="task-creation-existing-task-copy">
        <h3>{title}</h3>
        {task.goal && <p>{task.goal}</p>}
      </div>
    </div>

    <div aria-label={c("existingTaskDetails")} className="task-creation-existing-task-meta">
      {task.ownerId && <div className="task-detail-property task-creation-existing-task-owner"><small>{c("owner")}</small><PersonAvatar name={displayedOwner} personId={task.ownerId} profilePreviewFocusable={false} size="xs" /><span>{displayedOwner}</span></div>}
      {task.status && <div className="task-detail-property"><small>{c("status")}</small>{knownStatus ? <TaskStatusBadge size="sm" value={knownStatus} /> : <span>{task.status}</span>}</div>}
      {schedule && <span><CalendarDays aria-hidden="true" />{schedule}</span>}
      {(taskTags.length > 0 || unresolvedLabels.length > 0) && <span aria-label={c("taskTags")} className="task-creation-existing-task-tags">
        {taskTags.map((tag) => <TagBadge key={tag.id} size="xs" tag={tag} />)}
        {unresolvedLabels.map((label) => <span className="task-creation-existing-task-tag" key={label}>{label}</span>)}
      </span>}
    </div>

    {kind === "parent" && childTaskNames.length > 0 && <section aria-label={c("existingSubtasks")} className="task-creation-existing-task-children">
      <strong><GitBranch aria-hidden="true" />{c("existing")}{childTaskNames.length}{c("subtasks")}</strong>
      <ul>{childTaskNames.slice(0, 3).map((name) => <li key={name}>{name}</li>)}</ul>
      {childTaskNames.length > 3 && <small>{c("more")}{childTaskNames.length - 3}{c("tasksLabel")}</small>}
    </section>}

    <div className="task-creation-existing-task-reason"><span>{c("matchDetails")}</span><p>{localize(reason)}</p></div>
  </article>;
}
