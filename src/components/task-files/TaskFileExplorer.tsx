import { ArrowLeft, File, FolderPlus, History, MessageCircle, MoreHorizontal, MoveRight, Pencil, Save, Search, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import type { TaskFileNode } from "../../data/taskDetailMocks";
import { readTaskDiagnosisFiles, type TaskDiagnosisFileSnapshot } from "../../lib/taskDiagnosisContext";
import { applyTaskFileEdit, createTaskFileRevision, getTaskFileContent, getTaskFileLastUpdate, readTaskFileEdits, saveTaskFileEdit, type TaskFileContent, type TaskFileEditRecord } from "../../lib/taskFileEditing";
import { getTaskFileDrafts, syncTaskFileDraftWarning, updateTaskFileDrafts, type TaskFileDraft } from "../../lib/taskFileDrafts";
import { createFolder, deleteFile, deleteFolder, getDescendantIds, getNodePath, getPreviewKind, moveNode, renameNode, restoreDefaultIcon, setNodeIcon } from "../../lib/taskFileTree";
import { Button } from "../ui/button";
import { PersonName } from "../PersonAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { TaskFileDialogs, type TaskFileDialogState } from "./TaskFileDialogs";
import { TaskFileHistory } from "./TaskFileHistory";
import { type TaskFileAction, TaskFileNodeIcon, TaskFileTree } from "./TaskFileTree";
import { TaskFileViewer, type TaskFileTextSelection } from "./TaskFileViewer";

export function TaskFileExplorer({ files: initialFiles, focusedFileId, onFilesChange, onSelectText, taskId, currentUser }: {
  files: TaskFileNode[]; focusedFileId?: string | null; taskId: string; currentUser: string;
  onFilesChange?: (snapshot: TaskDiagnosisFileSnapshot) => void;
  onSelectText: (file: TaskFileNode, selection?: TaskFileTextSelection) => void;
}) {
  const [loaded] = useState<{ files: TaskFileNode[]; records: Record<string, TaskFileEditRecord>; error: string; fileErrors: Record<string, string> }>(() => {
    try {
      const records = typeof window === "undefined" ? {} : readTaskFileEdits(window.localStorage, taskId);
      const fileErrors: Record<string, string> = {};
      const files = initialFiles.map(file => {
        if (!Object.hasOwn(records, file.id)) return file;
        try { return applyTaskFileEdit(file, records[file.id]); }
        catch (failure) { fileErrors[file.id] = `${failure instanceof Error ? failure.message : "本地版本无法读取。"} 原记录已保留，当前文件暂时只读。`; return file; }
      });
      return { records, files, fileErrors, error: "" };
    } catch (error) { return { records: {}, files: initialFiles, fileErrors: {}, error: error instanceof Error ? error.message : "本地文件记录读取失败，请检查浏览器存储后重新打开。" }; }
  });
  const [records, setRecords] = useState<Record<string, TaskFileEditRecord>>(loaded.records);
  const [files, setFiles] = useState(loaded.files);
  const [drafts, setDrafts] = useState<Record<string, TaskFileDraft>>(() => getTaskFileDrafts(taskId) ?? {});
  const [error, setError] = useState(loaded.error);
  const firstFile = initialFiles.find(node => node.kind === "file" && !node.archived)?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(focusedFileId ?? firstFile);
  const [expandedIds, setExpandedIds] = useState(() => new Set(initialFiles.filter(node => node.kind === "folder").map(node => node.id)));
  const [dialog, setDialog] = useState<TaskFileDialogState>(null);
  const [query, setQuery] = useState("");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [undo, setUndo] = useState<{ files: TaskFileNode[]; message: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selection, setSelection] = useState<TaskFileTextSelection | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const selected = files.find(node => node.id === selectedId && !node.archived) ?? null;
  const currentContent = selected ? getTaskFileContent(selected) : null;
  const loadError = loaded.error || (selected ? loaded.fileErrors[selected.id] : "");
  const currentDraft = selected ? drafts[selected.id] : undefined;
  const dirty = Boolean(currentDraft && JSON.stringify(currentDraft.content) !== JSON.stringify(currentContent));
  const revisions = selected ? records[selected.id]?.revisions ?? [] : [];
  const isEditing = Boolean(selected && editingFileId === selected.id && currentContent && !loadError);
  const lastUpdate = selected ? getTaskFileLastUpdate(selected, loadError ? [] : revisions) : null;

  useEffect(() => {
    const incoming = new Set(initialFiles.map(file => file.id));
    setFiles(current => [...current, ...initialFiles.filter(file => !current.some(item => item.id === file.id))].filter(file => incoming.has(file.id) || file.kind === "folder"));
  }, [initialFiles]);
  useEffect(() => {
    if (!focusedFileId) return;
    setSelectedId(focusedFileId); setEditingFileId(null); setShowHistory(false); setMobilePreview(true); setSelection(null);
    const path = getNodePath(files, focusedFileId);
    setExpandedIds(current => new Set([...current, ...path.filter(node => node.kind === "folder").map(node => node.id)]));
  }, [focusedFileId]);
  useEffect(() => { syncTaskFileDraftWarning(); }, []);
  // 只同步已保存正文和当前文件树，编辑草稿不是诊断事实。
  useEffect(() => {
    const readable = loaded.error ? [] : files.filter((file) => !loaded.fileErrors[file.id]);
    const snapshot = readTaskDiagnosisFiles(taskId, readable);
    snapshot.unavailableFileCount += loaded.error ? files.filter((file) => file.kind === "file").length : Object.keys(loaded.fileErrors).length;
    onFilesChange?.(snapshot);
  }, [files, loaded.error, loaded.fileErrors, onFilesChange, taskId]);

  const updateDrafts = (next: Record<string, TaskFileDraft>) => {
    setDrafts(next);
    updateTaskFileDrafts(taskId, next);
  };
  const selectNode = (id: string) => {
    if (id !== selectedId) setEditingFileId(null);
    setSelectedId(id); setShowHistory(false); setSelection(null); setError(loaded.error);
    if (files.find(node => node.id === id)?.kind === "file") setMobilePreview(true);
  };
  const changeContent = (content: TaskFileContent) => {
    if (!selected || !isEditing) return;
    const next = { ...drafts };
    if (JSON.stringify(content) === JSON.stringify(currentContent)) delete next[selected.id];
    else next[selected.id] = { content, baseVersion: currentDraft?.baseVersion ?? selected.version ?? 1 };
    updateDrafts(next); setSelection(null);
  };
  const save = () => {
    if (!selected || !isEditing) return;
    if (!currentDraft || !dirty) { setEditingFileId(null); setSelection(null); return; }
    try {
      if (loadError) throw new Error(loadError);
      if (currentDraft.baseVersion !== (selected.version ?? 1)) throw new Error("文件版本已更新，草稿已保留。请先核对版本记录，不会覆盖新内容。");
      const record = createTaskFileRevision(selected, currentDraft.content, currentUser);
      if (!record) return;
      const nextRecord = { ...record, revisions: [...revisions, ...record.revisions] };
      saveTaskFileEdit(window.localStorage, taskId, nextRecord, selected.version ?? 1);
      setRecords(current => ({ ...current, [selected.id]: nextRecord }));
      setFiles(current => current.map(file => file.id === selected.id ? applyTaskFileEdit(file, nextRecord) : file));
      const nextDrafts = { ...drafts }; delete nextDrafts[selected.id]; updateDrafts(nextDrafts);
      setError(""); setSelection(null); setEditingFileId(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "保存失败，草稿已保留，请重试。");
    }
  };
  const discard = () => {
    if (!selected || !isEditing || (dirty && !window.confirm("放弃这个文件尚未保存的修改？已保存的版本不受影响。"))) return;
    const next = { ...drafts }; delete next[selected.id]; updateDrafts(next);
    setEditingFileId(null); setSelection(null); setError(loaded.error);
  };
  const visibleFiles = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return files;
    const matches = new Set(files.filter(node => node.name.toLocaleLowerCase().includes(needle)).flatMap(node => getNodePath(files, node.id).map(item => item.id)));
    return files.filter(node => matches.has(node.id));
  }, [files, query]);
  const openAction = (action: TaskFileAction) => {
    if (action.type === "restore-icon") { setFiles(current => restoreDefaultIcon(current, action.nodeId)); return; }
    setDialog({ type: action.type === "change-icon" ? "icon" : action.type, nodeId: action.nodeId });
  };
  const deleteNode = (nodeId: string, policy?: "move-contents" | "archive") => {
    const node = files.find(item => item.id === nodeId)!;
    const removed = node.kind === "folder" && policy === "archive" ? [nodeId, ...getDescendantIds(files, nodeId)] : [nodeId];
    const next = node.kind === "folder" ? deleteFolder(files, nodeId, policy ?? "move-contents") : deleteFile(files, nodeId);
    setUndo({ files, message: `已${policy === "archive" ? "归档" : "删除"}“${node.name}”` }); setFiles(next);
    if (selectedId && removed.includes(selectedId)) { setSelectedId(node.parentId); setEditingFileId(null); setShowHistory(false); setSelection(null); }
  };
  const restoreDeleted = () => {
    if (!undo) return;
    setFiles(undo.files.map(file => {
      if (!Object.hasOwn(records, file.id) || loaded.fileErrors[file.id]) return file;
      try { return applyTaskFileEdit(file, records[file.id]); } catch { return file; }
    }));
    setUndo(null);
  };
  const renameFile = (nodeId: string, name: string) => {
    const node = files.find(item => item.id === nodeId);
    if (node?.kind === "file" && getPreviewKind(node.name, node.mimeType) !== getPreviewKind(name, node.mimeType)) throw new Error("重命名不能转换文件格式，请保留原扩展名。");
    setFiles(renameNode(files, nodeId, name));
  };
  const path = selected ? getNodePath(files, selected.id) : [];
  const folderChildren = selected?.kind === "folder" ? files.filter(node => node.parentId === selected.id && !node.archived) : [];

  return <div className="task-file-explorer" data-mobile-view={mobilePreview ? "preview" : "tree"} onKeyDown={event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); save(); }
    if (event.key === "Escape") setSelection(null);
  }}>
    <aside className="task-file-explorer-sidebar">
      <header><span><strong>任务文件</strong><small>{files.filter(node => node.kind === "file" && !node.archived).length}</small></span><button aria-label="新建文件夹" onClick={() => setDialog({ type: "create", parentId: selected?.kind === "folder" ? selected.id : selected?.parentId ?? null })} type="button"><FolderPlus size={15} /></button></header>
      <label className="task-file-explorer-search"><Search size={14} /><input onChange={event => setQuery(event.target.value)} placeholder="搜索当前任务文件" value={query} />{query && <button aria-label="清除搜索" onClick={() => setQuery("")} type="button"><X size={12} /></button>}</label>
      <div className="task-file-explorer-tree-scroll">{visibleFiles.length ? <TaskFileTree expandedIds={query ? new Set(visibleFiles.filter(node => node.kind === "folder").map(node => node.id)) : expandedIds} nodes={visibleFiles} onAction={openAction} onExpandedChange={setExpandedIds} onSelect={selectNode} selectedId={selectedId} /> : <div className="task-file-explorer-no-results">没有匹配的文件<button onClick={() => setQuery("")} type="button">清除搜索</button></div>}</div>
    </aside>
    <main aria-label={selected ? `文件编辑：${selected.name}` : "文件编辑"} className="task-file-explorer-preview" id={selected ? `task-file-preview-${selected.id}` : undefined} tabIndex={-1}>
      {selected ? <>
        <div className="task-file-editor-toolbar">
          <button aria-label="返回文件结构" className="task-file-explorer-mobile-back" onClick={() => { setMobilePreview(false); setSelection(null); }} type="button"><ArrowLeft size={16} /></button>
          <div className="task-file-toolbar-context">
            <nav aria-label="文件位置" className="task-file-editor-path">{path.map((node, index) => <React.Fragment key={node.id}>{index > 0 && <span aria-hidden="true">/</span>}{node.kind === "folder" ? <button onClick={() => selectNode(node.id)} type="button">{node.name}</button> : <span aria-current="page" title={node.name}>{node.name}</span>}</React.Fragment>)}</nav>
          </div>
          <div className="task-file-editor-actions">
            {selected.kind === "file" && lastUpdate?.updatedAt.trim() && <div aria-label="最近更新" className="task-file-last-update">
                {lastUpdate.author && <><PersonName name={lastUpdate.author} personId={lastUpdate.author} showProfilePreview={false} /><span>于</span></>}
                {lastUpdate.isExact ? <time dateTime={lastUpdate.updatedAt} title={new Date(lastUpdate.updatedAt).toLocaleString("zh-CN")}>{new Date(lastUpdate.updatedAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}</time> : <span>{lastUpdate.updatedAt}</span>}
                <span>更新</span>
            </div>}
            <div className="task-file-editor-controls">
            {selected.kind === "file" && <>
              {isEditing && <span aria-live="polite" className="task-file-save-state">{dirty ? "未保存" : "编辑中"}</span>}
              <Popover key={selected.id} modal={false} onOpenChange={open => { setShowHistory(open); setSelection(null); }} open={showHistory}>
                <PopoverTrigger render={<Button aria-label="查看版本记录" className="task-file-version-button" size="icon-sm" title="版本记录" type="button" variant="ghost" />}><History aria-hidden="true" size={16} /></PopoverTrigger>
                <PopoverContent align="end" aria-label="版本记录" className="task-file-history-popover" collisionPadding={12} sideOffset={8}>
                  <TaskFileHistory key={selected.id} onClose={() => setShowHistory(false)} revisions={revisions} version={selected.version ?? 1} />
                </PopoverContent>
              </Popover>
              {currentContent && !loadError && (isEditing ? <><Button className="task-file-action-button" onClick={discard} size="sm" variant="ghost">取消</Button><Button aria-label="保存文件" className="task-file-action-button task-file-save-button" onClick={save} size="sm" variant="default"><Save size={16} />保存</Button></> : <Button aria-label="编辑文件" className="task-file-action-button" onClick={() => { setEditingFileId(selected.id); setSelection(null); setError(""); }} size="sm" variant="ghost"><Pencil size={16} />{dirty ? "继续编辑" : "编辑"}</Button>)}
            </>}
            <DropdownMenu><DropdownMenuTrigger aria-label="更多文件操作" className="task-file-toolbar-more"><MoreHorizontal size={17} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setDialog({ type: "rename", nodeId: selected.id })}><Pencil size={14} />重命名</DropdownMenuItem><DropdownMenuItem onClick={() => setDialog({ type: "move", nodeId: selected.id })}><MoveRight size={14} />移动到</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            </div>
          </div>
        </div>
        {(error || loadError) && <p className="task-file-save-error" role="alert">{error || loadError}</p>}
        {selected.kind === "file" ? <div className="task-file-editor-body">
          <div className="task-file-explorer-viewer" onScroll={() => setSelection(null)}><TaskFileViewer draft={isEditing ? currentDraft?.content ?? currentContent : currentContent} file={selected} key={selected.id} onChange={isEditing ? changeContent : undefined} onSelection={setSelection} onSelectText={() => onSelectText(selected)} /></div>
        </div> : <div className="task-file-folder-summary"><div><TaskFileNodeIcon expanded node={selected} /><strong>{selected.name}</strong><span>{folderChildren.length} 个直接子项</span></div>{folderChildren.length ? <ul>{folderChildren.map(child => <li key={child.id}><button onClick={() => selectNode(child.id)} type="button"><TaskFileNodeIcon node={child} /><span>{child.name}</span><small>{child.kind === "file" ? `v${child.version ?? 1}` : `${files.filter(node => node.parentId === child.id && !node.archived).length} 项`}</small></button></li>)}</ul> : <p>这个文件夹还是空的。可以在左侧创建子文件夹。</p>}</div>}
      </> : <div className="task-file-empty"><File size={30} /><strong>选择一个文件或文件夹</strong><span>从左侧浏览当前任务的文件结构。</span></div>}
    </main>
    {selection && selected && <div aria-label="选中文字操作" className="task-file-selection-toolbar" role="toolbar" style={{ left: Math.max(12, Math.min(window.innerWidth - 156, selection.rect.left)), top: Math.max(12, selection.rect.bottom - 48) }}><button onMouseDown={event => event.preventDefault()} onClick={() => { onSelectText(selected, selection); setSelection(null); }} title="引用这段文字发起评论" type="button"><MessageCircle size={17} />评论</button><button aria-label="关闭选区操作" onClick={() => setSelection(null)} type="button"><X size={14} /></button></div>}
    <TaskFileDialogs dialog={dialog} nodes={files} onClose={() => setDialog(null)} onCreate={(parentId, name) => { const result = createFolder(files, parentId, name); setFiles(result.nodes); setSelectedId(result.folder.id); setExpandedIds(current => new Set([...current, ...(parentId ? [parentId] : [])])); }} onDelete={deleteNode} onIcon={(nodeId, iconName) => setFiles(setNodeIcon(files, nodeId, iconName))} onMove={(nodeId, parentId) => { setFiles(moveNode(files, nodeId, parentId)); if (parentId) setExpandedIds(current => new Set([...current, parentId])); }} onRename={renameFile} />
    {undo && <div className="task-file-undo" role="status"><span>{undo.message}</span><button onClick={restoreDeleted} type="button">撤销</button><button aria-label="关闭提示" onClick={() => setUndo(null)} type="button"><X size={13} /></button></div>}
  </div>;
}
