import { useEffect, useState } from "react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { readDiscussionBlob } from "@/features/tasks/files/lib/discussion-uploads";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";
import type { TaskFileAnnotationAnchor } from "@/features/tasks/files/lib/task-file-annotations";

export function FileAnnotationSourcePreview({ file, anchor, compact = false }: { file: TaskFileNode; anchor: TaskFileAnnotationAnchor; compact?: boolean }) {
  const { locale } = useI18n();
  const savedSrc = file.previewData?.kind === "image" ? file.previewData.src : anchor.imageSrc;
  const imageSource = Boolean(savedSrc) || getPreviewKind(file.name, file.mimeType) === "image";
  const [blobSrc, setBlobSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setBlobSrc(""); setFailed(false);
    if (anchor.screenshot || anchor.kind !== "region" || !imageSource || savedSrc || !file.blobId) return;
    let cancelled = false;
    let url = "";
    readDiscussionBlob(file.blobId).then(blob => {
      if (cancelled) return;
      if (!blob) { setFailed(true); return; }
      url = URL.createObjectURL(blob); setBlobSrc(url);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [file.blobId, savedSrc, anchor.kind, anchor.screenshot, imageSource]);
  const pageRegion = anchor.kind === "region" && anchor.pageIndex !== undefined;
  const pageLabel = anchor.pageIndex === undefined ? "" : locale === "en" ? `Page ${anchor.pageIndex + 1}` : `第 ${anchor.pageIndex + 1} 页`;
  if (anchor.screenshot) return <div data-page-index={pageRegion ? anchor.pageIndex : undefined} className={`task-file-annotation-source-image${compact ? " is-compact" : ""}`}><img alt={locale === "en" ? `${pageRegion ? `${pageLabel}: ` : ""}Annotated content preview` : `${pageRegion ? `${pageLabel} · ` : ""}标注局部截图`} src={anchor.screenshot} /></div>;
  if (pageRegion) return compact ? <span className="task-file-annotation-text-thumbnail" title={`${pageLabel} · ${anchor.location}`}>{pageLabel} · {locale === "en" ? "Region" : "区域"}</span> : <p className="task-file-annotation-hint">{locale === "en" ? `${pageLabel}: detail screenshot unavailable; the page region is retained for lookup in the original file.` : `${pageLabel}局部截图不可用，区域位置仍保留，可返回原文件查看。`}</p>;
  if (anchor.quote) return compact ? <span className="task-file-annotation-text-thumbnail" title={anchor.quote}>{anchor.quote}</span> : <blockquote className="task-file-annotation-source-quote">{anchor.quote}</blockquote>;
  if (!anchor.region) return null;
  if (!imageSource) return compact ? <span className="task-file-annotation-text-thumbnail" title={anchor.location}>{anchor.elementLabel ?? anchor.location}</span> : <p className="task-file-annotation-hint">{locale === "en" ? "Detail preview unavailable; the selected target and position are retained." : "局部预览不可用，选中目标和位置仍保留。"}</p>;
  const src = savedSrc || blobSrc;
  if (!src || failed) return <p className="task-file-annotation-hint">{locale === "en" ? failed ? "Image preview unavailable; the region coordinates are retained." : "Loading selected image…" : failed ? "图片预览不可用，标注区域坐标仍保留。" : "正在读取标注图片…"}</p>;
  const region = anchor.region;
  return <div aria-label={locale === "en" ? "Annotated image region" : "图片标注区域"} className={`task-file-annotation-source-image${compact ? " is-compact" : ""}`}><img alt={file.name} onError={() => setFailed(true)} src={src} /><span aria-hidden="true" style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }} /></div>;
}
