import type { ComponentProps } from "react";

export function Frame({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`coss-frame ${className}`} data-slot="frame" {...props} />;
}

export function FramePanel({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`coss-frame-panel ${className}`} data-slot="frame-panel" {...props} />;
}
