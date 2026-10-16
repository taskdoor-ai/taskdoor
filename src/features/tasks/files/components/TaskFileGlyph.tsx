import { File, FileCode2, FileImage, FileText, Folder, FolderOpen, Sheet } from "lucide-react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";

type GlyphFormat = "pdf" | "docx" | "xlsx" | "md" | "json" | "xml" | "image" | "folder" | "other";

function getGlyphFormat(node: TaskFileNode): { format: GlyphFormat; label: string } {
  if (node.kind === "folder") return { format: "folder", label: "" };

  const dot = node.name.lastIndexOf(".");
  const extension = dot > 0 && dot < node.name.length - 1 ? node.name.slice(dot + 1).toLowerCase() : "";
  const mime = node.mimeType?.split(";")[0].trim().toLowerCase() ?? "";
  const previewKind = getPreviewKind(node.name, node.mimeType);
  if (previewKind === "json" || previewKind === "xml") return { format: previewKind, label: previewKind.toUpperCase() };

  if (extension === "pdf" || mime === "application/pdf") return { format: "pdf", label: "PDF" };
  if (["doc", "docx"].includes(extension) || mime === "application/msword" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return { format: "docx", label: extension === "doc" || mime === "application/msword" ? "DOC" : "DOCX" };
  }
  if (["xls", "xlsx", "csv", "tsv"].includes(extension) || ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "text/tab-separated-values"].includes(mime)) {
    const mimeLabel = mime === "text/csv" ? "CSV" : mime === "text/tab-separated-values" ? "TSV" : mime === "application/vnd.ms-excel" ? "XLS" : "XLSX";
    return { format: "xlsx", label: ["xls", "xlsx", "csv", "tsv"].includes(extension) ? extension.toUpperCase() : mimeLabel };
  }
  if (["md", "mdx"].includes(extension) || ["text/markdown", "text/x-markdown"].includes(mime)) return { format: "md", label: extension === "mdx" ? "MDX" : "MD" };
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "heic", "heif", "bmp", "tif", "tiff"].includes(extension) || mime.startsWith("image/")) {
    const imageType = mime.slice("image/".length).split("+")[0];
    return { format: "image", label: (extension || imageType || "IMG").toUpperCase().slice(0, 4) };
  }
  return { format: "other", label: extension && extension.length <= 4 ? extension.toUpperCase() : "FILE" };
}

export function TaskFileGlyph({ node, expanded = false, compact = false }: { node: TaskFileNode; expanded?: boolean; compact?: boolean }) {
  const { format, label } = getGlyphFormat(node);
  const Icon = format === "folder" ? expanded ? FolderOpen : Folder
    : format === "xlsx" ? Sheet
    : format === "image" ? FileImage
    : format === "md" || format === "json" || format === "xml" ? FileCode2
    : format === "pdf" || format === "docx" ? FileText
    : File;

  return <span aria-hidden="true" className="task-file-glyph" data-compact={compact || undefined} data-format={format}>
    <Icon className="task-file-glyph-outline" size={32} strokeWidth={1.6} />
    {label && <span className="task-file-glyph-label">{label}</span>}
  </span>;
}
