import type { TaskActivityMock, TaskFileNode } from "../data/taskDetailMocks.ts";
import { parseTaskActivityStore } from "./taskActivity.ts";

export type AttachmentRef = { fileId: string; version: number; name: string };
export type MessageQuote = { messageId: string; text: string; author: string };
export type CollaborationMessage = TaskActivityMock & {
  attachmentRefs?: AttachmentRef[];
  mentionedPrincipalIds?: string[];
  fileThreadId?: string;
  updatedAt?: string;
  deletedAt?: string;
  quote?: MessageQuote;
};
export type FileDiscussionThread = {
  id: string;
  fileId: string;
  version: number;
  quote: string;
  documentText: string;
  selectionStart?: number;
  selectionEnd?: number;
  pageIndex?: number;
  createdBy: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
};
export type DiscussionDraft = { body: string; mentions: string[]; attachments: TaskFileNode[]; quote?: MessageQuote };

export function getVisibleFileDiscussionThreads(threads: FileDiscussionThread[], messages: CollaborationMessage[]): FileDiscussionThread[] {
  const visibleThreadIds = new Set(messages.filter(message => !message.deletedAt && message.fileThreadId).map(message => message.fileThreadId));
  return threads.filter(thread => visibleThreadIds.has(thread.id));
}
export type CollaborationPerson = { id: string; name: string };
export type CollaborationNotification = {
  id: string;
  recipientId: string;
  messageId: string;
  actor: string;
  reason: "reply" | "mention";
  createdAt: string;
};
export type CollaborationSnapshot = {
  revision: number;
  files: TaskFileNode[];
  messages: CollaborationMessage[];
  threads: FileDiscussionThread[];
  notifications: CollaborationNotification[];
};
export type CollaborationStorage = Pick<Storage, "getItem" | "setItem">;
export type CollaborationMessagePatch = Pick<Partial<CollaborationMessage>, "message" | "mentionedPrincipalIds" | "quote" | "attachmentRefs">;
export const TASK_COLLABORATION_STORAGE_PREFIX = "agentdoor-task-collaboration:";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isId = (value: unknown): value is string => isString(value) && value.trim().length > 0;
const isVersion = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
const isRevision = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const isTime = (value: unknown): value is string => isString(value) && Number.isFinite(Date.parse(value));
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
function requireValid(condition: unknown, detail: string): asserts condition {
  if (!condition) throw new Error(`协作记录损坏：${detail}。`);
}
function uniqueRecords<T extends { id: string }>(items: T[], label: string): T[] {
  requireValid(new Set(items.map(item => item.id)).size === items.length, `${label}标识重复`);
  return items;
}
function parseFile(value: unknown): TaskFileNode {
  requireValid(isRecord(value) && isId(value.id) && (value.kind === "file" || value.kind === "folder")
    && isString(value.name) && (value.parentId === null || isId(value.parentId)) && isString(value.updatedAt), "文件信息无效");
  for (const field of ["content", "format", "iconName", "mimeType", "sizeLabel", "blobId", "originalName"]) {
    requireValid(value[field] === undefined || isString(value[field]), "文件内容无效");
  }
  requireValid(value.version === undefined || isVersion(value.version), "文件版本无效");
  requireValid(value.sizeBytes === undefined || isRevision(value.sizeBytes), "附件大小无效");
  requireValid(value.archived === undefined || typeof value.archived === "boolean", "文件归档状态无效");
  requireValid(value.blob === undefined, "附件应先转换为可保存的数据");
  if (value.previewData !== undefined) {
    const preview = value.previewData;
    requireValid(isRecord(preview), "文件预览无效");
    if (["markdown", "text", "document"].includes(preview.kind as string)) requireValid(isString(preview.text), "文本预览无效");
    else if (preview.kind === "pdf") requireValid(isStrings(preview.pages), "PDF 预览无效");
    else if (preview.kind === "image") requireValid(isString(preview.alt) && isString(preview.src), "图片预览无效");
    else if (preview.kind === "table") requireValid(Array.isArray(preview.sheets) && preview.sheets.every(sheet => isRecord(sheet) && isString(sheet.name) && isStrings(sheet.columns)
      && Array.isArray(sheet.rows) && sheet.rows.every(isStrings)), "表格预览无效");
    else requireValid(false, "文件预览类型无效");
  }
  return structuredClone(value) as TaskFileNode;
}
function parseFiles(value: unknown): TaskFileNode[] {
  requireValid(Array.isArray(value), "缺少文件列表");
  return uniqueRecords(value.map(parseFile), "文件");
}
function parseQuote(value: unknown): MessageQuote {
  requireValid(isRecord(value) && isId(value.messageId) && isString(value.text) && isId(value.author), "引用消息无效");
  return { messageId: value.messageId, text: value.text, author: value.author };
}
function parseMessage(value: unknown): CollaborationMessage {
  requireValid(isRecord(value), "消息无效");
  const base = parseTaskActivityStore({ messages: [value] }).messages?.[0];
  requireValid(base && isId(base.author), "消息内容无效");
  const result: CollaborationMessage = { ...base };
  if (value.attachmentRefs !== undefined) {
    requireValid(Array.isArray(value.attachmentRefs), "附件引用无效");
    result.attachmentRefs = value.attachmentRefs.map(ref => {
      requireValid(isRecord(ref) && isId(ref.fileId) && isVersion(ref.version) && isString(ref.name), "附件引用或源版本无效");
      return { fileId: ref.fileId, version: ref.version, name: ref.name };
    });
  }
  if (value.mentionedPrincipalIds !== undefined) {
    requireValid(isStrings(value.mentionedPrincipalIds) && value.mentionedPrincipalIds.every(isId), "提及成员无效");
    result.mentionedPrincipalIds = [...new Set(value.mentionedPrincipalIds)];
  }
  if (value.fileThreadId !== undefined) {
    requireValid(isId(value.fileThreadId), "文件讨论标识无效");
    result.fileThreadId = value.fileThreadId;
  }
  for (const field of ["updatedAt", "deletedAt"] as const) {
    if (value[field] !== undefined) {
      requireValid(isTime(value[field]), "消息修改时间无效");
      result[field] = value[field];
    }
  }
  if (value.quote !== undefined) result.quote = parseQuote(value.quote);
  return result;
}
function parseThread(value: unknown): FileDiscussionThread {
  requireValid(isRecord(value) && isId(value.id) && isId(value.fileId) && isVersion(value.version)
    && isString(value.quote) && isString(value.documentText) && isId(value.createdBy) && isTime(value.createdAt), "文件讨论来源无效");
  const result: FileDiscussionThread = { id: value.id, fileId: value.fileId, version: value.version, quote: value.quote, documentText: value.documentText, createdBy: value.createdBy, createdAt: value.createdAt };
  if (value.pageIndex !== undefined) {
    requireValid(isRevision(value.pageIndex), "文件讨论页码无效");
    result.pageIndex = value.pageIndex;
  }
  if (value.selectionStart !== undefined || value.selectionEnd !== undefined) {
    requireValid(isRevision(value.selectionStart) && isRevision(value.selectionEnd) && value.selectionStart <= value.selectionEnd
      && value.selectionEnd <= value.documentText.length, "文件讨论选择位置无效");
    result.selectionStart = value.selectionStart;
    result.selectionEnd = value.selectionEnd;
  }
  if (value.resolvedAt !== undefined || value.resolvedBy !== undefined) {
    requireValid(isTime(value.resolvedAt) && isId(value.resolvedBy), "讨论解决状态无效");
    result.resolvedAt = value.resolvedAt;
    result.resolvedBy = value.resolvedBy;
  }
  return result;
}
function parseNotification(value: unknown): CollaborationNotification {
  requireValid(isRecord(value) && isId(value.id) && isId(value.recipientId) && isId(value.messageId) && isId(value.actor)
    && (value.reason === "reply" || value.reason === "mention") && isTime(value.createdAt), "本地通知无效");
  return { id: value.id, recipientId: value.recipientId, messageId: value.messageId, actor: value.actor, reason: value.reason, createdAt: value.createdAt };
}
function parseSnapshot(value: unknown): CollaborationSnapshot {
  requireValid(isRecord(value) && isRevision(value.revision) && Array.isArray(value.messages) && Array.isArray(value.threads) && Array.isArray(value.notifications), "快照结构无效");
  return {
    revision: value.revision,
    files: parseFiles(value.files),
    messages: uniqueRecords(value.messages.map(parseMessage), "消息"),
    threads: uniqueRecords(value.threads.map(parseThread), "文件讨论"),
    notifications: uniqueRecords(value.notifications.map(parseNotification), "通知"),
  };
}
function storageKey(scopeKey: string): string {
  if (!scopeKey.trim()) throw new Error("缺少团队与任务标识，不能读取或保存协作记录。");
  return `${TASK_COLLABORATION_STORAGE_PREFIX}${encodeURIComponent(scopeKey)}`;
}
function readStored(storage: Pick<CollaborationStorage, "getItem">, scopeKey: string): CollaborationSnapshot | null {
  let raw: string | null;
  try { raw = storage.getItem(storageKey(scopeKey)); }
  catch (cause) { throw new Error("无法读取本地协作记录，已停止保存以保护原记录。", { cause }); }
  if (raw === null) return null;
  try { return parseSnapshot(JSON.parse(raw)); }
  catch (cause) { throw new Error("本地协作记录损坏，已保留原数据并停止覆盖。", { cause }); }
}

export function createCollaborationSnapshot(seedFiles: TaskFileNode[]): CollaborationSnapshot {
  return { revision: 0, files: parseFiles(seedFiles), messages: [], threads: [], notifications: [] };
}
export function loadCollaboration(storage: Pick<CollaborationStorage, "getItem">, scopeKey: string, seedFiles: TaskFileNode[]): CollaborationSnapshot {
  return readStored(storage, scopeKey) ?? createCollaborationSnapshot(seedFiles);
}
/** One synchronous storage write owns both message and files. Publish returned state only after success. */
export function saveCollaboration(storage: CollaborationStorage, scopeKey: string, expectedRevision: number, next: CollaborationSnapshot): CollaborationSnapshot {
  const checked = parseSnapshot(next);
  const current = readStored(storage, scopeKey);
  const serialized = JSON.stringify(checked);
  if (!isRevision(expectedRevision) || checked.revision !== expectedRevision + 1) throw new Error("协作版本无效，请重新载入最新记录后保存。");
  if (current?.revision === checked.revision && JSON.stringify(current) === serialized) return current;
  if ((current?.revision ?? 0) !== expectedRevision) throw new Error("协作记录已变化，请重新载入最新记录后重试。");
  try {
    storage.setItem(storageKey(scopeKey), serialized);
    if (storage.getItem(storageKey(scopeKey)) !== serialized) throw new Error("保存后的记录校验失败。");
  } catch (cause) { throw new Error("协作记录未确认保存，请保留输入和附件后重试。", { cause }); }
  return checked;
}
function changed(snapshot: CollaborationSnapshot, patch: Partial<Omit<CollaborationSnapshot, "revision">>): CollaborationSnapshot {
  if (!isRevision(snapshot.revision) || !isRevision(snapshot.revision + 1)) throw new Error("协作版本无效。");
  return { ...snapshot, ...patch, revision: snapshot.revision + 1 };
}
function requireDiscussion(message: CollaborationMessage): void {
  if (message.type !== "member-post" && message.type !== "member-reply") throw new Error("此操作仅适用于成员讨论消息。");
}
function requireBody(message: CollaborationMessage): void {
  if (!message.message.trim() && !message.attachmentRefs?.length) throw new Error("请填写消息或添加附件。");
}
function makeNotifications(context: readonly CollaborationMessage[], message: CollaborationMessage, people: readonly CollaborationPerson[]): CollaborationNotification[] {
  const byId = new Map(people.map(person => [person.id, person]));
  const ownIds = new Set(people.filter(person => person.name === message.author || person.id === message.author).map(person => person.id));
  const recipients = new Map<string, "reply" | "mention">();
  const target = message.replyToActivityId ? context.find(item => item.id === message.replyToActivityId) : undefined;
  const replyAuthor = target?.author ?? (message.quote?.messageId === message.replyToActivityId ? message.quote?.author : undefined);
  if (replyAuthor && replyAuthor !== message.author) {
    const recipient = people.find(person => person.name === replyAuthor || person.id === replyAuthor);
    if (recipient && !ownIds.has(recipient.id)) recipients.set(recipient.id, "reply");
  }
  for (const id of message.mentionedPrincipalIds ?? []) {
    if (byId.has(id) && !ownIds.has(id) && !recipients.has(id)) recipients.set(id, "mention");
  }
  return [...recipients].map(([recipientId, reason]) => ({ id: `local:${encodeURIComponent(message.id)}:${encodeURIComponent(recipientId)}`, recipientId, messageId: message.id, actor: message.author, reason, createdAt: message.createdAt ?? new Date().toISOString() }));
}
/** Existing references keep their source version even if the file has since changed. */
function attachFiles(snapshot: CollaborationSnapshot, refs: readonly AttachmentRef[], attachments: readonly TaskFileNode[], preservedRefs: readonly AttachmentRef[] = []): { files: TaskFileNode[]; attachmentRefs: AttachmentRef[] } {
  const files = [...snapshot.files];
  const attachmentRefs = refs.map(ref => ({ ...ref }));
  for (const value of attachments) {
    const attachment = parseFile(value);
    if (attachment.kind !== "file") throw new Error("只能把文件添加为附件。");
    const existing = files.find(item => item.id === attachment.id);
    if (existing?.kind === "folder") throw new Error("附件标识与文件夹冲突。");
    const saved = existing ?? attachment;
    if (!existing) {
      if (saved.archived) throw new Error("已归档的文件不能添加为附件。");
      files.push(saved);
    }
    if (attachmentRefs.some(ref => ref.fileId === saved.id)) continue;
    if (saved.archived) throw new Error("已归档的文件不能添加为附件。");
    attachmentRefs.push({ fileId: saved.id, version: saved.version ?? 1, name: saved.name });
  }
  for (const ref of attachmentRefs) {
    if (preservedRefs.some(item => item.fileId === ref.fileId && item.version === ref.version)) continue;
    const source = files.find(item => item.id === ref.fileId && item.kind === "file");
    if (!source) throw new Error("附件文件已删除或不存在，请重新选择。");
    if (source.archived) throw new Error("已归档的文件不能添加为附件。");
  }
  return { files, attachmentRefs };
}
export function postCollaborationMessage(snapshot: CollaborationSnapshot, input: {
  message: CollaborationMessage;
  attachments?: TaskFileNode[];
  thread?: FileDiscussionThread;
  visiblePeople?: readonly CollaborationPerson[];
  contextMessages?: readonly CollaborationMessage[];
}): CollaborationSnapshot {
  if (snapshot.messages.some(item => item.id === input.message.id)) return snapshot;
  const message = parseMessage(input.message);
  requireDiscussion(message);
  if (message.deletedAt) throw new Error("不能发布已删除的消息。");
  if (message.replyToActivityId === message.id) throw new Error("消息不能回复自身。");
  const context = mergeCollaborationMessages(input.contextMessages ?? [], snapshot.messages);
  const parent = context.find(item => item.id === message.replyToActivityId);
  if (parent) {
    if (parent.deletedAt) throw new Error("该消息已删除，不能新增直接回复。");
    if (message.fileThreadId && message.fileThreadId !== parent.fileThreadId) throw new Error("回复不能跨越文件讨论。");
    if (parent.fileThreadId) message.fileThreadId = parent.fileThreadId;
  }
  const { files, attachmentRefs } = attachFiles(snapshot, message.attachmentRefs ?? [], input.attachments ?? []);
  if (attachmentRefs.length) message.attachmentRefs = attachmentRefs;
  requireBody(message);
  const threads = [...snapshot.threads];
  if (input.thread) {
    const thread = parseThread(input.thread);
    if (message.fileThreadId !== thread.id) throw new Error("消息与文件讨论来源不一致。");
    const existing = threads.find(item => item.id === thread.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(thread)) throw new Error("已有文件讨论来源不能被覆盖。");
    if (!existing) {
      const source = files.find(item => item.id === thread.fileId && item.kind === "file");
      if (!source || thread.version !== (source.version ?? 1)) throw new Error("文件来源版本已变化，请重新选择正文后评论。");
      if (thread.createdBy !== message.author) throw new Error("文件讨论创建人与消息作者不一致。");
      threads.push(thread);
    }
  }
  if (message.fileThreadId && !threads.some(item => item.id === message.fileThreadId)) throw new Error("文件讨论不存在。");
  return changed(snapshot, { files, messages: [...snapshot.messages, message], threads, notifications: [...snapshot.notifications, ...makeNotifications(context, message, input.visiblePeople ?? [])] });
}
function authoredMessage(snapshot: CollaborationSnapshot, message: CollaborationMessage, actor: string): CollaborationMessage {
  const current = parseMessage(snapshot.messages.find(item => item.id === message.id) ?? message);
  requireDiscussion(current);
  if (actor !== current.author) throw new Error("只有消息作者本人可以修改或删除消息。");
  return current;
}
function overrideMessage(snapshot: CollaborationSnapshot, message: CollaborationMessage, files = snapshot.files): CollaborationSnapshot {
  return changed(snapshot, { files, messages: snapshot.messages.some(item => item.id === message.id)
    ? snapshot.messages.map(item => item.id === message.id ? message : item) : [...snapshot.messages, message] });
}
export function updateCollaborationMessage(snapshot: CollaborationSnapshot, message: CollaborationMessage, actor: string, patch: CollaborationMessagePatch, attachments: TaskFileNode[] = []): CollaborationSnapshot {
  const current = authoredMessage(snapshot, message, actor);
  if (current.deletedAt) throw new Error("已删除的消息不能编辑。");
  const next = parseMessage({
    ...current,
    ...(patch.message !== undefined ? { message: patch.message } : {}),
    ...(patch.mentionedPrincipalIds !== undefined ? { mentionedPrincipalIds: patch.mentionedPrincipalIds } : {}),
    ...(patch.attachmentRefs !== undefined ? { attachmentRefs: patch.attachmentRefs } : {}),
    ...(Object.hasOwn(patch, "quote") ? { quote: patch.quote } : {}),
    updatedAt: new Date().toISOString(),
  });
  const merged = attachFiles(snapshot, next.attachmentRefs ?? [], attachments, current.attachmentRefs ?? []);
  if (merged.attachmentRefs.length || next.attachmentRefs !== undefined) next.attachmentRefs = merged.attachmentRefs;
  requireBody(next);
  return overrideMessage(snapshot, next, merged.files);
}
export function deleteCollaborationMessage(snapshot: CollaborationSnapshot, message: CollaborationMessage, actor: string): CollaborationSnapshot {
  const current = authoredMessage(snapshot, message, actor);
  if (current.deletedAt) return snapshot;
  return overrideMessage(snapshot, { ...current, message: "", deletedAt: new Date().toISOString() });
}
export function setFileThreadResolved(snapshot: CollaborationSnapshot, threadId: string, actor: string, resolved: boolean, canManage = false): CollaborationSnapshot {
  const thread = snapshot.threads.find(item => item.id === threadId);
  if (!thread) throw new Error("文件讨论不存在。");
  if (!isId(actor) || (thread.createdBy !== actor && !canManage)) throw new Error("只有讨论创建人或有管理权限的成员可以解决或重开讨论。");
  const { resolvedAt: _resolvedAt, resolvedBy: _resolvedBy, ...open } = thread;
  const next = resolved ? { ...open, resolvedAt: new Date().toISOString(), resolvedBy: actor } : open;
  return changed(snapshot, { threads: snapshot.threads.map(item => item.id === threadId ? next : item) });
}
export function replaceCollaborationFiles(snapshot: CollaborationSnapshot, files: TaskFileNode[]): CollaborationSnapshot {
  return changed(snapshot, { files: parseFiles(files) });
}
/** Seed history stays visible; local edits/deletions override their original records by ID. */
export function mergeCollaborationMessages(seed: readonly TaskActivityMock[], overrides: readonly CollaborationMessage[]): CollaborationMessage[] {
  const merged = new Map<string, CollaborationMessage>();
  for (const message of seed) if (!merged.has(message.id)) merged.set(message.id, message);
  for (const message of overrides) merged.set(message.id, message);
  return [...merged.values()];
}
