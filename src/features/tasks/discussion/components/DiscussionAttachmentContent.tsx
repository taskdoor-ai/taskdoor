import type { TaskFileNode } from "@/shared/model/task-model";
import { TaskFileGlyph } from "@/features/tasks/files/components/TaskFileGlyph";
import { TaskFileThumbnail } from "@/features/tasks/files/components/TaskFileThumbnail";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";

/** A reference must never show a newer image as the message's fixed-version material. */
export function DiscussionAttachmentContent({ file, name, version, unavailableLabel }: { file?: TaskFileNode; name: string; version?: number; unavailableLabel: string }) {
  const matchesVersion = Boolean(file && (version === undefined || (file.version ?? 1) === version));
  const glyphFile: TaskFileNode = matchesVersion && file ? file : { id: "attachment-reference", kind: "file", name, parentId: null, updatedAt: "" };
  const image = matchesVersion && file && getPreviewKind(file.name, file.mimeType) === "image";
  return <span className="discussion-attachment-card" data-preview={image ? "image" : "file"}>
    {matchesVersion && file
      ? <TaskFileThumbnail className="discussion-attachment-thumbnail" file={file} />
      : <span aria-hidden="true" className="discussion-attachment-thumbnail task-file-thumbnail"><TaskFileGlyph node={glyphFile} /></span>}
    <span className="discussion-attachment-info"><span className="discussion-attachment-name">{name}</span>{!file && <small className="discussion-attachment-unavailable">{unavailableLabel}</small>}</span>
  </span>;
}
