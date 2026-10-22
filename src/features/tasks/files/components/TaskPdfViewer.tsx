import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, FileWarning, Maximize, Minus, Pin, PinOff, Plus, RotateCw, Scan, TextSelect } from "lucide-react";
import { TextLayer, type PDFDocumentProxy, type RenderTask } from "pdfjs-dist";
import { loadTaskPdfDocument } from "@/features/tasks/files/lib/task-pdf-runtime";
import { useI18n } from "@/shared/i18n/I18nProvider";
import type { TaskFileNode } from "@/shared/model/task-model";
import type { TaskFileTextSelection } from "@/features/tasks/files/components/TaskFileViewer";
import type { TaskFileAnnotation, TaskFileAnnotationAnchor } from "@/features/tasks/files/lib/task-file-annotations";
import { getPdfTextAnchorRects, readPdfTextSelection, type PdfSelectionRegion } from "@/features/tasks/files/lib/pdf-text-selection";
import { getPdfPageRegion, normalizePdfRegionDrag, resolvePdfSelectionMode, type PdfAnnotationSelectionMode } from "@/features/tasks/files/lib/pdf-region-selection";
import "@/features/tasks/styles/task-file-pdf-viewer.css";


type Props = {
  file: TaskFileNode;
  url: string;
  annotationMode?: boolean;
  annotations?: TaskFileAnnotation[];
  draftAnchor?: TaskFileAnnotationAnchor | null;
  activeThreadId?: string | null;
  focusSequence?: number;
  onThreadSelect?: (id: string, trigger?: HTMLElement) => void;
  onSelection?: (selection: TaskFileTextSelection | null) => void;
};
type PageSize = { width: number; height: number };
type NumberedAnnotation = { annotation: TaskFileAnnotation; number: number };
type PageMark = { id: string; number?: number; location?: string; regions: PdfSelectionRegion[]; isRegion?: boolean };
type RegionDrag = { pointerId: number; start: { x: number; y: number }; pageRect: DOMRect; target: HTMLDivElement; canvas: HTMLCanvasElement };
const CSS_UNITS = 96 / 72;
const PAGE_GUTTER = 24;
const EMPTY_ANNOTATIONS: TaskFileAnnotation[] = [];
const regionStyle = (region: PdfSelectionRegion): CSSProperties => ({ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` });

/** The canvas is the source image; the transparent text layer is never captured. */
function capturePdfRegion(source: HTMLCanvasElement, region: PdfSelectionRegion): string | undefined {
  try {
    const x = Math.max(0, region.x * source.width - 10);
    const y = Math.max(0, region.y * source.height - 10);
    const width = Math.min(source.width - x, region.width * source.width + 20);
    const height = Math.min(source.height - y, region.height * source.height + 20);
    if (!width || !height) return;
    const scale = Math.min(1, 800 / width, 400 / height);
    const crop = document.createElement("canvas");
    crop.width = Math.max(1, Math.round(width * scale));
    crop.height = Math.max(1, Math.round(height * scale));
    const context = crop.getContext("2d");
    if (!context) return;
    context.drawImage(source, x, y, width, height, 0, 0, crop.width, crop.height);
    context.strokeStyle = "#5273ed";
    context.lineWidth = 2;
    context.strokeRect(Math.max(1, (region.x * source.width - x) * scale), Math.max(1, (region.y * source.height - y) * scale), Math.min(region.width * source.width * scale, crop.width - 2), Math.min(region.height * source.height * scale, crop.height - 2));
    const screenshot = crop.toDataURL("image/png");
    return screenshot.startsWith("data:image/png;base64,") ? screenshot : undefined;
  } catch { return undefined; }
}

function PdfThumbnail({ pdf, pageIndex, firstSize, current, english, onSelect }: {
  pdf: PDFDocumentProxy;
  pageIndex: number;
  firstSize: PageSize;
  current: boolean;
  english: boolean;
  onSelect: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canvasHostRef = useRef<HTMLSpanElement>(null);
  const [nearby, setNearby] = useState(false);
  const [size, setSize] = useState(firstSize);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const label = english ? `Page ${pageIndex + 1}` : `第 ${pageIndex + 1} 页`;

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || typeof IntersectionObserver === "undefined") { setNearby(true); return; }
    const observer = new IntersectionObserver(([entry]) => setNearby(entry.isIntersecting), { root: button.closest("[data-pdf-thumbnail-scroll]"), rootMargin: "160px" });
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!nearby || !host) return;
    let cancelled = false;
    let renderTask: RenderTask | undefined;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    host.replaceChildren(canvas);
    setStatus("loading");
    void (async () => {
      const page = await pdf.getPage(pageIndex + 1);
      if (cancelled) return;
      const natural = page.getViewport({ scale: 1 });
      setSize({ width: natural.width, height: natural.height });
      const viewport = page.getViewport({ scale: Math.min(224 / natural.width, 318 / natural.height) });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio));
      renderTask = page.render({ canvas, viewport, transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0], background: "#ffffff" });
      await renderTask.promise;
      if (!cancelled) setStatus("ready");
    })().catch(() => { if (!cancelled) setStatus("error"); });
    return () => {
      cancelled = true;
      renderTask?.cancel();
      canvas.remove();
      if (renderTask) void renderTask.promise.catch(() => {}).finally(() => { canvas.width = 0; canvas.height = 0; });
      else { canvas.width = 0; canvas.height = 0; }
    };
  }, [pdf, pageIndex, nearby]);

  return <li><button aria-current={current ? "page" : undefined} aria-label={label} className="task-pdf-viewer__thumbnail" data-page-index={pageIndex} onClick={onSelect} ref={buttonRef} title={status === "error" ? english ? "Thumbnail unavailable. Open this page." : "缩略图加载失败，点击仍可打开此页。" : label} type="button">
    <span aria-hidden="true" className="task-pdf-viewer__thumbnail-image" style={{ "--pdf-thumbnail-ratio": size.width / size.height } as CSSProperties}><span className="task-pdf-viewer__thumbnail-paper"><span className="task-pdf-viewer__thumbnail-canvas" ref={canvasHostRef} />{status !== "ready" && <span className="task-pdf-viewer__thumbnail-status">{status === "error" ? <FileWarning size={18} /> : "…"}</span>}</span></span>
    <span className="task-pdf-viewer__thumbnail-number">{pageIndex + 1}</span>
  </button></li>;
}

function PdfPage({ pdf, pageIndex, firstSize, availableWidth, zoom, scrollRoot, annotations, draftAnchor, activeThreadId, focusSequence, annotationMode, selectionMode, onTextAvailability, onThreadSelect, onSelection, onSelectionNotice, registerPage, english }: {
  pdf: PDFDocumentProxy;
  pageIndex: number;
  firstSize: PageSize;
  availableWidth: number;
  zoom: number | null;
  scrollRoot: HTMLDivElement | null;
  annotations: NumberedAnnotation[];
  draftAnchor?: TaskFileAnnotationAnchor | null;
  activeThreadId?: string | null;
  focusSequence?: number;
  annotationMode: boolean;
  selectionMode: PdfAnnotationSelectionMode;
  onTextAvailability: (pageIndex: number, hasText: boolean) => void;
  onThreadSelect?: Props["onThreadSelect"];
  onSelection?: Props["onSelection"];
  onSelectionNotice: (notice: boolean) => void;
  registerPage: (index: number, element: HTMLElement | null) => void;
  english: boolean;
}) {
  const pageRef = useRef<HTMLElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const textHostRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef(new Map<string, HTMLButtonElement>());
  const dragRef = useRef<RegionDrag | null>(null);
  const selectionCallback = useRef(onSelection);
  selectionCallback.current = onSelection;
  const [nearby, setNearby] = useState(pageIndex === 0);
  const [size, setSize] = useState(firstSize);
  const [attempt, setAttempt] = useState(0);
  const [pageError, setPageError] = useState(false);
  const [rendered, setRendered] = useState<{ canvas: HTMLCanvasElement; layer: HTMLDivElement; hasText: boolean } | null>(null);
  const [marks, setMarks] = useState<PageMark[]>([]);
  const [dragRegion, setDragRegion] = useState<PdfSelectionRegion | null>(null);
  const [captureError, setCaptureError] = useState(false);
  const scale = zoom === null ? Math.max(0.1, (availableWidth - PAGE_GUTTER * 2) / size.width) : zoom * CSS_UNITS;
  const width = size.width * scale;
  const height = size.height * scale;
  const label = english ? `Page ${pageIndex + 1}` : `第 ${pageIndex + 1} 页`;
  const regionEnabled = Boolean(rendered && resolvePdfSelectionMode({ annotationMode, hasText: rendered.hasText, preferredMode: selectionMode }) === "region");
  const cancelRegionDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.target.hasPointerCapture(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId);
    setDragRegion(null);
  }, []);

  useEffect(() => { if (rendered) onTextAvailability(pageIndex, rendered.hasText); }, [rendered, pageIndex, onTextAvailability]);
  useEffect(() => { cancelRegionDrag(); setCaptureError(false); }, [regionEnabled, rendered, width, height, annotationMode, cancelRegionDrag]);
  useEffect(() => {
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !dragRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      cancelRegionDrag();
    };
    document.addEventListener("keydown", cancelOnEscape, true);
    scrollRoot?.addEventListener("scroll", cancelRegionDrag, { passive: true });
    return () => {
      document.removeEventListener("keydown", cancelOnEscape, true);
      scrollRoot?.removeEventListener("scroll", cancelRegionDrag);
      const drag = dragRef.current;
      dragRef.current = null;
      if (drag?.target.hasPointerCapture(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId);
    };
  }, [scrollRoot, cancelRegionDrag]);

  const startRegionDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const paper = paperRef.current;
    if (!regionEnabled || !rendered || !paper || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    cancelRegionDrag();
    setCaptureError(false);
    onSelectionNotice(false);
    selectionCallback.current?.(null);
    window.getSelection()?.removeAllRanges();
    event.currentTarget.focus({ preventScroll: true });
    dragRef.current = { pointerId: event.pointerId, start: { x: event.clientX, y: event.clientY }, pageRect: paper.getBoundingClientRect(), target: event.currentTarget, canvas: rendered.canvas };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveRegionDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    setDragRegion(normalizePdfRegionDrag(drag.start, { x: event.clientX, y: event.clientY }, drag.pageRect));
  };
  const finishRegionDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const region = normalizePdfRegionDrag(drag.start, { x: event.clientX, y: event.clientY }, drag.pageRect);
    cancelRegionDrag();
    if (!region) return;
    const screenshot = capturePdfRegion(drag.canvas, region);
    if (!screenshot) { setCaptureError(true); selectionCallback.current?.(null); return; }
    selectionCallback.current?.({ text: english ? `${label} region` : `${label}区域`, location: label, pageIndex, region, screenshot, rect: { left: drag.pageRect.left + (region.x + region.width / 2) * drag.pageRect.width, bottom: drag.pageRect.top + (region.y + region.height) * drag.pageRect.height } });
  };

  useEffect(() => {
    const element = pageRef.current;
    if (!element || typeof IntersectionObserver === "undefined") { setNearby(true); return; }
    const observer = new IntersectionObserver(([entry]) => setNearby(entry.isIntersecting), { root: scrollRoot, rootMargin: "900px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    const canvasHost = canvasHostRef.current;
    const textHost = textHostRef.current;
    if (!nearby || !canvasHost || !textHost || !availableWidth) { setRendered(null); return; }
    let cancelled = false;
    let renderTask: RenderTask | undefined;
    let textLayer: TextLayer | undefined;
    const canvas = document.createElement("canvas");
    canvas.className = "task-pdf-viewer__canvas";
    canvas.setAttribute("aria-hidden", "true");
    const layer = document.createElement("div");
    layer.className = "task-pdf-viewer__text-layer";
    canvasHost.replaceChildren(canvas);
    textHost.replaceChildren(layer);
    setRendered(null);
    setPageError(false);
    void (async () => {
      const page = await pdf.getPage(pageIndex + 1);
      if (cancelled) return;
      const natural = page.getViewport({ scale: 1 });
      setSize(previous => previous.width === natural.width && previous.height === natural.height ? previous : { width: natural.width, height: natural.height });
      const nextScale = zoom === null ? Math.max(0.1, (availableWidth - PAGE_GUTTER * 2) / natural.width) : zoom * CSS_UNITS;
      const viewport = page.getViewport({ scale: nextScale });
      // Bound bitmap memory even on high-DPI screens or unusually large pages.
      const outputScale = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8_000_000 / (viewport.width * viewport.height)));
      canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
      canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      layer.style.setProperty("--scale-factor", String(nextScale));
      layer.style.setProperty("--user-unit", String(page.userUnit));
      layer.style.setProperty("--total-scale-factor", String(nextScale * page.userUnit));
      layer.style.setProperty("--scale-round-x", "1px");
      layer.style.setProperty("--scale-round-y", "1px");
      renderTask = page.render({ canvas, viewport, transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0], background: "#ffffff" });
      let hasText = false;
      const renderText = page.getTextContent().then(async text => {
        if (cancelled) return;
        hasText = text.items.some(item => "str" in item && Boolean(item.str.trim()));
        textLayer = new TextLayer({ textContentSource: text, container: layer, viewport });
        await textLayer.render();
      });
      await Promise.all([renderTask.promise, renderText]);
      if (!cancelled) setRendered({ canvas, layer, hasText });
    })().catch(error => {
      if (!cancelled && error?.name !== "RenderingCancelledException" && error?.name !== "AbortException") setPageError(true);
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
      canvas.remove();
      layer.remove();
      // A new canvas is used for every render, so a cancelled task can never
      // contend with the next zoom/resize render on the same bitmap.
      if (renderTask) void renderTask.promise.catch(() => {}).finally(() => { canvas.width = 0; canvas.height = 0; });
      else { canvas.width = 0; canvas.height = 0; }
    };
  }, [pdf, pageIndex, nearby, availableWidth, zoom, attempt]);

  useEffect(() => {
    const paper = paperRef.current;
    if (!rendered || !paper) { setMarks([]); return; }
    const pageRect = paper.getBoundingClientRect();
    const rectangles = (anchor: TaskFileAnnotationAnchor) => {
      const region = getPdfPageRegion(anchor, pageIndex);
      if (region) return [region];
      return anchor.kind === "text" && anchor.pageIndex === pageIndex && anchor.documentText !== undefined && anchor.selectionStart !== undefined && anchor.selectionEnd !== undefined
        ? getPdfTextAnchorRects({ textLayer: rendered.layer, pageRect, documentText: anchor.documentText, selectionStart: anchor.selectionStart, selectionEnd: anchor.selectionEnd, quote: anchor.quote }) : [];
    };
    const next: PageMark[] = annotations.flatMap(({ annotation, number }) => {
      const regions = rectangles(annotation.anchor);
      return regions.length ? [{ id: annotation.id, number, location: annotation.anchor.location, regions, isRegion: annotation.anchor.kind === "region" }] : [];
    });
    if (draftAnchor) {
      const regions = rectangles(draftAnchor);
      if (regions.length) next.push({ id: "__draft__", number: undefined, location: undefined, regions, isRegion: draftAnchor.kind === "region" });
    }
    setMarks(next);
  }, [rendered, annotations, draftAnchor, pageIndex, width, height]);

  useEffect(() => {
    if (!activeThreadId) return;
    const request = requestAnimationFrame(() => {
      const marker = markerRefs.current.get(activeThreadId);
      if (!marker || !scrollRoot) return;
      const bounds = marker.getBoundingClientRect();
      const outside = scrollRoot.getBoundingClientRect();
      if (bounds.top < outside.top + 24 || bounds.bottom > outside.bottom - 24) scrollRoot.scrollTop += bounds.top - outside.top - Math.min(100, scrollRoot.clientHeight / 4);
    });
    return () => cancelAnimationFrame(request);
  }, [activeThreadId, focusSequence, marks, scrollRoot]);

  useEffect(() => {
    if (!rendered || regionEnabled) return;
    const layer = rendered.layer;
    let pointerDown = false;
    let request = 0;
    let timer = 0;
    const capture = () => {
      const paper = paperRef.current;
      if (!paper) return;
      const selection = window.getSelection();
      const value = readPdfTextSelection({ selection, textLayer: layer, pageRect: paper.getBoundingClientRect(), pageIndex });
      if (value) {
        onSelectionNotice(false);
        selectionCallback.current?.({ ...value, location: label, screenshot: capturePdfRegion(rendered.canvas, value.region) });
      } else if (selection?.anchorNode && layer.contains(selection.anchorNode)) {
        selectionCallback.current?.(null);
        if (!selection.isCollapsed && selection.rangeCount === 1) {
          const range = selection.getRangeAt(0);
          const startLayer = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as Element : range.startContainer.parentElement)?.closest(".task-pdf-viewer__text-layer");
          const endLayer = (range.endContainer.nodeType === Node.ELEMENT_NODE ? range.endContainer as Element : range.endContainer.parentElement)?.closest(".task-pdf-viewer__text-layer");
          if (startLayer && endLayer && startLayer !== endLayer) onSelectionNotice(true);
        }
      }
    };
    const schedule = () => { cancelAnimationFrame(request); request = requestAnimationFrame(capture); };
    const start = () => { pointerDown = true; onSelectionNotice(false); selectionCallback.current?.(null); };
    const end = () => { if (pointerDown) { pointerDown = false; schedule(); } };
    const selectionChanged = () => {
      window.clearTimeout(timer);
      const selection = window.getSelection();
      if (!pointerDown && selection?.anchorNode && layer.contains(selection.anchorNode)) timer = window.setTimeout(capture, 160);
    };
    layer.addEventListener("pointerdown", start);
    document.addEventListener("keyup", schedule);
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
    document.addEventListener("selectionchange", selectionChanged);
    return () => {
      cancelAnimationFrame(request);
      window.clearTimeout(timer);
      layer.removeEventListener("pointerdown", start);
      document.removeEventListener("keyup", schedule);
      document.removeEventListener("pointerup", end);
      document.removeEventListener("pointercancel", end);
      document.removeEventListener("selectionchange", selectionChanged);
    };
  }, [rendered, regionEnabled, onSelectionNotice, pageIndex, label]);

  return <article aria-label={label} className="task-pdf-viewer__page" data-pdf-page-index={pageIndex} ref={element => { pageRef.current = element; registerPage(pageIndex, element); }} style={{ width }}>
    <div aria-busy={nearby && !rendered && !pageError} className="task-pdf-viewer__paper" ref={paperRef} style={{ width, height }}>
      <div className="task-pdf-viewer__canvas-host" ref={canvasHostRef} />
      <div className="task-pdf-viewer__text-host" ref={textHostRef} />
      {regionEnabled && <div aria-label={english ? `${label}: drag to select a region; Escape cancels` : `${label}：拖动框选区域，按 Escape 取消`} className="task-pdf-viewer__region-selector" data-dragging={Boolean(dragRegion)} data-pdf-region-selector="true" onLostPointerCapture={cancelRegionDrag} onPointerCancel={cancelRegionDrag} onPointerDown={startRegionDrag} onPointerMove={moveRegionDrag} onPointerUp={finishRegionDrag} role="group" tabIndex={0}>{dragRegion && <span aria-hidden="true" className="task-pdf-viewer__region-drag" style={regionStyle(dragRegion)} />}</div>}
      {!rendered && <div className="task-pdf-viewer__page-status" role={pageError ? "alert" : "status"}>{pageError ? <><FileWarning aria-hidden="true" size={22} /><span>{english ? "This page could not be displayed." : "此页无法显示。"}</span><button onClick={() => setAttempt(value => value + 1)} type="button"><RotateCw aria-hidden="true" size={14} />{english ? "Retry" : "重试"}</button></> : nearby ? <span>{english ? "Rendering page…" : "正在显示页面…"}</span> : null}</div>}
      {marks.map(mark => <div className="task-pdf-viewer__mark" data-active={mark.id === activeThreadId} data-annotation-overlay="true" data-draft={mark.id === "__draft__"} data-region={mark.isRegion} key={mark.id}>
        {mark.regions.map((region, index) => <span aria-hidden="true" className="task-pdf-viewer__highlight" key={index} style={regionStyle(region)} />)}
        {mark.number !== undefined && <button aria-label={`${english ? "Annotation" : "标注"} ${mark.number}: ${mark.location ?? label}`} aria-pressed={mark.id === activeThreadId} className="task-pdf-viewer__number" onClick={event => { event.stopPropagation(); onThreadSelect?.(mark.id, event.currentTarget); }} ref={element => { if (element) markerRefs.current.set(mark.id, element); else markerRefs.current.delete(mark.id); }} style={{ left: `${mark.regions[0].x * 100}%`, top: `${mark.regions[0].y * 100}%` }} type="button">{mark.number}</button>}
      </div>)}
    </div>
    <footer className="task-pdf-viewer__page-footer"><span>{label}</span>{captureError ? <span className="task-pdf-viewer__capture-error" role="alert">{english ? "Region capture failed. Please select the region again." : "区域截图失败，请重新框选。"}</span> : rendered && !rendered.hasText && <span>{annotationMode ? english ? "No selectable text. Drag to select a region to annotate." : "此页没有可选择的文字，可拖动框选区域标注。" : english ? "No selectable text. Enable file annotations to select a region." : "此页没有可选择的文字，开启文件标注后可框选区域。"}</span>}</footer>
  </article>;
}

export function TaskPdfViewer({ file, url, annotationMode = false, annotations = EMPTY_ANNOTATIONS, draftAnchor, activeThreadId, focusSequence, onThreadSelect, onSelection }: Props) {
  const { locale } = useI18n();
  const english = locale === "en";
  const viewportRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const thumbnailsToggleRef = useRef<HTMLButtonElement>(null);
  const thumbnailCloseTimer = useRef(0);
  const thumbnailHovering = useRef(false);
  const suppressFocusOpen = useRef(false);
  const thumbnailsId = useId();
  const pageRefs = useRef(new Map<number, HTMLElement>());
  const [loaded, setLoaded] = useState<{ pdf: PDFDocumentProxy; firstSize: PageSize } | null>(null);
  const [error, setError] = useState<"load" | "password" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [selectionNotice, setSelectionNotice] = useState(false);
  const [selectionMode, setSelectionMode] = useState<PdfAnnotationSelectionMode>("text");
  const [pageTextAvailability, setPageTextAvailability] = useState<Record<number, boolean>>({});
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [thumbnailsPinned, setThumbnailsPinned] = useState(false);
  const thumbnailsPinnedRef = useRef(thumbnailsPinned);
  thumbnailsPinnedRef.current = thumbnailsPinned;
  const version = file.version ?? 1;
  const currentAnnotations = useMemo(() => annotations.map((annotation, index) => ({ annotation, number: index + 1 })).filter(({ annotation }) => annotation.fileId === file.id && annotation.version === version), [annotations, file.id, version]);
  const annotationsByPage = useMemo(() => {
    const pages = new Map<number, NumberedAnnotation[]>();
    for (const item of currentAnnotations) {
      const index = item.annotation.anchor.pageIndex;
      if (index === undefined) continue;
      const page = pages.get(index) ?? [];
      page.push(item);
      pages.set(index, page);
    }
    return pages;
  }, [currentAnnotations]);

  useEffect(() => {
    let cancelled = false;
    let passwordRequired = false;
    setLoaded(null);
    setError(null);
    setCurrentPage(1);
    setPageInput("1");
    setZoom(null);
    setSelectionNotice(false);
    setSelectionMode("text");
    setPageTextAvailability({});
    setThumbnailsOpen(false);
    setThumbnailsPinned(false);
    window.clearTimeout(thumbnailCloseTimer.current);
    if (!url) { setError("load"); return; }
    const loadingTask = loadTaskPdfDocument(url);
    loadingTask.onPassword = () => { passwordRequired = true; if (!cancelled) setError("password"); void loadingTask.destroy().catch(() => {}); };
    void loadingTask.promise.then(async pdf => {
      const first = await pdf.getPage(1);
      if (cancelled) return;
      const viewport = first.getViewport({ scale: 1 });
      setLoaded({ pdf, firstSize: { width: viewport.width, height: viewport.height } });
    }).catch(() => { if (!cancelled && !passwordRequired) setError("load"); });
    return () => { cancelled = true; void loadingTask.destroy().catch(() => {}); };
  }, [url, file.id, version, attempt]);

  useEffect(() => { setSelectionMode("text"); }, [annotationMode]);
  const reportTextAvailability = useCallback((pageIndex: number, hasText: boolean) => setPageTextAvailability(previous => previous[pageIndex] === hasText ? previous : { ...previous, [pageIndex]: hasText }), []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setAvailableWidth(viewport.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!loaded || !viewport || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      const entry = entries.find(item => item.isIntersecting);
      if (entry) setCurrentPage(Number((entry.target as HTMLElement).dataset.pdfPageIndex) + 1);
    }, { root: viewport, rootMargin: "-20% 0px -65% 0px", threshold: 0 });
    pageRefs.current.forEach(page => observer.observe(page));
    return () => observer.disconnect();
  }, [loaded]);
  useEffect(() => { setPageInput(String(currentPage)); }, [currentPage]);

  const jumpToPage = (value: number) => {
    if (!loaded || !Number.isFinite(value)) { setPageInput(String(currentPage)); return; }
    const page = Math.max(1, Math.min(loaded.pdf.numPages, Math.round(value)));
    const viewport = viewportRef.current;
    const element = pageRefs.current.get(page - 1);
    if (viewport && element) viewport.scrollTop += element.getBoundingClientRect().top - viewport.getBoundingClientRect().top - PAGE_GUTTER;
    setCurrentPage(page);
    setPageInput(String(page));
    onSelection?.(null);
  };

  useEffect(() => () => window.clearTimeout(thumbnailCloseTimer.current), []);

  const revealThumbnails = () => { window.clearTimeout(thumbnailCloseTimer.current); setThumbnailsOpen(true); };
  const scheduleThumbnailClose = () => {
    window.clearTimeout(thumbnailCloseTimer.current);
    thumbnailCloseTimer.current = window.setTimeout(() => {
      if (!thumbnailsPinnedRef.current && !thumbnailHovering.current && !navigationRef.current?.contains(document.activeElement)) setThumbnailsOpen(false);
    }, 240);
  };
  const closeThumbnails = () => {
    window.clearTimeout(thumbnailCloseTimer.current);
    setThumbnailsOpen(false);
    setThumbnailsPinned(false);
    suppressFocusOpen.current = true;
    thumbnailsToggleRef.current?.focus({ preventScroll: true });
    queueMicrotask(() => { suppressFocusOpen.current = false; });
  };

  useEffect(() => {
    const sidebar = thumbnailsRef.current;
    const current = sidebar?.querySelector<HTMLElement>(`[data-page-index="${currentPage - 1}"]`);
    if (!thumbnailsOpen || !sidebar || !current) return;
    const outside = sidebar.getBoundingClientRect();
    const bounds = current.getBoundingClientRect();
    if (bounds.top < outside.top) sidebar.scrollTop += bounds.top - outside.top - 12;
    else if (bounds.bottom > outside.bottom) sidebar.scrollTop += bounds.bottom - outside.bottom + 12;
    if (bounds.left < outside.left) sidebar.scrollLeft += bounds.left - outside.left - 12;
    else if (bounds.right > outside.right) sidebar.scrollLeft += bounds.right - outside.right + 12;
  }, [thumbnailsOpen, currentPage, loaded]);

  useEffect(() => {
    if (!activeThreadId || !loaded) return;
    const anchor = currentAnnotations.find(({ annotation }) => annotation.id === activeThreadId)?.annotation.anchor;
    if (anchor?.pageIndex === undefined) return;
    const viewport = viewportRef.current;
    const page = pageRefs.current.get(anchor.pageIndex);
    if (viewport && page) viewport.scrollTop += page.getBoundingClientRect().top - viewport.getBoundingClientRect().top - PAGE_GUTTER;
  }, [activeThreadId, focusSequence, loaded, currentAnnotations]);

  const percentage = zoom === null ? loaded && availableWidth ? Math.round(((availableWidth - PAGE_GUTTER * 2) / loaded.firstSize.width / CSS_UNITS) * 100) : 100 : Math.round(zoom * 100);
  const changeZoom = (amount: number) => { onSelection?.(null); setZoom(Math.max(0.25, Math.min(3, Math.round((percentage / 100 + amount) * 20) / 20))); };
  const ready = Boolean(loaded);
  const noMarks = useMemo<NumberedAnnotation[]>(() => [], []);
  const navigationLineCount = Math.min(7, loaded?.pdf.numPages ?? 0);
  const navigationLineStart = Math.min(Math.max(0, currentPage - 4), (loaded?.pdf.numPages ?? 0) - navigationLineCount);
  const currentPageHasText = pageTextAvailability[currentPage - 1];
  const effectiveSelectionMode = resolvePdfSelectionMode({ annotationMode, hasText: currentPageHasText, preferredMode: selectionMode });
  const chooseSelectionMode = (mode: PdfAnnotationSelectionMode) => {
    onSelection?.(null);
    window.getSelection()?.removeAllRanges();
    setSelectionNotice(false);
    setSelectionMode(mode);
  };

  return <div aria-label={file.name} className="task-pdf-viewer" data-annotation-mode={annotationMode}>
    <div aria-label={english ? "PDF controls" : "PDF 阅读工具"} className="task-pdf-viewer__toolbar" role="toolbar">
      <div className="task-pdf-viewer__page-controls"><button aria-label={english ? "Previous page" : "上一页"} disabled={!ready || currentPage <= 1} onClick={() => jumpToPage(currentPage - 1)} title={english ? "Previous page" : "上一页"} type="button"><ChevronLeft aria-hidden="true" size={16} /></button><label className="task-pdf-viewer__page-input"><span className="sr-only">{english ? "Page number" : "页码"}</span><input disabled={!ready} inputMode="numeric" max={loaded?.pdf.numPages ?? 1} min={1} onBlur={() => jumpToPage(Number(pageInput))} onChange={event => setPageInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); jumpToPage(Number(pageInput)); } }} type="number" value={pageInput} /><span>/ {loaded?.pdf.numPages ?? "—"}</span></label><button aria-label={english ? "Next page" : "下一页"} disabled={!ready || currentPage >= (loaded?.pdf.numPages ?? 1)} onClick={() => jumpToPage(currentPage + 1)} title={english ? "Next page" : "下一页"} type="button"><ChevronRight aria-hidden="true" size={16} /></button></div>
      {annotationMode && <div aria-label={english ? "Annotation selection" : "标注选区方式"} className="task-pdf-viewer__selection-controls" role="group"><button aria-pressed={effectiveSelectionMode === "text"} disabled={!ready || currentPageHasText === false} onClick={() => chooseSelectionMode("text")} title={currentPageHasText === false ? english ? "No selectable text on this page" : "此页没有可选择的文字" : undefined} type="button"><TextSelect aria-hidden="true" size={14} /><span>{english ? "Text" : "选文字"}</span></button><button aria-pressed={effectiveSelectionMode === "region"} disabled={!ready} onClick={() => chooseSelectionMode("region")} type="button"><Scan aria-hidden="true" size={14} /><span>{english ? "Region" : "框选区域"}</span></button></div>}
      <div className="task-pdf-viewer__zoom-controls"><button aria-label={english ? "Zoom out" : "缩小"} disabled={!ready || percentage <= 25} onClick={() => changeZoom(-0.1)} title={english ? "Zoom out" : "缩小"} type="button"><Minus aria-hidden="true" size={15} /></button><output aria-label={english ? "Zoom" : "缩放"}>{percentage}%</output><button aria-label={english ? "Zoom in" : "放大"} disabled={!ready || percentage >= 300} onClick={() => changeZoom(0.1)} title={english ? "Zoom in" : "放大"} type="button"><Plus aria-hidden="true" size={15} /></button><span className="task-pdf-viewer__separator" /><button aria-label={english ? "Fit to width" : "适应宽度"} aria-pressed={zoom === null} className="task-pdf-viewer__fit" disabled={!ready} onClick={() => { onSelection?.(null); setZoom(null); }} title={english ? "Fit to width" : "适应宽度"} type="button"><Maximize aria-hidden="true" size={14} /><span>{english ? "Fit width" : "适宽"}</span></button></div>
    </div>
    {selectionNotice && <p className="task-pdf-viewer__selection-notice" role="status">{english ? "Select text within a single page to annotate." : "请在同一页选择文字后标注。"}</p>}
    <div className="task-pdf-viewer__workspace">
    {loaded && <div className="task-pdf-viewer__navigation" data-open={thumbnailsOpen} onBlur={scheduleThumbnailClose} onFocus={() => { if (!suppressFocusOpen.current) revealThumbnails(); }} onKeyDown={event => { if (event.key === "Escape" && thumbnailsOpen) { event.preventDefault(); event.stopPropagation(); closeThumbnails(); } }} onPointerEnter={event => { if (event.pointerType === "mouse") { thumbnailHovering.current = true; revealThumbnails(); } }} onPointerLeave={event => { if (event.pointerType === "mouse") { thumbnailHovering.current = false; scheduleThumbnailClose(); } }} ref={navigationRef}>
      <button aria-controls={thumbnailsId} aria-expanded={thumbnailsOpen} aria-label={english ? "Page thumbnails" : "页面缩略图"} className="task-pdf-viewer__navigation-lines" onClick={() => { window.clearTimeout(thumbnailCloseTimer.current); if (thumbnailsPinned) closeThumbnails(); else { setThumbnailsPinned(true); setThumbnailsOpen(true); } }} ref={thumbnailsToggleRef} title={english ? "Page thumbnails" : "页面缩略图"} type="button"><span aria-hidden="true">{Array.from({ length: navigationLineCount }, (_, index) => <i data-current={navigationLineStart + index === currentPage - 1} key={index} />)}</span></button>
      <aside aria-label={english ? "Page thumbnails" : "页面缩略图"} className="task-pdf-viewer__thumbnails" hidden={!thumbnailsOpen} id={thumbnailsId}>
        <header className="task-pdf-viewer__thumbnails-header"><strong>{english ? `${loaded.pdf.numPages} pages` : `${loaded.pdf.numPages} 页`}</strong><button aria-label={thumbnailsPinned ? english ? "Unpin thumbnails" : "取消固定缩略图" : english ? "Pin thumbnails" : "固定缩略图"} aria-pressed={thumbnailsPinned} onClick={() => setThumbnailsPinned(value => !value)} title={thumbnailsPinned ? english ? "Unpin thumbnails" : "取消固定缩略图" : english ? "Pin thumbnails" : "固定缩略图"} type="button">{thumbnailsPinned ? <PinOff aria-hidden="true" size={14} /> : <Pin aria-hidden="true" size={14} />}</button><button aria-label={english ? "Hide thumbnails" : "收起缩略图"} onClick={closeThumbnails} title={english ? "Hide thumbnails" : "收起缩略图"} type="button"><ChevronLeft aria-hidden="true" size={16} /></button></header>
        <div className="task-pdf-viewer__thumbnail-scroll" data-pdf-thumbnail-scroll="true" ref={thumbnailsRef}>{thumbnailsOpen && <ol>{Array.from({ length: loaded.pdf.numPages }, (_, pageIndex) => <PdfThumbnail current={currentPage === pageIndex + 1} english={english} firstSize={loaded.firstSize} key={pageIndex} onSelect={() => jumpToPage(pageIndex + 1)} pageIndex={pageIndex} pdf={loaded.pdf} />)}</ol>}</div>
      </aside>
    </div>}
    <div className="task-pdf-viewer__viewport" onScroll={() => onSelection?.(null)} ref={viewportRef}>
      {error ? <div className="task-pdf-viewer__document-status task-file-viewer-unsupported"><FileWarning aria-hidden="true" size={28} /><p role="alert">{error === "password" ? english ? "This PDF requires a password. Download the original to view it." : "此 PDF 需要密码，请下载原文件查看。" : english ? "This PDF could not be opened. Please try again." : "PDF 无法打开，请重试。"}</p><button onClick={() => setAttempt(value => value + 1)} type="button"><RotateCw aria-hidden="true" size={14} />{english ? "Retry" : "重试"}</button></div> : !loaded ? <div aria-live="polite" className="task-pdf-viewer__document-status" role="status"><span className="task-pdf-viewer__spinner" />{english ? "Opening PDF…" : "正在打开 PDF…"}</div> : <div className="task-pdf-viewer__pages">{Array.from({ length: loaded.pdf.numPages }, (_, pageIndex) => <PdfPage activeThreadId={activeThreadId} annotationMode={annotationMode} annotations={annotationsByPage.get(pageIndex) ?? noMarks} availableWidth={availableWidth} draftAnchor={draftAnchor?.pageIndex === pageIndex ? draftAnchor : null} english={english} firstSize={loaded.firstSize} focusSequence={focusSequence} key={pageIndex} onSelection={onSelection} onSelectionNotice={setSelectionNotice} onTextAvailability={reportTextAvailability} onThreadSelect={onThreadSelect} pageIndex={pageIndex} pdf={loaded.pdf} registerPage={(index, element) => { if (element) pageRefs.current.set(index, element); else pageRefs.current.delete(index); }} scrollRoot={viewportRef.current} selectionMode={selectionMode} zoom={zoom} />)}</div>}
    </div>
    </div>
  </div>;
}
