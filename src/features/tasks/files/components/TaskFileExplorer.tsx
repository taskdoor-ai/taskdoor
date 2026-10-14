import { SidebarResizeHandle, useSidebarWidth } from "@/features/tasks/components/SidebarResizeHandle";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatDisplayDateTime, formatLegacyDateLabel } from "@/shared/lib/date-time";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { ArrowLeft, ChevronRight, Download, FolderPlus, History, MessageCircle, MoreHorizontal, MoveRight, Pencil, Save, Search, Upload, X } from "lucide-react";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { readTaskDiagnosisFiles, type TaskDiagnosisFileSnapshot } from "@/features/tasks/files/lib/task-diagnosis-context";
import { applyTaskFileEdit, createTaskFileRevision, getTaskFileContent, getTaskFileLastUpdate, readTaskFileEdits, saveTaskFileEdit, type TaskFileContent, type TaskFileEditRecord } from "@/features/tasks/files/lib/task-file-editing";
import { getTaskFileDrafts, syncTaskFileDraftWarning, updateTaskFileDrafts, type TaskFileDraft } from "@/features/tasks/files/lib/task-file-drafts";
import { createFolder, deleteFile, deleteFolder, getDescendantIds, getNodePath, getPreviewKind, moveNode, renameNode } from "@/features/tasks/files/lib/task-file-tree";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Progress } from "@/shared/ui/progress";
import { Spinner } from "@/shared/ui/spinner";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { toast } from "@/shared/ui/toast";
import { PersonName } from "@/shared/ui/PersonAvatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { TaskFileDialogs, type TaskFileDialogState } from "@/features/tasks/files/components/TaskFileDialogs";
import { TaskFileHistory } from "@/features/tasks/files/components/TaskFileHistory";
import { type TaskFileAction, TaskFileTree } from "@/features/tasks/files/components/TaskFileTree";
import { TaskFileDirectory } from "@/features/tasks/files/components/TaskFileDirectory";
import { placeTaskFileUploads } from "@/features/tasks/files/lib/task-file-upload";
import { canDownload, downloadTaskFile, TaskFileViewer, type TaskFileTextSelection } from "@/features/tasks/files/components/TaskFileViewer";
import FullscreenButton from "@/features/tasks/files/components/FullscreenButton";
import { prepareDiscussionUpload, DISCUSSION_UPLOAD_MAX_FILES } from "@/features/tasks/files/lib/discussion-uploads";
import { getVisibleFileDiscussionThreads, type FileDiscussionThread } from "@/features/tasks/lib/task-collaboration";
import { FileDiscussionPanel, type FileDiscussionCollaboration } from "@/features/tasks/files/components/FileDiscussionPanel";

export function TaskFileExplorer({ files: initialFiles, focusedFileId, focusedVersion, focusedSequence, onFilesChange, onNodesChange, onSaved, taskId, currentUser, collaboration }: {
  files: TaskFileNode[]; focusedFileId?: string | null; focusedVersion?: number; focusedSequence?: number; taskId: string; currentUser: string;
  onSaved?: () => void;
  onNodesChange?: (files: TaskFileNode[]) => void;
  onFilesChange?: (snapshot: TaskDiagnosisFileSnapshot) => void;
  onSelectText?: (file: TaskFileNode, selection?: TaskFileTextSelection) => void;
  collaboration?: FileDiscussionCollaboration;
}) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const sidebar = useSidebarWidth("taskdoor-file-tree-width", 200, 180, 420);
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
  const filesRef = useRef(files);
  filesRef.current = files;
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
  const viewerRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const uploadLock = useRef(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadParentId, setUploadParentId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0, location: "" });
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
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
  const directoryId = selected?.kind === "folder" ? selected.id : selected?.parentId ?? null;
  const locationLabel = (parentId: string | null) => [ui("任务文件"), ...(parentId ? getNodePath(filesRef.current, parentId).map(node => mock.text(node.name)) : [])].join(" / ");
  const openUpload = () => { setUploadParentId(directoryId); setShowUpload(true); };

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
    filesRef.current = next;
    setFiles(next);
  };
  const mutateFiles = (next: TaskFileNode[]) => {
    try { commitFiles(next); setError(""); return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : "文件列表保存失败，请重试。"); return false; }
  };
  const uploadFiles = async (incoming: File[], parentId = directoryId) => {
    if (!incoming.length || uploadLock.current) return;
    setShowUpload(false); setDragging(false); dragDepth.current = 0;
    if (incoming.length > DISCUSSION_UPLOAD_MAX_FILES) { setError(ui("一次最多上传 {0} 个文件。", {0: DISCUSSION_UPLOAD_MAX_FILES})); if (uploadInput.current) uploadInput.current.value = ""; return; }
    uploadLock.current = true;
    setUploading(true); setError("");
    setUploadProgress({ completed: 0, total: incoming.length, location: locationLabel(parentId) });
    try {
      const results = await Promise.allSettled(incoming.map(async file => {
        const node = await prepareDiscussionUpload(file);
        setUploadProgress(current => ({ ...current, completed: current.completed + 1 }));
        return node;
      }));
      const failure = results.find(result => result.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
      const nodes = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
      commitFiles(placeTaskFileUploads(filesRef.current, nodes, parentId));
      setSelectedId(nodes[0].id); setMobilePreview(true);
      setEditingFileId(null); setShowHistory(false); setSelection(null); setReferenceVersion(undefined);
      if (parentId) setExpandedIds(current => new Set([...current, parentId]));
      toast.success(ui("已上传 {0} 个文件", {0: nodes.length}));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "上传失败，请重试。"); }
    finally { uploadLock.current = false; setUploading(false); if (uploadInput.current) uploadInput.current.value = ""; }
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
  const selectNode = (id: string | null, version?: number) => {
    setReferenceVersion(version);
    if (id !== selectedId) setEditingFileId(null);
    setSelectedId(id); setShowHistory(false); setSelection(null); setActiveThreadId(null); setPendingDiscussion(null); setError(loaded.error);
    setMobilePreview(true);
    if (id) setExpandedIds(current => new Set([...current, ...getNodePath(files, id).filter(node => node.kind === "folder").map(node => node.id)]));
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
    setDialog({ type: action.type, nodeId: action.nodeId });
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
  return <div className="task-file-explorer" style={sidebar.style} data-mobile-view={mobilePreview ? "preview" : "tree"} onDragEnter={event => {
    if (showUpload || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault(); dragDepth.current += 1; setDragging(true);
  }} onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }} onDragOver={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = uploading ? "none" : "copy"; } }} onDrop={event => {
    setDragging(false); dragDepth.current = 0;
    if (event.defaultPrevented || !event.dataTransfer.files.length) return;
    event.preventDefault(); void uploadFiles(Array.from(event.dataTransfer.files));
  }} onKeyDown={event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); save(); }
    if (event.key === "Escape") setSelection(null);
  }}>
    <aside className="task-file-explorer-sidebar">
      <div className="flex min-h-[54px] shrink-0 items-center justify-between gap-1 px-2"><Button className="min-w-0 justify-start gap-1" onClick={() => selectNode(null)} title={ui("查看全部任务文件")} variant="ghost">{ui("任务文件")}<Badge variant="secondary">{files.filter(node => node.kind === "file" && !node.archived).length}</Badge></Button><div className="flex shrink-0"><Button aria-label={ui("上传文件")} disabled={uploading} onClick={openUpload} size="icon-sm" title={ui("上传文件")} variant="ghost"><Upload /></Button><Button aria-label={d('newFolder')} onClick={() => setDialog({ type: "create", parentId: directoryId })} size="icon-sm" title={d('newFolder')} variant="ghost"><FolderPlus /></Button></div><input aria-label={ui("选择上传文件")} hidden multiple onChange={event => void uploadFiles(Array.from(event.target.files ?? []), uploadParentId)} ref={uploadInput} type="file" /></div>
      <div className="flex shrink-0 items-center gap-1 px-3 pb-3"><Input aria-label={ui("搜索当前任务文件")} className="task-file-search-input" leadingIcon={<Search />} onChange={event => setQuery(event.target.value)} placeholder={ui("搜索当前任务文件")} value={query} />{query && <Button aria-label={ui("清除搜索")} onClick={() => setQuery("")} size="icon-xs" variant="ghost"><X /></Button>}</div>
      <div className="task-file-explorer-tree-scroll">{visibleFiles.some(node => !node.archived) ? <TaskFileTree expandedIds={query ? new Set(visibleFiles.filter(node => node.kind === "folder").map(node => node.id)) : expandedIds} nodes={visibleFiles} onAction={openAction} onExpandedChange={setExpandedIds} onSelect={selectNode} selectedId={selectedId} /> : <div className="task-file-explorer-no-results">{query ? ui("没有匹配的文件") : ui("暂无文件")}{query ? <button onClick={() => setQuery("")} type="button">{ui("清除搜索")}</button> : <button disabled={uploading} onClick={openUpload} type="button">{ui("上传文件")}</button>}</div>}</div>
      <SidebarResizeHandle kind="files" width={sidebar.width} onChange={sidebar.change} min={180} max={420} />
    </aside>
    <main aria-label={selected ? ui("文件编辑：{0}", {0: selected.name}) : ui("任务文件列表")} className="task-file-explorer-preview" data-toolbar-compact={compactToolbar} id={selected ? `task-file-preview-${selected.id}` : undefined} ref={previewRef} tabIndex={-1}>
        <div className="task-file-editor-toolbar">
          <button aria-label={ui("返回文件结构")} className="task-file-explorer-mobile-back" onClick={() => { setMobilePreview(false); setSelection(null); }} type="button"><ArrowLeft size={16} /></button>
          <div className="task-file-toolbar-context">
            <nav aria-label={d('fileLocation')} className="task-file-editor-path"><button aria-current={!selected ? "page" : undefined} onClick={() => selectNode(null)} type="button">{ui("任务文件")}</button>{path.map((node, index) => <React.Fragment key={node.id}><ChevronRight aria-hidden="true" size={12} />{node.kind === "folder" && index < path.length - 1 ? <button onClick={() => selectNode(node.id)} title={mock.text(node.name)} type="button">{mock.text(node.name)}</button> : <span aria-current="page" title={mock.text(node.name)}>{mock.text(node.name)}</span>}</React.Fragment>)}</nav>
          </div>
          <div className="task-file-editor-actions">
            <div className="task-file-editor-controls">
            {selected?.kind === "file" && <>
              {!isEditing && <Badge title={ui("当前 v{0}", {0: selected.version ?? 1})} variant="outline">v{selected.version ?? 1}</Badge>}
              {isEditing && <span aria-live="polite" className="task-file-save-state">{dirty ? ui("未保存") : ui("编辑中")}</span>}
              {currentContent && !loadError && isEditing && <><Button className="task-file-action-button" onClick={discard} size="sm" variant="ghost">{d('cancel')}</Button><Button aria-label={ui("保存文件")} className="task-file-action-button task-file-save-button" onClick={save} size="sm" variant="default"><Save size={16} />{d('save')}</Button></>}
              {!isEditing && !loadError && <FullscreenButton kind={getPreviewKind(selected.name, selected.mimeType)} onSelection={setSelection} target={viewerRef} />}
              {!isEditing && !compactToolbar && <>
                <Button aria-label={ui("查看版本记录")} className="task-file-action-button" onClick={() => { setShowHistory(true); setSelection(null); }} size="sm" variant="ghost"><History size={16} />{ui("版本")}</Button>
                {currentContent && !loadError && <Button aria-label={d('editFile')} className="task-file-action-button" onClick={() => { setEditingFileId(selected.id); setSelection(null); setError(""); }} size="sm" variant="ghost"><Pencil size={16} />{dirty ? ui("继续编辑") : d('edit')}</Button>}
              </>}
            </>}
            {selected && <DropdownMenu><DropdownMenuTrigger aria-label={ui("更多文件操作")} className="task-file-toolbar-more"><MoreHorizontal size={17} /></DropdownMenuTrigger><DropdownMenuContent align="end" className="task-file-toolbar-menu"><DropdownMenuGroup>
              {selected.kind === "file" && lastUpdate?.updatedAt.trim() && <DropdownMenuLabel aria-label={ui("最近更新")} className="task-file-menu-meta">
                {lastUpdate.author && <><PersonName name={lastUpdate.author} personId={lastUpdate.author} showProfilePreview={false} /><span>{ui("于")}</span></>}
                {lastUpdate.isExact ? <time dateTime={lastUpdate.updatedAt} title={formatDisplayDateTime(lastUpdate.updatedAt, { year: "always" }) ?? undefined}>{formatDisplayDateTime(lastUpdate.updatedAt) ?? "—"}</time> : <span>{formatLegacyDateLabel(lastUpdate.updatedAt, locale)}</span>}
                <span>{ui("更新")}</span>
              </DropdownMenuLabel>}
              {selected.kind === "file" && <>
                {collaboration && <DropdownMenuItem aria-label={ui("查看文件讨论")} onClick={() => { setDiscussionOpen(open => !open); setSelection(null); }}><MessageCircle size={14} />{discussionOpen ? ui("收起讨论") : ui("查看讨论")}<span className="task-file-menu-count">{fileThreads.length}</span></DropdownMenuItem>}
                {compactToolbar && <DropdownMenuItem aria-label={ui("查看版本记录")} onClick={() => { setShowHistory(true); setSelection(null); }}><History size={14} />{ui("查看版本")}</DropdownMenuItem>}
                {compactToolbar && currentContent && !loadError && !isEditing && <DropdownMenuItem aria-label={d('editFile')} onClick={() => { setEditingFileId(selected.id); setSelection(null); setError(""); }}><Pencil size={14} />{dirty ? ui("继续编辑") : d('edit')}</DropdownMenuItem>}
                <DropdownMenuSeparator />
              </>}
              {selected.kind === "file" && canDownload(selected) && <DropdownMenuItem onClick={async () => setError(ui(await downloadTaskFile(selected)))}><Download size={14} />{ui("下载")}</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => setDialog({ type: "move", nodeId: selected.id })}><MoveRight size={14} />{ui("移动到")}</DropdownMenuItem>
            </DropdownMenuGroup></DropdownMenuContent></DropdownMenu>}
            </div>
          </div>
        </div>
        {uploading && <div className="flex shrink-0 items-center gap-3 p-4" role="status"><Spinner aria-hidden="true" className="motion-reduce:animate-none" /><span className="flex min-w-0 flex-1 flex-col gap-1"><strong className="text-sm font-medium">{ui("正在上传 {0}/{1} 个文件", {0: uploadProgress.completed, 1: uploadProgress.total})}</strong><small className="truncate text-muted-foreground">{uploadProgress.location}</small></span><Progress aria-label={ui("上传进度")} className="w-20" max={uploadProgress.total} value={uploadProgress.completed} /></div>}
        {(error || loadError) && <p className="task-file-save-error" role="alert">{error || loadError}</p>}
        {pendingDiscussion && <div className="task-file-comment-save-prompt" role="status"><span>{ui("正文有未保存的修改，保存后可围绕这一版内容评论。")}</span><Button onClick={() => beginDiscussion(pendingDiscussion.quote, true)} size="sm">{ui("保存文件并评论")}</Button><Button onClick={() => setPendingDiscussion(null)} size="sm" variant="ghost">{ui("取消评论")}</Button></div>}
        {selected?.kind === "file" && referenceVersion != null && referenceVersion !== (selected.version ?? 1) && <p className="task-file-reference-version" role="status">{ui("附件引用 v")}{referenceVersion}{ui("；当前显示 v")}{selected.version ?? 1}{ui("。历史引用保持原版本，可在版本记录中核对修改。")}</p>}
        {selected?.kind === "file" ? <div className="task-file-editor-body" data-discussion-open={Boolean(discussionOpen && collaboration)}>
          <div className="task-file-explorer-viewer" onScroll={() => setSelection(null)} ref={viewerRef}><TaskFileViewer activeThreadId={activeThreadId} draft={isEditing ? currentDraft?.content ?? currentContent : currentContent} file={selected} key={selected.id} onChange={isEditing ? changeContent : undefined} onSelection={setSelection} onThreadSelect={locateThread} threads={fileThreads} /></div>
          {discussionOpen && collaboration && <FileDiscussionPanel activeThreadId={activeThreadId} collaboration={collaboration} draftThread={draftThread} file={selected} files={files} key={selected.id} onCancelDraft={() => setDiscussionOpen(false)} onClose={() => setDiscussionOpen(false)} onDraftSaved={id => { setDraftThreads(current => { const next = { ...current }; delete next[selected.id]; return next; }); setActiveThreadId(id); }} onLocate={locateThread} onNewThread={() => beginDiscussion()} onOpenFile={selectNode} taskId={taskId} />}
        </div> : <TaskFileDirectory displayName={name => mock.text(name)} files={files} folder={selected} onAction={openAction} onCreate={() => setDialog({type: "create", parentId: directoryId})} onSelect={selectNode} onUpload={openUpload} records={records} uploading={uploading} />}
    </main>
    {dragging && !showUpload && <div className="task-file-drop-overlay"><Upload size={30} /><strong>{uploading ? ui("正在上传文件…") : ui("松开以上传文件")}</strong><span>{locationLabel(directoryId)}</span></div>}
    <Dialog onOpenChange={setShowUpload} open={showUpload}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{ui("上传文件")}</DialogTitle><DialogDescription>{ui("上传到：{0}", {0: locationLabel(uploadParentId)})}</DialogDescription></DialogHeader><Empty className="task-file-upload-dropzone border" onDragOver={event => { event.preventDefault(); event.currentTarget.dataset.dragging = "true"; }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) delete event.currentTarget.dataset.dragging; }} onDrop={event => { event.preventDefault(); event.stopPropagation(); delete event.currentTarget.dataset.dragging; void uploadFiles(Array.from(event.dataTransfer.files), uploadParentId); }}><EmptyHeader><EmptyMedia variant="icon"><Upload /></EmptyMedia><EmptyTitle>{ui("拖入文件，或选择上传")}</EmptyTitle><EmptyDescription>{ui("每次最多 {0} 个文件，单个不超过 20 MiB", {0: DISCUSSION_UPLOAD_MAX_FILES})}</EmptyDescription></EmptyHeader><EmptyContent><Button onClick={() => uploadInput.current?.click()} variant="outline">{ui("选择文件")}</Button></EmptyContent></Empty></DialogContent></Dialog>
    {selection && selected && collaboration && <div aria-label={ui("选中文字操作")} className="task-file-selection-toolbar" role="toolbar" style={{ left: Math.max(12, Math.min(window.innerWidth - 156, selection.rect.left)), top: Math.max(12, Math.min(window.innerHeight - 60, selection.rect.bottom - 48)) }}><button onMouseDown={event => event.preventDefault()} onClick={() => beginDiscussion(selection)} title={ui("评论这段文字")} type="button"><MessageCircle size={17} />{ui("评论")}</button><button aria-label={ui("关闭选区操作")} onClick={() => setSelection(null)} type="button"><X size={14} /></button></div>}
    {selected?.kind === "file" && <Dialog onOpenChange={open => { setShowHistory(open); if (!open) setSelection(null); }} open={showHistory}><DialogContent className="task-file-revisions-dialog gap-0 p-0" showCloseButton={false}><DialogTitle className="sr-only">{ui("版本记录")}</DialogTitle><TaskFileHistory filePath={path.map(node => mock.text(node.name)).join(" / ")} key={selected.id} onClose={() => setShowHistory(false)} revisions={revisions} version={selected.version ?? 1} /></DialogContent></Dialog>}
    <TaskFileDialogs dialog={dialog} nodes={files} onClose={() => setDialog(null)} onCreate={(parentId, name) => { const result = createFolder(files, parentId, name); commitFiles(result.nodes); setSelectedId(result.folder.id); setExpandedIds(current => new Set([...current, ...(parentId ? [parentId] : [])])); }} onDelete={deleteNode} onMove={(nodeId, parentId) => { commitFiles(moveNode(files, nodeId, parentId)); if (parentId) setExpandedIds(current => new Set([...current, parentId])); }} onRename={renameFile} />
  </div>;
}
