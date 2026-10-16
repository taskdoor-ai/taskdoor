import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";

export function useSidebarWidth(key: string, initial: number, min: number, max: number) {
  const [width, setWidth] = useState(() => {
    try { const saved = Number(localStorage.getItem(key)); return saved >= min && saved <= max ? saved : initial; }
    catch { return initial; }
  });
  const change = (next: number) => {
    const accepted = Math.round(Math.max(min, Math.min(max, next)));
    setWidth(accepted);
    try { localStorage.setItem(key, String(accepted)); } catch { /* Current-session resizing remains available. */ }
  };
  return { width, change, style: { "--task-sidebar-width": `${width}px` } as CSSProperties };
}

type SidebarResizeHandleProps = {
  width: number;
  onChange: (width: number) => void;
  min: number;
  max: number;
  kind: "tasks" | "files";
  onResizePreview?: (width: number) => void;
  onResizeCommit?: (width: number) => void;
  onResizeCancel?: () => void;
  onResizingChange?: (resizing: boolean) => void;
};

export function SidebarResizeHandle({ width, onChange, min, max, kind, onResizePreview, onResizeCommit, onResizeCancel, onResizingChange }: SidebarResizeHandleProps) {
  const { locale } = useI18n();
  const origin = useRef<{ pointerId: number; x: number; width: number; candidateWidth: number; preview: boolean } | null>(null);
  const previewFrame = useRef<number | null>(null);
  const previewCallback = useRef(onResizePreview);
  previewCallback.current = onResizePreview;
  const previewEnabled = Boolean(onResizePreview);
  const clearPreviewFrame = () => {
    if (previewFrame.current === null) return;
    cancelAnimationFrame(previewFrame.current);
    previewFrame.current = null;
  };
  const cancelResize = () => {
    const drag = origin.current;
    if (!drag) return;
    origin.current = null;
    clearPreviewFrame();
    if (drag.preview) onResizeCancel?.();
    onResizingChange?.(false);
  };
  useEffect(() => () => {
    if (previewFrame.current !== null) cancelAnimationFrame(previewFrame.current);
    previewFrame.current = null;
    origin.current = null;
  }, []);
  const label = locale === "en" ? `Resize ${kind === "tasks" ? "task list" : "file tree"}` : kind === "tasks" ? "调整任务列表宽度" : "调整文件树宽度";
  return <div role="separator" aria-label={label} aria-keyshortcuts={previewEnabled ? "Home" : undefined} aria-orientation="vertical" aria-valuemin={min} aria-valuemax={max} aria-valuenow={width} tabIndex={0} className="task-sidebar-resizer"
    onPointerDown={event => {
      if (event.button !== 0 || origin.current) return;
      event.preventDefault();
      const renderedWidth = previewEnabled ? event.currentTarget.parentElement?.getBoundingClientRect().width ?? width : width;
      origin.current = { pointerId: event.pointerId, x: event.clientX, width: renderedWidth, candidateWidth: renderedWidth, preview: previewEnabled };
      event.currentTarget.setPointerCapture(event.pointerId);
      onResizingChange?.(true);
    }}
    onPointerMove={event => {
      const drag = origin.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const available = event.currentTarget.parentElement?.parentElement?.clientWidth ?? max + 360;
      const next = drag.width + event.clientX - drag.x;
      drag.candidateWidth = drag.preview ? Math.min(max, next) : Math.max(min, Math.min(max, available - 320, next));
      if (!drag.preview) {
        onChange(drag.candidateWidth);
        return;
      }
      if (previewFrame.current !== null) return;
      previewFrame.current = requestAnimationFrame(() => {
        previewFrame.current = null;
        if (origin.current === drag) previewCallback.current?.(drag.candidateWidth);
      });
    }}
    onPointerUp={event => {
      const drag = origin.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.preview) drag.candidateWidth = Math.min(max, drag.width + event.clientX - drag.x);
      origin.current = null;
      clearPreviewFrame();
      if (drag.preview) {
        previewCallback.current?.(drag.candidateWidth);
        // Establish the final pointer position while transitions are disabled.
        event.currentTarget.parentElement?.getBoundingClientRect();
      }
      onResizingChange?.(false);
      if (drag.preview) (onResizeCommit ?? onChange)(drag.candidateWidth);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onLostPointerCapture={event => { if (origin.current?.pointerId === event.pointerId) cancelResize(); }}
    onPointerCancel={event => { if (origin.current?.pointerId === event.pointerId) cancelResize(); }}
    onKeyDown={event => {
      if (previewEnabled && event.key === "Home") {
        event.preventDefault();
        (onResizeCommit ?? onChange)(0);
        return;
      }
      const next = event.key === "ArrowLeft" ? width - 16 : event.key === "ArrowRight" ? width + 16 : event.key === "Home" ? min : event.key === "End" ? max : null;
      if (next !== null) { event.preventDefault(); onChange(Math.max(min, Math.min(max, next))); }
    }} />;
}
