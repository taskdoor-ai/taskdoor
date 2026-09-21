import { useMockText } from "../i18n/MockDataProvider";
import { useI18n } from "../i18n/I18nProvider";
import { activityMessage, activityChangeValue } from "../i18n/activityDisplay";
import { useModuleCopy } from "../i18n/moduleMessages";
import { ArrowRight, FileText, History, ListChecks, MessageSquareText } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { TaskActivityMock, TaskActivityType, TaskCommitMock, TaskFileNode } from "../data/taskDetailMocks";
import { getTaskActivityCategory, getTaskActivityItems, type TaskActivityCategory } from "../lib/taskActivity";
import { useResponsiveControlSize } from "../lib/useResponsiveControlSize";
import { PersonName } from "./PersonAvatar";
import { TaskActivityFileLink } from "./TaskActivityFileLink";
import { ListFilterSelect } from "./ui/list-filter-select";
import { SelectItem } from "./ui/select";

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
  "task-definition-change": "任务定义调整",
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
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const controlSize = useResponsiveControlSize();
  const items = getTaskActivityItems(activities, commits);
  const visibleItems = items.filter((item) => filter === "all" || getTaskActivityCategory(item) === filter);

  useEffect(() => { if (focusedTargetId) setFilter("all"); }, [focusedTargetId]);

  const hasTimestamp = (item: typeof items[number]) => Number.isFinite(Date.parse((item.kind === "commit" ? item.commit : item.activity).createdAt ?? ""));
  const renderEvent = (item: typeof items[number]) => {
    const record = item.kind === "commit" ? item.commit : item.activity;
    const recordHasTimestamp = hasTimestamp(item);
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
        <header><p><strong><PersonName name={record.author} personId={record.author} /></strong><span className={`task-change-kind task-change-kind--${category}`}>{m.text(categoryLabel)}</span><span className="task-change-action">{m.text(actionLabel)}</span></p>{recordHasTimestamp && <time dateTime={record.createdAt}>{record.time}</time>}</header>
        {changes?.length ? <ul aria-label={m('beforeAndAfter')} className="task-change-values">{changes.map((change, index) => <li key={`${change.label}:${index}`}>
          <span className="task-change-field">{m.text(change.label)}</span><span className="task-change-before"><span className="sr-only">{m('before')}</span>{activityChangeValue(locale, change.label, change.before) || m('notSet')}</span><ArrowRight aria-hidden="true" size={13} /><span className="task-change-after"><span className="sr-only">{m('after')}</span>{activityChangeValue(locale, change.label, change.after) || m('notSet')}</span>
        </li>)}</ul> : <p className="task-change-description">{item.kind === "activity" && "updatedAt" in record && record.updatedAt ? record.message : activityMessage(locale, item.kind === "activity" ? item.activity.type : "commit", mock.text(record.message))}</p>}
        {category === "discussion" && item.kind === "activity" && <button className="task-change-discussion-link" onClick={() => onOpenDiscussion(item.activity.id)} type="button">{m('viewDiscussion')}</button>}
        {recordFiles.length > 0 && <div className="task-change-files">{recordFiles.map((name) => <TaskActivityFileLink fileId={files.find((file) => file.kind === "file" && !file.archived && file.name === name)?.id} fileName={name} key={name} onOpen={onOpenFile} />)}</div>}
      </div>
    </li>;
  };

  return <div className="task-change-log">
    <header className="task-change-toolbar">
      <div><h2>{m('taskActivity')}</h2><p>{m('whoDidWhatAndWhenWithThe')}</p></div>
      <ListFilterSelect align="end" ariaLabel={m('activityType')} label={filter === "all" ? m('allActivity') : m.text(activityCategories[filter].label)} onChange={(value) => setFilter(value as ActivityFilter)} size={controlSize} value={filter}>
        <SelectItem value="all">{m('allActivity')}</SelectItem>
        <SelectItem value="task">{m('taskInformation')}</SelectItem>
        <SelectItem value="discussion">{m('discussion')}</SelectItem>
        <SelectItem value="file">{m('files')}</SelectItem>
      </ListFilterSelect>
    </header>
    {visibleItems.length === 0 ? <div className="task-record-empty"><History aria-hidden="true" size={22} /><strong>{items.length ? m('noActivityOfThisType') : m('noTaskActivityYet')}</strong><p>{items.length ? m('changeTheFilterToViewOtherActivity') : m('changesToTaskInformationDiscussionsAndFiles')}</p></div>
      : <ol aria-label={m('taskActivityHistory')} className="task-change-timeline">{visibleItems.map(renderEvent)}</ol>}
  </div>;
}
