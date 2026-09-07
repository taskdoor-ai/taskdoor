import { PanelLeft } from "lucide-react";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { PersonOption, TagDefinition } from "../data/sharedTypes";
import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";
import { buildTaskListProjection, isTaskInPersonalIndex } from "../lib/taskListProjection";
import { TaskWorkspaceList } from "./TaskWorkspaceList";
import type { TaskListFilters } from "./taskListFilters";

type TaskWorkspaceProps = {
  children?: ReactNode;
  creation?: ReactNode;
  currentUserId: string;
  filters: TaskListFilters;
  hidden: boolean;
  members: PersonOption[];
  nodes: WorkspaceNode[];
  onCreateTask: () => void;
  onFiltersChange: (filters: TaskListFilters) => void;
  onManageTags: () => void;
  onDeleteTask: (task: TaskNode) => void;
  onQueryChange: (query: string) => void;
  onTaskSelect: (task: TaskNode) => void;
  onShowWorkbench: () => void;
  query: string;
  selectedTaskId: string | null;
  showingCreation?: boolean;
  showingWorkbench: boolean;
  tagDefinitions: TagDefinition[];
  workbench: ReactNode;
};

export function TaskWorkspace({ children, creation, currentUserId, filters, hidden, members, nodes, onCreateTask, onDeleteTask, onFiltersChange, onManageTags, onQueryChange, onTaskSelect, onShowWorkbench, query, selectedTaskId, showingCreation = false, showingWorkbench, tagDefinitions, workbench }: TaskWorkspaceProps) {
  const personalFilters = useMemo(() => ({ ...filters, owner: currentUserId, tag: "all" }), [currentUserId, filters]);
  const projectionFilters = useMemo(() => ({ ...personalFilters, owner: "all" }), [personalFilters]);
  const projection = useMemo(() => buildTaskListProjection(
    nodes.filter((node) => node.kind === "task" && isTaskInPersonalIndex(node, currentUserId)),
    query,
    projectionFilters,
    tagDefinitions,
  ), [nodes, currentUserId, query, projectionFilters, tagDefinitions]);
  const detailRef = useRef<HTMLElement>(null);
  const hasDetail = Boolean(children);
  const outsideFilter = hasDetail && !projection.visibleTasks.some((task) => task.id === selectedTaskId);
  const outsidePersonalList = outsideFilter && !projection.allTasks.some((task) => task.id === selectedTaskId);

  useEffect(() => {
    // Only the detail changes position; the mounted task list keeps its own scroll.
    if (detailRef.current) detailRef.current.scrollTop = 0;
  }, [selectedTaskId]);

  return <section aria-label="任务工作区" className="task-workspace" data-mobile-pane={showingWorkbench || showingCreation || hasDetail ? "detail" : "list"} hidden={hidden}>
    <aside aria-label="任务列表" className="task-workspace-master">
      <TaskWorkspaceList
        currentUserId={currentUserId}
        filters={personalFilters}
        members={members}
        onCreateTask={onCreateTask}
        onDeleteTask={onDeleteTask}
        onFiltersChange={onFiltersChange}
        onManageTags={onManageTags}
        onQueryChange={onQueryChange}
        onShowWorkbench={onShowWorkbench}
        onTaskSelect={onTaskSelect}
        projection={projection}
        query={query}
        selectedTaskId={showingCreation ? null : selectedTaskId}
        showingWorkbench={showingWorkbench}
      />
    </aside>
    <section aria-label="今日建议面板" className="task-workspace-workbench" hidden={!showingWorkbench}>{workbench}</section>
    <section aria-label="任务详情面板" className="task-workspace-detail" hidden={showingWorkbench || showingCreation} ref={detailRef} tabIndex={-1}>
      <div className="task-workspace-detail-content">
        {hasDetail ? <>
          {outsideFilter && <p className="task-workspace-filter-note" role="status">{outsidePersonalList ? "当前任务不在我的任务列表中，可继续查看原详情。" : "当前任务不在搜索或筛选结果中，筛选条件已保留。"}</p>}
          {children}
        </> : <div className="task-workspace-empty">
          <PanelLeft aria-hidden="true" size={28} strokeWidth={1.5} />
          <h2>选择任务，查看详情</h2>
          <p>从左侧列表选择任务，在这里查看目标、讨论和进展。</p>
        </div>}
      </div>
    </section>
    <section aria-label="新建任务面板" className="task-workspace-creation" hidden={!showingCreation}>{creation}</section>
  </section>;
}
