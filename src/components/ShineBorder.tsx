import type { CSSProperties, ReactNode } from "react";

type ShineBorderStyle = CSSProperties & {
  "--shine-border-width": string;
  "--shine-duration": string;
};

type ShineBorderProps = {
  children: ReactNode;
  className?: string;
  borderWidth?: number;
  duration?: number;
};

// Adapted from 21st.dev Shine Border Security Card #18018 by shadcnspace.
// Preserves the component's masked vertical gradient scan and layered content shell.
export function ShineBorder({
  children,
  className = "",
  borderWidth = 2,
  duration = 3,
}: ShineBorderProps) {
  const style: ShineBorderStyle = {
    "--shine-border-width": `${borderWidth}px`,
    "--shine-duration": `${duration}s`,
  };

  return (
    <div className={`shine-border ${className}`} style={style}>
      <div aria-hidden="true" className="shine-border-layer">
        <span className="shine-border-base" />
        <span className="shine-border-scan" />
      </div>
      <div className="shine-border-content">{children}</div>
    </div>
  );
}
