import type { TaskFileNode } from "../data/taskDetailMocks.ts";
import { getPreviewKind } from "./taskFileTree.ts";

export type TaskFileContent =
  | { kind: "text"; text: string }
  | { kind: "pdf"; pages: string[] }
  | { kind: "table"; sheets: Array<{ name: string; columns: string[]; rows: string[][] }> };

export type TaskFileRevision = {
  id: string;
  author: string;
  createdAt: string;
  baseVersion: number;
  version: number;
  changes: Array<{ location: string; before: string; after: string }>;
};

export type TaskFileEditRecord = {
  fileId: string;
  content: TaskFileContent;
  version: number;
  revisions: TaskFileRevision[];
};

type FileStorage = Pick<Storage, "getItem" | "setItem">;
type FileChange = TaskFileRevision["changes"][number];
export const TASK_FILE_EDITS_STORAGE_PREFIX = "agentdoor-task-file-edits:";

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string");
const isVersion = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
const validTime = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));

function parseContent(value: unknown): TaskFileContent {
  if (isObject(value)) {
    if (value.kind === "text" && typeof value.text === "string") return { kind: "text", text: value.text };
    if (value.kind === "pdf" && isStrings(value.pages)) return { kind: "pdf", pages: [...value.pages] };
    if (value.kind === "table" && Array.isArray(value.sheets)) return {
      kind: "table",
      sheets: value.sheets.map(sheet => {
        if (!isObject(sheet) || typeof sheet.name !== "string" || !isStrings(sheet.columns)
          || !Array.isArray(sheet.rows) || !sheet.rows.every(isStrings)) throw new Error("文件编辑记录损坏：表格内容不完整。");
        return { name: sheet.name, columns: [...sheet.columns], rows: sheet.rows.map(row => [...row]) };
      }),
    };
  }
  throw new Error("文件编辑记录损坏：正文格式无效。");
}

/** Never fill gaps with preview fixtures: absence of extracted PDF/table data is read-only. */
export function getTaskFileContent(file: TaskFileNode): TaskFileContent | null {
  if (file.kind !== "file") return null;
  const kind = getPreviewKind(file.name, file.mimeType);
  if (kind === "image" || kind === "unknown") return null;
  if (kind === "pdf") return file.previewData?.kind === "pdf" ? parseContent(file.previewData) : null;
  if (kind === "table") return file.previewData?.kind === "table" ? parseContent(file.previewData) : null;
  if (file.blobId && file.content == null && !(file.previewData && "text" in file.previewData)) return null;
  return { kind: "text", text: file.previewData && "text" in file.previewData ? file.previewData.text : file.content ?? "" };
}

function isExactIsoDateTime(value: string): boolean {
  const date = value.match(/^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/);
  if (!date || !validTime(value)) return false;
  const year = Number(date[1]);
  const month = Number(date[2]);
  const day = Number(date[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1];
}

/** The matching saved version is authoritative; legacy labels stay literal. */
export function getTaskFileLastUpdate(file: TaskFileNode, revisions: TaskFileRevision[]): { author: string | null; updatedAt: string; isExact: boolean } {
  const revision = revisions.find(item => item.version === (file.version ?? 1));
  if (revision) return { author: revision.author, updatedAt: revision.createdAt, isExact: true };
  return { author: null, updatedAt: file.updatedAt, isExact: isExactIsoDateTime(file.updatedAt) };
}

function lineChanges(before: string, after: string, prefix = ""): FileChange[] {
  if (before === after) return [];
  const oldLines = before === "" ? [] : before.split("\n");
  const newLines = after === "" ? [] : after.split("\n");
  let start = 0;
  while (start < oldLines.length && start < newLines.length && oldLines[start] === newLines[start]) start++;
  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (oldEnd > start && newEnd > start && oldLines[oldEnd - 1] === newLines[newEnd - 1]) { oldEnd--; newEnd--; }
  const left = oldLines.slice(start, oldEnd);
  const right = newLines.slice(start, newEnd);
  // Bound the comparison allocation for large documents. Preserve the exact changed
  // range in one record instead of allocating a quadratic matrix without a limit.
  if ((left.length + 1) * (right.length + 1) > 1_000_000) return [{
    location: `${prefix}第 ${start + 1}–${Math.max(oldEnd, newEnd)} 行`,
    before: left.join("\n"), after: right.join("\n"),
  }];

  const lengths = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));
  for (let oldIndex = left.length - 1; oldIndex >= 0; oldIndex--) {
    for (let newIndex = right.length - 1; newIndex >= 0; newIndex--) {
      lengths[oldIndex][newIndex] = left[oldIndex] === right[newIndex]
        ? lengths[oldIndex + 1][newIndex + 1] + 1
        : Math.max(lengths[oldIndex + 1][newIndex], lengths[oldIndex][newIndex + 1]);
    }
  }
  const changes: FileChange[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < left.length || newIndex < right.length) {
    if (oldIndex < left.length && newIndex < right.length && left[oldIndex] === right[newIndex]) { oldIndex++; newIndex++; continue; }
    const oldStart = oldIndex;
    const newStart = newIndex;
    const removed: string[] = [];
    const added: string[] = [];
    while (oldIndex < left.length || newIndex < right.length) {
      if (oldIndex < left.length && newIndex < right.length && left[oldIndex] === right[newIndex]) break;
      if (oldIndex < left.length && (newIndex === right.length || lengths[oldIndex + 1][newIndex] >= lengths[oldIndex][newIndex + 1])) removed.push(left[oldIndex++]);
      else added.push(right[newIndex++]);
    }
    for (let index = 0; index < Math.max(removed.length, added.length); index++) {
      const deleted = index >= added.length;
      const inserted = index >= removed.length;
      const line = start + (deleted ? oldStart : newStart) + index + 1;
      const suffix = deleted ? "（原文）" : inserted && added[index] === "" ? "（新增空行）" : "";
      changes.push({ location: `${prefix}第 ${line} 行${suffix}`, before: removed[index] ?? "", after: added[index] ?? "" });
    }
  }
  return changes;
}

function columnName(index: number): string {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) name = String.fromCharCode(65 + (value - 1) % 26) + name;
  return name;
}

function contentChanges(before: TaskFileContent, after: TaskFileContent): FileChange[] {
  if (before.kind === "text" && after.kind === "text") return lineChanges(before.text, after.text);
  if (before.kind === "pdf" && after.kind === "pdf") {
    return Array.from({ length: Math.max(before.pages.length, after.pages.length) }, (_, index) => {
      const changes = lineChanges(before.pages[index] ?? "", after.pages[index] ?? "", `第 ${index + 1} 页 · `);
      if (!changes.length && (index >= before.pages.length || index >= after.pages.length)) changes.push({ location: `第 ${index + 1} 页`, before: before.pages[index] ?? "", after: after.pages[index] ?? "" });
      return changes;
    }).flat();
  }
  if (before.kind === "table" && after.kind === "table") {
    const changes: FileChange[] = [];
    for (let index = 0; index < Math.max(before.sheets.length, after.sheets.length); index++) {
      const oldSheet = before.sheets[index];
      const newSheet = after.sheets[index];
      if (oldSheet?.name !== newSheet?.name) changes.push({ location: `工作表 ${index + 1} 名称`, before: oldSheet?.name ?? "", after: newSheet?.name ?? "" });
      const name = newSheet?.name ?? oldSheet?.name ?? `工作表 ${index + 1}`;
      const oldRows = oldSheet ? [oldSheet.columns, ...oldSheet.rows] : [];
      const newRows = newSheet ? [newSheet.columns, ...newSheet.rows] : [];
      for (let row = 0; row < Math.max(oldRows.length, newRows.length); row++) {
        const oldCells = oldRows[row] ?? [];
        const newCells = newRows[row] ?? [];
        for (let column = 0; column < Math.max(oldCells.length, newCells.length); column++) {
          if (oldCells[column] !== newCells[column]) changes.push({ location: `${name} · ${columnName(column)}${row + 1}`, before: oldCells[column] ?? "", after: newCells[column] ?? "" });
        }
        if (oldCells.length === 0 && newCells.length === 0 && (row >= oldRows.length || row >= newRows.length)) changes.push({ location: `${name} · 第 ${row + 1} 行`, before: "", after: "" });
      }
    }
    return changes;
  }
  throw new Error("不能通过正文编辑转换文件格式。");
}

export function createTaskFileRevision(file: TaskFileNode, content: TaskFileContent, author: string, createdAt = new Date().toISOString()): TaskFileEditRecord | null {
  const before = getTaskFileContent(file);
  const next = parseContent(content);
  if (!before || before.kind !== next.kind) throw new Error("此文件格式不支持当前正文编辑，不能转换文件格式。");
  const changes = contentChanges(before, next);
  if (changes.length === 0) return null;
  if (!author.trim()) throw new Error("文件修改人不能为空。");
  if (!validTime(createdAt)) throw new Error("文件修改时间无效。");
  const baseVersion = file.version ?? 1;
  if (!isVersion(baseVersion) || !isVersion(baseVersion + 1)) throw new Error("文件版本无效。");
  const version = baseVersion + 1;
  return {
    fileId: file.id,
    content: next,
    version,
    revisions: [{ id: globalThis.crypto.randomUUID(), author, createdAt, baseVersion, version, changes }],
  };
}

function parseRecord(value: unknown): TaskFileEditRecord {
  if (!isObject(value) || typeof value.fileId !== "string" || !value.fileId.trim() || !isVersion(value.version)
    || !Array.isArray(value.revisions) || value.revisions.length === 0) throw new Error("文件编辑记录损坏：缺少文件或版本信息。");
  const ids = new Set<string>();
  const versions = new Set<number>();
  const revisions = value.revisions.map((revision): TaskFileRevision => {
    if (!isObject(revision) || typeof revision.id !== "string" || !revision.id.trim() || ids.has(revision.id)
      || typeof revision.author !== "string" || !revision.author.trim() || !validTime(revision.createdAt)
      || !isVersion(revision.baseVersion) || !isVersion(revision.version) || revision.version !== revision.baseVersion + 1
      || revision.version > (value.version as number) || versions.has(revision.version)
      || !Array.isArray(revision.changes) || revision.changes.length === 0) throw new Error("文件编辑记录损坏：修改历史无效。");
    ids.add(revision.id);
    versions.add(revision.version);
    const changes = revision.changes.map((change): FileChange => {
      if (!isObject(change) || typeof change.location !== "string" || !change.location.trim()
        || typeof change.before !== "string" || typeof change.after !== "string") throw new Error("文件编辑记录损坏：修改位置或前后值无效。");
      return { location: change.location, before: change.before, after: change.after };
    });
    return { id: revision.id, author: revision.author, createdAt: revision.createdAt, baseVersion: revision.baseVersion, version: revision.version, changes };
  });
  if (!versions.has(value.version)) throw new Error("文件编辑记录损坏：当前版本缺少对应修改记录。");
  return { fileId: value.fileId, content: parseContent(value.content), version: value.version, revisions };
}

export function applyTaskFileEdit(file: TaskFileNode, record: TaskFileEditRecord): TaskFileNode {
  const saved = parseRecord(record);
  if (saved.fileId !== file.id) throw new Error("文件编辑记录不属于当前文件。");
  if (saved.version < (file.version ?? 1)) throw new Error("本地文件修改早于当前来源版本，已保留较新的来源正文，不能用旧版本覆盖。");
  const before = getTaskFileContent(file);
  if (!before || before.kind !== saved.content.kind) throw new Error("文件编辑记录与当前文件格式不符。");
  const latest = saved.revisions.find(revision => revision.version === saved.version)!;
  if (saved.content.kind === "text") {
    const kind = getPreviewKind(file.name, file.mimeType);
    const previewKind = kind === "markdown" || kind === "document" ? kind : "text";
    return { ...file, content: saved.content.text, previewData: { kind: previewKind, text: saved.content.text }, version: saved.version, updatedAt: latest.createdAt };
  }
  const content = saved.content.kind === "pdf" ? saved.content.pages.join("\n\n")
    : saved.content.sheets.map(sheet => [sheet.name, sheet.columns.join("\t"), ...sheet.rows.map(row => row.join("\t"))].join("\n")).join("\n\n");
  return { ...file, content, previewData: saved.content, version: saved.version, updatedAt: latest.createdAt };
}

function storageKey(taskId: string): string {
  if (!taskId.trim()) throw new Error("缺少任务标识，不能读取或保存文件。");
  return `${TASK_FILE_EDITS_STORAGE_PREFIX}${encodeURIComponent(taskId)}`;
}

export function readTaskFileEdits(storage: Pick<FileStorage, "getItem">, taskId: string): Record<string, TaskFileEditRecord> {
  const key = storageKey(taskId);
  let raw: string | null;
  try { raw = storage.getItem(key); }
  catch (cause) { throw new Error("无法读取本地文件修改记录，已停止保存以保护原记录。", { cause }); }
  if (raw === null) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!isObject(value)) throw new Error("记录应为文件映射。");
    return Object.fromEntries(Object.entries(value).map(([fileId, input]) => {
      const record = parseRecord(input);
      if (record.fileId !== fileId) throw new Error("文件标识不匹配。");
      return [fileId, record];
    }));
  } catch (cause) { throw new Error("本地文件修改记录损坏，已保留原数据并停止覆盖。", { cause }); }
}

/** A single task snapshot is one synchronous storage write; publish UI state only after success. */
export function saveTaskFileEdit(storage: FileStorage, taskId: string, record: TaskFileEditRecord, expectedVersion: number): void {
  const next = parseRecord(record);
  const current = readTaskFileEdits(storage, taskId);
  const previous = Object.hasOwn(current, next.fileId) ? current[next.fileId] : undefined;
  if (!isVersion(expectedVersion) || next.version !== expectedVersion + 1 || (previous && previous.version !== expectedVersion)) throw new Error("文件版本已变化，请重新打开最新版本后再保存。");
  if (previous && previous.content.kind !== next.content.kind) throw new Error("文件格式已变化，不能覆盖现有内容。");
  // The caller merges history. Refuse accidental historical erasure instead of
  // reporting success with a silently different record from the caller's state.
  if (previous && previous.revisions.some(revision => !next.revisions.some(item => JSON.stringify(item) === JSON.stringify(revision)))) throw new Error("保存记录缺少已有版本历史，请重新打开文件后重试。");
  const value = JSON.stringify({ ...current, [next.fileId]: next });
  const key = storageKey(taskId);
  try {
    storage.setItem(key, value);
    if (storage.getItem(key) !== value) throw new Error("保存后的文件记录校验失败。");
  } catch (cause) { throw new Error("文件修改未确认保存，请保留当前输入并重试。", { cause }); }
}
