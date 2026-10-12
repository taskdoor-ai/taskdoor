import { useGlobalUi } from "@/shared/i18n/global-ui";
import { Maximize } from "lucide-react";
import React, { useEffect, useState, type RefObject } from "react";
import { Button } from "@/shared/ui/button";

/** Kinds the viewer draws on its own; any other file shows the "no preview" view instead. */
const FILLS = ["image", "pdf", "markdown", "text", "table"];
const NOTHING_SHOWN = ".task-file-viewer-unsupported";

export type FullscreenButtonProps = { kind: string; target: RefObject<HTMLElement | null>; onSelection: (selection: null) => void };

/** Puts the file viewer alone in full screen (the file toolbar stays out); Esc leaves it. */
export default function FullscreenButton({ kind, target, onSelection }: FullscreenButtonProps) {
  const ui = useGlobalUi();
  const [blank, setBlank] = useState(false);
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
    const sync = () => onSelection(null);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [onSelection]);
  if (typeof document === "undefined" || !document.fullscreenEnabled || !FILLS.includes(kind) || blank) return null;
  return <Button aria-label={ui("全屏")} className="task-file-action-button" onClick={() => void target.current?.requestFullscreen().catch(() => {})} size="sm" title={ui("全屏")} variant="ghost"><Maximize size={16} /></Button>;
}
