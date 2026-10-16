import { useI18n } from "@/shared/i18n/I18nProvider";
import { useProgressCopy } from "@/features/tasks/i18n/progress-copy";
import { formatDisplayDate, formatDisplayDateTime } from "@/shared/lib/date-time";
import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function nodeDate(value: string, locale: string) {
  return formatDisplayDateTime(value, { locale, year: "always" }) ?? formatDisplayDate(value, { locale, year: "always" }) ?? "—";
}

/** SVG hit target with an HTML tooltip that stays readable at every chart scale. */
export function TaskBurnUpNode({ x, y, date, lines, kind, radius = 9, children }: {
  x: number;
  y: number;
  date: string;
  lines: string[];
  kind: "scope" | "completed" | "forecast" | "scope-forecast";
  radius?: number;
  children: React.ReactNode;
}) {
  const p = useProgressCopy();
  const { locale } = useI18n();
  const displayLines = lines.map(p);
  const id = useId();
  const target = useRef<SVGCircleElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const open = (hovered || focused) && !dismissed;
  const formattedDate = nodeDate(date, locale);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      if (!target.current || !popup.current) return;
      const anchor = target.current.getBoundingClientRect();
      const tip = popup.current.getBoundingClientRect();
      const gap = 8;
      const left = Math.max(gap, Math.min(window.innerWidth - tip.width - gap, anchor.left + anchor.width / 2 - tip.width / 2));
      const above = anchor.top - tip.height - gap;
      const top = Math.max(gap, Math.min(window.innerHeight - tip.height - gap, above >= gap ? above : anchor.bottom + gap));
      setPosition({ left, top });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, date, x, y]);

  return <g className="task-burnup-node" data-kind={kind} data-date={date} tabIndex={0} role="img"
    aria-label={`${formattedDate}, ${displayLines.join(", ")}`} aria-describedby={open ? id : undefined}
    onPointerEnter={() => { setHovered(true); setDismissed(false); }} onPointerLeave={() => setHovered(false)}
    onFocus={() => { setFocused(true); setDismissed(false); }} onBlur={() => setFocused(false)}
    onKeyDown={event => { if (event.key === "Escape") setDismissed(true); }}>
    <circle ref={target} className="task-burnup-node-hit" cx={x} cy={y} r={radius}/>
    {children}
    {open && createPortal(<div ref={popup} id={id} className="task-burnup-node-tooltip" data-kind={kind} role="tooltip"
      style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? "visible" : "hidden" }}>
      <strong>{formattedDate}</strong>
      {displayLines.map(line => <span key={line}>{line}</span>)}
    </div>, document.body)}
  </g>;
}
