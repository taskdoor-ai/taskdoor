import { ArrowRight, ArrowUp, Check, ChevronDown, GitBranch, Layers3, LoaderCircle, Sparkles, Target, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useReducer, useRef, useState } from "react";
import { buildTaskAiAdjustment, buildTaskAiCreationAdjustment, getTaskAiContextSignature } from "../lib/taskAiAdjustment";
import { playMockAiSteps } from "../lib/taskAiFeedback";
import { getTaskAiAdjustmentSteps } from "../lib/taskAiAdjustmentProgress";
import { emptyTaskAiAdjustmentDraft, getTaskAiAdjustmentDraftKey, taskAiAdjustmentDraftReducer, type TaskAiAdjustmentDraft } from "../lib/taskAiAdjustmentDrafts";
import type { TaskAiAdjustmentContext, TaskAiAdjustmentProgress, TaskAiAdjustmentProposal, TaskAiAdjustmentScope } from "../lib/taskAiAdjustmentTypes";
import type { CreationProcess } from "../lib/taskCreationProgress";
import { AnimatedAgentChatInput } from "./AnimatedAgentChatInput";
import { TaskAiWorking } from "./TaskAiWorking";
import { TaskCreationHistory } from "./TaskCreationHistory";
import { Button } from "./ui/button";
import { Popover, PopoverContent } from "./ui/popover";
import { Textarea } from "./ui/input";

// Two animation frames guarantee that the running turn is painted once before a
// synchronous validation/no-change result replaces it. Abort keeps that pause
// tied to the same preview lifecycle as the longer mock feedback.
const waitForPreviewPaint = (signal: AbortSignal): Promise<boolean> => new Promise(resolve => {
  if (signal.aborted) { resolve(false); return; }
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    queueMicrotask(() => resolve(!signal.aborted));
    return;
  }
  let firstFrame: number | undefined;
  let secondFrame: number | undefined;
  let settled = false;
  const finish = (completed: boolean) => {
    if (settled) return;
    settled = true;
    if (firstFrame !== undefined) window.cancelAnimationFrame(firstFrame);
    if (secondFrame !== undefined) window.cancelAnimationFrame(secondFrame);
    signal.removeEventListener("abort", cancel);
    resolve(completed);
  };
  const cancel = () => finish(false);
  signal.addEventListener("abort", cancel, { once: true });
  firstFrame = window.requestAnimationFrame(() => {
    if (signal.aborted) { finish(false); return; }
    secondFrame = window.requestAnimationFrame(() => finish(!signal.aborted));
  });
});

export function TaskAiAdjustButton({ label = "AI 帮你改", onClick, disabled = false }: { label?: string; onClick: (anchor: HTMLElement) => void; disabled?: boolean }) {
  return <Button aria-haspopup="dialog" aria-label={label} className="task-ai-adjust-trigger" disabled={disabled} onClick={event => onClick(event.currentTarget)} size="sm" type="button" variant="ai"><Sparkles aria-hidden="true" size={14} />AI 帮你改</Button>;
}

// Keep this session in the page, so temporarily unmounting a popover preserves its drafts.
export function useTaskAiAdjustmentDrafts() {
  return useReducer(taskAiAdjustmentDraftReducer, {});
}

type Props = {
  context: TaskAiAdjustmentContext;
  scope: TaskAiAdjustmentScope;
  compactCreation?: boolean;
  history?: CreationProcess[];
  onScopeChange?: (scope: TaskAiAdjustmentScope) => void;
  onProgressChange?: (progress: TaskAiAdjustmentProgress, stop?: () => void) => void;
  onApply: (proposal: TaskAiAdjustmentProposal) => void | Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: HTMLElement | null;
  draftSession: ReturnType<typeof useTaskAiAdjustmentDrafts>;
};

export function TaskAiAdjustmentPopover({ context, scope: requestedScope, compactCreation = false, history, onScopeChange, onProgressChange, onApply, open, onOpenChange, anchor, draftSession }: Props) {
  const compact = compactCreation && context.mode === "draft";
  const scope: TaskAiAdjustmentScope = compact ? { kind: "task" } : requestedScope;
  const [drafts, dispatch] = draftSession;
  const draftKey = getTaskAiAdjustmentDraftKey(context.mode, context.task.id, scope);
  const { instruction, proposal, progressId, error, notice } = drafts[draftKey] ?? emptyTaskAiAdjustmentDraft;
  const updateDraft = (patch: Partial<TaskAiAdjustmentDraft>) => dispatch({ type: "patch", key: draftKey, patch });
  const setNotice = (value: string) => updateDraft({ notice: value });
  const setError = (value: string) => updateDraft({ error: value });
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState<{ key: string; step: number } | null>(null);
  const previewController = useRef<AbortController | null>(null);
  const previewRun = useRef(0);
  const progressByDraft = useRef(new Map<string, TaskAiAdjustmentProgress>());
  const runningProgress = useRef<{ key: string; id: string } | null>(null);
  const progressListener = useRef(onProgressChange);
  progressListener.current = onProgressChange;
  const contextSignature = getTaskAiContextSignature(context);
  const latestPreview = useRef({ draftKey, open, contextSignature });
  latestPreview.current = { draftKey, open, contextSignature };
  const isPreviewing = Boolean(open && previewing?.key === draftKey);
  const applying = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stopButtonRef = useRef<HTMLButtonElement>(null);
  const scopeSelectRef = useRef<HTMLSelectElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const followHistory = useRef(true);
  const historyWasOpen = useRef(false);
  const [historyHasNew, setHistoryHasNew] = useState(false);
  const composerId = useId();
  const restoreFocus = useRef(true);
  const target = scope.kind === "subtask" ? context.subtasks.find(task => task.id === scope.taskId) : context.task;
  const scopeLabel = scope.kind === "subtasks" ? "子任务安排" : scope.kind === "subtask" ? "单个子任务" : "任务信息";
  const ScopeIcon = scope.kind === "subtasks" ? Layers3 : scope.kind === "subtask" ? GitBranch : Target;
  const availableScopes: Array<{ scope: TaskAiAdjustmentScope; label: string; disabled?: boolean }> = [
    { scope: { kind: "task" }, label: "任务信息" },
    ...(context.canAddSubtasks || context.subtasks.length ? [{ scope: { kind: "subtasks" } as const, label: "子任务安排" }] : []),
    ...context.subtasks.map((task, index) => ({ scope: { kind: "subtask", taskId: task.id } as const, label: `子任务 ${index + 1}：${task.title || "未命名子任务"}` })),
    ...(scope.kind === "subtask" && !target ? [{ scope, label: "已移除的子任务", disabled: true }] : []),
  ];
  const scopeOptions = availableScopes.map(option => ({ ...option, key: getTaskAiAdjustmentDraftKey(context.mode, context.task.id, option.scope) }));
  const stale = proposal !== null && proposal.baseSignature !== contextSignature;
  const additions = proposal?.additions ?? [];
  const fieldChanges = proposal?.changes.filter(change => !additions.some(task => task.id === change.taskId)) ?? [];
  const latestHistory = history?.at(-1);
  const compactError = compact && error && error !== latestHistory?.responseSummary ? error : "";
  const compactNotice = compact && notice && latestHistory?.status !== "stopped" && notice !== latestHistory?.responseSummary ? notice : "";
  const historyVersion = latestHistory ? [history?.length, latestHistory.id, latestHistory.status, latestHistory.activeStep, latestHistory.applicationStatus, latestHistory.responseSummary, latestHistory.outcome].join(":") : "empty";

  const publishProgress = (progress: TaskAiAdjustmentProgress, key = draftKey) => {
    progressByDraft.current.set(key, progress);
    if (progress.status === "running") runningProgress.current = { key, id: progress.id };
    else if (runningProgress.current?.id === progress.id) runningProgress.current = null;
    progressListener.current?.(progress, progress.status === "running" ? () => {
      // A retained stop control for an older round must never stop a newer preview.
      if (runningProgress.current?.key === key && runningProgress.current.id === progress.id) stopPreview();
    } : undefined);
  };
  const finishProgress = (
    status: Exclude<TaskAiAdjustmentProgress["status"], "running">,
    outcome: string,
    key = draftKey,
    onlyRunning = false,
    patch: Partial<Pick<TaskAiAdjustmentProgress, "responseSummary" | "changes" | "applicationStatus">> = {},
  ) => {
    const progress = progressByDraft.current.get(key) ?? (key === draftKey && proposal && progressId ? {
      id: progressId, taskId: context.task.id, instruction: proposal.instruction,
      steps: getTaskAiAdjustmentSteps(proposal.instruction, proposal), activeStep: 1, status: "completed" as const,
      responseSummary: proposal.summary, changes: proposal.changes.map(change => ({ ...change })), applicationStatus: "pending" as const,
    } : undefined);
    if (!progress || (onlyRunning && progress.status !== "running") || (progress.status === status && progress.outcome === outcome)) return;
    publishProgress({ ...progress, ...patch, status, outcome }, key);
  };

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = true;
    const frame = requestAnimationFrame(() => {
      if (scopeSelectRef.current === document.activeElement) return;
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, draftKey, anchor]);

  useEffect(() => {
    if (!compact) return;
    const justOpened = open && !historyWasOpen.current;
    historyWasOpen.current = open;
    if (!open) return;
    if (!justOpened && !followHistory.current) { setHistoryHasNew(true); return; }
    const frame = requestAnimationFrame(() => {
      const body = bodyRef.current;
      if (!body) return;
      body.scrollTop = body.scrollHeight;
      followHistory.current = true;
      setHistoryHasNew(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, compact, historyVersion, error, notice]);

  useEffect(() => {
    if (!compact || !isPreviewing) return;
    const frame = requestAnimationFrame(() => stopButtonRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [compact, isPreviewing]);

  useEffect(() => {
    setPreviewing(null);
    return () => {
      previewRun.current += 1;
      previewController.current?.abort();
      previewController.current = null;
      finishProgress("stopped", "预览已中止，输入已保留。", draftKey, true);
    };
  }, [open, draftKey]);

  useEffect(() => {
    if (stale && !applying.current) finishProgress("completed", "内容已变化，当前预览已过期。请重新预览，输入已保留。", draftKey, false, { applicationStatus: "expired" });
  }, [stale, draftKey, proposal, saving]);

  const invalidatePreview = () => {
    previewRun.current += 1;
    previewController.current?.abort();
    previewController.current = null;
    setPreviewing(null);
    finishProgress("stopped", "已停止预览，输入已保留。", draftKey, true);
  };
  const stopPreview = () => {
    invalidatePreview();
    setNotice("已停止预览，输入已保留。");
    window.requestAnimationFrame(() => { if (latestPreview.current.open && latestPreview.current.draftKey === draftKey) inputRef.current?.focus({ preventScroll: true }); });
  };
  const changeInstruction = (value: string) => {
    if (applying.current || previewController.current) return;
    if (proposal) finishProgress("completed", "输入已更新，原候选未应用；可重新预览。", draftKey, false, { applicationStatus: "not_applied" });
    updateDraft({ instruction: value, proposal: null, progressId: undefined, error: "", notice: "" });
  };
  const changeScope = (key: string) => {
    if (compact || applying.current || previewController.current || !open || !onScopeChange) return;
    const option = scopeOptions.find(item => item.key === key);
    if (!option || option.disabled || option.key === draftKey) return;
    // Each scope keeps its own instruction and preview in the page-owned session.
    onScopeChange(option.scope);
  };
  const preview = async () => {
    if (applying.current || previewController.current || !open || !instruction.trim()) return;
    const controller = new AbortController();
    previewController.current = controller;
    const run = ++previewRun.current;
    const isCurrent = () => run === previewRun.current && !controller.signal.aborted
      && latestPreview.current.open && latestPreview.current.draftKey === draftKey;
    let progress: TaskAiAdjustmentProgress = {
      id: `${composerId}:${run}`, taskId: context.task.id, instruction,
      steps: getTaskAiAdjustmentSteps(instruction), activeStep: 0, status: "running",
    };
    updateDraft({ error: "", notice: "", proposal: null, progressId: undefined });
    setPreviewing({ key: draftKey, step: 0 });
    publishProgress(progress);
    try {
      if (!isCurrent()) return;
      // Calculate against this request's context once. The short delay only demonstrates Mock feedback.
      const result = compact ? buildTaskAiCreationAdjustment(context, instruction) : buildTaskAiAdjustment(context, scope, instruction);
      if ("error" in result) {
        const painted = await waitForPreviewPaint(controller.signal);
        if (!painted || !isCurrent()) return;
        setError(result.error);
        finishProgress("failed", result.error, draftKey, false, { responseSummary: result.error });
        return;
      }
      progress = { ...progress, steps: getTaskAiAdjustmentSteps(instruction, result.proposal) };
      publishProgress(progress);
      if (!isCurrent()) return;
      if (!result.proposal.changes.length) {
        const painted = await waitForPreviewPaint(controller.signal);
        if (!painted || !isCurrent()) return;
        setNotice(result.proposal.summary);
        publishProgress({ ...progress, activeStep: 1, status: "completed", outcome: result.proposal.summary,
          responseSummary: result.proposal.summary, changes: [], applicationStatus: "no_change" });
        return;
      }
      const completed = await playMockAiSteps(2, {
        signal: controller.signal,
        onStep: step => {
          if (!isCurrent()) return;
          setPreviewing({ key: draftKey, step });
          progress = { ...progress, activeStep: step };
          publishProgress(progress);
        },
      });
      if (!completed || !isCurrent()) return;
      if (latestPreview.current.contextSignature !== contextSignature) {
        setError("任务内容或成员信息已变化，请重新预览。输入已保留。");
        finishProgress("failed", "任务内容或成员信息已变化，请重新预览。输入已保留。");
        return;
      }
      updateDraft({ proposal: result.proposal, progressId: progress.id });
      publishProgress({ ...progress, status: "completed", outcome: "修改候选已生成，确认后才应用。",
        responseSummary: result.proposal.summary, changes: result.proposal.changes.map(change => ({ ...change })), applicationStatus: "pending" });
      window.requestAnimationFrame(() => {
        if (!isCurrent()) return;
        if (!compact || followHistory.current) {
          previewRef.current?.scrollIntoView({ block: "nearest" });
          previewRef.current?.focus({ preventScroll: true });
        } else {
          setHistoryHasNew(true);
        }
      });
    } catch (caught) {
      if (isCurrent()) {
        const painted = await waitForPreviewPaint(controller.signal);
        if (!painted || !isCurrent()) return;
        const message = caught instanceof Error ? caught.message : "预览未完成，输入已保留，请重试。";
        setError(message); finishProgress("failed", message);
      }
    } finally {
      if (previewRun.current === run) {
        previewController.current = null;
        setPreviewing(null);
      }
    }
  };
  const apply = async () => {
    if (applying.current || previewController.current || !proposal || stale) return;
    applying.current = true; setSaving(true); setError("");
    try {
      await onApply(proposal);
      finishProgress("completed", context.mode === "draft" ? compact ? "调整已应用到草稿，可以继续提出要求。" : "调整已应用到草稿。" : "修改已保存。", draftKey, false, { applicationStatus: "applied" });
      if (compact) {
        updateDraft({ instruction: "", proposal: null, progressId: undefined, error: "", notice: "已应用到草稿，可以继续告诉我你想怎样调整。" });
        window.requestAnimationFrame(() => { if (latestPreview.current.open && latestPreview.current.draftKey === draftKey) inputRef.current?.focus({ preventScroll: true }); });
      } else {
        dispatch({ type: "discard", key: draftKey });
        restoreFocus.current = true;
        onOpenChange(false);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "修改尚未保存，请检查后重试。输入和预览已保留。";
      setError(message); finishProgress("completed", message, draftKey, false, { applicationStatus: "pending" });
    } finally { applying.current = false; setSaving(false); }
  };

  const dismiss = () => {
    if (applying.current) return;
    invalidatePreview();
    restoreFocus.current = true;
    onOpenChange(false);
  };
  const cancel = () => {
    if (applying.current) return;
    finishProgress("completed", compact ? "已取消候选，未应用修改；输入已保留。" : "已取消本次调整，未应用修改。", draftKey, false, { applicationStatus: "not_applied" });
    if (compact) {
      updateDraft({ proposal: null, progressId: undefined, error: "", notice: "已取消候选，输入已保留，可继续调整。" });
      inputRef.current?.focus({ preventScroll: true });
    } else {
      dispatch({ type: "discard", key: draftKey });
      dismiss();
    }
  };
  const handleTabBoundary = (event: KeyboardEvent<HTMLDivElement>) => {
    if (compact) return;
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button, textarea, select, summary, [tabindex]"))
      .filter(element => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0);
    const boundary = event.shiftKey ? controls[0] : controls.at(-1);
    if (document.activeElement !== boundary) return;
    // External anchors (including closed menus) have no Base UI Trigger focus guards.
    // Let Tab work normally inside; at either edge, collapse and return to the real anchor.
    event.preventDefault();
    dismiss();
  };

  const scrollHistoryToEnd = () => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTop = body.scrollHeight;
    followHistory.current = true;
    setHistoryHasNew(false);
  };
  const finalFocusTarget = () => {
    if (!restoreFocus.current || !anchor?.isConnected) return false;
    if (!compact) return anchor;
    const rect = anchor.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth ? anchor : false;
  };

  const composer = <form aria-busy={saving || isPreviewing} id={composerId} onSubmit={event => { event.preventDefault(); void preview(); }}>
    {compact ?
      <AnimatedAgentChatInput
        actionRef={stopButtonRef}
        allowAttachments={false}
        ariaLabel="继续告诉 AgentDoor 怎样调整任务方案"
        autoFocus={false}
        clearOnSend={false}
        disabled={saving}
        hint="Enter 发送 · Shift + Enter 换行"
        inputRef={inputRef}
        onChange={changeInstruction}
        onSend={() => { void preview(); }}
        onStop={stopPreview}
        placeholder="继续告诉 AgentDoor 你想怎样调整…"
        sendLabel="发送修改要求"
        status={isPreviewing ? "analyzing" : "ready"}
        value={instruction}
      /> : <>
      <label className="sr-only" htmlFor={`${composerId}-input`}>你想怎样调整？</label>
      <Textarea aria-invalid={Boolean(error)} disabled={saving || isPreviewing} id={`${composerId}-input`} onChange={event => changeInstruction(event.target.value)} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void preview(); } }} placeholder={scope.kind === "subtasks" ? "例如：子任务「任务名称」：负责人改为林洁" : "例如：增加完成标准：交付结果已与相关成员核对"} ref={inputRef} rows={3} value={instruction} />
      <div className="task-ai-adjust-composer-actions">{isPreviewing ? <TaskAiWorking cancelLabel="停止预览调整" detail={`仅调整${scopeLabel}，先预览，确认后应用`} label={previewing?.step === 1 ? "整理修改预览" : "理解调整要求"} onCancel={stopPreview} /> : <><span><Sparkles aria-hidden="true" size={14} />先预览，确认后应用</span>{!proposal && <Button aria-label="预览调整" className="task-ai-adjust-send" disabled={saving || !instruction.trim()} size="icon" title="预览调整 · ⌘ / Ctrl + Enter" type="submit"><ArrowUp aria-hidden="true" size={19} /></Button>}</>}</div>
    </>}
  </form>;
  const proposalActionButtons = <>
    <Button disabled={saving} onClick={cancel} type="button" variant="ghost">取消</Button>
    {proposal && !stale ? <Button className="task-ai-adjust-primary" disabled={saving} onClick={() => void apply()} type="button">{saving ? <LoaderCircle aria-hidden="true" className="task-ai-adjust-spinner" size={15} /> : <Check aria-hidden="true" size={15} />}{saving ? "正在保存" : context.mode === "draft" ? "应用到草稿" : "保存修改"}</Button> : <Button className="task-ai-adjust-primary" disabled={saving || !instruction.trim()} form={composerId} type="submit">{stale ? "重新预览" : "预览调整"}<ArrowRight aria-hidden="true" size={15} /></Button>}
  </>;

  return <Popover modal={false} onOpenChange={(value, details) => {
    if (applying.current) { details.cancel(); return; }
    if (!value && compact && (details.reason === "outside-press" || details.reason === "focus-out")) {
      details.cancel();
      return;
    }
    if (!value) invalidatePreview();
    restoreFocus.current = details.reason !== "outside-press" && details.reason !== "focus-out";
    onOpenChange(value);
  }} open={open}>
    <PopoverContent align="end" anchor={anchor} aria-label={`AI 帮你改：${target?.title || "未命名任务"}`} className={`task-ai-adjust-popover${compact ? " is-compact" : ""}`} collisionPadding={8} finalFocus={finalFocusTarget} initialFocus={inputRef} onKeyDownCapture={handleTabBoundary} positionerClassName={compact ? "task-ai-adjust-fixed-positioner" : undefined} positionMethod="fixed" sideOffset={10}>
      {compact ? <header className="task-ai-adjust-conversation-header">
        <div><span><Sparkles aria-hidden="true" size={15} /><strong>本次创建对话</strong></span><small>{history?.length ?? 0} 轮</small></div>
        <Button aria-label="收起 AI 帮你改" className="task-ai-adjust-close" disabled={saving} onClick={dismiss} size="icon-sm" title="收起，保留输入" type="button" variant="ghost"><X aria-hidden="true" size={16} /></Button>
      </header> : <header className="task-ai-adjust-header">
        {onScopeChange ? <div className="task-ai-adjust-scope-picker">
          <label htmlFor={`${composerId}-scope`}><ScopeIcon aria-hidden="true" size={14} />调整范围</label>
          <div className="task-ai-adjust-scope-control">
            <select disabled={saving || isPreviewing} id={`${composerId}-scope`} onChange={event => changeScope(event.target.value)} ref={scopeSelectRef} value={draftKey}>
              {scopeOptions.map(option => <option disabled={option.disabled} key={option.key} value={option.key}>{option.label}</option>)}
            </select>
            <ChevronDown aria-hidden="true" size={14} />
          </div>
        </div> : <span aria-label="调整范围" className="task-ai-adjust-scope"><ScopeIcon aria-hidden="true" size={14} /><span>调整：{scopeLabel}</span><strong title={target?.title || "未命名任务"}>{target?.title || "未命名任务"}</strong></span>}
        <Button aria-label="收起 AI 帮你改" disabled={saving} onClick={dismiss} size="icon-sm" title="收起，保留输入" type="button" variant="ghost"><X aria-hidden="true" size={16} /></Button>
      </header>}
      <div aria-label={compact ? "本次创建对话和修改预览" : undefined} className="task-ai-adjust-body" onScroll={compact ? event => {
        const body = event.currentTarget;
        const atEnd = body.scrollHeight - body.scrollTop - body.clientHeight < 32;
        followHistory.current = atEnd;
        if (atEnd) setHistoryHasNew(false);
      } : undefined} ref={bodyRef} role={compact ? "region" : undefined} tabIndex={compact ? 0 : undefined}>
        {compact && history?.length ? <TaskCreationHistory hideLatestPendingChanges onStopLatest={isPreviewing ? stopPreview : undefined} processes={history} /> : null}
        {!compact && composer}
        {!compact && error && <p className="task-ai-adjust-error" role="alert">{error}</p>}
        {!compact && notice && <p className="task-ai-adjust-notice" role="status">{notice}</p>}
        {compactError && <p className="task-ai-adjust-error task-ai-adjust-conversation-state" role="alert">{compactError}</p>}
        {compactNotice && <p className="task-ai-adjust-notice task-ai-adjust-conversation-state" role="status">{compactNotice}</p>}
        {!isPreviewing && proposal && <section aria-label="待应用的调整" className="task-ai-adjust-preview" ref={previewRef} tabIndex={-1}>
          <header><span><Check aria-hidden="true" size={15} />本次修改</span><small>{additions.length ? `新增 ${additions.length} 个子任务` : `${fieldChanges.length} 处变化`}</small></header>
          {additions.map(task => <article aria-label={`新增子任务：${task.title}`} className="task-ai-adjust-addition" key={task.id}><h3><GitBranch aria-hidden="true" size={15} />{task.title}</h3><dl>{proposal.changes.filter(change => change.taskId === task.id && change.label !== "新增子任务").map(change => <div key={change.label}><dt>{change.label}</dt><dd>{change.after || "未设置"}</dd></div>)}</dl></article>)}
          <ul>{fieldChanges.map((change, index) => <li key={`${change.taskId}:${change.label}:${index}`}>
            <div className="task-ai-adjust-field"><strong>{change.label}</strong>{(compact || scope.kind === "subtasks") && <span>{change.taskTitle}</span>}</div>
            <div className="task-ai-adjust-diff"><div className="task-ai-adjust-before"><small>修改前</small><p>{change.before || "未设置"}</p></div><ArrowRight aria-hidden="true" size={14} /><div className="task-ai-adjust-after"><small>修改后</small><p>{change.after || "未设置"}</p></div></div>
          </li>)}</ul>
          {!compact && <p className="task-ai-adjust-summary">{proposal.summary}</p>}
          {stale && <p className="task-ai-adjust-error" role="alert">内容已变化，当前预览已过期。请重新预览，避免覆盖最新修改。</p>}
          {compact && <footer className="task-ai-adjust-preview-actions"><span>{stale ? "当前候选已过期" : "当前候选待应用"}</span><div>{proposalActionButtons}</div></footer>}
        </section>}
      </div>
      {compact && <div className="task-ai-adjust-conversation-composer">
        {historyHasNew && <button className="task-ai-adjust-new-reply" onClick={scrollHistoryToEnd} type="button">查看最新进度</button>}
        {composer}
      </div>}
      {!compact && !isPreviewing && proposal && <footer className="task-ai-adjust-footer">
        <span>{context.mode === "draft" ? "应用后仍需确认创建" : "保存后记录到任务活动"}</span>
        {proposalActionButtons}
      </footer>}
      {!compact && !isPreviewing && !proposal && instruction && <div className="task-ai-adjust-draft-actions"><span>收起后可继续编辑</span><Button disabled={saving} onClick={cancel} size="sm" type="button" variant="ghost">取消</Button></div>}
    </PopoverContent>
  </Popover>;
}
