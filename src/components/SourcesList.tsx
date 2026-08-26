import { ChevronRight, Database, FileText, GitCommitHorizontal, ListTodo } from "lucide-react";
import { useState, type ReactNode } from "react";

// Adapted from 21st.dev AI Sources #23817 by educalvolpz.
// Favicons become honest enterprise source-type marks; source metadata now
// includes freshness and access state required by Agentdoor.

export type SourceType = "document" | "data" | "task" | "change";

export type EnterpriseSource = {
  id: string;
  title: string;
  snippet: string;
  meta: string;
  type: SourceType;
};

const icons: Record<SourceType, ReactNode> = {
  document: <FileText size={14} />,
  data: <Database size={14} />,
  task: <ListTodo size={14} />,
  change: <GitCommitHorizontal size={14} />,
};

export function SourcesList({ defaultOpen = true, sources }: { defaultOpen?: boolean; sources: EnterpriseSource[] }) {
  const [open, setOpen] = useState(defaultOpen);
  const [hovered, setHovered] = useState(false);

  return (
    <div className="sources-list">
      <button
        aria-expanded={open}
        className="sources-toggle"
        onBlur={() => setHovered(false)}
        onClick={() => setOpen((current) => !current)}
        onFocus={() => setHovered(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        type="button"
      >
        <span className={`source-stack ${hovered && !open ? "fanned" : ""}`} aria-hidden="true">
          {sources.slice(0, 3).map((source) => (
            <span className="source-mark" key={source.id}>{icons[source.type]}</span>
          ))}
        </span>
        <span>{sources.length} 个可访问来源</span>
        <ChevronRight className={open ? "rotated" : ""} size={15} />
      </button>

      {open && (
        <ul className="sources-items">
          {sources.map((source) => (
            <li key={source.id}>
              <span className="source-mark">{icons[source.type]}</span>
              <span className="source-content">
                <strong>{source.title}</strong>
                <span>{source.snippet}</span>
                <small>{source.meta}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
