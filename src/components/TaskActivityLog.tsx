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
      ? "提交了文件"
      : category === "discussion"
        ? item.activity.type === "member-reply" ? "回复了讨论" : "发布了讨论"
        : changes?.length ? item.activity.message : taskActionLabels[item.activity.type as TaskInformationType];
    const recordFiles = item.kind === "commit"
      ? item.commit.files
      : category === "discussion" || !item.activity.file ? [] : [item.activity.file];

    return <li className="task-change-event" id={`task-${item.kind}-${record.id}`} key={item.id} tabIndex={-1}>
      <span aria-hidden="true" className="task-change-marker"><Icon size={15} /></span>
      <div className="task-change-content">
        <header><p><strong><PersonName name={record.author} personId={record.author} /></strong><span className={`task-change-kind task-change-kind--${category}`}>{categoryLabel}</span><span className="task-change-action">{actionLabel}</span></p>{recordHasTimestamp && <time dateTime={record.createdAt}>{record.time}</time>}</header>
        {changes?.length ? <ul aria-label="变更前后" className="task-change-values">{changes.map((change, index) => <li key={`${change.label}:${index}`}>
          <span className="task-change-field">{change.label}</span><span className="task-change-before"><span className="sr-only">变更前：</span>{change.before || "未设置"}</span><ArrowRight aria-hidden="true" size={13} /><span className="task-change-after"><span className="sr-only">变更后：</span>{change.after || "未设置"}</span>
        </li>)}</ul> : <p className="task-change-description">{record.message}</p>}
        {category === "discussion" && item.kind === "activity" && <button className="task-change-discussion-link" onClick={() => onOpenDiscussion(item.activity.id)} type="button">查看讨论</button>}
        {recordFiles.length > 0 && <div className="task-change-files">{recordFiles.map((name) => <TaskActivityFileLink fileId={files.find((file) => file.kind === "file" && !file.archived && file.name === name)?.id} fileName={name} key={name} onOpen={onOpenFile} />)}</div>}
      </div>
    </li>;
  };

  return <div className="task-change-log">
    <header className="task-change-toolbar">
      <div><h2>任务活动</h2><p>谁在何时做了什么，按时间从新到旧记录。</p></div>
      <ListFilterSelect align="end" ariaLabel="活动类型" label={filter === "all" ? "全部活动" : activityCategories[filter].label} onChange={(value) => setFilter(value as ActivityFilter)} size={controlSize} value={filter}>
        <SelectItem value="all">全部活动</SelectItem>
        <SelectItem value="task">任务信息</SelectItem>
        <SelectItem value="discussion">讨论</SelectItem>
        <SelectItem value="file">文件</SelectItem>
      </ListFilterSelect>
    </header>
    {visibleItems.length === 0 ? <div className="task-record-empty"><History aria-hidden="true" size={22} /><strong>{items.length ? "没有这类活动" : "还没有任务活动"}</strong><p>{items.length ? "切换筛选，查看其他活动。" : "修改任务信息、发布讨论或操作文件后，记录会出现在这里。"}</p></div>
      : <ol aria-label="任务活动记录" className="task-change-timeline">{visibleItems.map(renderEvent)}</ol>}
  </div>;
}
