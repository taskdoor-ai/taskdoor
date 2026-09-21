import { ArrowRight, Check, ChevronRight, GitBranch, LoaderCircle, Plus, RotateCcw, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TagDefinition } from "../data/tagGroups";
import type { ExistingTaskCandidate } from "../lib/taskCreationScenario";
import type { TaskPlanDraft } from "../lib/taskAssistantProtocol";
import { toTaskPlanDraft, validateCreationForm, type CreationForm } from "../lib/taskCreationForm";
import { getLinearCreationStages } from "../lib/taskCreationLinearStages";
import { planTaskCreation, resolveCreationRelationship, type CreationPlanningResult } from "../lib/taskCreationPlanning";
import { AnimatedAgentChatInput } from "./AnimatedAgentChatInput";
import type { Member } from "./MemberSelector";
import { TaskCreationLinearSections } from "./TaskCreationLinearSections";
import { Button } from "./ui/button";
import { Textarea } from "./ui/input";

type CreationResult = { createdCount: number; mainTaskId: string; taskTitles: string[] };

export type TaskCreationLinearPageProps = {
  active?: boolean;
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
};

type LinearWorkspace = {
  request: string;
  planning: CreationPlanningResult | null;
  answers: { goal?: string; deliverable?: string };
  revealCount: number;
  status: "idle" | "planning" | "ready" | "stopped" | "failed";
};

const emptyWorkspace = (): LinearWorkspace => ({ request: "", planning: null, answers: {}, revealCount: 0, status: "idle" });

export function TaskCreationLinearPage({
  active = true,
  currentUserId,
  existingTasks,
  members,
  tags,
  onCreateTaskPlan,
  onCreateSubtask,
  onOpenTask,
  onCancel,
  onDraftStart,
  onInviteMembers,
}: TaskCreationLinearPageProps) {
  const [workspace, setWorkspace] = useState<LinearWorkspace>(emptyWorkspace);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreationResult | null>(null);
  const runRef = useRef(0);
  const creatingRef = useRef(false);
  const requestRef = useRef<HTMLTextAreaElement>(null);
  const context = {
    currentUserId,
    existingTasks,
    members,
    tags: tags.map(tag => tag.name),
    currentDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()),
  };
  const form = workspace.planning && (workspace.planning.stage === "review" || workspace.planning.stage === "decision") ? workspace.planning.form : null;
  const stages = form ? getLinearCreationStages(form) : [];
  const currentStage = stages[workspace.revealCount];
  const validation = form ? validateCreationForm(form, members) : null;

  useEffect(() => () => { runRef.current += 1; }, []);
  useEffect(() => {
    if (active || workspace.status !== "planning") return;
    runRef.current += 1;
    setWorkspace(current => ({ ...current, status: "stopped" }));
  }, [active, workspace.status]);

  const revealForm = async (nextForm: CreationForm, startAt = 0) => {
    const run = ++runRef.current;
    const total = getLinearCreationStages(nextForm).length;
    setWorkspace(current => ({ ...current, planning: { stage: "review", form: nextForm, summary: "候选方案已按步骤整理。" }, revealCount: startAt, status: "planning" }));
    for (let count = startAt + 1; count <= total; count += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 520));
      if (run !== runRef.current) return;
      setWorkspace(current => ({ ...current, revealCount: count }));
    }
    if (run === runRef.current) setWorkspace(current => ({ ...current, status: "ready" }));
  };

  const generatePlan = async (answers = workspace.answers) => {
    if (!workspace.request.trim() || workspace.status === "planning") return;
    setError("");
    setResult(null);
    onDraftStart?.();
    const scenarioId = workspace.planning?.stage === "clarify" ? workspace.planning.scenarioId : undefined;
    try {
      const next = planTaskCreation(workspace.request, context, { scenarioId, answers });
      if (next.stage === "unavailable") {
        setError(next.message);
        setWorkspace(current => ({ ...current, status: "failed" }));
        return;
      }
      if (next.stage === "clarify" || next.stage === "decision") {
        setWorkspace(current => ({ ...current, planning: next, status: "ready", revealCount: 0 }));
        return;
      }
      await revealForm(next.form);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "暂时无法生成方案，原始需求和已有内容均已保留。");
      setWorkspace(current => ({ ...current, status: "failed" }));
    }
  };

  const stopGeneration = () => {
    runRef.current += 1;
    setWorkspace(current => ({ ...current, status: "stopped" }));
  };

  const resolveRelationship = async (decision: "attach" | "independent") => {
    if (!form) return;
    const next = resolveCreationRelationship(form, decision, context);
    if ("error" in next) { setError(next.error); return; }
    setError("");
    await revealForm(next.form);
  };

  const updateForm = (nextForm: CreationForm) => {
    if (result || workspace.status === "planning") return;
    setWorkspace(current => ({ ...current, planning: { stage: "review", form: nextForm, summary: "候选方案已修改。" }, revealCount: getLinearCreationStages(nextForm).length }));
    setError("");
  };

  const submit = () => {
    if (!form || result || creatingRef.current || workspace.status === "planning") return;
    const invalid = validateCreationForm(form, members);
    if (invalid) { setError(invalid); return; }
    if (form.decision === "attach" && form.candidate) {
      const parent = existingTasks.find(task => task.id === form.candidate?.id);
      if (!parent) {
        setError("已有主任务已变化，请重新确认任务归属后再创建。");
        return;
      }
    }
    creatingRef.current = true;
    try {
      const plan = toTaskPlanDraft(form);
      const created = form.decision === "attach" && form.candidate ? onCreateSubtask(form.candidate.id, plan) : onCreateTaskPlan(plan);
      setResult(created);
      setError("");
    } catch (caught) {
      creatingRef.current = false;
      setError(caught instanceof Error ? caught.message : "创建未完成，当前方案已保留，请重试。");
    }
  };

  const startAnother = () => {
    runRef.current += 1;
    creatingRef.current = false;
    setWorkspace(emptyWorkspace());
    setError("");
    setResult(null);
    onDraftStart?.();
  };

  const planning = workspace.planning;
  return <section aria-label="分步创建任务" className="task-detail-view task-creation-linear-page">
    <div className="creation-page-top">
      <nav aria-label="任务路径" className="task-detail-path"><span><button onClick={onCancel} type="button">任务</button></span><span><ChevronRight aria-hidden="true" size={12} /><em aria-current="page">分步创建</em></span></nav>
    </div>
    {workspace.status === "idle" ? <div className="linear-creation-start">
      <header><span>从一张白纸开始</span><h1>先说清楚，想推进什么</h1><p>TaskDoor 会依次整理目标与标准、寻找参与者，再判断是否需要拆分。</p></header>
      <AnimatedAgentChatInput
        allowAttachments={false}
        ariaLabel="需求描述"
        autoFocus={active}
        clearOnSend={false}
        hint="Enter 开始拆解 · Shift + Enter 换行"
        inputRef={requestRef}
        onChange={request => { setWorkspace(current => ({ ...current, request })); setError(""); }}
        onSend={() => { void generatePlan(); }}
        placeholder="描述你想推进的事情…"
        sendLabel="开始拆解"
        value={workspace.request}
      />
      <p className="linear-creation-start-note">内容会一步步出现，确认前不会创建或指派任务。</p>
      {error && <div className="linear-creation-inline-error" role="alert"><p>{error}</p><Button onClick={() => void generatePlan()} size="sm" type="button" variant="outline"><RotateCcw aria-hidden="true" size={14} />重试</Button></div>}
    </div> : <div className="linear-creation-flow">
      <section className="linear-creation-request">
        <div><small>原始需求</small><p>{workspace.request}</p></div>
        {!result && <Button disabled={workspace.status === "planning"} onClick={() => { runRef.current += 1; setWorkspace(current => ({ ...current, status: "idle" })); setError(""); requestAnimationFrame(() => requestRef.current?.focus()); }} size="sm" type="button" variant="ghost">修改需求</Button>}
      </section>

      {planning?.stage === "clarify" && <section className="linear-creation-interruption" aria-labelledby="linear-clarify-title">
        <header><span>01</span><div><h2 id="linear-clarify-title">先补充关键信息</h2><small>这些答案会改变目标和验收标准</small></div></header>
        <div className="linear-creation-questions">{planning.questions.map(question => <label key={question.field}><span>{question.title}</span><div>{question.choices.map(choice => <button aria-pressed={workspace.answers[question.field] === choice} className="linear-creation-answer" key={choice} onClick={() => setWorkspace(current => ({ ...current, answers: { ...current.answers, [question.field]: choice } }))} type="button">{choice}</button>)}</div><Textarea onChange={event => setWorkspace(current => ({ ...current, answers: { ...current.answers, [question.field]: event.target.value } }))} placeholder={question.placeholder} rows={2} value={workspace.answers[question.field] ?? ""} /></label>)}</div>
        <Button className="creation-primary" disabled={planning.questions.some(question => !workspace.answers[question.field]?.trim())} onClick={() => void generatePlan(workspace.answers)} type="button"><Sparkles aria-hidden="true" size={15} />继续拆解</Button>
      </section>}

      {planning?.stage === "decision" && form?.candidate && <section className="linear-creation-interruption" aria-labelledby="linear-relationship-title">
        <header><span>01</span><div><h2 id="linear-relationship-title">确认任务归属</h2><small>这里只判断关系，不修改已有任务</small></div></header>
        <div className="linear-creation-relationship"><GitBranch aria-hidden="true" size={18} /><div><strong>{form.candidate.name ?? form.candidate.title}</strong><p>{form.candidateReason}</p></div></div>
        <div className="linear-creation-decision-actions">{form.candidateKind === "parent" && <Button className="creation-primary" onClick={() => void resolveRelationship("attach")} type="button">作为已有任务的子任务<ArrowRight aria-hidden="true" size={15} /></Button>}<Button onClick={() => void resolveRelationship("independent")} type="button" variant="outline">独立创建</Button>{form.candidateKind === "similar" && <Button onClick={() => onOpenTask(form.candidate!.id)} type="button" variant="ghost">查看已有任务</Button>}</div>
      </section>}

      {form && planning?.stage === "review" && <TaskCreationLinearSections disabled={workspace.status === "planning" || Boolean(result)} form={form} members={members} onChange={updateForm} onInviteMembers={onInviteMembers} revealCount={workspace.revealCount} tags={tags} />}

      {workspace.status === "planning" && <div aria-live="polite" className="linear-creation-running" role="status"><LoaderCircle aria-hidden="true" /><div><strong>{currentStage ? `正在生成：${currentStage.label}` : "正在整理任务"}</strong><span>已完成的内容会保留在上方</span></div><Button aria-label="停止生成" onClick={stopGeneration} size="sm" type="button" variant="ghost"><Square aria-hidden="true" size={12} />停止生成</Button></div>}

      {(workspace.status === "stopped" || workspace.status === "failed") && <div className="linear-creation-inline-error" role={workspace.status === "failed" ? "alert" : "status"}><div><strong>{workspace.status === "stopped" ? "生成已停止" : "这一步没有完成"}</strong><p>{error || "已保留原始需求和上方生成内容。"}</p></div>{form ? <Button onClick={() => void revealForm(form, workspace.revealCount)} size="sm" type="button" variant="outline"><RotateCcw aria-hidden="true" size={14} />继续生成</Button> : <Button onClick={() => void generatePlan()} size="sm" type="button" variant="outline"><RotateCcw aria-hidden="true" size={14} />重试</Button>}</div>}

      {form && planning?.stage === "review" && workspace.status !== "planning" && <footer className="linear-creation-confirm">
        <div><strong>{result ? `已创建 ${result.createdCount} 个任务` : form.subtasks.length ? `1 个主任务 · ${form.subtasks.length} 个子任务` : form.decision === "attach" ? "1 个子任务" : "1 个任务"}</strong><span>{result ? "任务已经加入列表" : "确认后才会创建；人选仍待成员接受"}</span></div>
        <div>{result && <Button onClick={startAnother} type="button" variant="ghost"><Plus aria-hidden="true" size={14} />继续创建</Button>}<Button className="creation-primary" disabled={!result && Boolean(validation || workspace.status === "stopped" || workspace.status === "failed")} onClick={() => result ? onOpenTask(result.mainTaskId) : submit()} type="button">{result ? "查看任务" : "确认创建"}{result ? <ArrowRight aria-hidden="true" size={16} /> : <Check aria-hidden="true" size={16} />}</Button></div>
        {!result && (error || validation) && <p role={error ? "alert" : "status"}>{error || validation}</p>}
      </footer>}
    </div>}
  </section>;
}
