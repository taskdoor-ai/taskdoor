import type { TaskFileNode } from "@/shared/model/task-model";
import type { RenderTask } from "pdfjs-dist";
import { readDiscussionBlob } from "@/features/tasks/files/lib/discussion-uploads";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";
import { hasVideoFramePicture, taskVideoCoverTimes } from "@/features/tasks/files/lib/task-file-cover";
import { prepareTaskPresentationPreview, readCachedTaskPresentationPreview } from "@/features/tasks/files/lib/task-presentation-preview-cache";

const cancelled = () => new DOMException("Aborted", "AbortError");
function assertActive(signal: AbortSignal) { if (signal.aborted) throw cancelled(); }

function waitForMedia(media: HTMLVideoElement, event: string, signal: AbortSignal, act?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timeout); media.removeEventListener(event, ready); media.removeEventListener("error", failed); signal.removeEventListener("abort", aborted);
      if (error) reject(error); else resolve();
    };
    const ready = () => finish();
    const failed = () => finish(new Error("Video cover unavailable"));
    const aborted = () => finish(cancelled());
    const timeout = setTimeout(() => finish(new Error("Video cover timed out")), 6000);
    media.addEventListener(event, ready, { once: true }); media.addEventListener("error", failed, { once: true }); signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) aborted(); else act?.();
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.84));
}

async function videoCover(blob: Blob, signal: AbortSignal): Promise<Blob | null> {
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const url = URL.createObjectURL(blob.slice(0, blob.size, "video/mp4"));
  video.muted = true; video.preload = "auto"; video.playsInline = true;
  try {
    await waitForMedia(video, "loadeddata", signal, () => { video.src = url; video.load(); });
    assertActive(signal);
    if (!video.videoWidth || !video.videoHeight) return null;
    const scale = Math.min(1, 360 / video.videoWidth, 240 / video.videoHeight);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    for (const time of taskVideoCoverTimes(video.duration)) {
      assertActive(signal);
      if (Math.abs(video.currentTime - time) > 0.005) await waitForMedia(video, "seeked", signal, () => { video.currentTime = time; });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (hasVideoFramePicture(context.getImageData(0, 0, canvas.width, canvas.height).data)) return await canvasBlob(canvas);
    }
    return null;
  } finally {
    video.pause(); video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url); canvas.width = 0; canvas.height = 0;
  }
}

async function pdfCover(blob: Blob, signal: AbortSignal): Promise<Blob | null> {
  const { loadTaskPdfDocument } = await import("@/features/tasks/files/lib/task-pdf-runtime");
  assertActive(signal);
  const loading = loadTaskPdfDocument(new Uint8Array(await blob.arrayBuffer()));
  const canvas = document.createElement("canvas");
  let renderTask: RenderTask | undefined;
  const abort = () => { renderTask?.cancel(); void loading.destroy().catch(() => {}); };
  loading.onPassword = () => { void loading.destroy().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    const pdf = await loading.promise;
    assertActive(signal);
    const page = await pdf.getPage(1);
    const natural = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(360 / natural.width, 260 / natural.height) });
    canvas.width = Math.max(1, Math.round(viewport.width)); canvas.height = Math.max(1, Math.round(viewport.height));
    renderTask = page.render({ canvas, viewport, background: "#ffffff" });
    await renderTask.promise;
    assertActive(signal);
    return await canvasBlob(canvas);
  } finally {
    signal.removeEventListener("abort", abort); renderTask?.cancel(); await loading.destroy().catch(() => {}); canvas.width = 0; canvas.height = 0;
  }
}

async function embeddedPresentationCover(blob: Blob, signal: AbortSignal): Promise<Blob | null> {
  const { unzipSync } = await import("fflate");
  assertActive(signal);
  try {
    const thumbnails = unzipSync(new Uint8Array(await blob.arrayBuffer()), { filter: entry => /^docProps\/thumbnail\.(?:jpe?g|png)$/i.test(entry.name) && entry.originalSize <= 4 * 1024 * 1024 });
    const [entry] = Object.entries(thumbnails);
    return entry ? new Blob([new Uint8Array(entry[1])], { type: /\.png$/i.test(entry[0]) ? "image/png" : "image/jpeg" }) : null;
  } catch { return null; }
}

/** Derive real visual material, reusing the normal local presentation preview service. */
export async function renderTaskFileCover(file: TaskFileNode, signal: AbortSignal, originalBlob?: Blob): Promise<Blob | null> {
  const kind = getPreviewKind(file.name, file.mimeType);
  if (!["image", "video", "pdf", "presentation"].includes(kind)) return null;
  // Legacy edited PDF text snapshots do not represent the retained original page.
  if ((kind === "pdf" || kind === "presentation") && (file.version ?? 1) > 1) return null;
  const cachedPresentation = kind === "presentation" ? readCachedTaskPresentationPreview(file) : undefined;
  if (cachedPresentation) return pdfCover(cachedPresentation, signal);
  const blob = originalBlob ?? (file.blobId ? await readDiscussionBlob(file.blobId) : null);
  assertActive(signal);
  if (!blob) return null;
  if (kind === "image") return blob;
  if (kind === "video") return videoCover(blob, signal);
  if (kind === "pdf") return pdfCover(blob, signal);
  const embedded = await embeddedPresentationCover(blob, signal);
  if (embedded) return embedded;
  assertActive(signal);
  return pdfCover(await prepareTaskPresentationPreview(file, signal, blob), signal);
}
