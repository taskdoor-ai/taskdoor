import type { TaskFileNode } from "@/shared/model/task-model";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";
import documentIcon from "@/features/tasks/files/assets/material-icon-theme/document.svg";
import htmlIcon from "@/features/tasks/files/assets/material-icon-theme/html.svg";
import imageIcon from "@/features/tasks/files/assets/material-icon-theme/image.svg";
import jsonIcon from "@/features/tasks/files/assets/material-icon-theme/json.svg";
import markdownIcon from "@/features/tasks/files/assets/material-icon-theme/markdown.svg";
import pdfIcon from "@/features/tasks/files/assets/material-icon-theme/pdf.svg";
import powerpointIcon from "@/features/tasks/files/assets/material-icon-theme/powerpoint.svg";
import tableIcon from "@/features/tasks/files/assets/material-icon-theme/table.svg";
import wordIcon from "@/features/tasks/files/assets/material-icon-theme/word.svg";
import xmlIcon from "@/features/tasks/files/assets/material-icon-theme/xml.svg";
import folderIcon from "@/features/tasks/files/assets/material-icon-theme/folder.svg";
import folderOpenIcon from "@/features/tasks/files/assets/material-icon-theme/folder-open.svg";
import "@/features/tasks/styles/task-file-list.css";

type GlyphFormat = "pdf" | "docx" | "xlsx" | "md" | "json" | "xml" | "html" | "ppt" | "text" | "image" | "folder" | "other";

function getGlyphFormat(node: TaskFileNode): GlyphFormat {
  if (node.kind === "folder") return "folder";

  const dot = node.name.lastIndexOf(".");
  const extension = dot > 0 && dot < node.name.length - 1 ? node.name.slice(dot + 1).toLowerCase() : "";
  const mime = node.mimeType?.split(";")[0].trim().toLowerCase() ?? "";
  const previewKind = getPreviewKind(node.name, node.mimeType);
  if (previewKind === "json" || previewKind === "xml" || previewKind === "html") return previewKind;
  if (previewKind === "presentation") return "ppt";
  if (previewKind === "text") return "text";

  if (extension === "pdf" || mime === "application/pdf") return "pdf";
  if (["doc", "docx"].includes(extension) || mime === "application/msword" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "docx";
  }
  if (["xls", "xlsx", "csv", "tsv"].includes(extension) || ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "text/tab-separated-values"].includes(mime)) {
    return "xlsx";
  }
  if (["md", "mdx"].includes(extension) || ["text/markdown", "text/x-markdown"].includes(mime)) return "md";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "heic", "heif", "bmp", "tif", "tiff"].includes(extension) || mime.startsWith("image/")) {
    return "image";
  }
  return "other";
}

const fileIcons: Record<Exclude<GlyphFormat, "folder">, string> = {
  pdf: pdfIcon,
  docx: wordIcon,
  xlsx: tableIcon,
  md: markdownIcon,
  json: jsonIcon,
  xml: xmlIcon,
  html: htmlIcon,
  ppt: powerpointIcon,
  text: documentIcon,
  image: imageIcon,
  other: documentIcon,
};

export function TaskFileGlyph({ node, expanded = false, compact = false }: { node: TaskFileNode; expanded?: boolean; compact?: boolean }) {
  const format = getGlyphFormat(node);
  const source = format === "folder" ? expanded ? folderOpenIcon : folderIcon : fileIcons[format];
  return <span aria-hidden="true" className="task-file-glyph" data-compact={compact || undefined} data-format={format}>
    <img alt="" className="task-file-glyph-image" draggable={false} height={36} src={source} width={36} />
  </span>;
}
