import { useLayoutEffect, useState } from "react";

/** Observe the content width; hidden/collapsed charts keep their last useful canvas. */
export function observeBurnUpWidth(element: HTMLElement, onWidth: (width: number) => void) {
  const measure = () => {
    const width = element.getBoundingClientRect().width;
    if (Number.isFinite(width) && width > 0) onWidth(width);
  };
  measure();
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
  observer?.observe(element);
  if (!observer) window.addEventListener("resize", measure);
  return () => {
    observer?.disconnect();
    if (!observer) window.removeEventListener("resize", measure);
  };
}

export function useBurnUpWidth(initialWidth: number) {
  const [element, ref] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(initialWidth);
  // Measure before paint so a newly expanded chart does not flash enlarged text.
  useLayoutEffect(() => element ? observeBurnUpWidth(element, setWidth) : undefined, [element]);
  return {ref, width};
}
