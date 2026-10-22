import { formatFileSize } from "@/shared/lib/file-size";
import type { TaskFileNode } from "@/shared/model/task-model";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";
import { validateTaskFileUploads } from "@/features/tasks/files/lib/task-file-capabilities";

export const DISCUSSION_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const DISCUSSION_UPLOAD_MAX_FILES = 10;

const databaseName = "agentdoor-discussion-uploads";
const blobStoreName = "blobs";
type StoredDiscussionBlob = { id: string; blob: Blob; createdAt: number };
let databasePromise: Promise<IDBDatabase> | undefined;

export const BUILTIN_TASK_ASSET_PREFIX = "builtin-task-asset:";
const builtinAssetPath = /^\/task-assets\/serum-launch\/serum-launch-(?:board\.html|budget\.xlsx|channels\.csv|playbook\.pdf|creative-brief\.docx|hero\.png)$/;
const builtinCommonAssetPaths = new Set([
  "/task-assets/serum-launch/common/serum-launch-briefing.pptx",
  "/task-assets/serum-launch/common/serum-launch-handover.txt",
  "/task-assets/serum-launch/common/serum-launch-collaboration.md",
  "/task-assets/serum-launch/common/serum-launch-snapshot.json",
  "/task-assets/serum-launch/common/serum-launch-channels.xml",
  "/task-assets/serum-launch/common/serum-launch-workflow.svg",
  "/task-assets/serum-launch/common/serum-launch-milestones.ics",
  "/task-assets/serum-launch/common/serum-launch-hero.jpg",
  "/task-assets/serum-launch/common/serum-launch-hero.webp",
  "/task-assets/serum-launch/common/serum-launch-brief.mp3",
  "/task-assets/serum-launch/common/serum-launch-overview.mp4",
  "/task-assets/serum-launch/common/serum-launch-delivery.zip",
]);

export function isBuiltinTaskAsset(blobId?: string): boolean {
  if (!blobId?.startsWith(BUILTIN_TASK_ASSET_PREFIX)) return false;
  const path = blobId.slice(BUILTIN_TASK_ASSET_PREFIX.length);
  return builtinAssetPath.test(path) || builtinCommonAssetPaths.has(path);
}

async function readBuiltinTaskAsset(blobId: string): Promise<Blob> {
  if (!isBuiltinTaskAsset(blobId)) throw new Error("内建附件路径无效。");
  const path = blobId.slice(BUILTIN_TASK_ASSET_PREFIX.length);
  // A fixed root-relative allowlist and rejected redirects keep these reads same-origin.
  const response = await fetch(path, { credentials: "same-origin", redirect: "error" });
  if (!response.ok) throw new Error("内建附件原文件无法读取，请刷新后重试。");
  const blob = await response.blob();
  if (!blob.size) throw new Error("内建附件原文件为空，请刷新后重试。");
  return blob;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("当前浏览器无法保存附件，请更换浏览器后重试。"));
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(blobStoreName)) request.result.createObjectStore(blobStoreName, { keyPath: "id" });
    };
    request.onerror = () => reject(new Error("附件保存失败，请检查浏览器存储空间后重试。"));
    request.onblocked = () => reject(new Error("附件存储暂时不可用，请关闭其他页面后重试。"));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => { database.close(); databasePromise = undefined; };
      resolve(database);
    };
  }).catch((error: unknown) => { databasePromise = undefined; throw error; });
  return databasePromise;
}

function storeBlob(database: IDBDatabase, record: StoredDiscussionBlob): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(blobStoreName, "readwrite");
    transaction.objectStore(blobStoreName).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(new Error("附件保存失败，请检查浏览器存储空间后重试。"));
  });
}

export function isDiscussionImage(file: Pick<TaskFileNode, "name" | "mimeType">): boolean {
  return /\.(png|jpe?g|gif|webp)$/i.test(file.name) || /^image\/(png|jpeg|gif|webp)$/i.test(file.mimeType ?? "");
}

function mimeTypeFor(file: File, extension: string): string {
  const previewKind = getPreviewKind(file.name.trim(), file.type);
  if (previewKind === "json" || previewKind === "xml") return `application/${previewKind}`;
  if (previewKind === "audio") return "audio/mpeg";
  if (previewKind === "video") return "video/mp4";
  if (extension === "ppt") return "application/vnd.ms-powerpoint";
  if (extension === "pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  const known: Record<string, string> = { md: "text/markdown", txt: "text/plain", log: "text/plain", html: "text/html", htm: "text/html", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  return known[extension] ?? (file.type.toLowerCase().split(";")[0].trim() || "application/octet-stream");
}

/** Stages the original binary locally. Publishing owns adding this node to a task. */
export async function prepareDiscussionUpload(file: File): Promise<TaskFileNode> {
  return stageLocalFileUpload(file, { maxBytes: DISCUSSION_UPLOAD_MAX_BYTES, limitLabel: formatFileSize(DISCUSSION_UPLOAD_MAX_BYTES, { fractionDigits: 2 }), inlineTextMaxBytes: DISCUSSION_UPLOAD_MAX_BYTES });
}

/** Shared original storage; each caller owns its capacity and bounded text extraction. */
export async function stageLocalFileUpload(file: File, { maxBytes, limitLabel, inlineTextMaxBytes }: { maxBytes: number; limitLabel: string; inlineTextMaxBytes: number }): Promise<TaskFileNode> {
  validateTaskFileUploads([file]);
  if (file.size > maxBytes) throw new Error(`「${file.name}」超过单个附件 ${limitLabel} 的限制。`);
  const name = file.name.trim() || "未命名附件";
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const blobId = `discussion-blob-${globalThis.crypto.randomUUID()}`;
  const node: TaskFileNode = {
    id: `discussion-file-${globalThis.crypto.randomUUID()}`,
    kind: "file",
    name,
    originalName: file.name,
    parentId: null,
    format: extension.toUpperCase() || "FILE",
    mimeType: mimeTypeFor(file, extension),
    sizeBytes: file.size,
    sizeLabel: formatFileSize(file.size),
    updatedAt: "刚刚",
    version: 1,
    blobId,
  };
  const previewKind = getPreviewKind(name, node.mimeType);
  if (file.size <= inlineTextMaxBytes && (previewKind === "markdown" || previewKind === "text" || previewKind === "html" || previewKind === "json" || previewKind === "xml")) {
    const content = await file.text();
    node.content = content;
    node.previewData = { kind: extension === "md" ? "markdown" : "text", text: content };
  }
  await storeBlob(await openDatabase(), { id: blobId, blob: file, createdAt: Date.now() });
  return node;
}

/** Returns null for an absent binary; a storage error remains a retryable error. */
export async function readDiscussionBlob(blobId: string): Promise<Blob | null> {
  if (blobId.startsWith(BUILTIN_TASK_ASSET_PREFIX)) return readBuiltinTaskAsset(blobId);
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(blobStoreName, "readonly");
    const request = transaction.objectStore(blobStoreName).get(blobId);
    request.onsuccess = () => resolve((request.result as StoredDiscussionBlob | undefined)?.blob ?? null);
    request.onerror = () => reject(new Error("无法读取附件，请重试。"));
    transaction.onabort = () => reject(new Error("无法读取附件，请重试。"));
  });
}

// Stored binaries may already be referenced by a published task or another draft.
// Removing a draft chip deliberately never deletes a binary from IndexedDB.
