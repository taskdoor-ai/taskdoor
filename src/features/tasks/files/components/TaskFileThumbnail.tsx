import { useEffect, useState } from "react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { TaskFileGlyph } from "@/features/tasks/files/components/TaskFileGlyph";
import { readDiscussionBlob } from "@/features/tasks/files/lib/discussion-uploads";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";
import "@/features/tasks/styles/task-file-thumbnail.css";

/** Decorative preview only; the enclosing file card owns its name and interaction. */
export function TaskFileThumbnail({ file, className }: { file: TaskFileNode; className?: string }) {
  const image = getPreviewKind(file.name, file.mimeType) === "image";
  const previewSource = file.previewData?.kind === "image" ? file.previewData.src : "";
  const sourceKey = JSON.stringify([file.id, file.version, file.blobId, previewSource]);
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);
  const [failedSource, setFailedSource] = useState("");
  const source = loaded?.key === sourceKey ? loaded.url : previewSource;

  useEffect(() => {
    if (!image || !file.blobId) return;
    let active = true;
    let objectUrl: string | undefined;
    void readDiscussionBlob(file.blobId).then(blob => {
      if (!active || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setLoaded({ key: sourceKey, url: objectUrl });
    }).catch(() => { /* Keep an available preview, or the readable file-type fallback. */ });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.blobId, image, sourceKey]);

  return <span aria-hidden="true" className={`task-file-thumbnail${className ? ` ${className}` : ""}`}>
    {source && failedSource !== source
      ? <img alt="" className="task-file-thumbnail-image" decoding="async" draggable={false} loading="lazy" onError={() => setFailedSource(source)} src={source} />
      : <TaskFileGlyph node={file} />}
  </span>;
}
