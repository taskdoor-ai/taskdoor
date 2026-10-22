import { formatFileSize } from "@/shared/lib/file-size";
import type { TaskFileNode, TaskNode } from "@/shared/model/task-model";
import html from "@/ai/mock/data/serumLaunchHtml.json";
import tables from "@/ai/mock/data/serumLaunchTables.json";
import documents from "@/ai/mock/data/serumLaunchDocuments.json";
import metadata from "@/ai/mock/data/serumLaunchAssetMetadata.json";
import { supportedTaskFileFixtures } from "@/ai/mock/lib/taskFilePreviewFixtures";

export const SERUM_LAUNCH_FILE_PACK_ID = "serum-launch-delivery-assets-v1";
const taskId = "ccx-serum-launch";
const assetRoot = "/task-assets/serum-launch/";
type AssetName = keyof typeof metadata;

function asset(id: string, filename: AssetName, name: string, section: string, mimeType: string, previewData?: TaskFileNode["previewData"], content?: string): TaskFileNode {
  const sizeBytes = metadata[filename].sizeBytes;
  return {
    id: `${taskId}-asset-${id}`, kind: "file", name, parentId: `${taskId}-${section}`,
    blobId: `builtin-task-asset:${assetRoot}${filename}`, builtinPackId: SERUM_LAUNCH_FILE_PACK_ID,
    originalName: filename, format: filename.split(".").pop()!.toUpperCase(), mimeType,
    sizeBytes, sizeLabel: formatFileSize(sizeBytes),
    updatedAt: "2026-09-14T18:00:00+08:00", version: 1,
    ...(previewData ? { previewData } : {}), ...(content === undefined ? {} : { content }),
  };
}

/** Unsupported originals remain available only to the conservative legacy migration. */
export function getSerumLaunchFileAssets(task: Pick<TaskNode, "id" | "teamId">, includeUnsupported = false): TaskFileNode[] {
  if (task.id !== taskId || task.teamId !== "creator-commerce") return [];
  const files = [
    asset("html", "serum-launch-board.html", "秋季精华首发执行总览.html", "delivery", "text/html", { kind: "text", text: html }, html),
    asset("xlsx", "serum-launch-budget.xlsx", "秋季精华首发预算与排期.xlsx", "evidence", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", { kind: "table", sheets: tables.sheets }),
    asset("csv", "serum-launch-channels.csv", "秋季精华首发渠道日数据.csv", "evidence", "text/csv", { kind: "table", sheets: [tables.csv] }),
    asset("pdf", "serum-launch-playbook.pdf", "秋季精华首发执行手册.pdf", "requirements", "application/pdf", { kind: "pdf", pages: documents.pdfPages }),
    asset("docx", "serum-launch-creative-brief.docx", "秋季精华首发创意与交付简报.docx", "delivery", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", { kind: "document", text: documents.wordText }, documents.wordText),
    asset("png", "serum-launch-hero.png", "秋季精华首发主视觉.png", "delivery", "image/png", { kind: "image", src: `${assetRoot}serum-launch-hero.png`, alt: "秋季精华首发主视觉：琥珀色精华瓶、秋叶与柔和光影。合成演示素材。", width: 1536, height: 1024 }),
  ];
  return includeUnsupported ? files : supportedTaskFileFixtures(files);
}
