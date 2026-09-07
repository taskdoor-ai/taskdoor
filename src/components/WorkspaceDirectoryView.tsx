import { CalendarDays, ChevronLeft, ChevronRight, CornerDownRight, ListTree } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { findTagByName, type TagDefinition } from "../data/tagGroups";
import { type TaskNode } from "../data/workspaceNodes";
import { getTaskTimeRangeLabel } from "../lib/taskTimeRange";
import { PersonAvatar, PersonName } from "./PersonAvatar";
import { TagBadge } from "./TagBadge";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskIcon } from "./TaskIcon";
import { Button } from "./ui/button";

type WorkspaceDirectoryViewProps = {
  allTasks: TaskNode[];
  onTaskSelect: (task: TaskNode) => void;
  resultsHeader?: ReactNode;
  tagDefinitions: TagDefinition[];
  tasks: TaskNode[];
};

const taskPageSize = 10;

function TaskDistributionRow({ allTasks, onSelect, tagDefinitions, task }: { allTasks: TaskNode[]; onSelect: (task: TaskNode) => void; tagDefinitions: TagDefinition[]; task: TaskNode }) {
  const tags = (task.labels ?? []).map((name) => findTagByName(tagDefinitions, name)).filter((tag) => tag !== undefined);
  const timeRange = getTaskTimeRangeLabel(task);
  const childCount = allTasks.filter((candidate) => candidate.parentTaskId === task.id).length;
  const parentTask = task.parentTaskId ? allTasks.find((candidate) => candidate.id === task.parentTaskId) : undefined;
  return <article className="workspace-directory-task" data-tone={task.iconTone ?? "neutral"}>
    <button aria-label={`打开任务：${task.name}`} className="workspace-directory-task-open-area" onClick={() => onSelect(task)} type="button" />
    <span className="workspace-directory-task-title">
      <TaskIcon iconName={task.iconName} size="lg" tone={task.iconTone} />
      <span className="workspace-directory-task-copy">
        <span className="workspace-directory-task-heading"><strong>{task.name}</strong></span>
        <small>{task.goal?.trim() || "暂无任务说明"}</small>
        <span className="workspace-directory-task-meta">
          <span aria-label={`状态：${task.status}`} className="workspace-directory-task-status"><TaskStatusBadge size="sm" value={task.status} /></span>
          <span aria-label={`负责人：${task.ownerId}`} className="workspace-owner"><PersonAvatar name={task.ownerId} personId={task.ownerId} profilePreviewFocusable={false} size="xs" /><strong><PersonName name={task.ownerId} personId={task.ownerId} /></strong></span>
          <span aria-label={`标签：${tags.map((tag) => tag.name).join("、") || "暂无"}`} className="workspace-directory-task-tags">{tags.slice(0, 2).map((tag) => <TagBadge key={tag.id} size="xs" tag={tag} />)}{tags.length > 2 && <em>+{tags.length - 2}</em>}{tags.length === 0 && <em>暂无</em>}</span>
          {timeRange && <span className="workspace-directory-task-time"><CalendarDays aria-hidden="true" size={14} /><span>{timeRange}</span></span>}
          {parentTask ? <span className="workspace-directory-task-hierarchy"><CornerDownRight aria-hidden="true" size={14} /><small>主任务</small><strong>{parentTask.name}</strong></span> : childCount > 0 ? <span className="workspace-directory-task-hierarchy"><ListTree aria-hidden="true" size={14} /><small>子任务</small><strong>{childCount}</strong></span> : null}
        </span>
      </span>
    </span>
    <ChevronRight aria-hidden="true" className="workspace-directory-task-open" />
  </article>;
}

export function WorkspaceDirectoryView({ allTasks, onTaskSelect, resultsHeader, tagDefinitions, tasks }: WorkspaceDirectoryViewProps) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(tasks.length / taskPageSize));
  const currentPage = Math.min(page, pageCount);
  const visiblePages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => {
    const start = Math.min(Math.max(currentPage - 2, 1), Math.max(pageCount - 4, 1));
    return start + index;
  });
  const pagedTasks = tasks.slice((currentPage - 1) * taskPageSize, currentPage * taskPageSize);

  useEffect(() => setPage(1), [tasks]);

  return <section aria-label="任务列表" className="workspace-directory-shell">
    <div className="workspace-directory-results">
      {resultsHeader}
      <div className="workspace-directory-task-list">{pagedTasks.length ? pagedTasks.map((task) => <TaskDistributionRow allTasks={allTasks} key={task.id} onSelect={onTaskSelect} tagDefinitions={tagDefinitions} task={task} />) : <div className="workspace-list-empty"><strong>没有匹配的任务</strong><span>调整搜索词或筛选条件后再试。</span></div>}</div>
      {tasks.length > 0 && <nav aria-label="任务列表分页" className="workspace-directory-pagination"><span>共 {tasks.length} 项</span><div><Button aria-label="上一页" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} size="icon-sm" type="button" variant="outline"><ChevronLeft /></Button>{visiblePages.map((pageNumber) => <Button aria-current={pageNumber === currentPage ? "page" : undefined} key={pageNumber} onClick={() => setPage(pageNumber)} size="sm" type="button" variant="ghost">{pageNumber}</Button>)}<Button aria-label="下一页" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} size="icon-sm" type="button" variant="outline"><ChevronRight /></Button></div></nav>}
    </div>
  </section>;
}
