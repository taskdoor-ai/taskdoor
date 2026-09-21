import { useCreationI18n } from "../i18n/creationMessages";
import { Check, ChevronDown, CirclePause, CircleAlert, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { getCreationProcessStepState, type CreationProcess } from "../lib/taskCreationProgress";
import { AgentActivityIndicator } from "./ui/ai-agent-response";
import { Button } from "./ui/button";

type DisclosureState = {
  processId: CreationProcess["id"];
  status: CreationProcess["status"];
  expanded: boolean;
};

type StepDisclosureState = {
  processId: CreationProcess["id"];
  status: CreationProcess["status"];
  openSteps: Record<string, boolean>;
};

function processHeading(process: CreationProcess, c: ReturnType<typeof useCreationI18n>["c"]) {
  if (process.status === "running") return c("thinking");
  if (process.status === "stopped") return c("thinkingStopped");
  if (process.status === "failed") return c("thinkingIncomplete");
  const { startedAt, completedAt } = process;
  if (startedAt === undefined || completedAt === undefined || !Number.isFinite(completedAt - startedAt) || completedAt < startedAt) return c("completed");
  const seconds = Math.max(1, Math.round((completedAt - startedAt) / 1000));
  return c("completedS", { v0: seconds });
}

/**
 * The single process disclosure used by both the creation page and its fixed
 * conversation history. Playback lives in the parent; this component only
 * renders the shared interaction.
 */
export function TaskCreationProcessView({ process, onCancel }: {
  process: CreationProcess;
  onCancel?: () => void;
}) {
  const { c, locale, localize } = useCreationI18n();
  const running = process.status === "running";
  const [disclosure, setDisclosure] = useState<DisclosureState>(() => ({ processId: process.id, status: process.status, expanded: running }));
  const [stepDisclosure, setStepDisclosure] = useState<StepDisclosureState>(() => ({ processId: process.id, status: process.status, openSteps: {} }));
  const contentId = useId();
  const phaseMatches = disclosure.processId === process.id && disclosure.status === process.status;
  const expanded = phaseMatches ? disclosure.expanded : running;
  const openSteps = stepDisclosure.processId === process.id && stepDisclosure.status === process.status ? stepDisclosure.openSteps : {};
  const stepCount = process.steps.length || 1;
  const currentIndex = Math.min(Math.max(process.activeStep, 0), stepCount - 1);
  const currentStep = process.steps[currentIndex];
  const statusText = `${localize(currentStep?.label) || c("organizeRequest")} · ${currentIndex + 1}/${stepCount}`;
  const heading = processHeading(process, c);

  return <section aria-label={c("taskGenerationProgress")} className="creation-process">
    <header className="creation-process-header">
      <button aria-controls={contentId} aria-expanded={expanded} className="creation-process-toggle" onClick={() => setDisclosure({ processId: process.id, status: process.status, expanded: !expanded })} type="button">
        <AgentActivityIndicator active={running} />
        <strong className={running ? "agent-workflow-gradient-text" : undefined}>{heading}</strong>
        <ChevronDown aria-hidden="true" className={expanded ? "is-open" : undefined} size={14} />
      </button>
      {onCancel && <div className="creation-process-actions">
        <Button aria-label={process.kind === "adjustment" ? c("stopAdjustingPlan") : c("stopGeneratingPlan")} onClick={onCancel} size="sm" type="button" variant="ghost">{c("stop")}</Button>
      </div>}
    </header>
    <span aria-atomic="true" className="sr-only" role="status">{statusText}</span>
    {expanded && <div className="creation-process-content" id={contentId}>
      <section className="creation-process-run" key={process.id}>
        {(process.answers.goal || process.answers.deliverable) && <dl className="creation-process-answers">
          {process.answers.goal && <div><dt>{c("additionalGoal")}</dt><dd>{process.answers.goal}</dd></div>}
          {process.answers.deliverable && <div><dt>{c("deliverables")}</dt><dd>{process.answers.deliverable}</dd></div>}
        </dl>}
        <ol aria-label={c("stepsFor", { v0: process.title })} className="creation-process-steps">
          {process.steps.map((step, index) => {
            const state = getCreationProcessStepState(process, index);
            if (state === "pending") return null;
            const key = `${process.id}-${index}`;
            const isActive = state === "running";
            const open = openSteps[key] ?? isActive;
            const label = state === "completed" || state === "running" ? "" : state === "stopped" ? c("stopped") : c("incomplete");
            const StepIcon = state === "completed" ? Check : state === "stopped" ? CirclePause : CircleAlert;
            return <li className="agent-workflow-trace" data-state={state} key={key}>
              <button aria-controls={`${contentId}-${key}`} aria-expanded={open} className="agent-workflow-trace-toggle" onClick={() => setStepDisclosure({ processId: process.id, status: process.status, openSteps: { ...openSteps, [key]: !open } })} type="button">
                {isActive ? <LoaderCircle aria-hidden="true" className="creation-process-step-spinner" size={14} /> : <StepIcon aria-hidden="true" size={14} />}
                <strong className={isActive ? "agent-workflow-gradient-text" : undefined}>{localize(step.label)}</strong>{label && <span className="creation-process-step-status">{label}</span>}<ChevronDown aria-hidden="true" className={open ? "is-open" : undefined} size={13} />
              </button>
              {open && <div className="agent-workflow-trace-content" id={`${contentId}-${key}`}><p>{localize(step.detail)}</p><p className="creation-process-basis"><span>{c("basis")}</span>{localize(step.basis)}</p></div>}
            </li>;
          })}
        </ol>
      </section>
    </div>}
  </section>;
}

/** The page keeps only its latest non-relationship running process. */
export function TaskCreationProcess({ processes, onCancel }: {
  processes: CreationProcess[];
  onCancel?: () => void;
}) {
  const { c, locale, localize } = useCreationI18n();
  const current = [...processes].reverse().find(process => process.kind !== "relationship") ?? processes.at(-1);
  // Completed history is rendered by TaskCreationHistory with the same shared
  // view; it must not remain in the creation page body.
  if (!current || current.status !== "running") return null;
  return <TaskCreationProcessView onCancel={onCancel} process={current} />;
}
