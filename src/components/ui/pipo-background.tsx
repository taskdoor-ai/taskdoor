import type { ComponentProps } from "react";

/** Bloom Field background adapted from Gustavo Câmara's Pipo on 21st.dev. */
export function GradientBackground({ className = "", ...props }: ComponentProps<"div">) {
  return <div aria-hidden="true" className={`pipo-background ${className}`} {...props}>
    <span className="pipo-background-warm" />
    <span className="pipo-background-cool" />
    <span className="pipo-background-light" />
  </div>;
}
