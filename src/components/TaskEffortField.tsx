import { useI18n } from "../i18n/I18nProvider";
import { useGlobalUi } from "../i18n/globalUi";
import { useDetailCopy } from "../i18n/detailMessages";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  createManualEffortEstimate, formatEffortPersonDays, getTaskEffortState, MINUTES_PER_PERSON_DAY,
  summarizeTaskEffort, type TaskEffortEstimate, type TaskEffortTask,
} from "../lib/taskEffort";
import { getTaskEffortEditSignature } from "../lib/taskEffortEditing";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export type TaskEffortFieldProps = {
  task: TaskEffortTask;
  label: string;
  disabled?: boolean;
  onChange?: (estimate: TaskEffortEstimate, expectedSignature: string) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};

const personDayInput = (minutes: number | null) => minutes === null ? "" : String(Number((minutes / MINUTES_PER_PERSON_DAY).toFixed(4)));

/** Inline edits use integer minutes internally; no confirmation stage. */
export function TaskEffortStepper({ minutes, signature, label, disabled = false, onChange, onDirtyChange }: {
  minutes: number | null; signature: string; label: string; disabled?: boolean;
  onChange: (minutes: number | null) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const [draft, setDraft] = useState(() => personDayInput(minutes));
  const [baseline, setBaseline] = useState(signature);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const dirtyCallback = useRef(onDirtyChange);
  dirtyCallback.current = onDirtyChange;
  const id = useId();
  useEffect(() => {
    if (!dirty && !pending.current) { setDraft(personDayInput(minutes)); setBaseline(signature); }
  }, [minutes, signature, dirty, saving]);
  useEffect(() => { dirtyCallback.current?.(dirty || saving); }, [dirty, saving]);
  useEffect(() => () => dirtyCallback.current?.(false), []);
  const read = () => {
    if (!dirty) return minutes;
    if (!draft.trim()) return null;
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/u.test(draft.trim())) throw new Error(d('invalidEffort'));
    const value = Math.round(Number(draft) * MINUTES_PER_PERSON_DAY);
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(d('invalidEffort'));
    return value;
  };
  const save = async (value: number | null) => {
    if (pending.current || disabled) return;
    if (dirty && baseline !== signature) { setError(d('staleEffort')); return; }
    if (value !== null && (!Number.isSafeInteger(value) || value < 0)) { setError(d('invalidEffort')); return; }
    pending.current = true; setSaving(true); setDraft(personDayInput(value)); setError("");
    try { await onChange(value); setDraft(personDayInput(value)); setDirty(false); }
    catch (caught) { setError(messageOf(caught)); setDirty(true); }
    finally { pending.current = false; setSaving(false); }
  };
  const commit = () => {
    if (!dirty) return;
    try { void save(read()); } catch (caught) { setError(messageOf(caught)); }
  };
  const step = (direction: number) => {
    try { void save(Math.max(0, (read() ?? 0) + direction * MINUTES_PER_PERSON_DAY / 4)); }
    catch (caught) { setError(messageOf(caught)); }
  };
  return <div className="task-effort-inline">
    <div className="task-effort-stepper" aria-busy={saving}>
      <Input aria-label={`${label}: ${d("estimatedEffort")}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} role="spinbutton" aria-valuemin={0} aria-valuenow={draft.trim() && Number.isFinite(Number(draft)) ? Number(draft) : undefined} inputMode="decimal" value={draft} placeholder={d('notEstimated')} disabled={disabled || saving}
        onChange={event => { if (!dirty) setBaseline(signature); setDraft(event.target.value); setDirty(true); setError(""); }}
        onBlur={commit} onKeyDown={event => {
          if (event.key === "Enter") { event.preventDefault(); commit(); }
          if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); step(event.key === "ArrowUp" ? 1 : -1); }
          if (event.key === "Escape") { setDraft(personDayInput(minutes)); setBaseline(signature); setDirty(false); setError(""); }
        }} />
      <span className="task-effort-stepper-unit">{d('personDays')}</span>
      <span className="task-effort-stepper-buttons">
        <button aria-label={`${d("increase")} ${label}: ${d("estimatedEffort")}`} disabled={disabled || saving} onMouseDown={event => event.preventDefault()} onClick={() => step(1)} type="button"><ChevronUp aria-hidden="true" size={14} /></button>
        <button aria-label={`${d("decrease")} ${label}: ${d("estimatedEffort")}`} disabled={disabled || saving || (!dirty && (minutes === null || minutes === 0))} onMouseDown={event => event.preventDefault()} onClick={() => step(-1)} type="button"><ChevronDown aria-hidden="true" size={14} /></button>
      </span>
    </div>
    {error && <p className="task-effort-error" id={`${id}-error`} role="alert">{ui(error)}</p>}
  </div>;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "估算未能保存，请重试；当前输入已保留。";
}

export function TaskEffortField({ task, label, disabled = false, onChange, onDirtyChange }: TaskEffortFieldProps) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const state = getTaskEffortState(task);
  return <div className="task-effort-field">
    <span className="task-effort-field-label">{d('effort')}</span>
    {onChange ? <TaskEffortStepper minutes={state === "unknown" ? null : task.effortEstimate?.minutes ?? null} signature={getTaskEffortEditSignature(task)} label={label} disabled={disabled} onDirtyChange={onDirtyChange}
      onChange={minutes => onChange(createManualEffortEstimate(task, {
        minutes, workMethod: task.effortEstimate?.workMethod || "按当前任务约定的执行方式",
        reason: "用户直接调整预计人天。",
      }, task.effortEstimate), getTaskEffortEditSignature(task))} /> :
      <Popover><PopoverTrigger ref={triggerRef} className="task-effort-trigger" aria-label={ui("查看{0}预估投入", {0: label})}><TaskEffortValue task={task} compact /><ChevronDown aria-hidden="true" size={14} /></PopoverTrigger>
        <PopoverContent className="task-effort-popover" aria-label={d('aboutEffort')} finalFocus={triggerRef}>
          <EffortDefinition id={`${label}-effort-definition`} />
          <p>{task.effortEstimate?.workMethod}</p><p>{task.effortEstimate?.reason}</p>
        </PopoverContent>
      </Popover>}
  </div>;
}


function effortSourceLabel(bases: TaskEffortEstimate["basis"][]): string {
  const sources = new Set(bases);
  if (sources.has("mock")) return "预估 · 仅供参考";
  if (sources.has("model")) return `${sources.has("manual") ? "含 AI 预估" : "AI 预估"} · 仅供参考`;
  return sources.has("manual") ? "手工预估 · 仅供参考" : "";
}

function EffortDefinition({ id }: { id: string }) {
  const d = useDetailCopy();
  return <div className="task-effort-definition" id={id}>
    <p>{d('effortDefinition')}</p>
    <p>{d('effortScope')}</p>
    <p>{d('effortUncertainty')}</p>
  </div>;
}

export function TaskEffortValue({ task, compact = false }: { task: TaskEffortTask; compact?: boolean }) {
  const d = useDetailCopy();
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const state = getTaskEffortState(task);
  const label = state === "confirmed" ? d('confirmed') : d('pendingConfirmation');
  return <span className={`task-effort-value${compact ? " task-effort-value--compact" : ""}`} data-state={state}>
    {state === "unknown" ? <span>{d('notEstimated')}</span> : <>
      <span className="task-effort-value-number">{state === "stale" ? d('oldEstimate') : d('approximately')}{formatEffortPersonDays(task.effortEstimate!.minutes!, locale)}</span>
      <span className="task-effort-value-status"> · {state === "stale" ? d('needsReview') : label}</span>
      <span className="task-effort-value-source"> · {ui(effortSourceLabel([task.effortEstimate!.basis]))}</span>
    </>}
  </span>;
}

export function TaskEffortSummary({ tasks }: { tasks: TaskEffortTask[] }) {
  const { locale } = useI18n();
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  try {
    const summary = summarizeTaskEffort(tasks);
    const allConfirmed = summary.taskCount > 0 && summary.confirmedCount === summary.taskCount;
    const allEstimated = summary.totalMinutes !== null;
    const value = allEstimated ? ui("约 {0}", {0: formatEffortPersonDays(summary.knownMinutes, locale)})
      : summary.estimatedCount ? ui("已估部分约 {0}", {0: formatEffortPersonDays(summary.knownMinutes, locale)}) : d('notEstimated');
    const status = summary.staleCount ? d('needsReview') : allConfirmed ? d('confirmed') : allEstimated ? d('pendingConfirmation') : summary.estimatedCount ? d('incomplete') : "";
    const estimatedTasks = tasks.filter(task => ["proposed", "confirmed"].includes(getTaskEffortState(task)));
    const sourceText = effortSourceLabel(estimatedTasks.map(task => task.effortEstimate!.basis));
    return <div className="task-effort-summary">
      <span className="task-effort-field-label">{d('estimatedEffort')}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger ref={triggerRef} className="task-effort-trigger" aria-label={d('viewEffort')} aria-describedby={`${id}-value`}>
          <span id={`${id}-value`} className="task-effort-summary-value">
            <span className="task-effort-value-number">{value}</span>
            {status ? <span className="task-effort-value-status"> · {status}</span> : null}
            {sourceText ? <span className="task-effort-value-source"> · {ui(sourceText)}</span> : null}
          </span>
          <ChevronDown size={14} aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent className="task-effort-popover" collisionPadding={12} sideOffset={6} finalFocus={triggerRef} aria-labelledby={`${id}-heading`} aria-describedby={`${id}-definition`}>
          <header className="task-effort-popover-header">
            <h3 id={`${id}-heading`}>{d('aboutEffort')}</h3>
            <Button variant="ghost" size="icon-sm" type="button" aria-label={d('closeEffort')} onClick={() => setOpen(false)}><X size={16} aria-hidden="true" /></Button>
          </header>
          <EffortDefinition id={`${id}-definition`} />
          <dl className="task-effort-summary-details">
            <div><dt>{d('estimated')}</dt><dd>{summary.estimatedCount}/{summary.taskCount}{ui("项")}</dd></div>
            <div><dt>{d('confirmed')}</dt><dd>{summary.confirmedCount}/{summary.taskCount}{ui("项")}</dd></div>
            {summary.unknownCount ? <div><dt>{d('notEstimated')}</dt><dd>{summary.unknownCount}{ui("项")}</dd></div> : null}
            {summary.staleCount ? <div><dt>{d('needsReview')}</dt><dd>{summary.staleCount}{ui("项，旧估算未计入")}</dd></div> : null}
          </dl>
          <p className="task-effort-summary-note">{d('effortSummaryNote')}</p>
        </PopoverContent>
      </Popover>
    </div>;
  } catch (error) {
    return <div className="task-effort-summary"><span className="task-effort-field-label">{d('estimatedEffort')}</span><span className="task-effort-error" role="alert">{ui(messageOf(error))}</span></div>;
  }
}
