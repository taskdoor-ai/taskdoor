import type { TaskFileNode } from "@/shared/model/task-model";
import { readDiscussionBlob } from "@/features/tasks/files/lib/discussion-uploads";

const cache = new Map<string, Blob>();
const listeners = new Map<string, Set<() => void>>();
type PreviewJob = { controller: AbortController; promise: Promise<Blob>; consumers: number; settled: boolean };
const jobs = new Map<string, PreviewJob>();
const cancelled = () => new DOMException("Aborted", "AbortError");

export function taskPresentationPreviewKey(file: TaskFileNode): string {
  return JSON.stringify([file.blobId ?? file.id, file.version ?? 1, file.name.split(".").pop()?.toLowerCase(), file.mimeType]);
}

export function readCachedTaskPresentationPreview(file: TaskFileNode): Blob | undefined { return cache.get(taskPresentationPreviewKey(file)); }

/** The viewer and nearby covers share the same derived, versioned PDF. */
export function cacheTaskPresentationPreview(file: TaskFileNode, pdf: Blob): void {
  const key = taskPresentationPreviewKey(file);
  cache.delete(key);
  if (pdf.size > 48 * 1024 * 1024) return;
  cache.set(key, pdf);
  let bytes = [...cache.values()].reduce((sum, blob) => sum + blob.size, 0);
  for (const [oldKey, blob] of cache) {
    if (cache.size <= 3 && bytes <= 48 * 1024 * 1024) break;
    cache.delete(oldKey); bytes -= blob.size;
  }
  listeners.get(key)?.forEach(listener => listener());
}

export function subscribeTaskPresentationPreview(file: TaskFileNode, listener: () => void): () => void {
  const key = taskPresentationPreviewKey(file);
  const set = listeners.get(key) ?? new Set<() => void>();
  set.add(listener); listeners.set(key, set);
  return () => { set.delete(listener); if (!set.size) listeners.delete(key); };
}

/** One conversion per original/version; cancelling one card cannot cancel another consumer. */
export function prepareTaskPresentationPreview(file: TaskFileNode, signal: AbortSignal, original?: Blob): Promise<Blob> {
  if (signal.aborted) return Promise.reject(cancelled());
  const cached = readCachedTaskPresentationPreview(file);
  if (cached) return Promise.resolve(cached);
  const key = taskPresentationPreviewKey(file);
  let job = jobs.get(key);
  if (!job) {
    const controller = new AbortController();
    job = { controller, promise: Promise.resolve(new Blob()), consumers: 0, settled: false };
    const current = job;
    job.promise = (async () => {
      const source = original ?? (file.blobId ? await readDiscussionBlob(file.blobId) : null);
      if (controller.signal.aborted) throw cancelled();
      if (!source) throw new Error("Presentation source unavailable");
      const mime = file.mimeType?.toLowerCase().split(";")[0].trim();
      const format = /\.ppt$/i.test(file.name) || mime === "application/vnd.ms-powerpoint" ? "ppt" : "pptx";
      const response = await fetch(`/api/task-files/presentation-preview?format=${format}`, {
        method: "POST", headers: { "Content-Type": "application/octet-stream", "X-TaskDoor-Presentation-Preview": "1" },
        body: source, signal: controller.signal,
      });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("application/pdf")) throw new Error("Presentation preview unavailable");
      const pdf = await response.blob();
      if (controller.signal.aborted) throw cancelled();
      if (!pdf.size) throw new Error("Presentation preview is empty");
      return pdf;
    })().then(pdf => {
      current.settled = true;
      cacheTaskPresentationPreview(file, pdf);
      return pdf;
    }, error => { current.settled = true; throw error; }).finally(() => { if (jobs.get(key) === current) jobs.delete(key); });
    jobs.set(key, job);
  }
  const current = job;
  current.consumers++;
  return new Promise<Blob>((resolve, reject) => {
    let finished = false;
    const release = () => {
      if (finished) return false;
      finished = true; signal.removeEventListener("abort", aborted); current.consumers--;
      if (!current.consumers && !current.settled) {
        current.controller.abort();
        if (jobs.get(key) === current) jobs.delete(key);
      }
      return true;
    };
    const aborted = () => { if (release()) reject(cancelled()); };
    signal.addEventListener("abort", aborted, { once: true });
    current.promise.then(pdf => { if (release()) resolve(pdf); }, error => { if (release()) reject(error); });
    if (signal.aborted) aborted();
  });
}
