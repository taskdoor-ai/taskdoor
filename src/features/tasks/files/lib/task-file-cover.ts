import type { TaskFileNode } from "@/shared/model/task-model";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";

const blobIds = new WeakMap<Blob, number>();
let nextBlobId = 0;
export function taskFileThumbnailKey(file: TaskFileNode, originalBlob?: Blob): string {
  if (originalBlob && !blobIds.has(originalBlob)) blobIds.set(originalBlob, ++nextBlobId);
  const kind = getPreviewKind(file.name, file.mimeType);
  const key = [file.blobId ?? (originalBlob ? `draft-blob:${blobIds.get(originalBlob)}` : file.id), file.version ?? 1, kind, file.previewData?.kind === "image" ? file.previewData.src : ""];
  if (kind === "video") key.push("picture-frame-v2");
  return JSON.stringify(key);
}

export function hasTaskFileVisualCover(file: TaskFileNode): boolean {
  if (file.previewData?.kind === "image" && file.previewData.src) return true;
  return ["image", "video", "pdf", "presentation"].includes(getPreviewKind(file.name, file.mimeType));
}

/** Bounded, ordered probes skip blank intros without playing audio/video. */
export function taskVideoCoverTimes(duration: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [0];
  const last = Math.max(0, duration - 0.04);
  return [...new Set([0.05, 0.35, 1, duration * 0.25, duration * 0.5, duration * 0.75, duration * 0.9, last].map(time => Math.min(last, time)))].sort((a, b) => a - b);
}

export function hasVideoFramePicture(pixels: Uint8ClampedArray): boolean {
  let count = 0;
  const sums = [0, 0, 0], squares = [0, 0, 0], minimums = [255, 255, 255], maximums = [0, 0, 0];
  for (let index = 0; index + 3 < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) continue;
    count++;
    for (let channel = 0; channel < 3; channel++) {
      const value = pixels[index + channel];
      sums[channel] += value; squares[channel] += value * value;
      minimums[channel] = Math.min(minimums[channel], value); maximums[channel] = Math.max(maximums[channel], value);
    }
  }
  if (!count) return false;
  // Contrast, rather than brightness, preserves light text/dark subjects and equal-luminance colors.
  // A small range/variance floor ignores codec noise in otherwise solid frames.
  return sums.some((sum, channel) => maximums[channel] - minimums[channel] >= 20
    && Math.sqrt(Math.max(0, squares[channel] / count - (sum / count) ** 2)) >= 6);
}
