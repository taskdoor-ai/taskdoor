import { useGlobalUi } from "@/shared/i18n/global-ui";
import { Maximize, Minimize } from "lucide-react";
import React, { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/shared/ui/button";

/** Kinds the viewer draws on its own; any other file shows the "no preview" view instead. */
const FILLS = ["image", "pdf", "presentation", "markdown", "text", "json", "xml", "html", "table"];
const NOTHING_SHOWN = ".task-file-viewer-unsupported";

export type FullscreenButtonProps = { kind: string; target: RefObject<HTMLElement | null>; onSelection: (selection: null) => void };

/** Full screen contains only the viewer and its exit control. */
export default function FullscreenButton({ kind, target, onSelection }: FullscreenButtonProps) {
  const ui = useGlobalUi();
  const [blank, setBlank] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const entryButton = useRef<HTMLButtonElement>(null);
  const wasFullscreen = useRef(false);
  useEffect(() => {
    const viewer = target.current;
    if (!viewer) return;
    const look = () => setBlank(Boolean(viewer.querySelector(NOTHING_SHOWN)));
    look();
    const observer = new MutationObserver(look);
    observer.observe(viewer, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [target]);
  useEffect(() => {
    // A selection's popover is placed for the old layout, so entering or leaving drops it.
    const sync = () => {
      const active = document.fullscreenElement === target.current;
      setFullscreen(active);
      onSelection(null);
      if (!active && wasFullscreen.current) entryButton.current?.focus({ preventScroll: true });
      wasFullscreen.current = active;
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [onSelection, target]);
  if (typeof document === "undefined" || !document.fullscreenEnabled || !FILLS.includes(kind) || blank) return null;
  return <>
    <Button aria-label={ui("全屏")} className="task-file-action-button" onClick={() => void target.current?.requestFullscreen().catch(() => {})} ref={entryButton} size="sm" title={ui("全屏")} variant="ghost"><Maximize size={16} /></Button>
    {fullscreen && target.current && createPortal(<button aria-label={ui("退出全屏")} autoFocus className="task-file-fullscreen-exit" onClick={() => void document.exitFullscreen().catch(() => {})} title={ui("退出全屏")} type="button"><Minimize aria-hidden="true" size={20} /></button>, target.current)}
  </>;
}
