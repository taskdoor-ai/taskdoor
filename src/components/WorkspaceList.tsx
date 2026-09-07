import { LayoutDashboard, List, Plus, Search, Tags } from "lucide-react";
import { useState } from "react";
import { type TagDefinition } from "../data/tagGroups";
import type { PersonOption } from "../data/sharedTypes";
import { type TaskNode, type WorkspaceNode } from "../data/workspaceNodes";
import { PersonPicker } from "./PersonPicker";
import { WorkspaceDirectoryView } from "./WorkspaceDirectoryView";
import { WorkspaceTaskBoard } from "./WorkspaceTaskBoard";
import { taskMatchesListFilters, type TaskListFilters } from "./taskListFilters";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ListFilterSelect } from "./ui/list-filter-select";
import { SelectItem } from "./ui/select";

type WorkspaceListView = "board" | "list";

type WorkspaceListProps = {
  currentUserId: string;
  filters: TaskListFilters;
  members: PersonOption[];
  nodes: WorkspaceNode[];
  onCreateTask: () => void;
  onFiltersChange: (filters: TaskListFilters) => void;
  onManageTags: () => void;
  onNodeSelect: (node: WorkspaceNode) => void;
  onTaskStatusChange: (taskId: string, status: TaskNode["status"]) => void;
  onQueryChange: (query: string) => void;
  query: string;
  tagDefinitions: TagDefinition[];
};

export function WorkspaceList({ currentUserId, filters, members, nodes: workspaceNodes, onCreateTask, onFiltersChange, onManageTags, onNodeSelect, onQueryChange, onTaskStatusChange, query, tagDefinitions }: WorkspaceListProps) {
  const [view, setView] = useState<WorkspaceListView>("list");
  const allTasks = workspaceNodes.filter((node): node is TaskNode => node.kind === "task");
  const visibleNodes = allTasks
    .filter((node) => taskMatchesListFilters(node, query, filters))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  const taskStatuses = [...new Set(workspaceNodes.filter((node) => node.kind === "task").map((node) => node.status))];
  const currentUserName = members.find((member) => member.id === currentUserId)?.name ?? currentUserId;
  const resultsHeader = <div className="workspace-directory-results-header">
    <label className="workspace-list-search"><Input aria-label="搜索任务列表" leadingIcon={<Search />} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索任务" value={query} /></label>
    <div className="workspace-task-filters">
      <ListFilterSelect ariaLabel="按状态筛选" label={filters.status === "all" ? "状态" : filters.status} onChange={(status) => onFiltersChange({ ...filters, status })} value={filters.status}><SelectItem value="all">全部</SelectItem>{taskStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</ListFilterSelect>
      <PersonPicker ariaLabel="按负责人筛选" members={members} menuLabel="选择负责人范围" onChange={(owner) => onFiltersChange({ ...filters, owner })} scopeOption={{ description: "查看团队全部任务", id: "all", label: "全部人员" }} selfId={currentUserId} selfOptionLabel={currentUserName} triggerVariant="filter" value={filters.owner} />
      <ListFilterSelect align="end" ariaLabel="按标签筛选" label={filters.tag === "all" ? "标签" : filters.tag} onChange={(tag) => onFiltersChange({ ...filters, tag })} value={filters.tag}><SelectItem value="all">全部</SelectItem>{tagDefinitions.map((tag) => <SelectItem key={tag.id} value={tag.name}>{tag.name}</SelectItem>)}</ListFilterSelect>
      <div aria-label="任务视图" className="workspace-task-view-switch" role="group">
        <Button aria-label="列表视图" aria-pressed={view === "list"} onClick={() => setView("list")} size="icon-sm" type="button" variant="ghost"><List /></Button>
        <Button aria-label="看板视图" aria-pressed={view === "board"} onClick={() => setView("board")} size="icon-sm" type="button" variant="ghost"><LayoutDashboard /></Button>
      </div>
    </div>
  </div>;

  return <article className="workspace-list-page">
    <header className="workspace-list-page-header">
      <div><h1>任务</h1><p>优先查看自己的任务，也可按状态、负责人或标签快速找到要推进的工作。</p></div>
      <div className="workspace-list-heading-actions"><Button onClick={onManageTags} size="lg" type="button" variant="outline"><Tags data-icon="inline-start" />我的标签</Button><Button onClick={onCreateTask} size="lg" type="button"><Plus data-icon="inline-start" />新建任务</Button></div>
    </header>
    {view === "list" ? <WorkspaceDirectoryView
      allTasks={allTasks}
      onTaskSelect={onNodeSelect}
      resultsHeader={resultsHeader}
      tagDefinitions={tagDefinitions}
      tasks={visibleNodes}
    /> : <section aria-label="任务看板区域" className="workspace-directory-shell">
      <div className="workspace-directory-results">{resultsHeader}<WorkspaceTaskBoard onTaskSelect={onNodeSelect} onTaskStatusChange={onTaskStatusChange} tagDefinitions={tagDefinitions} tasks={visibleNodes} /></div>
    </section>}
  </article>;
}
