import { ArrowDownUp } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { useMemo } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import type { PersonOption, TagDefinition } from "@/shared/model/task-model";
import type { TaskListProjection } from "@/features/tasks/lib/task-list-projection";
import { clearedTaskListConditions, getTaskStatusFilters, getTaskTagFilters, normalizeTaskWorkspaceFilters, type TaskListFilters } from "@/features/tasks/components/task-list-filters";
import { TaskListFilterPanel } from "@/features/tasks/components/TaskListFilterPanel";
import { taskStatusOptions } from "@/shared/ui/TaskStatusBadge";

export function TaskListTools({ projection, members, filters: sourceFilters, onFiltersChange, onManageTags, touch }: {
  projection: TaskListProjection; members: PersonOption[]; filters: TaskListFilters;
  onFiltersChange: (filters: TaskListFilters) => void; onManageTags: (returnFocus?: HTMLElement | null) => void; touch: boolean;
}) {
  const { t, locale } = useI18n();
  const updatedSortLabel = t("list.updatedSort");
  const createdSortLabel = t("list.createdSort");
  const filters = normalizeTaskWorkspaceFilters(sourceFilters);
  const sortLabel = filters.sort === "created" ? createdSortLabel : updatedSortLabel;
  const selectedStatuses = getTaskStatusFilters(filters);
  const selectedTags = getTaskTagFilters(filters);
  const normalizedFilters = { ...filters, statuses: selectedStatuses, tags: selectedTags };
  const statuses = [...new Set([...taskStatusOptions, ...projection.statuses, ...selectedStatuses])];
  const changeFilters = (patch: Partial<TaskListFilters>) => onFiltersChange({ ...filters, ...patch });
  const resetFilters = () => changeFilters(clearedTaskListConditions);
  const tags = useMemo(() => {
    const byName = new Map<string, TagDefinition>();
    for (const { tag } of projection.tagFacets) if (!byName.has(tag.name)) byName.set(tag.name, tag);
    for (const name of [...projection.allTasks.flatMap((task) => task.labels ?? []), ...getTaskTagFilters(filters)]) {
      if (name.trim() && !byName.has(name)) byName.set(name, { id: `unregistered:${name}`, name, icon: "tag", color: "gray" });
    }
    return [...byName.values()];
  }, [projection, filters]);
  const filterMembers = useMemo(() => {
    const referenced = new Set([...projection.allTasks.flatMap(task => [task.ownerId, ...(task.participantIds ?? [])]), ...(filters.ownerIds ?? []), ...(filters.participantIds ?? [])].filter(Boolean));
    const people = new Map(members.map(member => [member.id, member]));
    for (const id of referenced) if (!people.has(id)) people.set(id, { id, name: locale === "en" ? "Unavailable member" : "不可用成员", email: "", role: "" });
    return [...people.values()].sort((a, b) => Number(a.membershipStatus === "invited") - Number(b.membershipStatus === "invited"));
  }, [members, projection.allTasks, filters.ownerIds, filters.participantIds, locale]);
  return (<>
      <TaskListFilterPanel iconOnly hideStatus filters={normalizedFilters} members={filterMembers} onChange={changeFilters} onManageTags={onManageTags} onReset={resetFilters} statuses={statuses} tags={tags} touch={touch} />
        <DropdownMenu>
          <DropdownMenuTrigger type="button" className="task-list-sort-trigger" title={sortLabel} aria-label={`${t("list.sort")}: ${sortLabel}`}><ArrowDownUp aria-hidden="true" size={16} /></DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6}>
            <DropdownMenuRadioGroup value={filters.sort ?? "recent"} onValueChange={value => changeFilters({ sort: value === "created" ? "created" : "recent" })}>
              <DropdownMenuLabel>{t("list.sort")}</DropdownMenuLabel>
              <DropdownMenuRadioItem value="recent">{updatedSortLabel}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="created">{createdSortLabel}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
    </>);
}
