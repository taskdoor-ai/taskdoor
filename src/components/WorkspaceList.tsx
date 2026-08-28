import { Plus, Search, Tags } from "lucide-react";
import { type TaskNode, type WorkspaceNode } from "../data/workspaceNodes";
import { type TagDefinition } from "../data/tagGroups";
import { SelectItem } from "./ui/select";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { WorkspaceDirectoryView } from "./WorkspaceDirectoryView";
import { taskMatchesListFilters, type TaskListFilters } from "./taskListFilters";
import { ListFilterSelect } from "./ui/list-filter-select";

type WorkspaceListProps = {
  filters: TaskListFilters;
  nodes: WorkspaceNode[];
  tagDefinitions: TagDefinition[];
  onCreateTask: () => void;
  onFiltersChange: (filters: TaskListFilters) => void;
  onManageTags: () => void;
  onNodeSelect: (node: WorkspaceNode) => void;
  onQueryChange: (query: string) => void;
  query: string;
};

export function WorkspaceList({ filters, nodes: workspaceNodes, onCreateTask, onFiltersChange, onManageTags, onNodeSelect, onQueryChange, query, tagDefinitions }: WorkspaceListProps) {
  const visibleNodes = workspaceNodes
    .filter((node): node is TaskNode => node.kind === "task")
    .filter((node) => taskMatchesListFilters(node, query, filters))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  const taskStatuses = [...new Set(workspaceNodes.filter((node) => node.kind === "task").map((node) => node.status))];
  const taskOwners = [...new Set(workspaceNodes.filter((node) => node.kind === "task").map((node) => node.ownerId))].sort((a, b) => a.localeCompare(b, "zh-CN"));

  return <article className="workspace-list-page">
    <header className="workspace-list-page-header">
      <div><h1>任务</h1><p>查看全部任务，使用状态、负责人或标签快速找到要推进的工作。</p></div>
      <div className="workspace-list-heading-actions"><Button onClick={onManageTags} size="lg" type="button" variant="outline"><Tags data-icon="inline-start" />标签管理</Button><Button className="workspace-create-task" onClick={onCreateTask} size="lg" type="button"><Plus data-icon="inline-start" />新建任务</Button></div>
    </header>
    <WorkspaceDirectoryView
      onTaskSelect={onNodeSelect}
      resultsHeader={<div className="workspace-directory-results-header"><label className="workspace-list-search"><Input aria-label="搜索任务列表" leadingIcon={<Search />} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索任务" value={query} /></label><div className="workspace-task-filters"><ListFilterSelect ariaLabel="按状态筛选" label={filters.status === "all" ? "状态" : filters.status} onChange={(status) => onFiltersChange({ ...filters, status })} value={filters.status}><SelectItem value="all">全部</SelectItem>{taskStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</ListFilterSelect><ListFilterSelect ariaLabel="按负责人筛选" label={filters.owner === "all" ? "负责人" : filters.owner} onChange={(owner) => onFiltersChange({ ...filters, owner })} value={filters.owner}><SelectItem value="all">全部</SelectItem>{taskOwners.map((owner) => <SelectItem key={owner} value={owner}>{owner}</SelectItem>)}</ListFilterSelect><ListFilterSelect align="end" ariaLabel="按标签筛选" label={filters.tag === "all" ? "标签" : filters.tag} onChange={(tag) => onFiltersChange({ ...filters, tag })} value={filters.tag}><SelectItem value="all">全部</SelectItem>{tagDefinitions.map((tag) => <SelectItem key={tag.id} value={tag.name}>{tag.name}</SelectItem>)}</ListFilterSelect></div></div>}
      tagDefinitions={tagDefinitions}
      tasks={visibleNodes}
    />
  </article>;
}
