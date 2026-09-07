import { ChevronDown, Inbox, MoreHorizontal, Plus, Search, Trash2, UserRoundX, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PersonOption, TagDefinition } from "../data/sharedTypes";
import type { TaskNode } from "../data/workspaceNodes";
import { buildPersonalTaskTagGroups, type TaskListProjection } from "../lib/taskListProjection";
import { useResponsiveControlSize } from "../lib/useResponsiveControlSize";
import { getTaskStatusFilters, getTaskTagFilters, type TaskListFilters } from "./taskListFilters";
import { getFilterTagLabel, TaskListFilterPopover } from "./TaskListFilterPopover";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { getTagIcon } from "./TagBadge";

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
  onShowWorkbench: () => void;
  showingWorkbench: boolean;
};

function toggleKey(keys: Set<string>, key: string) {
  const next = new Set(keys);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function withoutKey(keys: Set<string>, key: string) {
  if (!keys.has(key)) return keys;
  const next = new Set(keys);
  next.delete(key);
  return next;
}

export function TaskWorkspaceList({ projection, currentUserId, filters, onCreateTask, onDeleteTask, onFiltersChange, onManageTags, onTaskSelect, onQueryChange, query, selectedTaskId, onShowWorkbench, showingWorkbench }: TaskWorkspaceListProps) {
  const rowsRef = useRef<HTMLDivElement>(null);
  const groupId = useId();
  const controlSize = useResponsiveControlSize("(max-width: 900px)");
  const selectedStatuses = getTaskStatusFilters(filters);
  const selectedTags = getTaskTagFilters(filters);
  const includeUntagged = Boolean(filters.includeUntagged);
  const hasFilters = selectedStatuses.length > 0 || selectedTags.length > 0 || includeUntagged;
  const filterKey = JSON.stringify([selectedStatuses, selectedTags, includeUntagged]);
  const tags = useMemo(() => {
    const byName = new Map<string, TagDefinition>();
    for (const { tag } of projection.tagFacets) if (!byName.has(tag.name)) byName.set(tag.name, tag);
    for (const name of [...projection.allTasks.flatMap((task) => task.labels ?? []), ...getTaskTagFilters(filters)]) {
      if (name.trim() && !byName.has(name)) byName.set(name, { id: `unregistered:${name}`, name, icon: "tag", color: "gray" });
    }
    return [...byName.values()];
  }, [projection, filters]);
  const ownerPendingTasks = projection.visibleTasks.filter((task) => !task.ownerId);
  const groups = [
    ...(ownerPendingTasks.length ? [{ key: "owner-pending", label: "待确认负责人", tasks: ownerPendingTasks }] : []),
    ...buildPersonalTaskTagGroups(projection.visibleTasks.filter((task) => Boolean(task.ownerId)), tags, selectedTags),
  ];
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [searchCollapsedGroups, setSearchCollapsedGroups] = useState<Set<string>>(() => new Set());
  const searching = query.trim().length > 0;
  const selectedGroupKey = groups.find((group) => group.tasks.some((task) => task.id === selectedTaskId))?.key;
  const filtering = searching || hasFilters;

  // 查询与筛选临时展开匹配组，不覆盖未筛选时的折叠偏好。
  useEffect(() => {
    if (rowsRef.current) rowsRef.current.scrollTop = 0;
    setSearchCollapsedGroups(new Set());
  }, [query, filters.owner, filterKey]);

  useEffect(() => {
    if (!showingWorkbench && selectedGroupKey) {
      (filtering ? setSearchCollapsedGroups : setCollapsedGroups)((current) => withoutKey(current, selectedGroupKey));
    }
  }, [selectedTaskId, selectedGroupKey, showingWorkbench, filtering]);

  const changeFilters = (patch: Partial<TaskListFilters>) => onFiltersChange({ owner: currentUserId, status: "all", tag: "all", statuses: selectedStatuses, tags: selectedTags, includeUntagged, ...patch });
  const toggleStatus = (status: string) => changeFilters({ statuses: selectedStatuses.includes(status) ? selectedStatuses.filter((value) => value !== status) : [...selectedStatuses, status] });
  const toggleTag = (tag: string) => changeFilters({ tags: selectedTags.includes(tag) ? selectedTags.filter((value) => value !== tag) : [...selectedTags, tag] });
  const resetFilters = () => changeFilters({ statuses: [], tags: [], includeUntagged: false });
  const clearSearchAndFilters = () => {
    onQueryChange("");
    resetFilters();
  };

  return <section aria-label="个人任务导航" className="task-workspace-list">
    <div className="task-workspace-list-search">
      <Input aria-label="搜索任务列表" className="task-workspace-search" leadingIcon={<Search />} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索任务…" value={query} />
      <TaskListFilterPopover
        includeUntagged={includeUntagged}
        onManageTags={onManageTags}
        onReset={resetFilters}
        onStatusToggle={toggleStatus}
        onTagToggle={toggleTag}
        onUntaggedToggle={() => changeFilters({ includeUntagged: !includeUntagged })}
        resultCount={projection.visibleTasks.length}
        selectedStatuses={selectedStatuses}
        selectedTags={selectedTags}
        statuses={[...new Set([...projection.statuses, ...selectedStatuses])]}
        tags={tags}
        touch={controlSize === "touch"}
      />
      <Button aria-label="新建任务" className="task-workspace-create-button task-workspace-new-task" onClick={onCreateTask} size={controlSize === "touch" ? "icon-touch" : "icon-sm"} title="新建任务" type="button"><Plus aria-hidden="true" /></Button>
    </div>

    <header className="task-workspace-list-header">
      <h1 id="task-workspace-list-heading" tabIndex={-1}>
        <button aria-current={showingWorkbench ? "page" : undefined} className="task-workspace-my-work" onClick={onShowWorkbench} type="button">推荐</button>
      </h1>
    </header>

    {(searching || hasFilters) && <div className="task-workspace-list-summary">
      {hasFilters && <div aria-label="已选筛选条件" className="task-workspace-filter-chips">
        {selectedStatuses.map((status) => <button aria-label={`清除状态筛选：${status}`} className="task-workspace-filter-chip" key={`status:${status}`} onClick={() => toggleStatus(status)} title={`状态：${status}`} type="button"><span>状态：{status}</span><X aria-hidden="true" size={12} /></button>)}
        {selectedTags.map((name) => {
          const tag = tags.find((item) => item.name === name);
          const Icon = getTagIcon(tag?.icon ?? "tag");
          return <button aria-label={`清除标签筛选：${getFilterTagLabel(name)}`} className="task-workspace-filter-chip" key={`tag:${name}`} onClick={() => toggleTag(name)} title={`标签：${name}`} type="button"><Icon aria-hidden="true" size={12} style={tag ? { color: `var(--ad-tag-${tag.color}-ink)` } : undefined} /><span>{getFilterTagLabel(name)}</span><X aria-hidden="true" size={12} /></button>;
        })}
        {includeUntagged && <button aria-label="清除标签筛选：未打标签" className="task-workspace-filter-chip" onClick={() => changeFilters({ includeUntagged: false })} type="button"><Inbox aria-hidden="true" size={12} /><span>未打标签</span><X aria-hidden="true" size={12} /></button>}
      </div>}
      <div className="task-workspace-result-summary"><span aria-label={`当前结果 ${projection.visibleTasks.length} 项任务`} aria-live="polite" className="task-workspace-result-count">{searching ? "搜索结果 · " : ""}{projection.visibleTasks.length} 项</span>{hasFilters && <button className="task-filter-text-button" onClick={resetFilters} type="button">清除筛选</button>}</div>
    </div>}

    <div className="task-workspace-list-scroll" ref={rowsRef}>
      {groups.length > 0 ? groups.map((group) => {
        const expanded = !(filtering ? searchCollapsedGroups : collapsedGroups).has(group.key);
        const headingId = `${groupId}-${encodeURIComponent(group.key)}`;
        const tag = tags.find((tag) => group.key === `tag:${tag.id}`);
        const groupLabel = group.key === "owner-pending" || group.key === "untagged" ? group.label : getFilterTagLabel(group.label);
        const GroupIcon = group.key === "owner-pending" ? UserRoundX : group.key === "untagged" ? Inbox : getTagIcon(tag?.icon ?? "tag");
        return <section aria-labelledby={headingId} className="task-workspace-tag-group" data-tag-group={group.key} key={group.key}>
          <h2><button aria-controls={`${headingId}-tasks`} aria-expanded={expanded} className="task-workspace-group-toggle" id={headingId} onClick={() => (filtering ? setSearchCollapsedGroups : setCollapsedGroups)((current) => toggleKey(current, group.key))} type="button">
            <ChevronDown aria-hidden="true" className="task-workspace-group-chevron" size={13} />
            <GroupIcon aria-hidden="true" className="task-workspace-group-icon" size={14} style={tag ? { color: `var(--ad-tag-${tag.color}-ink)` } : undefined} />
            <span className="task-workspace-group-name" title={groupLabel}>{groupLabel}</span><span aria-label={`${group.tasks.length} 项任务`} className="task-workspace-group-count">{group.tasks.length}</span>
          </button></h2>
          <ul aria-label={`${groupLabel}中的任务`} className="task-workspace-rows" hidden={!expanded} id={`${headingId}-tasks`}>
            {group.tasks.map((task) => <li className="task-workspace-row-entry" key={task.id}>
              <button aria-current={!showingWorkbench && selectedTaskId === task.id ? "page" : undefined} aria-label={`打开任务：${task.name}`} className="task-workspace-row" data-task-id={task.id} onClick={() => onTaskSelect(task)} type="button">
                <span className="task-workspace-row-title" title={task.name}>{task.name}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger aria-label={`${task.name}的更多操作`} className="task-workspace-row-menu-trigger" id={`task-workspace-row-menu-${task.id}`} title="更多操作" type="button"><MoreHorizontal aria-hidden="true" size={16} /></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="task-workspace-row-menu" sideOffset={4}>
                  <DropdownMenuItem variant="destructive" onClick={() => onDeleteTask(task)}><Trash2 aria-hidden="true" size={15} />删除任务</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>)}
          </ul>
        </section>;
      }) : <div className="task-workspace-list-empty" role="status">
        {projection.allTasks.length === 0 ? <><strong>还没有由你负责的任务</strong><p>新建一个任务，开始推进工作。</p><Button onClick={onCreateTask} size="sm" type="button">新建任务</Button></> : <><strong>没有匹配的任务</strong><p>试试减少筛选条件，或更换搜索词。</p><Button onClick={clearSearchAndFilters} size="sm" type="button" variant="outline">清除搜索和筛选</Button></>}
      </div>}
    </div>
  </section>;
}
