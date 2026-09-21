import { useGlobalUi } from "../../i18n/globalUi";
import { useDetailCopy } from "../../i18n/detailMessages";
import { useMockText } from "../../i18n/MockDataProvider";
import { ArrowLeft, File, FolderPlus, History, MessageCircle, MoreHorizontal, MoveRight, Pencil, Save, Search, Upload, X } from "lucide-react";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import type { TaskFileNode } from "../../data/taskDetailMocks";
import { readTaskDiagnosisFiles, type TaskDiagnosisFileSnapshot } from "../../lib/taskDiagnosisContext";
import { applyTaskFileEdit, createTaskFileRevision, getTaskFileContent, getTaskFileLastUpdate, readTaskFileEdits, saveTaskFileEdit, type TaskFileContent, type TaskFileEditRecord } from "../../lib/taskFileEditing";
import { getTaskFileDrafts, syncTaskFileDraftWarning, updateTaskFileDrafts, type TaskFileDraft } from "../../lib/taskFileDrafts";
import { createFolder, deleteFile, deleteFolder, getDescendantIds, getNodePath, getPreviewKind, moveNode, renameNode, restoreDefaultIcon, setNodeIcon } from "../../lib/taskFileTree";
import { Button } from "../ui/button";
import { toast } from "../ui/toast";
import { PersonName } from "../PersonAvatar";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { TaskFileDialogs, type TaskFileDialogState } from "./TaskFileDialogs";
import { TaskFileHistory } from "./TaskFileHistory";
import { type TaskFileAction, TaskFileNodeIcon, TaskFileTree } from "./TaskFileTree";
import { TaskFileViewer, type TaskFileTextSelection } from "./TaskFileViewer";
import { prepareDiscussionUpload, DISCUSSION_UPLOAD_MAX_FILES } from "../../lib/discussionUploads";
import { getVisibleFileDiscussionThreads, type FileDiscussionThread } from "../../lib/taskCollaboration";
import { FileDiscussionPanel, type FileDiscussionCollaboration } from "./FileDiscussionPanel";

export function TaskFileExplorer({ files: initialFiles, focusedFileId, focusedVersion, focusedSequence, onFilesChange, onNodesChange, onSaved, taskId, currentUser, collaboration }: {
  files: TaskFileNode[]; focusedFileId?: string | null; focusedVersion?: number; focusedSequence?: number; taskId: string; currentUser: string;
  onSaved?: () => void;
  onNodesChange?: (files: TaskFileNode[]) => void;
  onFilesChange?: (snapshot: TaskDiagnosisFileSnapshot) => void;
  onSelectText?: (file: TaskFileNode, selection?: TaskFileTextSelection) => void;
  collaboration?: FileDiscussionCollaboration;
}) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const mock = useMockText();
  const [loaded] = useState<{ files: TaskFileNode[]; records: Record<string, TaskFileEditRecord>; error: string; fileErrors: Record<string, string> }>(() => {
    try {
      const records = typeof window === "undefined" ? {} : readTaskFileEdits(window.localStorage, taskId);
      const fileErrors: Record<string, string> = {};
      const files = initialFiles.map(file => {
        if (!Object.hasOwn(records, file.id)) return file;
        try { return applyTaskFileEdit(file, records[file.id]); }
        catch (failure) { fileErrors[file.id] = ui("{0} 原记录已保留，当前文件暂时只读。", {0: failure instanceof Error ? failure.message : "本地版本无法读取。"}); return file; }
      });
      return { records, files, fileErrors, error: "" };
    } catch (error) { return { records: {}, files: initialFiles, fileErrors: {}, error: error instanceof Error ? error.message : "本地文件记录读取失败，请检查浏览器存储后重新打开。" }; }
  });
  const [records, setRecords] = useState<Record<string, TaskFileEditRecord>>(loaded.records);
  const [files, setFiles] = useState(loaded.files);
  const [drafts, setDrafts] = useState<Record<string, TaskFileDraft>>(() => getTaskFileDrafts(taskId) ?? {});
  const [error, setError] = useState(loaded.error);
  const firstFile = initialFiles.find(node => node.kind === "file" && !node.archived)?.id ?? null;
  const [referenceVersion, setReferenceVersion] = useState(focusedVersion);
  const [selectedId, setSelectedId] = useState<string | null>(focusedFileId ?? firstFile);
  const [expandedIds, setExpandedIds] = useState(() => new Set(initialFiles.filter(node => node.kind === "folder").map(node => node.id)));
  const [dialog, setDialog] = useState<TaskFileDialogState>(null);
  const [query, setQuery] = useState("");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [undo, setUndo] = useState<{ files: TaskFileNode[]; message: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selection, setSelection] = useState<TaskFileTextSelection | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const [uploading, setUploading] = useState(false);
  const [compactToolbar, setCompactToolbar] = useState(true);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draftThreads, setDraftThreads] = useState<Record<string, FileDiscussionThread>>({});
  const [pendingDiscussion, setPendingDiscussion] = useState<{ quote?: TaskFileTextSelection } | null>(null);
  const selected = files.find(node => node.id === selectedId && !node.archived) ?? null;
  const currentContent = selected ? getTaskFileContent(selected) : null;
  const loadError = loaded.error || (selected ? loaded.fileErrors[selected.id] : "");
  const currentDraft = selected ? drafts[selected.id] : undefined;
  const dirty = Boolean(currentDraft && JSON.stringify(currentDraft.content) !== JSON.stringify(currentContent));
  const revisions = selected ? records[selected.id]?.revisions ?? [] : [];
  const isEditing = Boolean(selected && editingFileId === selected.id && currentContent && !loadError);
  const lastUpdate = selected ? getTaskFileLastUpdate(selected, loadError ? [] : revisions) : null;
  const fileThreads = useMemo(() => collaboration ? getVisibleFileDiscussionThreads(collaboration.threads, collaboration.messages).filter(thread => thread.fileId === selectedId) : [], [collaboration?.threads, collaboration?.messages, selectedId]);
  const draftThread = selected ? draftThreads[selected.id] ?? null : null;

  useEffect(() => {
    setFiles(initialFiles.map(file => {
      const record = records[file.id];
      if (!record || record.version < (file.version ?? 1) || loaded.fileErrors[file.id]) return file;
      try { return applyTaskFileEdit(file, record); } catch { return file; }
    }));
  }, [initialFiles]);
  useEffect(() => {
    if (!focusedFileId) return;
    setReferenceVersion(focusedVersion);
    setSelectedId(focusedFileId); setEditingFileId(null); setShowHistory(false); setMobilePreview(true); setSelection(null); setPendingDiscussion(null);
    const path = getNodePath(files, focusedFileId);
    setExpandedIds(current => new Set([...current, ...path.filter(node => node.kind === "folder").map(node => node.id)]));
  }, [focusedFileId, focusedVersion, focusedSequence]);
  useEffect(() => { syncTaskFileDraftWarning(); }, []);
  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const updateToolbarMode = () => setCompactToolbar(preview.getBoundingClientRect().width < 720);
    updateToolbarMode();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateToolbarMode);
    observer.observe(preview);
    return () => observer.disconnect();
  }, []);
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
  const commitFiles = (next: TaskFileNode[]) => {
    onNodesChange?.(next);
    setFiles(next);
  };
  const mutateFiles = (next: TaskFileNode[]) => {
    try { commitFiles(next); setError(""); return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : "文件列表保存失败，请重试。"); return false; }
  };
  const uploadFiles = async (incoming: File[]) => {
    if (!incoming.length || uploading) return;
    if (incoming.length > DISCUSSION_UPLOAD_MAX_FILES) { setError(ui("一次最多上传 {0} 个文件。", {0: DISCUSSION_UPLOAD_MAX_FILES})); return; }
    setUploading(true); setError("");
    try {
      const parentId = selected?.kind === "folder" ? selected.id : selected?.parentId ?? null;
      const nodes = await Promise.all(incoming.map(prepareDiscussionUpload));
      const next = [...files];
      for (const node of nodes) {
        const match = node.name.match(/^(.*?)(\.[^.]*)?$/)!;
        let name = node.name;
        let suffix = 2;
        while (next.some(item => item.parentId === parentId && !item.archived && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) name = `${match[1]} (${suffix++})${match[2] ?? ""}`;
        next.push({ ...node, name, parentId });
      }
      commitFiles(next);
      setSelectedId(nodes[0].id); setMobilePreview(true);
      if (parentId) setExpandedIds(current => new Set([...current, parentId]));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "上传失败，请重试。"); }
    finally { setUploading(false); if (uploadInput.current) uploadInput.current.value = ""; }
  };
  const beginDiscussion = (quote?: TaskFileTextSelection, saveFirst = false) => {
    if (!selected || !collaboration) return;
    if (isEditing && dirty && !saveFirst) { setPendingDiscussion({ quote }); setSelection(null); return; }
    const source = saveFirst ? save() : selected;
    if (!source) return;
    const thread: FileDiscussionThread = { id: crypto.randomUUID(), fileId: source.id, version: source.version ?? 1, quote: quote?.text ?? "", documentText: quote?.documentText ?? "", selectionStart: quote?.selectionStart, selectionEnd: quote?.selectionEnd, ...(quote?.pageIndex != null ? { pageIndex: quote.pageIndex } : {}), createdBy: collaboration.currentUserId, createdAt: new Date().toISOString() };
    setDraftThreads(current => ({ ...current, [selected.id]: quote ? thread : current[selected.id] ?? thread }));
    setDiscussionOpen(true); setSelection(null); setActiveThreadId(null); setEditingFileId(null); setPendingDiscussion(null);
    window.getSelection()?.removeAllRanges();
  };
  const locateThread = (id: string) => { setDiscussionOpen(true); setActiveThreadId(id); };
  const selectNode = (id: string, version?: number) => {
    setReferenceVersion(version);
    if (id !== selectedId) setEditingFileId(null);
    setSelectedId(id); setShowHistory(false); setSelection(null); setActiveThreadId(null); setPendingDiscussion(null); setError(loaded.error);
    if (files.find(node => node.id === id)?.kind === "file") setMobilePreview(true);
  };
  const changeContent = (content: TaskFileContent) => {
    if (!selected || !isEditing) return;
    const next = { ...drafts };
    if (JSON.stringify(content) === JSON.stringify(currentContent)) delete next[selected.id];
    else next[selected.id] = { content, baseVersion: currentDraft?.baseVersion ?? selected.version ?? 1 };
    updateDrafts(next); setSelection(null); setPendingDiscussion(null);
  };
  const save = (): TaskFileNode | null => {
    if (!selected || !isEditing) return null;
    if (!currentDraft || !dirty) { setEditingFileId(null); setSelection(null); return selected; }
    try {
      if (loadError) throw new Error(loadError);
      if (currentDraft.baseVersion !== (selected.version ?? 1)) throw new Error("文件版本已更新，草稿已保留。请先核对版本记录，不会覆盖新内容。");
      const record = createTaskFileRevision(selected, currentDraft.content, currentUser);
      if (!record) return selected;
      const nextRecord = { ...record, revisions: [...revisions, ...record.revisions] };
      saveTaskFileEdit(window.localStorage, taskId, nextRecord, selected.version ?? 1);
      setRecords(current => ({ ...current, [selected.id]: nextRecord }));
      const nextFiles = files.map(file => file.id === selected.id ? applyTaskFileEdit(file, nextRecord) : file);
      setFiles(nextFiles);
      const nextDrafts = { ...drafts }; delete nextDrafts[selected.id]; updateDrafts(nextDrafts);
      setError(""); setSelection(null); setEditingFileId(null);
      onSaved?.();
      try { onNodesChange?.(nextFiles); } catch (failure) { setError(ui("正文已保存，文件列表同步失败：{0}", {0: failure instanceof Error ? failure.message : "请重新打开文件。"})); return null; }
      return nextFiles.find(file => file.id === selected.id) ?? null;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "保存失败，草稿已保留，请重试。");
      return null;
    }
  };
  const discard = () => {
    if (!selected || !isEditing || (dirty && !window.confirm("放弃这个文件尚未保存的修改？已保存的版本不受影响。"))) return;
    const next = { ...drafts }; delete next[selected.id]; updateDrafts(next);
    setEditingFileId(null); setSelection(null); setPendingDiscussion(null); setError(loaded.error);
  };
  const visibleFiles = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return files;
    const matches = new Set(files.filter(node => node.name.toLocaleLowerCase().includes(needle)).flatMap(node => getNodePath(files, node.id).map(item => item.id)));
    return files.filter(node => matches.has(node.id));
  }, [files, query]);
  const openAction = (action: TaskFileAction) => {
    if (action.type === "restore-icon") { mutateFiles(restoreDefaultIcon(files, action.nodeId)); return; }
    setDialog({ type: action.type === "change-icon" ? "icon" : action.type, nodeId: action.nodeId });
  };
  const deleteNode = (nodeId: string, policy?: "move-contents" | "archive") => {
    const node = files.find(item => item.id === nodeId)!;
    const removed = node.kind === "folder" && policy === "archive" ? [nodeId, ...getDescendantIds(files, nodeId)] : [nodeId];
    const next = node.kind === "folder" ? deleteFolder(files, nodeId, policy ?? "move-contents") : deleteFile(files, nodeId);
    commitFiles(next); setUndo({ files, message: ui("已{0}“{1}”", {0: policy === "archive" ? d('archive') : d('delete'), 1: node.name}) });
    if (selectedId && removed.includes(selectedId)) { setSelectedId(node.parentId); setEditingFileId(null); setShowHistory(false); setSelection(null); }
  };
  const restoreDeleted = () => {
    if (!undo) return false;
    if (!mutateFiles(undo.files.map(file => {
      if (!Object.hasOwn(records, file.id) || loaded.fileErrors[file.id]) return file;
      try { return applyTaskFileEdit(file, records[file.id]); } catch { return file; }
    }))) return false;
    setUndo(null);
  };
  const undoToastId = useId();
  const restoreDeletedRef = useRef(restoreDeleted);
  restoreDeletedRef.current = restoreDeleted;
  useEffect(() => {
    if (!undo) return;
    toast.success(undo.message, {
      id: undoToastId,
      action: { label: "撤销", onClick: () => restoreDeletedRef.current() },
      onClose: () => setUndo(current => current === undo ? null : current),
    });
    return () => toast.dismiss(undoToastId);
  }, [undo, undoToastId]);
  const renameFile = (nodeId: string, name: string) => {
    const node = files.find(item => item.id === nodeId);
    if (node?.kind === "file" && getPreviewKind(node.name, node.mimeType) !== getPreviewKind(name, node.mimeType)) throw new Error("重命名不能转换文件格式，请保留原扩展名。");
    commitFiles(renameNode(files, nodeId, name));
  };
  const path = selected ? getNodePath(files, selected.id) : [];
  const folderChildren = selected?.kind === "folder" ? files.filter(node => node.parentId === selected.id && !node.archived) : [];

  return <div className="task-file-explorer" data-mobile-view={mobilePreview ? "preview" : "tree"} onDragOver={event => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDrop={event => { if (event.defaultPrevented || !event.dataTransfer.files.length) return; event.preventDefault(); void uploadFiles(Array.from(event.dataTransfer.files)); }} onKeyDown={event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); save(); }
    if (event.key === "Escape") setSelection(null);
  }}>
    <aside className="task-file-explorer-sidebar">
      <header><span><strong>{ui("任务文件")}</strong><small>{files.filter(node => node.kind === "file" && !node.archived).length}</small></span><div className="task-file-tree-actions"><button aria-label={ui("上传文件")} disabled={uploading} onClick={() => uploadInput.current?.click()} title={ui("上传文件")} type="button"><Upload size={15} /></button><button aria-label={d('newFolder')} onClick={() => setDialog({ type: "create", parentId: selected?.kind === "folder" ? selected.id : selected?.parentId ?? null })} type="button"><FolderPlus size={15} /></button></div><input aria-label={ui("选择上传文件")} hidden multiple onChange={event => void uploadFiles(Array.from(event.target.files ?? []))} ref={uploadInput} type="file" /></header>
      {uploading && <p className="task-file-upload-status" role="status">{ui("正在上传文件…")}</p>}
      <label className="task-file-explorer-search"><Search size={14} /><input onChange={event => setQuery(event.target.value)} placeholder={ui("搜索当前任务文件")} value={query} />{query && <button aria-label={ui("清除搜索")} onClick={() => setQuery("")} type="button"><X size={12} /></button>}</label>
      <div className="task-file-explorer-tree-scroll">{visibleFiles.length ? <TaskFileTree expandedIds={query ? new Set(visibleFiles.filter(node => node.kind === "folder").map(node => node.id)) : expandedIds} nodes={visibleFiles} onAction={openAction} onExpandedChange={setExpandedIds} onSelect={selectNode} selectedId={selectedId} /> : <div className="task-file-explorer-no-results">{ui("没有匹配的文件")}<button onClick={() => setQuery("")} type="button">{ui("清除搜索")}</button></div>}</div>
    </aside>
    <main aria-label={selected ? ui("文件编辑：{0}", {0: selected.name}) : ui("文件编辑")} className="task-file-explorer-preview" data-toolbar-compact={compactToolbar} id={selected ? `task-file-preview-${selected.id}` : undefined} ref={previewRef} tabIndex={-1}>
      {selected ? <>
        <div className="task-file-editor-toolbar">
          <button aria-label={ui("返回文件结构")} className="task-file-explorer-mobile-back" onClick={() => { setMobilePreview(false); setSelection(null); }} type="button"><ArrowLeft size={16} /></button>
          <div className="task-file-toolbar-context">
            <nav aria-label={d('fileLocation')} className="task-file-editor-path">{path.map((node, index) => <React.Fragment key={node.id}>{index > 0 && <span aria-hidden="true">/</span>}{node.kind === "folder" ? <button onClick={() => selectNode(node.id)} type="button">{mock.text(node.name)}</button> : <span aria-current="page" title={mock.text(node.name)}>{mock.text(node.name)}</span>}</React.Fragment>)}</nav>
          </div>
          <div className="task-file-editor-actions">
            <div className="task-file-editor-controls">
            {selected.kind === "file" && <>
              {isEditing && <span aria-live="polite" className="task-file-save-state">{dirty ? ui("未保存") : ui("编辑中")}</span>}
              {currentContent && !loadError && isEditing && <><Button className="task-file-action-button" onClick={discard} size="sm" variant="ghost">{d('cancel')}</Button><Button aria-label={ui("保存文件")} className="task-file-action-button task-file-save-button" onClick={save} size="sm" variant="default"><Save size={16} />{d('save')}</Button></>}
              {!isEditing && !compactToolbar && <>
                <Button aria-label={ui("查看版本记录")} className="task-file-action-button" onClick={() => { setShowHistory(true); setSelection(null); }} size="sm" variant="ghost"><History size={16} />{ui("版本")}</Button>
                {currentContent && !loadError && <Button aria-label={d('editFile')} className="task-file-action-button" onClick={() => { setEditingFileId(selected.id); setSelection(null); setError(""); }} size="sm" variant="ghost"><Pencil size={16} />{dirty ? ui("继续编辑") : d('edit')}</Button>}
              </>}
            </>}
            <DropdownMenu><DropdownMenuTrigger aria-label={ui("更多文件操作")} className="task-file-toolbar-more"><MoreHorizontal size={17} /></DropdownMenuTrigger><DropdownMenuContent align="end" className="task-file-toolbar-menu"><DropdownMenuGroup>
              {selected.kind === "file" && lastUpdate?.updatedAt.trim() && <DropdownMenuLabel aria-label={ui("最近更新")} className="task-file-menu-meta">
                {lastUpdate.author && <><PersonName name={lastUpdate.author} personId={lastUpdate.author} showProfilePreview={false} /><span>{ui("于")}</span></>}
                {lastUpdate.isExact ? <time dateTime={lastUpdate.updatedAt} title={new Date(lastUpdate.updatedAt).toLocaleString("zh-CN")}>{new Date(lastUpdate.updatedAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}</time> : <span>{lastUpdate.updatedAt}</span>}
                <span>{ui("更新")}</span>
              </DropdownMenuLabel>}
              {selected.kind === "file" && <>
                {collaboration && <DropdownMenuItem aria-label={ui("查看文件讨论")} onClick={() => { setDiscussionOpen(open => !open); setSelection(null); }}><MessageCircle size={14} />{discussionOpen ? ui("收起讨论") : ui("查看讨论")}<span className="task-file-menu-count">{fileThreads.length}</span></DropdownMenuItem>}
                {compactToolbar && <DropdownMenuItem aria-label={ui("查看版本记录")} onClick={() => { setShowHistory(true); setSelection(null); }}><History size={14} />{ui("查看版本")}</DropdownMenuItem>}
                {compactToolbar && currentContent && !loadError && !isEditing && <DropdownMenuItem aria-label={d('editFile')} onClick={() => { setEditingFileId(selected.id); setSelection(null); setError(""); }}><Pencil size={14} />{dirty ? ui("继续编辑") : d('edit')}</DropdownMenuItem>}
                <DropdownMenuSeparator />
              </>}
              <DropdownMenuItem onClick={() => setDialog({ type: "move", nodeId: selected.id })}><MoveRight size={14} />{ui("移动到")}</DropdownMenuItem>
            </DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
            </div>
          </div>
        </div>
        {(error || loadError) && <p className="task-file-save-error" role="alert">{error || loadError}</p>}
        {pendingDiscussion && <div className="task-file-comment-save-prompt" role="status"><span>{ui("正文有未保存的修改，保存后可围绕这一版内容评论。")}</span><Button onClick={() => beginDiscussion(pendingDiscussion.quote, true)} size="sm">{ui("保存文件并评论")}</Button><Button onClick={() => setPendingDiscussion(null)} size="sm" variant="ghost">{ui("取消评论")}</Button></div>}
        {selected.kind === "file" && referenceVersion != null && referenceVersion !== (selected.version ?? 1) && <p className="task-file-reference-version" role="status">{ui("附件引用 v")}{referenceVersion}{ui("；当前显示 v")}{selected.version ?? 1}{ui("。历史引用保持原版本，可在版本记录中核对修改。")}</p>}
        {selected.kind === "file" ? <div className="task-file-editor-body" data-discussion-open={Boolean(discussionOpen && collaboration)}>
          <div className="task-file-explorer-viewer" onScroll={() => setSelection(null)}><TaskFileViewer activeThreadId={activeThreadId} draft={isEditing ? currentDraft?.content ?? currentContent : currentContent} file={selected} key={selected.id} onChange={isEditing ? changeContent : undefined} onSelection={setSelection} onThreadSelect={locateThread} threads={fileThreads} /></div>
          {discussionOpen && collaboration && <FileDiscussionPanel activeThreadId={activeThreadId} collaboration={collaboration} draftThread={draftThread} file={selected} files={files} key={selected.id} onCancelDraft={() => setDiscussionOpen(false)} onClose={() => setDiscussionOpen(false)} onDraftSaved={id => { setDraftThreads(current => { const next = { ...current }; delete next[selected.id]; return next; }); setActiveThreadId(id); }} onLocate={locateThread} onNewThread={() => beginDiscussion()} onOpenFile={selectNode} taskId={taskId} />}
        </div> : <div className="task-file-folder-summary"><div><TaskFileNodeIcon expanded node={selected} /><strong>{selected.name}</strong><span>{folderChildren.length}{ui("个直接子项")}</span></div>{folderChildren.length ? <ul>{folderChildren.map(child => <li key={child.id}><button onClick={() => selectNode(child.id)} type="button"><TaskFileNodeIcon node={child} /><span>{child.name}</span><small>{child.kind === "file" ? `v${child.version ?? 1}` : ui("{0} 项", {0: files.filter(node => node.parentId === child.id && !node.archived).length})}</small></button></li>)}</ul> : <p>{ui("这个文件夹还是空的。可以在左侧创建子文件夹。")}</p>}</div>}
      </> : <div className="task-file-empty"><File size={30} /><strong>{ui("选择一个文件或文件夹")}</strong><span>{ui("从左侧浏览当前任务的文件结构。")}</span></div>}
    </main>
    {selection && selected && collaboration && <div aria-label={ui("选中文字操作")} className="task-file-selection-toolbar" role="toolbar" style={{ left: Math.max(12, Math.min(window.innerWidth - 156, selection.rect.left)), top: Math.max(12, Math.min(window.innerHeight - 60, selection.rect.bottom - 48)) }}><button onMouseDown={event => event.preventDefault()} onClick={() => beginDiscussion(selection)} title={ui("评论这段文字")} type="button"><MessageCircle size={17} />{ui("评论")}</button><button aria-label={ui("关闭选区操作")} onClick={() => setSelection(null)} type="button"><X size={14} /></button></div>}
    {selected?.kind === "file" && <Dialog onOpenChange={open => { setShowHistory(open); if (!open) setSelection(null); }} open={showHistory}><DialogContent className="task-file-history-dialog" showCloseButton={false}><DialogTitle className="sr-only">{ui("版本记录")}</DialogTitle><TaskFileHistory key={selected.id} onClose={() => setShowHistory(false)} revisions={revisions} version={selected.version ?? 1} /></DialogContent></Dialog>}
    <TaskFileDialogs dialog={dialog} nodes={files} onClose={() => setDialog(null)} onCreate={(parentId, name) => { const result = createFolder(files, parentId, name); commitFiles(result.nodes); setSelectedId(result.folder.id); setExpandedIds(current => new Set([...current, ...(parentId ? [parentId] : [])])); }} onDelete={deleteNode} onIcon={(nodeId, iconName) => commitFiles(setNodeIcon(files, nodeId, iconName))} onMove={(nodeId, parentId) => { commitFiles(moveNode(files, nodeId, parentId)); if (parentId) setExpandedIds(current => new Set([...current, parentId])); }} onRename={renameFile} />
  </div>;
}
