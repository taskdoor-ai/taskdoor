import { TaskSubtaskCompletionBadge } from "@/features/tasks/components/TaskSubtaskCompletionBadge";
import { TaskQuickCreateRow } from "@/features/tasks/components/TaskQuickCreateRow";
import { TaskListTools } from "@/features/tasks/components/TaskListTools";
import { getDirectChildTaskCompletion } from "@/features/tasks/lib/task-relation-projection";
import { mockPersonName } from '@/ai/mock/i18n/mockContent';
import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatTaskCount } from "@/shared/i18n/core";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { statusMessageKey } from "@/shared/i18n/task-status";
import { CalendarDays, Check, ArrowDownUp, ChevronDown, ChevronRight, List, ListTree, MoreHorizontal, Plus, Search, SlidersHorizontal, Trash2, UserRound, X } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import type { CSSProperties } from "react";
import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PersonOption, TagDefinition, TaskNode } from "@/shared/model/task-model";

import type { TaskListProjection } from "@/features/tasks/lib/task-list-projection";
import { taskDeadlineDisplay, taskDueLabel, taskUpdatedLabel } from "@/features/tasks/lib/task-list-presentation";
import { buildTaskListHierarchy } from "@/features/tasks/lib/task-list-hierarchy";
import { TaskHierarchyList, type TaskHierarchyExpansion, type TaskHierarchyRowState } from "@/features/tasks/components/TaskHierarchyList";
import { useResponsiveControlSize } from "@/shared/lib/useResponsiveControlSize";
import { clearedTaskListConditions, getTaskStatusFilters, getTaskTagFilters, normalizeTaskWorkspaceFilters,  type TaskListFilters } from "@/features/tasks/components/task-list-filters";
import { taskFilterSummaries } from "@/features/tasks/components/TaskListFilterPanel";
import { TaskStatusIcon, taskStatusDefinition, taskStatusOptions, type TaskStatus } from "@/shared/ui/TaskStatusBadge";
import { getTaskProgressDisplay } from "@/features/tasks/lib/task-progress-display";
import { useTeamTimeZone } from "@/shared/lib/useTeamTimeZone";
import type { TaskProgressComparisonSeries } from "@/features/tasks/lib/task-progress-comparison";
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import { FixedScrollThumb } from "@/shared/ui/FixedScrollThumb";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

export type TaskWorkspaceListProps = {
  progressComparisonsByTaskId?: Readonly<Record<string, TaskProgressComparisonSeries | undefined>>;
  projection: TaskListProjection;
  currentUserId: string;
  filters: TaskListFilters;
  members: PersonOption[];
  onFiltersChange: (filters: TaskListFilters) => void;
  onManageTags: (returnFocus?: HTMLElement | null) => void;
  onDeleteTask: (task: TaskNode) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskSelect: (task: TaskNode) => void;
  onQueryChange: (query: string) => void;
  onQuickCreateTask?: (prompt: string) => Promise<void>;
  quickCreateRequest?: number;
  query: string;
  selectedTaskId: string | null;
  scopeCounts: { all: number; owned: number; participating: number };
  teamId?: string;
  onShowWorkbench: () => void;
  showingWorkbench: boolean;
  listVisible?: boolean;
};

function TaskRowTitle({ title }: { title: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const measure = () => {
      const distance = Math.ceil(text.scrollWidth - container.clientWidth);
      setScrollDistance(distance > 1 ? distance : 0);
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(text);
    return () => observer.disconnect();
  }, [title]);

  const overflowing = scrollDistance > 0;
  const style = overflowing ? ({ "--task-row-title-scroll": `${scrollDistance}px` } as CSSProperties) : undefined;

  return <span className="task-workspace-row-title" data-overflow={overflowing || undefined} ref={containerRef} style={style} title={title}>
    <span className="task-workspace-row-title-text" ref={textRef}>{title}</span>
  </span>;
}

type TaskRowActions = Pick<TaskWorkspaceListProps, "onTaskSelect" | "onTaskStatusChange" | "onDeleteTask">;
type TaskWorkspaceRowProps = {
  task: TaskNode;
  owner?: PersonOption;
  series?: TaskProgressComparisonSeries;
  currentUserId: string;
  showOwner: boolean;
  selected: boolean;
  sort: TaskListFilters["sort"];
  now: Date;
  actions: TaskRowActions;
  tree?: TaskHierarchyRowState;
  subtaskCompletion?: { total: number; completed: number };
};

const MemoTaskWorkspaceRow = memo(function TaskWorkspaceRow({ task, owner, series, currentUserId, showOwner, selected, sort, now, actions, tree, subtaskCompletion }: TaskWorkspaceRowProps) {
  const { t, locale } = useI18n();
  const detailCopy = useDetailCopy();
  const timeZone = useTeamTimeZone();
  const [deadlineTipOpen, setDeadlineTipOpen] = useState(false);
  const deadlineTriggerId = useId();
  const statusText = (status: string) => status in statusMessageKey ? t(statusMessageKey[status as keyof typeof statusMessageKey]) : status;
  const ownerName = task.ownerId ? mockPersonName(locale, task.ownerId, owner?.name ?? task.ownerId) : t('list.unassigned');
  const statusDefinition = taskStatusDefinition[task.status];
  const progress = getTaskProgressDisplay({ timeZone, series, task: { ...task, status: undefined, completedAt: undefined } });
  const progressRatio = progress.aiAssessment?.ratio ?? progress.ratio;
  const timeField = sort === "created" ? t('list.createdAt') : t('list.updatedAt');
  const timestampValue = sort === "created" ? task.createdAt ?? "" : task.updatedAt;
  const timeLabel = taskUpdatedLabel(timestampValue, now, now, locale).label;
  const deadline = taskDeadlineDisplay(task, now, locale);
  const dueState = taskDueLabel(task, now, timeZone, locale);
  const overdue = dueState?.overdue ?? false;
  const DeadlineElement = deadline?.dateTime ? "time" : "span";
  const deadlineLabel = deadline ? `${locale === "en" ? "Due " : ""}${deadline.label}` : detailCopy("noDueDate");
  const deadlineDescription = deadline ? `${overdue ? `${locale === "en" ? dueState?.label : `已${dueState?.label}`} · ` : ""}${locale === "en" ? `Due date: ${deadline.full}` : `截止时间：${deadline.full}`}` : deadlineLabel;
  const deadlineIcon = deadline && <Tooltip.Trigger aria-hidden="true" className="task-list-row-deadline-icon" data-overdue={overdue || undefined} delay={180} id={deadlineTriggerId} render={<span />} tabIndex={-1}><CalendarDays aria-hidden="true" size={14} /></Tooltip.Trigger>;
  const RowContainer = tree ? "div" : "li";
  const contextLabel = locale === "en" ? "Hierarchy context; does not match filters" : "仅作层级定位，未匹配筛选";
  return <RowContainer className={`task-workspace-row-entry${tree ? " task-hierarchy-row" : ""}`} data-context={tree?.context || undefined} data-tree-row={tree ? task.id : undefined} data-has-owner={showOwner && !tree?.context || undefined} data-selected={selected || undefined} style={tree ? { "--task-tree-indent": `${Math.min(tree.level, 5) * 12}px` } as CSSProperties : undefined}>
    {tree && (tree.onToggle || tree.directChildCount > 0 ? <button aria-label={!tree.onToggle ? (locale === "en" ? `${task.name}: no matching subtasks` : `${task.name}：没有匹配的子任务`) : `${tree.expanded ? (locale === "en" ? "Collapse" : "收起") : (locale === "en" ? "Expand" : "展开")} ${task.name}`} aria-expanded={tree.expanded ?? false} className="task-tree-toggle" data-tree-toggle disabled={!tree.onToggle} onClick={tree.onToggle} type="button"><ChevronRight aria-hidden="true" size={13} /></button> : <span aria-hidden="true" className="task-tree-toggle-space" />)}
    <div className="task-workspace-row" aria-current={selected ? "page" : undefined}>
      <span aria-label={t('list.statusLabel', { status: statusText(task.status) })} className="task-list-row-status" data-tone={statusDefinition.tone} role="img" title={statusText(task.status)}><TaskStatusIcon status={task.status} progressRatio={progressRatio} size={16} /></span>
      <Tooltip.Root disabled={!deadline || Boolean(tree?.context)} onOpenChange={setDeadlineTipOpen} open={Boolean(deadline) && deadlineTipOpen} triggerId={deadlineTriggerId}>
      <button aria-label={tree?.context ? `${task.name} · ${contextLabel}` : t('list.open', { name: task.name })} aria-describedby={`task-row-description-${task.id}`} className="task-list-row-open" data-task-id={task.id} disabled={tree?.context} onBlur={() => setDeadlineTipOpen(false)} onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setDeadlineTipOpen(true); }} onClick={() => { setDeadlineTipOpen(false); actions.onTaskSelect(task); }} type="button">
        <span className="task-list-row-name-with-subtasks"><TaskRowTitle title={task.name} />{tree && subtaskCompletion && <TaskSubtaskCompletionBadge total={subtaskCompletion.total} completed={subtaskCompletion.completed} />}</span>
        <span className="task-list-row-deadline-slot" data-unscheduled={!deadline || undefined}>{deadlineIcon}<DeadlineElement aria-hidden="true" className="task-list-row-deadline" dateTime={deadline?.dateTime} title={deadlineDescription}>
          {deadlineLabel}
        </DeadlineElement></span>
        <span className="sr-only" id={`task-row-description-${task.id}`}>{t('list.statusLabel', { status: statusText(task.status) })}{showOwner ? ` · ${t('list.ownerLabel', { name: ownerName })}` : ""}{` · ${deadlineDescription}`}{` · ${timeField}: ${timeLabel}`}</span>
      </button>
      <Tooltip.Portal><Tooltip.Positioner align="end" className="task-list-deadline-tip-positioner" collisionPadding={12} side="top" sideOffset={6}><Tooltip.Popup className="task-list-deadline-tip" role="tooltip">{deadlineDescription}</Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal>
      </Tooltip.Root>
    </div>
    {showOwner && !tree?.context && <div className="task-list-row-meta">
      <span aria-label={t('list.ownerLabel', { name: ownerName })} className="task-list-row-owner" data-unassigned={!task.ownerId || undefined} role={task.ownerId ? "group" : "img"} title={task.ownerId ? undefined : t('list.ownerLabel', { name: t('list.unassigned') })}>{task.ownerId ? <PersonAvatar name={ownerName} personId={task.ownerId} profile={owner} size="xs" /> : <UserRound aria-hidden="true" size={16} />}</span>
      <span aria-hidden="true" className="task-list-row-owner-name" title={ownerName}>{ownerName}</span>
    </div>}
    {!tree?.context && <DropdownMenu>
      <DropdownMenuTrigger aria-label={t('list.moreLabel', { name: task.name })} className="task-workspace-row-menu-trigger" title={t('list.more')} type="button"><MoreHorizontal aria-hidden="true" size={16} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="task-workspace-row-menu" sideOffset={4}>
        <DropdownMenuItem disabled={task.status === "已完成" || (task.ownerId !== currentUserId && !task.participantIds?.includes(currentUserId))} onClick={() => actions.onTaskStatusChange(task.id, "已完成")}><Check aria-hidden="true" size={15} />{locale === "en" ? "Mark complete" : "标记完成"}</DropdownMenuItem>
        <DropdownMenuItem disabled={task.ownerId !== currentUserId} variant="destructive" onClick={() => actions.onDeleteTask(task)}><Trash2 aria-hidden="true" size={15} />{t('list.delete')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>}
  </RowContainer>;
}, (before, after) => before.currentUserId === after.currentUserId && before.showOwner === after.showOwner
  && before.tree === after.tree
  && before.selected === after.selected && before.sort === after.sort
  && before.now === after.now && before.actions === after.actions
  && JSON.stringify(before.task) === JSON.stringify(after.task)
  && JSON.stringify(before.series) === JSON.stringify(after.series)
  && JSON.stringify(before.owner) === JSON.stringify(after.owner));

export function TaskWorkspaceList({ projection, currentUserId, filters: sourceFilters, members, onDeleteTask, onTaskStatusChange, onFiltersChange, onManageTags, onTaskSelect, onQueryChange, onQuickCreateTask, quickCreateRequest = 0, query, selectedTaskId, showingWorkbench, teamId, progressComparisonsByTaskId, listVisible = true }: TaskWorkspaceListProps) {
  const { t, locale } = useI18n();
  const rowsRef = useRef<HTMLDivElement>(null);
  const quickCreateId = useId();
  const quickCreateTrigger = useRef<HTMLButtonElement>(null);
  const quickCreateInput = useRef<HTMLInputElement>(null);
  const quickCreateFocusFrame = useRef<number | null>(null);
  const previousQuickCreateRequest = useRef(quickCreateRequest);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const canQuickCreate = Boolean(onQuickCreateTask);
  useLayoutEffect(() => setQuickCreateOpen(false), [currentUserId, teamId, listVisible, canQuickCreate]);

  const closeQuickCreate = () => {
    setQuickCreateOpen(false);
    quickCreateTrigger.current?.focus({ preventScroll: true });
  };
  const openQuickCreate = () => {
    if (rowsRef.current) rowsRef.current.scrollTop = 0;
    setQuickCreateOpen(true);
    if (quickCreateFocusFrame.current !== null) window.cancelAnimationFrame(quickCreateFocusFrame.current);
    quickCreateFocusFrame.current = window.requestAnimationFrame(() => {
      quickCreateFocusFrame.current = null;
      const input = quickCreateInput.current;
      if (input?.isConnected && !input.closest("[hidden], [inert]")) input.focus({ preventScroll: true });
    });
  };
  useEffect(() => {
    const changed = previousQuickCreateRequest.current !== quickCreateRequest;
    previousQuickCreateRequest.current = quickCreateRequest;
    if (changed && listVisible && canQuickCreate) openQuickCreate();
  }, [quickCreateRequest, listVisible, canQuickCreate]);
  useEffect(() => () => {
    if (quickCreateFocusFrame.current !== null) window.cancelAnimationFrame(quickCreateFocusFrame.current);
  }, [currentUserId, teamId, listVisible]);

  useEffect(() => {
    const element = rowsRef.current;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      element.dataset.scrolling = "true";
      clearTimeout(timer);
      timer = setTimeout(() => { delete element.dataset.scrolling; }, 700);
    };
    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
      delete element.dataset.scrolling;
    };
  }, []);

  const controlSize = useResponsiveControlSize("(max-width: 900px)");
  const filters = useMemo(() => normalizeTaskWorkspaceFilters(sourceFilters), [sourceFilters]);
  const selectedStatuses = getTaskStatusFilters(filters);
  const selectedTags = getTaskTagFilters(filters);
  const includeUntagged = Boolean(filters.includeUntagged);
  const scope = filters.scope ?? "all";
  const hierarchyMode = filters.listView === "hierarchy";
  const showOwner = filters.scope !== "owned";
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const normalizedFilters = { ...filters, statuses: selectedStatuses, tags: selectedTags };
  const summaries = taskFilterSummaries(normalizedFilters);
  const hasFilters = Object.values(summaries).some(Boolean);
  const filterKey = JSON.stringify([filters, currentUserId]);
  useEffect(() => { if (rowsRef.current) rowsRef.current.scrollTop = 0; }, [query, filterKey]);
  const hierarchyScope = teamId ?? projection.allTasks[0]?.teamId ?? "default";
  const [hierarchyExpansion, setHierarchyExpansion] = useState<TaskHierarchyExpansion>({});
  const hierarchy = useMemo(() => buildTaskListHierarchy(projection.allTasks, projection.visibleTasks, { sort: filters.sort }), [projection.allTasks, projection.visibleTasks, filters.sort]);
  const hierarchyQueryKey = JSON.stringify(["collapsed-default", hierarchyScope, currentUserId, query, Object.fromEntries(Object.entries(filters).filter(([key]) => key !== "sort" && key !== "listView"))]);
  const visibleOrder = (hierarchyMode ? hierarchy.matchingTaskIds : projection.visibleTasks.map(task => task.id)).join("\n");
  useEffect(() => {
    const container = rowsRef.current;
    if (!container || !selectedTaskId || showingWorkbench) return;
    const row = Array.from(container.querySelectorAll<HTMLElement>("[data-task-id]"))
      .find(element => element.dataset.taskId === selectedTaskId)?.closest(".task-workspace-row-entry");
    if (!row || container.clientHeight === 0) return;
    const viewport = container.getBoundingClientRect();
    const bounds = row.getBoundingClientRect();
    // Scroll only the list, leaving detail focus and page position intact.
    if (bounds.top < viewport.top) container.scrollTop += bounds.top - viewport.top;
    else if (bounds.bottom > viewport.bottom) container.scrollTop += bounds.bottom - viewport.bottom;
  }, [selectedTaskId, visibleOrder, showingWorkbench, query, filterKey]);
  const changeFilters = (patch: Partial<TaskListFilters>) => onFiltersChange({ ...filters, status: "all", tag: "all", statuses: selectedStatuses, tags: selectedTags, includeUntagged, ...patch });
  const rowActionsRef = useRef<TaskRowActions>({ onTaskSelect, onTaskStatusChange, onDeleteTask });
  useLayoutEffect(() => { rowActionsRef.current = { onTaskSelect, onTaskStatusChange, onDeleteTask }; });
  const rowActions = useMemo<TaskRowActions>(() => ({
    onTaskSelect: task => rowActionsRef.current.onTaskSelect(task),
    onTaskStatusChange: (taskId, status) => rowActionsRef.current.onTaskStatusChange(taskId, status),
    onDeleteTask: task => rowActionsRef.current.onDeleteTask(task),
  }), []);
  const subtaskCompletion = useMemo(() => getDirectChildTaskCompletion(projection.allTasks), [projection.allTasks]);
  const renderTaskRow = (task: TaskNode) => <MemoTaskWorkspaceRow subtaskCompletion={subtaskCompletion.get(task.id)} key={task.id} task={task} owner={members.find(member => member.id === task.ownerId)} series={progressComparisonsByTaskId?.[task.id]} currentUserId={currentUserId} showOwner={showOwner} selected={!showingWorkbench && selectedTaskId === task.id} sort={filters.sort} now={now} actions={rowActions} />;

  return <section aria-label={t('list.nav')} className="task-workspace-list task-list-refresh task-workspace-list-main" data-list-view={hierarchyMode ? "hierarchy" : "flat"}>
    <h1 className="sr-only" id="task-workspace-list-heading" tabIndex={-1}>{t('nav.tasks')}</h1>
    <div className="task-workspace-list-toolbar">
    <div className="task-workspace-list-search">
      <div className="task-search-slot">
        <div className="task-search-field" role="search">
          <Search aria-hidden="true" size={14} />
          <Input aria-label={t('list.search')} className="task-workspace-search" onChange={event => onQueryChange(event.target.value)} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); onQueryChange(""); } }} placeholder={locale === 'en' ? 'Search' : '搜索'} value={query} />
          <div className="task-search-actions">
            {query.length > 0 && <button aria-label={t('list.clearSearch')} className="task-search-clear" onClick={() => onQueryChange("")} title={t('list.clearSearch')} type="button"><X aria-hidden="true" size={14} /></button>}
          </div>
        </div>
      </div>
    </div>
    <div className="task-list-results-toolbar">
      <div className="task-list-display-actions">
        <TaskListTools filters={filters} members={members} onFiltersChange={onFiltersChange} onManageTags={onManageTags} projection={projection} touch={controlSize === "touch"} />
        <div className="task-list-view-switch" role="group" aria-label={locale === "en" ? "View" : "视图"}>
          <button type="button" className="task-list-view-trigger" aria-label={locale === "en" ? "Hierarchy view" : "层级视图"} title={locale === "en" ? "Hierarchy view" : "层级视图"} aria-pressed={hierarchyMode} onClick={() => changeFilters({ listView: "hierarchy" })}><ListTree aria-hidden="true" size={18} /></button>
          <button type="button" className="task-list-view-trigger" aria-label={locale === "en" ? "List view" : "列表视图"} title={locale === "en" ? "List view" : "列表视图"} aria-pressed={!hierarchyMode} onClick={() => changeFilters({ listView: "flat" })}><List aria-hidden="true" size={18} /></button>
        </div>
      </div>
      {listVisible && onQuickCreateTask && <Button aria-controls={quickCreateId} aria-expanded={quickCreateOpen} aria-label={t('list.new')} className="task-workspace-new-task" onClick={openQuickCreate} ref={quickCreateTrigger} size={controlSize} title={t('list.new')} type="button">
        <Plus aria-hidden="true" size={16} /><span>{t('list.new')}</span>
      </Button>}
    </div>
    </div>
    <span className="sr-only" role="status">{formatTaskCount(locale, projection.visibleTasks.length)}</span>
    <div className="task-workspace-list-scroll" id="task-workspace-results" ref={rowsRef}>
      {onQuickCreateTask && <TaskQuickCreateRow key={JSON.stringify([teamId, currentUserId])} id={quickCreateId} inputRef={quickCreateInput} onClose={closeQuickCreate} onCreate={onQuickCreateTask} onDismiss={() => setQuickCreateOpen(false)} open={quickCreateOpen && listVisible} />}
      {projection.visibleTasks.length > 0 ? hierarchyMode ? <TaskHierarchyList savedExpansion={hierarchyExpansion} setSavedExpansion={setHierarchyExpansion} ancestorsByTaskId={hierarchy.ancestorsByTaskId} filtered={Boolean(query.trim() || scope !== "all" || hasFilters)} label={locale === "en" ? "Task hierarchy" : "任务层级"} queryKey={hierarchyQueryKey} roots={hierarchy.roots} selectedTaskId={selectedTaskId} renderRow={(node, tree) => <MemoTaskWorkspaceRow subtaskCompletion={subtaskCompletion.get(node.task.id)} task={node.task} owner={members.find(member => member.id === node.task.ownerId)} series={progressComparisonsByTaskId?.[node.task.id]} currentUserId={currentUserId} showOwner={showOwner} selected={!showingWorkbench && node.matches && selectedTaskId === node.task.id} sort={filters.sort} now={now} actions={rowActions} tree={tree} />} /> : <ul aria-label={t('tasks.list')} className="task-workspace-rows">{projection.visibleTasks.map(renderTaskRow)}</ul> : <div className="task-workspace-list-empty" role="status"><strong>{!projection.allTasks.length ? t('list.empty') : t('list.noMatch')}</strong><p>{projection.allTasks.length ? t('list.searchHint') : t('list.startHint')}</p>{projection.allTasks.length ? <Button onClick={() => { onQueryChange(""); changeFilters(clearedTaskListConditions); }} size="sm" variant="outline">{t('list.viewAll')}</Button> : null}</div>}
    </div>
    <FixedScrollThumb scrollRef={rowsRef} />
  </section>;
}
