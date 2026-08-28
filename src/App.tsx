import { ArrowLeft, ArrowRight, Menu } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AiChainOfThought,
  AiChainOfThoughtContent,
  AiChainOfThoughtHeader,
  AiChainOfThoughtSearchResults,
  AiChainOfThoughtStep,
  type StepStatus,
} from "./components/ui/chain-of-thought";
import { InputBar, type InputAttachment } from "./components/InputBar";
import { TeamSwitcher } from "./components/TeamSwitcher";
import { WorkspaceSidebar, type PrimarySection } from "./components/WorkspaceSidebar";
import { WorkspaceList } from "./components/WorkspaceList";
import { PersonalWorkbench } from "./components/PersonalWorkbench";
import { CliConnectionDialog } from "./components/CliConnectionDialog";
import { TaskDetail, type TaskAttentionTarget } from "./components/TaskDetail";
import type { TaskRelationSummary } from "./components/TaskRelationsSection";
import type { Member } from "./components/MemberSelector";
import { CollaborationBrief } from "./components/CollaborationBrief";
import { TaskOverviewCard } from "./components/TaskOverviewCard";
import { TaskCreationSuccess } from "./components/TaskCreationSuccess";
import type { TaskStatus } from "./components/TaskStatusBadge";
import { AiConnectionPage } from "./components/AiConnectionPage";
import { TagManagementPage } from "./components/TagManagementPage";
import { PersonalCenterModal, type PersonalCenterModule } from "./components/PersonalInfoDialog";
import { initialTaskListFilters, type TaskListFilters } from "./components/taskListFilters";
import { createWorkspaceTaskDetail, taskDetailMocks, type TaskDetailId, type TaskDetailMock } from "./data/taskDetailMocks";
import { initialTags, normalizeTags, type TagDefinition } from "./data/tagGroups";
import { normalizeWorkspaceNodes, upgradeWorkspaceMockNodes, workspaceNodes as initialWorkspaceNodes, workspaceRootId, type TaskNode, type WorkspaceNode } from "./data/workspaceNodes";
import { loadPersonalCenterState, type PersonalCenterState } from "./data/memberProfiles";
import { allTaskCreationSources, deriveTaskDraft, getTaskCreationScenario, taskCreationMockPrompts, type TaskCreationChildDraft } from "./data/taskCreationScenarios";

type Phase = "empty" | "result";
type Theme = "light" | "dark";
type HomeView = "workbench" | "create";

type StoredTask = {
  childTaskIds?: string[];
  contextIds: string[];
  creatorId?: string;
  createdAt: string;
  goal: string;
  id: string;
  owner?: string[];
  ownerId?: string;
  parentTaskId?: string;
  participants: string[];
  plannedEndOn?: string;
  plannedStartOn?: string;
  planConfirmed?: boolean;
  proposedOwnerId?: string;
  ownerAssignmentStatus?: "confirmed" | "pending-acceptance";
  status?: TaskStatus;
  title: string;
};

const createdTaskStorageKey = "agentdoor-created-task";
const createdTasksStorageKey = "agentdoor-created-tasks";
const localAiStorageKey = "agentdoor-local-ai-connected";
const tagStorageKey = "agentdoor-tags";
const legacyTagGroupsStorageKey = "agentdoor-tag-groups";
const tagCatalogVersionKey = "agentdoor-tag-catalog-version";
const tagCatalogVersion = "flat-v1";
const workspaceNodesStorageKey = "agentdoor-workspace-nodes";
const workspaceMockVersionKey = "agentdoor-workspace-mock-version";
const workspaceMockVersion = "flat-tasks-v1";

const loadStoredValue = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

const loadCreatedTask = (): StoredTask | null => {
  try {
    const value = localStorage.getItem(createdTaskStorageKey);
    return value ? JSON.parse(value) as StoredTask : null;
  } catch {
    return null;
  }
};

const focusPrimaryHeadingAfterNavigation = () => {
  window.requestAnimationFrame(() => {
    const heading = document.querySelector<HTMLElement>(".main-content h1");
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus();
  });
};

const toTaskRelationSummary = (task: TaskNode): TaskRelationSummary => ({
  dueAt: task.dueAt && task.dueAt !== "—" ? task.dueAt : "未设置截止时间",
  goal: task.goal?.trim() || "暂未填写任务目标。",
  iconName: task.iconName,
  iconTone: task.iconTone,
  id: task.id,
  owner: task.ownerId,
  status: task.status,
  title: task.name,
});

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDaysToDateValue = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
};

const formatDateLabel = (value: string) => {
  if (!value) return "待确认";
  const date = new Date(`${value}T12:00:00`);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
};

const formatPeriodLabel = (startDate: string, endDate: string) => startDate === endDate
  ? formatDateLabel(endDate)
  : `${formatDateLabel(startDate)} — ${formatDateLabel(endDate)}`;

const normalizeStoredTaskPeriod = (task: StoredTask): StoredTask => {
  if (!task.plannedStartOn || !task.plannedEndOn) return { ...task, plannedEndOn: undefined, plannedStartOn: undefined };
  const plannedEndOn = task.plannedEndOn < task.plannedStartOn ? task.plannedStartOn : task.plannedEndOn;
  return { ...task, plannedEndOn, plannedStartOn: task.plannedStartOn };
};

const loadCreatedTasks = (): Record<string, StoredTask> => {
  const storedTasks = loadStoredValue<Record<string, StoredTask>>(createdTasksStorageKey, {});
  const normalizedTasks = Object.fromEntries(Object.entries(storedTasks).map(([id, task]) => [id, normalizeStoredTaskPeriod(task)]));
  const legacyTask = loadCreatedTask();
  if (!legacyTask || normalizedTasks[legacyTask.id]) return normalizedTasks;
  return { ...normalizedTasks, [legacyTask.id]: normalizeStoredTaskPeriod(legacyTask) };
};

const baseCollaborationMembers: Member[] = [
  { id: "周岚", name: "周岚", email: "zhoulan@agentdoor.local", role: "交易产品负责人", dynamicResponsibility: "退款、撤单与优惠券核销规则", availability: "任务周期内可安排约 1.5 小时；当前并行处理 2 项规则判断", currentWork: ["2 项决定阻塞协作者", "审核会员结算口径"], recentActivity: "近 30 天确认 6 项交易规则" },
  { id: "陈默", name: "陈默", email: "chenmo@agentdoor.local", role: "支付后端工程师", dynamicResponsibility: "交易重试可靠性与幂等治理", availability: "任务周期前半段负载偏高；8 月 28 日后可安排一次评审", currentWork: ["处理支付重试线上问题", "评审发票降级方案"], recentActivity: "近期完成 3 项重试链路任务" },
  { id: "林洁", name: "林洁", email: "linjie@agentdoor.local", role: "门店运营经理", dynamicResponsibility: "试点门店灰度与现场协调", availability: "任务周期内有 2 个门店灰度窗口；需提前协调现场材料", currentWork: ["协调 12 家试点门店", "汇总异常样本"], recentActivity: "连续负责 4 次门店灰度" },
  { id: "高远", name: "高远", email: "gaoyuan@agentdoor.local", role: "库存平台工程师", dynamicResponsibility: "事件补偿与消息去重", availability: "任务周期内约有 40% 可协调容量；当前维护 2 条事件链路", currentWork: ["库存补偿机制", "审计字段回填"], recentActivity: "维护库存事件链路" },
  { id: "梁川", name: "梁川", email: "liangchuan@agentdoor.local", role: "质量负责人", dynamicResponsibility: "跨域结果确认与发布质量", availability: "任务周期内可安排一次发布评审；当前另有 3 项交付待审", currentWork: ["审核 3 项交付", "会员回算抽样"], recentActivity: "近 30 天完成 8 次结果确认" },
  { id: "许宁", name: "许宁", email: "xuning@agentdoor.local", role: "会员域负责人", dynamicResponsibility: "会员权益与等级结算", availability: "8 月 28 日后恢复可协调；休假期间由周岚代理基础判断", currentWork: ["职责暂由周岚代理"], recentActivity: "维护会员规则基线" },
  { id: "韩序", name: "韩序", email: "hanxu@agentdoor.local", role: "数据分析师", dynamicResponsibility: "经营异常分析与指标口径", availability: "任务周期内可安排约 2 小时分析；当前并行 2 项指标工作", currentWork: ["分析发票失败率", "构建灰度指标"], recentActivity: "近期交付 5 份异常分析" },
  { id: "苏禾", name: "苏禾", email: "suhe@agentdoor.local", role: "合规与审计", dynamicResponsibility: "财务字段与个人数据合规", availability: "任务周期内需提前预约一次审核窗口；只接收边界清晰的材料", currentWork: ["历史交易审计"], recentActivity: "仅在敏感数据任务中加入" },
];

function App() {
  const [restoredTask] = useState<StoredTask | null>(() => loadCreatedTask());
  const initialStartDate = restoredTask?.plannedStartOn ?? toDateInputValue(new Date());
  const initialEndDate = restoredTask?.plannedEndOn ?? addDaysToDateValue(initialStartDate, 7);
  const restoredOwnerId = restoredTask?.ownerId ?? restoredTask?.owner?.[0] ?? "周岚";
  const [phase, setPhase] = useState<Phase>("empty");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("agentdoor-theme") as Theme) || "light");
  const [input, setInput] = useState("");
  const [requestSummary, setRequestSummary] = useState("");
  const [attachments, setAttachments] = useState<InputAttachment[]>([]);
  const [creationSuccessOpen, setCreationSuccessOpen] = useState(false);
  const [taskExists, setTaskExists] = useState(Boolean(restoredTask));
  const [taskCreatedAt, setTaskCreatedAt] = useState<string | null>(restoredTask?.createdAt ?? null);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(restoredTask?.id ?? null);
  const [createdTasks, setCreatedTasks] = useState<Record<string, StoredTask>>(() => loadCreatedTasks());
  const [selectedOwner, setSelectedOwner] = useState<string[]>([restoredOwnerId]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(restoredTask?.participants ?? ["陈默", "林洁"]);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>(restoredTask?.contextIds ?? []);
  const [taskName, setTaskName] = useState(restoredTask?.title ?? "评审并灰度验证 POS 优惠券重复核销修复草案");
  const [taskGoal, setTaskGoal] = useState(restoredTask?.goal ?? "基于现有根因定位和修复草案，完成 POS 优惠券重复核销修复，并通过退款、撤单和离线重试验证。");
  const [taskChildren, setTaskChildren] = useState<TaskCreationChildDraft[]>([]);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(restoredTask?.status ?? "进行中");
  const [taskStartDate, setTaskStartDate] = useState(initialStartDate);
  const [taskEndDate, setTaskEndDate] = useState(initialEndDate);
  const [planConfirmed, setPlanConfirmed] = useState(restoredTask?.planConfirmed ?? false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>("coupon-fix");
  const [draftParentTaskId, setDraftParentTaskId] = useState(restoredTask?.parentTaskId ?? "");
  const [workspaceNodes, setWorkspaceNodes] = useState<WorkspaceNode[]>(() => {
    const storedNodes = loadStoredValue(workspaceNodesStorageKey, initialWorkspaceNodes);
    if (localStorage.getItem(workspaceMockVersionKey) === workspaceMockVersion) return normalizeWorkspaceNodes(storedNodes);
    const upgradedNodes = upgradeWorkspaceMockNodes(storedNodes);
    localStorage.setItem(workspaceMockVersionKey, workspaceMockVersion);
    localStorage.setItem(workspaceNodesStorageKey, JSON.stringify(upgradedNodes));
    return upgradedNodes;
  });
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>(() => normalizeTags(
    loadStoredValue<unknown>(tagStorageKey, loadStoredValue<unknown>(legacyTagGroupsStorageKey, initialTags)),
  ));
  const [personalCenterState, setPersonalCenterState] = useState<PersonalCenterState>(() => loadPersonalCenterState());
  const [activeTeamId, setActiveTeamId] = useState(() => personalCenterState.teams[0]?.id ?? "");
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [personalCenterModule, setPersonalCenterModule] = useState<PersonalCenterModule>("profile");
  const currentUserName = personalCenterState.profile.name;
  const collaborationMembers = useMemo(() => baseCollaborationMembers.map((member) => member.id === "周岚" ? { ...member, name: personalCenterState.profile.name, email: personalCenterState.profile.email, role: personalCenterState.profile.title } : member), [personalCenterState.profile]);
  const [activeSection, setActiveSection] = useState<PrimarySection>("home");
  const [homeView, setHomeView] = useState<HomeView>("workbench");
  const [cliConnectionOpen, setCliConnectionOpen] = useState(false);
  const [localAiConnected, setLocalAiConnected] = useState(
    () => localStorage.getItem(localAiStorageKey) === "true",
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [taskQuery, setTaskQuery] = useState("");
  const [taskFilters, setTaskFilters] = useState<TaskListFilters>(initialTaskListFilters);
  const [taskWorkspaceRevision, setTaskWorkspaceRevision] = useState(0);
  const [taskPeriodOverrides, setTaskPeriodOverrides] = useState<Record<string, { end: string; start: string } | null>>({});
  const [taskOwnerProposals, setTaskOwnerProposals] = useState<Record<string, string>>({});
  const [taskAttentionTarget, setTaskAttentionTarget] = useState<TaskAttentionTarget | null>(null);
  const [analysisStep, setAnalysisStep] = useState(5);
  const [traceOpen, setTraceOpen] = useState(false);
  const analysisTimers = useRef<number[]>([]);

  const changePersonalInfoOpen = (open: boolean) => {
    setPersonalInfoOpen(open);
    if (open) return;
    window.requestAnimationFrame(() => {
      const selector = window.matchMedia("(max-width: 640px)").matches ? ".mobile-menu" : ".rail-user-trigger";
      document.querySelector<HTMLElement>(selector)?.focus();
    });
  };

  useEffect(() => {
    if (localStorage.getItem(tagCatalogVersionKey) !== tagCatalogVersion) {
      localStorage.setItem(tagCatalogVersionKey, tagCatalogVersion);
      localStorage.setItem(tagStorageKey, JSON.stringify(tagDefinitions));
    }
    if (localStorage.getItem(workspaceMockVersionKey) !== workspaceMockVersion) {
      setWorkspaceNodes((nodes) => upgradeWorkspaceMockNodes(nodes));
      localStorage.setItem(workspaceMockVersionKey, workspaceMockVersion);
    }
  }, [tagDefinitions]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("agentdoor-theme", theme);
  }, [theme]);

  useEffect(() => localStorage.setItem(workspaceNodesStorageKey, JSON.stringify(workspaceNodes)), [workspaceNodes]);
  useEffect(() => localStorage.setItem(tagStorageKey, JSON.stringify(tagDefinitions)), [tagDefinitions]);
  useEffect(() => localStorage.setItem(createdTasksStorageKey, JSON.stringify(createdTasks)), [createdTasks]);

  useEffect(() => {
    if (phase !== "result" || !taskExists || !taskCreatedAt || !createdTaskId) return;
    const task: StoredTask = {
      childTaskIds: taskChildren.map((child) => `${createdTaskId}-${child.id}`),
      contextIds: selectedContextIds,
      creatorId: "周岚",
      createdAt: taskCreatedAt,
      goal: taskGoal,
      id: createdTaskId,
      ownerId: selectedOwner[0] ?? "周岚",
      parentTaskId: draftParentTaskId || undefined,
      participants: selectedParticipants.filter((id) => !selectedOwner.includes(id)),
      plannedEndOn: taskEndDate || undefined,
      plannedStartOn: taskStartDate || undefined,
      planConfirmed,
      status: taskStatus,
      title: taskName,
    };
    localStorage.setItem(createdTaskStorageKey, JSON.stringify(task));
    setCreatedTasks((current) => {
      const previous = current[task.id];
      // The creation snapshot is already persisted by the create action. Once it
      // exists, detail-owned facts and pending Owner proposals must not be
      // replaced by this legacy creation synchronizer.
      if (previous) return current;
      return { ...current, [task.id]: task };
    });
  }, [createdTaskId, draftParentTaskId, phase, planConfirmed, selectedContextIds, selectedOwner, selectedParticipants, taskChildren, taskCreatedAt, taskEndDate, taskExists, taskGoal, taskName, taskStartDate, taskStatus]);

  useEffect(() => () => analysisTimers.current.forEach(window.clearTimeout), []);

  const clearAnalysisTimers = () => {
    analysisTimers.current.forEach(window.clearTimeout);
    analysisTimers.current = [];
  };

  const startAnalysis = (content: string) => {
    clearAnalysisTimers();
    setTaskExists(false);
    setTaskCreatedAt(null);
    setCreatedTaskId(null);
    setPlanConfirmed(false);
    const periodStart = toDateInputValue(new Date());
    const periodDays = content.includes("明天") ? 1 : content.includes("三天") ? 3 : 7;
    setSelectedOwner(["周岚"]);
    setSelectedParticipants([]);
    setSelectedContextIds([]);
    setDraftParentTaskId("");
    setTaskStatus("待开始");
    setTaskStartDate(periodStart);
    setTaskEndDate(addDaysToDateValue(periodStart, periodDays));
    const draft = deriveTaskDraft(content);
    const scenario = getTaskCreationScenario(content);
    setTaskChildren(scenario.taskStructure?.children.map((child) => ({
      ...child,
      candidateOptionsByGap: Object.fromEntries(Object.entries(child.candidateOptionsByGap).map(([gapId, candidateIds]) => [gapId, [...candidateIds]])),
      contextIds: [...child.contextIds],
      fileCandidateIds: [...child.fileCandidateIds],
      gapSelections: Object.fromEntries(Object.entries(child.gapSelections).map(([gapId, selection]) => [gapId, { ...selection }])),
      gaps: child.gaps.map((gap) => ({ ...gap })),
      participantIds: [...child.participantIds],
    })) ?? []);
    setTaskName(draft.title);
    setTaskGoal(draft.goal);
    setRequestSummary(
      content.includes("POS")
        ? "POS 优惠券重复核销修复：确认退款与撤单规则，并完成门店灰度验证"
        : content.split(/[。！？\n]/)[0].trim().slice(0, 72),
    );
    setActiveSection("tasks");
    setSelectedTaskId(null);
    setHomeView("create");
    setPhase("result");
    setAnalysisStep(0);
    setTraceOpen(true);
    [1, 2, 3, 4, 5].forEach((step, index) => {
      const timer = window.setTimeout(() => {
        setAnalysisStep(step);
        if (step === 5) {
          const collapseTimer = window.setTimeout(() => setTraceOpen(false), 850);
          analysisTimers.current.push(collapseTimer);
        }
      }, 720 * (index + 1));
      analysisTimers.current.push(timer);
    });
  };

  const reset = () => {
    clearAnalysisTimers();
    setTaskExists(false);
    setTaskCreatedAt(null);
    setCreatedTaskId(null);
    setPhase("empty");
    setInput("");
    setRequestSummary("");
    setAttachments([]);
    setCreationSuccessOpen(false);
    setActiveSection("tasks");
    setSelectedTaskId(null);
    setHomeView("create");
    setAnalysisStep(5);
    setTraceOpen(false);
    setPlanConfirmed(false);
    setSelectedOwner(["周岚"]);
    setSelectedParticipants([]);
    setTaskChildren([]);
    setSelectedContextIds([]);
    setDraftParentTaskId("");
    const periodStart = toDateInputValue(new Date());
    setTaskStartDate(periodStart);
    setTaskEndDate(addDaysToDateValue(periodStart, 7));
  };

  const returnToTaskList = () => {
    clearAnalysisTimers();
    setCreationSuccessOpen(false);
    setActiveSection("tasks");
    setSelectedTaskId(null);
    setHomeView("workbench");
    setPhase("empty");
    setInput("");
    setRequestSummary("");
    setAttachments([]);
    setAnalysisStep(5);
    setTraceOpen(false);
    focusPrimaryHeadingAfterNavigation();
  };

  const returnHomeAfterCreation = () => {
    clearAnalysisTimers();
    setCreationSuccessOpen(false);
    setActiveSection("home");
    setHomeView("workbench");
    setSelectedTaskId(null);
    setPhase("empty");
    setInput("");
    setRequestSummary("");
    setAttachments([]);
    setAnalysisStep(5);
    setTraceOpen(false);
  };

  const traceStatus = (index: number): StepStatus => {
    if (analysisStep > index) return "complete";
    if (analysisStep === index) return "active";
    return "pending";
  };

  const activeCreationScenario = getTaskCreationScenario(requestSummary);
  const proposalOwnerId = selectedOwner[0] ?? "周岚";
  const proposalOwner = collaborationMembers.find((member) => member.id === proposalOwnerId) ?? collaborationMembers[0];
  const proposalCollaborators = collaborationMembers.filter((member) => selectedParticipants.includes(member.id) && member.id !== proposalOwnerId);
  const proposalSources = activeCreationScenario.sources;
  const parentTaskOptions = workspaceNodes.filter((node) => node.kind === "task").map((task) => ({ id: task.id, label: task.name }));
  const selectedParentTaskLabel = parentTaskOptions.find((option) => option.id === draftParentTaskId)?.label;
  const taskPeriodInvalid = Boolean((taskStartDate || taskEndDate) && (!taskStartDate || !taskEndDate || taskEndDate < taskStartDate));
  const taskChildrenInvalid = taskChildren.some((child) => !child.title.trim() || !child.goal.trim());
  const childReferenceCount = taskChildren.reduce((count, child) => count + child.contextIds.length, 0);
  const taskPeriodLabel = taskStartDate && taskEndDate ? formatPeriodLabel(taskStartDate, taskEndDate) : "未设置";
  const selectedTreeTask = workspaceNodes.find((node) => node.kind === "task" && node.id === selectedTaskId);
  const selectedParentTask = selectedTreeTask?.kind === "task" && selectedTreeTask.parentTaskId ? workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === selectedTreeTask.parentTaskId) : undefined;
  const selectedTaskPath = selectedTreeTask ? [
    { id: workspaceRootId, label: "任务" },
    { id: selectedTreeTask.id, label: selectedTreeTask.name },
  ] : [];
  const selectedTaskMock = selectedTaskId ? taskDetailMocks[selectedTaskId as TaskDetailId] : undefined;
  const selectedCreatedTask = selectedTaskId ? createdTasks[selectedTaskId] : undefined;
  const customTaskDetail: TaskDetailMock | undefined = selectedTaskId && selectedTreeTask?.kind === "task" && !selectedTaskMock ? !selectedCreatedTask ? createWorkspaceTaskDetail(selectedTreeTask) : {
    activities: [{ id: `${selectedTaskId}-created`, author: "AgentDoor AI", message: "已根据你确认的草稿创建任务，并保留已选文件、成员与父子任务关系。", time: "刚刚", type: "ai-insight" }],
    commits: [],
    due: selectedCreatedTask.plannedStartOn && selectedCreatedTask.plannedEndOn ? formatPeriodLabel(selectedCreatedTask.plannedStartOn, selectedCreatedTask.plannedEndOn) : selectedTreeTask.dueAt ?? "—",
    files: allTaskCreationSources.filter((source) => selectedCreatedTask.contextIds.includes(source.id)).map((source) => ({
      content: source.snippet,
      format: source.type === "data" ? "DATA" : source.type === "task" ? "TASK" : source.type === "change" ? "PATCH" : source.title.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX",
      id: `${selectedTaskId}-${source.id}`,
      kind: "file" as const,
      name: source.title,
      parentId: null,
      updatedAt: "创建时引用",
    })),
    goal: selectedTreeTask.goal ?? selectedCreatedTask.goal,
    iconName: selectedTreeTask.iconName,
    iconTone: selectedTreeTask.iconTone,
    owner: selectedTreeTask.ownerId,
    participantInvitationStatus: Object.fromEntries(selectedCreatedTask.participants.map((id) => [id, "pending" as const])),
    participants: selectedCreatedTask.participants.filter((id) => id !== selectedTreeTask.ownerId),
    status: selectedTreeTask.status,
    summary: "任务已创建，默认由当前 Owner 推进；协作结构将在真实需要出现时再补充。",
    title: selectedTreeTask.name,
  } : undefined;
  const selectedTaskDetailBase: TaskDetailMock | undefined = customTaskDetail ?? (selectedTaskMock ? { ...selectedTaskMock, iconName: selectedTreeTask?.kind === "task" ? selectedTreeTask.iconName : selectedTaskMock.iconName, iconTone: selectedTreeTask?.kind === "task" ? selectedTreeTask.iconTone : selectedTaskMock.iconTone, owner: selectedTreeTask?.kind === "task" ? selectedTreeTask.ownerId : selectedTaskMock.owner } : undefined);
  const selectedTaskPeriodOverride = selectedTaskId ? taskPeriodOverrides[selectedTaskId] : undefined;
  const selectedTaskDetail = selectedTaskDetailBase && selectedTaskId ? {
    ...selectedTaskDetailBase,
    due: selectedTaskPeriodOverride === null ? "—" : selectedTaskPeriodOverride ? formatPeriodLabel(selectedTaskPeriodOverride.start, selectedTaskPeriodOverride.end) : selectedTaskDetailBase.due,
  } : undefined;
  const selectedChildTasks = selectedTaskId ? workspaceNodes
    .filter((node): node is TaskNode => node.kind === "task" && node.parentTaskId === selectedTaskId)
    .map(toTaskRelationSummary) : [];
  const selectedParentTaskSummary = selectedParentTask ? toTaskRelationSummary(selectedParentTask) : undefined;

  return (
    <div className="app-shell nav-rail-only">
      <WorkspaceSidebar
        activeSection={activeSection}
        activeTeamId={activeTeamId}
        mobileOpen={mobileNavOpen}
        onOpenPersonalCenter={(module) => { setPersonalCenterModule(module); setPersonalInfoOpen(true); setMobileNavOpen(false); }}
        onOpenTaskInsight={(taskId) => { setTaskAttentionTarget({ kind: "insight", targetId: "overview" }); setActiveSection("tasks"); setHomeView("workbench"); setSelectedTaskId(taskId); setMobileNavOpen(false); }}
        onSectionChange={(section) => {
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
          if (section === "home") {
            returnHomeAfterCreation();
            setMobileNavOpen(false);
            return;
          }
          setActiveSection(section);
          if (section === "tasks") {
            setHomeView("workbench");
            setSelectedTaskId(null);
            setTaskWorkspaceRevision((revision) => revision + 1);
          }
          setMobileNavOpen(false);
        }}
        onTeamChange={setActiveTeamId}
        teams={personalCenterState.teams}
        theme={theme}
        toggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
        userProfile={personalCenterState.profile}
      />

      <PersonalCenterModal activeModule={personalCenterModule} activeTeamId={activeTeamId} members={collaborationMembers} onActiveTeamChange={setActiveTeamId} onModuleChange={setPersonalCenterModule} onOpenChange={changePersonalInfoOpen} onStateChange={setPersonalCenterState} open={personalInfoOpen} state={personalCenterState} />

      {mobileNavOpen && <button aria-label="关闭导航" className="nav-scrim" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button aria-label="打开导航" className="mobile-menu" onClick={() => setMobileNavOpen(true)} type="button"><Menu size={20} /></button>
          <div className="topbar-brand"><TeamSwitcher activeTeamId={activeTeamId} onTeamChange={setActiveTeamId} teams={personalCenterState.teams} /></div>
        </header>

        {activeSection === "ai" ? (
          <AiConnectionPage />
        ) : activeSection === "settings" ? (
          <TagManagementPage
            tags={tagDefinitions}
            onChange={setTagDefinitions}
            onDeleteTag={(tag) => setWorkspaceNodes((nodes) => nodes.map((node) => node.kind === "task" ? { ...node, labels: node.labels?.filter((item) => item !== tag) } : node))}
            onRenameTag={(from, to) => setWorkspaceNodes((nodes) => nodes.map((node) => node.kind === "task" ? { ...node, labels: node.labels?.map((item) => item === from ? to : item) } : node))}
          />
        ) : activeSection === "tasks" && selectedTaskId && selectedTaskDetail ? (
          <TaskDetail
            key={selectedTaskId}
            childTasks={selectedChildTasks}
            currentUser={currentUserName}
            currentUserId="周岚"
            initialAttentionTarget={taskAttentionTarget}
            initialProposedOwnerId={selectedCreatedTask?.proposedOwnerId ?? taskOwnerProposals[selectedTaskId]}
            members={collaborationMembers}
            onInitialAttentionTargetHandled={() => setTaskAttentionTarget(null)}
            onOpenRelatedTask={(taskId) => {
              setSelectedTaskId(taskId);
              focusPrimaryHeadingAfterNavigation();
            }}
            onOwnerProposalChange={(ownerId) => {
              setTaskOwnerProposals((current) => {
                const next = { ...current };
                if (ownerId) next[selectedTaskId] = ownerId;
                else delete next[selectedTaskId];
                return next;
              });
              if (selectedCreatedTask) setCreatedTasks((current) => ({
                ...current,
                [selectedTaskId]: {
                  ...current[selectedTaskId],
                  ownerAssignmentStatus: ownerId ? "pending-acceptance" : "confirmed",
                  proposedOwnerId: ownerId,
                },
              }));
            }}
            onParticipantsChange={(participants) => {
              if (selectedTaskId === "coupon-fix" || selectedTaskId === createdTaskId) setSelectedParticipants(participants);
              if (selectedCreatedTask) setCreatedTasks((current) => ({
                ...current,
                [selectedTaskId]: {
                  ...current[selectedTaskId],
                  participants: participants.filter((id) => id !== (selectedTreeTask?.kind === "task" ? selectedTreeTask.ownerId : undefined)),
                },
              }));
            }}
            pathItems={selectedTaskPath}
            parentTask={selectedParentTaskSummary}
            onPathSelect={(nodeId) => {
              const node = workspaceNodes.find((item) => item.id === nodeId);
              if (node?.kind === "task") {
                setSelectedTaskId(node.id);
              } else {
                setSelectedTaskId(null);
              }
              setActiveSection("tasks");
              setHomeView("workbench");
              focusPrimaryHeadingAfterNavigation();
            }}
            task={selectedTaskDetail}
            taskId={selectedTaskId}
            plannedEndOn={selectedTaskPeriodOverride === undefined ? selectedCreatedTask?.plannedEndOn : selectedTaskPeriodOverride?.end}
            plannedStartOn={selectedTaskPeriodOverride === undefined ? selectedCreatedTask?.plannedStartOn : selectedTaskPeriodOverride?.start}
            tagDefinitions={tagDefinitions}
            tags={selectedTreeTask?.kind === "task" ? selectedTreeTask.labels ?? [] : []}
            onTaskStatusChange={selectedTaskId === "coupon-fix" || selectedTaskId === createdTaskId ? (status) => {
              setTaskStatus(status);
              setWorkspaceNodes((nodes) => nodes.map((node) => node.kind === "task" && node.id === selectedTaskId ? { ...node, status } : node));
            } : undefined}
            onTaskAppearanceChange={(appearance) => setWorkspaceNodes((nodes) => nodes.map((node) => node.kind === "task" && node.id === selectedTaskId ? { ...node, ...appearance, updatedAt: "刚刚" } : node))}
            onTaskPeriodChange={(range) => {
              setTaskPeriodOverrides((current) => ({ ...current, [selectedTaskId]: range }));
              setWorkspaceNodes((nodes) => nodes.map((node) => node.kind === "task" && node.id === selectedTaskId ? { ...node, dueAt: range ? formatDateLabel(range.end) : "—", updatedAt: "刚刚" } : node));
              if (selectedCreatedTask) setCreatedTasks((current) => ({ ...current, [selectedTaskId]: { ...current[selectedTaskId], plannedEndOn: range?.end, plannedStartOn: range?.start } }));
            }}
            onTagsChange={(labels) => setWorkspaceNodes((nodes) => nodes.map((node) => node.kind === "task" && node.id === selectedTaskId ? { ...node, labels } : node))}
          />
        ) : activeSection === "tasks" && homeView === "workbench" ? (
          <WorkspaceList
            key={taskWorkspaceRevision}
            filters={taskFilters}
            nodes={workspaceNodes}
            tagDefinitions={tagDefinitions}
            onCreateTask={reset}
            onFiltersChange={setTaskFilters}
            onManageTags={() => setActiveSection("settings")}
            onNodeSelect={(node) => {
              if (node.kind === "task") setSelectedTaskId(node.id);
            }}
            onQueryChange={setTaskQuery}
            query={taskQuery}
          />
        ) : activeSection === "tasks" && homeView === "create" && phase === "empty" ? (
          <section className="start-view">
            <div className="start-copy">
              <h1>你现在想解决什么问题？</h1>
              <p>先说清楚目标。AgentDoor 会整理相关背景与资料，再生成一份可以直接调整的任务草稿。</p>
            </div>
            <div className="composer-wrap">
              <InputBar
                attachments={attachments}
                onAttach={(files) => setAttachments((current) => [
                  ...current,
                  ...Array.from(files).map((file) => ({ id: crypto.randomUUID(), name: file.name, size: file.size })),
                ])}
                onChange={setInput}
                onRemoveAttachment={(id) => setAttachments((current) => current.filter((item) => item.id !== id))}
                onSend={startAnalysis}
                value={input}
              />
              <div className="example-prompts-header"><span>快速测试</span><small>点击填入后仍可继续修改</small></div>
              <div className="example-prompts" aria-label="示例问题">
                {taskCreationMockPrompts.map((item) => <button aria-label={`使用“${item.label}”示例：${item.quickTestHint}`} key={item.label} onClick={() => setInput(item.prompt)} type="button"><span className="example-prompt-kind"><small>{item.label}</small><em>{item.quickTestHint}</em></span><span>{item.prompt}</span><ArrowRight size={13} /></button>)}
              </div>
              <p className="privacy-note">仅在你已有的权限范围内查找。添加资料不会自动分享给其他人。</p>
            </div>
          </section>
        ) : activeSection === "home" && homeView === "workbench" ? (
          <PersonalWorkbench
            currentUserName={currentUserName}
            localAiConnected={localAiConnected}
            onConnectLocalAi={() => setCliConnectionOpen(true)}
            onCreateTask={reset}
          />
        ) : null}

        {phase === "result" && activeSection === "tasks" && homeView === "create" && (
          <section className="result-view">
            <div className="result-summary-bar">
              <button aria-label="返回任务" onClick={returnToTaskList} type="button">
                <ArrowLeft size={15} />
                <span>返回任务</span>
              </button>
              <div>
                <p>{requestSummary}</p>
              </div>
            </div>

            <div className="trace-wrap">
              <AiChainOfThought onOpenChange={setTraceOpen} open={traceOpen}>
                <AiChainOfThoughtHeader
                  completedCount={analysisStep}
                  stepCount={5}
                  title={analysisStep < 5 ? "正在准备协作建议" : "分析已完成"}
                >
                  <span className="chain-header-note">
                    {analysisStep < 5 ? "正在处理" : `${proposalSources.length} 个来源 · 可查看处理记录`}
                  </span>
                </AiChainOfThoughtHeader>
                <AiChainOfThoughtContent>
                  <AiChainOfThoughtStep
                    description="明确目标、交付结果和处理约束。"
                    status={traceStatus(0)}
                    title="理解任务"
                  />
                  <AiChainOfThoughtStep
                    description="识别完成任务前需要分别解决的关键问题。"
                    status={traceStatus(1)}
                    title="拆解问题"
                  />
                  <AiChainOfThoughtStep
                    description="在当前权限内，从业务资料、历史记录、代码和人员信息中寻找依据。"
                    status={traceStatus(2)}
                    title="查找相关依据"
                  >
                    {analysisStep >= 3 && proposalSources.length > 0 && (
                      <AiChainOfThoughtSearchResults results={proposalSources.map(({ id, title, snippet }) => ({
                        title,
                        snippet,
                        url: `#resource-${id}`,
                      }))} />
                    )}
                  </AiChainOfThoughtStep>
                  <AiChainOfThoughtStep
                    description="对照多个来源，整理已确认事实、存在冲突的判断和仍缺失的信息。"
                    status={traceStatus(3)}
                    title="归纳事实与待确认项"
                  />
                  <AiChainOfThoughtStep
                    description="根据当前结论给出最小推进方式、资料与协作建议，是否采用仍由你决定。"
                    status={traceStatus(4)}
                    title="规划后续处理"
                  />
                </AiChainOfThoughtContent>
              </AiChainOfThought>
            </div>

            <div className={`result-grid ${analysisStep < 5 ? "result-pending" : "result-ready"}`}>
              <div className="result-main">
                <CollaborationBrief
                  key={requestSummary}
                  contextIds={selectedContextIds}
                  fileCandidateIds={activeCreationScenario.fileCandidateIds}
                  goal={taskGoal}
                  name={taskName}
                  onContextChange={(ids) => { setSelectedContextIds(ids); setPlanConfirmed(false); }}
                  onGoalChange={(goal) => { setTaskGoal(goal); setPlanConfirmed(false); }}
                  onNameChange={(name) => { setTaskName(name); setPlanConfirmed(false); }}
                  onParentTaskChange={(id) => { setDraftParentTaskId(id); setPlanConfirmed(false); }}
                  onTaskChildrenChange={(children) => { setTaskChildren(children); setPlanConfirmed(false); }}
                  parentTaskId={draftParentTaskId}
                  parentTaskOptions={parentTaskOptions}
                  sourceBasis={activeCreationScenario.sourceBasis}
                  sources={proposalSources}
                  taskChildren={taskChildren}
                />
              </div>

              <div className="task-card-shell pending">
                <TaskOverviewCard
                  actionDisabled={!taskName.trim() || taskPeriodInvalid || taskChildrenInvalid}
                  actionLabel={!taskName.trim() ? "请填写任务名称" : taskPeriodInvalid ? "请确认任务周期" : taskChildrenInvalid ? "请补全子任务" : "创建任务"}
                  childTaskCount={taskChildren.length}
                  collaborators={proposalCollaborators}
                  ownerName={proposalOwner?.name ?? proposalOwnerId}
                  onAction={() => {
                    const createdAt = new Date().toISOString();
                    const taskId = `task-${crypto.randomUUID()}`;
                    const childTasks = taskChildren.map((child): StoredTask => {
                      return {
                        contextIds: child.contextIds,
                        createdAt,
                        creatorId: "周岚",
                        goal: child.goal,
                        id: `${taskId}-${child.id}`,
                        ownerId: proposalOwnerId,
                        parentTaskId: taskId,
                        participants: [],
                        plannedEndOn: taskEndDate || undefined,
                        plannedStartOn: taskStartDate || undefined,
                        planConfirmed: true,
                        status: "待开始",
                        title: child.title,
                      };
                    });
                    const task: StoredTask = {
                      childTaskIds: childTasks.map((child) => child.id),
                      contextIds: selectedContextIds,
                      createdAt,
                      creatorId: "周岚",
                      goal: taskGoal,
                      id: taskId,
                      ownerId: proposalOwnerId,
                      parentTaskId: draftParentTaskId || undefined,
                      participants: selectedParticipants.filter((id) => id !== proposalOwnerId),
                      plannedEndOn: taskEndDate || undefined,
                      plannedStartOn: taskStartDate || undefined,
                      planConfirmed: true,
                      status: "待开始",
                      title: taskName,
                    };
                    localStorage.setItem(createdTaskStorageKey, JSON.stringify(task));
                    setCreatedTasks((current) => ({ ...current, [taskId]: task, ...Object.fromEntries(childTasks.map((child) => [child.id, child])) }));
                    setCreatedTaskId(taskId);
                    setPlanConfirmed(true);
                    setTaskCreatedAt(createdAt);
                    setTaskExists(true);
                    setTaskStatus("待开始");
                    setWorkspaceNodes((nodes) => [...nodes, {
                      goal: taskGoal,
                      iconName: "list-todo",
                      iconTone: "blue",
                      id: taskId,
                      kind: "task",
                      labels: [],
                      name: taskName,
                      ownerId: proposalOwnerId,
                      parentId: workspaceRootId,
                      parentTaskId: draftParentTaskId || undefined,
                      status: "待开始",
                      dueAt: taskEndDate ? formatDateLabel(taskEndDate) : "—",
                      updatedAt: "刚刚",
                    }, ...childTasks.map((child) => ({
                      dueAt: taskEndDate ? formatDateLabel(taskEndDate) : "—",
                      goal: child.goal,
                      iconName: "list-todo" as const,
                      iconTone: "neutral" as const,
                      id: child.id,
                      kind: "task" as const,
                      labels: [],
                      name: child.title,
                      ownerId: child.ownerId ?? proposalOwnerId,
                      parentId: workspaceRootId,
                      parentTaskId: taskId,
                      status: "待开始" as const,
                      updatedAt: "刚刚",
                    }))]);
                    setCreationSuccessOpen(true);
                  }}
                  periodLabel={taskPeriodLabel}
                  title={taskName}
                />
              </div>
            </div>
          </section>
        )}
      </main>
      {creationSuccessOpen && <TaskCreationSuccess
        childTaskCount={taskChildren.length}
        childReferenceCount={childReferenceCount}
        creator={currentUserName}
        onClose={returnToTaskList}
        onContinue={() => {
          setCreationSuccessOpen(false);
          setActiveSection("tasks");
          setHomeView("workbench");
          setPhase("empty");
          setSelectedTaskId(createdTaskId);
          focusPrimaryHeadingAfterNavigation();
        }}
        owner={proposalOwner?.name ?? proposalOwnerId}
        parentTaskLabel={selectedParentTaskLabel}
        periodLabel={taskPeriodLabel}
        referenceCount={selectedContextIds.length}
        title={taskName}
      />}
      {cliConnectionOpen && (
        <CliConnectionDialog
          onClose={() => setCliConnectionOpen(false)}
          onConnected={() => {
            localStorage.setItem(localAiStorageKey, "true");
            setLocalAiConnected(true);
          }}
        />
      )}
    </div>
  );
}

export default App;
