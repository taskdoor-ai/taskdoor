import { strToU8, zipSync } from "fflate";
import type { TaskFileNode } from "@/shared/model/task-model";
import { readDiscussionBlob } from "@/features/tasks/files/lib/discussion-uploads";
import { getTaskFileContent } from "@/features/tasks/files/lib/task-file-editing";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";
import { getTaskFileAnnotationSourceText, TASK_FILE_ANNOTATION_SCREENSHOT_MAX_BYTES, type TaskFileAnnotation, type buildFileAnnotationContext } from "@/features/tasks/files/lib/task-file-annotations";

type AnnotationContext = ReturnType<typeof buildFileAnnotationContext>;
type BundleLocale = "zh-CN" | "en";
type MaterialRepresentation = "original-bytes" | "saved-text" | "saved-preview-text" | "saved-preview-json" | "image-bytes";
export type FileAnnotationBundleMaterial = {
  fileId: string;
  fileName: string;
  version: number;
  path: string;
  representation: MaterialRepresentation;
  description: string;
  sizeBytes: number;
  sourceBlobId?: string;
};
export type FileAnnotationBundleManifest = {
  format: "taskdoor-file-annotation-bundle";
  schemaVersion: 1;
  createdAt: string;
  materials: FileAnnotationBundleMaterial[];
  annotations: Array<Omit<TaskFileAnnotation, "source" | "replies"> & { materialPath: string; previewPath?: string }>;
};
export type FileAnnotationBundle = { bytes: Uint8Array; fileName: string; manifest: FileAnnotationBundleManifest };
export type FileAnnotationBundleIO = {
  readBlob: (blobId: string) => Promise<Blob | null>;
  fetchImage?: (url: string) => Promise<Blob>;
};

const safeName = (name: string) => name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").replace(/^\.+|[. ]+$/g, "").trim() || "file";
const materialKey = (fileId: string, version: number) => JSON.stringify([fileId, version]);
const words = (locale: BundleLocale, zh: string, en: string) => locale === "en" ? en : zh;

async function fetchPermanentImage(url: string): Promise<Blob> {
  if (!url || /^blob:/i.test(url)) throw new Error("图片只有临时预览地址，无法打包原文件，请重新上传图片。 ");
  const response = await fetch(url);
  if (!response.ok) throw new Error("图片原文件读取失败，请重试。 ");
  const blob = await response.blob();
  if (!blob.size) throw new Error("图片原文件内容为空，无法生成交接包。 ");
  return blob;
}

function previewMaterial(source: TaskFileNode, locale: BundleLocale): { bytes: Uint8Array; name: string; representation: MaterialRepresentation; description: string } | null {
  const content = getTaskFileContent(source);
  const kind = getPreviewKind(source.name, source.mimeType);
  const previewDescription = words(locale, "已保存的预览内容快照；不是原始二进制文件。", "Saved preview-content snapshot; this is not the original binary file.");
  if (kind === "html" && source.content !== undefined) return { bytes: strToU8(source.content), name: source.name, representation: "saved-text", description: words(locale, "所选固定版本的完整 HTML 源文件。", "Complete HTML source for the selected fixed version.") };
  if (content?.kind === "text") {
    if (["markdown", "text", "json", "xml", "html"].includes(kind)) return { bytes: strToU8(content.text), name: source.name, representation: "saved-text", description: words(locale, "所选固定版本的已保存正文。", "Saved document text for the selected fixed version.") };
    return { bytes: strToU8(content.text), name: `${source.name}.preview.txt`, representation: "saved-preview-text", description: previewDescription };
  }
  if (content?.kind === "pdf") return { bytes: strToU8(getTaskFileAnnotationSourceText(source)), name: `${source.name}.preview.txt`, representation: "saved-preview-text", description: previewDescription };
  if (content?.kind === "table") return { bytes: strToU8(JSON.stringify(content, null, 2)), name: `${source.name}.preview.json`, representation: "saved-preview-json", description: previewDescription };
  if (source.content !== undefined && kind !== "image") return { bytes: strToU8(source.content), name: `${source.name}.preview.txt`, representation: "saved-preview-text", description: previewDescription };
  return null;
}

async function readMaterial(source: TaskFileNode, locale: BundleLocale, io: FileAnnotationBundleIO, requireOriginalPage = false) {
  const saved = previewMaterial(source, locale);
  if (requireOriginalPage && !source.blobId) throw new Error(words(locale, `「${source.name}」缺少页区域对应的原文件，未生成交接包。`, `“${source.name}” has no original file for its page region; no handoff bundle was generated.`));
  if (saved?.representation === "saved-text" && (source.version ?? 1) > 1 && ["json", "xml"].includes(getPreviewKind(source.name, source.mimeType))) return saved;
  if (source.blobId) {
    const original = await io.readBlob(source.blobId);
    if (!original) throw new Error(words(locale, `「${source.name}」的原文件无法读取，未生成交接包。`, `Cannot read the original file “${source.name}”; no handoff bundle was generated.`));
    // Editing retains the original upload's blob ID. Its bytes are not proof of
    // the selected edited version: use that version's saved text/preview instead.
    if (!requireOriginalPage && saved && (source.version ?? 1) > 1) return saved;
    if (!requireOriginalPage && saved?.representation === "saved-text" && await original.text() !== getTaskFileAnnotationSourceText(source)) return saved;
    return { bytes: new Uint8Array(await original.arrayBuffer()), name: source.name, representation: "original-bytes" as const, description: words(locale, "所选版本保留的原附件字节。", "Original attachment bytes retained for the selected version.") };
  }
  if (saved) return saved;
  if (source.previewData?.kind === "image") {
    const src = source.previewData.src;
    if (/^blob:/i.test(src)) throw new Error(words(locale, "图片只有临时预览地址，无法打包原文件，请重新上传图片。", "The image only has a temporary preview URL; upload the original image before exporting."));
    const image = await (io.fetchImage ?? fetchPermanentImage)(src);
    if (!image.size) throw new Error(words(locale, "图片原文件读取失败，未生成交接包。", "The image file could not be read; no handoff bundle was generated."));
    return { bytes: new Uint8Array(await image.arrayBuffer()), name: source.name, representation: "image-bytes" as const, description: words(locale, "从已保存图片地址读取的原图；标注区域坐标见 manifest.json。", "Image bytes read from the saved image URL; region coordinates are in manifest.json.") };
  }
  throw new Error(words(locale, `「${source.name}」缺少可读取的原材料，未生成交接包。`, `“${source.name}” has no readable source material; no handoff bundle was generated.`));
}

/** Collect real materials before encoding. I/O is injected for focused boundary tests. */
export async function buildFileAnnotationBundle(context: AnnotationContext, locale: BundleLocale, io: FileAnnotationBundleIO = { readBlob: readDiscussionBlob }): Promise<FileAnnotationBundle> {
  if (!context.items.length) throw new Error(words(locale, "请先选择已发布的标注意见。", "Select at least one published annotation first."));
  const entries: Record<string, Uint8Array> = {};
  const materials: FileAnnotationBundleMaterial[] = [];
  const sources = new Map<string, TaskFileNode>();
  const byKey = new Map<string, FileAnnotationBundleMaterial>();
  const previewPaths = new Map<string, string>();
  const originalPageSources = new Set(context.items.filter(item => item.anchor.kind === "region" && item.anchor.pageIndex !== undefined && ["pdf", "presentation"].includes(getPreviewKind(item.source.name, item.source.mimeType))).map(item => materialKey(item.fileId, item.version)));
  for (const item of context.items) {
    const key = materialKey(item.fileId, item.version);
    const previousSource = sources.get(key);
    if (previousSource) {
      if (JSON.stringify(previousSource) !== JSON.stringify(item.source)) throw new Error(words(locale, "同一文件版本的快照不一致，请重新选择标注后重试。", "Snapshots for the same file version differ; reselect the annotations and try again."));
      continue;
    }
    sources.set(key, item.source);
    const value = await readMaterial(item.source, locale, io, originalPageSources.has(key));
    const path = `files/${String(materials.length + 1).padStart(3, "0")}_v${item.version}_${safeName(value.name)}`;
    entries[path] = value.bytes;
    const material: FileAnnotationBundleMaterial = { fileId: item.fileId, fileName: item.fileName, version: item.version, path, representation: value.representation, description: value.description, sizeBytes: value.bytes.byteLength, ...(item.source.blobId ? { sourceBlobId: item.source.blobId } : {}) };
    materials.push(material);
    byKey.set(key, material);
  }
  for (const item of context.items) {
    const screenshot = item.anchor.screenshot;
    if (!screenshot || previewPaths.has(screenshot)) continue;
    const match = screenshot.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) throw new Error(words(locale, "标注局部截图无法读取，未生成修订包。", "An annotation screenshot could not be read; no revision bundle was generated."));
    const bytes = Uint8Array.from(atob(match[2]), value => value.charCodeAt(0));
    if (!bytes.length || bytes.byteLength > TASK_FILE_ANNOTATION_SCREENSHOT_MAX_BYTES) throw new Error(words(locale, "标注局部截图大小无效，未生成修订包。", "An annotation screenshot has an invalid size; no revision bundle was generated."));
    const path = `previews/${String(previewPaths.size + 1).padStart(3, "0")}_${safeName(item.id)}.${match[1]}`;
    entries[path] = bytes;
    previewPaths.set(screenshot, path);
  }
  const manifest: FileAnnotationBundleManifest = {
    format: "taskdoor-file-annotation-bundle", schemaVersion: 1, createdAt: new Date().toISOString(), materials,
    annotations: context.items.map(item => {
      const { source: _source, replies: _replies, ...annotation } = item;
      const previewPath = item.anchor.screenshot ? previewPaths.get(item.anchor.screenshot) : undefined;
      return { ...annotation, materialPath: byKey.get(materialKey(item.fileId, item.version))!.path, ...(previewPath ? { previewPath } : {}) };
    }),
  };
  const materialLines = [words(locale, "## 包内原材料", "## Source materials in this bundle"), "", words(locale,
    "解压后使用以下本地相对路径读取材料。manifest.json 保留每条意见的作者、时间、固定版本、原文和标注位置；页内区域的pageIndex从0开始，区域采用相对本页的0–1坐标，并附原文件及局部截图；图片区域相对原图，HTML区域相对标注时预览画布。预览快照已明确标识，不代表原始 PDF、Word 或 Excel 二进制文件。",
    "After extracting the bundle, read these local relative paths. manifest.json keeps authors, times, fixed versions, opinions and anchors. Page-region pageIndex is zero-based with 0–1 coordinates relative to that page, the original file and detail screenshot. Image regions are relative to the original image; HTML regions to the annotated preview. Preview snapshots are not original PDF, Word or Excel binaries."), ""];
  let markdown = context.markdown;
  for (const item of context.items) {
    const material = byKey.get(materialKey(item.fileId, item.version))!;
    materialLines.push(`- ${item.id} · ${item.fileName} · v${item.version} → [${material.path}](${material.path}) — ${material.description}`);
    if (item.anchor.screenshot) {
      const previewPath = previewPaths.get(item.anchor.screenshot)!;
      markdown = markdown.replaceAll(`](${item.anchor.screenshot})`, `](${previewPath})`);
      materialLines.push(`  ${words(locale, "局部截图", "Detail screenshot")} → [${previewPath}](${previewPath})`);
    }
    if (item.source.previewData?.kind === "image") markdown = markdown.replaceAll(`](${item.source.previewData.src})`, `](${material.path})`);
  }
  materialLines.push("", "---", "");
  entries[locale === "en" ? "Revision-feedback.md" : "修订要求.md"] = strToU8(`${materialLines.join("\n")}\n${markdown}`);
  entries["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
  const bytes = zipSync(entries, { level: 6 });
  const taskId = safeName(context.items[0].taskId);
  return { bytes, fileName: locale === "en" ? `TaskDoor-file-feedback-${taskId}.zip` : `TaskDoor-文件修订-${taskId}.zip`, manifest };
}

/** Resolve only after the complete ZIP exists and the browser download is initiated. */
export async function downloadFileAnnotationBundle(context: AnnotationContext, locale: BundleLocale): Promise<void> {
  const bundle = await buildFileAnnotationBundle(context, locale);
  const blob = new Blob([new Uint8Array(bundle.bytes)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = bundle.fileName;
  try {
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
