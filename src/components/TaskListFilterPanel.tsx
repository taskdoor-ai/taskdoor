import { useI18n } from "../i18n/I18nProvider";
import { filterDateLabel, filterStatusLabel } from "../i18n/filterDisplay";
import { mockTagName } from "../i18n/mockContent";
import { useRemainingCopy } from "../i18n/remainingMessages";
import { ArrowLeft, CalendarDays, CalendarPlus, Check, ChevronRight, CircleDashed, Inbox, ListFilter, Search, Tag, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { TagDefinition } from "../data/sharedTypes";
import { getTaskScopeFilter, getTaskStatusFilters, getTaskTagFilters, taskDateFilterLabel, taskScopeLabels, type TaskListDateFilter, type TaskListFilters } from "./taskListFilters";
import { getTagIcon } from "./TagBadge";
import { taskStatusDefinition, type TaskStatus } from "./TaskStatusBadge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Input } from "./ui/input";

const filterCategories = [
  { id: "statuses", label: "状态", icon: CircleDashed },
  { id: "tags", label: "标签", icon: Tag },
  { id: "deadline", label: "截止日期", icon: CalendarDays },
  { id: "created", label: "创建日期", icon: CalendarPlus },
] as const;
type Category = typeof filterCategories[number]["id"];

type Props = {
  tags: TagDefinition[];
  statuses: string[];
  filters: TaskListFilters;
  touch: boolean;
  onChange: (patch: Partial<TaskListFilters>) => void;
  onReset: () => void;
  onManageTags: () => void;
};

// 标签名称由用户决定，不能与表示空值的“未打标签”条件混淆。
export function getFilterTagLabel(name: string) {
  return name === "未打标签" ? "未打标签（标签）" : name;
}

export function taskFilterSummaries(filters: TaskListFilters) {
  const scope = getTaskScopeFilter(filters);
  return {
    scope: scope === "all" ? "" : taskScopeLabels[scope],
    statuses: getTaskStatusFilters(filters).join("、"),
    tags: [...getTaskTagFilters(filters).map(getFilterTagLabel), ...(filters.includeUntagged ? ["未打标签"] : [])].join("、"),
    deadline: filters.deadline ? taskDateFilterLabel(filters.deadline) : "",
    created: filters.created ? taskDateFilterLabel(filters.created) : "",
  };
}

function TaskFilterChip({ label, value, children, onRemove }: { label: string; value: string; children?: ReactNode; onRemove: () => void }) {
  const u = useRemainingCopy();
  return <div aria-label={`${label}：${value}`} className="task-filter-condition-chip" role="group">
    <span className="task-filter-chip-field">{label}：</span>
    <span className="task-filter-chip-value" title={value}>{children ?? <span className="task-filter-chip-text">{value}</span>}</span>
    <button aria-label={`${u("clear")}: ${label}: ${value}`} className="task-filter-chip-remove" onClick={onRemove} title={`${u("clear")}: ${label}: ${value}`} type="button"><X aria-hidden="true" size={13} /></button>
  </div>;
}

function FilterOption({ checked, label, icon, onChange }: { checked: boolean; label: string; icon: ReactNode; onChange: () => void }) {
  return <label className="task-filter-menu-option">
    <input checked={checked} onChange={onChange} type="checkbox" />
    {icon}<span>{label}</span><Check aria-hidden="true" className="task-filter-menu-check" data-checked={checked || undefined} size={15} />
  </label>;
}

function DateFilterChoices({ field, value, onChange }: { field: "deadline" | "created"; value?: TaskListDateFilter; onChange: (value?: TaskListDateFilter) => void }) {
  const u = useRemainingCopy();
  const { locale } = useI18n();
  const [from, setFrom] = useState(value?.from ?? "");
  const [to, setTo] = useState(value?.to ?? "");
  const presets: TaskListDateFilter["preset"][] = ["today", "this-week", field === "deadline" ? "next-7-days" : "past-7-days", ...(field === "deadline" ? ["overdue" as const] : []), "unknown"];
  return <>
    <div aria-label={u('datePresets')} className="task-filter-date-presets">
      <button aria-pressed={!value} className="task-filter-menu-option" onClick={() => onChange(undefined)} type="button"><span>{u('anyDate')}</span>{!value && <Check aria-hidden="true" size={15} />}</button>
      {presets.map(preset => <button aria-pressed={value?.preset === preset} className="task-filter-menu-option" key={preset} onClick={() => onChange({ preset })} type="button"><span>{filterDateLabel(locale, { preset })}</span>{value?.preset === preset && <Check aria-hidden="true" size={15} />}</button>)}
    </div>
    <form className="task-filter-date-range" onSubmit={event => { event.preventDefault(); onChange({ preset: "custom", ...(from ? { from } : {}), ...(to ? { to } : {}) }); }}>
      <strong>{u('customDates')}</strong>
      <label>{u('from')}<Input aria-label={u('startDate')} onInput={event => setFrom(event.currentTarget.value)} type="date" value={from} /></label>
      <label>{u('to')}<Input aria-label={u('endDate')} onInput={event => setTo(event.currentTarget.value)} type="date" value={to} /></label>
      <Button disabled={!from && !to} size="sm" type="submit" variant="outline">{u('applyDates')}</Button>
    </form>
  </>;
}

export function TaskListFilterPanel({ tags, statuses, filters, touch, onChange, onReset, onManageTags }: Props) {
  const u = useRemainingCopy();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [optionQuery, setOptionQuery] = useState("");
  const detailRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const detailId = useId();
  const tagLabel = (name: string) => {
    const tag = tags.find(tag => tag.name === name);
    return tag ? mockTagName(locale, tag.id, getFilterTagLabel(name)) : getFilterTagLabel(name);
  };
  const statusLabel = (status: string) => filterStatusLabel(locale, status);
  const summaries = {
    ...taskFilterSummaries(filters),
    statuses: getTaskStatusFilters(filters).map(statusLabel).join(locale === 'en' ? ', ' : '、'),
    tags: [...getTaskTagFilters(filters).map(tagLabel), ...(filters.includeUntagged ? [u('untagged')] : [])].join(locale === 'en' ? ', ' : '、'),
    deadline: filters.deadline ? filterDateLabel(locale, filters.deadline) : '',
    created: filters.created ? filterDateLabel(locale, filters.created) : '',
  };
  const categories = filterCategories.map(item => ({ ...item, label: u(({ statuses: 'status', tags: 'tags', deadline: 'dueDate', created: 'createdDate' } as const)[item.id]) }));
  const selectedStatuses = getTaskStatusFilters(filters);
  const selectedTags = getTaskTagFilters(filters);
  const activeCount = selectedStatuses.length + selectedTags.length
    + [filters.includeUntagged, filters.deadline, filters.created].filter(Boolean).length;
  const removeCondition = (patch: Partial<TaskListFilters>) => {
    const buttons = Array.from(selectionRef.current?.querySelectorAll<HTMLButtonElement>(".task-filter-chip-remove") ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    (buttons[index + 1] ?? buttons[index - 1] ?? detailRef.current?.querySelector<HTMLElement>("input, button:not(:disabled)") ?? listRef.current?.querySelector<HTMLButtonElement>("button[data-category]"))?.focus({ preventScroll: true });
    onChange(patch);
  };
  const selectedCategory = categories.find(item => item.id === category);
  const visibleCategories = categories.filter(item => item.label.toLowerCase().includes(categoryQuery.trim().toLowerCase()));
  const matchesQuery = (label: string) => label.toLowerCase().includes(optionQuery.trim().toLowerCase());
  const visibleTags = tags.filter(tag => matchesQuery(tagLabel(tag.name)) || matchesQuery(tag.name));
  const visibleStatuses = statuses.filter(status => matchesQuery(statusLabel(status)) || matchesQuery(status));
  const toggle = (values: string[], value: string) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];
  useEffect(() => {
    if (category) (detailRef.current?.querySelector<HTMLElement>("input:checked") ?? detailRef.current?.querySelector<HTMLElement>("input") ?? detailRef.current?.querySelector<HTMLElement>(".task-filter-menu-option"))?.focus({ preventScroll: true });
  }, [category]);
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) { setCategory(null); setCategoryQuery(""); setOptionQuery(""); }
  };
  const chooseCategory = (id: Category) => { setCategory(id); setOptionQuery(""); };
  const goBack = () => {
    const previous = category;
    setCategory(null); setOptionQuery("");
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>(`[data-category="${previous}"]`)?.focus({ preventScroll: true }));
  };
  const clearCategory = (id: Category) => {
    if (id === "statuses") onChange({ statuses: [], completion: "all" });
    else if (id === "tags") onChange({ tags: [], includeUntagged: false });
    else onChange({ [id]: undefined });
  };

  return <Popover open={open} onOpenChange={changeOpen}>
    <PopoverTrigger render={<Button aria-label={activeCount ? `${u("filterTasks")} (${activeCount})` : u('filterTasks')} className="task-workspace-list-options" data-filter-active={activeCount > 0 || undefined} size={touch ? "icon-touch" : "icon-sm"} title={activeCount ? `${u("filterTasks")} (${activeCount})` : u('filterTasks')} variant="outline" />}><ListFilter aria-hidden="true" />{activeCount > 0 && <span aria-hidden="true" className="task-filter-count">{activeCount}</span>}</PopoverTrigger>
    <PopoverContent align="start" aria-label={u('taskFilters')} className="task-filter-menu" collisionPadding={12} data-detail-open={Boolean(category)}>
      <div className="task-filter-menu-columns">
        <div className="task-filter-menu-main">
          <div className="task-filter-menu-search"><Input aria-label={u('searchFilterTypes')} leadingIcon={<Search />} onChange={event => setCategoryQuery(event.target.value)} placeholder={u('addFilters')} value={categoryQuery} /></div>
          <div aria-label={u('filterTypes')} className="task-filter-category-list" ref={listRef}>
            {visibleCategories.map(({ id, label, icon: Icon }) => <div className="task-filter-category-row" data-category-row={id} data-active={Boolean(summaries[id]) || undefined} data-selected={category === id || undefined} key={id}><button aria-controls={category === id ? detailId : undefined} aria-expanded={category === id} className="task-filter-category" data-category={id} onClick={() => chooseCategory(id)} onKeyDown={event => {
              if (event.key === "ArrowRight") { event.preventDefault(); chooseCategory(id); }
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-category]") ?? []);
                const next = (buttons.indexOf(event.currentTarget) + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
                buttons[next]?.focus();
              }
            }} type="button">
              <Icon aria-hidden="true" size={17} /><span className="task-filter-category-label">{label}</span>
              {summaries[id] && <span className="task-filter-category-summary" title={summaries[id]}>{summaries[id]}</span>}
              <ChevronRight aria-hidden="true" size={13} />
            </button></div>)}
            {!visibleCategories.length && <p className="task-filter-menu-empty">{u('noFilterTypes')}</p>}
          </div>
        </div>
        {selectedCategory && <div aria-label={`${selectedCategory.label}: ${u("taskFilters")}`} className="task-filter-menu-detail" id={detailId} key={selectedCategory.id} ref={detailRef}>
          <div className="task-filter-detail-heading"><button aria-label={u('backToFilters')} className="task-filter-back" onClick={goBack} type="button"><ArrowLeft size={16} /></button><strong>{selectedCategory.label}</strong><button className="task-filter-text-button" disabled={!summaries[selectedCategory.id]} onClick={() => clearCategory(selectedCategory.id)} type="button">{u('clear')}</button></div>
          {category !== "deadline" && category !== "created" && <div className="task-filter-menu-search"><Input aria-label={`${u("searchFilterTypes")}: ${selectedCategory.label}`} leadingIcon={<Search />} onChange={event => setOptionQuery(event.target.value)} placeholder={`${selectedCategory.label}…`} value={optionQuery} /></div>}
          <div className="task-filter-value-list">
            {category === "statuses" && visibleStatuses.map(status => {
              const definition = taskStatusDefinition[status as TaskStatus]; const Icon = definition?.icon ?? CircleDashed;
              return <FilterOption checked={selectedStatuses.includes(status)} icon={<span className="task-list-row-status" data-tone={definition?.tone}><Icon aria-hidden="true" size={15} /></span>} key={status} label={statusLabel(status)} onChange={() => onChange({ statuses: toggle(selectedStatuses, status), completion: "all" })} />;
            })}
            {category === "tags" && <>{visibleTags.map(tag => {
              const Icon = getTagIcon(tag.icon);
              return <FilterOption checked={selectedTags.includes(tag.name)} icon={<Icon aria-hidden="true" size={15} style={{ color: `var(--ad-tag-${tag.color}-ink)` }} />} key={tag.id} label={tagLabel(tag.name)} onChange={() => onChange({ tags: toggle(selectedTags, tag.name) })} />;
            })}{matchesQuery(u('untagged')) && <FilterOption checked={Boolean(filters.includeUntagged)} icon={<Inbox aria-hidden="true" size={15} />} label={u('untagged')} onChange={() => onChange({ includeUntagged: !filters.includeUntagged })} />}</>}
            {((category === "statuses" && !visibleStatuses.length) || (category === "tags" && !visibleTags.length && !matchesQuery(u('untagged')))) && <p className="task-filter-menu-empty">{u('noOptions')}</p>}
            {(category === "deadline" || category === "created") && <DateFilterChoices field={category} key={`${category}:${JSON.stringify(filters[category])}`} onChange={value => onChange({ [category]: value })} value={filters[category]} />}
          </div>
          {(category === "deadline" || category === "created" || category === "tags") && <div className="task-filter-detail-footer">{(category === "deadline" || category === "created") && <span>{u('matchAll')}</span>}{category === "tags" && <button className="task-filter-text-button" onClick={() => { changeOpen(false); onManageTags(); }} type="button">{u('manageTags')}</button>}</div>}
        </div>}
      </div>
      {activeCount > 0 && <div aria-label={u('activeFilters')} className="task-filter-selection" ref={selectionRef} role="region">
        {selectedStatuses.length > 0 && <div aria-label={u('selectedStatuses')} className="task-filter-selected-group">{selectedStatuses.map(status => {
          const definition = taskStatusDefinition[status as TaskStatus];
          const StatusIcon = definition?.icon ?? CircleDashed;
          return <TaskFilterChip key={status} label={u('status')} onRemove={() => removeCondition({ statuses: selectedStatuses.filter(value => value !== status), completion: "all" })} value={statusLabel(status)}><span className="task-list-row-status" data-tone={definition?.tone}><StatusIcon aria-hidden="true" size={14} /></span><span className="task-filter-chip-text">{statusLabel(status)}</span></TaskFilterChip>;
        })}</div>}
        {(selectedTags.length > 0 || filters.includeUntagged) && <div className="task-filter-selected-group" aria-label={u('selectedTags')}>{selectedTags.map(name => {
          const tag = tags.find(tag => tag.name === name);
          const TagIcon = getTagIcon(tag?.icon ?? "tag");
          return <TaskFilterChip key={name} label={u('tags')} onRemove={() => removeCondition({ tags: selectedTags.filter(value => value !== name) })} value={tagLabel(name)}><TagIcon aria-hidden="true" size={14} style={{ color: `var(--ad-tag-${tag?.color ?? "gray"}-ink)` }} /><span className="task-filter-chip-text">{tagLabel(name)}</span></TaskFilterChip>;
        })}{filters.includeUntagged && <TaskFilterChip label={u('tags')} onRemove={() => removeCondition({ includeUntagged: false })} value={u('untagged')}><Inbox aria-hidden="true" size={14} /><span className="task-filter-chip-text">{u('untagged')}</span></TaskFilterChip>}</div>}
        {([{ field: "deadline", label: u('dueDate') }, { field: "created", label: u('createdDate') }] as const).map(({ field, label }) => summaries[field] && <TaskFilterChip key={field} label={label} onRemove={() => removeCondition({ [field]: undefined })} value={summaries[field]} />)}
        <button aria-label={u('clearAllFilters')} className="task-filter-text-button task-filter-reset-all" onClick={() => {
          (detailRef.current?.querySelector<HTMLElement>("input, button:not(:disabled)") ?? listRef.current?.querySelector<HTMLButtonElement>("button[data-category]"))?.focus({ preventScroll: true });
          onReset();
        }} type="button">{u('clearAll')}</button>
      </div>}
    </PopoverContent>
  </Popover>;
}
