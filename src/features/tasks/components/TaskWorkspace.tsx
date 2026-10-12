import { SidebarResizeHandle } from "@/features/tasks/components/SidebarResizeHandle";
import { TaskSidebarToggle } from "@/features/tasks/components/TaskSidebarToggle";
import { TaskSidebarContext } from "@/features/tasks/lib/task-sidebar-context";
import { useTaskSidebar } from "@/features/tasks/lib/useTaskSidebar";
import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { PanelLeft } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import type { PersonOption, TagDefinition, TaskNode, WorkspaceNode } from "@/shared/model/task-model";

import { buildTaskListProjection, buildTaskScopeCounts } from "@/features/tasks/lib/task-list-projection";
import { TaskWorkspaceList } from "@/features/tasks/components/TaskWorkspaceList";
import { normalizeTaskWorkspaceFilters, type TaskListFilters } from "@/features/tasks/components/task-list-filters";
import type { TaskProgressComparisonSeries } from "@/features/tasks/lib/task-progress-comparison";

type TaskWorkspaceProps = {
  progressComparisonsByTaskId?: Readonly<Record<string, TaskProgressComparisonSeries | undefined>>;
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
  onOpenRecycleBin?: () => void;
  onDeleteTask: (task: TaskNode) => void;
  onTaskStatusChange: (taskId: string, status: TaskNode["status"]) => void;
  onQueryChange: (query: string) => void;
  onTaskSelect: (task: TaskNode) => void;
  onShowWorkbench: () => void;
  query: string;
  selectedTaskId: string | null;
  showingCreation?: boolean;
  showingWorkbench: boolean;
  tagDefinitions: TagDefinition[];
  teamId?: string;
  workbench: ReactNode;
};

export function TaskWorkspace({ children, creation, currentUserId, filters, hidden, members, nodes, onCreateTask, onDeleteTask, onTaskStatusChange, onOpenRecycleBin, onFiltersChange, onManageTags, onQueryChange, onTaskSelect, onShowWorkbench, query, selectedTaskId, showingCreation = false, showingWorkbench, tagDefinitions, teamId, progressComparisonsByTaskId }: TaskWorkspaceProps) {
  const { t } = useI18n();
  const sidebar = useTaskSidebar();
  const mock = useMockText();
  const projectionFilters = useMemo(() => normalizeTaskWorkspaceFilters(filters), [filters]);
  const projection = useMemo(() => buildTaskListProjection(
    nodes,
    query,
    projectionFilters,
    tagDefinitions,
    currentUserId,
    task => mock.field(task.id, "title", task.name),
  ), [nodes, currentUserId, query, projectionFilters, tagDefinitions, mock]);
  const scopeCounts = useMemo(() => buildTaskScopeCounts(
    nodes,
    query,
    projectionFilters,
    tagDefinitions,
    currentUserId,
    task => mock.field(task.id, "title", task.name),
  ), [nodes, currentUserId, query, projectionFilters, tagDefinitions, mock]);
  const detailRef = useRef<HTMLElement>(null);
  const hasDetail = Boolean(children);
  const selectedTaskIsVisible = projection.visibleTasks.some((task) => task.id === selectedTaskId);
  const outsideFilter = hasDetail && !selectedTaskIsVisible;
  const outsideAvailableList = outsideFilter && !projection.allTasks.some((task) => task.id === selectedTaskId);
  const firstTask = projection.visibleTasks[0];

  useLayoutEffect(() => {
    if (hidden || showingWorkbench || showingCreation || !firstTask || hasDetail) return;
    // 桌面首次进入且尚无可显示详情时选中首项；筛选外的已打开详情继续保留。
    if (window.matchMedia("(min-width: 901px)").matches) onTaskSelect(firstTask);
  }, [firstTask, hasDetail, hidden, onTaskSelect, showingCreation, showingWorkbench]);

  useEffect(() => {
    // Reset detail reading position; the list independently reveals its selected row.
    if (detailRef.current) detailRef.current.scrollTop = 0;
  }, [selectedTaskId]);

  return <TaskSidebarContext.Provider value={sidebar.controls}><section aria-label={t('tasks.workspace')} className="task-workspace" style={sidebar.style} ref={sidebar.workspaceRef} data-sidebar-collapsed={sidebar.collapsed} data-detail-open={hasDetail && !showingWorkbench && !showingCreation} data-mobile-pane={showingWorkbench || showingCreation || hasDetail ? "detail" : "list"} hidden={hidden}>
    <aside aria-label={t('tasks.list')} aria-hidden={sidebar.desktop && sidebar.collapsed || undefined} inert={sidebar.desktop && sidebar.collapsed} className="task-workspace-master" id={sidebar.sidebarId} ref={sidebar.sidebarRef}>
      <div className="task-workspace-master-content">
      <TaskWorkspaceList
        progressComparisonsByTaskId={progressComparisonsByTaskId}
        currentUserId={currentUserId}
        filters={projectionFilters}
        members={members}
        onCreateTask={onCreateTask}
        onDeleteTask={onDeleteTask}
        onTaskStatusChange={onTaskStatusChange}
        onOpenRecycleBin={onOpenRecycleBin}
        onFiltersChange={onFiltersChange}
        onManageTags={onManageTags}
        onQueryChange={onQueryChange}
        onShowWorkbench={onShowWorkbench}
        onTaskSelect={onTaskSelect}
        projection={projection}
        query={query}
        selectedTaskId={showingCreation ? null : selectedTaskId}
        showingWorkbench={showingWorkbench}
        scopeCounts={scopeCounts}
        teamId={teamId}
      />
      </div>
      <SidebarResizeHandle kind="tasks" width={sidebar.width} onChange={sidebar.changeWidth} onResizePreview={sidebar.previewResize} onResizeCommit={sidebar.commitResize} onResizeCancel={sidebar.cancelResize} onResizingChange={sidebar.setResizing} min={260} max={sidebar.maxWidth} />
    </aside>
    <section aria-label={t('tasks.detail')} className="task-workspace-detail" hidden={showingWorkbench || showingCreation} ref={detailRef} tabIndex={-1}>
      <div className="task-workspace-detail-content">
        {!hasDetail && <div className="task-workspace-empty-toggle"><TaskSidebarToggle /></div>}
        {hasDetail ? <>
          {outsideFilter && !outsideAvailableList && <p className="task-workspace-filter-note" role="status">{t('tasks.outsideFilter')}</p>}
          {children}
        </> : <div className="task-workspace-empty">
          <PanelLeft aria-hidden="true" size={28} strokeWidth={1.5} />
          <h2>{projection.allTasks.length ? t('tasks.select') : t('tasks.start')}</h2>
          <p>{projection.allTasks.length ? t('tasks.selectHint') : t('tasks.startHint')}</p>
        </div>}
      </div>
    </section>
    <section aria-label={t('tasks.creation')} className="task-workspace-creation" hidden={!showingCreation}>{creation}</section>
  </section></TaskSidebarContext.Provider>;
}
