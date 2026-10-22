import { FolderPlus, Plus, Search, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { TaskFileTree, type TaskFileAction } from "@/features/tasks/files/components/TaskFileTree";
import { getNodePath, searchTaskFileTree } from "@/features/tasks/files/lib/task-file-tree";
import "@/features/tasks/styles/task-file-browser.css";

/** Folders expand in place; readers open separately from the task-wide tree. */
export function TaskFileBrowser({ files, directoryId, onDirectoryChange, expandedIds, onExpandedChange, onOpen, onAction, onCreateFolder, onUpload, uploading, error, displayName }: {
  files: TaskFileNode[];
  directoryId: string | null;
  onDirectoryChange: (id: string | null) => void;
  expandedIds: Set<string>;
  onExpandedChange: (ids: Set<string>) => void;
  onOpen: (id: string, trigger: HTMLElement) => void;
  onAction: (action: TaskFileAction) => void;
  onCreateFolder: () => void;
  onUpload: () => void;
  uploading: boolean;
  error?: string;
  displayName: (name: string) => string;
}) {
  const ui = useGlobalUi();
  const [query, setQuery] = useState("");
  const [collapsedSearchIds, setCollapsedSearchIds] = useState(new Set<string>());
  const visible = searchTaskFileTree(files, "").nodes;
  const directory = visible.find(file => file.kind === "folder" && file.id === directoryId);
  const path = directory ? getNodePath(visible, directory.id) : [];
  const needle = query.trim();
  const result = searchTaskFileTree(files, query, displayName);
  const searchFolderIds = result.nodes.filter(node => node.kind === "folder").map(node => node.id);
  const treeExpandedIds = needle ? new Set(searchFolderIds.filter(id => !collapsedSearchIds.has(id))) : expandedIds;
  useEffect(() => {
    if (directoryId && !visible.some(file => file.id === directoryId && file.kind === "folder")) onDirectoryChange(null);
  }, [files, directoryId, onDirectoryChange]);
  const search = (value: string) => { setQuery(value); setCollapsedSearchIds(new Set()); };
  const chooseDirectory = (id: string | null) => {
    onDirectoryChange(id);
    if (id) onExpandedChange(new Set([...expandedIds, ...getNodePath(visible, id).filter(node => node.kind === "folder").map(node => node.id)]));
  };
  const expand = (ids: Set<string>) => {
    if (needle) setCollapsedSearchIds(new Set(searchFolderIds.filter(id => !ids.has(id))));
    else onExpandedChange(ids);
    const opened = [...ids].find(id => !treeExpandedIds.has(id));
    if (opened) chooseDirectory(opened);
    else {
      const closedAncestor = path.find(node => treeExpandedIds.has(node.id) && !ids.has(node.id));
      if (closedAncestor) onDirectoryChange(closedAncestor.parentId);
    }
  };

  return <div className="task-file-directory-browser">
    <div className="task-file-browser-toolbar">
      <div className="task-file-browser-search-row">
        <div className="task-file-sidebar-search task-file-browser-search"><Input aria-label={ui("搜索当前任务文件")} className="task-file-search-input" leadingIcon={<Search />} onChange={event => search(event.target.value)} placeholder={ui("搜索")} value={query} />{query && <Button aria-label={ui("清除搜索")} className="task-file-search-clear" onClick={() => search("")} size="icon-xs" variant="ghost"><X /></Button>}</div>
        {needle && <small aria-label={ui("{0} 项", { 0: result.matches })} aria-live="polite" className="task-file-browser-count">{result.matches}</small>}
      </div>
      <div className="task-file-browser-actions">
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={ui("新建")} className="task-file-browser-add" render={<Button variant="outline" />} title={ui("新建文件或文件夹")}><Plus aria-hidden="true" data-icon="inline-start" />{ui("新建")}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2" onClick={onCreateFolder}><FolderPlus aria-hidden="true" size={16} />{ui("文件夹")}</DropdownMenuItem>
              <DropdownMenuItem className="gap-2" disabled={uploading} onClick={onUpload}><Upload aria-hidden="true" size={16} />{ui("文件")}</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    {error && <p className="task-file-save-error" role="alert">{error}</p>}
    {result.nodes.length ? <TaskFileTree allNodes={visible} browser displayName={displayName} expandedIds={treeExpandedIds} nodes={result.nodes} onAction={onAction} onExpandedChange={expand} onSelect={(id, trigger) => { const file = visible.find(node => node.id === id); chooseDirectory(file?.parentId ?? null); if (trigger) onOpen(id, trigger); }} selectedId={directory?.id ?? null} /> : <Empty className="task-file-browser-empty"><EmptyHeader><EmptyMedia variant="icon">{needle ? <Search /> : <FolderPlus />}</EmptyMedia><EmptyTitle>{needle ? ui("没有匹配的文件") : ui("暂无文件")}</EmptyTitle><EmptyDescription>{needle ? ui("试试其他名称，或清除搜索。") : ui("上传文件，或新建文件夹整理任务资料。")}</EmptyDescription></EmptyHeader>{needle && <Button onClick={() => search("")} size="sm" variant="outline">{ui("清除搜索")}</Button>}</Empty>}
  </div>;
}
