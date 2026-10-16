import { useEffect, useState } from "react";

/** Native fullscreen hides overlays portalled to the document body. */
export function useAnnotationFullscreenContainer() {
  const [container, setContainer] = useState<HTMLElement | null>(() => typeof document === "undefined" ? null : document.fullscreenElement as HTMLElement | null);
  useEffect(() => {
    const sync = () => setContainer(document.fullscreenElement as HTMLElement | null);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  return container;
}
