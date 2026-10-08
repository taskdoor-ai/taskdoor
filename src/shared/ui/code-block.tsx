import type { ComponentProps } from "react";

// Adapted from Motion Primitives' Code Block on 21st.dev.
export function CodeBlock({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`ui-code-block ${className}`} {...props} />;
}

export function CodeBlockGroup({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`ui-code-block-group ${className}`} {...props} />;
}

export function CodeBlockCode({ className = "", ...props }: ComponentProps<"code">) {
  return <code className={`ui-code-block-code ${className}`} {...props} />;
}
