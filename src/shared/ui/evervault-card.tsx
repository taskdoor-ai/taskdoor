import { type ComponentProps, type CSSProperties, useEffect, useRef, useState } from "react";

const glyphSource = "01A7C9E2F4B8D3K5M6PQRSTUVWXYZ";
const createGlyphs = (seed = 0) => Array.from({ length: 180 }, (_, index) => glyphSource[(index * 7 + index % 5 + seed * 11) % glyphSource.length]);

export function EvervaultCard({ children, className = "", ...props }: ComponentProps<"div">) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [glyphs, setGlyphs] = useState(() => createGlyphs());

  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let seed = 1;
    const timer = window.setInterval(() => setGlyphs(createGlyphs(seed++)), 75);
    return () => window.clearInterval(timer);
  }, [active]);

  const moveSpotlight = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect || !cardRef.current) return;
    cardRef.current.style.setProperty("--evervault-x", `${event.clientX - rect.left}px`);
    cardRef.current.style.setProperty("--evervault-y", `${event.clientY - rect.top}px`);
  };

  return <div
    className={`evervault-card ${active ? "is-active" : ""} ${className}`}
    onPointerEnter={() => setActive(true)}
    onPointerLeave={() => setActive(false)}
    onPointerMove={moveSpotlight}
    ref={cardRef}
    style={{ "--evervault-x": "78%", "--evervault-y": "42px" } as CSSProperties}
    {...props}
  >
    <div aria-hidden="true" className="evervault-card-field">
      {glyphs.map((glyph, index) => <span key={`${glyph}-${index}`}>{glyph}</span>)}
    </div>
    <div aria-hidden="true" className="evervault-card-glow" />
    <div className="evervault-card-content">{children}</div>
  </div>;
}
