import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

/** Keep the action bar in flow while streamed sections change the draft height. */
export function TaskCreationPlanSurface({ pending, children }: { pending: boolean; children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const [settling, setSettling] = useState(pending);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => {
      const next = Math.ceil(content.getBoundingClientRect().height);
      if (next > 0) setHeight(current => current === next ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (pending) { setSettling(true); return; }
    if (!settling) return;
    // Let the final block settle, then restore natural sizing for direct edits.
    const timer = window.setTimeout(() => setSettling(false), 240);
    return () => window.clearTimeout(timer);
  }, [pending, settling]);

  const animate = !reducedMotion && (pending || settling);
  return <div className="creation-plan-surface" data-animating={animate || undefined} style={{ height: animate ? height : undefined }}>
    <div className="creation-plan-surface-content" ref={contentRef}>{children}</div>
  </div>;
}
