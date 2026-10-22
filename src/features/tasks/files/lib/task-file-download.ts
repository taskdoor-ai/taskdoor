import type { TaskFileNode } from "@/shared/model/task-model";
import { getTaskFileContent } from "@/features/tasks/files/lib/task-file-editing";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";
import { readDiscussionBlob } from "@/features/tasks/files/lib/discussion-uploads";

/** A file's text is downloaded as it reads; other files by their kept bytes. */
const downloadsText = (file: TaskFileNode) => {
  const kind = getPreviewKind(file.name, file.mimeType);
  const hasSource = file.content !== undefined || Boolean(file.previewData && "text" in file.previewData);
  return hasSource && getTaskFileContent(file)?.kind === "text" && ["markdown", "text", "json", "xml", "html"].includes(kind);
};

const imageSource = (file: TaskFileNode): string | undefined => getPreviewKind(file.name, file.mimeType) === "image" && file.previewData?.kind === "image" ? file.previewData.src.trim() || undefined : undefined;

export const canDownload = (file: TaskFileNode) => file.kind === "file" && Boolean(file.blobId || downloadsText(file) || imageSource(file));

/** Saves the selected saved version, never its editor draft. */
export async function downloadTaskFile(file: TaskFileNode): Promise<string> {
  try {
    if (!canDownload(file)) return "附件原文件无法读取，请重新上传。";
    const content = getTaskFileContent(file);
    const kind = getPreviewKind(file.name, file.mimeType);
    const textMime = kind === "json" ? "application/json;charset=utf-8" : kind === "xml" ? "application/xml;charset=utf-8" : file.mimeType || (kind === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8");
    let blob: Blob | null;
    if (content?.kind === "text" && downloadsText(file)) blob = new Blob([content.text], { type: textMime });
    else if (file.blobId) blob = await readDiscussionBlob(file.blobId);
    else {
      const response = await fetch(imageSource(file)!, { credentials: "omit", redirect: "error" });
      if (!response.ok) return "附件原文件无法读取，请重新上传。";
      blob = await response.blob();
      if (!blob.size) return "附件原文件无法读取，请重新上传。";
    }
    if (!blob) return "附件原文件无法读取，请重新上传。";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "";
  } catch (failure) { return failure instanceof Error ? failure.message : "下载失败，请重试。"; }
}
