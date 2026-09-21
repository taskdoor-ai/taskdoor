import { useGlobalUi } from "../../i18n/globalUi";
import type { LucideIcon } from "lucide-react";
import { BrainCircuit, Check, ChevronDown, LoaderCircle, Search, Terminal, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/utils";

export type ToolDefinition = {
  icon?: LucideIcon;
  iconClassName?: string;
  label: string;
  monoChip?: boolean;
  name: string;
};

type TraceDetail = { text: string };

type ReasoningTrace = {
  durationSeconds?: number;
  sentences: string[];
  type: "reasoning";
};

type ToolTrace = {
  details?: TraceDetail[];
  mono?: boolean;
  primary?: string;
  secondary?: string;
  toolName?: string;
  type: "tool";
};

type SearchTrace = {
  primary: string;
  secondary?: string;
  sources?: Array<{ name: string; url: string }>;
  type: "search";
};

type TerminalTrace = {
  command: string;
  durationMs?: number;
  exitCode?: number;
  output?: string;
  primary: string;
  secondary?: string;
  type: "terminal";
};

export type AgentTrace = ReasoningTrace | SearchTrace | TerminalTrace | ToolTrace;

export type AgentPhase = {
  message?: string;
  trace: AgentTrace[];
};

type AgentWorkflowProps = {
  completed?: boolean;
  phases: AgentPhase[];
  tools?: Record<string, ToolDefinition>;
  workingLabel?: string;
};

type PlaybackStep = {
  phaseIndex: number;
  sentenceIndex?: number;
  traceIndex: number;
};

const phaseDuration = (phase: AgentPhase) => phase.trace.reduce((seconds, item) => (
  item.type === "reasoning" ? seconds + (item.durationSeconds ?? item.sentences.length * 0.8) : seconds + 0.6
), 0);
const reasoningDuration = (trace: ReasoningTrace) => trace.durationSeconds ?? trace.sentences.length * 0.8;

const defaultTool: ToolDefinition = { icon: Wrench, label: "执行工具", name: "tool" };
const traceLabel = (label: string, isActive: boolean) => isActive
  ? <span className="agent-workflow-gradient-text motion-reduce:animate-none">{label}</span>
  : label;
const pixelDotDelays = Array.from({ length: 9 }, (_, dotIndex) => {
  const row = Math.floor(dotIndex / 3);
  const column = dotIndex % 3;
  return (column + Math.abs(row - 1)) * 90;
});

/** Shared visual activity indicator; it makes no claims about tools or reasoning. */
export function AgentActivityIndicator({ active = true, className }: { active?: boolean; className?: string }) {
  return <span aria-hidden="true" className={cn("grid shrink-0 grid-cols-[repeat(3,3px)] items-center gap-[1.5px]", className)}>
    {pixelDotDelays.map((delay, dotIndex) => <i
      className={cn("agent-workflow-grid-dot size-[3px] rounded-full motion-reduce:animate-none", !active && "is-complete")}
      key={dotIndex}
      style={{ animationDelay: `${delay}ms` }}
    />)}
  </span>;
}

export function AgentWorkflow({ completed = false, phases, tools = {}, workingLabel = "Working..." }: AgentWorkflowProps) {
  const ui = useGlobalUi();
  const playback = useMemo<PlaybackStep[]>(() => phases.flatMap((phase, phaseIndex) => phase.trace.flatMap((item, traceIndex) => (
    item.type === "reasoning"
      ? item.sentences.map((_, sentenceIndex) => ({ phaseIndex, sentenceIndex, traceIndex }))
      : [{ phaseIndex, traceIndex }]
  ))), [phases]);
  const [visibleSteps, setVisibleSteps] = useState(completed ? playback.length : 1);
  const [openPhases, setOpenPhases] = useState<Record<number, boolean>>(completed ? {} : { 0: true });
  const [openTraces, setOpenTraces] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (completed) {
      setVisibleSteps(playback.length);
      setOpenPhases({});
      setOpenTraces({});
      return;
    }
    setVisibleSteps(1);
    setOpenPhases({ 0: true });
    setOpenTraces({});
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setVisibleSteps(playback.length);
      return;
    }
    const timer = window.setInterval(() => {
      setVisibleSteps((current) => Math.min(current + 1, playback.length));
    }, 900);
    return () => window.clearInterval(timer);
  }, [completed, playback.length]);

  const currentStep = playback[Math.max(0, Math.min(visibleSteps - 1, playback.length - 1))];
  const activePhase = currentStep?.phaseIndex ?? 0;
  const toggleTrace = (phaseIndex: number, traceIndex: number, isOpen: boolean) => {
    const key = `${phaseIndex}-${traceIndex}`;
    setOpenTraces((current) => ({ ...current, [key]: !isOpen }));
  };

  return <div aria-label={workingLabel} className="flex w-full max-w-2xl flex-col gap-2 text-sm">
    {phases.map((phase, phaseIndex) => {
      if (phaseIndex > activePhase) return null;
      const isActive = !completed && phaseIndex === activePhase;
      const isOpen = openPhases[phaseIndex] ?? isActive;
      const visibleInPhase = playback.slice(0, visibleSteps).filter((step) => step.phaseIndex === phaseIndex);

      return <section className="grid gap-1.5" key={phaseIndex}>
        <button
          aria-expanded={isOpen}
          className="group flex w-fit items-center gap-2 py-1 text-left text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpenPhases((current) => ({ ...current, [phaseIndex]: !isOpen }))}
          type="button"
        >
          <AgentActivityIndicator active={isActive} />
          <span className={cn("min-w-0 font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
            {isActive
              ? <span className="agent-workflow-gradient-text motion-reduce:animate-none">{workingLabel}</span>
              : ui("已工作 {0} 秒", {0: phaseDuration(phase).toFixed(1)})}
          </span>
          <ChevronDown aria-hidden="true" className={cn("size-3 shrink-0 text-muted-foreground/70 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && <div className="ml-2 border-l border-border/70 pb-1 pl-5 pt-1">
          <div className="grid gap-1">
            {phase.trace.map((trace, traceIndex) => {
              const traceSteps = visibleInPhase.filter((step) => step.traceIndex === traceIndex);
              if (traceSteps.length === 0) return null;
              const traceKey = `${phaseIndex}-${traceIndex}`;
              const isTraceActive = isActive && currentStep?.traceIndex === traceIndex;
              const isTraceOpen = openTraces[traceKey] ?? isTraceActive;
              const traceChevron = <ChevronDown aria-hidden="true" className={cn("ml-auto size-3 shrink-0 text-muted-foreground/70 transition-transform", isTraceOpen && "rotate-180")} />;

              if (trace.type === "reasoning") {
                const visibleSentences = traceSteps.map((step) => trace.sentences[step.sentenceIndex ?? 0]);
                return <div className="agent-workflow-trace" key={traceIndex}>
                  <button aria-expanded={isTraceOpen} className="agent-workflow-trace-toggle" onClick={() => toggleTrace(phaseIndex, traceIndex, isTraceOpen)} type="button">
                    <BrainCircuit aria-hidden="true" className="size-3.5 text-muted-foreground" />
                    <strong>{isTraceActive
                      ? <span className="agent-workflow-gradient-text motion-reduce:animate-none">Thinking…</span>
                      : `Thought for ${reasoningDuration(trace).toFixed(1)}s`}</strong>
                    {traceChevron}
                  </button>
                  {isTraceOpen && <div aria-live="polite" className="agent-workflow-trace-content grid gap-1 text-xs leading-relaxed text-muted-foreground">
                    {visibleSentences.map((sentence) => <p className="m-0" key={sentence}>{sentence}</p>)}
                  </div>}
                </div>;
              }

              if (trace.type === "terminal") {
                return <div className="agent-workflow-trace" key={traceIndex}>
                  <button aria-expanded={isTraceOpen} className="agent-workflow-trace-toggle" onClick={() => toggleTrace(phaseIndex, traceIndex, isTraceOpen)} type="button">
                    <Terminal aria-hidden="true" className="size-3.5 text-muted-foreground" /><strong>{traceLabel(trace.primary, isTraceActive)}</strong>{trace.secondary && !isTraceActive && <span className="agent-workflow-trace-chip font-mono">{trace.secondary}</span>}{traceChevron}
                  </button>
                  {isTraceOpen && <div className="agent-workflow-trace-content"><pre className="m-0 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100"><code>{trace.output ?? trace.command}</code></pre></div>}
                </div>;
              }

              if (trace.type === "search") {
                return <div className="agent-workflow-trace" key={traceIndex}>
                  <button aria-expanded={isTraceOpen} className="agent-workflow-trace-toggle" onClick={() => toggleTrace(phaseIndex, traceIndex, isTraceOpen)} type="button">
                    <Search aria-hidden="true" className="size-3.5 text-muted-foreground" /><strong>{traceLabel(trace.primary, isTraceActive)}</strong>{trace.secondary && !isTraceActive && <span className="agent-workflow-trace-chip">{trace.secondary}</span>}{traceChevron}
                  </button>
                  {isTraceOpen && <div className="agent-workflow-trace-content grid gap-1 text-xs text-muted-foreground">
                    {(trace.sources ?? []).map((source) => <a href={source.url} key={source.url} rel="noreferrer" target="_blank">{source.name}</a>)}
                    {!trace.sources?.length && <span>{ui("搜索已完成")}</span>}
                  </div>}
                </div>;
              }

              const definition = trace.toolName ? tools[trace.toolName] ?? defaultTool : defaultTool;
              const ToolIcon = definition.icon ?? Wrench;
              return <div className="agent-workflow-trace" key={traceIndex}>
                <button aria-expanded={isTraceOpen} className="agent-workflow-trace-toggle" onClick={() => toggleTrace(phaseIndex, traceIndex, isTraceOpen)} type="button">
                  <ToolIcon aria-hidden="true" className={cn("size-3.5 text-muted-foreground", definition.iconClassName)} />
                  <strong>{traceLabel(trace.primary ?? definition.label, isTraceActive)}</strong>
                  {trace.secondary && !isTraceActive && <span className={cn("agent-workflow-trace-chip", (trace.mono || definition.monoChip) && "font-mono")}>{trace.secondary}</span>}
                  {traceChevron}
                </button>
                {isTraceOpen && <div className="agent-workflow-trace-content grid gap-1 text-xs text-muted-foreground">{trace.details?.length
                  ? trace.details.map((detail) => isTraceActive
                    ? <span key={detail.text}>{detail.text}</span>
                    : <span className="flex items-start gap-1.5" key={detail.text}><Check className="mt-0.5 size-3 shrink-0 text-emerald-600" />{detail.text}</span>)
                  : <span>{ui("操作已完成")}</span>}</div>}
              </div>;
            })}

            {isActive && <div className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />{ui("继续处理")}</div>}
            {!isActive && phase.message && <p className="m-0 text-xs leading-relaxed text-foreground/80">{phase.message}</p>}
          </div>
        </div>}
      </section>;
    })}
  </div>;
}
