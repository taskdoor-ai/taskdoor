import { ChevronLeft, ChevronRight, FileText, Folder, ListTodo, Plus, Search, SlidersHorizontal, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { getChildren, getFolderPath, getNode, workspaceRootId, type WorkspaceNode } from "../data/workspaceNodes";
import { PersonAvatar } from "./PersonAvatar";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { findTagByName, type TagGroup } from "../data/tagGroups";
import { TagBadge } from "./TagBadge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

type WorkspaceListProps = {
  folderId: string;
  nodes: WorkspaceNode[];
  tagGroups: TagGroup[];
  onCreateTask: () => void;
  onFolderSelect: (folderId: string) => void;
  onNodeSelect: (node: WorkspaceNode) => void;
};

const kindOrder: Record<WorkspaceNode["kind"], number> = { folder: 0, task: 1, file: 2 };

export function WorkspaceList({ folderId, nodes: workspaceNodes, onCreateTask, onFolderSelect, onNodeSelect, tagGroups }: WorkspaceListProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | WorkspaceNode["kind"]>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [page, setPage] = useState(1);
  const isAllTasks = folderId === workspaceRootId;
  const pageSize = 5;
  const folder = getNode(folderId, workspaceNodes);
  const path = getFolderPath(folderId, workspaceNodes);
  const visibleNodes = useMemo(() => (isAllTasks
    ? workspaceNodes.filter((node) => node.kind === "task")
    : getChildren(folderId, workspaceNodes)
      .filter((node) => typeFilter === "all" || node.kind === typeFilter))
    .filter((node) => node.name.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((node) => !isAllTasks || (node.kind === "task" && (statusFilter === "all" || node.status === statusFilter) && node.ownerId.includes(ownerQuery.trim()) && (tagFilter === "all" || node.labels?.includes(tagFilter))))
    .sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.name.localeCompare(b.name, "zh-CN")), [folderId, isAllTasks, ownerQuery, query, statusFilter, tagFilter, typeFilter, workspaceNodes]);
  const totalPages = Math.max(1, Math.ceil(visibleNodes.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedNodes = isAllTasks ? visibleNodes.slice((currentPage - 1) * pageSize, currentPage * pageSize) : visibleNodes;
  const taskStatuses = [...new Set(workspaceNodes.filter((node) => node.kind === "task").map((node) => node.status))];

  return <article className="workspace-list-page">
    <nav aria-label="当前位置" className="workspace-breadcrumbs">
      {path.map((item, index) => <span key={item.id}>
        {index > 0 && <ChevronRight size={13} />}
        <button onClick={() => onFolderSelect(item.id)} type="button">{item.name}</button>
      </span>)}
    </nav>

    <header className="workspace-list-heading">
      <div><small>任务列表</small><h1>{isAllTasks ? "全部任务" : folder?.name ?? "工作空间"}</h1><p>{isAllTasks ? "集中查看所有目录下的任务，目录结构仍由左侧导航管理。" : "文件夹组织业务结构，任务明确责任，文件保存协作信息。"}</p></div>
      <Button className="workspace-create-task" onClick={onCreateTask} size="lg" type="button"><Plus data-icon="inline-start" />新建任务</Button>
    </header>

    <div className="workspace-list-toolbar">
      <label><Search size={15} /><input aria-label={isAllTasks ? "搜索全部任务" : "搜索当前文件夹"} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={isAllTasks ? "搜索全部任务" : "搜索当前文件夹"} value={query} /></label>
      {isAllTasks ? <div className="workspace-task-filters"><Select onValueChange={(value) => { setStatusFilter(value as string); setPage(1); }} value={statusFilter}><SelectTrigger aria-label="按状态筛选" className="workspace-filter-select" size="sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部状态</SelectItem>{taskStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select><Select onValueChange={(value) => { setTagFilter(value as string); setPage(1); }} value={tagFilter}><SelectTrigger aria-label="按标签筛选" className="workspace-filter-select tag-filter-select" size="sm"><SelectValue /></SelectTrigger><SelectContent align="end"><SelectItem value="all">全部标签</SelectItem>{tagGroups.map((group) => <SelectGroup key={group.id}><SelectLabel>{group.name}</SelectLabel>{group.tags.map((tag) => <SelectItem key={tag.id} value={tag.name}>{tag.name}</SelectItem>)}</SelectGroup>)}</SelectContent></Select><label><UserRound size={14} /><input aria-label="搜索负责人" onChange={(event) => { setOwnerQuery(event.target.value); setPage(1); }} placeholder="搜索负责人" value={ownerQuery} /></label><span className="workspace-list-count">共 {visibleNodes.length} 个任务</span></div> : <div aria-label="按类型筛选"><SlidersHorizontal size={14} />{(["all", "folder", "task", "file"] as const).map((kind) => <button className={typeFilter === kind ? "active" : ""} key={kind} onClick={() => setTypeFilter(kind)} type="button">{{ all: "全部", folder: "文件夹", task: "任务", file: "文件" }[kind]}</button>)}</div>}
    </div>

    <section aria-label="文件夹内容" className="workspace-list-shell">
      <Table>
        <TableHeader><TableRow><TableHead>名称</TableHead>{isAllTasks && <TableHead>所属目录</TableHead>}<TableHead>负责人</TableHead><TableHead>状态</TableHead><TableHead>到期日</TableHead><TableHead>更新时间</TableHead></TableRow></TableHeader>
        <TableBody>{pagedNodes.map((node) => {
          const Icon = node.kind === "folder" ? Folder : node.kind === "task" ? ListTodo : FileText;
          return <TableRow key={node.id}>
            <TableCell><button className="workspace-node-name" onClick={() => node.kind === "folder" ? onFolderSelect(node.id) : onNodeSelect(node)} type="button"><span className={`workspace-node-icon ${node.kind}`}><Icon size={16} /></span><span><strong>{node.name}</strong>{node.kind === "task" ? <span className="workspace-node-tags">{node.labels?.map((name) => { const tag = findTagByName(tagGroups, name); return tag ? <TagBadge key={tag.id} size="sm" tag={tag} /> : null; })}</span> : <small>{node.kind === "folder" ? `${getChildren(node.id, workspaceNodes).length} 项` : `${node.fileType}${node.size ? ` · ${node.size}` : ""}`}</small>}</span>{node.kind === "folder" && <ChevronRight size={14} />}</button></TableCell>
            {isAllTasks && <TableCell><span className="workspace-task-path">{getFolderPath(node.parentId ?? workspaceRootId, workspaceNodes).slice(1).map((item) => item.name).join(" / ") || "未分类"}</span></TableCell>}
            <TableCell>{node.kind === "task" ? <span className="workspace-owner"><PersonAvatar name={node.ownerId} size="xs" />{node.ownerId}</span> : "—"}</TableCell>
            <TableCell>{node.kind === "task" ? <TaskStatusBadge size="sm" value={node.status} /> : "—"}</TableCell>
            <TableCell>{node.kind === "task" ? node.dueAt ?? "—" : "—"}</TableCell>
            <TableCell>{node.updatedAt}</TableCell>
          </TableRow>;
        })}</TableBody>
      </Table>
      {visibleNodes.length === 0 && <div className="workspace-list-empty">{isAllTasks ? "没有匹配的任务" : "当前文件夹没有匹配的内容"}</div>}
    </section>
    {isAllTasks && visibleNodes.length > 0 && <footer className="workspace-pagination"><span>第 {currentPage} / {totalPages} 页</span><div><button aria-label="上一页" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button"><ChevronLeft size={15} />上一页</button><button aria-label="下一页" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} type="button">下一页<ChevronRight size={15} /></button></div></footer>}
  </article>;
}
