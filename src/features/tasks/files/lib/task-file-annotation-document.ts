import { formatDisplayDateTime } from "@/shared/lib/date-time";
import type { TaskFileNode } from "@/shared/model/task-model";
import type { DiscussionDraft } from "@/features/tasks/lib/task-collaboration";
import type { TaskFileAnnotation, buildFileAnnotationContext } from "@/features/tasks/files/lib/task-file-annotations";

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

/** Keep feedback in a frozen attachment; the discussion composer owns its message. */
export function createFileAnnotationDiscussionDraft(context: ReturnType<typeof buildFileAnnotationContext>, options: Parameters<typeof createFileAnnotationDocument>[1]): DiscussionDraft {
  const snapshot = { ...createFileAnnotationDocument(context, options), attachmentOnly: true as const };
  return { body: "", mentions: [], attachments: [snapshot] };
}

/** A compact review file: source once, then selected content and the original opinion. */
export function createFileAnnotationDocument(context: ReturnType<typeof buildFileAnnotationContext>, options: { taskTitle: string; authorName: string; locale?: string; now?: string; timeZone?: string; titles?: Record<string, string> }): TaskFileNode {
  const english = options.locale === "en";
  const t = (zh: string, en: string) => english ? en : zh;
  if (!context.items.length) throw new Error(t("请先添加标注。", "Add an annotation first."));
  const now = options.now ?? new Date().toISOString();
  const displayTime = (value: string) => formatDisplayDateTime(value, { locale: options.locale ?? "zh-CN", year: "always", timeZone: options.timeZone }) ?? value;
  const calendarDate = new Date(now).toLocaleDateString("sv-SE", { timeZone: options.timeZone });
  const groups = new Map<string, TaskFileAnnotation[]>();
  for (const item of context.items) { const key = JSON.stringify([item.fileId, item.version]); groups.set(key, [...(groups.get(key) ?? []), item]); }
  const firstSource = context.items[0];
  const title = groups.size === 1 ? t(`${firstSource.fileName} · v${firstSource.version} · 标注`, `${firstSource.fileName} · v${firstSource.version} · Annotations`) : t(`${options.taskTitle} · 标注`, `${options.taskTitle} · Annotations`);
  let number = 0;
  const contentGroups = [...groups.values()].map(items => {
    const source = items[0];
    const heading = groups.size > 1 ? `<header class="source"><h2>${escape(source.fileName)} · v${source.version}</h2></header>` : "";
    const entries = items.map(item => {
      const index = number++;
      const pageRegion = item.anchor.kind === "region" && item.anchor.pageIndex !== undefined;
      const page = item.anchor.pageIndex === undefined ? "" : t(`第 ${item.anchor.pageIndex + 1} 页`, `Page ${item.anchor.pageIndex + 1}`);
      const pageMetadata = item.anchor.pageIndex === undefined ? "" : ` data-page-index="${item.anchor.pageIndex}"`;
      const regionMetadata = item.anchor.region ? ` data-region="${escape(JSON.stringify(item.anchor.region))}"` : "";
      const coordinates = pageRegion && item.anchor.region ? `<p class="meta">${t("页内区域（相对本页，范围 0–1）", "Page region (relative to this page, range 0–1)")}: ${escape(JSON.stringify(item.anchor.region))}</p>` : "";
      const image = item.anchor.screenshot;
      const screenshot = image ? `<figure><figcaption>${t("截图", "Screenshot")}</figcaption><img alt="${escape(item.anchor.location)}" src="${escape(image)}"></figure>` : "";
      const quote = !item.anchor.quote || pageRegion ? "" : image
        ? `<details class="selected"><summary>${t("查看原文", "View original text")}</summary><blockquote>${escape(item.anchor.quote)}</blockquote></details>`
        : `<div class="selected"><small>${t("选中内容", "Selected content")}</small><blockquote>${escape(item.anchor.quote)}</blockquote></div>`;
      return `<section data-annotation-id="${escape(item.id)}" data-anchor-kind="${item.anchor.kind}"${pageMetadata}${regionMetadata}><h3>${index + 1}. ${escape(options.titles?.[item.id] || t("内容修订", "Content revision"))}</h3><p class="meta">${t("位置", "Location")}${english ? ": " : "："}${escape(item.anchor.location)}${page ? ` · ${page}` : ""}</p>${coordinates}${screenshot}${quote}<div class="feedback"><small>${t("标注内容", "Annotation")}</small><p class="opinion">${escape(item.body)}</p></div></section>`;
    }).join("\n");
    return `<article data-file-id="${escape(source.fileId)}" data-version="${source.version}">${heading}${entries}</article>`;
  }).join("\n");
  const content = `<!doctype html><html lang="${english ? "en" : "zh-CN"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>body{margin:0;padding:28px 24px;font:15px/1.7 system-ui,sans-serif;color:#27334b;background:#fff}main{max-width:840px;margin:auto}h1{font-size:23px;margin:0}h2{font-size:17px;margin:0}h3{font-size:17px;line-height:1.5;margin:0 0 12px}.source{padding:20px 0 14px;border-bottom:1px solid #e5e9f1}section{padding:24px 0;border-bottom:1px solid #e5e9f1}.meta,small,figcaption{font-size:12px;color:#67758b;overflow-wrap:anywhere}.meta{margin:8px 0 14px}figure{margin:16px 0}.selected{margin:12px 0 18px}summary{width:fit-content;font-size:13px;color:#5268b0;cursor:pointer}summary:focus-visible{outline:2px solid #5975dc;outline-offset:3px}details.selected blockquote{margin-bottom:0}img{display:block;max-width:100%;max-height:360px;margin:8px 0;object-fit:contain}blockquote{margin:6px 0 18px;padding:10px 14px;border-left:3px solid #5975dc;background:#f5f7ff;white-space:pre-wrap;overflow-wrap:anywhere}.opinion{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:480px){body{padding:20px 16px}h1{font-size:20px}}</style></head><body><main><h1>${escape(title)}</h1><p class="meta">${escape(options.authorName)} · <time datetime="${escape(now)}">${escape(displayTime(now))}</time> · ${context.items.length} ${t("条标注", "annotations")}</p>${contentGroups}</main></body></html>`;
  return { id: `file-${crypto.randomUUID()}`, kind: "file", name: `${t("标注", "Annotations")}-${options.authorName}-${calendarDate}.html`, parentId: null, updatedAt: now, version: 1, mimeType: "text/html", content, sizeBytes: new TextEncoder().encode(content).byteLength };
}
