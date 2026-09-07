import { CalendarDays, Clock3, GripVertical, MoreHorizontal, UsersRound } from "lucide-react";
import { useState, type DragEvent } from "react";
import type { TagDefinition } from "../data/tagGroups";
import type { TaskNode } from "../data/workspaceNodes";
import { taskBoardStatusOrder, taskBoardStatusTone, type TaskBoardStatus } from "../lib/taskBoard";
import { getTaskTimeRangeLabel } from "../lib/taskTimeRange";
import { PersonAvatar } from "./PersonAvatar";
import { TagBadge } from "./TagBadge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";

type WorkspaceTaskBoardProps = {
  onTaskSelect: (task: TaskNode) => void;
  onTaskStatusChange: (taskId: string, status: TaskNode["status"]) => void;
  tagDefinitions: TagDefinition[];
  tasks: TaskNode[];
};

export function WorkspaceTaskBoard({ onTaskSelect, onTaskStatusChange, tagDefinitions, tasks }: WorkspaceTaskBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskBoardStatus | null>(null);

  if (!tasks.length) {
    return <div className="workspace-list-empty"><strong>没有匹配的任务</strong><span>调整搜索词或筛选条件后再试。</span></div>;
  }

  const handleDrop = (event: DragEvent<HTMLElement>, status: TaskBoardStatus) => {
    event.preventDefault();
    if (draggedTaskId) onTaskStatusChange(draggedTaskId, status);
    setDraggedTaskId(null);
    setDropTarget(null);
  };

  return <div aria-label="任务看板" className="workspace-task-board">
    {taskBoardStatusOrder.map((status) => {
      const tone = taskBoardStatusTone[status];
      const columnTasks = tasks.filter((task) => task.status === status);
      return <section className={`workspace-task-board-column ${dropTarget === status ? "is-drop-target" : ""}`} data-status={tone} key={status} onDragEnter={() => draggedTaskId && setDropTarget(status)} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, status)}>
        <header><span><i aria-hidden="true" />{status}</span><small>{columnTasks.length}</small></header>
        <div className="workspace-task-board-list">{columnTasks.map((task) => {
          const timeRange = getTaskTimeRangeLabel(task);
          const taskTags = (task.labels ?? []).map((label) => tagDefinitions.find((tag) => tag.name === label)).filter((tag): tag is TagDefinition => Boolean(tag));
          const collaboratorCount = new Set([task.ownerId, ...(task.participantIds ?? [])].filter(Boolean)).size;
          return <article className={`workspace-task-board-card ${draggedTaskId === task.id ? "is-dragging" : ""}`} draggable key={task.id} onDragEnd={() => { setDraggedTaskId(null); setDropTarget(null); }} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggedTaskId(task.id); }}>
            <div className="workspace-task-board-card-topline"><GripVertical aria-hidden="true" className="workspace-task-board-grip" size={15} /><div>{taskTags.slice(0, 2).map((tag) => <TagBadge key={tag.id} size="xs" tag={tag} />)}{taskTags.length > 2 && <small>+{taskTags.length - 2}</small>}</div><DropdownMenu><DropdownMenuTrigger aria-label={`移动任务：${task.name}`} className="workspace-task-board-menu"><MoreHorizontal aria-hidden="true" size={16} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuLabel>移动到</DropdownMenuLabel><DropdownMenuSeparator />{taskBoardStatusOrder.map((nextStatus) => <DropdownMenuItem disabled={nextStatus === task.status} key={nextStatus} onClick={() => onTaskStatusChange(task.id, nextStatus)}><i aria-hidden="true" className={`workspace-task-board-menu-dot tone-${taskBoardStatusTone[nextStatus]}`} />{nextStatus}</DropdownMenuItem>)}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu></div>
            <button className="workspace-task-board-card-open" onClick={() => onTaskSelect(task)} type="button"><strong>{task.name}</strong><span>{task.goal?.trim() || "暂无任务说明"}</span></button>
            <footer><div className="workspace-task-board-owner"><PersonAvatar name={task.ownerId} personId={task.ownerId} profilePreviewFocusable={false} size="xs" /><span>{task.ownerId}</span>{collaboratorCount > 1 && <small title={`共 ${collaboratorCount} 位协作者`}><UsersRound aria-hidden="true" size={12} />{collaboratorCount}</small>}</div><div className="workspace-task-board-dates">{timeRange && <small><CalendarDays aria-hidden="true" size={12} />{timeRange}</small>}<small><Clock3 aria-hidden="true" size={12} />{task.updatedAt}</small></div></footer>
          </article>;
        })}{!columnTasks.length && <div className="workspace-task-board-empty">拖动任务到这里</div>}</div>
      </section>;
    })}
  </div>;
}
