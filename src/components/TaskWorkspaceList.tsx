import { mockPersonName } from '../i18n/mockContent';
import { useMockText } from "../i18n/MockDataProvider";
import { useI18n } from "../i18n/I18nProvider";
import { formatTaskCount } from "../i18n/core";
import { statusMessageKey } from "../i18n/taskStatus";
import { ArrowDownUp, ChevronDown, CircleDashed, ListFilter, MoreHorizontal, Pin, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PersonOption, TagDefinition } from "../data/sharedTypes";
import type { TaskNode } from "../data/workspaceNodes";
import type { TaskListProjection } from "../lib/taskListProjection";
import { taskUpdatedLabel, taskUpdatedTime } from "../lib/taskListPresentation";
import { partitionPinnedTasks, pinnedTaskStorageKey, readPinnedTaskIds, togglePinnedTaskId, writePinnedTaskIds } from "../lib/taskPins";
import { useResponsiveControlSize } from "../lib/useResponsiveControlSize";
import { clearedTaskListConditions, getTaskStatusFilters, getTaskTagFilters, normalizeTaskWorkspaceFilters,  type TaskListFilters } from "./taskListFilters";
import { taskFilterSummaries, TaskListFilterPanel } from "./TaskListFilterPanel";
import { taskStatusDefinition, taskStatusOptions, type TaskStatus } from "./TaskStatusBadge";
import { PersonAvatar } from "./PersonAvatar";
import { FixedScrollThumb } from "./FixedScrollThumb";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export type TaskWorkspaceListProps = {
  projection: TaskListProjection;
  currentUserId: string;
  filters: TaskListFilters;
  members: PersonOption[];
  onCreateTask: () => void;
  onFiltersChange: (filters: TaskListFilters) => void;
  onManageTags: () => void;
  onDeleteTask: (task: TaskNode) => void;
  onTaskSelect: (task: TaskNode) => void;
  onQueryChange: (query: string) => void;
  query: string;
  selectedTaskId: string | null;
  scopeCounts: { all: number; owned: number; participating: number };
  teamId?: string;
  onShowWorkbench: () => void;
  showingWorkbench: boolean;
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

export function TaskWorkspaceList({ projection, currentUserId, filters: sourceFilters, members, onCreateTask, onDeleteTask, onFiltersChange, onManageTags, onTaskSelect, onQueryChange, query, scopeCounts, selectedTaskId, showingWorkbench, teamId }: TaskWorkspaceListProps) {
  const { t, locale } = useI18n();
  const mock = useMockText();
  const statusText = (status: string) => status in statusMessageKey ? t(statusMessageKey[status as keyof typeof statusMessageKey]) : status;
  const rowsRef = useRef<HTMLDivElement>(null);
  const controlSize = useResponsiveControlSize("(max-width: 900px)");
  const filters = useMemo(() => normalizeTaskWorkspaceFilters(sourceFilters), [sourceFilters]);
  const selectedStatuses = getTaskStatusFilters(filters);
  const selectedTags = getTaskTagFilters(filters);
  const includeUntagged = Boolean(filters.includeUntagged);
  const scope = filters.scope ?? "all";
  const showOwner = filters.scope !== "owned";
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const normalizedFilters = { ...filters, statuses: selectedStatuses, tags: selectedTags };
  const summaries = taskFilterSummaries(normalizedFilters);
  const hasFilters = Object.values(summaries).some(Boolean);
  const allStatuses = selectedStatuses.length === 0;
  const statuses = [...new Set([...taskStatusOptions, ...projection.statuses, ...selectedStatuses])];
  const statusLabel = selectedStatuses.length === 0 ? t('list.allStatuses') : selectedStatuses.length === 1 ? statusText(selectedStatuses[0]) : t('list.statusCount', { count: selectedStatuses.length });
  const statusDescription = selectedStatuses.length > 0 ? selectedStatuses.map(statusText).join(", ") : statusLabel;
  const sortLabel = filters.sort === "created" ? t('list.createdSort') : t('list.updatedSort');
  const filterKey = JSON.stringify([filters, currentUserId]);
  useEffect(() => { if (rowsRef.current) rowsRef.current.scrollTop = 0; }, [query, filterKey]);
  const pinScope = teamId ?? projection.allTasks[0]?.teamId ?? "default";
  const pinStorageKey = useMemo(() => pinnedTaskStorageKey(currentUserId, pinScope), [currentUserId, pinScope]);
  const loadPinnedTaskIds = (key: string) => {
    if (typeof window === "undefined") return [];
    try { return readPinnedTaskIds(window.localStorage, key); }
    catch { return []; }
  };
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>(() => loadPinnedTaskIds(pinStorageKey));
  const pinnedTaskIdsRef = useRef(pinnedTaskIds);
  useEffect(() => {
    const next = loadPinnedTaskIds(pinStorageKey);
    pinnedTaskIdsRef.current = next;
    setPinnedTaskIds(next);
  }, [pinStorageKey]);
  const { pinned: pinnedTasks, unpinned: unpinnedTasks } = useMemo(
    () => partitionPinnedTasks(projection.visibleTasks, pinnedTaskIds),
    [pinnedTaskIds, projection.visibleTasks],
  );
  const tags = useMemo(() => {
    const byName = new Map<string, TagDefinition>();
    for (const { tag } of projection.tagFacets) if (!byName.has(tag.name)) byName.set(tag.name, tag);
    for (const name of [...projection.allTasks.flatMap((task) => task.labels ?? []), ...getTaskTagFilters(filters)]) {
      if (name.trim() && !byName.has(name)) byName.set(name, { id: `unregistered:${name}`, name, icon: "tag", color: "gray" });
    }
    return [...byName.values()];
  }, [projection, filters]);
  const changeFilters = (patch: Partial<TaskListFilters>) => onFiltersChange({ ...filters, status: "all", tag: "all", statuses: selectedStatuses, tags: selectedTags, includeUntagged, ...patch });
  const toggleStatus = (status: string) => {
    const statuses = selectedStatuses.includes(status) ? selectedStatuses.filter(value => value !== status) : [...selectedStatuses, status];
    changeFilters({ statuses, completion: "all" });
  };
  const resetFilters = () => changeFilters(clearedTaskListConditions);
  const toggleTaskPin = (taskId: string) => {
    const next = togglePinnedTaskId(pinnedTaskIdsRef.current, taskId);
    pinnedTaskIdsRef.current = next;
    setPinnedTaskIds(next);
    if (typeof window === "undefined") return;
    try { writePinnedTaskIds(window.localStorage, pinStorageKey, next); }
    catch { /* 浏览器禁用本地存储时，当前会话内仍可正常置顶。 */ }
  };
  const renderTaskRow = (task: TaskNode) => {
    const owner = members.find(member => member.id === task.ownerId);
    const ownerName = task.ownerId ? mockPersonName(locale, task.ownerId, owner?.name ?? task.ownerId) : t('list.unassigned');
    const statusDefinition = taskStatusDefinition[task.status];
    const StatusIcon = statusDefinition.icon;
    const timeField = filters.sort === "created" ? t('list.createdAt') : t('list.updatedAt');
    const timestampValue = filters.sort === "created" ? task.createdAt ?? "" : task.updatedAt;
    const timestamp = taskUpdatedTime(timestampValue);
    const timeLabel = locale === 'zh-CN' ? taskUpdatedLabel(timestampValue, now).label
      : timestamp === null ? t('list.timeUnknown') : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(timestamp);
    const isPinned = pinnedTaskIds.includes(task.id);
    const pinAction = isPinned ? t('list.unpin') : t('list.pin');
    return <li className="task-workspace-row-entry" data-has-owner={showOwner || undefined} data-selected={!showingWorkbench && selectedTaskId === task.id || undefined} key={task.id}>
      <button aria-current={!showingWorkbench && selectedTaskId === task.id ? "page" : undefined} aria-label={t('list.open', { name: mock.field(task.id, "title", task.name) })} aria-describedby={`task-row-description-${task.id}`} className="task-workspace-row" data-task-id={task.id} onClick={() => onTaskSelect(task)} type="button">
        <span aria-label={t('list.statusLabel', { status: statusText(task.status) })} className="task-list-row-status" data-tone={statusDefinition.tone} role="img" title={statusText(task.status)}><StatusIcon aria-hidden="true" size={14} strokeWidth={2.6} /></span>
        <TaskRowTitle title={mock.field(task.id, "title", task.name)} />
        <span className="sr-only" id={`task-row-description-${task.id}`}>{t('list.statusLabel', { status: statusText(task.status) })}{showOwner ? ` · ${t('list.ownerLabel', { name: ownerName })}` : ""}{` · ${timeField}: ${timeLabel}`}</span>
      </button>
      {showOwner && <div className="task-list-row-meta">
        <span aria-label={t('list.ownerLabel', { name: ownerName })} className="task-list-row-owner" data-unassigned={!task.ownerId || undefined} role={task.ownerId ? "group" : "img"} title={task.ownerId ? undefined : t('list.ownerLabel', { name: t('list.unassigned') })}>{task.ownerId ? <PersonAvatar name={ownerName} personId={task.ownerId} profile={owner} size="xs" /> : <UserRound aria-hidden="true" size={16} />}</span>
      </div>}
      <button aria-label={`${pinAction}: ${mock.field(task.id, "title", task.name)}`} aria-pressed={isPinned} className="task-workspace-row-pin" data-pinned={isPinned || undefined} onClick={() => toggleTaskPin(task.id)} tabIndex={-1} title={pinAction} type="button"><Pin aria-hidden="true" fill={isPinned ? "currentColor" : "none"} size={15} /></button>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={t('list.moreLabel', { name: mock.field(task.id, "title", task.name) })} className="task-workspace-row-menu-trigger" title={t('list.more')} type="button"><MoreHorizontal aria-hidden="true" size={16} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="task-workspace-row-menu" sideOffset={4}>
          <DropdownMenuItem variant="destructive" onClick={() => onDeleteTask(task)}><Trash2 aria-hidden="true" size={15} />{t('list.delete')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>;
  };

  return <section aria-label={t('list.nav')} className="task-workspace-list task-list-refresh">
    <header className="task-list-titlebar">
      <div><h1 id="task-workspace-list-heading" tabIndex={-1}>{t('nav.tasks')}</h1></div>
      <div className="task-list-titlebar-actions">
        <Button aria-label={t('list.new')} onClick={onCreateTask} size={controlSize === "touch" ? "icon-touch" : "icon"} title={t('list.new')} variant="outline"><Plus aria-hidden="true" /></Button>
      </div>
    </header>
    <div className="task-workspace-list-search">
      <div className="task-search-slot">
        <div className="task-search-field" role="search">
          <Search aria-hidden="true" size={14} />
          <Input aria-label={t('list.search')} className="task-workspace-search" onChange={event => onQueryChange(event.target.value)} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); onQueryChange(""); } }} placeholder={t('list.input')} value={query} />
          {query.length > 0 && <button aria-label={t('list.clearSearch')} className="task-search-clear" onClick={() => onQueryChange("")} title={t('list.clearSearch')} type="button"><X aria-hidden="true" size={14} /></button>}
        </div>
      </div>
      <TaskListFilterPanel filters={normalizedFilters} onChange={changeFilters} onManageTags={onManageTags} onReset={resetFilters} statuses={statuses} tags={tags} touch={controlSize === "touch"} />
    </div>
    <div className="task-list-results-toolbar">
      <div aria-label={t('list.quickFilters')} className="task-list-quick-filters" role="group">
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t('list.scopeLabel', { scope: t(`list.${scope}`) })} className="task-list-scope-trigger" data-filtered={scope !== "all" || undefined} type="button"><span>{scope === "all" ? t('list.all') : t(`list.${scope}`)}</span><ChevronDown aria-hidden="true" size={12} /></DropdownMenuTrigger>
          <DropdownMenuContent align="start" aria-label={t('list.scopeFilter')} className="task-list-scope-menu">
            <DropdownMenuRadioGroup onValueChange={value => { if (value === "all" || value === "owned" || value === "participating") changeFilters({ scope: value }); }} value={scope}>
              {(["all", "owned", "participating"] as const).map(value => <DropdownMenuRadioItem closeOnClick key={value} value={value}><span>{value === "all" ? t('list.all') : t(`list.${value}`)}</span><span className="task-list-scope-count">{scopeCounts[value]}</span></DropdownMenuRadioItem>)}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t('list.filterLabel', { status: statusDescription })} className="task-list-status-trigger" data-filtered={!allStatuses || undefined} title={t('list.statusLabel', { status: statusDescription })} type="button"><span>{statusLabel}</span><ChevronDown aria-hidden="true" size={12} /></DropdownMenuTrigger>
          <DropdownMenuContent align="start" aria-label={t('list.statusFilter')} aria-description={t('list.statusHint')} className="task-list-status-menu">
            <DropdownMenuCheckboxItem checked={allStatuses} closeOnClick onCheckedChange={() => changeFilters({ completion: "all", statuses: [] })}><span className="task-list-row-status"><ListFilter aria-hidden="true" size={14} /></span>{t('list.allStatuses')}</DropdownMenuCheckboxItem>
            {statuses.map(status => {
              const definition = taskStatusDefinition[status as TaskStatus];
              const StatusIcon = definition?.icon ?? CircleDashed;
              return <DropdownMenuCheckboxItem checked={selectedStatuses.includes(status)} closeOnClick={false} key={status} onCheckedChange={() => toggleStatus(status)}><span className="task-list-row-status" data-tone={definition?.tone}><StatusIcon aria-hidden="true" size={14} /></span>{statusText(status)}</DropdownMenuCheckboxItem>;
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={t('list.sortLabel', { sort: sortLabel })} className="task-list-sort-trigger" title={t('list.sortLabel', { sort: sortLabel })} type="button"><ArrowDownUp aria-hidden="true" size={16} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end" aria-label={t('list.sort')} className="task-list-sort-menu">
          <DropdownMenuRadioGroup onValueChange={value => changeFilters({ sort: value === "created" ? "created" : "recent" })} value={filters.sort ?? "recent"}>
            <DropdownMenuRadioItem closeOnClick value="recent">{t('list.updatedSort')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem closeOnClick value="created">{t('list.createdSort')}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <span className="sr-only" role="status">{formatTaskCount(locale, projection.visibleTasks.length)}</span>
    <div className="task-workspace-list-scroll" id="task-workspace-results" ref={rowsRef}>
      {projection.visibleTasks.length > 0 ? <>
        {pinnedTasks.length > 0 && <section aria-labelledby="task-workspace-pinned-heading" className="task-workspace-pinned">
          <h2 id="task-workspace-pinned-heading">{t('list.pinned')}</h2>
          <ul aria-label={t('list.pinned')} className="task-workspace-rows">{pinnedTasks.map(renderTaskRow)}</ul>
        </section>}
        {unpinnedTasks.length > 0 && <ul aria-label={pinnedTasks.length > 0 ? t('list.other') : t('tasks.list')} className="task-workspace-rows">{unpinnedTasks.map(renderTaskRow)}</ul>}
      </> : <div className="task-workspace-list-empty" role="status"><strong>{!projection.allTasks.length ? t('list.empty') : t('list.noMatch')}</strong><p>{projection.allTasks.length ? t('list.searchHint') : t('list.startHint')}</p>{projection.allTasks.length ? <Button onClick={() => { onQueryChange(""); changeFilters(clearedTaskListConditions); }} size="sm" variant="outline">{t('list.viewAll')}</Button> : <Button onClick={onCreateTask} size="sm" variant="outline"><Plus aria-hidden="true" />{t('list.new')}</Button>}</div>}
    </div>
    <FixedScrollThumb scrollRef={rowsRef} />

  </section>;
}
