import { CalendarClock, ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { PersonOption } from "../data/sharedTypes";
import { describeTaskCollaborationSchedule, type CollaborationScheduleCandidate, type CollaborationSchedulePerson, type CollaborationScheduleTask } from "../lib/taskCollaborationSchedule";
import { PersonAvatar } from "./PersonAvatar";
import { Button } from "./ui/button";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "./ui/popover";

type Props = {
  task: CollaborationScheduleTask;
  members: PersonOption[];
  /** Same-plan candidates only; these are not accepted tasks or calendar commitments. */
  tasks?: CollaborationScheduleCandidate[];
  disabled?: boolean;
};

function PersonEvidence({ person, members }: { person: CollaborationSchedulePerson; members: PersonOption[] }) {
  return <article className="task-schedule-person">
    <header className="task-schedule-person-heading">
      <PersonAvatar name={person.name} profile={members.find(member => member.id === person.id)} profilePreviewFocusable={false} showProfilePreview={false} size="sm" />
      <div><strong>{person.name}</strong><span>{person.role ?? "角色未知"}</span></div>
    </header>
    <dl className="task-schedule-evidence">
      <div><dt>职责</dt><dd>{person.responsibility ?? "未知，未提供职责说明"}</dd></div>
      <div><dt>可投入描述</dt><dd>{person.availability ?? "未知，未提供可投入描述"}</dd></div>
      <div><dt>当前工作</dt><dd>{person.currentWork ? <ul>{person.currentWork.map((work, index) => <li key={index}>{work}</li>)}</ul> : "未知，未提供当前工作资料"}</dd></div>
      {!!person.otherTasks?.length && <div><dt>同方案另拟负责</dt><dd><ul>{person.otherTasks.map(other => <li key={other.clientId}>{other.title}</li>)}</ul></dd></div>}
    </dl>
  </article>;
}

export function TaskCollaborationSchedule({ task, members, tasks, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  const report = describeTaskCollaborationSchedule(task, members, tasks);
  const taskTitle = task.title.trim() || "未命名任务";
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  return <Popover modal={false} onOpenChange={value => { if (!disabled) setOpen(value); }} open={open && !disabled}>
    <PopoverTrigger render={<Button aria-label={`查看${taskTitle}的排期依据`} className="task-schedule-trigger" disabled={disabled} size="sm" type="button" variant="ghost" />}>
      <CalendarClock aria-hidden="true" size={15} /><span>排期依据</span><ChevronDown aria-hidden="true" size={12} />
    </PopoverTrigger>
    <PopoverContent align="end" aria-labelledby={titleId} className="task-schedule-popover" collisionPadding={8} initialFocus={closeButton} sideOffset={8}>
      <header className="task-schedule-heading">
        <div><strong id={titleId}>{taskTitle}的排期依据</strong><span>{report.sourceLabel}</span></div>
        <PopoverClose render={<Button aria-label="关闭排期依据" className="task-schedule-close" ref={closeButton} size="icon-sm" type="button" variant="ghost" />}><X aria-hidden="true" size={15} /></PopoverClose>
      </header>
      <div aria-label="排期依据详细信息" className="task-schedule-body" role="region" tabIndex={0}>
        <div className="task-schedule-summary"><strong>{report.statusLabel}</strong><span>{report.dateLabel}</span></div>
        {!!report.dateNotes.length && <ul className="task-schedule-notes">{report.dateNotes.map(note => <li key={note}>{note}</li>)}</ul>}
        <div className="task-schedule-limitations">{report.limitations.map(line => <p key={line}>{line}</p>)}</div>
        <section className="task-schedule-group" aria-label="负责人排期依据"><h3>负责人</h3>{report.owner ? <PersonEvidence members={members} person={report.owner} /> : <p className="task-schedule-unknown">未选择负责人，排期依据未知。</p>}</section>
        <section className="task-schedule-group" aria-label="参与人排期依据"><h3>参与人</h3>{report.participants.length ? report.participants.map(person => <PersonEvidence key={person.id} members={members} person={person} />) : <p className="task-schedule-unknown">未选择参与人。</p>}</section>
        {!!report.dependencies.length && <section className="task-schedule-group" aria-label="前置交付时间"><h3>前置交付</h3><ul className="task-schedule-dependencies">{report.dependencies.map(dependency => <li data-review={dependency.needsReview || undefined} key={dependency.clientId}><p>{dependency.message}</p><span>{dependency.deadlineLabel}</span></li>)}</ul></section>}
        <p className="task-schedule-footnote">资料仅供核对；实际忙闲未知，排期待成员确认；人员和日期请在原控件中调整。</p>
      </div>
    </PopoverContent>
  </Popover>;
}
