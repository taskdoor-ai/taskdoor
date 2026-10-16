import type { TaskFileAnnotationAnchor } from "@/features/tasks/files/lib/task-file-annotations";

export type PdfAnnotationSelectionMode = "text" | "region";
type Point = { x: number; y: number };
type PageRect = { left: number; top: number; width: number; height: number };
type Region = NonNullable<TaskFileAnnotationAnchor["region"]>;

export function resolvePdfSelectionMode({ annotationMode, hasText, preferredMode }: { annotationMode: boolean; hasText?: boolean; preferredMode: PdfAnnotationSelectionMode }): PdfAnnotationSelectionMode {
  return !annotationMode ? "text" : hasText === false ? "region" : preferredMode;
}

/** Pointer capture may move beyond the page; the anchor always stays on it. */
export function normalizePdfRegionDrag(start: Point, end: Point, page: PageRect): Region | null {
  if (![start.x, start.y, end.x, end.y, page.left, page.top, page.width, page.height].every(Number.isFinite) || page.width <= 0 || page.height <= 0) return null;
  const clampX = (value: number) => Math.max(0, Math.min(page.width, value - page.left));
  const clampY = (value: number) => Math.max(0, Math.min(page.height, value - page.top));
  const left = Math.min(clampX(start.x), clampX(end.x));
  const top = Math.min(clampY(start.y), clampY(end.y));
  const width = Math.abs(clampX(end.x) - clampX(start.x));
  const height = Math.abs(clampY(end.y) - clampY(start.y));
  if (width < 6 || height < 6) return null;
  return { x: left / page.width, y: top / page.height, width: width / page.width, height: height / page.height };
}

/** A legacy region without a page number cannot safely be placed on a PDF. */
export function getPdfPageRegion(anchor: Pick<TaskFileAnnotationAnchor, "kind" | "pageIndex" | "region">, pageIndex: number): Region | null {
  if (anchor.kind !== "region" || !Number.isSafeInteger(pageIndex) || pageIndex < 0 || anchor.pageIndex !== pageIndex || !anchor.region) return null;
  const { x, y, width, height } = anchor.region;
  if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 + Number.EPSILON || y + height > 1 + Number.EPSILON) return null;
  return anchor.region;
}
