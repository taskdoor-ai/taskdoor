import type { TaskFileNode } from "../data/taskDetailMocks";

export const DISCUSSION_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const DISCUSSION_UPLOAD_MAX_FILES = 10;

const databaseName = "agentdoor-discussion-uploads";
const blobStoreName = "blobs";
type StoredDiscussionBlob = { id: string; blob: Blob; createdAt: number };
let databasePromise: Promise<IDBDatabase> | undefined;

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
  const known: Record<string, string> = { md: "text/markdown", txt: "text/plain", log: "text/plain", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  return known[extension] ?? (file.type || "application/octet-stream");
}

/** Stages the original binary locally. Publishing owns adding this node to a task. */
export async function prepareDiscussionUpload(file: File): Promise<TaskFileNode> {
  if (file.size > DISCUSSION_UPLOAD_MAX_BYTES) throw new Error(`「${file.name}」超过单个附件 20 MiB 的限制。`);
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
    sizeLabel: file.size < 1024 ? `${file.size} B` : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KiB` : `${(file.size / (1024 * 1024)).toFixed(1)} MiB`,
    updatedAt: "刚刚",
    version: 1,
    blobId,
  };
  if (["md", "txt", "log"].includes(extension)) {
    const content = await file.text();
    node.content = content;
    node.previewData = { kind: extension === "md" ? "markdown" : "text", text: content };
  }
  await storeBlob(await openDatabase(), { id: blobId, blob: file, createdAt: Date.now() });
  return node;
}

/** Returns null for an absent binary; a storage error remains a retryable error. */
export async function readDiscussionBlob(blobId: string): Promise<Blob | null> {
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
