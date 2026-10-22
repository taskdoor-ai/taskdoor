import type { TaskFileNode } from "@/shared/model/task-model";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";

const blobIds = new WeakMap<Blob, number>();
let nextBlobId = 0;
export function taskFileThumbnailKey(file: TaskFileNode, originalBlob?: Blob): string {
  if (originalBlob && !blobIds.has(originalBlob)) blobIds.set(originalBlob, ++nextBlobId);
  return JSON.stringify([file.blobId ?? (originalBlob ? `draft-blob:${blobIds.get(originalBlob)}` : file.id), file.version ?? 1, getPreviewKind(file.name, file.mimeType), file.previewData?.kind === "image" ? file.previewData.src : ""]);
}

export function hasTaskFileVisualCover(file: TaskFileNode): boolean {
  if (file.previewData?.kind === "image" && file.previewData.src) return true;
  return ["image", "video", "pdf", "presentation"].includes(getPreviewKind(file.name, file.mimeType));
}

/** Keep the first useful frame, skipping a black title gap without playing audio/video. */
export function taskVideoCoverTimes(duration: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [0];
  const last = Math.max(0, duration - 0.04);
  return [...new Set([0.05, 0.35, 1, duration * 0.25, duration * 0.5].map(time => Math.min(last, time)))].sort((a, b) => a - b);
}

export function hasVideoFramePicture(pixels: Uint8ClampedArray): boolean {
  let count = 0, sum = 0, squares = 0;
  for (let index = 0; index < pixels.length; index += 16) {
    if (!pixels[index + 3]) continue;
    const light = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
    count++; sum += light; squares += light * light;
  }
  if (!count) return false;
  const mean = sum / count;
  return mean > 10 || Math.sqrt(Math.max(0, squares / count - mean * mean)) > 6;
}
