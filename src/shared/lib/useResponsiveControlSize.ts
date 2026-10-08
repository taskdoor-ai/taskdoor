import { useEffect, useState } from "react";

export function useResponsiveControlSize(query = "(max-width: 720px)"): "sm" | "touch" {
  const [touch, setTouch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setTouch(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);

  return touch ? "touch" : "sm";
}
