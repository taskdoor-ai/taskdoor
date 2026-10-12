import { relativeTaskTime } from "@/features/tasks/lib/relative-time";
import { formatLegacyDateLabel } from "@/shared/lib/date-time";
import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { activityMessage, activityChangeValue } from "@/features/tasks/i18n/activity-display";
import { useModuleCopy } from "@/shared/i18n/module-messages";
import { ArrowRight, FileText, History, ListChecks, MessageSquareText } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { TaskActivityMock, TaskActivityType, TaskCommitMock, TaskFileNode } from "@/shared/model/task-model";
import { getTaskActivityCategory, getTaskActivityItems, type TaskActivityCategory } from "@/features/tasks/lib/task-activity";
import { useResponsiveControlSize } from "@/shared/lib/useResponsiveControlSize";
import { PersonAvatar, PersonName } from "@/shared/ui/PersonAvatar";
import { usePersonOptions } from "@/shared/ui/PersonDirectory";
import { TaskActivityFileLink } from "@/features/tasks/components/TaskActivityFileLink";
import { PersonFilterSelect } from "@/features/members/components/PersonFilterSelect";
import { ListFilterSelect } from "@/shared/ui/list-filter-select";
import { SelectItem } from "@/shared/ui/select";

type TaskInformationType = Exclude<TaskActivityType, "member-post" | "member-reply" | "ai-insight">;
type ActivityFilter = "all" | TaskActivityCategory;

const activityCategories = {
  task: { label: "任务信息", icon: ListChecks },
  discussion: { label: "讨论", icon: MessageSquareText },
  file: { label: "文件", icon: FileText },
} satisfies Record<TaskActivityCategory, { label: string; icon: typeof History }>;

const taskActionLabels = {
  "status-change": "状态变更",
  "schedule-change": "时间变更",
  "title-change": "名称变更",
  "goal-change": "目标变更",
  "owner-change": "负责人变更",
  "owner-proposal": "负责人提议",
  "participant-added": "参与者加入",
  "participants-change": "参与人变更",
  "tags-change": "标签变更",
  "appearance-change": "外观变更",
  "task-definition-change": "更新了任务信息",
} satisfies Record<TaskInformationType, string>;

export function TaskActivityLog({ activities, commits, files, focusedTargetId, onOpenDiscussion, onOpenFile }: {
  activities: TaskActivityMock[];
  commits: TaskCommitMock[];
  files: TaskFileNode[];
  focusedTargetId?: string;
  onOpenDiscussion: (activityId: string) => void;
  onOpenFile: (fileId: string) => void;
}) {
  const m = useModuleCopy();
  const mock = useMockText();
  const { locale } = useI18n();
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [personFilter, setPersonFilter] = useState("all");
  const controlSize = useResponsiveControlSize();
  const items = getTaskActivityItems(activities, commits);
  const authors = [...new Set(items.map(item => (item.kind === "commit" ? item.commit : item.activity).author))];
  const authorProfiles = usePersonOptions(authors);
  const peopleByAuthor = new Map(authors.map((author, index) => [author, authorProfiles[index]]));
  const people = [...new Map(authorProfiles.map(person => [person.id, person])).values()];
  const selectedPerson = people.find(person => `person:${person.id}` === personFilter);
  const visibleItems = items.filter(item => {
    const record = item.kind === "commit" ? item.commit : item.activity;
    return (filter === "all" || getTaskActivityCategory(item) === filter)
      && (!selectedPerson || peopleByAuthor.get(record.author)?.id === selectedPerson.id);
  });

  useEffect(() => { if (focusedTargetId) { setFilter("all"); setPersonFilter("all"); } }, [focusedTargetId]);
  useEffect(() => { if (personFilter !== "all" && !selectedPerson) setPersonFilter("all"); }, [personFilter, selectedPerson]);

  const hasTimestamp = (item: typeof items[number]) => Number.isFinite(Date.parse((item.kind === "commit" ? item.commit : item.activity).createdAt ?? ""));
  const renderEvent = (item: typeof items[number]) => {
    const record = item.kind === "commit" ? item.commit : item.activity;
    const person = peopleByAuthor.get(record.author)!;
    const recordHasTimestamp = hasTimestamp(item);
    const timestamp = relativeTaskTime(record.createdAt ?? "", locale, now);
    const category = getTaskActivityCategory(item);
    const { label: categoryLabel, icon: Icon } = activityCategories[category];
    const changes = item.kind === "activity" ? item.activity.changes : undefined;
    const actionLabel = item.kind === "commit"
      ? m('submittedFiles')
      : category === "discussion"
        ? item.activity.type === "member-reply" ? m('repliedToADiscussion') : m('postedADiscussion')
        : taskActionLabels[item.activity.type as TaskInformationType];
    const recordFiles = item.kind === "commit"
      ? item.commit.files
      : category === "discussion" || !item.activity.file ? [] : [item.activity.file];

    return <li className="task-change-event" id={`task-${item.kind}-${record.id}`} key={item.id} tabIndex={-1}>
      <span aria-hidden="true" className="task-change-marker"><Icon size={15} /></span>
      <div className="task-change-content">
        <header>
          <div className="task-change-summary">
            <span className="task-change-actor">
              <PersonAvatar name={person.name} personId={person.id} profile={person} size="sm" />
              <strong><PersonName name={person.name} personId={person.id} profile={person} /></strong>
            </span>
            {category === "discussion" && item.kind === "activity"
              ? <button aria-label={`${m.text(actionLabel)} · ${m('viewDiscussion')}`} className="task-change-action task-change-discussion-link" onClick={() => onOpenDiscussion(item.activity.id)} title={m('viewDiscussion')} type="button">{m.text(actionLabel)}</button>
              : <span className="task-change-action">{m.text(actionLabel)}</span>}
            <span className={`task-change-kind task-change-kind--${category}`}>{m.text(categoryLabel)}</span>
          </div>
          {recordHasTimestamp && <time tabIndex={0} title={timestamp?.full} aria-label={timestamp?.full} dateTime={record.createdAt}>{timestamp?.label ?? formatLegacyDateLabel(record.createdAt ?? record.time, locale)}</time>}
        </header>
        {item.kind === "activity" && (changes?.length ? <ul aria-label={m('beforeAndAfter')} className="task-change-values">{changes.map((change, index) => <li key={`${change.label}:${index}`}>
          <span className="task-change-field">{m.text(change.label)}</span><span className="task-change-before"><span className="sr-only">{m('before')}</span>{activityChangeValue(locale, change.label, change.before) || m('notSet')}</span><ArrowRight aria-hidden="true" size={13} /><span className="task-change-after"><span className="sr-only">{m('after')}</span>{activityChangeValue(locale, change.label, change.after) || m('notSet')}</span>
        </li>)}</ul> : <p className="task-change-description">{"updatedAt" in record && record.updatedAt ? record.message : activityMessage(locale, item.activity.type, mock.text(record.message))}</p>)}

        {recordFiles.length > 0 && <div className="task-change-files">{recordFiles.map((name, index) => <TaskActivityFileLink fileId={files.find((file) => file.kind === "file" && !file.archived && file.name === name)?.id} fileName={name} key={`${name}:${index}`} onOpen={onOpenFile} />)}</div>}
      </div>
    </li>;
  };

  return <div className="task-change-log">
    <header className="task-change-toolbar">
      <div><h2>{m('taskActivity')}</h2><p>{m('whoDidWhatAndWhenWithThe')}</p></div>
      <div aria-label={m('activityFilters')} className="task-change-filters" role="group">
        <ListFilterSelect align="end" ariaLabel={m('activityType')} label={filter === "all" ? m('allActivity') : m.text(activityCategories[filter].label)} onChange={(value) => setFilter(value as ActivityFilter)} size={controlSize} value={filter}>
        <SelectItem value="all">{m('allActivity')}</SelectItem>
        <SelectItem value="task">{m('taskInformation')}</SelectItem>
        <SelectItem value="discussion">{m('discussion')}</SelectItem>
        <SelectItem value="file">{m('files')}</SelectItem>
        </ListFilterSelect>
        <PersonFilterSelect
          align="end"
          ariaLabel={m('activityPerson')}
          members={people}
          menuLabel={m('activityPerson')}
          onChange={id => setPersonFilter(id === "all" ? "all" : `person:${id}`)}
          scopeOption={{ id: "all", label: m('allPeople') }}
          size={controlSize}
          value={selectedPerson?.id ?? "all"}
        />
      </div>
    </header>
    {visibleItems.length === 0 ? <div className="task-record-empty"><History aria-hidden="true" size={22} /><strong>{items.length ? m('noMatchingActivity') : m('noTaskActivityYet')}</strong><p>{items.length ? m('changeTheFilterToViewOtherActivity') : m('changesToTaskInformationDiscussionsAndFiles')}</p></div>
      : <ol aria-label={m('taskActivityHistory')} className="task-change-timeline">{visibleItems.map(renderEvent)}</ol>}
  </div>;
}
