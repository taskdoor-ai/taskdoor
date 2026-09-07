import { ArrowLeft, ArrowRight, Check, ChevronRight, GitBranch, Layers3, Lightbulb, RotateCcw, Sparkles, UserPlus } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { taskCreationScenarios, type TaskCreationScenarioId } from "../data/taskCreationScenarios";
import type { TagDefinition } from "../data/tagGroups";
import type { ExistingTaskCandidate } from "../lib/taskCreationScenario";
import type { TaskPlanDraft } from "../lib/taskAssistantProtocol";
import { toTaskPlanDraft, validateCreationForm, type CreationForm } from "../lib/taskCreationForm";
import { reconcileCreationEffort } from "../lib/taskCreationEffort";
import { planTaskCreation, resolveCreationRelationship, type CreationPlanningQuestion, type CreationPlanningResult } from "../lib/taskCreationPlanning";
import { createCreationRelationshipProcess, CREATION_MOCK_STEP_MS, getCreationDisplayStage, getCreationFeedback, getCreationResponseSummary, markLatestCreationDecisionResolved, recordCreationAdjustmentProgress, type CreationProcess } from "../lib/taskCreationProgress";
import { playMockAiSteps } from "../lib/taskAiFeedback";
import { applyDraftTaskAiAdjustment, createDraftTaskAiContext } from "../lib/taskAiAdjustmentAdapters";
import type { TaskAiAdjustmentProgress, TaskAiAdjustmentProposal, TaskAiAdjustmentScope } from "../lib/taskAiAdjustmentTypes";
import type { Member } from "./MemberSelector";
import { AnimatedAgentChatInput } from "./AnimatedAgentChatInput";
import { TaskCreationExistingTaskCard } from "./TaskCreationExistingTaskCard";
import { TaskCreationPlanEditor } from "./TaskCreationPlanEditor";
import { TaskCreationProcess } from "./TaskCreationProcess";
import { TaskAiAdjustButton, TaskAiAdjustmentPopover, useTaskAiAdjustmentDrafts } from "./TaskAiAdjustmentPopover";
import { Button } from "./ui/button";
import { Textarea } from "./ui/input";
import "../styles/task-heading.css";
import "../styles/task-creation-page.css";
import "../styles/task-ai-adjustment.css";
import "../styles/task-criteria-editor.css";
import "../styles/task-creation-subtask.css";

type CreationResult = { createdCount: number; mainTaskId: string; taskTitles: string[] };
export type TaskCreationParentContext = {
  parentTaskId: string;
  pathItems: Array<{ id: string; label: string }>;
};
type Props = {
  active?: boolean;
  creationParent?: TaskCreationParentContext | null;
  currentUserId: string;
  existingTasks: ExistingTaskCandidate[];
  members: Member[];
  tags: TagDefinition[];
  onCreateTaskPlan: (draft: TaskPlanDraft) => CreationResult;
  onCreateSubtask: (parentTaskId: string, draft: TaskPlanDraft) => CreationResult;
  onOpenTask: (taskId: string) => void;
  onCancel: () => void;
  onDraftStart?: () => void;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
  onPathSelect?: (nodeId: string) => void;
};
type CreationWorkspaceDraft = {
  request: string;
  scenarioId?: TaskCreationScenarioId;
  planning: CreationPlanningResult | null;
  answers: { goal?: string; deliverable?: string };
  processes: CreationProcess[];
  editingBrief: boolean;
};
const emptyWorkspaceDraft = (): CreationWorkspaceDraft => ({ request: "", planning: null, answers: {}, processes: [], editingBrief: false });

export function normalizePlanningForFixedParent(result: CreationPlanningResult, creationParent?: TaskCreationParentContext | null): CreationPlanningResult {
  if (!creationParent || result.stage === "clarify" || result.stage === "unavailable") return result;
  return {
    stage: "review",
    summary: result.summary,
    form: {
      ...result.form,
      candidate: undefined,
      candidateKind: undefined,
      candidateReason: undefined,
      decision: "independent",
    },
  };
}

function ClarificationStep({ question, answer, disabled, finalStep, onAnswer, onContinue, onPrevious }: {
  question: CreationPlanningQuestion;
  answer?: string;
  disabled: boolean;
  finalStep: boolean;
  onAnswer: (value: string) => void;
  onContinue: () => void;
  onPrevious: () => void;
}) {
  const inputId = "creation-answer-" + question.field;
  const customAnswer = answer && !question.choices.includes(answer) ? answer : "";
  return <form className="creation-questions" onSubmit={event => { event.preventDefault(); if (!disabled && answer?.trim()) onContinue(); }}><section className="creation-question">
    <h2 id={inputId + "-title"}>{question.title}</h2>
    <div aria-label={question.title + "的建议选项"} className="creation-answer-options">
      {question.choices.map(choice => <button aria-pressed={answer === choice} disabled={disabled} key={choice} onClick={() => onAnswer(choice)} type="button"><span>{choice}</span>{answer === choice && <Check aria-hidden="true" size={16} />}</button>)}
    </div>
    <div className="creation-custom-answer">
      <label htmlFor={inputId}>自定义</label>
      <Textarea disabled={disabled} id={inputId} onChange={event => onAnswer(event.target.value)} placeholder={question.placeholder} rows={1} value={customAnswer} />
    </div>
  </section>
    <footer className="creation-question-actions">
      <Button disabled={disabled} onClick={onPrevious} size="lg" type="button" variant="outline"><ArrowLeft size={15} />上一步</Button>
      <Button className="creation-primary" disabled={disabled || !answer?.trim()} size="lg" type="submit">{finalStep && <Sparkles size={15} />}{finalStep ? "生成方案" : "下一步"}{!finalStep && <ArrowRight size={15} />}</Button>
    </footer>
  </form>;
}

export function TaskCreationPage({ active = true, creationParent, currentUserId, existingTasks, members, tags, onCreateTaskPlan, onCreateSubtask, onOpenTask, onCancel, onDraftStart, onInviteMembers, onPathSelect }: Props) {
  const context = { currentUserId, existingTasks, members, tags: tags.map(t => t.name), currentDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()) };
  const [workspace, setWorkspace] = useState<CreationWorkspaceDraft>(emptyWorkspaceDraft);
  const [clarificationStep, setClarificationStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [planningNotice, setPlanningNotice] = useState("");
  const [aiScope, setAiScope] = useState<TaskAiAdjustmentScope | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const aiDraftSession = useTaskAiAdjustmentDrafts();
  const [adjustmentNotice, setAdjustmentNotice] = useState("");
  const [dirtySubtasks, setDirtySubtasks] = useState<Record<string, boolean>>({});
  const hasUnsavedSubtasks = Object.values(dirtySubtasks).some(Boolean);
  const unsavedMessage = "子任务有未能同步的修改，请展开核对。";
  const onSubtaskDirtyChange = (taskId: string, dirty: boolean) => setDirtySubtasks(current => {
    if (Boolean(current[taskId]) === dirty) return current;
    const next = { ...current };
    if (dirty) next[taskId] = true; else delete next[taskId];
    return next;
  });
  const aiReturnFocus = useRef<HTMLElement | null>(null);
  const adjustmentStop = useRef<{ id: string; stop: () => void } | null>(null);
  const latestAiTaskId = useRef<string | null>(null);
  const drafts = useRef(new Map<string, CreationWorkspaceDraft>());
  const creating = useRef(false);
  const planningRun = useRef(0);
  const planningAbort = useRef<AbortController | null>(null);
  const restorePlanningFocus = useRef(false);
  const requestRef = useRef<HTMLTextAreaElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const focusedStage = useRef("");
  const reducedMotion = useReducedMotion();
  const planning = workspace.planning;
  const currentClarificationQuestion = planning?.stage === "clarify" ? planning.questions[clarificationStep] : undefined;
  const form = planning && (planning.stage === "review" || planning.stage === "decision") ? planning.form : null;
  const aiContext = form ? createDraftTaskAiContext(form, members, currentUserId) : null;
  latestAiTaskId.current = aiContext?.task.id ?? null;
  const latestProcess = workspace.processes.at(-1);
  const adjustmentRunning = latestProcess?.kind === "adjustment" && latestProcess.status === "running";
  const displayStage = getCreationDisplayStage(planning, { busy, editingBrief: workspace.editingBrief });
  const showDescribe = displayStage === "describe";
  const validation = form ? validateCreationForm(form, members) : null;
  const unassignedTaskCount = form ? [form.mainTask, ...form.subtasks].filter((task) => !task.ownerId).length : 0;
  const stageKey = displayStage === "review" ? form?.mainTask.clientId ?? "review" : displayStage;
  const stageLabel = showDescribe ? "描述任务需求" : displayStage === "planning" ? "正在整理需求" : displayStage === "clarify" ? "补充关键信息" : displayStage === "decision" ? "确认任务关系" : "任务方案详情";
  const updateProcess = (id: CreationProcess["id"], patch: Partial<CreationProcess>) => setWorkspace(current => ({
    ...current, processes: current.processes.map(process => process.id === id ? { ...process, ...patch } : process),
  }));
  const updateAdjustmentProgress = (progress: TaskAiAdjustmentProgress, stop?: () => void) => {
    if (progress.taskId !== latestAiTaskId.current) return;
    if (progress.status === "running" && stop) adjustmentStop.current = { id: progress.id, stop };
    else if (adjustmentStop.current?.id === progress.id) adjustmentStop.current = null;
    setWorkspace(current => {
      const draft = current.planning;
      if (!draft || draft.stage !== "review" || draft.form.mainTask.clientId !== progress.taskId) return current;
      const processes = recordCreationAdjustmentProgress(current.processes, progress);
      return processes === current.processes ? current : { ...current, processes };
    });
  };
  const stopAdjustment = () => adjustmentStop.current?.stop();

  const focusStage = () => {
    if (!active || !pageRef.current?.getClientRects().length) return;
    if (focusedStage.current === stageKey) return;
    focusedStage.current = stageKey;
    pageRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    if (showDescribe) requestRef.current?.focus({ preventScroll: true });
    else if (displayStage === "planning") stageRef.current?.querySelector<HTMLButtonElement>('button[aria-label="停止生成方案"]')?.focus({ preventScroll: true });
    else if (displayStage === "clarify") stageRef.current?.querySelector<HTMLButtonElement>(".creation-answer-options > button")?.focus({ preventScroll: true });
    else stageRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => () => { planningRun.current += 1; planningAbort.current?.abort(); }, []);

  useEffect(() => {
    if (!active) { setAiOpen(false); return; }
    focusedStage.current = "";
    const frame = requestAnimationFrame(focusStage);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  useEffect(() => {
    if (!active || displayStage !== "clarify") return;
    const frame = requestAnimationFrame(() => stageRef.current?.querySelector<HTMLButtonElement>(".creation-answer-options > button")?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [active, clarificationStep, displayStage]);

  useEffect(() => {
    if (!active) return;
    if (busy || !restorePlanningFocus.current) return;
    restorePlanningFocus.current = false;
    const frame = requestAnimationFrame(() => {
      stageRef.current?.querySelector<HTMLTextAreaElement>("textarea:not(:disabled)")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [busy, active]);

  const stopPlanning = () => {
    const run = planningRun.current;
    planningRun.current += 1;
    planningAbort.current?.abort(); planningAbort.current = null;
    restorePlanningFocus.current = true;
    updateProcess(run, { status: "stopped", outcome: "生成已停止，需求和原有方案已保留" });
    setBusy(false);
    setPlanningNotice("已停止整理，需求和原有方案均已保留。");
  };

  const clearTransientState = () => {
    planningRun.current += 1;
    planningAbort.current?.abort(); planningAbort.current = null;
    restorePlanningFocus.current = false;
    adjustmentStop.current?.stop(); adjustmentStop.current = null;
    creating.current = false;
    setPlanningNotice("");
    setBusy(false); setError(""); setAdjustmentNotice("");
    setClarificationStep(0);
    setAiOpen(false); setAiScope(null);
    onDraftStart?.();
  };
  const openScenario = (id: TaskCreationScenarioId | "custom") => {
    if (busy || adjustmentRunning) return;
    if (hasUnsavedSubtasks) { setError(unsavedMessage); return; }
    if (workspace.request.trim()) drafts.current.set(workspace.scenarioId ?? "custom", workspace);
    const scenario = taskCreationScenarios.find(item => item.id === id);
    setWorkspace(drafts.current.get(id) ?? { ...emptyWorkspaceDraft(), request: scenario?.prompt ?? "", scenarioId: scenario?.id });
    clearTransientState();
    requestRef.current?.focus();
  };
  const startAnother = () => { setWorkspace(emptyWorkspaceDraft()); clearTransientState(); };
  const updateForm = (next: CreationForm) => {
    if (busy || adjustmentRunning || planning?.stage !== "review") return;
    setWorkspace(current => ({ ...current, planning: { stage: "review", form: reconcileCreationEffort(planning.form, next), summary: planning.summary } }));
    setAdjustmentNotice(""); setError("");
  };
  const generatePlan = async (answers?: CreationWorkspaceDraft["answers"]) => {
    if (planningAbort.current || busy || !workspace.request.trim()) return;
    const run = ++planningRun.current;
    const controller = new AbortController();
    planningAbort.current = controller;
    restorePlanningFocus.current = false;
    const planningRequest = form?.request.trim() ?? (planning?.stage === "clarify" || planning?.stage === "unavailable" ? planning.request.trim() : undefined);
    const effectiveAnswers = answers ?? (planningRequest === workspace.request.trim() ? workspace.answers : {});
    setBusy(true); setError(""); setPlanningNotice("");
    try {
      const next = normalizePlanningForFixedParent(
        planTaskCreation(workspace.request, context, { scenarioId: workspace.scenarioId, answers: effectiveAnswers }),
        creationParent,
      );
      const feedback = getCreationFeedback(next);
      const title = answers ? "补充信息后规划" : workspace.processes.length ? "重新生成" : "初次生成";
      const startedAt = Date.now();
      setWorkspace(current => ({ ...current, processes: [...current.processes, {
        id: run, title, request: workspace.request.trim(), answers: { ...effectiveAnswers }, steps: feedback,
        activeStep: 0, status: "running", startedAt,
      }] }));
      // Readable Mock playback at page level; not a model/tool trace or saved report.
      const completed = await playMockAiSteps(feedback.length, {
        signal: controller.signal,
        stepMs: CREATION_MOCK_STEP_MS,
        onStep: index => { if (run === planningRun.current) updateProcess(run, { activeStep: index }); },
      });
      if (!completed || run !== planningRun.current) return;
      const outcome = next.stage === "review" ? "候选方案已生成" : next.stage === "clarify" ? "需要补充关键信息" : next.stage === "decision" ? "任务关系待确认" : "当前输入需要调整";
      updateProcess(run, { activeStep: Math.max(0, feedback.length - 1), status: "completed", completedAt: Date.now(), outcome, responseSummary: getCreationResponseSummary(next) });
      if (next.stage === "unavailable") {
        restorePlanningFocus.current = true;
        setError(next.message);
        if (!planning) setWorkspace(current => ({ ...current, planning: next }));
        return;
      }
      setWorkspace(current => ({
        ...current, planning: next, answers: effectiveAnswers, editingBrief: false,
        scenarioId: next.stage === "clarify" ? next.scenarioId : next.form.scenarioId,
      }));
      if (next.stage === "clarify") setClarificationStep(0);
      setAiOpen(false); setAiScope(null); setAdjustmentNotice("");
      if (next.stage === "clarify" && answers) {
        restorePlanningFocus.current = true;
        setError("还需要明确以下信息：" + next.questions.map(question => question.title).join(" "));
      }
    } catch (caught) {
      if (run === planningRun.current) {
        restorePlanningFocus.current = true;
        updateProcess(run, { status: "failed", outcome: "生成未完成，需求和原有方案已保留" });
        setError(caught instanceof Error ? caught.message : "暂时无法生成方案，需求和已有方案已保留，请重试。");
      }
    } finally {
      if (run === planningRun.current) {
        planningAbort.current = null;
        setBusy(false);
      }
    }
  };
  const selectClarificationAnswer = (question: CreationPlanningQuestion, value: string) => {
    if (busy || planningAbort.current || planning?.stage !== "clarify" || planning.questions[clarificationStep]?.field !== question.field) return;
    setWorkspace(current => ({ ...current, answers: { ...current.answers, [question.field]: value } }));
    setError("");
  };
  const previousClarificationStep = () => {
    if (busy || planningAbort.current || planning?.stage !== "clarify") return;
    setError("");
    if (clarificationStep > 0) setClarificationStep(current => current - 1);
    else setWorkspace(current => ({ ...current, editingBrief: true }));
  };
  const submitClarificationAnswer = (question: CreationPlanningQuestion, value: string) => {
    const answer = value.trim();
    if (!answer || busy || planningAbort.current || planning?.stage !== "clarify" || planning.questions[clarificationStep]?.field !== question.field) return;
    const nextAnswers = { ...workspace.answers, [question.field]: answer };
    setWorkspace(current => ({ ...current, answers: nextAnswers }));
    setError("");
    if (clarificationStep === planning.questions.length - 1) {
      void generatePlan(nextAnswers);
      return;
    }
    setClarificationStep(current => current + 1);
  };
  const resolveRelationship = (decision: "attach" | "independent") => {
    if (!form || busy) return;
    const next = resolveCreationRelationship(form, decision, context);
    if ("error" in next) { setError(next.error); return; }
    setWorkspace(current => ({
      ...current,
      planning: { stage: "review", ...next, form: reconcileCreationEffort(form, next.form) },
      processes: [...markLatestCreationDecisionResolved(current.processes), createCreationRelationshipProcess(
        `relationship:${current.processes.length + 1}`,
        decision,
        form.candidate?.name ?? form.candidate?.title ?? "已有任务",
        next.summary,
      )],
    }));
    setError(""); setAiOpen(false); setAiScope(null); setAdjustmentNotice("");
  };
  const openAiAdjustment = (scope: TaskAiAdjustmentScope, returnFocus?: HTMLElement | null) => {
    if (!form || busy || planning?.stage !== "review") return;
    if (hasUnsavedSubtasks) { setError(unsavedMessage); return; }
    aiReturnFocus.current = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setAiScope(scope); setAiOpen(true); setAdjustmentNotice("");
  };
  const applyAiAdjustment = (proposal: TaskAiAdjustmentProposal) => {
    if (!aiContext || busy || planning?.stage !== "review") throw new Error("当前方案不可修改，请返回方案后重试。");
    if (planning.form.decision === "attach" && existingTasks.find(task => task.id === planning.form.candidate?.id)?.goal !== planning.form.candidate?.goal) {
      throw new Error("主任务目标已变化，请重新确认关联后再调整。");
    }
    const next = applyDraftTaskAiAdjustment(planning.form, aiContext, proposal);
    setWorkspace(current => ({ ...current, planning: { stage: "review", form: reconcileCreationEffort(planning.form, next), summary: planning.summary } }));
    setAdjustmentNotice("调整已应用到草稿，确认创建后才会加入任务列表。"); setError("");
  };
  const submit = () => {
    if (creating.current) return;
    if (hasUnsavedSubtasks) { setError(unsavedMessage); return; }
    if (!planning || planning.stage !== "review" || aiOpen || busy || adjustmentRunning) return;
    const form = planning.form;
    const invalid = validateCreationForm(form, members);
    if (invalid) { setError(invalid); return; }
    if (creationParent && !existingTasks.some(task => task.id === creationParent.parentTaskId)) {
      setError("父任务已不存在。方案已保留，请返回有效任务后重新创建子任务。"); return;
    }
    if (form.decision === "attach") {
      const parent = existingTasks.find(task => task.id === form.candidate?.id);
      if (!parent) { setError("主任务已不存在。方案已保留，请返回需求重新规划。"); return; }
      if (parent.goal !== form.candidate?.goal) {
        setWorkspace(current => ({ ...current, planning: { stage: "decision", form: { ...form, candidate: parent, decision: "pending" }, summary: "主任务目标已变化，请重新确认关联。" } }));
        setError("主任务目标已更新，请重新确认后创建。"); return;
      }
    }
    creating.current = true;
    try {
      const plan = toTaskPlanDraft(form);
      const created = creationParent
        ? onCreateSubtask(creationParent.parentTaskId, plan)
        : form.decision === "attach" && form.candidate
          ? onCreateSubtask(form.candidate.id, plan)
          : onCreateTaskPlan(plan);
      drafts.current.delete(workspace.scenarioId ?? "custom"); setError("");
      onOpenTask(created.mainTaskId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "创建未完成，方案已保留，请重试。"); creating.current = false; }
  };

  const scenarioPicker = <div aria-label="快速开始" className="animated-agent-suggestions">
    {taskCreationScenarios.map(scenario => {
      const selected = workspace.scenarioId === scenario.id && workspace.request.trim() === scenario.prompt;
      return <button aria-pressed={selected} disabled={busy || adjustmentRunning} key={scenario.id} onClick={() => openScenario(scenario.id)} type="button">
        <Sparkles aria-hidden="true" />{scenario.label}
      </button>;
    })}
  </div>;
  const aiAdjustmentAction = !showDescribe
    ? <motion.div className="creation-ai-adjust-action" layoutId="creation-ai-composer" transition={{ duration: reducedMotion ? 0 : .22, ease: "easeInOut" }}>
      <TaskAiAdjustButton disabled={!form || planning?.stage !== "review" || busy || adjustmentRunning || hasUnsavedSubtasks || aiOpen} label="AI 帮你改任务方案" onClick={anchor => openAiAdjustment(aiScope ?? { kind: "task" }, anchor)} />
    </motion.div>
    : undefined;
  const cancelProcess = busy ? stopPlanning : adjustmentRunning ? stopAdjustment : undefined;
  const pageProcesses = workspace.processes.filter(process => process.status === "running" && process.kind !== "adjustment");
  const creationAssistantRow = pageProcesses.length
    ? <TaskCreationProcess onCancel={cancelProcess} processes={pageProcesses} />
    : null;

  return <LayoutGroup id="task-creation-ai-composer"><section className={`task-detail-view task-creation-page${showDescribe ? " creation-start-page" : ""}`} ref={pageRef}>
    <div className="creation-page-top">
      <nav aria-label="任务路径" className="task-detail-path">
        {creationParent ? creationParent.pathItems.map((item, index) => <span key={item.id}>
          {index > 0 && <ChevronRight aria-hidden="true" size={12} />}
          <button onClick={() => onPathSelect?.(item.id)} type="button">{item.label}</button>
        </span>) : <>
          <span><button aria-label="返回新建任务" onClick={startAnother} type="button">任务</button></span>
          {form?.decision === "attach" && form.candidate && <span><ChevronRight aria-hidden="true" size={12} /><button aria-label={`打开主任务：${form.candidate.name ?? form.candidate.title}`} onClick={() => onOpenTask(form.candidate!.id)} type="button">{form.candidate.name ?? form.candidate.title}</button></span>}
        </>}
        <span><ChevronRight aria-hidden="true" size={12} /><em aria-current="page">新建任务</em></span>
      </nav>
      <div className="creation-page-actions">
        {workspace.scenarioId && drafts.current.has("custom") && <button className="creation-example-trigger" disabled={busy || adjustmentRunning} onClick={() => openScenario("custom")} type="button"><RotateCcw size={13} />返回我的需求</button>}
        {aiAdjustmentAction}
      </div>
    </div>
    <AnimatePresence mode="wait"><motion.div animate={{ opacity: 1, y: 0 }} aria-label={stageLabel} className={`creation-sheet${showDescribe ? " task-conversation-page is-starting" : ""}`} initial={reducedMotion ? false : { opacity: 0, y: 8 }} key={stageKey} onAnimationComplete={focusStage} ref={stageRef} role="region" tabIndex={-1} transition={{ duration: reducedMotion ? 0 : .18 }}>
      {!showDescribe && planningNotice && <p className="creation-planning-notice" role="status">{planningNotice}</p>}
      {showDescribe ? <div className="task-conversation-workspace"><div className="task-conversation-column">
        <section className="task-conversation-start"><header><h1>今天想推进什么？</h1><p>输入一个任务，或告诉 AgentDoor 你的目标</p></header></section>
        <div className="task-conversation-composer creation-request-panel">
          <motion.div className="creation-request-composer-transition" layoutId="creation-ai-composer" transition={{ duration: reducedMotion ? 0 : .22, ease: "easeInOut" }}>
            <AnimatedAgentChatInput
              allowAttachments={false}
              ariaLabel="需求描述"
              autoFocus={active}
              clearOnSend={false}
              disabled={busy}
              hint="Enter 发起 · Shift + Enter 换行"
              inputRef={requestRef}
              onChange={request => { setWorkspace(current => ({ ...current, request })); setError(""); }}
              onSend={() => { void generatePlan(); }}
              placeholder="告诉 AgentDoor 你想推进什么…"
              sendLabel={form ? "重新发起" : "发起"}
              value={workspace.request}
            />
          </motion.div>
          <div className="creation-request-actions"><span>先生成方案，确认后才创建</span>{form && <Button disabled={busy} onClick={() => { setWorkspace(current => ({ ...current, editingBrief: false })); setError(""); }} type="button" variant="ghost">返回现有方案</Button>}</div>
          {planningNotice && <p className="creation-planning-notice" role="status">{planningNotice}</p>}
          {form && <p className="creation-request-caution">重新生成会替换当前方案；生成失败时保留原方案。也可以通过“AI 帮你改”继续补充需求。</p>}
          {error && <p className="creation-stage-error" role="alert">{error}</p>}
          {creationAssistantRow}
        </div>
        {scenarioPicker}
      </div></div> : <>
        {creationAssistantRow}
        {displayStage === "clarify" && planning?.stage === "clarify" && currentClarificationQuestion && <section className="task-detail-hero-card creation-clarify-panel">
          <header className="creation-stage-heading"><span className="creation-stage-icon"><Lightbulb size={20} /></span><div><h1>{planning.questions.length === 2 ? "再明确两个关键信息" : planning.questions.length === 1 ? "再明确一个关键信息" : `再明确 ${planning.questions.length} 个关键信息`}（{clarificationStep + 1}/{planning.questions.length}）</h1><p>每次确认一个答案，AgentDoor 再继续规划。</p></div></header>
          <ClarificationStep answer={workspace.answers[currentClarificationQuestion.field]} disabled={busy} finalStep={clarificationStep === planning.questions.length - 1} onAnswer={value => selectClarificationAnswer(currentClarificationQuestion, value)} onContinue={() => submitClarificationAnswer(currentClarificationQuestion, workspace.answers[currentClarificationQuestion.field] ?? "")} onPrevious={previousClarificationStep} question={currentClarificationQuestion} />
          <p className="creation-stage-note">选择或填写答案后，点击下方按钮继续；期限与人选可以在方案中补充。</p>
          {error && <p className="creation-stage-error" role="alert">{error}</p>}
        </section>}
        {displayStage === "decision" && form?.candidate && <section className="task-detail-hero-card creation-decision">
          <header className="creation-stage-heading"><span className="creation-stage-icon"><GitBranch size={20} /></span><div><h1>{form.candidateKind === "parent" ? "这项工作，可以放进已有任务" : "先确认，是不是同一件事"}</h1><p>{form.candidateKind === "parent" ? "作为子任务将继承主任务目标；也可以独立规划。" : "请核对这项已有任务，确认关系后再继续。"}</p></div></header>
          <TaskCreationExistingTaskCard kind={form.candidateKind!} ownerName={members.find(member => member.id === form.candidate?.ownerId)?.name} reason={form.candidateReason ?? ""} tags={tags} task={form.candidate} />
          <div className="creation-decision-actions"><Button className="creation-primary" onClick={() => { if (form.candidateKind === "parent") resolveRelationship("attach"); else if (existingTasks.some(task => task.id === form.candidate?.id)) onOpenTask(form.candidate!.id); else setError("已有任务已不存在，需求已保留，请重新规划。"); }} size="lg" type="button">{form.candidateKind === "parent" ? "作为子任务继续" : "查看已有任务"}<ArrowRight size={15} /></Button><Button onClick={() => resolveRelationship("independent")} size="lg" type="button" variant="outline">仍然独立规划</Button></div>
          <p className="creation-stage-note">此处只确认归属，不会创建任务，也不会修改已有任务。</p>
          {error && <p className="creation-stage-error" role="alert">{error}</p>}
        </section>}
        {displayStage === "review" && form && <>
          <TaskCreationPlanEditor disabled={busy || adjustmentRunning} form={form} members={members} tags={tags} onChange={updateForm} onInviteMembers={onInviteMembers} onSubtaskDirtyChange={onSubtaskDirtyChange} />
          {hasUnsavedSubtasks && <p className="creation-error" role="status">{unsavedMessage}</p>}
          {adjustmentNotice && <p className="task-ai-inline-notice" role="status"><Check size={14} />{adjustmentNotice}</p>}
          <footer className="creation-confirm-bar">
            <div className="creation-confirm-copy"><span className="creation-confirm-icon"><Layers3 /></span><div><strong>{form.subtasks.length ? "1 个主任务 · " + form.subtasks.length + " 个子任务" : form.decision === "attach" ? "1 个子任务" : "1 个任务"}</strong><span>{unassignedTaskCount ? `${unassignedTaskCount} 个任务暂不分配负责人，可先创建` : "确认后加入任务列表"}</span></div></div>
            <div className="creation-confirm-actions">
              {unassignedTaskCount > 0 && onInviteMembers && <Button disabled={busy || adjustmentRunning} onClick={event => onInviteMembers(event.currentTarget)} size="lg" type="button" variant="outline"><UserPlus size={17} />邀请成员</Button>}
              <Button className="creation-primary" disabled={Boolean(validation || aiOpen || busy || adjustmentRunning || hasUnsavedSubtasks)} onClick={submit} size="lg" type="button">确认创建<Check size={17} /></Button>
            </div>
            {(error || validation) && <p className="creation-validation" role={error ? "alert" : "status"}>{error || validation}</p>}
          </footer>
        </>}
      </>}
    </motion.div></AnimatePresence>
    {aiScope && aiContext && <TaskAiAdjustmentPopover anchor={aiReturnFocus.current} compactCreation context={aiContext} draftSession={aiDraftSession} history={workspace.processes} onApply={applyAiAdjustment} onOpenChange={setAiOpen} onProgressChange={updateAdjustmentProgress} open={aiOpen && active} scope={aiScope} />}
  </section></LayoutGroup>;
}
