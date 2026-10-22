import { formatFileSize } from "@/shared/lib/file-size";
import type { TaskFileNode, TaskNode } from "@/shared/model/task-model";
import metadata from "@/ai/mock/data/serumLaunchCommonAssetMetadata.json";
import { supportedTaskFileFixtures } from "@/ai/mock/lib/taskFilePreviewFixtures";

export const SERUM_LAUNCH_COMMON_FILE_PACK_ID = "serum-launch-common-files-v1";
const taskId = "ccx-serum-launch";
const assetRoot = "/task-assets/serum-launch/common/";
type CommonAssetMetadata = {
  id: string;
  filename: string;
  name: string;
  section: string;
  mimeType: string;
  sizeBytes: number;
  text?: string;
};
const entries: CommonAssetMetadata[] = metadata;

/** Original downloadable files extend the existing task without replacing its first pack. */
export function getSerumLaunchCommonFileAssets(task: Pick<TaskNode, "id" | "teamId">, includeUnsupported = false): TaskFileNode[] {
  if (task.id !== taskId || task.teamId !== "creator-commerce") return [];
  const files = entries.map((entry): TaskFileNode => ({
    id: `${taskId}-common-${entry.id}`,
    kind: "file",
    name: entry.name,
    parentId: `${taskId}-${entry.section}`,
    blobId: `builtin-task-asset:${assetRoot}${entry.filename}`,
    builtinPackId: SERUM_LAUNCH_COMMON_FILE_PACK_ID,
    originalName: entry.filename,
    format: entry.filename.split(".").pop()!.toUpperCase(),
    mimeType: entry.mimeType,
    sizeBytes: entry.sizeBytes,
    sizeLabel: formatFileSize(entry.sizeBytes),
    updatedAt: "2026-10-16T15:00:00+08:00",
    version: 1,
    ...(entry.text === undefined ? {} : { content: entry.text, previewData: { kind: "text" as const, text: entry.text } }),
  }));
  // These two historical fixture packs keep their original membership; media
  // arrives through a separate incremental discussion pack for existing users.
  return includeUnsupported ? files : supportedTaskFileFixtures(files).filter(file => file.format !== "MP3" && file.format !== "MP4");
}
