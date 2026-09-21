import { useGlobalUi } from "../../i18n/globalUi";
import { useDetailCopy } from "../../i18n/detailMessages";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer, type InitialConfigType } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { $createLineBreakNode, $createParagraphNode, $createTextNode, $getNodeByKey, $getRoot, $getSelection, $isRangeSelection, $isTextNode, $setSelection, BEFORE_INPUT_COMMAND, CLEAR_HISTORY_COMMAND, COMMAND_PRIORITY_HIGH, INPUT_COMMAND, KEY_DOWN_COMMAND, PASTE_COMMAND, type EditorState, type LexicalEditor, type RangeSelection, type SerializedEditorState } from "lexical";
import { FolderOpen, LoaderCircle, Paperclip, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import type { TaskFileNode } from "../../data/taskDetailMocks";
import type { DiscussionDraft } from "../../lib/taskCollaboration";
import { DISCUSSION_UPLOAD_MAX_FILES, isDiscussionImage, prepareDiscussionUpload, readDiscussionBlob } from "../../lib/discussionUploads";
import { usePersonOptions } from "../PersonDirectory";
import { PersonPicker, type PersonOption } from "../PersonPicker";
import { Button } from "../ui/button";
import { FileCard, resolveFileCardFormat } from "../ui/file-card-collections";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { DiscussionFileMenu } from "./DiscussionFileMenu";
import { $createMentionNode, $isMentionNode, MentionNode } from "./MentionNode";

export type DiscussionComposerProps = {
  actionLabel?: string;
  autoFocus?: boolean;
  compact?: boolean;
  allowQuote?: boolean;
  showShortcutHint?: boolean;
  onCancel?: () => void;
  onConnectAi?: (draft: string, trigger: HTMLElement) => void;
  onSubmit: (draft: DiscussionDraft) => void | Promise<void>;
  people: string[];
  files: TaskFileNode[];
  placeholder?: string;
  draftKey?: string;
  initialValue?: DiscussionDraft;
  disabled?: boolean;
};

type DraftAttachment = { id: string; name: string; status: "uploading" | "ready" | "failed"; node?: TaskFileNode; file?: File; error?: string };
type ComposerSession = { draft: DiscussionDraft; editorState?: SerializedEditorState; attachments: DraftAttachment[] };
// Session memory preserves both Lexical mention identities and unsubmitted File objects.
const draftSessions = new Map<string, ComposerSession>();
const draftSessionListeners = new Map<string, Set<(session: ComposerSession) => void>>();
const emptyDraft = (): DiscussionDraft => ({ body: "", mentions: [], attachments: [] });

function createSession(initialValue?: DiscussionDraft): ComposerSession {
  const draft = initialValue ?? emptyDraft();
  return { draft, attachments: draft.attachments.map(node => ({ id: node.id, name: node.name, node, status: "ready" })) };
}

function $readEditorDraft(): Pick<DiscussionDraft, "body" | "mentions"> {
  return { body: $getRoot().getTextContent(), mentions: [...new Set($getRoot().getAllTextNodes().filter($isMentionNode).map(node => node.getPersonId()))] };
}

function $initializeDraft(draft: DiscussionDraft, members: PersonOption[]) {
  const paragraph = $createParagraphNode();
  const mentionedPeople = members.filter(person => draft.mentions.includes(person.id)).sort((a, b) => b.name.length - a.name.length);
  // Rehydrate only explicit mention IDs supplied by an existing draft, never arbitrary pasted text.
  for (const [lineIndex, line] of draft.body.split("\n").entries()) {
    if (lineIndex) paragraph.append($createLineBreakNode());
    let remaining = line;
    while (remaining) {
      const match = mentionedPeople.map(person => ({ person, index: remaining.indexOf(`@${person.name}`) })).filter(item => item.index >= 0).sort((a, b) => a.index - b.index)[0];
      if (!match) { paragraph.append($createTextNode(remaining)); break; }
      if (match.index) paragraph.append($createTextNode(remaining.slice(0, match.index)));
      paragraph.append($createMentionNode(match.person.id, match.person.name));
      remaining = remaining.slice(match.index + match.person.name.length + 1);
    }
  }
  $getRoot().clear().append(paragraph);
}

function $restoreSelection(selection: RangeSelection | null): RangeSelection {
  if (selection && $getNodeByKey(selection.anchor.key) && $getNodeByKey(selection.focus.key)) {
    const next = selection.clone();
    $setSelection(next);
    return next;
  }
  return $getRoot().selectEnd();
}

export function isDiscussionSubmitShortcut(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "isComposing" | "keyCode">, composing = false): boolean {
  return event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.isComposing && event.keyCode !== 229 && !composing;
}

type EditorBridgeProps = { disabled: boolean; onEditor: (editor: LexicalEditor | null) => void; onSelectionChange: (selection: RangeSelection) => void; onSubmit: () => void; onUpload: (files: File[]) => void; onTypedMention: () => void };
function EditorBridge(props: EditorBridgeProps) {
  const [editor] = useLexicalComposerContext();
  const callbacks = useRef(props);
  callbacks.current = props;
  useEffect(() => { editor.setEditable(!props.disabled); }, [editor, props.disabled]);
  useEffect(() => {
    callbacks.current.onEditor(editor);
    const typedMention = (event: InputEvent) => {
      if (!callbacks.current.disabled && !event.isComposing && event.inputType === "insertText" && event.data === "@") queueMicrotask(() => callbacks.current.onTypedMention());
      return false;
    };
    const unregister = [
      editor.registerUpdateListener(({ editorState }) => editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) callbacks.current.onSelectionChange(selection.clone());
      })),
      editor.registerCommand(BEFORE_INPUT_COMMAND, typedMention, COMMAND_PRIORITY_HIGH),
      editor.registerCommand(INPUT_COMMAND, typedMention, COMMAND_PRIORITY_HIGH),
      editor.registerCommand(KEY_DOWN_COMMAND, event => {
        if (!isDiscussionSubmitShortcut(event, editor.isComposing())) return false;
        event.preventDefault();
        if (!callbacks.current.disabled) callbacks.current.onSubmit();
        return true;
      }, COMMAND_PRIORITY_HIGH),
      editor.registerCommand(PASTE_COMMAND, event => {
        const clipboard = "clipboardData" in event ? event.clipboardData : null;
        const files = Array.from(clipboard?.files ?? []);
        if (!files.length) return false;
        event.preventDefault();
        if (!callbacks.current.disabled) callbacks.current.onUpload(files);
        return true;
      }, COMMAND_PRIORITY_HIGH),
    ];
    return () => { unregister.forEach(remove => remove()); callbacks.current.onEditor(null); };
  }, [editor]);
  return null;
}

function AttachmentThumbnail({ attachment, actions }: { attachment: DraftAttachment; actions: ReactNode }) {
  const [source, setSource] = useState("");
  const node = attachment.node;
  const image = isDiscussionImage(node ?? { name: attachment.name, mimeType: attachment.file?.type });
  useEffect(() => {
    if (!image) return;
    let active = true;
    let objectUrl: string | undefined;
    const load = async () => {
      const blob = attachment.file ?? (node?.blobId ? await readDiscussionBlob(node.blobId) : null);
      if (!active) return;
      if (blob) { objectUrl = URL.createObjectURL(blob); setSource(objectUrl); }
      else if (node?.previewData?.kind === "image") setSource(node.previewData.src);
    };
    void load().catch(() => { /* A preview failure does not discard a ready attachment. */ });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attachment.file, image, node]);
  const format = attachment.name.match(/\.([^.]+)$/)?.[1] || node?.format || "file";
  return <FileCard actions={actions} formatFile={resolveFileCardFormat(format, node?.mimeType ?? attachment.file?.type)} formatLabel={format} preview={source ? <img alt="" className="discussion-composer-attachment-preview" onError={() => setSource("")} src={source} /> : undefined} size="compact" />;
}

export function DiscussionComposer(props: DiscussionComposerProps) {
  return <ComposerSessionView key={props.draftKey ?? "unkeyed-discussion"} {...props} />;
}

function ComposerSessionView({ actionLabel = "发布", autoFocus = false, compact = false, allowQuote = true, showShortcutHint = true, onCancel, onConnectAi, onSubmit, people, files, placeholder = "写下评论，使用 @ 提及协作者…", draftKey, initialValue, disabled = false }: DiscussionComposerProps) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const members = usePersonOptions(people);
  const [session, setSession] = useState<ComposerSession>(() => (draftKey && draftSessions.get(draftKey)) || createSession(initialValue));
  const sessionRef = useRef(session);
  const mountedRef = useRef(true);
  const editorRef = useRef<LexicalEditor | null>(null);
  const selectionRef = useRef<RangeSelection | null>(null);
  const pickerOpenRef = useRef(false);
  const returnFocusRef = useRef(true);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const filePickerTriggerRef = useRef<HTMLButtonElement>(null);
  const attachmentSelectedRef = useRef(false);
  const submittingRef = useRef(false);
  const composingRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const hintId = useId();
  const unavailable = disabled || submitting;

  const updateSession = (update: (current: ComposerSession) => ComposerSession) => {
    const next = update((draftKey && draftSessions.get(draftKey)) || sessionRef.current);
    next.draft = { ...next.draft, attachments: next.attachments.flatMap(item => item.status === "ready" && item.node ? [item.node] : []) };
    sessionRef.current = next;
    if (draftKey) {
      if (next.draft.body || next.draft.quote || next.attachments.length) draftSessions.set(draftKey, next);
      else draftSessions.delete(draftKey);
      draftSessionListeners.get(draftKey)?.forEach(listener => listener(next));
    }
    if (mountedRef.current) setSession(next);
  };

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => {
    if (!draftKey) return;
    const listener = (next: ComposerSession) => { sessionRef.current = next; setSession(next); };
    const listeners = draftSessionListeners.get(draftKey) ?? new Set();
    listeners.add(listener);
    draftSessionListeners.set(draftKey, listeners);
    return () => { listeners.delete(listener); if (!listeners.size) draftSessionListeners.delete(draftKey); };
  }, [draftKey]);
  const initialQuoteId = useRef(initialValue?.quote?.messageId);
  useEffect(() => {
    if (initialQuoteId.current === initialValue?.quote?.messageId) return;
    initialQuoteId.current = initialValue?.quote?.messageId;
    updateSession(current => ({ ...current, draft: { ...current.draft, quote: initialValue?.quote } }));
  }, [initialValue?.quote]);

  const rememberSelection = () => {
    if (pickerOpenRef.current) return;
    editorRef.current?.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) selectionRef.current = selection.clone();
    });
  };
  const restoreEditorFocus = () => {
    const editor = editorRef.current;
    const root = editor?.getRootElement();
    if (!returnFocusRef.current || !editor || !root?.isConnected) return false;
    // A late popup callback must never move a caret that the user has already moved.
    if (root.contains(root.ownerDocument.activeElement)) return false;
    editor.update(() => { $restoreSelection(selectionRef.current); }, { discrete: true });
    editor.focus(() => root.focus({ preventScroll: true }));
    return false;
  };
  const onTypedMention = () => {
    const editor = editorRef.current;
    if (!editor || pickerOpenRef.current || composingRef.current || unavailable) return;
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed() || selection.anchor.type !== "text") return;
      const node = selection.anchor.getNode();
      if (!$isTextNode(node) || $isMentionNode(node) || node.getTextContent()[selection.anchor.offset - 1] !== "@") return;
      const mentionRange = selection.clone();
      mentionRange.anchor.offset -= 1;
      selectionRef.current = mentionRange;
      pickerOpenRef.current = true;
      returnFocusRef.current = true;
      setPickerOpen(true);
    });
  };
  const choosePerson = (personId: string) => {
    const person = members.find(member => member.id === personId);
    if (!person || unavailable) return;
    editorRef.current?.update(() => {
      const selection = $restoreSelection(selectionRef.current);
      const spacer = $createTextNode(" ");
      selection.insertNodes([$createMentionNode(person.id, person.name), spacer]);
      selectionRef.current = spacer.selectEnd().clone();
    }, { discrete: true });
  };
  const onEditorChange = (editorState: EditorState) => {
    const value = editorState.read($readEditorDraft);
    updateSession(current => ({ ...current, editorState: editorState.toJSON(), draft: { ...current.draft, ...value } }));
    if (error) setError("");
  };

  const uploadAttachment = async (entry: DraftAttachment) => {
    if (!entry.file) return;
    updateSession(current => ({ ...current, attachments: current.attachments.map(item => item.id === entry.id ? { ...item, status: "uploading", error: undefined } : item) }));
    try {
      const node = await prepareDiscussionUpload(entry.file);
      const latest = draftKey ? draftSessions.get(draftKey) : sessionRef.current;
      if (!latest?.attachments.some(item => item.id === entry.id)) return;
      updateSession(current => ({ ...current, attachments: current.attachments.map(item => item.id === entry.id ? { ...item, status: "ready", node, error: undefined } : item) }));
    } catch (caught) {
      const latest = draftKey ? draftSessions.get(draftKey) : sessionRef.current;
      if (!latest?.attachments.some(item => item.id === entry.id)) return;
      updateSession(current => ({ ...current, attachments: current.attachments.map(item => item.id === entry.id ? { ...item, status: "failed", error: caught instanceof Error ? caught.message : d('attachmentSaveFailed') } : item) }));
    }
  };
  const addUploads = (incoming: File[]) => {
    if (disabled || submittingRef.current || !incoming.length) return;
    const available = DISCUSSION_UPLOAD_MAX_FILES - sessionRef.current.attachments.length;
    if (incoming.length > available) { setError(ui("每条评论最多添加 {0} 个附件，请减少选择后重试。", {0: DISCUSSION_UPLOAD_MAX_FILES})); return; }
    const entries: DraftAttachment[] = incoming.map(file => ({ id: `draft-upload-${globalThis.crypto.randomUUID()}`, name: file.name, file, status: "uploading" }));
    setError("");
    updateSession(current => ({ ...current, attachments: [...current.attachments, ...entries] }));
    entries.forEach(entry => { void uploadAttachment(entry); });
  };
  const removeAttachment = (id: string) => updateSession(current => ({ ...current, attachments: current.attachments.filter(item => item.id !== id) }));
  const chooseExistingFile = (node: TaskFileNode) => {
    if (unavailable) return;
    const existing = sessionRef.current.attachments.find(item => item.node?.id === node.id);
    if (existing) return;
    if (sessionRef.current.attachments.length >= DISCUSSION_UPLOAD_MAX_FILES) { setError(ui("每条评论最多添加 {0} 个附件。", {0: DISCUSSION_UPLOAD_MAX_FILES})); return; }
    updateSession(current => ({ ...current, attachments: [...current.attachments, { id: node.id, name: node.name, node, status: "ready" }] }));
    attachmentSelectedRef.current = true;
    setError("");
  };
  const submit = async () => {
    const editor = editorRef.current;
    if (disabled || submittingRef.current || composingRef.current || editor?.isComposing()) return;
    const current = sessionRef.current;
    const draft = { ...current.draft, ...(editor?.getEditorState().read($readEditorDraft) ?? {}), attachments: [...current.draft.attachments] };
    if (!draft.body.trim() && !draft.attachments.length) return;
    if (current.attachments.some(item => item.status !== "ready")) { setError(d('waitAttachments')); return; }
    submittingRef.current = true;
    editor?.setEditable(false);
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({ ...draft, body: draft.body.trim(), mentions: [...draft.mentions], ...(allowQuote ? {} : { quote: undefined }) });
      updateSession(() => createSession());
      selectionRef.current = null;
      editor?.update(() => { $getRoot().clear().append($createParagraphNode()); });
      editor?.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
      if (draftKey) draftSessions.delete(draftKey);
    } catch (caught) {
      if (mountedRef.current) setError(caught instanceof Error ? caught.message : "评论发布失败，草稿已保留，请重试。");
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) { setSubmitting(false); editor?.setEditable(!disabled); }
    }
  };

  const [initialConfig] = useState<InitialConfigType>(() => ({ namespace: "AgentDoorDiscussion", nodes: [MentionNode], theme: { paragraph: "discussion-composer-paragraph", mention: "discussion-composer-mention" }, editable: !disabled, editorState: session.editorState ? JSON.stringify(session.editorState) : () => $initializeDraft(session.draft, members), onError: error => { throw error; } }));
  const canSubmit = !unavailable && Boolean(session.draft.body.trim() || session.draft.attachments.length) && session.attachments.every(item => item.status === "ready");
  const hasFileDrag = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

  return <div aria-busy={submitting || undefined} className={`discussion-composer${compact ? " compact" : ""}${dragging ? " is-dragging" : ""}`} onPointerDownCapture={rememberSelection} onCompositionStart={() => { composingRef.current = true; }} onCompositionEnd={() => { composingRef.current = false; }} onDragEnter={event => { if (!hasFileDrag(event) || unavailable) return; event.preventDefault(); dragDepth.current++; setDragging(true); }} onDragOver={event => { if (hasFileDrag(event)) { event.preventDefault(); event.dataTransfer.dropEffect = unavailable ? "none" : "copy"; } }} onDragLeave={event => { if (!hasFileDrag(event)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }} onDrop={event => { if (!hasFileDrag(event)) return; event.preventDefault(); dragDepth.current = 0; setDragging(false); addUploads(Array.from(event.dataTransfer.files)); }}>
    {allowQuote && session.draft.quote && <div className="discussion-composer-quote"><span><strong>{d('quote')}{session.draft.quote.author}</strong><span>{session.draft.quote.text}</span></span><button aria-label={ui("移除引用")} disabled={unavailable} onClick={() => updateSession(current => ({ ...current, draft: { ...current.draft, quote: undefined } }))} type="button"><X aria-hidden="true" size={14} /></button></div>}
    <LexicalComposer initialConfig={initialConfig}>
      <div className="discussion-composer-editor">
        <PlainTextPlugin contentEditable={<ContentEditable aria-describedby={showShortcutHint ? hintId : undefined} aria-label={placeholder} aria-multiline="true" className="discussion-composer-input" spellCheck />} ErrorBoundary={LexicalErrorBoundary} placeholder={<div className="discussion-composer-placeholder">{placeholder}</div>} />
      </div>
      <HistoryPlugin />
      <OnChangePlugin ignoreSelectionChange onChange={onEditorChange} />
      <EditorBridge disabled={unavailable} onEditor={editor => { editorRef.current = editor; }} onSelectionChange={selection => { if (!pickerOpenRef.current) selectionRef.current = selection; }} onSubmit={() => { void submit(); }} onTypedMention={onTypedMention} onUpload={addUploads} />
      {autoFocus && <AutoFocusPlugin />}
    </LexicalComposer>
    {/* File Card Collections by urmauur, shared by every discussion composer. */}
    {session.attachments.length > 0 && <ul aria-label={d('draftAttachments')} className="discussion-composer-attachments">{session.attachments.map(attachment => {
      const image = attachment.status === "ready" && isDiscussionImage(attachment.node ?? { name: attachment.name, mimeType: attachment.file?.type });
      return <li className="discussion-composer-attachment" data-kind={image ? "image" : "file"} data-status={attachment.status} key={attachment.id} title={attachment.name}>
        <AttachmentThumbnail attachment={attachment} actions={<>
          {attachment.status === "uploading" && <><LoaderCircle aria-hidden="true" className="discussion-composer-spinner" size={12} /><span className="sr-only" role="status">{d('addingAttachment')}</span></>}
          {attachment.status === "failed" && <Button aria-label={ui("重试添加 {0}", {0: attachment.name})} className="discussion-composer-attachment-retry" disabled={unavailable} onClick={() => { void uploadAttachment(attachment); }} size="icon-xs" title={ui("重试")} type="button" variant="ghost"><RotateCcw aria-hidden="true" size={12} /></Button>}
          <Button aria-label={ui("移除附件 {0}", {0: attachment.name})} className="discussion-composer-attachment-remove" disabled={unavailable} onClick={() => removeAttachment(attachment.id)} size="icon-xs" title={d('removeAttachment')} type="button" variant="ghost"><X aria-hidden="true" size={12} /></Button>
        </>} />
        <span className="discussion-composer-attachment-copy"><strong>{attachment.name}</strong>{attachment.status === "failed" && <small role="alert">{ui(attachment.error ?? "")}</small>}</span>
      </li>;
    })}</ul>}
    <footer className="discussion-composer-footer">
      <div className="discussion-composer-tools">
        <PersonPicker ariaLabel={d('mention')} className="discussion-composer-person-trigger" disabled={unavailable} finalFocus={restoreEditorFocus} members={members} menuLabel={d('mention')} onChange={choosePerson} onOpenChange={(open, details) => { if (open) rememberSelection(); returnFocusRef.current = details?.reason !== "outside-press" && details?.reason !== "focus-out"; pickerOpenRef.current = open; setPickerOpen(open); }} open={pickerOpen} triggerVariant="mention" value="" />
        <DropdownMenu onOpenChange={open => { if (open) attachmentSelectedRef.current = false; }}>
          <DropdownMenuTrigger aria-label={d('addAttachment')} className="discussion-composer-attachment-source" disabled={unavailable} ref={filePickerTriggerRef} title={d('addAttachment')} type="button"><Paperclip aria-hidden="true" size={16} /><span>{d('attachments')}</span></DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="discussion-composer-attachment-menu" finalFocus={() => { if (attachmentSelectedRef.current) { attachmentSelectedRef.current = false; returnFocusRef.current = true; return restoreEditorFocus(); } return filePickerTriggerRef.current; }} side="top">
            <DropdownMenuGroup className="flex flex-col gap-1">
              <DropdownMenuItem onClick={() => uploadInputRef.current?.click()}><Paperclip aria-hidden="true" size={16} />{ui("上传本地文件")}</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="px-3 py-2"><FolderOpen aria-hidden="true" size={16} />{ui("从文件列表选择")}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent aria-label={d('selectTaskFiles')} className="discussion-composer-file-menu"><DiscussionFileMenu files={files} onSelect={chooseExistingFile} selectedIds={new Set(session.attachments.flatMap(item => item.node ? [item.node.id] : []))} /></DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {onConnectAi && <Button aria-label={ui("连接 AI：当前回复草稿")} className="discussion-composer-ai-trigger" disabled={unavailable} onClick={event => onConnectAi(sessionRef.current.draft.body, event.currentTarget)} size="icon-sm" title={d('connectAi')} type="button" variant="ai"><Sparkles aria-hidden="true" size={15} /></Button>}
      </div>
      <span className="discussion-composer-actions">{showShortcutHint && <span className="discussion-composer-hint" id={hintId}>Enter ↵ · ⌘/Ctrl+Enter {actionLabel}</span>}{onCancel && <button className="discussion-composer-cancel" disabled={unavailable} onClick={onCancel} type="button">{d('cancel')}</button>}<button aria-label={actionLabel} className="discussion-composer-submit" disabled={!canSubmit} onClick={() => { void submit(); }} type="button"><span>{submitting ? d('posting') : actionLabel}</span>{submitting ? <LoaderCircle aria-hidden="true" className="discussion-composer-spinner" size={14} /> : <Send aria-hidden="true" size={14} />}</button></span>
    </footer>
    <input aria-label={d('uploadSelection')} hidden multiple onChange={event => { addUploads(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ""; }} ref={uploadInputRef} type="file" />
    {error && <p className="discussion-composer-error" role="alert">{ui(error)}</p>}
  </div>;
}
