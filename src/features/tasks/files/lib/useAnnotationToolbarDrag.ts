import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type PointerEvent } from "react";
import { clampAnnotationToolbarPosition, type AnnotationToolbarPosition } from "@/features/tasks/files/lib/annotation-toolbar-position";

type DragSession = { pointerId: number; startX: number; startY: number; origin: AnnotationToolbarPosition; handle: HTMLButtonElement };

export function useAnnotationToolbarDrag(enabled = true) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragSession | null>(null);
  const positionRef = useRef<AnnotationToolbarPosition | null>(null);
  const [position, setPosition] = useState<AnnotationToolbarPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const updatePosition = useCallback((next: AnnotationToolbarPosition | null) => {
    positionRef.current = next;
    setPosition(current => current?.left === next?.left && current?.top === next?.top ? current : next);
  }, []);
  const clampPosition = useCallback((next: AnnotationToolbarPosition) => {
    const rect = toolbarRef.current?.getBoundingClientRect();
    return rect ? clampAnnotationToolbarPosition(next, rect, { width: window.innerWidth, height: window.innerHeight }) : next;
  }, []);
  const releaseDrag = useCallback(() => {
    const session = drag.current;
    drag.current = null;
    if (session?.handle.hasPointerCapture(session.pointerId)) session.handle.releasePointerCapture(session.pointerId);
  }, []);
  const reset = useCallback(() => {
    releaseDrag();
    setIsDragging(false);
    updatePosition(null);
  }, [releaseDrag, updatePosition]);

  useEffect(() => {
    if (!enabled) { releaseDrag(); setIsDragging(false); return; }
    const reclamp = () => { if (positionRef.current) updatePosition(clampPosition(positionRef.current)); };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(reclamp) : null;
    if (toolbarRef.current) observer?.observe(toolbarRef.current);
    window.addEventListener("resize", reclamp);
    reclamp();
    return () => { observer?.disconnect(); window.removeEventListener("resize", reclamp); releaseDrag(); };
  }, [enabled, clampPosition, releaseDrag, updatePosition]);

  const movePointer = (event: PointerEvent<HTMLButtonElement>) => {
    const session = drag.current;
    if (!session || session.pointerId !== event.pointerId) return;
    updatePosition(clampPosition({ left: session.origin.left + event.clientX - session.startX, top: session.origin.top + event.clientY - session.startY }));
  };
  const endPointer = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    if (!cancelled) movePointer(event);
    if (positionRef.current) updatePosition(clampPosition(positionRef.current));
    releaseDrag();
    setIsDragging(false);
  };
  const handleProps: ButtonHTMLAttributes<HTMLButtonElement> = {
    type: "button",
    style: { touchAction: "none", userSelect: "none", cursor: isDragging ? "grabbing" : "grab" },
    "aria-keyshortcuts": "ArrowUp ArrowDown ArrowLeft ArrowRight Home",
    onPointerDown: event => {
      if (!enabled || event.button !== 0 || !event.isPrimary || drag.current) return;
      const rect = toolbarRef.current?.getBoundingClientRect();
      if (!rect) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: { left: rect.left, top: rect.top }, handle: event.currentTarget };
      updatePosition(clampPosition(drag.current.origin));
      setIsDragging(true);
    },
    onPointerMove: movePointer,
    onPointerUp: event => endPointer(event),
    onPointerCancel: event => endPointer(event, true),
    onLostPointerCapture: event => endPointer(event, true),
    onKeyDown: event => {
      if (!enabled || event.altKey || event.ctrlKey || event.metaKey) return;
      const step = event.shiftKey ? 1 : 10;
      const deltas: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const delta = deltas[event.key];
      if (event.key !== "Home" && !delta) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Home") { reset(); return; }
      const rect = toolbarRef.current?.getBoundingClientRect();
      if (!rect || !delta) return;
      const current = positionRef.current ?? { left: rect.left, top: rect.top };
      updatePosition(clampPosition({ left: current.left + delta[0], top: current.top + delta[1] }));
    },
  };
  const style: CSSProperties = position ? { position: "fixed", left: position.left, top: position.top, right: "auto", bottom: "auto", transform: "none" } : {};
  return { toolbarRef, handleProps, position, style, isDragging, reset };
}
