import { SidebarResizeHandle } from "@/features/tasks/components/SidebarResizeHandle";
import { TaskSidebarToggle } from "@/features/tasks/components/TaskSidebarToggle";
import { TaskSidebarContext } from "@/features/tasks/lib/task-sidebar-context";
import { taskResultSelection } from "@/features/tasks/lib/task-result-selection";
import { partitionPinnedTasks, pinnedTaskStorageKey, readPinnedTaskIds } from "@/features/tasks/lib/task-pins";
import { useTaskSidebar } from "@/features/tasks/lib/useTaskSidebar";
import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useTeamTimeZone } from "@/shared/lib/useTeamTimeZone";
import { taskCalendarDate } from "@/features/tasks/lib/task-schedule";
import { PanelLeft } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  onTaskSelect: (task: TaskNode, focusHeading?: boolean) => void;
  onClearTaskSelection?: () => void;
  onShowWorkbench: () => void;
  query: string;
  selectedTaskId: string | null;
  showingCreation?: boolean;
  showingWorkbench: boolean;
  tagDefinitions: TagDefinition[];
  teamId?: string;
  workbench: ReactNode;
};

export function TaskWorkspace({ children, creation, currentUserId, filters, hidden, members, nodes, onCreateTask, onDeleteTask, onTaskStatusChange, onOpenRecycleBin, onFiltersChange, onManageTags, onQueryChange, onTaskSelect, onClearTaskSelection, onShowWorkbench, query, selectedTaskId, showingCreation = false, showingWorkbench, tagDefinitions, teamId, progressComparisonsByTaskId }: TaskWorkspaceProps) {
  const { t } = useI18n();
  const timeZone = useTeamTimeZone();
  const [calendarDay, setCalendarDay] = useState(() => taskCalendarDate(new Date().toISOString(), timeZone));
  useEffect(() => {
    const updateDay = () => setCalendarDay(taskCalendarDate(new Date().toISOString(), timeZone));
    updateDay();
    const timer = window.setInterval(updateDay, 60_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);
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
    timeZone,
  ), [nodes, currentUserId, query, projectionFilters, tagDefinitions, mock, timeZone, calendarDay]);
  const scopeCounts = useMemo(() => buildTaskScopeCounts(
    nodes,
    query,
    projectionFilters,
    tagDefinitions,
    currentUserId,
    task => mock.field(task.id, "title", task.name),
    timeZone,
  ), [nodes, currentUserId, query, projectionFilters, tagDefinitions, mock, timeZone, calendarDay]);
  const detailRef = useRef<HTMLElement>(null);
  const hasDetail = Boolean(children);
  const selectedTaskIsVisible = projection.visibleTasks.some((task) => task.id === selectedTaskId);
  useLayoutEffect(() => {
    if (hidden || showingWorkbench || showingCreation) return;
    // Keep the existing mobile list pane until the user opens a task.
    if (!hasDetail && !window.matchMedia("(min-width: 901px)").matches) return;
    // The first result follows the displayed order, including the pinned section.
    const pinScope = teamId ?? projection.allTasks[0]?.teamId ?? "default";
    let pinnedTaskIds: string[] = [];
    try { pinnedTaskIds = readPinnedTaskIds(window.localStorage, pinnedTaskStorageKey(currentUserId, pinScope)); }
    catch { /* Match the list's fallback when device preferences are unavailable. */ }
    const { pinned, unpinned } = partitionPinnedTasks(projection.visibleTasks, pinnedTaskIds);
    const visibleTasks = [...pinned, ...unpinned];
    const id = taskResultSelection(visibleTasks.map(task => task.id), selectedTaskId);
    if (id === selectedTaskId) return;
    if (!id) onClearTaskSelection?.();
    else { const task = projection.visibleTasks.find(task => task.id === id); if (task) onTaskSelect(task, false); }
  }, [projection.visibleTasks, projection.allTasks, currentUserId, hasDetail, hidden, onTaskSelect, onClearTaskSelection, showingCreation, showingWorkbench, selectedTaskId, teamId]);

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
        {hasDetail && selectedTaskIsVisible ? <>
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
