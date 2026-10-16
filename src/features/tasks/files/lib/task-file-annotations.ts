import type { TaskFileNode } from "@/shared/model/task-model.ts";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";

export type TaskFileAnnotationAnchor = {
  kind: "text" | "region" | "file";
  location: string;
  quote?: string;
  documentText?: string;
  selectionStart?: number;
  selectionEnd?: number;
  pageIndex?: number;
  region?: { x: number; y: number; width: number; height: number };
  imageSrc?: string;
  screenshot?: string;
  elementLabel?: string;
  elementSelector?: string;
};

/** A PDF selection may carry a crop box while its authoritative anchor is text. */
export function getTaskFileSelectionAnchor(selection: Omit<TaskFileAnnotationAnchor, "kind" | "quote"> & { text: string }): TaskFileAnnotationAnchor {
  const textRange = Boolean(selection.text.trim()) && selection.selectionStart !== undefined && selection.selectionEnd !== undefined;
  const kind = textRange || !selection.region ? "text" : "region";
  const anchor: TaskFileAnnotationAnchor = { kind, location: selection.location, quote: selection.text };
  for (const key of ["documentText", "selectionStart", "selectionEnd", "pageIndex", "imageSrc", "screenshot", "elementLabel", "elementSelector"] as const) {
    if (selection[key] !== undefined) Object.assign(anchor, { [key]: selection[key] });
  }
  if (kind === "region") anchor.region = selection.region;
  return anchor;
}

export type TaskFileAnnotationReply = {
  id: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  body: string;
};

export type TaskFileAnnotation = TaskFileAnnotationReply & {
  taskId: string;
  fileId: string;
  fileName: string;
  version: number;
  anchor: TaskFileAnnotationAnchor;
  source: TaskFileNode;
  replies?: TaskFileAnnotationReply[];
};

type AnnotationStorage = Pick<Storage, "getItem" | "setItem">;
type NewReply = Omit<TaskFileAnnotationReply, "id" | "createdAt"> & { id?: string; createdAt?: string };
export const TASK_FILE_ANNOTATIONS_STORAGE_PREFIX = "agentdoor-task-file-annotations:";
export const TASK_FILE_ANNOTATION_SCREENSHOT_MAX_BYTES = 2 * 1024 * 1024;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string");
const isVersion = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
const isOffset = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const validTime = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));

function parseSource(value: unknown): TaskFileNode {
  const version = isObject(value) ? value.version ?? 1 : undefined;
  if (!isObject(value) || value.kind !== "file" || !nonempty(value.id) || !nonempty(value.name)
    || !(value.parentId === null || typeof value.parentId === "string") || typeof value.updatedAt !== "string"
    || !isVersion(version)) throw new Error("标注的源文件快照损坏。 ");
  const source: TaskFileNode = { id: value.id, kind: "file", name: value.name, parentId: value.parentId, updatedAt: value.updatedAt, version };
  for (const key of ["blobId", "originalName", "content", "format", "iconName", "mimeType", "sizeLabel"] as const) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== "string") throw new Error("标注的源文件快照损坏。 ");
      source[key] = value[key];
    }
  }
  if (value.sizeBytes !== undefined) {
    if (!isOffset(value.sizeBytes)) throw new Error("标注的源文件大小无效。 ");
    source.sizeBytes = value.sizeBytes;
  }
  if (value.archived !== undefined) {
    if (typeof value.archived !== "boolean") throw new Error("标注的源文件状态无效。 ");
    source.archived = value.archived;
  }
  if (value.previewData !== undefined) {
    const preview = value.previewData;
    if (!isObject(preview)) throw new Error("标注的源文件预览损坏。 ");
    if (["markdown", "text", "document"].includes(String(preview.kind)) && typeof preview.text === "string") {
      source.previewData = { kind: preview.kind as "markdown" | "text" | "document", text: preview.text };
    } else if (preview.kind === "pdf" && isStrings(preview.pages)) {
      source.previewData = { kind: "pdf", pages: [...preview.pages] };
    } else if (preview.kind === "table" && Array.isArray(preview.sheets)) {
      source.previewData = { kind: "table", sheets: preview.sheets.map(sheet => {
        if (!isObject(sheet) || typeof sheet.name !== "string" || !isStrings(sheet.columns)
          || !Array.isArray(sheet.rows) || !sheet.rows.every(isStrings)) throw new Error("标注的源文件表格损坏。 ");
        return { name: sheet.name, columns: [...sheet.columns], rows: sheet.rows.map(row => [...row]) };
      }) };
    } else if (preview.kind === "image" && nonempty(preview.src) && typeof preview.alt === "string") {
      source.previewData = { kind: "image", src: preview.src, alt: preview.alt };
      for (const key of ["width", "height"] as const) {
        if (preview[key] !== undefined) {
          if (typeof preview[key] !== "number" || !Number.isFinite(preview[key]) || preview[key] <= 0) throw new Error("标注的源文件图片尺寸无效。 ");
          source.previewData[key] = preview[key];
        }
      }
    } else throw new Error("标注的源文件预览损坏。 ");
  }
  return source;
}

export function getTaskFileAnnotationSourceText(source: TaskFileNode, pageIndex?: number): string {
  const preview = source.previewData;
  if (preview && "text" in preview) return preview.text;
  if (preview?.kind === "pdf") return pageIndex === undefined ? preview.pages.map((page, index) => `第 ${index + 1} 页\n${page}`).join("\n\n") : preview.pages[pageIndex] ?? "";
  if (preview?.kind === "table") return preview.sheets.map(sheet => [sheet.name, sheet.columns.join("\t"), ...sheet.rows.map(row => row.join("\t"))].join("\n")).join("\n\n");
  return source.content ?? "";
}

/** Offsets distinguish identical passages. A legacy quote is safe only when unique. */
export function resolveTaskFileAnnotationTextRange(anchor: TaskFileAnnotationAnchor, text: string): { start: number; end: number } | null {
  if (anchor.kind !== "text" || !nonempty(anchor.quote)) return null;
  if (anchor.selectionStart !== undefined || anchor.selectionEnd !== undefined) {
    const { selectionStart: start, selectionEnd: end } = anchor;
    return isOffset(start) && isOffset(end) && end > start && end <= text.length && text.slice(start, end) === anchor.quote ? { start, end } : null;
  }
  const start = text.indexOf(anchor.quote);
  return start >= 0 && text.indexOf(anchor.quote, start + 1) === -1 ? { start, end: start + anchor.quote.length } : null;
}

function parseScreenshot(value: unknown): string {
  if (typeof value !== "string") throw new Error("标注截图格式无效，只支持 PNG 或 JPEG 图片。");
  const match = value.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length % 4 !== 0) throw new Error("标注截图格式无效，只支持 PNG 或 JPEG data URL。");
  const payload = match[2];
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  const size = payload.length / 4 * 3 - padding;
  if (!size || size > TASK_FILE_ANNOTATION_SCREENSHOT_MAX_BYTES) throw new Error("标注截图大小必须在 2 MiB 以内。");
  const prefix = atob(payload.slice(0, 16));
  const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => prefix.charCodeAt(index) === byte);
  const isJpeg = prefix.charCodeAt(0) === 255 && prefix.charCodeAt(1) === 216 && prefix.charCodeAt(2) === 255;
  if (match[1] === "png" ? !isPng : !isJpeg) throw new Error("标注截图内容与 PNG 或 JPEG 图片格式不一致。");
  return value;
}

function parseAnchor(value: unknown, source: TaskFileNode): TaskFileAnnotationAnchor {
  if (!isObject(value) || !["text", "region", "file"].includes(String(value.kind)) || !nonempty(value.location)) throw new Error("标注位置无效。 ");
  const anchor: TaskFileAnnotationAnchor = { kind: value.kind as TaskFileAnnotationAnchor["kind"], location: value.location };
  for (const key of ["quote", "documentText", "imageSrc"] as const) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== "string") throw new Error("标注原文或截图无效。 ");
      anchor[key] = value[key];
    }
  }
  if (value.screenshot !== undefined) anchor.screenshot = parseScreenshot(value.screenshot);
  for (const [key, maxLength] of [["elementLabel", 200], ["elementSelector", 1000]] as const) {
    if (value[key] !== undefined) {
      if (!nonempty(value[key]) || value[key].length > maxLength) throw new Error("标注元素来源标签或选择器无效。");
      anchor[key] = value[key];
    }
  }
  for (const key of ["selectionStart", "selectionEnd", "pageIndex"] as const) {
    if (value[key] !== undefined) {
      if (!isOffset(value[key])) throw new Error("标注选区或页码无效。 ");
      anchor[key] = value[key];
    }
  }
  const sourceKind = getPreviewKind(source.name, source.mimeType);
  const pageRegion = anchor.kind === "region" && (sourceKind === "pdf" || sourceKind === "presentation");
  if (pageRegion && anchor.pageIndex === undefined) throw new Error("PDF或演示文稿的区域标注必须包含准确页码。");
  if (pageRegion && (anchor.selectionStart !== undefined || anchor.selectionEnd !== undefined)) throw new Error("页区域标注不能使用文本选区偏移。");
  // Original-page regions use the rendered original's page, not a text fixture's count.
  if (anchor.pageIndex !== undefined && source.previewData?.kind === "pdf" && !(pageRegion && source.blobId) && anchor.pageIndex >= source.previewData.pages.length) throw new Error("标注页码超出源文件。 ");
  if (anchor.kind === "text" && !resolveTaskFileAnnotationTextRange(anchor, anchor.documentText ?? getTaskFileAnnotationSourceText(source, anchor.pageIndex))) throw new Error("标注选区与原文不一致，或重复原文缺少准确选区。 ");
  if (value.region !== undefined || anchor.kind === "region") {
    const region = value.region;
    if (anchor.kind !== "region" || !isObject(region) || !["x", "y", "width", "height"].every(key => typeof region[key] === "number" && Number.isFinite(region[key]))) throw new Error("图片标注区域无效。 ");
    const { x, y, width, height } = region as TaskFileAnnotationAnchor["region"] & {};
    if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 + Number.EPSILON || y + height > 1 + Number.EPSILON) throw new Error("图片标注区域必须位于原图内。 ");
    anchor.region = { x, y, width, height };
  }
  return anchor;
}

function parseReply(value: unknown): TaskFileAnnotationReply {
  if (!isObject(value) || !nonempty(value.id) || !nonempty(value.authorId) || !nonempty(value.authorName) || !validTime(value.createdAt) || !nonempty(value.body)) throw new Error("标注意见、作者或时间无效。 ");
  return { id: value.id, authorId: value.authorId, authorName: value.authorName, createdAt: value.createdAt, body: value.body };
}

function parseAnnotation(value: unknown): TaskFileAnnotation {
  const reply = parseReply(value);
  if (!isObject(value) || !nonempty(value.taskId) || !nonempty(value.fileId) || !nonempty(value.fileName) || !isVersion(value.version)) throw new Error("标注的任务、文件或版本无效。 ");
  const source = parseSource(value.source);
  if (source.id !== value.fileId || source.name !== value.fileName || source.version !== value.version || source.archived) throw new Error("标注与源文件快照版本不一致。 ");
  const annotation: TaskFileAnnotation = { ...reply, taskId: value.taskId, fileId: value.fileId, fileName: value.fileName, version: value.version, anchor: parseAnchor(value.anchor, source), source };
  if (value.replies !== undefined) {
    if (!Array.isArray(value.replies)) throw new Error("标注回复记录无效。 ");
    const ids = new Set<string>();
    annotation.replies = value.replies.map(item => {
      const parsed = parseReply(item);
      if (ids.has(parsed.id)) throw new Error("标注回复标识重复。 ");
      ids.add(parsed.id);
      return parsed;
    });
  }
  return annotation;
}

function parseAnnotations(value: unknown, taskId: string): TaskFileAnnotation[] {
  if (!Array.isArray(value)) throw new Error("标注记录应为列表。 ");
  const ids = new Set<string>();
  return value.map(item => {
    const annotation = parseAnnotation(item);
    if (annotation.taskId !== taskId || ids.has(annotation.id)) throw new Error("标注任务不一致或标识重复。 ");
    ids.add(annotation.id);
    return annotation;
  });
}

export function createTaskFileAnnotation(input: NewReply & { taskId: string; file: TaskFileNode; version?: number; anchor: TaskFileAnnotationAnchor }): TaskFileAnnotation {
  const source = parseSource(input.file);
  if (source.archived) throw new Error("源文件已归档，不能新增标注。 ");
  const version = input.version ?? source.version!;
  if (version !== source.version) throw new Error("文件版本已变化，请打开当前已保存版本后标注。 ");
  return parseAnnotation({ id: input.id ?? globalThis.crypto.randomUUID(), createdAt: input.createdAt ?? new Date().toISOString(), taskId: input.taskId,
    fileId: source.id, fileName: source.name, version, authorId: input.authorId, authorName: input.authorName, body: input.body, anchor: input.anchor, source });
}

export function deleteTaskFileAnnotation(annotations: TaskFileAnnotation[], id: string, actorId: string): TaskFileAnnotation[] {
  const existing = annotations.find(item => item.id === id);
  if (!existing) throw new Error("标注不存在，请重新打开文件。 ");
  if (existing.authorId !== actorId) throw new Error("只有标注作者可以删除这条意见。 ");
  return annotations.filter(item => item.id !== id);
}

/** Correct the author's opinion without moving the original fixed-version anchor. */
export function updateTaskFileAnnotationBody(annotations: TaskFileAnnotation[], id: string, actorId: string, body: string): TaskFileAnnotation[] {
  const existing = annotations.find(item => item.id === id);
  if (!existing) throw new Error("标注不存在，请重新打开文件。");
  if (existing.authorId !== actorId) throw new Error("只有标注作者可以编辑这条意见。");
  if (!nonempty(body)) throw new Error("标注意见正文不能为空。");
  return annotations.map(item => item.id === id ? parseAnnotation({ ...item, body }) : item);
}

function storageKey(taskId: string): string {
  if (!nonempty(taskId)) throw new Error("缺少任务标识，不能读取或保存标注。 ");
  return `${TASK_FILE_ANNOTATIONS_STORAGE_PREFIX}${encodeURIComponent(taskId)}`;
}

export function readTaskFileAnnotations(storage: Pick<AnnotationStorage, "getItem">, taskId: string): TaskFileAnnotation[] {
  const key = storageKey(taskId);
  let raw: string | null;
  try { raw = storage.getItem(key); }
  catch (cause) { throw new Error("无法读取本地标注记录，已停止保存以保护原记录。", { cause }); }
  if (raw === null) return [];
  try { return parseAnnotations(JSON.parse(raw), taskId); }
  catch (cause) { throw new Error("本地标注记录损坏，已保留原数据并停止覆盖。", { cause }); }
}

/** Validate an in-memory annotation session without reading or writing storage. */
export function validateTaskFileAnnotations(taskId: string, current: TaskFileAnnotation[], annotations: TaskFileAnnotation[], options: { actorId: string; files: TaskFileNode[] }): TaskFileAnnotation[] {
  const next = parseAnnotations(annotations, taskId);
  if (!nonempty(options.actorId)) throw new Error("缺少当前标注作者，不能保存。 ");
  for (const previous of current) {
    const retained = next.find(item => item.id === previous.id);
    if (!retained) {
      if (previous.authorId !== options.actorId) throw new Error("只有标注作者可以删除这条意见。 ");
      continue;
    }
    const { replies: previousReplies = [], body: previousBody, ...previousOpinion } = previous;
    const { replies: retainedReplies = [], body: retainedBody, ...retainedOpinion } = retained;
    if (JSON.stringify(previousOpinion) !== JSON.stringify(retainedOpinion)) throw new Error("已添加标注的位置、版本、作者和源文件不可覆盖，请新增意见。");
    if (retainedBody !== previousBody && previous.authorId !== options.actorId) throw new Error("只有标注作者可以编辑这条意见。");
    if (JSON.stringify(previousReplies) !== JSON.stringify(retainedReplies)) throw new Error("标注不支持新增或修改回复，旧记录仅保留历史。请使用文件讨论沟通。");
  }
  for (const added of next.filter(item => !current.some(previous => previous.id === item.id))) {
    if (added.authorId !== options.actorId || (added.replies ?? []).some(reply => reply.authorId !== options.actorId)) throw new Error("只能以本人身份添加标注。 ");
    if (added.replies?.length) throw new Error("标注不支持回复，请使用文件讨论沟通。");
    const file = options.files.find(item => item.id === added.fileId && item.kind === "file" && !item.archived);
    if (!file) throw new Error("源文件已删除或归档，不能添加标注。 ");
    if (added.version !== (file.version ?? 1) || JSON.stringify(added.source) !== JSON.stringify(parseSource(file))) throw new Error("文件版本或已保存内容已变化，请重新打开当前版本后标注。 ");
  }
  return next;
}

/** Legacy records remain readable; active annotation sessions do not use this storage API. */
export function saveTaskFileAnnotations(storage: AnnotationStorage, taskId: string, annotations: TaskFileAnnotation[], options: { actorId: string; files: TaskFileNode[] }): void {
  const next = validateTaskFileAnnotations(taskId, readTaskFileAnnotations(storage, taskId), annotations, options);
  const key = storageKey(taskId);
  const value = JSON.stringify(next);
  try {
    storage.setItem(key, value);
    if (storage.getItem(key) !== value) throw new Error("保存后的标注记录校验失败。 ");
  } catch (cause) { throw new Error("标注意见未确认保存，请保留当前输入并重试。", { cause }); }
}

function fenced(text: string): string {
  const runs = text.match(/`+/g) ?? [];
  const fence = "`".repeat(Math.max(3, ...runs.map(run => run.length + 1)));
  return `${fence}text\n${text}\n${fence}`;
}

export function buildFileAnnotationContext(input: { taskId: string; taskTitle: string; taskGoal?: string; annotations: TaskFileAnnotation[]; selectedIds: readonly string[]; files: TaskFileNode[]; locale?: string }): { markdown: string; items: TaskFileAnnotation[] } {
  const english = input.locale === "en";
  const copy = (zh: string, en: string) => english ? en : zh;
  const field = (zh: string, en: string, value: string) => `${copy(zh, en)}${english ? ": " : "："}${value}`;
  const annotations = parseAnnotations(input.annotations, input.taskId);
  const ids = [...new Set(input.selectedIds)];
  if (!ids.length) throw new Error("请至少选择一条已添加的标注意见。 ");
  const items = ids.map(id => {
    const item = annotations.find(annotation => annotation.id === id);
    if (!item) throw new Error("所选标注意见已不存在，请重新选择。 ");
    if (!input.files.some(file => file.id === item.fileId && file.kind === "file" && !file.archived)) throw new Error(`源文件「${item.fileName}」已删除或归档，当前不可交接。`);
    return item;
  });
  const lines = [copy("# 文件修订意见", "# File revision feedback"), "", field("任务", "Task", input.taskTitle), field("任务标识", "Task ID", input.taskId)];
  if (input.taskGoal?.trim()) lines.push(field("任务目标", "Task goal", input.taskGoal));
  lines.push(copy(`本次选择：${items.length} 条标注意见`, `Selected annotations: ${items.length}`), "", copy(
    "请依据以下固定版本的源文件快照和意见原文理解修订要求。不同版本的锚点不能合并或迁移；如修改当前新版，请先核对对应内容。TaskDoor 保存文件和协作意见，修改由本地 Agent 执行；连接 Agent 不代表意见已处理。",
    "Use the fixed-version source snapshots and original opinions below to understand the requested revisions. Anchors from different versions must not be merged or moved; check the matching content before changing the current version. TaskDoor stores files and collaboration opinions; the local Agent performs revisions. Connecting an Agent does not mean an opinion has been addressed."), "");
  if (items.some(item => item.source.blobId || item.source.previewData?.kind === "image")) lines.push(copy(
    "以下正文快照可以作为修订上下文。图片预览引用和 TaskDoor 内部存储标识不会自动将原文件字节传给本地 Agent。需要图片或其他二进制原材料时，先在 TaskDoor 下载修订包，解压后读取包内的本地文件；不假定存在 CLI 标注接口。",
    "The text snapshots below can be used as revision context. Image preview references and internal TaskDoor storage IDs do not automatically send original file bytes to a local Agent. For images or other binary source materials, first download the revision bundle in TaskDoor, extract it, and read the included local files. No CLI annotation endpoint is assumed."), "");
  for (const [index, item] of items.entries()) {
    const current = input.files.find(file => file.id === item.fileId)!;
    lines.push(`## ${index + 1}. ${item.fileName}`, "", `- ${field("标注标识", "Annotation ID", item.id)}`, `- ${field("文件标识", "File ID", item.fileId)}`,
      copy(`- 固定版本：v${item.version}；当前文件版本：v${current.version ?? 1}`, `- Fixed version: v${item.version}; current file version: v${current.version ?? 1}`),
      `- ${field("提出者", "Author", english ? `${item.authorName} (${item.authorId})` : `${item.authorName}（${item.authorId}）`)}`,
      `- ${field("提出时间", "Created at", item.createdAt)}`, `- ${field("修改位置", "Location", item.anchor.location)}`);
    if (item.anchor.pageIndex !== undefined) lines.push(copy(`- 页码：第 ${item.anchor.pageIndex + 1} 页`, `- Page: ${item.anchor.pageIndex + 1}`));
    if (item.anchor.selectionStart !== undefined) lines.push(copy(`- 文本选区：${item.anchor.selectionStart}–${item.anchor.selectionEnd}（从 0 开始，结束位置不包含）`, `- Text selection: ${item.anchor.selectionStart}–${item.anchor.selectionEnd} (zero-based, end exclusive)`));
    if (item.anchor.region) {
      const { x, y, width, height } = item.anchor.region;
      const regionLabel = item.anchor.pageIndex !== undefined ? copy("页内区域（相对本页，范围 0–1）", "Page region (relative to this page, range 0–1)") : item.anchor.elementSelector ? copy("HTML 区域（相对标注时预览画布，范围 0–1）", "HTML region (relative to the preview at annotation time, range 0–1)") : copy("图片区域（相对原图，范围 0–1）", "Image region (relative to the original image, range 0–1)");
      lines.push(`- ${regionLabel}${english ? ": " : "："}x=${x}${english ? ", " : "，"}y=${y}${english ? ", " : "，"}width=${width}${english ? ", " : "，"}height=${height}`);
    }
    if (item.anchor.elementLabel) lines.push(`- ${field("元素来源", "Source element", item.anchor.elementLabel)}`);
    if (item.anchor.elementSelector) lines.push(`- ${field("元素选择器", "Element selector", item.anchor.elementSelector)}`);
    if (item.anchor.quote && !(item.anchor.kind === "region" && item.anchor.pageIndex !== undefined)) lines.push("", copy("### 对应原文", "### Referenced text (original)"), "", fenced(item.anchor.quote));
    if (item.anchor.screenshot) lines.push("", copy("### 标注局部截图", "### Annotation detail screenshot"), "", `![${item.anchor.location}](${item.anchor.screenshot})`);
    if (item.anchor.imageSrc) lines.push("", copy("### 标注图片", "### Annotated image preview"), "", `![${item.anchor.location}](${item.anchor.imageSrc})`);
    lines.push("", copy("### 修改意见（原文）", "### Opinion (original)"), "", fenced(item.body));
    lines.push("", copy("### 源文件已保存内容快照", "### Saved source-content snapshot"), "", field("文件", "File", `${item.source.name} · v${item.version}`));
    if (item.source.blobId) lines.push(copy(
      `TaskDoor 内部存储标识：${item.source.blobId}（不是本地文件路径，本地 Agent 不能直接通过此标识读取文件）。先在 TaskDoor 下载修订包，解压后读取包内的本地文件。`,
      `Internal TaskDoor storage ID: ${item.source.blobId} (a local Agent cannot use this ID as a local file path). First download the revision bundle in TaskDoor, extract it, and read the included local files.`));
    const content = english && item.source.previewData?.kind === "pdf"
      ? item.source.previewData.pages.map((page, index) => `Page ${index + 1}\n${page}`).join("\n\n")
      : getTaskFileAnnotationSourceText(item.source);
    if (content) lines.push("", fenced(content));
    if (item.source.previewData?.kind === "image") lines.push("", `![${item.source.previewData.alt || item.source.name}](${item.source.previewData.src})`);
    if (!content && item.source.previewData?.kind !== "image") lines.push("", copy("此文件没有提取出的正文；请先在 TaskDoor 下载修订包，解压后读取包内的本地材料，再执行修订。", "No text was extracted from this file. First download the revision bundle in TaskDoor, extract it, and read the included local materials before performing revisions."));
    if (item.anchor.documentText) lines.push("", copy("### 标注时预览文本快照", "### Preview-text snapshot at annotation time"), "", fenced(item.anchor.documentText));
    lines.push("");
  }
  return { markdown: lines.join("\n"), items };
}
