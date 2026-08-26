import type { CSSProperties, ComponentProps, PointerEvent } from "react";

type GlowCardProps = ComponentProps<"article"> & {
  glowColor?: string;
  size?: "sm" | "md" | "lg";
};

// Adapted from EaseMize UI's Spotlight Card on 21st.dev.
export function GlowCard({ className = "", glowColor, onPointerMove, size = "md", style, ...props }: GlowCardProps) {
  const trackSpotlight = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - bounds.top}px`);
    onPointerMove?.(event);
  };

  return <article
    className={`ui-spotlight-card ui-spotlight-card-${size} ${className}`}
    onPointerMove={trackSpotlight}
    style={{ ...(glowColor ? { "--spotlight-color": glowColor } : {}), ...style } as CSSProperties}
    {...props}
  />;
}
