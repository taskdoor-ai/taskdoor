import type { TaskFileNode } from "@/shared/model/task-model";
import { stageLocalFileUpload } from "@/features/tasks/files/lib/discussion-uploads";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";

/** Matches the formal task-file upload contract; discussions keep their own limit. */
export const TASK_FILE_UPLOAD_MAX_BYTES = 1024 ** 3;
export const TASK_FILE_UPLOAD_MAX_LABEL = "1GB";
const inlineTextMaxBytes = 20 * 1024 * 1024;

/** Large text keeps its downloadable original instead of eagerly extracting a full document. */
export function isTaskFileTextPreviewDeferred(file: Pick<TaskFileNode, "name" | "mimeType" | "sizeBytes">): boolean {
  return file.sizeBytes !== undefined && file.sizeBytes > inlineTextMaxBytes
    && ["markdown", "text", "html", "json", "xml"].includes(getPreviewKind(file.name, file.mimeType));
}

/** Check the entire batch before reading or staging any original. */
export function validateTaskFileUploadSizes(files: readonly Pick<File, "name" | "size">[]): void {
  for (const file of files) {
    if (!Number.isSafeInteger(file.size) || file.size < 0) throw new Error(`「${file.name}」的文件大小无效。`);
    if (file.size > TASK_FILE_UPLOAD_MAX_BYTES) throw new Error(`「${file.name}」超过单个文件 ${TASK_FILE_UPLOAD_MAX_LABEL} 的限制。`);
  }
}

export async function prepareTaskFileUpload(file: File): Promise<TaskFileNode> {
  validateTaskFileUploadSizes([file]);
  return stageLocalFileUpload(file, { maxBytes: TASK_FILE_UPLOAD_MAX_BYTES, limitLabel: TASK_FILE_UPLOAD_MAX_LABEL, inlineTextMaxBytes });
}

export function placeTaskFileUploads(files: TaskFileNode[], uploads: TaskFileNode[], parentId: string | null): TaskFileNode[] {
  if (parentId && !files.some(node => node.id === parentId && node.kind === "folder" && !node.archived)) {
    throw new Error("上传位置已不可用，请重新选择文件夹。");
  }
  const next = [...files];
  for (const node of uploads) {
    const match = node.name.match(/^(.*?)(\.[^.]*)?$/)!;
    let name = node.name;
    let suffix = 2;
    while (next.some(item => item.parentId === parentId && !item.archived && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      name = `${match[1]} (${suffix++})${match[2] ?? ""}`;
    }
    next.push({ ...node, name, parentId });
  }
  return next;
}
