import { creationScenarioEnglish } from "../i18n/creationMock";
import { useCreationI18n } from "../i18n/creationMessages";
import { ArrowLeft, ArrowRight, Check, ChevronRight, GitBranch, Layers3, Lightbulb, PanelLeftOpen, RotateCcw, Sparkles, UserPlus } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { taskCreationScenarios, type TaskCreationScenarioId } from "../data/taskCreationScenarios";
import type { TagDefinition } from "../data/tagGroups";
import type { ExistingTaskCandidate } from "../lib/taskCreationScenario";
import type { TaskPlanDraft } from "../lib/taskAssistantProtocol";
import { toTaskPlanDraft, validateCreationForm, withCreationParticipantDefaults, type CreationForm } from "../lib/taskCreationForm";
import { reconcileCreationEffort } from "../lib/taskCreationEffort";
import { getCreationHierarchyDepth } from "../lib/taskCreationHierarchy";
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
import { TaskCreationSessionList } from "./TaskCreationSessionList";
import { creationHistoryKey, parseCreationSessions, restoreCreationSession, upsertCreationSession, type CreationSession, type CreationWorkspaceDraft, type TaskCreationParentContext } from "../lib/taskCreationSessions";
import { TaskAiAdjustButton, TaskAiAdjustmentPopover, useTaskAiAdjustmentDrafts } from "./TaskAiAdjustmentPopover";
import { Button } from "./ui/button";
import { Textarea } from "./ui/input";
import "../styles/task-heading.css";
import "../styles/task-creation-page.css";
import "../styles/task-ai-adjustment.css";
import "../styles/task-criteria-editor.css";
import "../styles/task-creation-subtask.css";
import "../styles/task-creation-sessions.css";

// Temporarily hide planning history while preserving saved drafts.
const CREATION_HISTORY_ENABLED = false;

type CreationResult = { createdCount: number; mainTaskId: string; taskTitles: string[] };
export type { TaskCreationParentContext } from "../lib/taskCreationSessions";
type Props = {
  active?: boolean;
  creationParent?: TaskCreationParentContext | null;
  currentUserId: string;
  teamId?: string;
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
  const { c, locale, localize } = useCreationI18n();
  const inputId = "creation-answer-" + question.field;
  const customAnswer = answer && !question.choices.includes(answer) ? answer : "";
  return <form className="creation-questions" onSubmit={event => { event.preventDefault(); if (!disabled && answer?.trim()) onContinue(); }}><section className="creation-question">
    <h2 id={inputId + "-title"}>{question.title}</h2>
    <div aria-label={question.title + c("suggestedOptions")} className="creation-answer-options">
      {question.choices.map(choice => <button aria-pressed={answer === choice} disabled={disabled} key={choice} onClick={() => onAnswer(choice)} type="button"><span>{choice}</span>{answer === choice && <Check aria-hidden="true" size={16} />}</button>)}
    </div>
    <div className="creation-custom-answer">
      <label htmlFor={inputId}>{c("custom")}</label>
      <Textarea disabled={disabled} id={inputId} onChange={event => onAnswer(event.target.value)} placeholder={question.placeholder} rows={1} value={customAnswer} />
    </div>
  </section>
    <footer className="creation-question-actions">
      <Button disabled={disabled} onClick={onPrevious} size="lg" type="button" variant="outline"><ArrowLeft size={15} />{c("previous")}</Button>
      <Button className="creation-primary" disabled={disabled || !answer?.trim()} size="lg" type="submit">{finalStep && <Sparkles size={15} />}{finalStep ? c("generatePlan") : c("next")}{!finalStep && <ArrowRight size={15} />}</Button>
    </footer>
  </form>;
}

export function TaskCreationPage({ active = true, creationParent: initialParent, currentUserId, teamId = "default", existingTasks, members, tags, onCreateTaskPlan, onCreateSubtask, onOpenTask, onCancel, onDraftStart, onInviteMembers, onPathSelect }: Props) {
  const { c, locale, localize } = useCreationI18n();
  const context = { currentUserId, existingTasks, members, tags: tags.map(t => t.name), currentDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()) };
  const [creationParent, setCreationParent] = useState(initialParent ?? null);
  const [workspace, setWorkspace] = useState<CreationWorkspaceDraft>(emptyWorkspaceDraft);
  const [clarificationStep, setClarificationStep] = useState(0);
  const storageKey = creationHistoryKey(currentUserId, teamId);
  const [loadedHistory] = useState(() => {
    try { return parseCreationSessions(localStorage.getItem(storageKey)); }
    catch { return { sessions: [] as CreationSession[], error: c("conversationHistoryIsUnavailableYouCanContinue") }; }
  });
  const [sessions, setSessions] = useState(loadedHistory.sessions);
  const sessionsRef = useRef(sessions);
  const [historyError, setHistoryError] = useState(loadedHistory.error);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const completedSession = useRef<CreationResult | undefined>(undefined);
  const historyId = useId();
  const historyToggle = useRef<HTMLButtonElement>(null);
  const scenarioSessionIds = useRef(new Map<string, string>());
  const saveSession = useCallback((session: CreationSession) => {
    const next = upsertCreationSession(sessionsRef.current, session);
    if (next === sessionsRef.current) return;
    sessionsRef.current = next;
    setSessions(next);
    if (loadedHistory.error) return;
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setHistoryError(""); }
    catch { setHistoryError(c("historyCouldNotBeSavedKeepThis")); }
  }, [storageKey, loadedHistory.error]);
  useEffect(() => {
    if (completedSession.current) return;
    saveSession({ id: sessionId, updatedAt: Date.now(), workspace, clarificationStep, parent: creationParent });
  }, [workspace, clarificationStep, creationParent, sessionId, saveSession]);
  const closeHistory = () => { setHistoryOpen(false); requestAnimationFrame(() => historyToggle.current?.focus()); };
  useEffect(() => {
    if (!CREATION_HISTORY_ENABLED || !historyOpen || !active) return;
    const frame = requestAnimationFrame(() => document.getElementById(historyId)?.querySelector<HTMLButtonElement>("button")?.focus());
    return () => cancelAnimationFrame(frame);
  }, [historyOpen, active, historyId]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [planningNotice, setPlanningNotice] = useState("");
  const [aiScope, setAiScope] = useState<TaskAiAdjustmentScope | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const aiDraftSession = useTaskAiAdjustmentDrafts();
  const [adjustmentNotice, setAdjustmentNotice] = useState("");
  const [dirtySubtasks, setDirtySubtasks] = useState<Record<string, boolean>>({});
  const hasUnsavedSubtasks = Object.values(dirtySubtasks).some(Boolean);
  const unsavedMessage = c("saveOrCancelYourPendingChangesBefore");
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
  const stageLabel = showDescribe ? c("describeYourRequest") : displayStage === "planning" ? c("organizingYourRequest") : displayStage === "clarify" ? c("clarifyKeyDetails") : displayStage === "decision" ? c("confirmTaskRelationship") : c("taskPlanDetails");
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
    setPlanningNotice(c("planningStoppedYourRequestAndPreviousPlan"));
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
    if (workspace.request.trim()) {
      drafts.current.set(workspace.scenarioId ?? "custom", workspace);
      scenarioSessionIds.current.set(workspace.scenarioId ?? "custom", sessionId);
    }
    const scenario = taskCreationScenarios.find(item => item.id === id);
    setSessionId(scenarioSessionIds.current.get(id) ?? crypto.randomUUID());
    completedSession.current = undefined;
    setWorkspace(drafts.current.get(id) ?? { ...emptyWorkspaceDraft(), request: scenario ? locale === "en" ? creationScenarioEnglish[scenario.id].prompt : scenario.prompt : "", scenarioId: scenario?.id });
    clearTransientState();
    requestRef.current?.focus();
  };
  const startAnother = () => {
    if (busy || adjustmentRunning) return;
    if (hasUnsavedSubtasks) { setError(unsavedMessage); return; }
    setWorkspace(emptyWorkspaceDraft());
    setCreationParent(initialParent ?? null);
    setSessionId(crypto.randomUUID()); completedSession.current = undefined;
    drafts.current.clear(); scenarioSessionIds.current.clear();
    clearTransientState();
    setHistoryOpen(false);
    focusedStage.current = "";
    requestAnimationFrame(() => requestRef.current?.focus());
  };
  const openSession = (session: CreationSession) => {
    if (busy || adjustmentRunning || hasUnsavedSubtasks) return;
    if (session.created) {
      if (!existingTasks.some(task => task.id === session.created!.mainTaskId)) {
        setHistoryError(c("theTaskLinkedToThisConversationIs")); return;
      }
      onOpenTask(session.created.mainTaskId); return;
    }
    if (session.id === sessionId) { closeHistory(); return; }
    const restored = restoreCreationSession(session);
    clearTransientState();
    for (const key of Object.keys(aiDraftSession[0])) aiDraftSession[1]({ type: "discard", key });
    drafts.current.clear(); scenarioSessionIds.current.clear();
    completedSession.current = undefined;
    planningRun.current = Math.max(planningRun.current, ...restored.workspace.processes.map(process => typeof process.id === "number" ? process.id : 0));
    setSessionId(restored.id); setWorkspace(restored.workspace);
    setCreationParent(restored.parent); setClarificationStep(restored.clarificationStep);
    setHistoryOpen(false); focusedStage.current = "";
    requestAnimationFrame(() => stageRef.current?.focus());
  };
  const updateForm = (next: CreationForm) => {
    if (busy || adjustmentRunning || planning?.stage !== "review") return;
    setWorkspace(current => ({ ...current, planning: { stage: "review", form: reconcileCreationEffort(planning.form, withCreationParticipantDefaults(next, currentUserId, planning.form)), summary: planning.summary } }));
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
        planTaskCreation(workspace.request, context, { scenarioId: workspace.scenarioId, answers: effectiveAnswers, locale }),
        creationParent,
      );
      const feedback = getCreationFeedback(next);
      const title = answers ? c("planWithAdditionalDetails") : workspace.processes.length ? c("regenerate") : c("initialGeneration");
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
        setError(c("pleaseClarifyTheFollowing") + next.questions.map(question => question.title).join(" "));
      }
    } catch (caught) {
      if (run === planningRun.current) {
        restorePlanningFocus.current = true;
        updateProcess(run, { status: "failed", outcome: "生成未完成，需求和原有方案已保留" });
        setError(caught instanceof Error ? caught.message : c("unableToGenerateAPlanYourRequest"));
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
        form.candidate?.name ?? form.candidate?.title ?? c("existingTask"),
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
    if (!aiContext || busy || planning?.stage !== "review") throw new Error(c("thisPlanCannotBeEditedRightNow"));
    if (planning.form.decision === "attach" && !existingTasks.some(task => task.id === planning.form.candidate?.id)) {
      throw new Error(c("theParentTaskNoLongerExistsConfirm"));
    }
    const next = withCreationParticipantDefaults(applyDraftTaskAiAdjustment(planning.form, aiContext, proposal), currentUserId, planning.form);
    setWorkspace(current => ({ ...current, planning: { stage: "review", form: reconcileCreationEffort(planning.form, next), summary: planning.summary } }));
    setAdjustmentNotice(c("changesAppliedToTheDraftTasksWill")); setError("");
  };
  const submit = () => {
    if (creating.current) return;
    if (hasUnsavedSubtasks) { setError(unsavedMessage); return; }
    if (!planning || planning.stage !== "review" || aiOpen || busy || adjustmentRunning) return;
    const form = planning.form;
    const invalid = validateCreationForm(form, members);
    if (invalid) { setError(invalid); return; }
    if (creationParent && !existingTasks.some(task => task.id === creationParent.parentTaskId)) {
      setError(c("theParentTaskNoLongerExistsYour")); return;
    }
    if (form.decision === "attach") {
      const parent = existingTasks.find(task => task.id === form.candidate?.id);
      if (!parent) { setError(c("theParentTaskNoLongerExistsYourLabel")); return; }
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
      completedSession.current = created;
      saveSession({ id: sessionId, updatedAt: Date.now(), workspace, clarificationStep, parent: creationParent, created });
      onOpenTask(created.mainTaskId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : c("creationFailedYourPlanWasPreservedPlease")); creating.current = false; }
  };

  const scenarioPicker = <div aria-label={c("quickStart")} className="animated-agent-suggestions">
    {taskCreationScenarios.map(scenario => {
      const selected = workspace.scenarioId === scenario.id && workspace.request.trim() === (locale === "en" ? creationScenarioEnglish[scenario.id].prompt : scenario.prompt);
      return <button aria-pressed={selected} disabled={busy || adjustmentRunning} key={scenario.id} onClick={() => openScenario(scenario.id)} type="button">
        <Sparkles aria-hidden="true" />{locale === "en" ? creationScenarioEnglish[scenario.id].label : scenario.label}
      </button>;
    })}
  </div>;
  const aiAdjustmentAction = !showDescribe
    ? <motion.div className="creation-ai-adjust-action" layoutId="creation-ai-composer" transition={{ duration: reducedMotion ? 0 : .22, ease: "easeInOut" }}>
      <TaskAiAdjustButton disabled={!form || planning?.stage !== "review" || busy || adjustmentRunning || hasUnsavedSubtasks || aiOpen} label={c("askAiToAdjustThePlan")} onClick={anchor => openAiAdjustment(aiScope ?? { kind: "task" }, anchor)} />
    </motion.div>
    : undefined;
  const cancelProcess = busy ? stopPlanning : adjustmentRunning ? stopAdjustment : undefined;
  const pageProcesses = workspace.processes.filter(process => process.status === "running" && process.kind !== "adjustment");
  const creationAssistantRow = pageProcesses.length
    ? <TaskCreationProcess onCancel={cancelProcess} processes={pageProcesses} />
    : null;

  return <div className={`creation-session-layout${CREATION_HISTORY_ENABLED && historyOpen ? " history-open" : ""}`}>
    {CREATION_HISTORY_ENABLED && historyOpen && <TaskCreationSessionList disabled={busy || adjustmentRunning || hasUnsavedSubtasks} error={localize(historyError)} id={historyId} onClose={closeHistory} onNew={startAnother} onSelect={openSession} selectedId={sessionId} sessions={sessions} />}
    <div className="creation-session-content"><LayoutGroup id="task-creation-ai-composer"><section className={`task-detail-view task-creation-page${showDescribe ? " creation-start-page" : ""}`} ref={pageRef}>
    <div className="creation-page-top">
      {CREATION_HISTORY_ENABLED && <Button aria-controls={historyOpen ? historyId : undefined} aria-expanded={historyOpen} aria-label={historyOpen ? c("hideHistory") : c("showHistory")} className="creation-session-toggle" onClick={() => historyOpen ? closeHistory() : setHistoryOpen(true)} ref={historyToggle} size="icon-sm" title={historyOpen ? c("hideHistory") : c("showHistory")} type="button" variant="ghost"><PanelLeftOpen aria-hidden="true" /></Button>}
      <nav aria-label={c("taskPath")} className="task-detail-path">
        {creationParent ? creationParent.pathItems.map((item, index) => <span key={item.id}>
          {index > 0 && <ChevronRight aria-hidden="true" size={12} />}
          <button onClick={() => onPathSelect?.(item.id)} type="button">{item.label}</button>
        </span>) : <>
          <span><button aria-label={c("backToNewTask")} onClick={startAnother} type="button">{c("tasks")}</button></span>
          {form?.decision === "attach" && form.candidate && <span><ChevronRight aria-hidden="true" size={12} /><button aria-label={c("openParentTask", { v0: form.candidate.name ?? form.candidate.title })} onClick={() => onOpenTask(form.candidate!.id)} type="button">{form.candidate.name ?? form.candidate.title}</button></span>}
        </>}
        <span><ChevronRight aria-hidden="true" size={12} /><em aria-current="page">{c("newTask")}</em></span>
      </nav>
      <div className="creation-page-actions">
        {historyError && !historyOpen && <span className="creation-session-save-warning" role="status">{localize(historyError)}</span>}
        {workspace.scenarioId && drafts.current.has("custom") && <button className="creation-example-trigger" disabled={busy || adjustmentRunning} onClick={() => openScenario("custom")} type="button"><RotateCcw size={13} />{c("backToMyRequest")}</button>}
        {aiAdjustmentAction}
      </div>
    </div>
    <AnimatePresence mode="wait"><motion.div animate={{ opacity: 1, y: 0 }} aria-label={stageLabel} className={`creation-sheet${showDescribe ? " task-conversation-page is-starting" : ""}`} initial={reducedMotion ? false : { opacity: 0, y: 8 }} key={stageKey} onAnimationComplete={focusStage} ref={stageRef} role="region" tabIndex={-1} transition={{ duration: reducedMotion ? 0 : .18 }}>
      {!showDescribe && planningNotice && <p className="creation-planning-notice" role="status">{localize(planningNotice)}</p>}
      {showDescribe ? <div className="task-conversation-workspace"><div className="task-conversation-column">
        <section className="task-conversation-start"><header><h1>{c("whatWouldYouLikeToWorkOn")}</h1><p>{c("agentdoorHelpsYouClarifyGoalsBreakDown")}</p></header></section>
        <div className="task-conversation-composer creation-request-panel">
          <motion.div className="creation-request-composer-transition" layoutId="creation-ai-composer" transition={{ duration: reducedMotion ? 0 : .22, ease: "easeInOut" }}>
            <AnimatedAgentChatInput
              allowAttachments={false}
              ariaLabel={c("taskRequest")}
              autoFocus={active}
              clearOnSend={false}
              disabled={busy}
              hint={c("enterToStartShiftEnterForA")}
              inputRef={requestRef}
              onChange={request => { setWorkspace(current => ({ ...current, request })); setError(""); }}
              onSend={() => { void generatePlan(); }}
              placeholder={c("tellAgentdoorWhatYouWantToWork")}
              sendLabel={form ? c("startAgain") : c("start")}
              value={workspace.request}
            />
          </motion.div>
          {form && <div className="creation-request-actions"><Button disabled={busy} onClick={() => { setWorkspace(current => ({ ...current, editingBrief: false })); setError(""); }} type="button" variant="ghost">{c("backToCurrentPlan")}</Button></div>}
          {planningNotice && <p className="creation-planning-notice" role="status">{localize(planningNotice)}</p>}
          {form && <p className="creation-request-caution">{c("generatingAgainReplacesTheCurrentPlanIf")}</p>}
          {error && <p className="creation-stage-error" role="alert">{localize(error)}</p>}
          {creationAssistantRow}
        </div>
        {scenarioPicker}
      </div></div> : <>
        {creationAssistantRow}
        {displayStage === "clarify" && planning?.stage === "clarify" && currentClarificationQuestion && <section className="task-detail-hero-card creation-clarify-panel">
          <header className="creation-stage-heading"><span className="creation-stage-icon"><Lightbulb size={20} /></span><div><h1>{planning.questions.length === 2 ? c("clarifyTwoKeyDetails") : planning.questions.length === 1 ? c("clarifyOneKeyDetail") : c("clarifyKeyDetailsLabel", { v0: planning.questions.length })}（{clarificationStep + 1}/{planning.questions.length}）</h1><p>{c("confirmOneAnswerAtATimeSo")}</p></div></header>
          <ClarificationStep answer={workspace.answers[currentClarificationQuestion.field]} disabled={busy} finalStep={clarificationStep === planning.questions.length - 1} onAnswer={value => selectClarificationAnswer(currentClarificationQuestion, value)} onContinue={() => submitClarificationAnswer(currentClarificationQuestion, workspace.answers[currentClarificationQuestion.field] ?? "")} onPrevious={previousClarificationStep} question={currentClarificationQuestion} />
          <p className="creation-stage-note">{c("chooseOrEnterAnAnswerThenContinue")}</p>
          {error && <p className="creation-stage-error" role="alert">{localize(error)}</p>}
        </section>}
        {displayStage === "decision" && form?.candidate && <section className="task-detail-hero-card creation-decision">
          <header className="creation-stage-heading"><span className="creation-stage-icon"><GitBranch size={20} /></span><div><h1>{form.candidateKind === "parent" ? c("thisWorkMayBelongToAnExisting") : c("firstCheckWhetherThisIsTheSame")}</h1><p>{form.candidateKind === "parent" ? c("createASubtaskWithItsOwnEditable") : c("reviewTheExistingTaskAndConfirmThe")}</p></div></header>
          <TaskCreationExistingTaskCard kind={form.candidateKind!} ownerName={members.find(member => member.id === form.candidate?.ownerId)?.name} reason={form.candidateReason ?? ""} tags={tags} task={form.candidate} />
          <div className="creation-decision-actions"><Button className="creation-primary" onClick={() => { if (form.candidateKind === "parent") resolveRelationship("attach"); else if (existingTasks.some(task => task.id === form.candidate?.id)) onOpenTask(form.candidate!.id); else setError(c("theExistingTaskIsUnavailableYourRequest")); }} size="lg" type="button">{form.candidateKind === "parent" ? c("continueAsASubtask") : c("viewExistingTask")}<ArrowRight size={15} /></Button><Button onClick={() => resolveRelationship("independent")} size="lg" type="button" variant="outline">{c("planIndependently")}</Button></div>
          <p className="creation-stage-note">{c("thisOnlyConfirmsTheParentRelationshipNo")}</p>
          {error && <p className="creation-stage-error" role="alert">{localize(error)}</p>}
        </section>}
        {displayStage === "review" && form && <>
          <TaskCreationPlanEditor disabled={busy || adjustmentRunning} form={form} members={members} tags={tags} onChange={updateForm} onInviteMembers={onInviteMembers} onSubtaskDirtyChange={onSubtaskDirtyChange} />
          {hasUnsavedSubtasks && <p className="creation-error" role="status">{unsavedMessage}</p>}
          {adjustmentNotice && <p className="task-ai-inline-notice" role="status"><Check size={14} />{localize(adjustmentNotice)}</p>}
          <footer className="creation-confirm-bar">
            <div className="creation-confirm-copy"><span className="creation-confirm-icon"><Layers3 /></span><div><strong>{getCreationHierarchyDepth(form) > 2 ? c("tasksInTotal", { v0: form.subtasks.length + 1 }) : form.subtasks.length ? c("1MainTask") + form.subtasks.length + c("subtasks") : form.decision === "attach" ? c("1Subtask") : c("1Task")}</strong><span>{getCreationHierarchyDepth(form) > 2 ? c("1MainTaskSubtasksAcrossAllLevels", { v0: form.subtasks.length }) : unassignedTaskCount ? c("tasksHaveNoOwnerYetYouCan", { v0: unassignedTaskCount }) : c("confirmToAddTasksToYourList")}</span></div></div>
            <div className="creation-confirm-actions">
              {unassignedTaskCount > 0 && onInviteMembers && <Button disabled={busy || adjustmentRunning} onClick={event => onInviteMembers(event.currentTarget)} size="lg" type="button" variant="outline"><UserPlus size={17} />{c("inviteMembers")}</Button>}
              <Button className="creation-primary" disabled={Boolean(validation || aiOpen || busy || adjustmentRunning || hasUnsavedSubtasks)} onClick={submit} size="lg" type="button">{c("confirmCreation")}<Check size={17} /></Button>
            </div>
            {(error || validation) && <p className="creation-validation" role={error ? "alert" : "status"}>{localize(error || validation)}</p>}
          </footer>
        </>}
      </>}
    </motion.div></AnimatePresence>
    {aiScope && aiContext && <TaskAiAdjustmentPopover anchor={aiReturnFocus.current} compactCreation context={aiContext} draftSession={aiDraftSession} history={workspace.processes} key={sessionId} onApply={applyAiAdjustment} onOpenChange={setAiOpen} onProgressChange={updateAdjustmentProgress} open={aiOpen && active} scope={aiScope} />}
  </section></LayoutGroup></div></div>;
}
