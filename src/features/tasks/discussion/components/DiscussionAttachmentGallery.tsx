import { GridList, GridListItem } from "react-aria-components";
import { useMockText } from "@/ai/discussion-reading";
import { DiscussionAttachmentContent } from "@/features/tasks/discussion/components/DiscussionAttachmentContent";
import { getDiscussionAttachment, type AttachmentRef } from "@/features/tasks/lib/task-collaboration";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import type { TaskFileNode } from "@/shared/model/task-model";

/** Action-only grid: React Aria owns spatial navigation, focus and activation. */
export function DiscussionAttachmentGallery({ attachmentRefs = [], legacyFileName, files, onOpenFile, variant = "feed" }: {
  attachmentRefs?: readonly AttachmentRef[];
  legacyFileName?: string;
  files: readonly TaskFileNode[];
  onOpenFile: (id: string, version?: number) => void;
  variant?: "feed" | "thread";
}) {
  const mock = useMockText();
  const d = useDetailCopy();
  const entries = attachmentRefs.length ? attachmentRefs.map(ref => ({
    id: `${ref.fileId}:${ref.version}`,
    file: getDiscussionAttachment(files, ref),
    name: mock.text(ref.name),
    version: ref.version,
    unavailableLabel: d("fileRemoved"),
  })) : legacyFileName ? [{
    id: "legacy-attachment",
    file: files.find(file => file.kind === "file" && !file.archived && file.name === legacyFileName),
    name: mock.text(legacyFileName),
    version: undefined,
    unavailableLabel: d("unavailable"),
  }] : [];
  if (!entries.length) return null;

  return <GridList aria-label={d("attachments")} className={variant === "feed" ? "task-discussion-feed-attachments" : "discussion-attachments"} disabledBehavior="all" disabledKeys={entries.filter(entry => !entry.file).map(entry => entry.id)} layout="grid" selectionMode="none">
    {entries.map(entry => <GridListItem
      aria-label={[entry.name, entry.version === undefined ? undefined : `v${entry.version}`, entry.file ? undefined : entry.unavailableLabel].filter(Boolean).join(" · ")}
      className={variant === "feed" ? "task-discussion-feed-file" : "task-record-file-link"}
      id={entry.id}
      key={entry.id}
      onAction={() => { if (entry.file) onOpenFile(entry.file.id, entry.version); }}
      textValue={entry.name}
    ><DiscussionAttachmentContent file={entry.file} name={entry.name} unavailableLabel={entry.unavailableLabel} version={entry.version} /></GridListItem>)}
  </GridList>;
}
