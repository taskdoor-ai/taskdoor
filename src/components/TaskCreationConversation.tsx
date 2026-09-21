import { AlertTriangle, ArrowRight, CheckCircle2, GitBranch, History, ListTree, PanelLeftClose, PanelLeftOpen, Plus, RotateCcw, Sparkles, Target, UserRoundCheck, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { taskCreationScenarios, type TaskCreationScenarioDefinition } from "../data/taskCreationScenarios";
import type { TagDefinition } from "../data/tagGroups";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { createMockTaskAssistantResponse, createMockTaskAssistantResponseForDraft, requestMockTaskAssistant } from "../lib/mockTaskAssistant";
import { persistConversationList } from "../lib/privateConversationPersistence";
import { buildTaskCreationConversationRecord, restoreTaskCreationConversationState } from "../lib/taskCreationConversationState";
import { advanceTaskCreationScenario, startTaskCreationScenario, type ExistingTaskCandidate, type ScenarioChoice, type ScenarioContext, type ScenarioSession, type ScenarioTransition } from "../lib/taskCreationScenario";
import type { TaskAssistantApiError, TaskAssistantRequest, TaskAssistantResponse, TaskDraft, TaskPlanDraft } from "../lib/taskAssistantProtocol";
import { AIMessage } from "./AIMessage";
import { AnimatedAgentChatInput } from "./AnimatedAgentChatInput";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { MemberSelector, type Member } from "./MemberSelector";
import { TagBadge } from "./TagBadge";
import { TagPicker } from "./TagPicker";
import { TaskDependencyPicker, type TaskDependencyOption } from "./TaskDependencyPicker";
import { TaskDueDatePicker } from "./TaskDueDatePicker";
import { TaskCreationChoiceCards } from "./TaskCreationChoiceCards";
import { TaskCreationExistingTaskCard } from "./TaskCreationExistingTaskCard";
import { TaskIcon } from "./TaskIcon";
import { AgentWorkflow, type AgentPhase, type ToolDefinition } from "./ui/ai-agent-response";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Confetti } from "./ui/motion-confetti";

export type TaskCreationResult = {
  createdCount: number;
  mainTaskId: string;
  taskTitles: string[];
};

export type ExistingTaskView = ExistingTaskCandidate & {
  name: string;
  ownerId: string;
  status: string;
};

type TaskCreationConversationProps = {
  currentUserId: string;
  existingTasks: ExistingTaskView[];
  members: Member[];
  onCreateTaskPlan: (draft: TaskPlanDraft) => TaskCreationResult;
  onCreateSubtask: (parentTaskId: string, draft: TaskPlanDraft) => TaskCreationResult;
  onOpenTask: (taskId: string) => void;
  tags: TagDefinition[];
};

type ConversationMessage = {
  content: string;
  createdAt: string;
  id: string;
  role: "assistant" | "user";
  scenarioCandidate?: {
    kind: "similar" | "parent";
    reason: string;
    task: ExistingTaskCandidate;
  };
  scenarioChoices?: ScenarioChoice[];
  scenarioChoiceSubmitted?: boolean;
};

type PrivateConversation = {
  createdPlan: TaskCreationResult | null;
  id: string;
  messages: ConversationMessage[];
  output: TaskAssistantResponse | null;
  pendingParentTaskId?: string;
  title: string;
  updatedAt: string;
};

type PendingScenarioAnalysis = {
  baseMessages: ConversationMessage[];
  conversationId: string;
  delayMs: number;
  transition: ScenarioTransition;
};

const conversationStorageKey = (userId: string) => `agentdoor-private-conversations-v1:${userId}`;
const loadPrivateConversations = (userId: string): PrivateConversation[] => {
  try {
    const stored = localStorage.getItem(conversationStorageKey(userId));
    return stored ? JSON.parse(stored) as PrivateConversation[] : [];
  } catch {
    return [];
  }
};
const privateConversationTitle = (messages: ConversationMessage[]) => {
  const firstPrompt = messages.find((message) => message.role === "user")?.content.trim() || "新对话";
  return firstPrompt.length > 24 ? `${firstPrompt.slice(0, 24)}…` : firstPrompt;
};

const expectedMockSubtaskCount = (content: string) => {
  if (/筛选适合新品防晒衣的抖音达人/.test(content)) return 2;
  if (/拆分直播、投流与数据复盘计划/.test(content)) return 3;
  if (/检查素材宣称与达人合同合规/.test(content)) return 2;
  if (/达人.*脚本.*直播.*库存.*投流.*数据.*合规/i.test(content)) return 7;
  return 0;
};
type TaskCreationWorkflowContext = {
  members: Member[];
  request: TaskAssistantRequest | null;
  response: TaskAssistantResponse | null;
  subtaskCount: number;
};

const concise = (value: string, maxLength = 120) => value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const taskCreationWorkflowFor = ({ members, request, response, subtaskCount }: TaskCreationWorkflowContext): AgentPhase[] => {
  const draft = response?.draft;
  const dependencies = draft?.dependencies ?? [];
  const dependentSubtaskCount = new Set(dependencies.map(({ subtaskIndex }) => subtaskIndex)).size;
  const parallelStartCount = Math.max(0, subtaskCount - dependentSubtaskCount);
  const memberById = new Map(members.map((member) => [member.id, member]));
  const latestRequest = request?.messages.filter((message) => message.role === "user").at(-1)?.content ?? "正在读取任务描述";
  const targetDetails = draft
    ? [
      { text: `任务目标：${concise(draft.mainTask.goal)}` },
      { text: draft.mainTask.endDate ? `截止时间：${draft.mainTask.endDate}` : "截止时间：当前未设置" },
    ]
    : [{ text: `正在提取：${concise(latestRequest)}` }];
  const selectedMembers = response?.peopleRecommendations
    .map((recommendation) => memberById.get(recommendation.memberId))
    .filter((member): member is Member => Boolean(member)) ?? [];
  const teamDetails = [
    { text: `已对照 ${members.length} 位成员的人员责任、当前任务和近期经验` },
    ...(selectedMembers.length ? selectedMembers : members.slice(0, 3)).slice(0, 4).map((member) => ({
      text: `${member.name}：${member.currentWork?.[0] ? `当前负责“${member.currentWork[0]}”` : "当前任务待同步"}；${member.recentActivity || "近期经验待补充"}`,
    })),
  ];
  const peopleDetails = response?.peopleRecommendations.length
    ? response.peopleRecommendations.map((recommendation) => ({
      text: `${memberById.get(recommendation.memberId)?.name ?? recommendation.memberId}：${concise(recommendation.reason, 180)}`,
    }))
    : [{ text: `正在从 ${members.length} 位成员中匹配与任务责任、当前工作和近期经验最合适的人员` }];
  const structureDetails = draft
    ? subtaskCount === 0
      ? [{ text: "任务目标与交付集中，保留为单任务，不做无必要拆分" }]
      : [
        { text: `按 ${[...new Set(draft.subtasks.flatMap((task) => task.labels))].filter(Boolean).join("、") || "交付领域"}拆分子任务` },
        { text: `${parallelStartCount} 个子任务可并行启动，${dependentSubtaskCount} 个子任务设置了前置依赖` },
      ]
    : [{ text: `正在根据交付边界组织 1 个主任务和 ${subtaskCount} 个子任务` }];

  return [{
  trace: [
    {
      durationSeconds: 3,
      sentences: [
        "先分析任务要达成的目标、时间边界与可验证交付物。",
        "再查看团队历史任务、人员责任、当前工作与近期经验。",
        "据此匹配合适人员，并组织主任务、子任务与依赖关系。",
      ],
      type: "reasoning",
    },
    {
      details: targetDetails,
      primary: "分析任务目标",
      secondary: draft?.mainTask.title || "目标与交付",
      toolName: "target-analysis",
      type: "tool",
    },
    {
      details: teamDetails,
      primary: "分析团队情况",
      secondary: `${members.length} 位成员`,
      toolName: "team-context",
      type: "tool",
    },
    {
      details: peopleDetails,
      primary: "匹配合适人员",
      secondary: response ? `${response.peopleRecommendations.length} 人` : `${members.length} 位候选`,
      toolName: "people-match",
      type: "tool",
    },
    {
      details: structureDetails,
      primary: "生成任务结构",
      secondary: `1 个主任务 · ${subtaskCount} 个子任务`,
      toolName: "task-structure",
      type: "tool",
    },
  ],
  }];
};
const taskCreationTools: Record<string, ToolDefinition> = {
  "target-analysis": { icon: Target, iconClassName: "agent-workflow-icon-target", label: "分析任务目标", name: "target-analysis" },
  "team-context": { icon: History, iconClassName: "agent-workflow-icon-context", label: "分析团队情况", name: "team-context" },
  "people-match": { icon: UserRoundCheck, iconClassName: "agent-workflow-icon-team", label: "匹配合适人员", name: "people-match" },
  "task-structure": { icon: ListTree, iconClassName: "agent-workflow-icon-structure", label: "生成任务结构", name: "task-structure" },
};
const messageTimeFormatter = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", hour12: false, minute: "2-digit" });

type TaskVisual = { iconName: TaskIconName; iconTone: TaskIconTone };
const subtaskVisuals: TaskVisual[] = [
  { iconName: "briefcase", iconTone: "pink" },
  { iconName: "sparkles", iconTone: "purple" },
  { iconName: "flag", iconTone: "red" },
  { iconName: "list-todo", iconTone: "cyan" },
  { iconName: "target", iconTone: "amber" },
  { iconName: "chart", iconTone: "blue" },
  { iconName: "file-check", iconTone: "green" },
];
const taskVisualFor = (task: TaskDraft, index = 0, isMainTask = false): TaskVisual => ({
  iconName: task.iconName ?? (isMainTask ? "target" : subtaskVisuals[index % subtaskVisuals.length].iconName),
  iconTone: task.iconTone ?? (isMainTask ? "blue" : subtaskVisuals[index % subtaskVisuals.length].iconTone),
});

const taskIsValid = (task: TaskDraft) => Boolean(
  task.title.trim()
  && task.goal.trim(),
);

type TaskDraftEditorProps = {
  attributesFirst?: boolean;
  draft: TaskDraft;
  members: Member[];
  onChange: (draft: TaskDraft) => void;
  showOwner?: boolean;
  showParticipants?: boolean;
  tags: TagDefinition[];
};

function TaskDraftEditor({ attributesFirst = false, draft, members, onChange, showOwner = true, showParticipants = true, tags }: TaskDraftEditorProps) {
  const availableParticipants = members.filter((member) => member.id !== draft.ownerId);
  const selectedTags: TagDefinition[] = draft.labels.map(name => tags.find(tag => tag.name === name) ?? { id: name, name, color: "gray", icon: "tag" });
  const update = (changes: Partial<TaskDraft>) => onChange({ ...draft, ...changes });
  const attributes = <div className={`task-draft-attribute-row${showOwner ? "" : " without-owner"}`}>
    {showOwner && <div className="task-draft-field is-owner"><span>负责人</span><MemberSelector allowUnassigned hideHeader hideSelectedName label="负责人" max={1} min={0} members={members} onChange={([ownerId = ""]) => update({ ownerId, participantIds: draft.participantIds.filter((id) => id !== ownerId) })} selected={draft.ownerId ? [draft.ownerId] : []} showInvitationStatus={false} /></div>}
    <div className="task-draft-field is-tags"><span>标签</span><div className="task-draft-tags">{selectedTags.map((tag) => <TagBadge key={tag.id} onRemove={() => update({ labels: draft.labels.filter((name) => name !== tag.name) })} size="sm" tag={tag} />)}<TagPicker onChange={(labels) => update({ labels })} selected={draft.labels} tags={tags} /></div></div>
    <div className="task-draft-field is-due"><TaskDueDatePicker initialValue={draft.endDate} key={draft.endDate} label="截止时间" onChange={(endDate) => update({ endDate, startDate: "" })} /></div>
  </div>;

  return <div className="task-draft-grid">
    {attributesFirst && attributes}
    <label className="task-draft-field task-draft-field-wide"><span>任务名称</span><Input onChange={(event) => update({ title: event.target.value })} value={draft.title} /></label>
    <label className="task-draft-field task-draft-field-wide"><span>任务目标</span><Textarea onChange={(event) => update({ goal: event.target.value })} value={draft.goal} /></label>
    {!attributesFirst && attributes}
    {showParticipants && <div className="task-draft-field task-draft-field-wide"><span>参与人</span><MemberSelector displayMax={4} hideHeader hideSelectedName label="参与人" members={availableParticipants} onChange={(participantIds) => update({ participantIds })} selected={draft.participantIds} showInvitationStatus={false} stacked /></div>}
  </div>;
}

type TaskPlanPanelProps = {
  draft: TaskPlanDraft;
  memberById: Record<string, Member>;
  members: Member[];
  onChange: (draft: TaskPlanDraft) => void;
  onClose: () => void;
  tags: TagDefinition[];
};

const wouldCreateDependencyCycle = (draft: TaskPlanDraft, subtaskIndex: number, candidateIndex: number) => {
  const dependencyMap = new Map((draft.dependencies ?? []).map((dependency) => [dependency.subtaskIndex, dependency.dependsOnSubtaskIndexes]));
  const visited = new Set<number>();
  const reachesCurrentTask = (index: number): boolean => {
    if (index === subtaskIndex) return true;
    if (visited.has(index)) return false;
    visited.add(index);
    return (dependencyMap.get(index) ?? []).some(reachesCurrentTask);
  };
  return reachesCurrentTask(candidateIndex);
};

function TaskPlanPanel({ draft, memberById, members, onChange, onClose, tags }: TaskPlanPanelProps) {
  const [openSubtasks, setOpenSubtasks] = useState<string[]>([]);
  const mainVisual = taskVisualFor(draft.mainTask, 0, true);
  const mainOwner = memberById[draft.mainTask.ownerId];
  const mainTaskTags: TagDefinition[] = draft.mainTask.labels.map(name => tags.find(tag => tag.name === name) ?? { id: name, name, color: "gray", icon: "tag" });
  const dependentSubtaskCount = new Set((draft.dependencies ?? []).map(({ subtaskIndex }) => subtaskIndex)).size;
  const parallelStartCount = Math.max(0, draft.subtasks.length - dependentSubtaskCount);
  const updateMainTask = (changes: Partial<TaskDraft>) => onChange({ ...draft, mainTask: { ...draft.mainTask, ...changes } });
  const addSubtask = () => {
    const nextIndex = draft.subtasks.length;
    const nextValue = `subtask-${nextIndex}`;
    const subtask: TaskDraft = {
      endDate: draft.mainTask.endDate,
      goal: draft.mainTask.goal,
      labels: [...draft.mainTask.labels],
      ownerId: "",
      participantIds: [],
      startDate: draft.mainTask.startDate,
      title: "",
    };
    onChange({ ...draft, subtasks: [...draft.subtasks, subtask] });
    setOpenSubtasks((current) => [...current, nextValue]);
  };

  return <>
    <button aria-label="关闭任务详情" className="task-plan-scrim" onClick={onClose} type="button" />
    <aside aria-label="任务详情" className="task-plan-panel is-open" data-tone={mainVisual.iconTone}>
      <header className="task-plan-panel-hero" data-tone={mainVisual.iconTone}>
        <div className="task-plan-panel-topline">
          <div className="task-plan-panel-kicker"><span>主任务</span></div>
          <div className="task-plan-panel-controls">
            <button aria-label="关闭任务详情" className="task-plan-panel-close" onClick={onClose} type="button"><X aria-hidden="true" /></button>
          </div>
        </div>
        <div className="task-plan-panel-summary">
            <div className="task-plan-panel-main-identity">
              <TaskIcon iconName={mainVisual.iconName} size="lg" tone={mainVisual.iconTone} />
              <div>
                <Input aria-label="任务名称" className="task-plan-panel-title-input" onChange={(event) => updateMainTask({ title: event.target.value })} placeholder="待补充任务名称" value={draft.mainTask.title} />
                <Textarea aria-label="任务目标" className="task-plan-panel-goal-input" onChange={(event) => updateMainTask({ goal: event.target.value })} placeholder="补充清晰目标，明确任务需要达成的结果。" rows={2} value={draft.mainTask.goal} />
              </div>
            </div>
            <div className="task-plan-panel-overview-strip">
              <div className="task-plan-panel-owner">
                <small>负责人</small>
                <MemberSelector allowUnassigned hideHeader hideSelectedName label="负责人" max={1} members={members} min={0} onChange={([ownerId = ""]) => updateMainTask({ ownerId, participantIds: draft.mainTask.participantIds.filter((id) => id !== ownerId) })} selected={mainOwner ? [mainOwner.id] : []} showInvitationStatus={false} />
              </div>
              <div className="task-plan-panel-participant-summary">
                <small>参与人</small>
                <MemberSelector displayMax={4} hideHeader hideSelectedName label="参与人" members={members.filter((member) => member.id !== draft.mainTask.ownerId)} onChange={(participantIds) => updateMainTask({ participantIds })} selected={draft.mainTask.participantIds} showInvitationStatus={false} stacked />
              </div>
              <div className="task-plan-panel-tags"><small>标签</small><div>{mainTaskTags.slice(0, 1).map((tag) => <TagBadge key={tag.id} onRemove={() => updateMainTask({ labels: draft.mainTask.labels.filter((name) => name !== tag.name) })} size="xs" tag={tag} />)}{mainTaskTags.length > 1 && <em>+{mainTaskTags.length - 1}</em>}<TagPicker onChange={(labels) => updateMainTask({ labels })} selected={draft.mainTask.labels} tags={tags} /></div></div>
              <div className="is-due"><TaskDueDatePicker initialValue={draft.mainTask.endDate} key={`main:${draft.mainTask.endDate}`} label="截止时间" onChange={(endDate) => updateMainTask({ endDate, startDate: "" })} /></div>
            </div>
          </div>
      </header>

      <div className="task-plan-panel-body">
        <section className="task-subtask-overview">
          <header><h3 className="task-plan-panel-kicker task-subtask-kicker">子任务<span>({draft.subtasks.length})</span></h3></header>
          {draft.subtasks.length > 0 ? <>
          <p className="task-subtask-note">人员已结合团队责任与相关经验完成匹配。{parallelStartCount} 个子任务可并行启动，{dependentSubtaskCount} 个存在前置依赖。列表顺序不代表执行顺序。</p>
          <Accordion className="task-subtask-list" onValueChange={setOpenSubtasks} type="multiple" value={openSubtasks}>
            {draft.subtasks.map((task, index) => {
              const taskVisual = taskVisualFor(task, index);
              const owner = memberById[task.ownerId];
              const dependsOnSubtaskIndexes = draft.dependencies?.find((dependency) => dependency.subtaskIndex === index)?.dependsOnSubtaskIndexes ?? [];
              const dependencyTitles = dependsOnSubtaskIndexes.map((dependencyIndex) => draft.subtasks[dependencyIndex]?.title).filter(Boolean) as string[];
              const dependencySummary = dependencyTitles.length > 2
                ? `${dependencyTitles.slice(0, 2).join("、")}等 ${dependencyTitles.length} 项`
                : dependencyTitles.join("、");
              const dependencyOptions: TaskDependencyOption[] = draft.subtasks
                .map((candidate, candidateIndex) => ({
                  disabled: !dependsOnSubtaskIndexes.includes(candidateIndex) && wouldCreateDependencyCycle(draft, index, candidateIndex),
                  disabledReason: "会形成循环依赖",
                  index: candidateIndex,
                  title: candidate.title || `子任务 ${candidateIndex + 1}`,
                }))
                .filter((option) => option.index !== index);
              return <AccordionItem className="task-subtask" data-tone={taskVisual.iconTone} key={`subtask-${index}`} value={`subtask-${index}`}>
                <AccordionTrigger className="task-subtask-trigger">
                  <TaskIcon iconName={taskVisual.iconName} size="lg" tone={taskVisual.iconTone} />
                  <span className="task-subtask-copy">
                    <strong>{task.title || "待补充子任务名称"}</strong>
                    <small>{task.goal || "补充这个子任务的交付目标"}</small>
                    <span className={`task-subtask-dependency${dependencyTitles.length ? " has-prerequisite" : " is-parallel"}`} title={dependencyTitles.length ? `需等待：${dependencyTitles.join("、")}` : "没有前置依赖，可与其他任务并行推进"}>
                      <GitBranch aria-hidden="true" />
                      <b>{dependencyTitles.length ? "需等待" : "无前置依赖"}</b>
                      {dependencyTitles.length > 0 && <em>{dependencySummary}</em>}
                    </span>
                  </span>
                </AccordionTrigger>
                <div className="task-subtask-owner-control" onClick={(event) => event.stopPropagation()}>
                  <MemberSelector allowUnassigned hideHeader hideSelectedName label={`${task.title || `子任务 ${index + 1}`}负责人`} max={1} members={members} min={0} onChange={([ownerId = ""]) => onChange({ ...draft, subtasks: draft.subtasks.map((item, taskIndex) => taskIndex === index ? { ...item, ownerId, participantIds: item.participantIds.filter((id) => id !== ownerId) } : item) })} selected={owner ? [owner.id] : []} showInvitationStatus={false} showTriggerProfilePreview={false} />
                </div>
                <AccordionContent className="task-subtask-editor">
                  <div className="task-subtask-dependency-detail">
                    <TaskDependencyPicker onChange={(dependsOnSubtaskIndexes) => {
                      const otherDependencies = (draft.dependencies ?? []).filter((dependency) => dependency.subtaskIndex !== index);
                      const dependencies = dependsOnSubtaskIndexes.length
                        ? [...otherDependencies, { dependsOnSubtaskIndexes, subtaskIndex: index }].sort((left, right) => left.subtaskIndex - right.subtaskIndex)
                        : otherDependencies;
                      onChange({ ...draft, dependencies });
                    }} options={dependencyOptions} selected={dependsOnSubtaskIndexes} />
                  </div>
                  <TaskDraftEditor attributesFirst draft={task} members={members} onChange={(nextTask) => onChange({ ...draft, subtasks: draft.subtasks.map((item, taskIndex) => taskIndex === index ? nextTask : item) })} showOwner={false} showParticipants={false} tags={tags} />
                </AccordionContent>
              </AccordionItem>;
            })}
          </Accordion>
          </> : <div className="task-subtask-empty">
            <p>这是一个独立任务。如果需要拆分出可独立交付的工作，可以添加子任务。</p>
            <Button onClick={addSubtask} size="sm" type="button" variant="outline"><Plus data-icon="inline-start" />添加子任务</Button>
          </div>}
        </section>
      </div>
    </aside>
  </>;
}

export function TaskCreationConversation({ currentUserId, existingTasks, members, onCreateSubtask, onCreateTaskPlan, onOpenTask, tags }: TaskCreationConversationProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<PrivateConversation[]>(() => loadPrivateConversations(currentUserId));
  const conversationsRef = useRef(conversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [output, setOutput] = useState<TaskAssistantResponse | null>(null);
  const [error, setError] = useState<TaskAssistantApiError | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [createdPlan, setCreatedPlan] = useState<TaskCreationResult | null>(null);
  const [workflowRequest, setWorkflowRequest] = useState<TaskAssistantRequest | null>(null);
  const [workflowPreview, setWorkflowPreview] = useState<TaskAssistantResponse | null>(null);
  const [scenarioSession, setScenarioSession] = useState<ScenarioSession | null>(null);
  const [scenarioTransition, setScenarioTransition] = useState<ScenarioTransition | null>(null);
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<string | null>(null);
  const [currentScenarioChoiceMessageId, setCurrentScenarioChoiceMessageId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const pendingScenarioAnalysisRef = useRef<PendingScenarioAnalysis | null>(null);
  const creatingRef = useRef(false);
  const submittedScenarioMessagesRef = useRef(new Set<string>());

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!messagesContainerRef.current || !shouldAutoScrollRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (!container || !shouldAutoScrollRef.current) return;
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error, isAnalyzing, messages.length]);
  const saveConversation = (id: string, nextMessages: ConversationMessage[], nextOutput: TaskAssistantResponse | null, nextCreatedPlan: TaskCreationResult | null, nextParentTaskId = selectedParentTaskId) => {
    if (!nextMessages.some((message) => message.role === "user")) return;
    const conversation = buildTaskCreationConversationRecord<PrivateConversation, TaskAssistantResponse, TaskCreationResult>({
      createdPlan: nextCreatedPlan,
      id,
      messages: nextMessages,
      output: nextOutput,
      title: privateConversationTitle(nextMessages),
      updatedAt: new Date().toISOString(),
    }, nextParentTaskId);
    const nextConversations = [conversation, ...conversationsRef.current.filter((item) => item.id !== id)];
    persistConversationList(localStorage, conversationStorageKey(currentUserId), nextConversations);
    conversationsRef.current = nextConversations;
    setConversations(nextConversations);
  };

  const openConversation = (conversation: PrivateConversation) => {
    abortRef.current?.abort();
    abortRef.current = null;
    pendingScenarioAnalysisRef.current = null;
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages);
    setOutput(conversation.output);
    setCreatedPlan(conversation.createdPlan);
    setError(null);
    setIsAnalyzing(false);
    setIsDetailOpen(false);
    setWorkflowRequest(null);
    setWorkflowPreview(conversation.output);
    setScenarioSession(null);
    setScenarioTransition(null);
    setSelectedParentTaskId(restoreTaskCreationConversationState(conversation).pendingParentTaskId);
    creatingRef.current = false;
    setCurrentScenarioChoiceMessageId(null);
    submittedScenarioMessagesRef.current.clear();
    shouldAutoScrollRef.current = true;
  };

  const startNewConversation = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    pendingScenarioAnalysisRef.current = null;
    setActiveConversationId(null);
    setMessages([]);
    setOutput(null);
    setCreatedPlan(null);
    setError(null);
    setIsAnalyzing(false);
    setIsDetailOpen(false);
    setWorkflowRequest(null);
    setWorkflowPreview(null);
    setScenarioSession(null);
    setScenarioTransition(null);
    setSelectedParentTaskId(null);
    creatingRef.current = false;
    setCurrentScenarioChoiceMessageId(null);
    submittedScenarioMessagesRef.current.clear();
    shouldAutoScrollRef.current = true;
  };

  const memberById = useMemo(() => Object.fromEntries(members.map((member) => [member.id, member])), [members]);
  const scenarioContext = useMemo<ScenarioContext>(() => ({
    currentDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }),
    currentUserId,
    existingTasks,
    members,
    tags: tags.map((tag) => tag.name),
  }), [currentUserId, existingTasks, members, tags]);
  const canCreate = Boolean(output && taskIsValid(output.draft.mainTask) && output.draft.subtasks.every(taskIsValid));
  const isStarting = messages.length === 0 && !output && !createdPlan;
  const outputMessage = output ? [...messages].reverse().find((message) => message.role === "assistant") : undefined;
  const outputMainOwner = output ? memberById[output.draft.mainTask.ownerId] : undefined;
  const conversationText = messages.filter((message) => message.role === "user").map((message) => message.content).join(" ");
  const expectedSubtaskCount = output?.draft.subtasks.length ?? expectedMockSubtaskCount(conversationText);
  const taskCreationWorkflow = taskCreationWorkflowFor({
    members,
    request: workflowRequest,
    response: isAnalyzing ? workflowPreview : output ?? workflowPreview,
    subtaskCount: isAnalyzing ? workflowPreview?.draft.subtasks.length ?? expectedSubtaskCount : expectedSubtaskCount,
  });

  const requestAssistant = async (nextMessages: ConversationMessage[], conversationId = activeConversationId) => {
    if (isAnalyzing) return;
    pendingScenarioAnalysisRef.current = null;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsAnalyzing(true);
    setError(null);
    try {
      const request: TaskAssistantRequest = {
        currentDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }),
        currentUserId,
        draft: output?.draft ?? null,
        existingTasks,
        members: members.map(({ availability, currentWork, dynamicResponsibility, id, name, recentActivity, role }) => ({ availability: availability ?? "", currentWork: currentWork ?? [], dynamicResponsibility: dynamicResponsibility ?? "", id, name, recentActivity: recentActivity ?? "", role })),
        messages: nextMessages.map(({ content, role }) => ({ content, role })),
        tags: tags.map((tag) => tag.name),
        timezone: "Asia/Shanghai",
      };
      setWorkflowRequest(request);
      setWorkflowPreview(createMockTaskAssistantResponse(request));
      const nextOutput = await requestMockTaskAssistant(request, controller.signal);
      if (abortRef.current !== controller) return;
      const assistantMessage: ConversationMessage = { content: nextOutput.assistantMessage, createdAt: new Date().toISOString(), id: crypto.randomUUID(), role: "assistant" };
      const completedMessages = [...nextMessages, assistantMessage];
      setOutput(nextOutput);
      setMessages(completedMessages);
      if (conversationId) saveConversation(conversationId, completedMessages, nextOutput, createdPlan);
    } catch (caught) {
      if (abortRef.current !== controller) return;
      if (caught instanceof Error && caught.name === "AbortError") setError({ code: "UPSTREAM", message: "已停止本轮分析。" });
      else if (caught && typeof caught === "object" && "code" in caught && "message" in caught) setError(caught as TaskAssistantApiError);
      else setError({ code: "UPSTREAM", message: "分析暂时失败，请重试本轮。" });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsAnalyzing(false);
      }
    }
  };

  const applyScenarioTransition = (transition: ScenarioTransition, baseMessages: ConversationMessage[], conversationId: string) => {
    setScenarioSession(transition.session);
    setScenarioTransition(transition);
    const assistantMessage: ConversationMessage = {
      content: transition.message,
      createdAt: new Date().toISOString(),
      id: crypto.randomUUID(),
      role: "assistant",
      scenarioCandidate: transition.type === "decision" && transition.candidate ? {
        kind: transition.candidateKind,
        reason: transition.reason,
        task: { ...transition.candidate },
      } : undefined,
      scenarioChoices: transition.type === "question" || transition.type === "decision" ? transition.choices : undefined,
    };
    setCurrentScenarioChoiceMessageId(assistantMessage.scenarioChoices?.length ? assistantMessage.id : null);
    const completedMessages = [...baseMessages, assistantMessage];
    setMessages(completedMessages);

    if (transition.type === "draft") {
      setSelectedParentTaskId(null);
      const request: TaskAssistantRequest = {
        currentDate: scenarioContext.currentDate,
        currentUserId,
        draft: null,
        existingTasks,
        members: members.map(({ availability, currentWork, dynamicResponsibility, id, name, recentActivity, role }) => ({ availability: availability ?? "", currentWork: currentWork ?? [], dynamicResponsibility: dynamicResponsibility ?? "", id, name, recentActivity: recentActivity ?? "", role })),
        messages: baseMessages.filter(({ role }) => role === "user").map(({ content, role }) => ({ content, role })),
        tags: scenarioContext.tags,
        timezone: "Asia/Shanghai",
      };
      const nextOutput = createMockTaskAssistantResponseForDraft(request, transition.draft, transition.message);
      setWorkflowRequest(request);
      setWorkflowPreview(nextOutput);
      setOutput(nextOutput);
      saveConversation(conversationId, completedMessages, nextOutput, null, null);
      return;
    }

    if (transition.type === "create-subtask") {
      setSelectedParentTaskId(transition.parentTask.id);
      const request: TaskAssistantRequest = {
        currentDate: scenarioContext.currentDate,
        currentUserId,
        draft: null,
        existingTasks,
        members: members.map(({ availability, currentWork, dynamicResponsibility, id, name, recentActivity, role }) => ({ availability: availability ?? "", currentWork: currentWork ?? [], dynamicResponsibility: dynamicResponsibility ?? "", id, name, recentActivity: recentActivity ?? "", role })),
        messages: baseMessages.filter(({ role }) => role === "user").map(({ content, role }) => ({ content, role })),
        tags: scenarioContext.tags,
        timezone: "Asia/Shanghai",
      };
      const nextOutput = createMockTaskAssistantResponseForDraft(request, transition.draft, transition.message);
      setWorkflowRequest(request);
      setWorkflowPreview(nextOutput);
      setOutput(nextOutput);
      saveConversation(conversationId, completedMessages, nextOutput, null, transition.parentTask.id);
      return;
    }

    if (transition.type === "open-existing") {
      saveConversation(conversationId, completedMessages, null, null);
      onOpenTask(transition.task.id);
      return;
    }

    setOutput(null);
    setWorkflowRequest(null);
    setWorkflowPreview(null);
    saveConversation(conversationId, completedMessages, null, null);
  };

  const analyzeScenarioTransition = async (
    transition: ScenarioTransition,
    baseMessages: ConversationMessage[],
    conversationId: string,
    delayMs = 2_000,
  ) => {
    const pendingAnalysis: PendingScenarioAnalysis = { baseMessages, conversationId, delayMs, transition };
    pendingScenarioAnalysisRef.current = pendingAnalysis;
    const controller = new AbortController();
    abortRef.current = controller;
    const request: TaskAssistantRequest = {
      currentDate: scenarioContext.currentDate,
      currentUserId,
      draft: null,
      existingTasks,
      members: members.map(({ availability, currentWork, dynamicResponsibility, id, name, recentActivity, role }) => ({ availability: availability ?? "", currentWork: currentWork ?? [], dynamicResponsibility: dynamicResponsibility ?? "", id, name, recentActivity: recentActivity ?? "", role })),
      messages: baseMessages.map(({ content, role }) => ({ content, role })),
      tags: scenarioContext.tags,
      timezone: "Asia/Shanghai",
    };
    const preview = transition.type === "draft" || transition.type === "create-subtask"
      ? createMockTaskAssistantResponseForDraft(request, transition.draft, transition.message)
      : null;
    setIsAnalyzing(true);
    setError(null);
    setWorkflowRequest(request);
    setWorkflowPreview(preview);
    try {
      await requestMockTaskAssistant(request, controller.signal, delayMs);
      if (abortRef.current !== controller) return;
      applyScenarioTransition(transition, baseMessages, conversationId);
      if (pendingScenarioAnalysisRef.current === pendingAnalysis) pendingScenarioAnalysisRef.current = null;
    } catch (caught) {
      if (abortRef.current !== controller) return;
      if (caught instanceof Error && caught.name === "AbortError") setError({ code: "UPSTREAM", message: "已停止本轮场景分析。" });
      else setError({ code: "UPSTREAM", message: "场景分析暂时失败，请重试。" });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsAnalyzing(false);
      }
    }
  };

  const retryCurrentAnalysis = () => {
    const pendingAnalysis = pendingScenarioAnalysisRef.current;
    if (pendingAnalysis) {
      void analyzeScenarioTransition(
        pendingAnalysis.transition,
        pendingAnalysis.baseMessages,
        pendingAnalysis.conversationId,
        pendingAnalysis.delayMs,
      );
      return;
    }
    void requestAssistant(messages);
  };

  const handleScenarioStart = (suggestion: TaskCreationScenarioDefinition) => {
    abortRef.current?.abort();
    abortRef.current = null;
    pendingScenarioAnalysisRef.current = null;
    submittedScenarioMessagesRef.current.clear();
    shouldAutoScrollRef.current = true;
    setSelectedParentTaskId(null);
    creatingRef.current = false;
    const conversationId = crypto.randomUUID();
    const userMessage: ConversationMessage = { content: suggestion.prompt, createdAt: new Date().toISOString(), id: crypto.randomUUID(), role: "user" };
    setActiveConversationId(conversationId);
    setMessages([userMessage]);
    setOutput(null);
    setError(null);
    setCreatedPlan(null);
    setIsAnalyzing(false);
    setIsDetailOpen(false);
    setWorkflowRequest(null);
    setWorkflowPreview(null);
    void analyzeScenarioTransition(startTaskCreationScenario(suggestion.id, scenarioContext), [userMessage], conversationId, 5_200);
  };

  const handleScenarioChoice = (messageId: string, choice: ScenarioChoice) => {
    if (isAnalyzing) return;
    if (!scenarioSession || scenarioSession.status === "completed") return;
    if (currentScenarioChoiceMessageId !== messageId) return;
    const choiceMessage = messages.find((message) => message.id === messageId);
    if (!choiceMessage?.scenarioChoices || choiceMessage.scenarioChoiceSubmitted || submittedScenarioMessagesRef.current.has(messageId)) return;
    submittedScenarioMessagesRef.current.add(messageId);
    const conversationId = activeConversationId ?? crypto.randomUUID();
    const submittedMessages = messages.map((message) => message.id === messageId ? { ...message, scenarioChoiceSubmitted: true } : message);
    const userMessage: ConversationMessage = { content: choice.title, createdAt: new Date().toISOString(), id: crypto.randomUUID(), role: "user" };
    const nextMessages = [...submittedMessages, userMessage];
    setMessages(nextMessages);
    void analyzeScenarioTransition(advanceTaskCreationScenario(scenarioSession, choice.id, scenarioContext), nextMessages, conversationId);
  };

  const handleSend = (content: string) => {
    if (isAnalyzing || pendingScenarioAnalysisRef.current) return;
    const conversationId = activeConversationId ?? crypto.randomUUID();
    if (!activeConversationId) setActiveConversationId(conversationId);
    const userMessage: ConversationMessage = { content, createdAt: new Date().toISOString(), id: crypto.randomUUID(), role: "user" };
    const activeScenarioSession = scenarioSession?.status === "awaiting-input"
      && (scenarioTransition?.type === "question" || scenarioTransition?.type === "decision")
      ? scenarioSession
      : null;
    const scenarioMessages = activeScenarioSession
      ? messages.map((message) => message.scenarioChoices && !message.scenarioChoiceSubmitted ? { ...message, scenarioChoiceSubmitted: true } : message)
      : messages;
    const nextMessages = [...scenarioMessages, userMessage];
    setMessages(nextMessages);
    saveConversation(conversationId, nextMessages, output, createdPlan);
    if (activeScenarioSession) {
      void analyzeScenarioTransition(advanceTaskCreationScenario(activeScenarioSession, content, scenarioContext), nextMessages, conversationId);
      return;
    }
    void requestAssistant(nextMessages, conversationId);
  };

  const updateDraft = (draft: TaskPlanDraft) => {
    const nextOutput = output ? { ...output, draft } : output;
    setOutput(nextOutput);
    if (activeConversationId) saveConversation(activeConversationId, messages, nextOutput, createdPlan);
  };

  const confirmCreate = () => {
    if (createdPlan) {
      onOpenTask(createdPlan.mainTaskId);
      return;
    }
    if (!output || !canCreate || creatingRef.current) return;
    creatingRef.current = true;
    let result: TaskCreationResult | null = null;
    try {
      result = selectedParentTaskId
        ? onCreateSubtask(selectedParentTaskId, output.draft)
        : onCreateTaskPlan(output.draft);
      setCreatedPlan(result);
    } catch (caught) {
      setSelectedParentTaskId(null);
      setError({
        code: "INVALID_REQUEST",
        message: caught instanceof Error
          ? `${caught.message} 草案已保留；请再次确认以独立创建。`
          : "父任务已不存在。草案已保留；请再次确认以独立创建。",
      });
      // 显式传 null，避免本次 render 的旧 selectedParentTaskId 闭包重新写回持久化记录。
      if (activeConversationId) saveConversation(activeConversationId, messages, output, null, null);
    } finally {
      // 成功后保持同步门禁，直到 React 提交 createdPlan；后续点击会进入“查看详情”分支。
      creatingRef.current = Boolean(result);
    }
    if (activeConversationId && result) saveConversation(activeConversationId, messages, output, result);
  };

  const isScenarioRetryPending = Boolean(error && pendingScenarioAnalysisRef.current);
  const composer = <AnimatedAgentChatInput ariaLabel="给 TaskDoor 发消息" autoFocus disabled={isScenarioRetryPending} onSend={handleSend} onStop={() => abortRef.current?.abort()} placeholder={isScenarioRetryPending ? "请先重试本轮场景分析…" : output ? "回复 TaskDoor，继续完善任务…" : "向 TaskDoor 描述任务…"} status={isAnalyzing ? "analyzing" : "ready"} />;

  const taskOutputCard = output ? <article aria-labelledby="task-assistant-output-title" className={`task-assistant-output${createdPlan ? " is-created" : ""}`} data-tone={taskVisualFor(output.draft.mainTask, 0, true).iconTone}>
      <button aria-label={`${createdPlan ? "打开" : "查看"}任务详情：${output.draft.mainTask.title || "待补充任务名称"}`} className="task-assistant-card-hit-area" onClick={() => createdPlan ? onOpenTask(createdPlan.mainTaskId) : setIsDetailOpen(true)} type="button" />
      <header className="task-assistant-output-header"><TaskIcon iconName={taskVisualFor(output.draft.mainTask, 0, true).iconName} size="lg" tone={taskVisualFor(output.draft.mainTask, 0, true).iconTone} /><div><h2 id="task-assistant-output-title">{output.draft.mainTask.title || "待补充任务名称"}</h2></div></header>
      <div className="task-assistant-output-summary">
        <div aria-label="任务概览" className="task-assistant-output-facts">
          <div className="task-assistant-output-owner"><small>负责人</small><MemberSelector allowUnassigned hideHeader hideSelectedName label="负责人" max={1} members={members} min={0} onChange={([ownerId = ""]) => updateDraft({ ...output.draft, mainTask: { ...output.draft.mainTask, ownerId, participantIds: output.draft.mainTask.participantIds.filter((id) => id !== ownerId) } })} selected={outputMainOwner ? [outputMainOwner.id] : []} showInvitationStatus={false} /></div>
          <div><ListTree aria-hidden="true" /><small>任务结构</small><strong>主任务 1 · 子任务 {output.draft.subtasks.length}</strong></div>
        </div>
      </div>
      <Confetti
        ariaLabel={createdPlan ? "查看主任务详情" : "确认创建任务"}
        buttonClassName={`task-assistant-confirm${createdPlan ? " is-created" : ""}`}
        celebrate={!createdPlan}
        className="task-assistant-confirm-stage"
        disabled={!createdPlan && !canCreate}
        onClick={confirmCreate}
      >{createdPlan ? <><CheckCircle2 aria-hidden="true" data-icon="inline-start" />查看详情</> : <>确认创建<ArrowRight aria-hidden="true" data-icon="inline-end" /></>}</Confetti>
    </article> : null;

  return <div className={`task-conversation-shell${historyOpen ? " history-open" : ""}`}>
    {!historyOpen && <Button aria-label="展开历史对话" className="task-conversation-history-toggle" onClick={() => setHistoryOpen(true)} size="icon-sm" title="展开历史对话" type="button" variant="outline"><PanelLeftOpen aria-hidden="true" /></Button>}
    <aside aria-label="历史对话" className="task-conversation-history" aria-hidden={!historyOpen}>
      <header><strong>历史对话</strong><Button aria-label="收起历史对话" onClick={() => setHistoryOpen(false)} size="icon-sm" title="收起历史对话" type="button" variant="ghost"><PanelLeftClose aria-hidden="true" /></Button></header>
      <Button className="task-conversation-new" onClick={startNewConversation} size="sm" type="button" variant="outline"><Plus aria-hidden="true" data-icon="inline-start" />新对话</Button>
      <div className="task-conversation-history-list">
        {conversations.length ? conversations.map((conversation, index) => {
          const currentDay = new Date(conversation.updatedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
          const previousDay = index > 0 ? new Date(conversations[index - 1].updatedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) : null;
          const isToday = new Date(conversation.updatedAt).toDateString() === new Date().toDateString();
          return <Fragment key={conversation.id}>
            {currentDay !== previousDay && <small className="task-conversation-history-group">{isToday ? "今天" : currentDay}</small>}
            <button aria-current={activeConversationId === conversation.id ? "page" : undefined} className="task-conversation-history-item" onClick={() => openConversation(conversation)} type="button"><strong>{conversation.title}</strong><span>{conversation.createdPlan ? `创建了 ${conversation.createdPlan.createdCount} 个任务` : "未创建任务"} · {new Date(conversation.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span></button>
          </Fragment>;
        }) : <div className="task-conversation-history-empty"><History aria-hidden="true" /><strong>还没有历史对话</strong><span>发送第一条消息后，会自动保存在这里。</span></div>}
      </div>
    </aside>
    {historyOpen && <button aria-label="关闭历史对话" className="task-conversation-history-scrim" onClick={() => setHistoryOpen(false)} type="button" />}
    <section aria-label="TaskDoor 任务对话" className={`task-conversation-page${isStarting ? " is-starting" : ""}`}>
    <div className={`task-conversation-workspace${isDetailOpen ? " has-detail" : ""}`}>
      <div className="task-conversation-column">
        {isStarting ? <main className="task-conversation-start">
          <header><h1>今天想推进什么？</h1><p>TaskDoor 帮你分析目标、拆解工作并创建任务</p></header>
        </main> : <div aria-live="polite" className="task-conversation-messages" onScroll={(event) => {
          const container = event.currentTarget;
          shouldAutoScrollRef.current = container.scrollHeight - container.scrollTop - container.clientHeight <= 72;
        }} ref={messagesContainerRef} role="log">
          {messages.map((message, index) => {
            const showScenarioChoices = Boolean(message.scenarioChoices?.length)
              && !message.scenarioChoiceSubmitted
              && Boolean(scenarioSession)
              && currentScenarioChoiceMessageId === message.id;
            return <Fragment key={message.id}>
              {!isAnalyzing && output && message.role === "assistant" && index === messages.length - 1 && <AgentWorkflow completed phases={taskCreationWorkflow} tools={taskCreationTools} workingLabel="TaskDoor 正在工作…" />}
              {message === outputMessage && taskOutputCard}
              <div className="task-conversation-turn" data-from={message.role}>
                <AIMessage copyText={message.role === "assistant" ? message.content : undefined} from={message.role} onRetry={message.role === "assistant" && !message.scenarioChoices && index === messages.length - 1 ? () => void requestAssistant(messages.filter((item) => item.role === "user" || item.id !== message.id)) : undefined} timestamp={messageTimeFormatter.format(new Date(message.createdAt))}>{message.content}</AIMessage>
                {message.scenarioCandidate && <div className="task-creation-existing-task-panel">
                  <TaskCreationExistingTaskCard kind={message.scenarioCandidate.kind} ownerName={memberById[message.scenarioCandidate.task.ownerId ?? ""]?.name} reason={message.scenarioCandidate.reason} tags={tags} task={message.scenarioCandidate.task} />
                  {showScenarioChoices && <TaskCreationChoiceCards choices={message.scenarioChoices ?? []} disabled={isAnalyzing} onSelect={(choice) => handleScenarioChoice(message.id, choice)} variant="actions" />}
                </div>}
                {!message.scenarioCandidate && showScenarioChoices && <TaskCreationChoiceCards choices={message.scenarioChoices ?? []} disabled={isAnalyzing} onSelect={(choice) => handleScenarioChoice(message.id, choice)} />}
              </div>
            </Fragment>;
          })}
          {isAnalyzing && <AgentWorkflow phases={taskCreationWorkflow} tools={taskCreationTools} workingLabel="TaskDoor 正在工作…" />}
          {error && <article className="task-assistant-error"><AlertTriangle aria-hidden="true" /><div><strong>本轮分析未完成</strong><p>{error.message}</p></div><Button onClick={retryCurrentAnalysis} size="sm" type="button" variant="outline"><RotateCcw data-icon="inline-start" />重试本轮</Button></article>}
          {output && !outputMessage && taskOutputCard}
        </div>}
        <div className="task-conversation-composer">{composer}</div>
        {isStarting && <div aria-label="任务快捷指令" className="animated-agent-suggestions">{taskCreationScenarios.map((suggestion) => <button key={suggestion.id} onClick={() => handleScenarioStart(suggestion)} type="button"><Sparkles aria-hidden="true" />{suggestion.label}</button>)}</div>}
      </div>
      {!isStarting && isDetailOpen && output && <TaskPlanPanel draft={output.draft} memberById={memberById} members={members} onChange={updateDraft} onClose={() => setIsDetailOpen(false)} tags={tags} />}
    </div>
    </section>
  </div>;
}
