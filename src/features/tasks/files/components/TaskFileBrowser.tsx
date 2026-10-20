import { ArrowLeft, ChevronRight, FolderPlus, Grid2X2, List, Search, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { TaskFileThumbnail } from "@/features/tasks/files/components/TaskFileThumbnail";
import { TaskFileName } from "@/features/tasks/files/components/TaskFileName";
import { TaskFileNodeMenu, type TaskFileAction } from "@/features/tasks/files/components/TaskFileTree";
import { getNodePath, sortTaskFileNodes } from "@/features/tasks/files/lib/task-file-tree";
import "@/features/tasks/styles/task-file-browser.css";

/** The task's file tab is a directory browser; readers open separately. */
export function TaskFileBrowser({ files, directoryId, onDirectoryChange, onOpen, onAction, onCreateFolder, onUpload, uploading, error, displayName }: {
  files: TaskFileNode[];
  directoryId: string | null;
  onDirectoryChange: (id: string | null) => void;
  onOpen: (id: string, trigger: HTMLElement) => void;
  onAction: (action: TaskFileAction) => void;
  onCreateFolder: () => void;
  onUpload: () => void;
  uploading: boolean;
  error?: string;
  displayName: (name: string) => string;
}) {
  const ui = useGlobalUi();
  const [view, setView] = useState<"list" | "grid">("list");
  const [query, setQuery] = useState("");
  const location = useRef<HTMLButtonElement>(null);
  const previousDirectory = useRef(directoryId);
  const visible = files.filter(file => !file.archived);
  const directory = visible.find(file => file.kind === "folder" && file.id === directoryId);
  const path = directory ? getNodePath(visible, directory.id) : [];
  const needle = query.trim().toLocaleLowerCase();
  const nodes = sortTaskFileNodes(visible.filter(file => needle ? displayName(file.name).toLocaleLowerCase().includes(needle) : file.parentId === (directory?.id ?? null)));
  useEffect(() => {
    if (directoryId && !files.some(file => file.id === directoryId && file.kind === "folder" && !file.archived)) onDirectoryChange(null);
  }, [files, directoryId, onDirectoryChange]);
  useEffect(() => {
    if (previousDirectory.current !== directoryId) location.current?.focus();
    previousDirectory.current = directoryId;
  }, [directoryId]);
  const enter = (id: string | null) => { setQuery(""); onDirectoryChange(id); };

  return <div className="task-file-directory-browser">
    <div className="task-file-browser-toolbar">
      <div className="task-file-sidebar-search task-file-browser-search"><Input aria-label={ui("搜索当前任务文件")} className="task-file-search-input" leadingIcon={<Search />} onChange={event => setQuery(event.target.value)} placeholder={ui("搜索文件")} value={query} />{query && <Button aria-label={ui("清除搜索")} className="task-file-search-clear" onClick={() => setQuery("")} size="icon-xs" variant="ghost"><X /></Button>}</div>
      <div aria-label={ui("文件显示方式")} className="task-file-browser-view-switch" role="group">
        <Button aria-label={ui("列表视图")} aria-pressed={view === "list"} onClick={() => setView("list")} size="icon-sm" title={ui("列表视图")} variant={view === "list" ? "secondary" : "ghost"}><List /></Button>
        <Button aria-label={ui("缩略图视图")} aria-pressed={view === "grid"} onClick={() => setView("grid")} size="icon-sm" title={ui("缩略图视图")} variant={view === "grid" ? "secondary" : "ghost"}><Grid2X2 /></Button>
      </div>
      <Button aria-label={ui("新建文件夹")} onClick={onCreateFolder} size="sm" variant="ghost"><FolderPlus /><span>{ui("新建文件夹")}</span></Button>
      <Button disabled={uploading} onClick={onUpload} size="sm" variant="outline"><Upload /><span>{ui("上传文件")}</span></Button>
    </div>
    <nav aria-label={ui("文件位置")} className="task-file-browser-location">
      <Button aria-label={ui("返回上一级文件夹")} disabled={!directory} onClick={() => enter(directory?.parentId ?? null)} size="icon-sm" variant="ghost"><ArrowLeft /></Button>
      <button aria-current={!directory ? "page" : undefined} onClick={() => enter(null)} ref={location} type="button">{ui("任务文件")}</button>
      {path.map((node, index) => <span className="task-file-browser-crumb" key={node.id}><ChevronRight aria-hidden="true" size={13} /><button aria-current={index === path.length - 1 ? "page" : undefined} onClick={() => enter(node.id)} title={displayName(node.name)} type="button">{displayName(node.name)}</button></span>)}
      <small aria-live="polite">{ui("{0} 项", { 0: nodes.length })}</small>
    </nav>
    {error && <p className="task-file-save-error" role="alert">{error}</p>}
    {nodes.length ? <ul aria-label={ui("任务文件")} className="task-file-browser-items" data-view={view}>
      {nodes.map(node => <li className="task-file-browser-item" data-kind={node.kind} key={node.id}>
        <button aria-label={node.kind === "folder" ? ui("打开文件夹：{0}", { 0: displayName(node.name) }) : ui("打开文件：{0}", { 0: displayName(node.name) })} className="task-file-browser-open" data-file-id={node.id} onClick={event => node.kind === "folder" ? enter(node.id) : onOpen(node.id, event.currentTarget)} type="button">
          <span className="task-file-browser-thumbnail"><TaskFileThumbnail file={node} /></span>
          <span className="task-file-browser-item-label"><TaskFileName name={displayName(node.name)} />{needle && node.parentId && <small>{getNodePath(visible, node.id).slice(0, -1).map(part => displayName(part.name)).join(" / ")}</small>}</span>
          <small className="task-file-browser-meta">{node.kind === "folder" ? ui("{0} 项", { 0: visible.filter(child => child.parentId === node.id).length }) : node.sizeLabel ?? ""}</small>
        </button>
        <TaskFileNodeMenu className="task-file-browser-more" node={node} onAction={onAction} />
      </li>)}
    </ul> : <Empty className="task-file-browser-empty"><EmptyHeader><EmptyMedia variant="icon">{needle ? <Search /> : <FolderPlus />}</EmptyMedia><EmptyTitle>{needle ? ui("没有匹配的文件") : ui("暂无文件")}</EmptyTitle><EmptyDescription>{needle ? ui("试试其他名称，或清除搜索。") : ui("上传文件，或新建文件夹整理任务资料。")}</EmptyDescription></EmptyHeader>{needle && <Button onClick={() => setQuery("")} size="sm" variant="outline">{ui("清除搜索")}</Button>}</Empty>}
  </div>;
}
