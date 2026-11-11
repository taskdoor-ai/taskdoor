import { taskResultSelection } from "@/features/tasks/lib/task-result-selection";
import { getTaskDetailPathItems } from "@/features/tasks/lib/task-detail-path";
import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useTeamTimeZone } from "@/shared/lib/useTeamTimeZone";
import { taskCalendarDate } from "@/features/tasks/lib/task-schedule";
import { ChevronRight, ListTodo } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PersonOption, TagDefinition, TaskNode, WorkspaceNode } from "@/shared/model/task-model";

import { buildTaskListProjection, buildTaskScopeCounts } from "@/features/tasks/lib/task-list-projection";
import { TaskWorkspaceList, type TaskWorkspaceListProps } from "@/features/tasks/components/TaskWorkspaceList";
import { getTaskStatusFilters, normalizeTaskWorkspaceFilters, type TaskListFilters } from "@/features/tasks/components/task-list-filters";
import { statusMessageKey } from "@/shared/i18n/task-status";
import type { TaskProgressComparisonSeries } from "@/features/tasks/lib/task-progress-comparison";

type TaskWorkspaceProps = Pick<TaskWorkspaceListProps, "onQuickCreateTask" | "quickCreateRequest"> & {
  progressComparisonsByTaskId?: Readonly<Record<string, TaskProgressComparisonSeries | undefined>>;
  children?: ReactNode;
  creation?: ReactNode;
  currentUserId: string;
  filters: TaskListFilters;
  hidden: boolean;
  members: PersonOption[];
  nodes: WorkspaceNode[];
  onFiltersChange: (filters: TaskListFilters) => void;
  onManageTags: (returnFocus?: HTMLElement | null) => void;
  onDeleteTask: (task: TaskNode) => void;
  onTaskStatusChange: (taskId: string, status: TaskNode["status"]) => void;
  onQueryChange: (query: string) => void;
  onTaskSelect: (task: TaskNode, focusHeading?: boolean) => void;
  onClearTaskSelection?: () => void;
  onShowWorkbench: () => void;
  query: string;
  selectedTaskId: string | null;
  showingCreation?: boolean;
  loadingTaskDetail?: boolean;
  showingWorkbench: boolean;
  tagDefinitions: TagDefinition[];
  teamId?: string;
  teamName?: string;
  pathItems?: Array<{ id: string; label: string }>;
  onPathSelect?: (taskId: string) => void;
  workbench: ReactNode;
};

export function TaskWorkspace({ children, creation, currentUserId, filters, hidden, members, nodes, onDeleteTask, onQuickCreateTask, quickCreateRequest, onTaskStatusChange, onFiltersChange, onManageTags, onQueryChange, onTaskSelect, onClearTaskSelection, onShowWorkbench, query, selectedTaskId, showingCreation = false, loadingTaskDetail = false, showingWorkbench, tagDefinitions, teamId, teamName, pathItems, onPathSelect, progressComparisonsByTaskId }: TaskWorkspaceProps) {
  const { t, locale } = useI18n();
  const timeZone = useTeamTimeZone();
  const [calendarDay, setCalendarDay] = useState(() => taskCalendarDate(new Date().toISOString(), timeZone));
  useEffect(() => {
    const updateDay = () => setCalendarDay(taskCalendarDate(new Date().toISOString(), timeZone));
    updateDay();
    const timer = window.setInterval(updateDay, 60_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);
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
  const selectedTask = projection.allTasks.find(task => task.id === selectedTaskId);
  const hasDetail = loadingTaskDetail || Boolean(children && selectedTask);
  const resultContextKey = JSON.stringify([teamId, currentUserId, query, projectionFilters]);
  const previousContext = useRef({ selectedTaskId, key: resultContextKey, visibleIds: projection.visibleTasks.map(task => task.id) });
  useLayoutEffect(() => {
    const previous = previousContext.current;
    const visibleIds = projection.visibleTasks.map(task => task.id);
    const selectionChanged = previous.selectedTaskId !== selectedTaskId;
    const conditionsChanged = previous.key !== resultContextKey;
    previousContext.current = { selectedTaskId, key: resultContextKey, visibleIds };
    if (hidden || showingWorkbench || showingCreation) return;
    // Ancestor/related-task links are explicit navigation. Only changing results
    // can return an existing selection to the list; never auto-open another task.
    if (selectedTaskId && (!selectedTask || (!selectionChanged
      && (conditionsChanged || previous.visibleIds.includes(selectedTaskId))
      && !taskResultSelection(visibleIds, selectedTaskId)))) onClearTaskSelection?.();
  }, [projection.visibleTasks, selectedTask, selectedTaskId, resultContextKey, hidden, onClearTaskSelection, showingCreation, showingWorkbench]);

  useEffect(() => {
    // Reset detail reading position; the list independently reveals its selected row.
    if (detailRef.current) detailRef.current.scrollTop = 0;
  }, [selectedTaskId]);

  const scope = projectionFilters.scope ?? "all";
  const scopeLabel = t(`list.${scope}`);
  const statuses = getTaskStatusFilters(projectionFilters);
  const statusLabel = statuses.map(status => status in statusMessageKey ? t(statusMessageKey[status as keyof typeof statusMessageKey]) : status).join(locale === "en" ? ", " : "、");
  const listLabel = statusLabel ? `${scopeLabel} · ${statusLabel}` : scopeLabel;
  const detailPath = selectedTask ? getTaskDetailPathItems(pathItems, selectedTask.id, selectedTask.parentTaskId) : [];
  const ancestors = detailPath.filter(item => item.id !== selectedTaskId);
  const showList = !hasDetail && !showingCreation && !showingWorkbench;
  const keepListDraft = loadingTaskDetail && !selectedTaskId && !showingCreation && !showingWorkbench;

  return <section aria-label={t('tasks.workspace')} className="task-workspace task-workspace-pages" data-creation-open={showingCreation} data-detail-open={hasDetail && !showingCreation && !showingWorkbench} data-list-open={showList} hidden={hidden}>
    {showingWorkbench && !showingCreation && <header className="task-workspace-page-header">
      {(showingWorkbench || hasDetail && ancestors.length > 0) && <nav aria-label={locale === "en" ? "Breadcrumb" : "面包屑"} className="task-workspace-breadcrumb">
        {showingCreation || showingWorkbench ? <>
        <ListTodo aria-hidden="true" size={17} />
        {teamName && <span className="task-workspace-breadcrumb-team"><span className="task-workspace-team-name" title={teamName}>{teamName}</span><ChevronRight aria-hidden="true" size={13} /></span>}
        <button onClick={onShowWorkbench} type="button">{listLabel}</button>
        {showingCreation && <><ChevronRight aria-hidden="true" size={13} /><span aria-current="page">{t('list.new')}</span></>}
        </> : hasDetail && <ol className="task-workspace-breadcrumb-list">
          {ancestors.flatMap(item => [
            <li className="task-workspace-breadcrumb-item" key={item.id}><button onClick={() => onPathSelect?.(item.id)} title={mock.field(item.id, "title", item.label)} type="button">{mock.field(item.id, "title", item.label)}</button></li>,
            <li aria-hidden="true" className="task-workspace-breadcrumb-separator" key={`${item.id}-separator`} role="presentation"><ChevronRight size={12} /></li>,
          ])}
          <li className="task-workspace-breadcrumb-item task-workspace-breadcrumb-current"><span aria-current="page" className="task-workspace-current-task" title={selectedTask?.name}>{selectedTask?.name}</span></li>
        </ol>}
      </nav>}
    </header>}
    <section aria-label={t('tasks.list')} className="task-workspace-list-page" hidden={!showList}>
      <TaskWorkspaceList
        progressComparisonsByTaskId={progressComparisonsByTaskId}
        currentUserId={currentUserId}
        filters={projectionFilters}
        listVisible={!hidden && (showList || keepListDraft)}
        members={members}
        onDeleteTask={onDeleteTask}
        onQuickCreateTask={onQuickCreateTask}
        quickCreateRequest={quickCreateRequest}
        onTaskStatusChange={onTaskStatusChange}
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
    </section>
    <section aria-label={t('tasks.detail')} className="task-workspace-detail" hidden={!hasDetail || showingWorkbench || showingCreation} ref={detailRef} tabIndex={-1}>
      <div className="task-workspace-detail-content">
        {children}
      </div>
    </section>
    <section aria-label={t('tasks.creation')} className="task-workspace-creation" hidden={!showingCreation}>{creation}</section>
  </section>;
}
