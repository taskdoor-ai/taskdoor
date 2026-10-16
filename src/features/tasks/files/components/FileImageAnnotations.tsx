import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import type { TaskFileTextSelection } from "@/features/tasks/files/components/TaskFileViewer";
import type { TaskFileAnnotation } from "@/features/tasks/files/lib/task-file-annotations";
import "@/features/tasks/styles/task-file-image-annotations.css";
import { captureFileAnnotationImage } from "@/features/tasks/files/lib/capture-file-annotation";

type Region = NonNullable<TaskFileTextSelection["region"]>;
type Point = { x: number; y: number };
type Props = {
  src: string;
  alt: string;
  imageSrc?: string;
  imageSrcFilter?: string;
  version: number;
  annotationMode?: boolean;
  annotations?: TaskFileAnnotation[];
  activeThreadId?: string | null;
  onThreadSelect?: (id: string) => void;
  onSelection?: (selection: TaskFileTextSelection | null) => void;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const pointerPosition = (event: { clientX: number; clientY: number }, rect: DOMRect): Point => ({ x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) });
const between = (start: Point, end: Point): Region => ({ x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(start.x - end.x), height: Math.abs(start.y - end.y) });
const regionStyle = (region: Region): CSSProperties => ({ left: `${clamp(region.x) * 100}%`, top: `${clamp(region.y) * 100}%`, width: `${Math.max(0, Math.min(region.width, 1 - clamp(region.x))) * 100}%`, height: `${Math.max(0, Math.min(region.height, 1 - clamp(region.y))) * 100}%` });

export function FileImageAnnotations({ src, alt, imageSrc, imageSrcFilter, version, annotationMode = false, annotations = [], activeThreadId, onThreadSelect, onSelection }: Props) {
  const ui = useGlobalUi();
  const imageRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef(new Map<string, HTMLButtonElement>());
  const dragRef = useRef<{ pointerId: number; start: Point } | null>(null);
  const [draftRegion, setDraftRegion] = useState<Region | null>(null);
  const canAnnotate = annotationMode && Boolean(onSelection);
  const visibleAnnotations = annotations.map((annotation, index) => ({ annotation, number: index + 1 })).filter(({ annotation }) => annotation.version === version && annotation.anchor.kind === "region" && annotation.anchor.region && (!imageSrcFilter || annotation.anchor.imageSrc === imageSrcFilter));

  const clearDrag = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && stageRef.current?.hasPointerCapture(drag.pointerId)) stageRef.current.releasePointerCapture(drag.pointerId);
  };

  useEffect(() => {
    clearDrag();
    setDraftRegion(null);
  }, [canAnnotate, src, version]);
  useEffect(() => { setDraftRegion(null); }, [annotations.length]);

  useEffect(() => {
    if (!activeThreadId) return;
    const marker = markerRefs.current.get(activeThreadId);
    marker?.scrollIntoView({ block: "nearest", inline: "nearest" });
    marker?.focus({ preventScroll: true });
  }, [activeThreadId, src, version]);

  const startSelection = (event: PointerEvent<HTMLDivElement>) => {
    if (!canAnnotate || event.button !== 0 || !event.isPrimary || (event.target as Element).closest("button")) return;
    const image = imageRef.current;
    const rect = image?.getBoundingClientRect();
    if (!image?.naturalWidth || !rect?.width || !rect.height) return;
    event.preventDefault();
    onSelection?.(null);
    const start = pointerPosition(event, rect);
    dragRef.current = { pointerId: event.pointerId, start };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraftRegion({ ...start, width: 0, height: 0 });
  };

  const moveSelection = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rect = imageRef.current?.getBoundingClientRect();
    if (!drag || drag.pointerId !== event.pointerId || !rect?.width || !rect.height) return;
    event.preventDefault();
    setDraftRegion(between(drag.start, pointerPosition(event, rect)));
  };

  const finishSelection = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rect = imageRef.current?.getBoundingClientRect();
    if (!drag || drag.pointerId !== event.pointerId || !rect?.width || !rect.height) return;
    event.preventDefault();
    const region = between(drag.start, pointerPosition(event, rect));
    clearDrag();
    if (region.width * rect.width < 8 || region.height * rect.height < 8) {
      setDraftRegion(null);
      return;
    }
    setDraftRegion(region);
    const savedImageSrc = imageSrc && !imageSrc.startsWith("blob:") ? imageSrc : undefined;
    const screenshot = imageRef.current ? captureFileAnnotationImage(imageRef.current, region) : undefined;
    onSelection?.({ text: "", location: ui("图片区域"), region, screenshot, ...(savedImageSrc ? { imageSrc: savedImageSrc } : {}), rect: { left: rect.left + region.x * rect.width, bottom: rect.top + (region.y + region.height) * rect.height } });
  };

  return <div className="task-file-viewer-image task-file-image-annotations">
    <div aria-label={canAnnotate ? ui("拖动选择图片区域") : undefined} className={`task-file-image-annotations__stage${canAnnotate ? " task-file-image-annotations__stage--selecting" : ""}`} onKeyDown={event => {
      if (event.key !== "Escape" || !canAnnotate) return;
      event.preventDefault();
      event.stopPropagation();
      clearDrag();
      setDraftRegion(null);
      onSelection?.(null);
    }} onLostPointerCapture={event => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDraftRegion(null);
    }} onPointerCancel={() => { clearDrag(); setDraftRegion(null); }} onPointerDown={startSelection} onPointerMove={moveSelection} onPointerUp={finishSelection} ref={stageRef} tabIndex={canAnnotate ? 0 : undefined}>
      <img alt={alt} draggable={canAnnotate ? false : undefined} ref={imageRef} src={src} />
      {visibleAnnotations.map(({ annotation, number }) => <div className={`task-file-image-annotations__region${annotation.id === activeThreadId ? " task-file-image-annotations__region--active" : ""}`} key={annotation.id} style={regionStyle(annotation.anchor.region!)}>
        <button aria-label={ui("标注") + ` ${number}: ${annotation.anchor.location}`} aria-pressed={annotation.id === activeThreadId} className="task-file-image-annotations__number" onClick={() => { setDraftRegion(null); onThreadSelect?.(annotation.id); }} ref={element => { if (element) markerRefs.current.set(annotation.id, element); else markerRefs.current.delete(annotation.id); }} type="button">{number}</button>
      </div>)}
      {draftRegion && <div aria-hidden="true" className="task-file-image-annotations__region task-file-image-annotations__region--draft" style={regionStyle(draftRegion)} />}
    </div>
  </div>;
}
