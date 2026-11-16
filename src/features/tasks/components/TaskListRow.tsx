import { Tooltip } from "@base-ui/react/tooltip";
import { CalendarDays, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { taskDeadlineDisplay, taskDueLabel } from "@/features/tasks/lib/task-list-presentation";
import type { TaskProgressComparisonSeries } from "@/features/tasks/lib/task-progress-comparison";
import { getTaskProgressDisplay } from "@/features/tasks/lib/task-progress-display";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { statusMessageKey } from "@/shared/i18n/task-status";
import { useTeamTimeZone } from "@/shared/lib/useTeamTimeZone";
import type { PersonOption, TaskNode } from "@/shared/model/task-model";
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import { TaskStatusIcon, taskStatusDefinition } from "@/shared/ui/TaskStatusBadge";

function TaskRowTitle({ title }: { title: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const measure = () => {
      const distance = Math.ceil(text.scrollWidth - container.clientWidth);
      setScrollDistance(distance > 1 ? distance : 0);
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(text);
    return () => observer.disconnect();
  }, [title]);

  const overflowing = scrollDistance > 0;
  const style = overflowing ? ({ "--task-row-title-scroll": `${scrollDistance}px` } as CSSProperties) : undefined;

  return <span className="task-workspace-row-title" data-overflow={overflowing || undefined} ref={containerRef} style={style} title={title}>
    <span className="task-workspace-row-title-text" ref={textRef}>{title}</span>
  </span>;
}

type TaskListRowProps = {
  as?: "div" | "span";
  task: Pick<TaskNode, "id" | "status" | "dueAt" | "createdAt" | "plannedStartOn" | "plannedEndOn" | "progressReopenedAt">;
  title: string;
  openLabel: string;
  onOpen?: () => void;
  now: Date;
  descriptionId: string;
  owner?: {
    id: string;
    name: string;
    profile?: PersonOption | null;
    nameContent?: ReactNode;
    avatarFocusable?: boolean;
  };
  showOwner?: boolean;
  series?: TaskProgressComparisonSeries;
  selected?: boolean;
  auditTime?: string;
  children?: ReactNode;
};

export function TaskListRow({ as: Container = "div", task, title, openLabel, onOpen, now, descriptionId, owner, showOwner = true, series, selected, auditTime, children }: TaskListRowProps) {
  const { t, locale } = useI18n();
  const detailCopy = useDetailCopy();
  const timeZone = useTeamTimeZone();
  const [deadlineTipOpen, setDeadlineTipOpen] = useState(false);
  const deadlineTriggerId = useId();
  const status = task.status in statusMessageKey ? t(statusMessageKey[task.status]) : task.status;
  const statusLabel = t('list.statusLabel', { status });
  const progress = getTaskProgressDisplay({ timeZone, series, task: { ...task, status: undefined, completedAt: undefined } });
  const progressRatio = progress.aiAssessment?.ratio ?? progress.ratio;
  const deadline = taskDeadlineDisplay(task, now, locale);
  const dueState = taskDueLabel(task, now, timeZone, locale);
  const overdue = dueState?.overdue ?? false;
  const DeadlineElement = deadline?.dateTime ? "time" : "span";
  const deadlineLabel = deadline ? `${locale === "en" ? "Due " : ""}${deadline.label}` : detailCopy("noDueDate");
  const deadlineDescription = deadline ? `${overdue ? `${locale === "en" ? dueState?.label : `已${dueState?.label}`} · ` : ""}${locale === "en" ? `Due date: ${deadline.full}` : `截止时间：${deadline.full}`}` : deadlineLabel;
  const ownerLabel = owner && t('list.ownerLabel', { name: owner.name });

  return <>
    <Container className="task-workspace-row" aria-current={selected ? "page" : undefined}>
      <span aria-label={statusLabel} className="task-list-row-status" data-tone={taskStatusDefinition[task.status].tone} role="img" title={status}>
        <TaskStatusIcon status={task.status} progressRatio={progressRatio} size={16} />
      </span>
      <Tooltip.Root disabled={!deadline || !onOpen} onOpenChange={setDeadlineTipOpen} open={Boolean(deadline) && deadlineTipOpen} triggerId={deadlineTriggerId}>
        <button
          aria-label={openLabel}
          aria-describedby={descriptionId}
          className="task-list-row-open"
          data-task-id={task.id}
          disabled={!onOpen}
          onBlur={() => setDeadlineTipOpen(false)}
          onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setDeadlineTipOpen(true); }}
          onKeyDown={event => { if (event.key === "Escape") setDeadlineTipOpen(false); }}
          onClick={() => { setDeadlineTipOpen(false); onOpen?.(); }}
          type="button"
        >
          <span className="task-list-row-name-with-subtasks"><TaskRowTitle title={title} />{children}</span>
          <span className="task-list-row-deadline-slot" data-unscheduled={!deadline || undefined}>
            {deadline && <Tooltip.Trigger aria-hidden="true" className="task-list-row-deadline-icon" data-overdue={overdue || undefined} delay={180} id={deadlineTriggerId} render={<span />} tabIndex={-1}><CalendarDays aria-hidden="true" size={14} /></Tooltip.Trigger>}
            <DeadlineElement aria-hidden="true" className="task-list-row-deadline" dateTime={deadline?.dateTime} title={deadlineDescription}>{deadlineLabel}</DeadlineElement>
          </span>
          <span className="sr-only" id={descriptionId}>{[statusLabel, ownerLabel, deadlineDescription, auditTime].filter(Boolean).join(" · ")}</span>
        </button>
        <Tooltip.Portal>
          <Tooltip.Positioner align="end" className="task-list-deadline-tip-positioner" collisionPadding={12} side="top" sideOffset={6}>
            <Tooltip.Popup className="task-list-deadline-tip" role="tooltip">{deadlineDescription}</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Container>
    {owner && showOwner && <Container className="task-list-row-meta">
      <span aria-label={ownerLabel} className="task-list-row-owner" data-unassigned={!owner.id || undefined} role={owner.id ? "group" : "img"} title={owner.id ? undefined : ownerLabel}>
        {owner.id ? <PersonAvatar name={owner.name} personId={owner.id} profile={owner.profile} profilePreviewFocusable={owner.avatarFocusable} size="xs" /> : <UserRound aria-hidden="true" size={16} />}
      </span>
      {owner.nameContent !== null && <span aria-hidden="true" className="task-list-row-owner-name" title={owner.name}>{owner.nameContent ?? owner.name}</span>}
    </Container>}
  </>;
}
