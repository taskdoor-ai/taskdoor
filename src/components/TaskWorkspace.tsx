import { useMockText } from "../i18n/MockDataProvider";
import { useI18n } from "../i18n/I18nProvider";
import { PanelLeft } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import type { PersonOption, TagDefinition } from "../data/sharedTypes";
import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";
import { buildTaskListProjection, buildTaskScopeCounts } from "../lib/taskListProjection";
import { TaskWorkspaceList } from "./TaskWorkspaceList";
import { normalizeTaskWorkspaceFilters, type TaskListFilters } from "./taskListFilters";

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
  teamId?: string;
  workbench: ReactNode;
};

export function TaskWorkspace({ children, creation, currentUserId, filters, hidden, members, nodes, onCreateTask, onDeleteTask, onFiltersChange, onManageTags, onQueryChange, onTaskSelect, onShowWorkbench, query, selectedTaskId, showingCreation = false, showingWorkbench, tagDefinitions, teamId }: TaskWorkspaceProps) {
  const { t } = useI18n();
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
    if (hidden || showingWorkbench || showingCreation || !firstTask) return;
    if (selectedTaskId && selectedTaskIsVisible) return;
    // 桌面进入工作区或切换任务范围后选中首项；窄屏保留列表与详情之间的返回操作。
    if (window.matchMedia("(min-width: 901px)").matches) onTaskSelect(firstTask);
  }, [firstTask, hidden, onTaskSelect, selectedTaskId, selectedTaskIsVisible, showingCreation, showingWorkbench]);

  useEffect(() => {
    // Only the detail changes position; the mounted task list keeps its own scroll.
    if (detailRef.current) detailRef.current.scrollTop = 0;
  }, [selectedTaskId]);

  return <section aria-label={t('tasks.workspace')} className="task-workspace" data-detail-open={hasDetail && !showingWorkbench && !showingCreation} data-mobile-pane={showingWorkbench || showingCreation || hasDetail ? "detail" : "list"} hidden={hidden}>
    <aside aria-label={t('tasks.list')} className="task-workspace-master">
      <TaskWorkspaceList
        currentUserId={currentUserId}
        filters={projectionFilters}
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
        scopeCounts={scopeCounts}
        teamId={teamId}
      />
    </aside>
    <section aria-label={t('tasks.detail')} className="task-workspace-detail" hidden={showingWorkbench || showingCreation} ref={detailRef} tabIndex={-1}>
      <div className="task-workspace-detail-content">
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
  </section>;
}
