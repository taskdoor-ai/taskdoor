import { downloadFileAnnotationBundle } from "@/features/tasks/files/lib/task-file-annotation-bundle";
import { useTeamTimeZone } from "@/shared/lib/useTeamTimeZone";
import { SidebarResizeHandle } from "@/features/tasks/components/SidebarResizeHandle";
import { useFileSidebar } from "@/features/tasks/files/lib/useFileSidebar";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatDisplayDateTime, formatLegacyDateLabel } from "@/shared/lib/date-time";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { ArrowLeft, ChevronRight, Download, Eye, EyeOff, FolderOpen, FolderPlus, GripVertical, SquareDashedMousePointer, History, MessageCircle, MoreHorizontal, MoveRight, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Save, Search, Upload, X } from "lucide-react";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TaskFileNode } from "@/shared/model/task-model";
import { readTaskDiagnosisFiles, type TaskDiagnosisFileSnapshot } from "@/features/tasks/files/lib/task-diagnosis-context";
import { applyTaskFileEdit, createTaskFileRevision, getTaskFileContent, getTaskFileLastUpdate, readTaskFileEdits, saveTaskFileEdit, type TaskFileContent, type TaskFileEditRecord } from "@/features/tasks/files/lib/task-file-editing";
import { getTaskFileDrafts, syncTaskFileDraftWarning, updateTaskFileDrafts, type TaskFileDraft } from "@/features/tasks/files/lib/task-file-drafts";
import { createFolder, deleteFile, deleteFolder, getDescendantIds, getNodePath, getPreviewKind, getTaskFilePreviewId, moveNode, renameNode } from "@/features/tasks/files/lib/task-file-tree";
import { Button } from "@/shared/ui/button";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { PopoverTrigger } from "@/shared/ui/popover";
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
import { placeTaskFileUploads } from "@/features/tasks/files/lib/task-file-upload";
import { canDownload, downloadTaskFile, TaskFileViewer, type TaskFileTextSelection } from "@/features/tasks/files/components/TaskFileViewer";
import FullscreenButton from "@/features/tasks/files/components/FullscreenButton";
import { prepareDiscussionUpload, DISCUSSION_UPLOAD_MAX_FILES } from "@/features/tasks/files/lib/discussion-uploads";
import { canEditTaskFile, isSupportedTaskFileUpload, TASK_FILE_UPLOAD_ACCEPT, TASK_FILE_UPLOAD_EXTENSIONS_LABEL, validateTaskFileUploads } from "@/features/tasks/files/lib/task-file-capabilities";
import { type DiscussionDraft, type FileDiscussionThread } from "@/features/tasks/lib/task-collaboration";
import { useTaskFileAnnotations, type FileAnnotationExitController } from "@/features/tasks/files/lib/useTaskFileAnnotations";
import { buildFileAnnotationContext, createTaskFileAnnotation, deleteTaskFileAnnotation, getTaskFileSelectionAnchor, updateTaskFileAnnotationBody, type TaskFileAnnotation } from "@/features/tasks/files/lib/task-file-annotations";
import { TaskFileAnnotationBasket, TaskFileAnnotationComposer, type FileAnnotationDraft } from "@/features/tasks/files/components/TaskFileAnnotationDialogs";
import { createFileAnnotationDiscussionDraft } from "@/features/tasks/files/lib/task-file-annotation-document";
import { generateAnnotationTitles } from "@/features/tasks/files/lib/task-file-annotation-titles";
import { AiConnectionButton } from "@/features/ai-connection/components/AiConnectionButton";
import { AiConnectionDialog, launchAiContext, type AiConnectionRequest } from "@/features/ai-connection/components/AiConnectionDialog";
import { useAnnotationToolbarDrag } from "@/features/tasks/files/lib/useAnnotationToolbarDrag";
import { useAnnotationFullscreenContainer } from "@/features/tasks/files/lib/useAnnotationFullscreenContainer";
import "@/features/tasks/styles/task-file-annotations.css";

export function TaskFileExplorer({ files: initialFiles, focusedFileId, focusedVersion, focusedSequence, onFilesChange, onNodesChange, onSaved, onAnnotationExitControllerChange, taskId, taskTitle = taskId, taskGoal, currentUser, currentUserId, onStartDiscussion }: {
  files: TaskFileNode[]; focusedFileId?: string | null; focusedVersion?: number; focusedSequence?: number; taskId: string; currentUser: string;
  taskTitle?: string; taskGoal?: string;
  onSaved?: () => void;
  onAnnotationExitControllerChange?: (controller: FileAnnotationExitController | null) => void;
  onNodesChange?: (files: TaskFileNode[]) => void;
  onFilesChange?: (snapshot: TaskDiagnosisFileSnapshot) => void;
  onSelectText?: (file: TaskFileNode, selection?: TaskFileTextSelection) => void;
  currentUserId?: string;
  onStartDiscussion?: (draft: DiscussionDraft, onPublished: (published: DiscussionDraft) => void) => void;
}) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const timeZone = useTeamTimeZone();
  const sidebar = useFileSidebar();
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
  const [referenceVersion, setReferenceVersion] = useState(focusedVersion);
  const [selectedId, setSelectedId] = useState<string | null>(() => getTaskFilePreviewId(loaded.files, focusedFileId));
  const [expandedIds, setExpandedIds] = useState(() => new Set(initialFiles.filter(node => node.kind === "folder").map(node => node.id)));
  const [dialog, setDialog] = useState<TaskFileDialogState>(null);
  const [query, setQuery] = useState("");
  const [mobilePreview, setMobilePreview] = useState(Boolean(focusedFileId));
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
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [annotationFocusSequence, setAnnotationFocusSequence] = useState(0);
  const actorId = currentUserId ?? currentUser;
  const review = useTaskFileAnnotations(taskId, actorId, files);
  const [annotationMode, setAnnotationMode] = useState(false);
  const toolbarDrag = useAnnotationToolbarDrag(annotationMode);
  const fullscreenContainer = useAnnotationFullscreenContainer();
  const renderAnnotationOverlay = (children: React.ReactNode) => children && fullscreenContainer ? createPortal(children, fullscreenContainer) : children;
  const [annotationDraft, setAnnotationDraft] = useState<FileAnnotationDraft | null>(null);
  const [annotationSource, setAnnotationSource] = useState<TaskFileNode | null>(null);
  const [basketOpen, setBasketOpen] = useState(false);
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const [aiRequest, setAiRequest] = useState<AiConnectionRequest | null>(null);
  const aiTrigger = useRef<HTMLElement | null>(null);
  const aiRequestSignature = useRef("");
  const [deliveredSignature, setDeliveredSignature] = useState("[]");
  const [pendingAnnotationEdit, setPendingAnnotationEdit] = useState(false);
  const [annotationExporting, setAnnotationExporting] = useState(false);
  const [preparingAnnotationMaterial, setPreparingAnnotationMaterial] = useState(false);
  const annotationPreparation = useRef<AbortController | null>(null);
  const preparedAnnotationMaterial = useRef<{ key: string; draft: DiscussionDraft } | null>(null);
  const [basketPopoverHandle] = useState(() => PopoverPrimitive.createHandle());
  const basketTriggerId = useId();
  const basketTriggerRef = useRef<HTMLButtonElement | null>(null);
  const selected = files.find(node => node.id === selectedId && node.kind === "file" && !node.archived) ?? null;
  const viewerFile = annotationSource?.id === selectedId ? annotationSource : selected;
  const ownAnnotations = useMemo(() => review.annotations.filter(item => item.authorId === actorId), [review.annotations, actorId]);
  const visibleAnnotationIds = ownAnnotations.map(item => item.id);
  const annotationSignature = JSON.stringify(ownAnnotations);
  const pendingAnnotationInput = Boolean(annotationDraft?.body.trim() || pendingAnnotationEdit);
  const annotationExit = useRef({ pending: false, discard: () => {} });
  annotationExit.current = { pending: pendingAnnotationInput || (ownAnnotations.length > 0 && annotationSignature !== deliveredSignature), discard: () => {
    annotationPreparation.current?.abort(); preparedAnnotationMaterial.current = null;
    review.discard(); setAnnotationDraft(null); setAnnotationMode(false); setBasketOpen(false); setPendingAnnotationEdit(false); setAnnotationSource(null); setDeliveredSignature("[]");
    setActiveThreadId(null); setSelection(null); setAnnotationsVisible(true); setAiRequest(null); aiRequestSignature.current = "";
    toolbarDrag.reset();
    window.getSelection()?.removeAllRanges();
  } };
  useEffect(() => {
    const controller = { hasUnsavedChanges: () => annotationExit.current.pending, discard: () => annotationExit.current.discard() };
    onAnnotationExitControllerChange?.(controller);
    const warn = (event: BeforeUnloadEvent) => { if (annotationExit.current.pending) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("beforeunload", warn); onAnnotationExitControllerChange?.(null); };
  }, [taskId, actorId, onAnnotationExitControllerChange]);
  const annotationContext = useMemo(() => {
    if (!ownAnnotations.length) return { value: null, error: "" };
    try { return { value: buildFileAnnotationContext({ taskId, taskTitle, taskGoal, annotations: ownAnnotations, selectedIds: ownAnnotations.map(item => item.id), files, locale }), error: "" }; }
    catch (failure) { return { value: null, error: failure instanceof Error ? failure.message : "标注内容暂不可用。" }; }
  }, [ownAnnotations, files, taskId, taskTitle, taskGoal, locale]);
  const annotationMaterial = useMemo(() => {
    if (!annotationContext.value) return { draft: null, error: annotationContext.error };
    try { return { draft: createFileAnnotationDiscussionDraft(annotationContext.value, { taskTitle, authorName: currentUser, locale, timeZone }), error: "" }; }
    catch (failure) { return { draft: null, error: failure instanceof Error ? failure.message : "标注文件暂时无法准备，意见仍保留。" }; }
  }, [annotationContext, taskTitle, currentUser, locale, timeZone]);
  const annotationMaterialKey = JSON.stringify([taskId, annotationSignature, taskTitle, currentUser, locale, timeZone, pendingAnnotationInput, annotationContext.error]);
  const latestAnnotationMaterialKey = useRef(annotationMaterialKey);
  latestAnnotationMaterialKey.current = annotationMaterialKey;
  useEffect(() => () => { annotationPreparation.current?.abort(); }, [annotationMaterialKey]);
  const prepareAnnotationMaterial = async (signal?: AbortSignal): Promise<DiscussionDraft | null> => {
    if (!annotationContext.value || pendingAnnotationInput || signal?.aborted) return null;
    const key = annotationMaterialKey;
    if (preparedAnnotationMaterial.current?.key === key) return preparedAnnotationMaterial.current.draft;
    if (annotationPreparation.current) return null;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    annotationPreparation.current = controller; setPreparingAnnotationMaterial(true); setError("");
    try {
      const titles = await generateAnnotationTitles(annotationContext.value.items, locale, controller.signal);
      if (controller.signal.aborted || latestAnnotationMaterialKey.current !== key) return null;
      const draft = createFileAnnotationDiscussionDraft(annotationContext.value, { taskTitle, authorName: currentUser, locale, timeZone, titles });
      preparedAnnotationMaterial.current = { key, draft };
      return draft;
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : locale === "en" ? "Could not prepare annotation titles. Try again." : "标题生成失败，标注仍保留，请重试。");
      return null;
    } finally {
      signal?.removeEventListener("abort", cancel);
      if (annotationPreparation.current === controller) { annotationPreparation.current = null; setPreparingAnnotationMaterial(false); }
    }
  };
  const currentAnnotations = useMemo(() => ownAnnotations.filter(item => item.fileId === selectedId), [ownAnnotations, selectedId]);
  const currentContent = selected ? getTaskFileContent(selected) : null;
  const loadError = loaded.error || (selected ? loaded.fileErrors[selected.id] : "");
  const currentDraft = selected ? drafts[selected.id] : undefined;
  const dirty = Boolean(currentDraft && JSON.stringify(currentDraft.content) !== JSON.stringify(currentContent));
  const revisions = selected ? records[selected.id]?.revisions ?? [] : [];
  const editable = Boolean(selected && canEditTaskFile(selected));
  const isEditing = Boolean(editable && selected && editingFileId === selected.id && currentContent && !loadError);
  const lastUpdate = selected ? getTaskFileLastUpdate(selected, loadError ? [] : revisions) : null;
  const directoryId = selected?.parentId ?? null;
  const locationLabel = (parentId: string | null) => [ui("任务文件"), ...(parentId ? getNodePath(filesRef.current, parentId).map(node => mock.text(node.name)) : [])].join(" / ");
  const openUpload = () => { setUploadParentId(directoryId); setShowUpload(true); };
  const text = (zh: string, en: string) => locale === "en" ? en : zh;
  const beginAnnotation = (quote?: TaskFileTextSelection) => {
    if (!selected || selected.kind !== "file") return;
    if (annotationDraft?.body.trim()) { setError(text("当前标注尚未添加，请先添加或取消，意见输入仍保留。", "Save or cancel the current annotation first. Your feedback is retained.")); return; }
    if (isEditing || (annotationSource && annotationSource.version !== selected.version)) { setError(text("请先打开当前已保存版本，再新增标注。", "Open the current saved version before adding an annotation.")); return; }
    const targetRect = viewerRef.current?.getBoundingClientRect();
    const position = { left: quote?.rect.left ?? targetRect?.left ?? 16, top: quote?.rect.bottom ?? (targetRect?.top ?? 16) };
    const captureId = crypto.randomUUID();
    setAnnotationDraft({ file: structuredClone(selected), body: "", position, captureId, capturePending: Boolean(quote?.screenshotPromise), anchor: quote ? getTaskFileSelectionAnchor(quote) : { kind: "file", location: text("整份文件", "Whole file") } });
    if (quote?.screenshotPromise) void quote.screenshotPromise.then(screenshot => setAnnotationDraft(current => current?.captureId === captureId ? { ...current, capturePending: false, anchor: { ...current.anchor, screenshot } } : current));
    setSelection(null); window.getSelection()?.removeAllRanges();
  };
  const locateAnnotation = (item: TaskFileAnnotation) => {
    const source = files.find(file => file.id === item.fileId && !file.archived);
    if (!source) { setError(text("源文件已不可用，原标注意见仍保留。", "The source file is unavailable. The original feedback is retained.")); return; }
    selectNode(item.fileId);
    setAnnotationSource(item.source); setActiveThreadId(item.id); setAnnotationMode(true); setAnnotationsVisible(true);
    setAnnotationFocusSequence(current => current + 1);
    window.setTimeout(() => { document.getElementById(`file-annotation-${item.id}`)?.scrollIntoView({ block: "nearest" }); viewerRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "center" }); }, 80);
  };
  const annotationThreads = useMemo<FileDiscussionThread[]>(() => currentAnnotations.filter(item => item.anchor.kind === "text").map(item => ({
    id: item.id, fileId: item.fileId, version: item.version, quote: item.anchor.quote ?? "", documentText: item.anchor.documentText ?? "",
    selectionStart: item.anchor.selectionStart, selectionEnd: item.anchor.selectionEnd, pageIndex: item.anchor.pageIndex, createdBy: item.authorId, createdAt: item.createdAt,
  })), [currentAnnotations]);
  const previewThreads = annotationsVisible ? annotationThreads : [];

  useEffect(() => {
    setFiles(initialFiles.map(file => {
      const record = records[file.id];
      if (!record || record.version < (file.version ?? 1) || loaded.fileErrors[file.id]) return file;
      try { return applyTaskFileEdit(file, record); } catch { return file; }
    }));
  }, [initialFiles]);
  useEffect(() => {
    if (!focusedFileId || !files.some(node => node.id === focusedFileId && node.kind === "file" && !node.archived)) return;
    setReferenceVersion(focusedVersion);
    setSelectedId(focusedFileId); setEditingFileId(null); setShowHistory(false); setMobilePreview(true); setSelection(null); setAnnotationSource(null); setAnnotationMode(false);
    const path = getNodePath(files, focusedFileId);
    setExpandedIds(current => new Set([...current, ...path.filter(node => node.kind === "folder").map(node => node.id)]));
  }, [focusedFileId, focusedVersion, focusedSequence]);
  useEffect(() => { setSelectedId(current => getTaskFilePreviewId(files, current)); }, [files]);
  useEffect(() => { syncTaskFileDraftWarning(); }, []);
  useEffect(() => {
    const detailScrollRoot = previewRef.current?.closest(".task-detail-split");
    if (!detailScrollRoot) return;
    const clearSelection = () => setSelection(null);
    detailScrollRoot.addEventListener("scroll", clearSelection, { passive: true });
    return () => detailScrollRoot.removeEventListener("scroll", clearSelection);
  }, [taskId]);
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
    try { validateTaskFileUploads(incoming); }
    catch (failure) { setError(failure instanceof Error ? failure.message : ui("上传失败，请重试。")); if (uploadInput.current) uploadInput.current.value = ""; return; }
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
  const locateThread = (id: string) => {
    const annotation = review.annotations.find(item => item.id === id);
    if (annotation) { locateAnnotation(annotation); setBasketOpen(true); }
  };
  const selectNode = (id: string, version?: number) => {
    if (!files.some(node => node.id === id && node.kind === "file" && !node.archived)) return;
    setReferenceVersion(version);
    setAnnotationSource(null); setAnnotationMode(false);
    if (id !== selectedId) setEditingFileId(null);
    setSelectedId(id); setShowHistory(false); setSelection(null); setActiveThreadId(null); setError(loaded.error);
    setMobilePreview(true);
    if (id) setExpandedIds(current => new Set([...current, ...getNodePath(files, id).filter(node => node.kind === "folder").map(node => node.id)]));
  };
  const changeContent = (content: TaskFileContent) => {
    if (!selected || !isEditing) return;
    const next = { ...drafts };
    if (JSON.stringify(content) === JSON.stringify(currentContent)) delete next[selected.id];
    else next[selected.id] = { content, baseVersion: currentDraft?.baseVersion ?? selected.version ?? 1 };
    updateDrafts(next); setSelection(null);
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
    setEditingFileId(null); setSelection(null); setError(loaded.error);
  };
  const visibleFiles = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return files;
    const matches = new Set(files.filter(node => node.name.toLocaleLowerCase().includes(needle)).flatMap(node => getNodePath(files, node.id).map(item => item.id)));
    return files.filter(node => matches.has(node.id));
  }, [files, query]);
  useEffect(() => {
    if (!query.trim()) return;
    setExpandedIds(current => new Set([...current, ...visibleFiles.filter(node => node.kind === "folder").map(node => node.id)]));
  }, [query, visibleFiles]);
  const openAction = (action: TaskFileAction) => {
    setDialog({ type: action.type, nodeId: action.nodeId });
  };
  const deleteNode = (nodeId: string, policy?: "move-contents" | "archive") => {
    const node = files.find(item => item.id === nodeId)!;
    const removed = node.kind === "folder" && policy === "archive" ? [nodeId, ...getDescendantIds(files, nodeId)] : [nodeId];
    const next = node.kind === "folder" ? deleteFolder(files, nodeId, policy ?? "move-contents") : deleteFile(files, nodeId);
    commitFiles(next); setUndo({ files, message: ui("已{0}“{1}”", {0: policy === "archive" ? d('archive') : d('delete'), 1: node.name}) });
    if (selectedId && removed.includes(selectedId)) { setSelectedId(getTaskFilePreviewId(next)); setEditingFileId(null); setShowHistory(false); setSelection(null); setReferenceVersion(undefined); setAnnotationSource(null); setAnnotationMode(false); }
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
  const sidebarToggleLabel = sidebar.collapsed ? text("展开文件列表", "Show file list") : text("收起文件列表", "Hide file list");
  const sidebarToggle = sidebar.desktop && <Button aria-label={sidebarToggleLabel} aria-controls={sidebar.sidebarId} aria-expanded={!sidebar.collapsed} className="task-file-sidebar-toggle" onClick={sidebar.toggle} ref={sidebar.toggleRef} size="icon-sm" title={sidebarToggleLabel} variant="ghost">
    {sidebar.collapsed ? <PanelLeftOpen aria-hidden="true" size={17} /> : <PanelLeftClose aria-hidden="true" size={17} />}
  </Button>;

  return <div className="task-file-explorer" style={sidebar.style} ref={sidebar.rootRef} data-sidebar-collapsed={sidebar.collapsed} data-sidebar-desktop={sidebar.desktop} data-annotation-mode={annotationMode} data-mobile-view={mobilePreview ? "preview" : "tree"} onDragEnter={event => {
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
    <aside aria-label={ui("任务文件")} aria-hidden={sidebar.collapsed || undefined} inert={sidebar.collapsed} className="task-file-explorer-sidebar" id={sidebar.sidebarId} ref={sidebar.sidebarRef}>
      <div className="task-file-explorer-sidebar-content">
      <div className="task-file-sidebar-topbar">
        <div className="task-file-sidebar-search"><Input aria-label={ui("搜索当前任务文件")} className="task-file-search-input" leadingIcon={<Search />} onChange={event => setQuery(event.target.value)} placeholder={text("搜索文件", "Search files")} value={query} />{query && <Button aria-label={ui("清除搜索")} className="task-file-search-clear" onClick={() => setQuery("")} size="icon-xs" variant="ghost"><X /></Button>}</div>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={text("添加文件或文件夹", "Add files or folders")} render={<Button className="task-file-add-trigger" size="icon-sm" variant="ghost" />} title={text("添加", "Add")}><Plus aria-hidden="true" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="gap-2" onClick={() => setDialog({ type: "create", parentId: directoryId })}><FolderPlus aria-hidden="true" size={16} />{d('newFolder')}</DropdownMenuItem>
            <DropdownMenuItem className="gap-2" disabled={uploading} onClick={openUpload}><Upload aria-hidden="true" size={16} />{ui("上传文件")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input accept={TASK_FILE_UPLOAD_ACCEPT} aria-label={ui("选择上传文件")} hidden multiple onChange={event => void uploadFiles(Array.from(event.target.files ?? []), uploadParentId)} ref={uploadInput} type="file" />
      </div>
      <div className="task-file-explorer-tree-scroll">{visibleFiles.some(node => !node.archived) ? <TaskFileTree expandedIds={expandedIds} nodes={visibleFiles} onAction={openAction} onExpandedChange={setExpandedIds} onSelect={selectNode} selectedId={selectedId} /> : <div className="task-file-explorer-no-results">{query ? ui("没有匹配的文件") : ui("暂无文件")}{query && <button onClick={() => setQuery("")} type="button">{ui("清除搜索")}</button>}</div>}</div>
      </div>
      {sidebar.desktop && <SidebarResizeHandle kind="files" width={sidebar.width} onChange={sidebar.changeWidth} onResizePreview={sidebar.previewResize} onResizeCommit={sidebar.commitResize} onResizeCancel={sidebar.cancelResize} onResizingChange={sidebar.setResizing} min={180} max={sidebar.maxWidth} />}
    </aside>
    <main aria-label={selected ? ui("文件编辑：{0}", {0: selected.name}) : text("文件预览", "File preview")} className="task-file-explorer-preview" id={selected ? `task-file-preview-${selected.id}` : undefined} ref={previewRef} tabIndex={-1}>
        <div className="task-file-editor-toolbar">
          {sidebarToggle}
          <button aria-label={ui("返回文件结构")} className="task-file-explorer-mobile-back" onClick={() => { setMobilePreview(false); setSelection(null); }} type="button"><ArrowLeft size={16} /></button>
          <div className="task-file-toolbar-context">
            <nav aria-label={d('fileLocation')} className="task-file-editor-path">{path.map((node, index) => <React.Fragment key={node.id}>{index > 0 && <ChevronRight aria-hidden="true" size={12} />}<span aria-current={index === path.length - 1 ? "page" : undefined} title={mock.text(node.name)}>{mock.text(node.name)}</span></React.Fragment>)}</nav>
          </div>
          <div className="task-file-editor-actions">
            <div className="task-file-editor-controls">
            {selected?.kind === "file" && <>
              {!isEditing && !loadError && <FullscreenButton kind={getPreviewKind(selected.name, selected.mimeType)} onSelection={setSelection} target={viewerRef} />}
              {isEditing && <span aria-live="polite" className="task-file-save-state">{dirty ? ui("未保存") : ui("编辑中")}</span>}
              {currentContent && !loadError && isEditing && <><Button className="task-file-action-button" onClick={discard} size="sm" variant="ghost">{d('cancel')}</Button><Button aria-label={ui("保存文件")} className="task-file-action-button task-file-save-button" onClick={save} size="sm" variant="default"><Save size={16} />{d('save')}</Button></>}
              {!isEditing && <>
                {!annotationMode && isSupportedTaskFileUpload(selected) && <Button aria-label={text("文件标注", "File annotations")} className="task-file-review-control" onClick={() => { setAnnotationMode(true); setAnnotationSource(null); setSelection(null); }} size="sm" title={text("选择文字或框选区域添加标注", "Select text or a region to annotate")} variant="ghost"><SquareDashedMousePointer aria-hidden="true" size={16} /><span>{text("标注", "Annotate")}</span></Button>}
              </>}
              {!isEditing && <>
                {editable && currentContent && !loadError && <Button aria-label={d('editFile')} className="task-file-action-button" onClick={() => { setAnnotationSource(null); setAnnotationMode(false); setEditingFileId(selected.id); setSelection(null); setError(""); }} size="sm" variant="ghost"><Pencil size={16} />{dirty ? ui("继续编辑") : d('edit')}</Button>}
              </>}
            </>}
            {selected && <DropdownMenu><DropdownMenuTrigger aria-label={ui("更多文件操作")} className="task-file-toolbar-more"><MoreHorizontal size={17} /></DropdownMenuTrigger><DropdownMenuContent align="end" className="task-file-toolbar-menu"><DropdownMenuGroup>
              {selected.kind === "file" && lastUpdate?.updatedAt.trim() && <DropdownMenuLabel aria-label={ui("最近更新")} className="task-file-menu-meta">
                <span>v{viewerFile?.version ?? 1}</span>
                {lastUpdate.author && <><PersonName name={lastUpdate.author} personId={lastUpdate.author} showProfilePreview={false} /><span>{ui("于")}</span></>}
                {lastUpdate.isExact ? <time dateTime={lastUpdate.updatedAt} title={formatDisplayDateTime(lastUpdate.updatedAt, { locale, year: "always" }) ?? undefined}>{formatDisplayDateTime(lastUpdate.updatedAt, { locale }) ?? "—"}</time> : <span>{formatLegacyDateLabel(lastUpdate.updatedAt, locale)}</span>}
                <span>{ui("更新")}</span>
              </DropdownMenuLabel>}
              {selected.kind === "file" && <>
                <DropdownMenuItem aria-label={ui("查看版本记录")} onClick={() => { setShowHistory(true); setSelection(null); }}><History size={14} />{ui("查看版本")}</DropdownMenuItem>
                {ownAnnotations.length > 0 && <DropdownMenuItem disabled={!annotationContext.value || pendingAnnotationInput || annotationExporting} onClick={async () => {
                  if (!annotationContext.value) return;
                  setAnnotationExporting(true);
                  try { await downloadFileAnnotationBundle(annotationContext.value, locale); setError(""); }
                  catch (failure) { setError(failure instanceof Error ? failure.message : text("材料下载失败，请重试。", "Could not download the materials. Please retry.")); }
                  finally { setAnnotationExporting(false); }
                }}><Download size={14} />{annotationExporting ? text("准备材料…", "Preparing materials…") : text("下载修订包", "Download revision package")}</DropdownMenuItem>}
                <DropdownMenuSeparator />
              </>}
              {selected.kind === "file" && canDownload(selected) && <DropdownMenuItem onClick={async () => setError(ui(await downloadTaskFile(selected)))}><Download size={14} />{ui("下载")}</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => setDialog({ type: "move", nodeId: selected.id })}><MoveRight size={14} />{ui("移动到")}</DropdownMenuItem>
            </DropdownMenuGroup></DropdownMenuContent></DropdownMenu>}
            </div>
          </div>
        </div>
        {uploading && <div className="flex shrink-0 items-center gap-3 p-4" role="status"><Spinner aria-hidden="true" className="motion-reduce:animate-none" /><span className="flex min-w-0 flex-1 flex-col gap-1"><strong className="text-sm font-medium">{ui("正在上传 {0}/{1} 个文件", {0: uploadProgress.completed, 1: uploadProgress.total})}</strong><small className="truncate text-muted-foreground">{uploadProgress.location}</small></span><Progress aria-label={ui("上传进度")} className="w-20" max={uploadProgress.total} value={uploadProgress.completed} /></div>}
        {(error || loadError || annotationMaterial.error) && <p className="task-file-save-error" role="alert">{error || loadError || annotationMaterial.error}</p>}
        {annotationSource && annotationSource.version !== (selected?.version ?? 1) && <div className="task-file-reference-version" role="status">{text(`正在查看标注对应的 v${annotationSource.version}，最新版本为 v${selected?.version ?? 1}。`, `Viewing the annotated v${annotationSource.version}; the latest version is v${selected?.version ?? 1}.`)}<Button onClick={() => { setAnnotationSource(null); setActiveThreadId(null); setAnnotationMode(true); }} size="xs" variant="ghost">{text("查看最新版本", "View latest")}</Button></div>}
        {selected?.kind === "file" && referenceVersion != null && referenceVersion !== (selected.version ?? 1) && <p className="task-file-reference-version" role="status">{ui("附件引用 v")}{referenceVersion}{ui("；当前显示 v")}{selected.version ?? 1}{ui("。历史引用保持原版本，可在版本记录中核对修改。")}</p>}
        {selected?.kind === "file" && viewerFile ? <div className="task-file-editor-body">
          <div className="task-file-explorer-viewer" onScroll={() => setSelection(null)} ref={viewerRef}><TaskFileViewer activeThreadId={activeThreadId} annotationFocusSequence={annotationFocusSequence} annotations={annotationsVisible ? currentAnnotations : []} annotationMode={annotationMode && !isEditing} draft={isEditing ? currentDraft?.content ?? currentContent : getTaskFileContent(viewerFile)} draftAnchor={annotationDraft?.file.id === viewerFile.id && annotationDraft.file.version === viewerFile.version ? annotationDraft.anchor : null} file={viewerFile} key={`${viewerFile.id}:${viewerFile.version}:${annotationSource ? "snapshot" : "current"}`} onChange={isEditing ? changeContent : undefined} onSelection={quote => { if (quote && getTaskFileSelectionAnchor(quote).kind === "region") beginAnnotation(quote); else setSelection(quote); }} onThreadSelect={locateThread} threads={previewThreads} /></div>

        </div> : <Empty className="flex-1"><EmptyHeader><EmptyMedia variant="icon"><FolderOpen /></EmptyMedia><EmptyTitle>{ui("暂无文件")}</EmptyTitle><EmptyDescription>{ui("上传文件，或新建文件夹整理任务资料。")}</EmptyDescription></EmptyHeader></Empty>}
      {renderAnnotationOverlay(annotationMode && !isEditing && <div className="task-file-annotation-dock"><div aria-label={text("标注工具条", "Annotation toolbar")} className="task-file-annotation-toolbar" data-dragging={toolbarDrag.isDragging} ref={toolbarDrag.toolbarRef} role="toolbar" style={toolbarDrag.style}>
        <button {...toolbarDrag.handleProps} aria-label={text("拖动标注工具条", "Move annotation toolbar")} className="task-file-annotation-toolbar-grip" title={text("拖动移动；方向键微调，Home 复位", "Drag to move; use arrow keys to adjust, Home to reset")}><GripVertical aria-hidden="true" size={17} /></button>
        <PopoverTrigger aria-label={text("本次标注", "Annotations")} closeDelay={150} delay={180} disabled={!visibleAnnotationIds.length} handle={basketPopoverHandle} id={basketTriggerId} onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setBasketOpen(true); }} openOnHover ref={basketTriggerRef} className="task-file-annotation-toolbar-count"><span className="task-file-annotation-toolbar-status">{text("正在标注", "Annotating")}</span><span> · {visibleAnnotationIds.length}</span></PopoverTrigger>
        <span className="task-file-annotation-toolbar-separator" />
        <button aria-label={annotationsVisible ? text("隐藏标注", "Hide annotations") : text("显示标注", "Show annotations")} aria-pressed={!annotationsVisible} onClick={() => setAnnotationsVisible(visible => !visible)} title={annotationsVisible ? text("隐藏标注", "Hide annotations") : text("显示标注", "Show annotations")} type="button">{annotationsVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        <button className="task-file-annotation-toolbar-send" aria-busy={preparingAnnotationMaterial} disabled={!annotationMaterial.draft || pendingAnnotationInput || preparingAnnotationMaterial || !onStartDiscussion} onClick={async () => {
          if (!annotationMaterial.draft || !onStartDiscussion) return;
          const signature = annotationSignature;
          const draft = await prepareAnnotationMaterial();
          if (!draft) return;
          onStartDiscussion(draft, published => {
            if (published.attachments.some(file => file.id === draft.attachments[0].id)) setDeliveredSignature(signature);
          });
          setBasketOpen(false); setError("");
        }} type="button">{preparingAnnotationMaterial ? <Spinner /> : <MessageCircle aria-hidden="true" size={16} />}{preparingAnnotationMaterial ? text("正在整理标注…", "Preparing annotations…") : text("发送到讨论区", "Send to discussion")}</button>
        <AiConnectionButton disabled={!annotationMaterial.draft || pendingAnnotationInput || preparingAnnotationMaterial} contextLabel={text("本次标注", "annotations")} onConnect={async (trigger, shortcut) => {
          const signature = annotationSignature;
          const material = await prepareAnnotationMaterial(shortcut?.signal);
          const file = material?.attachments[0];
          if (!file?.content) return { status: shortcut?.signal.aborted ? "cancelled" as const : "file-failed" as const, message: text("标注文件尚未准备好，意见仍保留，请重试。", "The annotation file is not ready. Your annotations are retained; try again.") };
          const request: AiConnectionRequest = { taskId, title: text("连接 AI", "Connect AI"), description: text("将本次标注整理为文件，带到本地客户端。", "Bring these annotations to your local client as a file."), context: [{ label: "任务名称", value: taskTitle }], workObject: { kind: "文件标注", title: file.name }, handoffFile: { name: file.name, mimeType: "text/html", content: file.content }, contextPreview: { items: [{ id: "revision-feedback", label: text("标注文件", "Annotation file"), value: file.name }] } };
          setBasketOpen(false);
          if (shortcut) {
            const result = await launchAiContext(request, shortcut.agent, shortcut.signal, undefined, undefined, locale);
            if (result.status === "open-attempted") setDeliveredSignature(signature);
            return result;
          }
          aiTrigger.current = trigger; aiRequestSignature.current = signature; setAiRequest(request);
        }} />
        <button aria-label={text("退出标注", "Exit annotation mode")} onClick={() => annotationExit.current.discard()} title={text("清空并退出标注", "Clear annotations and exit")} type="button"><X size={17} /></button>
      </div></div>)}
    </main>
    {dragging && !showUpload && <div className="task-file-drop-overlay"><Upload size={30} /><strong>{uploading ? ui("正在上传文件…") : ui("松开以上传文件")}</strong><span>{locationLabel(directoryId)}</span></div>}
    <Dialog onOpenChange={setShowUpload} open={showUpload}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{ui("上传文件")}</DialogTitle><DialogDescription>{ui("上传到：{0}", {0: locationLabel(uploadParentId)})}</DialogDescription></DialogHeader><Empty className="task-file-upload-dropzone border" onDragOver={event => { event.preventDefault(); event.currentTarget.dataset.dragging = "true"; }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) delete event.currentTarget.dataset.dragging; }} onDrop={event => { event.preventDefault(); event.stopPropagation(); delete event.currentTarget.dataset.dragging; void uploadFiles(Array.from(event.dataTransfer.files), uploadParentId); }}><EmptyHeader><EmptyMedia variant="icon"><Upload /></EmptyMedia><EmptyTitle>{ui("拖入文件，或选择上传")}</EmptyTitle><EmptyDescription>{ui("每次最多 {0} 个文件，单个不超过 20 MiB", {0: DISCUSSION_UPLOAD_MAX_FILES})}<br />{ui("仅支持可在线预览的文件：{0}", {0: TASK_FILE_UPLOAD_EXTENSIONS_LABEL})}</EmptyDescription></EmptyHeader><EmptyContent><Button onClick={() => uploadInput.current?.click()} variant="outline">{ui("选择文件")}</Button></EmptyContent></Empty></DialogContent></Dialog>
    {renderAnnotationOverlay(selection && selected && !isEditing && <div aria-label={ui("选中文字操作")} className="task-file-selection-toolbar" role="toolbar" style={{ left: Math.max(12, Math.min(window.innerWidth - 240, selection.rect.left)), top: Math.max(12, Math.min(window.innerHeight - 60, selection.rect.bottom - 48)) }}>{!isEditing && <button onMouseDown={event => event.preventDefault()} onClick={() => beginAnnotation(selection)} title={text("标注这段内容", "Annotate this passage")} type="button"><SquareDashedMousePointer aria-hidden="true" size={17} />{text("标注", "Annotate")}</button>}<button aria-label={ui("关闭选区操作")} onClick={() => setSelection(null)} type="button"><X size={14} /></button></div>)}
    <TaskFileAnnotationComposer draft={annotationDraft} onChange={body => setAnnotationDraft(current => current ? { ...current, body } : null)} onClose={() => { setAnnotationDraft(null); setAnnotationMode(false); }} onSubmit={() => {
      if (!annotationDraft) return;
      const annotation = createTaskFileAnnotation({ taskId, file: annotationDraft.file, authorId: actorId, authorName: currentUser, body: annotationDraft.body, anchor: annotationDraft.anchor });
      review.commit(current => [...current, annotation]);
      setAnnotationDraft(null); setAnnotationMode(true); setActiveThreadId(annotation.id);
    }} />
    {ownAnnotations.length > 0 && <TaskFileAnnotationBasket open={basketOpen} onOpenChange={setBasketOpen} handle={basketPopoverHandle} triggerId={basketTriggerId} compact onClose={() => setBasketOpen(false)} annotations={ownAnnotations} actorId={actorId} onPendingEditChange={setPendingAnnotationEdit} onEdit={(id, body) => review.commit(current => updateTaskFileAnnotationBody(current, id, actorId, body))} onRemove={id => { try { review.commit(current => deleteTaskFileAnnotation(current, id, actorId)); if (ownAnnotations.length === 1) setBasketOpen(false); setError(""); } catch (failure) { setError(failure instanceof Error ? failure.message : text("删除标注失败，请重试。", "Could not delete the annotation. Please retry.")); } }} onLocate={locateAnnotation} />}
    {aiRequest && <AiConnectionDialog request={aiRequest} returnFocus={aiTrigger.current} onClose={() => setAiRequest(null)} onTransferResult={result => { if (result.status === "open-attempted") setDeliveredSignature(aiRequestSignature.current); }} />}
    {selected?.kind === "file" && <Dialog onOpenChange={open => { setShowHistory(open); if (!open) setSelection(null); }} open={showHistory}><DialogContent className="task-file-revisions-dialog gap-0 p-0" showCloseButton={false}><DialogTitle className="sr-only">{ui("版本记录")}</DialogTitle><TaskFileHistory filePath={path.map(node => mock.text(node.name)).join(" / ")} key={selected.id} onClose={() => setShowHistory(false)} revisions={revisions} version={selected.version ?? 1} /></DialogContent></Dialog>}
    <TaskFileDialogs dialog={dialog} nodes={files} onClose={() => setDialog(null)} onCreate={(parentId, name) => { const result = createFolder(files, parentId, name); commitFiles(result.nodes); setExpandedIds(current => new Set([...current, ...getNodePath(result.nodes, result.folder.id).filter(node => node.kind === "folder").map(node => node.id)])); }} onDelete={deleteNode} onMove={(nodeId, parentId) => { commitFiles(moveNode(files, nodeId, parentId)); if (parentId) setExpandedIds(current => new Set([...current, parentId])); }} onRename={renameFile} />
  </div>;
}
