import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { TaskFileGlyph } from "@/features/tasks/files/components/TaskFileGlyph";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";
import { hasTaskFileVisualCover, taskFileThumbnailKey } from "@/features/tasks/files/lib/task-file-cover";
import { taskFileThumbnailCache } from "@/features/tasks/files/lib/task-file-thumbnail-cache";
import { subscribeTaskPresentationPreview } from "@/features/tasks/files/lib/task-presentation-preview-cache";
import "@/features/tasks/styles/task-file-thumbnail.css";

/** Decorative preview only; the enclosing file card owns its name and interaction. */
export function TaskFileThumbnail({ file, className, originalBlob }: { file: TaskFileNode; className?: string; originalBlob?: Blob }) {
  const kind = getPreviewKind(file.name, file.mimeType);
  const previewSource = file.previewData?.kind === "image" ? file.previewData.src : "";
  const [previewRevision, setPreviewRevision] = useState(0);
  const sourceKey = taskFileThumbnailKey(file, originalBlob);
  const pendingCover = useRef(false);
  const hostRef = useRef<HTMLSpanElement>(null);
  const [nearby, setNearby] = useState(false);
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);
  const [failedSource, setFailedSource] = useState("");
  const source = loaded?.key === sourceKey ? loaded.url : previewSource;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") { setNearby(true); return; }
    const observer = new IntersectionObserver(([entry]) => setNearby(entry.isIntersecting), { rootMargin: "180px" });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  useEffect(() => kind === "presentation" ? subscribeTaskPresentationPreview(file, () => {
    // A cover's own conversion publishes its PDF before rendering the first
    // page. Do not cancel that cover in response to its own cache event.
    if (pendingCover.current || loaded?.key === sourceKey) return;
    taskFileThumbnailCache.invalidate(sourceKey);
    setPreviewRevision(value => value + 1);
  }) : undefined, [kind, file.blobId, file.id, file.version, file.name, file.mimeType, sourceKey, loaded?.key]);
  useEffect(() => {
    if (!nearby || previewSource || !hasTaskFileVisualCover(file) || (!file.blobId && !originalBlob)) return;
    let active = true;
    pendingCover.current = true;
    let objectUrl: string | undefined;
    const request = taskFileThumbnailCache.acquire(sourceKey, async signal => {
      const { renderTaskFileCover } = await import("@/features/tasks/files/lib/render-task-file-cover");
      return renderTaskFileCover(file, signal, originalBlob);
    });
    void request.promise.then(blob => {
      if (!active || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setLoaded({ key: sourceKey, url: objectUrl });
    }).catch(() => { /* Keep an available preview, or the readable file-type fallback. */ }).finally(() => { if (active) pendingCover.current = false; });
    return () => {
      active = false;
      pendingCover.current = false;
      request.release();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [nearby, file.blobId, originalBlob, previewSource, sourceKey, previewRevision]);

  const ready = Boolean(source && failedSource !== source);
  return <span aria-hidden="true" className={`task-file-thumbnail${className ? ` ${className}` : ""}`} data-cover-kind={kind} data-cover-ready={ready || undefined} ref={hostRef}>
    {source && failedSource !== source
      ? <img alt="" className="task-file-thumbnail-image" decoding="async" draggable={false} loading="lazy" onError={() => setFailedSource(source)} src={source} />
      : <TaskFileGlyph node={file} />}
    {ready && kind === "video" && <span className="task-file-thumbnail-play"><Play fill="currentColor" size={12} /></span>}
  </span>;
}
