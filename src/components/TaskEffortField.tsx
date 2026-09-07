import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  createManualEffortEstimate, formatEffortMinutes, formatEffortPersonDays, getTaskEffortState, parseEffortHours,
  summarizeTaskEffort, type TaskEffortEstimate, type TaskEffortTask,
} from "../lib/taskEffort";
import { getTaskEffortEditSignature } from "../lib/taskEffortEditing";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type EffortUnit = "hours" | "minutes";
type EffortDraft = { amount: string; unit: EffortUnit; workMethod: string; reason: string };
type EditSession = { draft: EffortDraft; baseline: EffortDraft; task: TaskEffortTask; signature: string };
export type TaskEffortFieldProps = {
  task: TaskEffortTask;
  label: string;
  disabled?: boolean;
  onChange?: (estimate: TaskEffortEstimate, expectedSignature: string) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};

function hoursInput(minutes: number): string {
  if (minutes % 3 !== 0) throw new Error("当前分钟值无法精确换算为有限小数小时，请继续使用分钟。");
  return formatEffortMinutes(minutes).replace(/ h$/u, "");
}

function readMinutes(draft: EffortDraft): number | null {
  if (draft.unit === "hours") return parseEffortHours(draft.amount);
  const amount = draft.amount.trim();
  if (!amount) return null;
  if (!/^\d+$/u.test(amount) || !Number.isSafeInteger(Number(amount))) throw new Error("请填写非负整数分钟，或留空表示工时未知。");
  return Number(amount);
}

function startSession(task: TaskEffortTask): EditSession {
  const estimate = task.effortEstimate;
  const minutes = estimate?.minutes;
  const known = typeof minutes === "number" && Number.isSafeInteger(minutes) && minutes >= 0;
  const unit = known && minutes % 3 !== 0 ? "minutes" : "hours";
  const draft: EffortDraft = {
    unit, amount: known ? (unit === "minutes" ? String(minutes) : hoursInput(minutes)) : "",
    workMethod: estimate?.workMethod ?? "", reason: estimate?.reason ?? "",
  };
  return { draft, baseline: draft, task, signature: getTaskEffortEditSignature(task) };
}

function hasDraftChanges({ draft, baseline }: EditSession): boolean {
  if (draft.workMethod !== baseline.workMethod || draft.reason !== baseline.reason) return true;
  try { return readMinutes(draft) !== readMinutes(baseline); }
  catch { return draft.amount !== baseline.amount || draft.unit !== baseline.unit; }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "估算未能保存，请重试；当前输入已保留。";
}

function displayEffort(minutes: number): string {
  return formatEffortPersonDays(minutes);
}

function effortSourceLabel(bases: TaskEffortEstimate["basis"][]): string {
  const sources = new Set(bases);
  if (sources.has("mock")) return "预估 · 仅供参考";
  if (sources.has("model")) return `${sources.has("manual") ? "含 AI 预估" : "AI 预估"} · 仅供参考`;
  return sources.has("manual") ? "手工预估 · 仅供参考" : "";
}

function EffortDefinition({ id }: { id: string }) {
  return <div className="task-effort-definition" id={id}>
    <p>预估投入（EWD）是在约定 AI／工具方式下，预计需要的人类总投入，按人天展示，1 人天＝8 人时。</p>
    <p>计准备、执行、审核与协作，不含等待或无人值守运行；不等于日历工期。</p>
    <p>只是大致估算，实际投入可能不同；确认后也不代表准确值。</p>
  </div>;
}

export function TaskEffortValue({ task, compact = false }: { task: TaskEffortTask; compact?: boolean }) {
  const state = getTaskEffortState(task);
  const label = state === "confirmed" ? "已确认" : "待确认";
  return <span className={`task-effort-value${compact ? " task-effort-value--compact" : ""}`} data-state={state}>
    {state === "unknown" ? <span>待估算</span> : <>
      <span className="task-effort-value-number">{state === "stale" ? "旧估约 " : "约 "}{displayEffort(task.effortEstimate!.minutes!)}</span>
      <span className="task-effort-value-status"> · {state === "stale" ? "需复核" : label}</span>
      <span className="task-effort-value-source"> · {effortSourceLabel([task.effortEstimate!.basis])}</span>
    </>}
  </span>;
}

export function TaskEffortSummary({ tasks }: { tasks: TaskEffortTask[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  try {
    const summary = summarizeTaskEffort(tasks);
    const allConfirmed = summary.taskCount > 0 && summary.confirmedCount === summary.taskCount;
    const allEstimated = summary.totalMinutes !== null;
    const value = allEstimated ? `约 ${displayEffort(summary.knownMinutes)}`
      : summary.estimatedCount ? `已估部分约 ${displayEffort(summary.knownMinutes)}` : "待估算";
    const status = summary.staleCount ? "需复核" : allConfirmed ? "已确认" : allEstimated ? "待确认" : summary.estimatedCount ? "待补全" : "";
    const estimatedTasks = tasks.filter(task => ["proposed", "confirmed"].includes(getTaskEffortState(task)));
    const sourceText = effortSourceLabel(estimatedTasks.map(task => task.effortEstimate!.basis));
    return <div className="task-effort-summary">
      <span className="task-effort-field-label">预估投入</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger ref={triggerRef} className="task-effort-trigger" aria-label="查看预估投入说明" aria-describedby={`${id}-value`}>
          <span id={`${id}-value`} className="task-effort-summary-value">
            <span className="task-effort-value-number">{value}</span>
            {status ? <span className="task-effort-value-status"> · {status}</span> : null}
            {sourceText ? <span className="task-effort-value-source"> · {sourceText}</span> : null}
          </span>
          <ChevronDown size={14} aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent className="task-effort-popover" collisionPadding={12} sideOffset={6} finalFocus={triggerRef} aria-labelledby={`${id}-heading`} aria-describedby={`${id}-definition`}>
          <header className="task-effort-popover-header">
            <h3 id={`${id}-heading`}>预估投入说明</h3>
            <Button variant="ghost" size="icon-sm" type="button" aria-label="关闭预估说明" onClick={() => setOpen(false)}><X size={16} aria-hidden="true" /></Button>
          </header>
          <EffortDefinition id={`${id}-definition`} />
          <dl className="task-effort-summary-details">
            <div><dt>有估算</dt><dd>{summary.estimatedCount}/{summary.taskCount} 项</dd></div>
            <div><dt>已确认</dt><dd>{summary.confirmedCount}/{summary.taskCount} 项</dd></div>
            {summary.unknownCount ? <div><dt>待估算</dt><dd>{summary.unknownCount} 项</dd></div> : null}
            {summary.staleCount ? <div><dt>需复核</dt><dd>{summary.staleCount} 项，旧估算未计入</dd></div> : null}
          </dl>
          <p className="task-effort-summary-note">仅汇总子任务，不额外叠加父任务。有未估或需复核项时，仅展示已估部分。</p>
        </PopoverContent>
      </Popover>
    </div>;
  } catch (error) {
    return <div className="task-effort-summary"><span className="task-effort-field-label">预估投入</span><span className="task-effort-error" role="alert">{messageOf(error)}</span></div>;
  }
}

export function TaskEffortField({ task, label, disabled = false, onChange, onDirtyChange }: TaskEffortFieldProps) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(() => startSession(task));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestTaskRef = useRef(task);
  latestTaskRef.current = task;
  const dirtyCallbackRef = useRef(onDirtyChange);
  dirtyCallbackRef.current = onDirtyChange;
  const id = useId();
  const dirty = hasDraftChanges(session);
  const stale = session.signature !== getTaskEffortEditSignature(task);
  const readOnly = !onChange;
  const locked = disabled || saving;
  const { draft } = session;

  useEffect(() => { dirtyCallbackRef.current?.(dirty); }, [dirty]);
  useEffect(() => () => { dirtyCallbackRef.current?.(false); }, []);

  const loadLatest = () => {
    setSession(startSession(latestTaskRef.current));
    setError("");
  };
  const updateDraft = (patch: Partial<EffortDraft>) => {
    setSession(current => ({ ...current, draft: { ...current.draft, ...patch } }));
    setError("");
  };
  const changeUnit = (unit: EffortUnit) => {
    try {
      const minutes = readMinutes(draft);
      updateDraft({ unit, amount: minutes === null ? "" : unit === "minutes" ? String(minutes) : hoursInput(minutes) });
    } catch (caught) { setError(messageOf(caught)); }
  };
  const cancel = () => {
    if (savingRef.current) return;
    loadLatest();
    setOpen(false);
  };
  const apply = async () => {
    if (savingRef.current || disabled || !onChange) return;
    if (session.signature !== getTaskEffortEditSignature(latestTaskRef.current)) {
      setError("任务范围或估算已有变化，请载入最新内容后再确认；当前输入已保留。");
      return;
    }
    let estimate: TaskEffortEstimate;
    try {
      estimate = createManualEffortEstimate(latestTaskRef.current, {
        minutes: readMinutes(draft), workMethod: draft.workMethod, reason: draft.reason,
      }, session.task.effortEstimate);
    } catch (caught) { setError(messageOf(caught)); return; }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await onChange(estimate, session.signature);
      setSession(startSession({ ...latestTaskRef.current, effortEstimate: estimate }));
      setOpen(false);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return <div className="task-effort-field">
    <span className="task-effort-field-label">预估投入</span>
    <Popover open={open} onOpenChange={(nextOpen, details) => {
      if (savingRef.current) { details.cancel(); return; }
      if (nextOpen && !dirty) loadLatest();
      setOpen(nextOpen);
    }}>
      <PopoverTrigger ref={triggerRef} className="task-effort-trigger" disabled={disabled || saving} aria-label={`${onChange ? "编辑" : "查看"}${label}预估投入`} aria-describedby={`${id}-value`}>
        <span id={`${id}-value`}><TaskEffortValue task={task} compact />{dirty ? <span className="task-effort-unsaved"> · 未保存</span> : null}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="task-effort-popover" collisionPadding={12} sideOffset={6} initialFocus={readOnly ? true : inputRef} finalFocus={triggerRef} aria-labelledby={`${id}-heading`} aria-describedby={`${id}-definition`} aria-busy={saving}>
        <header className="task-effort-popover-header">
          <h3 id={`${id}-heading`}>预估投入</h3>
          <Button variant="ghost" size="icon-sm" type="button" disabled={saving} aria-label="折叠估算编辑" onClick={() => { if (!savingRef.current) setOpen(false); }}><X size={16} aria-hidden="true" /></Button>
        </header>
        <EffortDefinition id={`${id}-definition`} />
        <div className="task-effort-source"><TaskEffortValue task={session.task} compact /></div>
        {stale ? <div className="task-effort-conflict" role="alert">
          <p>任务范围或估算已有变化，当前输入未被覆盖。请载入最新内容后再确认。</p>
          <Button type="button" variant="outline" size="sm" disabled={locked} onClick={loadLatest}>放弃修改，载入最新</Button>
        </div> : null}
        <div className="task-effort-edit-fields">
          <label htmlFor={`${id}-amount`}>预估投入（{draft.unit === "hours" ? "小时" : "分钟"}）</label>
          <div className="task-effort-amount-row">
            <Input ref={inputRef} id={`${id}-amount`} type="text" inputMode={draft.unit === "hours" ? "decimal" : "numeric"} value={draft.amount} placeholder="留空表示待估算" readOnly={readOnly} disabled={locked} aria-describedby={`${id}-precision`} onChange={event => updateDraft({ amount: event.target.value })} />
            <select className="task-effort-unit" aria-label="预估投入单位" value={draft.unit} disabled={readOnly || locked} onChange={event => changeUnit(event.target.value as EffortUnit)}><option value="hours">小时</option><option value="minutes">分钟</option></select>
          </div>
          <p className="task-effort-input-hint" id={`${id}-precision`}>按整数分钟保存；0 表示预计无需投入。</p>
          <label htmlFor={`${id}-method`}>AI／工具方式</label>
          <Textarea id={`${id}-method`} rows={2} value={draft.workMethod} readOnly={readOnly} disabled={locked} placeholder="例如：AI 起草，人工核验后定稿" onChange={event => updateDraft({ workMethod: event.target.value })} />
          <label htmlFor={`${id}-reason`}>估算依据</label>
          <Textarea id={`${id}-reason`} rows={3} value={draft.reason} readOnly={readOnly} disabled={locked} placeholder="说明准备、执行、审核与协作的预计投入" onChange={event => updateDraft({ reason: event.target.value })} />
        </div>
        {error ? <p className="task-effort-error" role="alert">{error}</p> : null}
        <p className="task-effort-confirmation-note">确认估算不等于最终创建任务，也不代表协作人已接受。</p>
        {!readOnly ? <footer className="task-effort-actions">
          <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={cancel}>取消修改</Button>
          <Button type="button" size="sm" disabled={locked || stale} onClick={() => { void apply(); }}>{saving ? "保存中…" : draft.amount.trim() ? "确认估算" : "设为待估算"}</Button>
        </footer> : null}
      </PopoverContent>
    </Popover>
  </div>;
}
