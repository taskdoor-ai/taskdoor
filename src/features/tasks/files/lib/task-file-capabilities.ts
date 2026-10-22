import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";

type TaskFileCapabilitySource = { name: string; type?: string; mimeType?: string };

const uploadExtensions = ["pdf", "ppt", "pptx", "png", "jpg", "jpeg", "gif", "webp", "svg", "md", "txt", "log", "html", "htm", "json", "xml", "mp3", "mp4"] as const;
const uploadMimeTypes = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  "text/plain", "text/html", "application/xhtml+xml",
  "application/json", "application/xml", "text/xml",
  "audio/mpeg", "audio/mp3", "video/mp4",
] as const;
const extensionSet = new Set<string>(uploadExtensions);
const mimeSet = new Set<string>(uploadMimeTypes);

export const TASK_FILE_UPLOAD_ACCEPT = [...uploadExtensions.map(extension => `.${extension}`), ...uploadMimeTypes].join(",");
export const TASK_FILE_UPLOAD_EXTENSIONS_LABEL = uploadExtensions.map(extension => extension.toUpperCase()).join("、");

/** Upload support is deliberately narrower than reading existing demo material. */
export function isSupportedTaskFileUpload(file: TaskFileCapabilitySource): boolean {
  const name = file.name.trim();
  if (!name) return false;
  const dot = name.lastIndexOf(".");
  // Any explicit suffix must be supported; a MIME label cannot override it.
  if (dot >= 0) return extensionSet.has(name.slice(dot + 1).toLowerCase());
  const mime = (file.mimeType ?? file.type ?? "").toLowerCase().split(";")[0].trim();
  return mimeSet.has(mime) || /^application\/[^\s/]+\+(json|xml)$/.test(mime);
}

/** Validate the whole batch before callers begin reading or storing its files. */
export function validateTaskFileUploads(files: readonly TaskFileCapabilitySource[]): void {
  const unsupported = files.filter(file => !isSupportedTaskFileUpload(file));
  if (unsupported.length) throw new Error(`不支持上传${unsupported.map(file => `「${file.name.trim() || "未命名附件"}」`).join("、")}。支持：${TASK_FILE_UPLOAD_EXTENSIONS_LABEL}。`);
}

/** A preview snapshot never grants original-file editing to PDF or Office files. */
export function canEditTaskFile(file: TaskFileCapabilitySource): boolean {
  if (!isSupportedTaskFileUpload(file)) return false;
  const kind = getPreviewKind(file.name.trim(), file.mimeType ?? file.type);
  return kind === "markdown" || kind === "text" || kind === "html" || kind === "json" || kind === "xml";
}

/** Uploaded originals are separate files; only online-editable documents expose revisions. */
export function getTaskFileVersionLabel(file: TaskFileCapabilitySource & { version?: number; attachmentOnly?: boolean }, version = file.version ?? 1): string {
  return !file.attachmentOnly && canEditTaskFile(file) ? `v${version}` : "";
}

/** Preserve the existing document annotation formats; media is playback only. */
export function canAnnotateTaskFile(file: TaskFileCapabilitySource): boolean {
  const kind = getPreviewKind(file.name.trim(), file.mimeType ?? file.type);
  return isSupportedTaskFileUpload(file) && kind !== "audio" && kind !== "video";
}
