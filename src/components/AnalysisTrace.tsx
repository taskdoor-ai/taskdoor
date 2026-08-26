import * as Collapsible from "@radix-ui/react-collapsible";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Database,
  FileText,
  GitCommitHorizontal,
  Loader2,
  Search,
} from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";

// Interaction adapted from the user's Chain of Thought reference.
// Agentdoor deliberately exposes observable work and source provenance, not
// private model reasoning or hidden chain-of-thought text.

export type TraceStatus = "pending" | "active" | "complete";

type TraceContextValue = { open: boolean };
const TraceContext = createContext<TraceContextValue | null>(null);

function useTraceContext() {
  const context = useContext(TraceContext);
  if (!context) throw new Error("AnalysisTrace parts must be inside AnalysisTrace");
  return context;
}

type AnalysisTraceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function AnalysisTrace({ open, onOpenChange, children }: AnalysisTraceProps) {
  return (
    <TraceContext.Provider value={{ open }}>
      <Collapsible.Root className="analysis-trace" onOpenChange={onOpenChange} open={open}>
        {children}
      </Collapsible.Root>
    </TraceContext.Provider>
  );
}

type AnalysisTraceHeaderProps = {
  title: string;
  completed: number;
  total: number;
  active: boolean;
};

export function AnalysisTraceHeader({ title, completed, total, active }: AnalysisTraceHeaderProps) {
  const { open } = useTraceContext();
  return (
    <Collapsible.Trigger className="analysis-trace-header">
      <span className={`trace-pulse ${active ? "active" : "complete"}`} aria-hidden="true" />
      <span className="trace-heading">
        <strong>{title}</strong>
        <small>{active ? "正在处理" : "可查看处理记录"}</small>
      </span>
      <span className="trace-count">{completed}/{total}</span>
      <ChevronDown className={open ? "open" : ""} size={16} />
    </Collapsible.Trigger>
  );
}

export function AnalysisTraceContent({ children }: { children: ReactNode }) {
  return (
    <Collapsible.Content className="analysis-trace-content">
      <div className="trace-steps">{children}</div>
    </Collapsible.Content>
  );
}

type AnalysisTraceStepProps = {
  status: TraceStatus;
  title: string;
  description: string;
  children?: ReactNode;
  last?: boolean;
};

export function AnalysisTraceStep({ status, title, description, children, last }: AnalysisTraceStepProps) {
  const Icon = status === "complete" ? CheckCircle2 : status === "active" ? Loader2 : Circle;
  return (
    <div className={`trace-step ${status}`}>
      <div className="trace-step-rail">
        <Icon className={status === "active" ? "spin" : ""} size={16} />
        {!last && <span />}
      </div>
      <div className="trace-step-body">
        <strong>{title}</strong>
        <p>{description}</p>
        {children}
      </div>
    </div>
  );
}

export type TraceSource = {
  title: string;
  meta: string;
  type: "document" | "data" | "task" | "change";
};

const sourceIcons = {
  document: FileText,
  data: Database,
  task: Search,
  change: GitCommitHorizontal,
};

export function AnalysisTraceSources({ sources }: { sources: TraceSource[] }) {
  return (
    <div className="trace-sources">
      <span className="trace-sources-label"><Search size={12} />找到 {sources.length} 个来源</span>
      <div className="trace-source-list">
        {sources.map((source) => {
          const Icon = sourceIcons[source.type];
          return (
            <div className="trace-source" key={source.title}>
              <Icon size={13} />
              <span><strong>{source.title}</strong><small>{source.meta}</small></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
