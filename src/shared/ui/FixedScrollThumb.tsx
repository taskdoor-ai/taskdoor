import { type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject, useLayoutEffect, useRef, useState } from "react";
import "../styles/fixed-scroll-thumb.css";

type ScrollThumbMetrics = {
  height: number;
  maxScroll: number;
  top: number;
  travel: number;
  visible: boolean;
};

const hiddenMetrics: ScrollThumbMetrics = { height: 0, maxScroll: 0, top: 0, travel: 0, visible: false };

export function FixedScrollThumb({ bottomInset = 8, scrollRef, topInset = 8 }: {
  bottomInset?: number;
  scrollRef: RefObject<HTMLElement | null>;
  topInset?: number;
}) {
  const [metrics, setMetrics] = useState(hiddenMetrics);
  const drag = useRef<{ pointerY: number; scrollTop: number } | null>(null);

  useLayoutEffect(() => {
    const scrollRoot = scrollRef.current;
    const parent = scrollRoot?.parentElement;
    if (!scrollRoot || !parent) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const maxScroll = scrollRoot.scrollHeight - scrollRoot.clientHeight;
      if (maxScroll <= 1) {
        setMetrics(hiddenMetrics);
        return;
      }
      const parentRect = parent.getBoundingClientRect();
      const rootRect = scrollRoot.getBoundingClientRect();
      const trackTop = rootRect.top - parentRect.top + topInset;
      const trackHeight = Math.max(0, scrollRoot.clientHeight - topInset - bottomInset);
      const proportionalHeight = trackHeight * scrollRoot.clientHeight / scrollRoot.scrollHeight;
      const height = Math.min(96, Math.max(44, proportionalHeight));
      const travel = Math.max(0, trackHeight - height);
      const top = trackTop + (scrollRoot.scrollTop / maxScroll) * travel;
      setMetrics({ height, maxScroll, top, travel, visible: trackHeight > 0 });
    };
    const scheduleMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    scrollRoot.addEventListener("scroll", scheduleMeasure, { passive: true });
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);
    resizeObserver?.observe(scrollRoot);
    resizeObserver?.observe(parent);
    if (scrollRoot.firstElementChild) resizeObserver?.observe(scrollRoot.firstElementChild);
    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(scheduleMeasure);
    mutationObserver?.observe(scrollRoot, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scrollRoot.removeEventListener("scroll", scheduleMeasure);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [bottomInset, scrollRef, topInset]);

  if (!metrics.visible) return null;
  const style = { height: `${metrics.height}px`, transform: `translateY(${metrics.top}px)` } as CSSProperties;
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = { pointerY: event.clientY, scrollTop: scrollRef.current?.scrollTop ?? 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
    event.preventDefault();
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scrollRoot = scrollRef.current;
    if (!drag.current || !scrollRoot || metrics.travel <= 0) return;
    scrollRoot.scrollTop = drag.current.scrollTop + (event.clientY - drag.current.pointerY) * metrics.maxScroll / metrics.travel;
  };
  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <div className="task-fixed-scroll-thumb" onPointerCancel={finishDrag} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishDrag} style={style} />;
}
