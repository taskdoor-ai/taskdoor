import { useEffect, useRef } from "react";

export function RippleBackground() {
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !backgroundRef.current) return;
      const bounds = backgroundRef.current.getBoundingClientRect();
      backgroundRef.current.style.setProperty("--ripple-x", `${event.clientX - bounds.left}px`);
      backgroundRef.current.style.setProperty("--ripple-y", `${event.clientY - bounds.top}px`);
    };

    window.addEventListener("pointermove", updatePosition, { passive: true });
    return () => window.removeEventListener("pointermove", updatePosition);
  }, []);

  return <div aria-hidden="true" className="ui-ripple-background" ref={backgroundRef}>
    <span /><span /><span /><span />
  </div>;
}
