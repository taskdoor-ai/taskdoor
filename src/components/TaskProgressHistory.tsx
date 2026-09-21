import React, { type ReactNode } from "react";

/** Keep compact progress and its chart together inside the parent AI analysis. */
export function TaskProgressHistory({ children, summary, compact = false }: { children: ReactNode; summary: ReactNode; compact?: boolean }) {
  if (!compact) return <>{summary}{children}</>;
  return <>
    {summary}
    <div className="task-progress-history">{children}</div>
  </>;
}
