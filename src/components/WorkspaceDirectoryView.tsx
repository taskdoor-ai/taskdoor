import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { findTagByName, type TagDefinition } from "../data/tagGroups";
import { type TaskNode } from "../data/workspaceNodes";
import { PersonAvatar } from "./PersonAvatar";
import { TagBadge } from "./TagBadge";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskIcon } from "./TaskIcon";
import { Button } from "./ui/button";

type WorkspaceDirectoryViewProps = {
  onTaskSelect: (task: TaskNode) => void;
  resultsHeader?: ReactNode;
  tagDefinitions: TagDefinition[];
  tasks: TaskNode[];
};

const taskPageSize = 10;

function TaskDistributionRow({ onSelect, tagDefinitions, task }: { onSelect: (task: TaskNode) => void; tagDefinitions: TagDefinition[]; task: TaskNode }) {
  const tags = (task.labels ?? []).map((name) => findTagByName(tagDefinitions, name)).filter((tag) => tag !== undefined);
  return <button className="workspace-directory-task" onClick={() => onSelect(task)} type="button">
    <span className="workspace-directory-task-title"><TaskIcon iconName={task.iconName} tone={task.iconTone} /><span><strong>{task.name}</strong><small>{task.goal?.trim() || "暂无任务说明"}</small></span></span>
    <TaskStatusBadge size="sm" value={task.status} />
    <span className="workspace-directory-task-tags">{tags.slice(0, 2).map((tag) => <TagBadge key={tag.id} size="xs" tag={tag} />)}{tags.length > 2 && <small>+{tags.length - 2}</small>}{tags.length === 0 && <small>—</small>}</span>
    <span className="workspace-owner"><PersonAvatar name={task.ownerId} size="xs" />{task.ownerId}</span>
    <span className="workspace-directory-task-due">{task.dueAt ?? "暂无到期日"}</span>
  </button>;
}

export function WorkspaceDirectoryView({ onTaskSelect, resultsHeader, tagDefinitions, tasks }: WorkspaceDirectoryViewProps) {
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
      <div aria-hidden="true" className="workspace-directory-columns"><span>任务</span><span>状态</span><span>标签</span><span>负责人</span><span>截止时间</span></div>
      <div>{pagedTasks.length ? pagedTasks.map((task) => <TaskDistributionRow key={task.id} onSelect={onTaskSelect} tagDefinitions={tagDefinitions} task={task} />) : <div className="workspace-list-empty">没有匹配的任务</div>}</div>
      {tasks.length > 0 && <nav aria-label="任务列表分页" className="workspace-directory-pagination"><span>共 {tasks.length} 项</span><div><Button aria-label="上一页" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} size="icon-sm" type="button" variant="outline"><ChevronLeft /></Button>{visiblePages.map((pageNumber) => <Button aria-current={pageNumber === currentPage ? "page" : undefined} key={pageNumber} onClick={() => setPage(pageNumber)} size="sm" type="button" variant={pageNumber === currentPage ? "default" : "ghost"}>{pageNumber}</Button>)}<Button aria-label="下一页" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} size="icon-sm" type="button" variant="outline"><ChevronRight /></Button></div></nav>}
    </div>
  </section>;
}
