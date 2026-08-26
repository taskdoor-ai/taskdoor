import { ArrowUpRight, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AICitationProps = {
  description: string;
  label: number;
  meta: string;
  title: string;
};

// Adapted from 21st.dev AI Citation #23791 by educalvolpz.
// Internal enterprise sources open an anchored preview instead of a fake external link.
export function AICitation({ description, label, meta, title }: AICitationProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const show = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const hideSoon = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  return (
    <span className="ai-citation" onBlur={hideSoon} onFocus={show} onMouseEnter={show} onMouseLeave={hideSoon}>
      <button aria-expanded={open} aria-label={`查看来源 ${label}：${title}`} className="citation-pill" onClick={() => setOpen((current) => !current)} type="button">
        {label}
      </button>
      {open && (
        <span className="citation-card" role="note">
          <span className="citation-origin"><FileText size={13} /><span>{meta}</span><ArrowUpRight size={12} /></span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
      )}
    </span>
  );
}
