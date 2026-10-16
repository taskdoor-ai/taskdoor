import { z } from "zod";
import type { TaskFileAnnotation } from "@/features/tasks/files/lib/task-file-annotations";

export const annotationTitleRequestSchema = z.object({
  locale: z.enum(["zh-CN", "en"]),
  items: z.array(z.object({
    id: z.string().min(1).max(200), opinion: z.string().min(1).max(20_000),
    quote: z.string().max(40_000), location: z.string().max(1000), kind: z.enum(["text", "region", "file"]),
  }).strict()).min(1).max(100),
}).strict();
export type AnnotationTitleRequest = z.infer<typeof annotationTitleRequestSchema>;
const comparable = (text: string) => text.replace(/[\s\p{P}\p{S}]/gu, "").toLocaleLowerCase();

/** Reject extraction presented as a summary, and bind each title to its requested note. */
export function parseAnnotationTitles(value: unknown, items: AnnotationTitleRequest["items"], locale: string = "zh-CN"): Record<string, string> {
  const result = z.object({ titles: z.array(z.object({ id: z.string(), title: z.string().trim().min(2).max(80) }).strict()).max(100) }).strict().parse(value);
  if (result.titles.length !== items.length || new Set(items.map(item => item.id)).size !== items.length) throw new Error("标注标题不完整，请重试。");
  const titles: Record<string, string> = {};
  for (const item of result.titles) {
    const note = items.find(note => note.id === item.id);
    const title = comparable(item.title);
    if (!note || Object.hasOwn(titles, item.id) || !title || Array.from(item.title).length > (locale === "en" ? 60 : 24) || /[\r\n]/.test(item.title)
      || (note.quote && comparable(note.quote).includes(title))) throw new Error("标题未能概括修改要求，请重试。");
    Object.defineProperty(titles, item.id, { value: item.title, enumerable: true });
  }
  return titles;
}

export async function generateAnnotationTitles(items: TaskFileAnnotation[], locale: string, signal: AbortSignal): Promise<Record<string, string>> {
  const request: AnnotationTitleRequest = { locale: locale === "en" ? "en" : "zh-CN", items: items.map(item => ({ id: item.id, opinion: item.body, quote: item.anchor.quote ?? "", location: item.anchor.location, kind: item.anchor.kind })) };
  const response = await fetch("/api/file-annotation-titles", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-TaskDoor-Annotation-Titles": "1" }, body: JSON.stringify(request), signal });
  const result: unknown = await response.json().catch(() => { throw new Error(locale === "en" ? "Title generation is unavailable. Your annotations are retained." : "标题服务暂不可用，标注仍保留，请重试。"); });
  if (!response.ok) throw new Error(result && typeof result === "object" && "error" in result && typeof result.error === "string" ? result.error : locale === "en" ? "Could not generate titles. Your annotations are retained." : "标题生成失败，标注仍保留，请重试。");
  try { return parseAnnotationTitles(result, request.items, request.locale); }
  catch { throw new Error(locale === "en" ? "The title did not summarise the change. Your annotations are retained; try again." : "标题未能概括修改要求，标注仍保留，请重试。"); }
}
