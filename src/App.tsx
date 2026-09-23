import { mockWorkspaceEmail } from "./lib/mockWorkspaceAccount";
import { applyCriterionReviewMocks } from "./data/taskCriterionReviewMocks";
import { confirmTaskCriterion } from "./lib/taskCriterionReview";
import { buildCreatedMockCatalog } from "./i18n/createdMockCatalog";
import { MockDataProvider } from "./i18n/MockDataProvider";
import { useGlobalUi } from "./i18n/globalUi";
import { taskScheduleError } from "./lib/taskSchedule";
import { useEffect, useMemo, useRef, useState } from "react";
import { TaskCreationExperience } from "./components/TaskCreationExperience";
import type { TaskCreationParentContext } from "./components/TaskCreationPage";
import type { PrimarySection } from "./components/WorkspaceSidebar";
import { WorkspaceTopbar } from "./components/WorkspaceTopbar";
import { PersonDirectoryProvider } from "./components/PersonDirectory";
import { MemberInvitationProvider, type MemberInvitationHandle } from "./components/MemberInvitations";
import "./styles/member-invitations.css";
import { getTeamPeople } from "./lib/teamInvitations";
import { TaskWorkspace } from "./components/TaskWorkspace";
import { PersonalWorkbench } from "./components/PersonalWorkbench";
import { AiConnectionDialog } from "./components/AiConnectionDialog";
import { TaskDetail, type TaskAttentionTarget } from "./components/TaskDetail";
import { COLLABORATION_CHANGED, projectTaskCollaboration } from "./lib/useTaskCollaboration";
import { getDirectChildTaskCounts, toTaskRelationSummary } from "./lib/taskRelationProjection";
import type { TaskDateRange } from "./components/TaskDateRangePicker";
import { taskIconOptions, taskIconToneOptions } from "./components/TaskIcon";
import { AiConnectionPage } from "./components/AiConnectionPage";
import { TagManagementPage } from "./components/TagManagementPage";
import { PersonalTagsProvider } from "./components/PersonalTags";
import { getPersonalTagStorageKey, loadPersonalTags, preparePersonalTaskTags } from "./lib/personalTags";
import { PersonalCenterModal, type PersonalCenterModule } from "./components/PersonalInfoDialog";
import { createInitialTaskListFilters, type TaskListFilters } from "./components/taskListFilters";
import { createWorkspaceTaskDetail, taskDetailMocks, type TaskActivityChange, type TaskActivityMock, type TaskActivityType, type TaskDetailId, type TaskDetailMock } from "./data/taskDetailMocks";
import { getTeamTaskDiagnosisSnapshot, getTeamTaskDetailFixture } from "./data/teamTaskDetailFixtures";
import { getTaskAcceptedEffortMinutes } from "./data/taskProgressExamples";
import { initialTags, type TagDefinition } from "./data/tagGroups";
import { normalizeWorkspaceNodes, workspaceRootId, type TaskIconName, type TaskIconTone, type TaskNode, type WorkspaceNode } from "./data/workspaceNodes";
import { loadPersonalCenterState, personalCenterChangedEvent, personalCenterStorageKey, type PersonalCenterState } from "./data/memberProfiles";
import { allTeamWorkspaceNodes as initialWorkspaceNodes, getTeamMembers, getTeamWorkspaceNodes, getTeamWorkspaceScenario } from "./data/teamWorkspaceScenarios";
import { legacyTaskSources, loadLatestLegacyTaskSnapshot, loadLegacyTaskSnapshots, persistLegacyTaskSnapshots, type LegacyTaskSnapshot } from "./data/legacyTaskSnapshots";
import type { TaskPlanDraft } from "./lib/taskAssistantProtocol";
import { appendTaskActivity, createTaskChangeActivity, parseTaskActivityStore, type TaskActivityStore } from "./lib/taskActivity";
import { createWorkspaceTasksFromDraft } from "./lib/workspaceTaskCreation";
import { deleteWorkspaceSubtask, deleteWorkspaceTask, getSubtaskDeletionPreview, getSubtaskDeletionWrites, getTaskDeletionPreview, getTaskDeletionWrites } from "./lib/workspaceSubtaskEditing";
import { clearTaskFileDraftSessions } from "./lib/taskFileDrafts";
import { commitWorkspaceScenarioReset, resolveWorkspaceScenarioReset } from "./lib/workspaceScenarioReset";
import { migrateProgressDemoFixtures } from "./lib/taskProgressDemoMigration";
import { migrateTaskStatusDemoFixtures } from "./lib/taskStatusDemoMigration";
import { migrateNestedTaskVisuals } from "./lib/nestedTaskCreationScenario";
import { getCreatedProjectProgressDemo, withCreatedProjectProgressDetail } from "./data/createdProjectProgressDemo";
import { updateWorkspaceTaskStatus } from "./lib/workspaceTaskUpdates";
import { getTaskProgressDemoExample } from "./data/taskProgressDemo";
import { progressPredictionInputKey, progressPredictionStorageKey, readProgressPredictions, recalculateTaskProgressPrediction } from "./lib/taskProgressPrediction";
import { applySavedTaskAiAdjustment, createSavedTaskAiContext, getTaskDefinitionGoal } from "./lib/taskAiAdjustmentAdapters";
import { commitTaskAiStorage, recoverTaskAiStorage } from "./lib/taskAiAdjustmentStorage";
import type { TaskAiAdjustmentProposal } from "./lib/taskAiAdjustmentTypes";
import { applyCurrentTaskCriteria, applySavedTaskCriteria } from "./lib/taskCriteriaEditing";
import { applyTaskDependencies } from "./lib/taskDependencies";
import { getWorkspaceEffortLeaves } from "./lib/taskEffortEditing";
import { runAgentdoorReanalysis } from "./lib/agentdoorReanalysis";
import { buildTaskDiagnosisContext } from "./lib/taskDiagnosisContext";
import { buildPersonalWorkbenchModel } from "./lib/personalWorkbench";
import { buildPersonalWorkbenchAiConnectionRequest } from "./lib/personalWorkbenchAiConnection";
import { Button } from "./components/ui/button";
import { toast } from "./components/ui/toast";
import { TaskDeleteDialog } from "./components/TaskDeleteDialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./components/ui/dialog";
import { Input } from "./components/ui/input";

import { readWorkspaceSession, saveWorkspaceSession, signOutWorkspace } from "./lib/workspaceSession";

type Theme = "light" | "dark";
type ParticipantInvitationStatuses = Record<string, "accepted" | "pending">;

const tagStorageKey = "agentdoor-tags";
const legacyTagGroupsStorageKey = "agentdoor-tag-groups";
const workspaceNodesStorageKey = "agentdoor-workspace-nodes";
const workspaceScenarioVersionKey = "agentdoor-workspace-scenario-version";
const taskActivityStorageKey = "agentdoor-task-activity";
const taskDetailSeedsStorageKey = "agentdoor-task-detail-seeds";
const taskOwnerProposalsStorageKey = "agentdoor-task-owner-proposals";
const taskParticipantInvitationsStorageKey = "agentdoor-task-participant-invitations";

const loadStoredValue = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

const loadStoredText = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const persistStoredValue = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 本地存储不可用时保持内存态可用，下次加载会重新尝试迁移。
  }
};

const persistStoredText = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 配额或权限限制不应阻断当前会话。
  }
};

const focusPrimaryHeadingAfterNavigation = (target: "auto" | "list" | "detail" | "home" | "creation" = "auto") => {
  window.requestAnimationFrame(() => {
    // Keep keyboard focus in the visible desktop index when selecting successive tasks.
    if (target === "detail" && window.matchMedia("(min-width: 901px)").matches && document.activeElement?.closest(".task-workspace-row")) return;
    const selector = target === "list" ? "#task-workspace-list-heading" : target === "detail" ? ".task-workspace-detail h1" : target === "home" ? "#personal-workbench-heading" : target === "creation" ? ".task-workspace-creation h1" : ".main-content h1";
    const heading = [...document.querySelectorAll<HTMLElement>(selector)].find((element) => element.getClientRects().length > 0);
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  });
};

const getTaskPathItems = (nodes: readonly WorkspaceNode[], task: TaskNode) => {
  const tasks = new Map(nodes.filter((node): node is TaskNode => node.kind === "task").map((node) => [node.id, node]));
  const ancestors: TaskNode[] = [];
  const visited = new Set([task.id]);
  let parentId = task.parentTaskId;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = tasks.get(parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    parentId = parent.parentTaskId;
  }
  return [
    { id: workspaceRootId, label: "任务" },
    ...ancestors.map((ancestor) => ({ id: ancestor.id, label: ancestor.name })),
    { id: task.id, label: task.name },
  ];
};

const formatDateLabel = (value: string) => {
  if (!value) return "待确认";
  const date = new Date(`${value}T12:00:00`);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
};

const formatPeriodLabel = (startDate: string, endDate: string) => !startDate || startDate === endDate
  ? formatDateLabel(endDate)
  : `${formatDateLabel(startDate)} — ${formatDateLabel(endDate)}`;

const taskDateValue = (value?: string): string | null => {
  if (!value || value === "—" || value.includes("未设置") || value.includes("待排期")) return null;
  const iso = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const date = new Date();
  const monthDay = value.match(/(\d+)\s*月\s*(\d+)\s*日/);
  if (monthDay) return `${date.getFullYear()}-${monthDay[1].padStart(2, "0")}-${monthDay[2].padStart(2, "0")}`;
  if (value.includes("今天")) return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return value;
};

function App() {
  const ui = useGlobalUi();
  const [workspaceSession] = useState(readWorkspaceSession);
  const currentUserId = workspaceSession?.userId ?? "周岚";
  const showDemoData = !workspaceSession || workspaceSession.email === mockWorkspaceEmail;
  const [, refreshCollaboration] = useState(0);
  useEffect(() => {
    const refresh = () => refreshCollaboration(value => value + 1);
    window.addEventListener(COLLABORATION_CHANGED, refresh);
    return () => window.removeEventListener(COLLABORATION_CHANGED, refresh);
  }, []);
  const [taskStorageRecoveryError, setTaskStorageRecoveryError] = useState("");
  const [theme, setTheme] = useState<Theme>(() => (loadStoredText("agentdoor-theme") as Theme) || "light");
  const [initialScenarioState] = useState(() => {
    const scenario = resolveWorkspaceScenarioReset({
      storedVersion: loadStoredText(workspaceScenarioVersionKey),
      storedWorkspaceNodes: loadStoredValue<unknown>(workspaceNodesStorageKey, initialWorkspaceNodes),
      storedTags: loadStoredValue<unknown>(tagStorageKey, loadStoredValue<unknown>(legacyTagGroupsStorageKey, initialTags)),
    });
    const migratedNodes = migrateNestedTaskVisuals(migrateTaskStatusDemoFixtures(migrateProgressDemoFixtures(scenario.workspaceNodes, parseTaskActivityStore(loadStoredValue<unknown>(taskActivityStorageKey, {})))));
    const storedOwnerAssignments = loadStoredValue<Record<string, string>>(taskOwnerProposalsStorageKey, {});
    let assignmentsMigrated = false;
    const nodes = migratedNodes.map((node): WorkspaceNode => {
      if (node.kind !== "task") return node;
      const ownerId = storedOwnerAssignments[node.id] || node.proposedOwnerId || node.ownerId;
      if (ownerId !== node.ownerId || node.proposedOwnerId) assignmentsMigrated = true;
      const { proposedOwnerId: _legacyProposal, ...task } = node;
      return { ...task, ownerId };
    });
    return { ...scenario, workspaceNodes: nodes, didMigrate: scenario.didMigrate || migratedNodes !== scenario.workspaceNodes || assignmentsMigrated };
  });
  const [latestLegacyTask, setLatestLegacyTask] = useState<LegacyTaskSnapshot | null>(() => initialScenarioState.didReset ? null : loadLatestLegacyTaskSnapshot());
  const [legacyTaskSnapshots, setLegacyTaskSnapshots] = useState<Record<string, LegacyTaskSnapshot>>(() => initialScenarioState.didReset ? {} : loadLegacyTaskSnapshots());
  const [legacyTaskSnapshotsDirty, setLegacyTaskSnapshotsDirty] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [workspaceNodes, setWorkspaceNodes] = useState<WorkspaceNode[]>(() => applyCriterionReviewMocks(initialScenarioState.workspaceNodes));
  const workspaceNodesRef = useRef(workspaceNodes);
  const [taskActivityStore, setTaskActivityStore] = useState<TaskActivityStore>(() => parseTaskActivityStore(loadStoredValue<unknown>(taskActivityStorageKey, {})));
  const [taskDetailSeedNodes, setTaskDetailSeedNodes] = useState<TaskNode[]>(() => {
    const stored = loadStoredValue<unknown>(taskDetailSeedsStorageKey, []);
    const seeds = new Map(normalizeWorkspaceNodes(Array.isArray(stored) ? stored : [])
      .filter((node): node is TaskNode => node.kind === "task")
      .map((node) => [node.id, node]));
    initialScenarioState.workspaceNodes.forEach((node) => {
      if (node.kind === "task" && !seeds.has(node.id)) seeds.set(node.id, { ...node });
    });
    return [...seeds.values()];
  });
  const taskDetailSeedNodesRef = useRef(taskDetailSeedNodes);
  const createdProjectProgressDemo = useMemo(() => {
    const seeds = new Map(taskDetailSeedNodes.map(task => [task.id, task]));
    workspaceNodes.forEach(node => { if (node.kind === "task" && !seeds.has(node.id)) seeds.set(node.id, node); });
    return getCreatedProjectProgressDemo([...seeds.values()], workspaceNodes);
  }, [taskDetailSeedNodes, workspaceNodes]);
  const additionalMockTasks = useMemo(() => {
    const seeds = new Map(taskDetailSeedNodes.map(task => [task.id, task]));
    workspaceNodes.forEach(node => { if (node.kind === "task" && !seeds.has(node.id)) seeds.set(node.id, node); });
    return buildCreatedMockCatalog([...seeds.values()]);
  }, [taskDetailSeedNodes, workspaceNodes]);
  const [progressPredictions, setProgressPredictions] = useState(() => readProgressPredictions(loadStoredValue<unknown>(progressPredictionStorageKey, {})));
  const progressComparisons = useMemo(() => ({ ...createdProjectProgressDemo.comparisons,
    ...Object.fromEntries(Object.entries(progressPredictions)
      .filter(([id, result]) => result.inputKey === progressPredictionInputKey(workspaceNodes, id))
      .map(([id, result]) => [id, result.series])),
  }), [createdProjectProgressDemo, progressPredictions, workspaceNodes]);
  const refreshTaskPrediction = async (taskId: string) => {
    const nodes = workspaceNodesRef.current;
    const task = nodes.find(node => node.kind === "task" && node.id === taskId);
    if (!task || task.kind !== "task" || task.status === "已完成" || task.status === "已取消") throw new Error("任务状态已变化，当前无需预测。");
    const inputKey = progressPredictionInputKey(nodes, taskId);
    const result = await runAgentdoorReanalysis({ analyze: () => recalculateTaskProgressPrediction({ nodes, taskId,
      getSeries: id => createdProjectProgressDemo.comparisons[id] ?? getTaskProgressDemoExample(id),
    }) });
    if (progressPredictionInputKey(workspaceNodesRef.current, taskId) !== inputKey) throw new Error("任务已更新，已保留最新状态，请重新分析。");
    const next = { ...progressPredictions, [taskId]: result };
    try { localStorage.setItem(progressPredictionStorageKey, JSON.stringify(next)); }
    catch { throw new Error("预测结果未能保存，请重试。"); }
    setProgressPredictions(next);
  };
  const [personalTagLoadError, setPersonalTagLoadError] = useState("");
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>(() => {
    try { return loadPersonalTags(localStorage, currentUserId, showDemoData ? initialScenarioState.tags : []); }
    catch { return showDemoData ? initialScenarioState.tags : []; }
  });
  useEffect(() => {
    try { loadPersonalTags(localStorage, currentUserId, showDemoData ? initialScenarioState.tags : []); }
    catch { setPersonalTagLoadError("个人标签无法读取，暂时显示初始列表。请刷新后重试，原记录已保留。"); }
  }, [initialScenarioState]);
  const savePersonalTags = (tags: TagDefinition[]) => {
    if (personalTagLoadError) throw new Error(personalTagLoadError);
    try { localStorage.setItem(getPersonalTagStorageKey(currentUserId), JSON.stringify(tags)); }
    catch { throw new Error("个人标签未能保存，请检查浏览器存储空间后重试。"); }
    setTagDefinitions(tags);
  };
  const [personalCenterState, setPersonalCenterState] = useState<PersonalCenterState>(() => loadPersonalCenterState());
  const [activeTeamId, setActiveTeamId] = useState(() => personalCenterState.teams.find(team => team.id === workspaceSession?.activeTeamId)?.id ?? personalCenterState.teams[0]?.id ?? "");
  useEffect(() => {
    if (workspaceSession && activeTeamId) saveWorkspaceSession({ ...workspaceSession, activeTeamId });
  }, [activeTeamId, workspaceSession]);
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [personalCenterModule, setPersonalCenterModule] = useState<PersonalCenterModule>("profile");
  const personalCenterReturnFocus = useRef<HTMLElement | null>(null);
  const memberInvitationsRef = useRef<MemberInvitationHandle>(null);
  const currentUserName = personalCenterState.profile.name;
  const collaborationMembers = useMemo(() => getTeamPeople(personalCenterState.teams.find(team => team.id === activeTeamId), getTeamMembers(activeTeamId)).map((member) => member.id === currentUserId
    ? { ...member, avatarUrl: personalCenterState.profile.avatarDataUrl, name: personalCenterState.profile.name, email: personalCenterState.profile.email }
    : member), [activeTeamId, personalCenterState]);
  useEffect(() => {
    const reload = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== personalCenterStorageKey) return;
      setPersonalCenterState(loadPersonalCenterState());
    };
    window.addEventListener("storage", reload);
    window.addEventListener(personalCenterChangedEvent, reload);
    return () => { window.removeEventListener("storage", reload); window.removeEventListener(personalCenterChangedEvent, reload); };
  }, []);
  const teamWorkspaceNodes = useMemo(() => getTeamWorkspaceNodes(activeTeamId, workspaceNodes), [activeTeamId, workspaceNodes]);
  const [activeSection, setActiveSection] = useState<PrimarySection>("tasks");
  const [globalAiConnectionOpen, setGlobalAiConnectionOpen] = useState(false);
  const [conversationRevision, setConversationRevision] = useState(0);
  const [creationSessionOpen, setCreationSessionOpen] = useState(false);
  const [creationParentContext, setCreationParentContext] = useState<TaskCreationParentContext | null>(null);
  const creationSessionCompleted = useRef(false);
  const [workbenchAsOf, setWorkbenchAsOf] = useState(() => getTeamWorkspaceScenario(activeTeamId)?.asOf ?? new Date().toISOString());
  const [workbenchAnalyzing, setWorkbenchAnalyzing] = useState(false);
  const [workbenchAnalysisError, setWorkbenchAnalysisError] = useState("");
  const workbenchAnalysisInFlight = useRef(false);
  const [workbenchAiConnectionOpen, setWorkbenchAiConnectionOpen] = useState(false);
  const workbenchAiConnectionTrigger = useRef<HTMLElement | null>(null);
  const [taskQuery, setTaskQuery] = useState("");
  const [taskFilters, setTaskFilters] = useState<TaskListFilters>(() => createInitialTaskListFilters(currentUserId));
  const [taskPeriodOverrides, setTaskPeriodOverrides] = useState<Record<string, { end: string; start: string } | null>>({});
  const [taskOwnerProposals, setTaskOwnerProposals] = useState<Record<string, string>>({});
  const [taskParticipantInvitationOverrides, setTaskParticipantInvitationOverrides] = useState<Record<string, ParticipantInvitationStatuses>>({});
  const [taskAttentionTarget, setTaskAttentionTarget] = useState<TaskAttentionTarget | null>(null);
  const [subtaskDeleteTarget, setSubtaskDeleteTarget] = useState<{ taskId: string; parentTaskId: string; signature: string } | null>(null);
  const [subtaskDeleteError, setSubtaskDeleteError] = useState("");
  const deletingSubtask = useRef(false);
  const subtaskDeleteReturnFocus = useRef<HTMLElement | null>(null);
  const subtaskDeletion = useMemo(() => {
    if (!subtaskDeleteTarget) return { preview: null, error: "" };
    try { return { preview: getSubtaskDeletionPreview(workspaceNodes, subtaskDeleteTarget.parentTaskId, subtaskDeleteTarget.taskId), error: "" }; }
    catch (error) { return { preview: null, error: error instanceof Error ? error.message : "无法核对删除范围，请关闭后重试。" }; }
  }, [workspaceNodes, subtaskDeleteTarget]);
  const [taskDeleteTarget, setTaskDeleteTarget] = useState<{ taskId: string; signature: string } | null>(null);
  const [taskDeleteError, setTaskDeleteError] = useState("");
  const deletingTask = useRef(false);
  const taskDeletion = useMemo(() => {
    if (!taskDeleteTarget) return { preview: null, error: "" };
    try { return { preview: getTaskDeletionPreview(workspaceNodes, taskDeleteTarget.taskId), error: "" }; }
    catch (error) { return { preview: null, error: error instanceof Error ? error.message : "无法核对删除范围，请关闭后重试。" }; }
  }, [workspaceNodes, taskDeleteTarget]);

  const changePersonalInfoOpen = (open: boolean) => {
    setPersonalInfoOpen(open);
    if (open) return;
    const returnFocus = personalCenterReturnFocus.current;
    personalCenterReturnFocus.current = null;
    window.requestAnimationFrame(() => {
      if (returnFocus?.isConnected) returnFocus.focus();
      else document.querySelector<HTMLElement>("#workspace-account-trigger")?.focus();
    });
  };

  const openPersonalCenter = (module: PersonalCenterModule, returnFocus?: HTMLElement | null) => {
    personalCenterReturnFocus.current = returnFocus ?? null;
    setPersonalCenterModule(module);
    setPersonalInfoOpen(true);
  };

  const openMemberInviteDialog = (returnFocus?: HTMLElement | null) => {
    memberInvitationsRef.current?.openInvite({ returnFocus });
  };

  const resetCreationSessionForTeamChange = () => {
    setCreationSessionOpen(false);
    setCreationParentContext(null);
    creationSessionCompleted.current = false;
    setConversationRevision((revision) => revision + 1);
  };

  const changeActiveTeam = (teamId: string) => {
    if (!personalCenterState.teams.some((team) => team.id === teamId) || teamId === activeTeamId) return;
    resetCreationSessionForTeamChange();
    setActiveTeamId(teamId);
    setSelectedTaskId(null);
    setTaskAttentionTarget(null);
    setTaskQuery("");
    setTaskFilters(createInitialTaskListFilters(currentUserId));
    setActiveSection("tasks");
    setWorkbenchAnalysisError("");
    setWorkbenchAsOf(getTeamWorkspaceScenario(teamId)?.asOf ?? new Date().toISOString());
  };

  const showTaskList = () => {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    setSelectedTaskId(null);
    setActiveSection("tasks");
    focusPrimaryHeadingAfterNavigation("list");
  };

  const openTask = (taskId: string, focusHeading = true) => {
    const task = workspaceNodesRef.current.find((node): node is TaskNode => node.kind === "task" && node.id === taskId);
    if (!task) return;
    setPersonalInfoOpen(false);
    const taskTeamId = task.teamId ?? "creator-commerce";
    if (taskTeamId !== activeTeamId && personalCenterState.teams.some((team) => team.id === taskTeamId)) {
      resetCreationSessionForTeamChange();
      setActiveTeamId(taskTeamId);
    }
    setSelectedTaskId(taskId);
    setActiveSection("tasks");
    if (focusHeading) focusPrimaryHeadingAfterNavigation("detail");
  };

  const startNewTaskConversation = () => {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    if (!creationSessionOpen || creationSessionCompleted.current || creationParentContext) {
      setConversationRevision((revision) => revision + 1);
      setCreationSessionOpen(true);
      creationSessionCompleted.current = false;
    }
    setCreationParentContext(null);
    setActiveSection("conversation");
    focusPrimaryHeadingAfterNavigation("creation");
  };

  const showPrimarySection = (section: "home" | "tasks") => {
    setActiveSection(section);
    setTaskAttentionTarget(null);
    focusPrimaryHeadingAfterNavigation(section === "tasks" ? selectedTaskId ? "detail" : "list" : "home");
  };

  const workbenchInputRefs = useRef({
    legacyTaskSnapshots, taskActivityStore, taskDetailSeedNodes, taskOwnerProposals, taskPeriodOverrides, workspaceNodes,
  });
  useEffect(() => {
    const previous = workbenchInputRefs.current;
    const changed = previous.workspaceNodes !== workspaceNodes
      || previous.legacyTaskSnapshots !== legacyTaskSnapshots
      || previous.taskPeriodOverrides !== taskPeriodOverrides
      || previous.taskOwnerProposals !== taskOwnerProposals
      || previous.taskDetailSeedNodes !== taskDetailSeedNodes
      || previous.taskActivityStore !== taskActivityStore;
    workbenchInputRefs.current = {
      legacyTaskSnapshots, taskActivityStore, taskDetailSeedNodes, taskOwnerProposals, taskPeriodOverrides, workspaceNodes,
    };
    if (changed) setWorkbenchAsOf(new Date().toISOString());
  }, [legacyTaskSnapshots, taskActivityStore, taskDetailSeedNodes, taskOwnerProposals, taskPeriodOverrides, workspaceNodes]);

  useEffect(() => {
    if (personalCenterState.teams.some((team) => team.id === activeTeamId)) return;
    resetCreationSessionForTeamChange();
    const fallbackTeamId = personalCenterState.teams[0]?.id ?? "";
    setActiveTeamId(fallbackTeamId);
    setWorkbenchAsOf(getTeamWorkspaceScenario(fallbackTeamId)?.asOf ?? new Date().toISOString());
    setSelectedTaskId(null);
  }, [activeTeamId, personalCenterState.teams]);

  useEffect(() => {
    try {
      commitWorkspaceScenarioReset(localStorage, initialScenarioState, {
        legacyKeys: [
          legacyTagGroupsStorageKey,
          "agentdoor-created-task",
          "agentdoor-created-tasks",
          "agentdoor-tag-catalog-version",
          "agentdoor-workspace-mock-version",
        ],
        tagsKey: tagStorageKey,
        versionKey: workspaceScenarioVersionKey,
        workspaceNodesKey: workspaceNodesStorageKey,
      });
    } catch {
      // 浏览器禁止访问 localStorage 时仍允许以内存态使用应用。
    }
  }, [initialScenarioState]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    persistStoredText("agentdoor-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (taskStorageRecoveryError) return;
    const withCriterionMocks = applyCriterionReviewMocks(workspaceNodes);
    workspaceNodesRef.current = withCriterionMocks;
    if (withCriterionMocks !== workspaceNodes) setWorkspaceNodes(withCriterionMocks);
    persistStoredValue(workspaceNodesStorageKey, withCriterionMocks);
  }, [workspaceNodes, taskStorageRecoveryError]);
  useEffect(() => { if (!taskStorageRecoveryError) persistStoredValue(taskActivityStorageKey, taskActivityStore); }, [taskActivityStore, taskStorageRecoveryError]);
  useEffect(() => { if (!taskStorageRecoveryError) persistStoredValue(taskDetailSeedsStorageKey, taskDetailSeedNodes); }, [taskDetailSeedNodes, taskStorageRecoveryError]);
  useEffect(() => { if (!taskStorageRecoveryError) persistStoredValue(taskOwnerProposalsStorageKey, taskOwnerProposals); }, [taskOwnerProposals, taskStorageRecoveryError]);
  useEffect(() => persistStoredValue(taskParticipantInvitationsStorageKey, taskParticipantInvitationOverrides), [taskParticipantInvitationOverrides]);
  useEffect(() => {
    if (!legacyTaskSnapshotsDirty || taskStorageRecoveryError) return;
    try {
      persistLegacyTaskSnapshots(legacyTaskSnapshots);
    } catch {
      // 存储不可用时仍保留当前内存态编辑。
    }
  }, [legacyTaskSnapshots, legacyTaskSnapshotsDirty, taskStorageRecoveryError]);

  const updateLegacyTaskSnapshot = (taskId: string, changes: Partial<LegacyTaskSnapshot>) => {
    setLegacyTaskSnapshots((current) => current[taskId]
      ? { ...current, [taskId]: { ...current[taskId], ...changes } }
      : current);
    setLegacyTaskSnapshotsDirty(true);
  };

  const preserveTaskDetailSeed = (task: TaskNode) => {
    if (taskDetailSeedNodesRef.current.some((seed) => seed.id === task.id)) return;
    const next = [...taskDetailSeedNodesRef.current, { ...task }];
    taskDetailSeedNodesRef.current = next;
    setTaskDetailSeedNodes(next);
  };

  const touchTask = (taskId: string) => {
    const next = workspaceNodesRef.current.map(node => node.id === taskId && node.kind === "task" ? { ...node, updatedAt: new Date().toISOString() } : node);
    workspaceNodesRef.current = next;
    setWorkspaceNodes(next);
  };

  const appendActivityForTask = (taskId: string, activity: TaskActivityMock) => {
    const task = workspaceNodesRef.current.find((node): node is TaskNode => node.kind === "task" && node.id === taskId);
    if (!task) return;
    preserveTaskDetailSeed(task);
    setTaskActivityStore((current) => appendTaskActivity(current, taskId, activity));
    touchTask(taskId);
  };

  const changeTaskFields = (taskId: string, patch: Partial<TaskNode>, type: TaskActivityType, message: string, changes: TaskActivityChange[]) => {
    const task = workspaceNodesRef.current.find((node): node is TaskNode => node.kind === "task" && node.id === taskId);
    if (!task) return;
    const activity = createTaskChangeActivity({ author: currentUserName, type, message, changes });
    if (!activity) return;
    preserveTaskDetailSeed(task);
    const next = workspaceNodesRef.current.map((node) => node.id === taskId && node.kind === "task" ? { ...node, ...patch, updatedAt: new Date().toISOString() } : node);
    workspaceNodesRef.current = next;
    setWorkspaceNodes(next);
    appendActivityForTask(taskId, activity);
  };

  const changeTaskStatus = (taskId: string, status: TaskNode["status"]) => {
    const task = workspaceNodesRef.current.find((node): node is TaskNode => node.kind === "task" && node.id === taskId);
    if (!task || task.status === status) return;
    const activity = createTaskChangeActivity({ author: currentUserName, type: "status-change", message: "更新任务状态", changes: [{ label: "状态", before: task.status, after: status }] });
    if (!activity) return;
    preserveTaskDetailSeed(task);
    const next = updateWorkspaceTaskStatus(workspaceNodesRef.current, taskId, status);
    workspaceNodesRef.current = next;
    setWorkspaceNodes(next);
    appendActivityForTask(taskId, activity);
  };

  const createTaskPlanFromConversation = (draft: TaskPlanDraft, parentTaskId?: string) => {
    if (personalTagLoadError || taskStorageRecoveryError) throw new Error(personalTagLoadError || taskStorageRecoveryError);
    const prepared = preparePersonalTaskTags(tagDefinitions, draft);
    const result = createWorkspaceTasksFromDraft(workspaceNodesRef.current, prepared.draft, { parentTaskId, currentUserId, teamId: activeTeamId, participantsReviewed: true });
    // Save new tasks and the caller's personal catalog as one recoverable write.
    try {
      commitTaskAiStorage(localStorage, [
        [workspaceNodesStorageKey, JSON.stringify(result.nodes)],
        [getPersonalTagStorageKey(currentUserId), JSON.stringify(prepared.tags)],
      ]);
    } catch {
      try { recoverTaskAiStorage(localStorage); }
      catch (caught) { setTaskStorageRecoveryError(caught instanceof Error ? caught.message : "本地记录需要恢复。"); }
      throw new Error("当前浏览器无法保存任务和个人标签。请检查存储空间或隐私设置，草稿已保留。");
    }
    setTagDefinitions(prepared.tags);
    workspaceNodesRef.current = result.nodes;
    setWorkspaceNodes(result.nodes);
    creationSessionCompleted.current = true;
    return {
      createdCount: result.createdNodes.length,
      mainTaskId: result.mainTaskId,
      taskTitles: result.createdNodes.map((task) => task.name),
    };
  };

  const requestDeleteSubtask = (taskId: string, returnFocus?: HTMLElement | null) => {
    if (!selectedTaskId) return;
    subtaskDeleteReturnFocus.current = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    deletingSubtask.current = false;
    setSubtaskDeleteError("");
    try {
      const preview = getSubtaskDeletionPreview(workspaceNodesRef.current, selectedTaskId, taskId);
      setSubtaskDeleteTarget({ taskId, parentTaskId: selectedTaskId, signature: preview.signature });
    } catch (error) {
      setSubtaskDeleteTarget({ taskId, parentTaskId: selectedTaskId, signature: "" });
      setSubtaskDeleteError(error instanceof Error ? error.message : "无法核对删除范围，请关闭后重试。");
    }
  };

  const confirmDeleteSubtask = () => {
    if (!subtaskDeleteTarget || deletingSubtask.current) return;
    if (taskStorageRecoveryError) { setSubtaskDeleteError(taskStorageRecoveryError); return; }
    deletingSubtask.current = true;
    try {
      const next = deleteWorkspaceSubtask({
        nodes: workspaceNodesRef.current, activities: taskActivityStore, detailSeeds: taskDetailSeedNodesRef.current,
        ownerProposals: taskOwnerProposals, participantInvitations: taskParticipantInvitationOverrides,
        periodOverrides: taskPeriodOverrides, legacySnapshots: legacyTaskSnapshots, latestLegacySnapshot: latestLegacyTask,
      }, subtaskDeleteTarget.parentTaskId, subtaskDeleteTarget.taskId, subtaskDeleteTarget.signature, currentUserName);
      try { commitTaskAiStorage(localStorage, getSubtaskDeletionWrites(next)); }
      catch (caught) {
        try { recoverTaskAiStorage(localStorage); }
        catch (error) { setTaskStorageRecoveryError(error instanceof Error ? error.message : "本地记录需要恢复，请暂时停止编辑。"); }
        throw caught;
      }
      clearTaskFileDraftSessions(next.deletedTaskIds);
      workspaceNodesRef.current = next.nodes;
      taskDetailSeedNodesRef.current = next.detailSeeds;
      setWorkspaceNodes(next.nodes);
      setTaskActivityStore(next.activities);
      setTaskDetailSeedNodes(next.detailSeeds);
      setTaskOwnerProposals(next.ownerProposals);
      setTaskParticipantInvitationOverrides(next.participantInvitations);
      setTaskPeriodOverrides(next.periodOverrides);
      setLegacyTaskSnapshots(next.legacySnapshots);
      setLatestLegacyTask(next.latestLegacySnapshot);
      setLegacyTaskSnapshotsDirty(true);
      setSubtaskDeleteTarget(null);
      setSubtaskDeleteError("");
      setTaskAttentionTarget({ kind: "subtasks", targetId: next.parentTaskId });
      openTask(next.parentTaskId);
    } catch (error) {
      deletingSubtask.current = false;
      setSubtaskDeleteError(error instanceof Error ? error.message : "删除未完成，任务已保留，请重试。");
      try {
        const preview = getSubtaskDeletionPreview(workspaceNodesRef.current, subtaskDeleteTarget.parentTaskId, subtaskDeleteTarget.taskId);
        if (preview.signature !== subtaskDeleteTarget.signature) setSubtaskDeleteTarget({ ...subtaskDeleteTarget, signature: preview.signature });
      } catch { /* Keep the dialog open without a destructive action if the target disappeared. */ }
    }
  };

  const requestDeleteTask = (task: TaskNode) => {
    deletingTask.current = false;
    setTaskDeleteError("");
    try {
      const preview = getTaskDeletionPreview(workspaceNodesRef.current, task.id);
      setTaskDeleteTarget({ taskId: task.id, signature: preview.signature });
    } catch (error) {
      setTaskDeleteTarget({ taskId: task.id, signature: "" });
      setTaskDeleteError(error instanceof Error ? error.message : "无法核对删除范围，请关闭后重试。");
    }
  };

  const confirmDeleteTask = () => {
    if (!taskDeleteTarget || deletingTask.current) return;
    if (taskStorageRecoveryError) { setTaskDeleteError(taskStorageRecoveryError); return; }
    deletingTask.current = true;
    try {
      const next = deleteWorkspaceTask({
        nodes: workspaceNodesRef.current, activities: taskActivityStore, detailSeeds: taskDetailSeedNodesRef.current,
        ownerProposals: taskOwnerProposals, participantInvitations: taskParticipantInvitationOverrides,
        periodOverrides: taskPeriodOverrides, legacySnapshots: legacyTaskSnapshots, latestLegacySnapshot: latestLegacyTask,
      }, taskDeleteTarget.taskId, taskDeleteTarget.signature, currentUserName);
      try { commitTaskAiStorage(localStorage, getTaskDeletionWrites(next)); }
      catch (caught) {
        try { recoverTaskAiStorage(localStorage); }
        catch (error) { setTaskStorageRecoveryError(error instanceof Error ? error.message : "本地记录需要恢复，请暂时停止编辑。"); }
        throw caught;
      }
      clearTaskFileDraftSessions(next.deletedTaskIds);
      workspaceNodesRef.current = next.nodes;
      taskDetailSeedNodesRef.current = next.detailSeeds;
      setWorkspaceNodes(next.nodes);
      setTaskActivityStore(next.activities);
      setTaskDetailSeedNodes(next.detailSeeds);
      setTaskOwnerProposals(next.ownerProposals);
      setTaskParticipantInvitationOverrides(next.participantInvitations);
      setTaskPeriodOverrides(next.periodOverrides);
      setLegacyTaskSnapshots(next.legacySnapshots);
      setLatestLegacyTask(next.latestLegacySnapshot);
      setLegacyTaskSnapshotsDirty(true);
      setTaskDeleteTarget(null);
      setTaskDeleteError("");
      setTaskAttentionTarget(null);
      if (selectedTaskId && next.deletedTaskIds.includes(selectedTaskId)) {
        if (next.returnTaskId && next.nodes.some(node => node.kind === "task" && node.id === next.returnTaskId)) openTask(next.returnTaskId);
        else showTaskList();
      }
    } catch (error) {
      deletingTask.current = false;
      setTaskDeleteError(error instanceof Error ? error.message : "删除未完成，任务已保留，请重试。");
      try {
        const preview = getTaskDeletionPreview(workspaceNodesRef.current, taskDeleteTarget.taskId);
        if (preview.signature !== taskDeleteTarget.signature) setTaskDeleteTarget({ ...taskDeleteTarget, signature: preview.signature });
      } catch { /* Keep the dialog open without a destructive action if the target disappeared. */ }
    }
  };

  const selectedTreeTask = teamWorkspaceNodes.find((node) => node.kind === "task" && node.id === selectedTaskId);
  const selectedParentTask = selectedTreeTask?.kind === "task" && selectedTreeTask.parentTaskId
    ? teamWorkspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === selectedTreeTask.parentTaskId)
    : undefined;
  const selectedTaskPath = selectedTreeTask?.kind === "task" ? getTaskPathItems(teamWorkspaceNodes, selectedTreeTask) : [];
  const startNewSubtaskConversation = () => {
    const selectedTask = workspaceNodesRef.current.find((node): node is TaskNode => node.kind === "task" && node.id === selectedTaskId);
    if (!selectedTask) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    setCreationParentContext({
      parentTaskId: selectedTask.id,
      pathItems: getTaskPathItems(workspaceNodesRef.current, selectedTask),
    });
    setConversationRevision((revision) => revision + 1);
    setCreationSessionOpen(true);
    creationSessionCompleted.current = false;
    setActiveSection("conversation");
    focusPrimaryHeadingAfterNavigation("creation");
  };
  const closeTaskCreation = () => {
    const parentTaskId = creationParentContext?.parentTaskId;
    setCreationSessionOpen(false);
    setCreationParentContext(null);
    if (parentTaskId && workspaceNodesRef.current.some(node => node.kind === "task" && node.id === parentTaskId)) openTask(parentTaskId);
    else showTaskList();
  };
  const selectCreationPath = (nodeId: string) => {
    setCreationSessionOpen(false);
    setCreationParentContext(null);
    if (nodeId === workspaceRootId) showTaskList();
    else openTask(nodeId);
  };
  const selectedTaskMock = selectedTaskId && selectedTreeTask?.kind === "task"
    ? taskDetailMocks[selectedTaskId as TaskDetailId] ?? getTeamTaskDetailFixture(selectedTreeTask)
    : undefined;
  const selectedLegacyTask = selectedTaskId ? legacyTaskSnapshots[selectedTaskId] : undefined;
  // 示例原文只使用首次快照；当前字段编辑不能重写已有事件、提交或文件名称。
  const selectedTaskSeedNode = taskDetailSeedNodes.find((node) => node.id === selectedTaskId);
  const customTaskDetail: TaskDetailMock | undefined = selectedTaskId && selectedTreeTask?.kind === "task" && !selectedTaskMock ? !selectedLegacyTask ? createWorkspaceTaskDetail(selectedTaskSeedNode ?? selectedTreeTask) : {
    activities: [{ id: `${selectedTaskId}-created`, author: "TaskDoor AI", message: "此任务来自已停用的旧创建流程；原有文件、成员与父子任务关系已保留。", time: "历史记录", type: "ai-insight" }],
    commits: [],
    due: selectedLegacyTask.plannedStartOn && selectedLegacyTask.plannedEndOn ? formatPeriodLabel(selectedLegacyTask.plannedStartOn, selectedLegacyTask.plannedEndOn) : selectedTreeTask.dueAt ?? "—",
    files: selectedLegacyTask.contextIds.map((sourceId) => {
      const source = legacyTaskSources.find((item) => item.id === sourceId);
      return {
        content: source?.snippet ?? "这是旧任务记录中保留的资料引用。",
        format: source?.type === "data" ? "DATA" : source?.type === "task" ? "TASK" : source?.type === "change" ? "PATCH" : source?.title.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX",
        id: `${selectedTaskId}-${sourceId}`,
        kind: "file" as const,
        name: source?.title ?? sourceId,
        parentId: null,
        updatedAt: "创建时引用",
      };
    }),
    goal: selectedTreeTask.goal ?? selectedLegacyTask.goal,
    iconName: selectedTreeTask.iconName,
    iconTone: selectedTreeTask.iconTone,
    owner: selectedTreeTask.ownerId,
    participantInvitationStatus: Object.fromEntries(selectedLegacyTask.participants.map((id) => [id, "accepted" as const])),
    participants: selectedLegacyTask.participants.filter((id) => id !== selectedTreeTask.ownerId),
    status: selectedTreeTask.status,
    summary: "任务已保留；当前继续围绕目标、文件和活动推进。",
    title: selectedTreeTask.name,
  } : undefined;
  const rawTaskDetailBase = customTaskDetail ?? selectedTaskMock;
  const selectedTaskDetailBase: TaskDetailMock | undefined = rawTaskDetailBase && selectedTaskId
    ? withCreatedProjectProgressDetail(rawTaskDetailBase, selectedTaskId, createdProjectProgressDemo) : rawTaskDetailBase;
  const selectedTaskPeriodOverride = selectedTaskId ? taskPeriodOverrides[selectedTaskId] : undefined;
  const selectedParticipants = selectedTaskDetailBase && selectedTreeTask?.kind === "task"
    ? (selectedLegacyTask?.participants ?? selectedTreeTask.participantIds ?? selectedTaskDetailBase.participants).filter((id) => id !== selectedTreeTask.ownerId)
    : selectedTaskDetailBase?.participants ?? [];
  const selectedParticipantInvitationStatus: ParticipantInvitationStatuses = Object.fromEntries(selectedParticipants.map((id) => [id,
    "accepted",
  ]));
  const seedActivityIds = new Set(selectedTaskDetailBase?.activities.map((activity) => activity.id));
  const selectedTaskDetail = selectedTaskDetailBase && selectedTaskId && selectedTreeTask?.kind === "task" ? projectTaskCollaboration(activeTeamId, selectedTaskId, {
    ...selectedTaskDetailBase,
    completionCriteria: selectedTreeTask.completionCriteria,
    criterionReviews: selectedTreeTask.criterionReviews,
    executionTips: selectedTreeTask.executionTips ?? selectedTaskDetailBase.executionTips,
    activities: [
      ...(taskActivityStore[selectedTaskId] ?? []).filter((activity) => !seedActivityIds.has(activity.id)),
      ...selectedTaskDetailBase.activities,
    ],
    due: selectedTaskPeriodOverride === null ? "—" : selectedTaskPeriodOverride ? formatPeriodLabel(selectedTaskPeriodOverride.start, selectedTaskPeriodOverride.end) : selectedTreeTask.dueAt ?? selectedTaskDetailBase.due,
    goal: selectedParentTask ? getTaskDefinitionGoal(teamWorkspaceNodes, selectedTreeTask) : selectedTreeTask.goal ?? selectedTaskDetailBase.goal,
    iconName: selectedTreeTask.iconName,
    iconTone: selectedTreeTask.iconTone,
    owner: selectedTreeTask.ownerId,
    participantInvitationStatus: selectedParticipantInvitationStatus,
    participants: selectedParticipants,
    status: selectedTreeTask.status,
    title: selectedTreeTask.name,
  }) : undefined;
  const directChildTaskCounts = useMemo(() => getDirectChildTaskCounts(teamWorkspaceNodes), [teamWorkspaceNodes]);
  const selectedChildTasks = selectedTaskId ? teamWorkspaceNodes
    .filter((node): node is TaskNode => node.kind === "task" && node.parentTaskId === selectedTaskId)
    .map((node) => {
      const childTaskCount = directChildTaskCounts.get(node.id);
      return {
        ...toTaskRelationSummary(withProgressDates(node)),
        ...(childTaskCount ? { childTaskCount } : {}),
      };
    }) : [];
  const selectedDiagnosisTasks = teamWorkspaceNodes
    .filter((node): node is TaskNode => node.kind === "task")
    .map((node) => {
      const period = taskPeriodOverrides[node.id];
      const seed = taskDetailSeedNodes.find((item) => item.id === node.id) ?? node;
      const detail = (node.id === selectedTaskId ? selectedTaskDetail : undefined)
        ?? taskDetailMocks[node.id as TaskDetailId] ?? getTeamTaskDetailFixture(seed) ?? createWorkspaceTaskDetail(seed);
      const recorded = taskActivityStore[node.id] ?? [];
      const recordedIds = new Set(recorded.map((item) => item.id));
      return {
        context: buildTaskDiagnosisContext(node.id, projectTaskCollaboration(activeTeamId, node.id, {
          ...detail,
          goal: getTaskDefinitionGoal(teamWorkspaceNodes, node),
          completionCriteria: node.completionCriteria ?? [],
          activities: [...(taskActivityStore[node.id] ?? []), ...detail.activities.filter((item) => !recordedIds.has(item.id))],
        }), window.localStorage),
        decisionConflicts: taskDetailMocks[node.id as TaskDetailId]?.diagnosis?.decisionConflicts
          ?? getTeamTaskDiagnosisSnapshot(node)?.decisionConflicts,
        dependsOnTaskIds: node.dependsOnTaskIds,
        dueAt: period === null ? undefined : period ? formatPeriodLabel(period.start, period.end) : node.dueAt,
        id: node.id,
        parentTaskId: node.parentTaskId,
        status: node.status,
        title: node.name,
      };
    });
  const selectedDependencyTaskIds = selectedTreeTask?.kind === "task" ? selectedTreeTask.dependsOnTaskIds ?? [] : [];
  const selectedDependencyTasks = teamWorkspaceNodes
    .filter((node): node is TaskNode => node.kind === "task" && selectedDependencyTaskIds.includes(node.id))
    .map(toTaskRelationSummary);
  const availableDependencyTasks = teamWorkspaceNodes
    .filter((node): node is TaskNode => node.kind === "task")
    .map(toTaskRelationSummary);
  const taskCreationExistingTasks = teamWorkspaceNodes
    .filter((node): node is TaskNode => node.kind === "task")
    .map(({ id, name, ownerId, status, goal, dueAt, labels, parentTaskId, plannedStartOn, plannedEndOn, iconName, iconTone, updatedAt }) => ({
      id,
      name,
      ownerId,
      status,
      goal,
      dueAt,
      labels,
      parentTaskId,
      plannedStartOn,
      plannedEndOn,
      iconName,
      iconTone,
      updatedAt,
      childTaskNames: teamWorkspaceNodes
        .filter((node): node is TaskNode => node.kind === "task" && node.parentTaskId === id)
        .map((node) => node.name),
    }));

  const getSelectedTask = () => workspaceNodesRef.current.find((node): node is TaskNode => node.kind === "task" && node.id === selectedTaskId);

  const changeTaskTitle = (name: string) => {
    const task = getSelectedTask();
    if (task) changeTaskFields(task.id, { name }, "title-change", "修改任务名称", [{ label: "任务名称", before: task.name || null, after: name || null }]);
  };

  const changeTaskGoal = (goal: string) => {
    const task = getSelectedTask();
    if (task) changeTaskFields(task.id, { goal }, "goal-change", "修改任务目标", [{ label: "任务目标", before: task.goal ?? selectedTaskDetail?.goal ?? null, after: goal || null }]);
  };

  const changeTaskAppearance = (appearance: { iconName: TaskIconName; iconTone: TaskIconTone }) => {
    const task = getSelectedTask();
    if (!task) return;
    const iconLabel = (value: TaskIconName) => taskIconOptions.find((option) => option.value === value)?.label ?? value;
    const toneLabel = (value: TaskIconTone) => taskIconToneOptions.find((option) => option.value === value)?.label ?? value;
    changeTaskFields(task.id, appearance, "appearance-change", "修改任务外观", [
      { label: "图标", before: iconLabel(task.iconName ?? "list-todo"), after: iconLabel(appearance.iconName) },
      { label: "背景色", before: toneLabel(task.iconTone ?? "neutral"), after: toneLabel(appearance.iconTone) },
    ]);
  };

  const changeTaskTags = (taskId: string, labels: string[]) => {
    const task = workspaceNodesRef.current.find((node): node is TaskNode => node.kind === "task" && node.id === taskId);
    if (!task) return;
    const tagsValue = (values: string[]) => [...new Set(values)].sort().join("、") || null;
    changeTaskFields(taskId, { labels }, "tags-change", "修改任务标签", [{ label: "标签", before: tagsValue(task.labels ?? []), after: tagsValue(labels) }]);
  };

  // A freshly invited person may be persisted before this render's members update.
  const memberActivityLabel = (id: string) => getTeamPeople(loadPersonalCenterState().teams.find(team => team.id === activeTeamId), collaborationMembers).find(member => member.id === id)?.name ?? id;

  const changeOwner = (ownerIds: string[]) => {
    const task = getSelectedTask();
    if (!task) return;
    const ownerId = ownerIds[0] ?? "";
    changeTaskFields(task.id, { ownerId }, "owner-change", ownerId ? "修改任务负责人" : "清空任务负责人", [{ label: "负责人", before: task.ownerId ? memberActivityLabel(task.ownerId) : null, after: ownerId ? memberActivityLabel(ownerId) : null }]);
  };

  const changeParticipants = (participants: string[]) => {
    const task = getSelectedTask();
    if (!task) return;
    const previous = (selectedLegacyTask?.participants ?? task.participantIds ?? selectedTaskDetail?.participants ?? []).filter((id) => id !== task.ownerId);
    const next = [...new Set(participants.filter((id) => id !== task.ownerId))];
    const added = next.filter((id) => !previous.includes(id));
    const removed = previous.filter((id) => !next.includes(id));
    if (!added.length && !removed.length) return;
    const changes: TaskActivityChange[] = [
      ...added.map((id) => ({ label: "新增参与人", before: null, after: memberActivityLabel(id) })),
      ...removed.map((id) => ({ label: "移除参与人", before: memberActivityLabel(id), after: null })),
    ];
    changeTaskFields(task.id, selectedLegacyTask ? {} : { participantIds: next }, "participants-change", "更新任务参与人", changes);
    if (selectedLegacyTask) updateLegacyTaskSnapshot(task.id, { participants: next });
    const statuses: ParticipantInvitationStatuses = Object.fromEntries(next.map((id) => [id, "accepted"]));
    setTaskParticipantInvitationOverrides((current) => ({ ...current, [task.id]: statuses }));
  };

  const changeTaskPeriod = (range: TaskDateRange | null) => {
    const task = getSelectedTask();
    if (!task) return;
    const scheduleError = taskScheduleError(range?.end, task.createdAt, range?.start);
    if (scheduleError) throw new Error(scheduleError);
    const previousStart = taskDateValue(selectedTaskPeriodOverride === undefined ? task.plannedStartOn ?? selectedLegacyTask?.plannedStartOn : selectedTaskPeriodOverride?.start);
    const previousEnd = taskDateValue(selectedTaskPeriodOverride === undefined ? task.plannedEndOn ?? selectedLegacyTask?.plannedEndOn ?? task.dueAt ?? selectedTaskDetail?.due : selectedTaskPeriodOverride?.end);
    const nextStart = range?.start || null;
    const nextEnd = range?.end || null;
    if (previousStart === nextStart && previousEnd === nextEnd) return;
    changeTaskFields(task.id, { dueAt: range ? formatDateLabel(range.end) : "—", plannedEndOn: range?.end, plannedStartOn: range?.start }, "schedule-change", "修改任务时间", [
      { label: "开始时间", before: previousStart, after: nextStart },
      { label: "截止时间", before: previousEnd, after: nextEnd },
    ]);
    setTaskPeriodOverrides((current) => ({ ...current, [task.id]: range }));
    if (selectedLegacyTask) updateLegacyTaskSnapshot(task.id, { plannedEndOn: range?.end, plannedStartOn: range?.start });
  };

  const effectiveAiNodes = (nodes: WorkspaceNode[]) => nodes.map(node => {
    if (node.kind !== "task") return node;
    const legacy = legacyTaskSnapshots[node.id];
    const period = taskPeriodOverrides[node.id];
    return {
      ...node,
      ...(legacy ? { participantIds: legacy.participants, plannedStartOn: node.plannedStartOn ?? legacy.plannedStartOn, plannedEndOn: node.plannedEndOn ?? legacy.plannedEndOn } : {}),
      ...(period !== undefined ? { plannedStartOn: period?.start, plannedEndOn: period?.end, dueAt: period ? formatPeriodLabel(period.start, period.end) : "—" } : {}),
    };
  });
  const selectedAiAdjustmentContext = selectedTaskId ? createSavedTaskAiContext(effectiveAiNodes(teamWorkspaceNodes), selectedTaskId, collaborationMembers, currentUserId) : null;
  // Resolve the same saved dates used by the task's deadline field, including legacy labels.
  // Empty dates are explicit so the progress view cannot substitute fixture scheduling dates.
  function withProgressDates(task: TaskNode): TaskNode {
    const period = taskPeriodOverrides[task.id];
    const legacy = legacyTaskSnapshots[task.id];
    return {...task,
      plannedStartOn: period !== undefined ? period?.start ?? "" : task.plannedStartOn ?? legacy?.plannedStartOn ?? "",
      plannedEndOn: period !== undefined ? period?.end ?? "" : taskDateValue(task.plannedEndOn ?? legacy?.plannedEndOn ?? task.dueAt) ?? "",
    };
  }
  const selectedEffortTasks = selectedTaskId ? getWorkspaceEffortLeaves(teamWorkspaceNodes, selectedTaskId).map(task => {
    const estimate = createdProjectProgressDemo.estimates[task.id];
    const canUseDemoEstimate = !task.effortEstimate || task.effortEstimate.basis === "unknown"
      || task.effortEstimate.basis === "mock" && task.effortEstimate.minutes === null;
    return withProgressDates(estimate && canUseDemoEstimate ? { ...task, effortEstimate: estimate } : task);
  }) : [];
  const selectedCompletedEffortMinutes = selectedTaskId ? getTaskAcceptedEffortMinutes(selectedTaskId) : {};

  const reanalyzePersonalWorkbench = async () => {
    if (workbenchAnalysisInFlight.current) return;
    workbenchAnalysisInFlight.current = true;
    setWorkbenchAnalyzing(true);
    setWorkbenchAnalysisError("");
    try {
      await runAgentdoorReanalysis({ analyze: () => setWorkbenchAsOf(new Date().toISOString()) });
    } catch {
      setWorkbenchAnalysisError("重新分析失败，当前结果未更新，请重试。");
    } finally {
      workbenchAnalysisInFlight.current = false;
      setWorkbenchAnalyzing(false);
    }
  };

  const personalWorkbenchModel = useMemo(() => {
    const tasks = effectiveAiNodes(teamWorkspaceNodes)
      .filter((node): node is TaskNode => node.kind === "task");
    const seeds = new Map(taskDetailSeedNodes.map(task => [task.id, task]));
    const detailsByTaskId = Object.fromEntries(tasks.map(task => {
      const base = taskDetailMocks[task.id as TaskDetailId] ?? getTeamTaskDetailFixture(task) ?? createWorkspaceTaskDetail(seeds.get(task.id) ?? task);
      const seedIds = new Set(base.activities.map(activity => activity.id));
      return [task.id, {
        ...base,
        activities: [...(taskActivityStore[task.id] ?? []).filter(activity => !seedIds.has(activity.id)), ...base.activities],
      }];
    }));
    return buildPersonalWorkbenchModel({
      tasks, currentUserId, asOf: workbenchAsOf, detailsByTaskId,
      recordedActivitiesByTaskId: taskActivityStore,
    });
  }, [teamWorkspaceNodes, legacyTaskSnapshots, taskPeriodOverrides, taskDetailSeedNodes, taskActivityStore, workbenchAsOf]);
  const workbenchAiConnectionRequest = useMemo(() => buildPersonalWorkbenchAiConnectionRequest(personalWorkbenchModel), [personalWorkbenchModel]);

  const persistTaskDefinition = (next: ReturnType<typeof applyCurrentTaskCriteria>) => {
    if (!next.activity) return;
    const taskId = next.original.id;
    const nextActivities = appendTaskActivity(taskActivityStore, taskId, next.activity);
    const nextSeeds = taskDetailSeedNodesRef.current.some(node => node.id === taskId)
      ? taskDetailSeedNodesRef.current : [...taskDetailSeedNodesRef.current, { ...next.original }];
    try {
      commitTaskAiStorage(localStorage, [
        [workspaceNodesStorageKey, JSON.stringify(next.nodes)],
        [taskActivityStorageKey, JSON.stringify(nextActivities)],
        [taskDetailSeedsStorageKey, JSON.stringify(nextSeeds)],
      ]);
    } catch (caught) {
      try { recoverTaskAiStorage(localStorage); }
      catch (error) { setTaskStorageRecoveryError(error instanceof Error ? error.message : "本地记录需要恢复。"); }
      throw caught;
    }
    workspaceNodesRef.current = next.nodes;
    taskDetailSeedNodesRef.current = nextSeeds;
    setWorkspaceNodes(next.nodes);
    setTaskActivityStore(nextActivities);
    setTaskDetailSeedNodes(nextSeeds);
  };

  const saveSubtaskCriteria = (taskId: string, values: string[], expected: string[]) => {
    if (taskStorageRecoveryError) throw new Error(taskStorageRecoveryError);
    if (!selectedTaskId) throw new Error("请先选择主任务。");
    persistTaskDefinition(applySavedTaskCriteria(workspaceNodesRef.current, selectedTaskId, taskId, expected, values, currentUserName));
  };

  const saveTaskCriteria = (values: string[], expected: string[]) => {
    if (taskStorageRecoveryError) throw new Error(taskStorageRecoveryError);
    if (!selectedTaskId) throw new Error("请先选择任务。");
    persistTaskDefinition(applyCurrentTaskCriteria(workspaceNodesRef.current, selectedTaskId, expected, values, currentUserName));
  };

  const saveTaskDependencies = (values: string[], expected: string[]) => {
    if (taskStorageRecoveryError) throw new Error(taskStorageRecoveryError);
    if (!selectedTaskId) throw new Error("请先选择任务。");
    const visibleIds = getTeamWorkspaceNodes(activeTeamId, workspaceNodesRef.current).filter(node => node.kind === "task").map(node => node.id);
    persistTaskDefinition(applyTaskDependencies(workspaceNodesRef.current, selectedTaskId, expected, values, currentUserName, visibleIds));
  };

  const applyTaskAiAdjustment = (proposal: TaskAiAdjustmentProposal) => {
    if (taskStorageRecoveryError) throw new Error(taskStorageRecoveryError);
    if (!selectedTaskId) throw new Error("请先选择要调整的任务。");
    const currentNodes = workspaceNodesRef.current;
    const effectiveNodes = effectiveAiNodes(currentNodes);
    const context = createSavedTaskAiContext(effectiveNodes, selectedTaskId, collaborationMembers, currentUserId);
    if (!context) throw new Error("任务已不存在，请返回列表。");
    const next = applySavedTaskAiAdjustment(currentNodes, context, proposal, { author: currentUserName, effectiveNodes });
    if (!next.affectedIds.length) return;
    let nextActivities = taskActivityStore;
    for (const [taskId, activities] of Object.entries(next.activities)) for (const activity of activities) nextActivities = appendTaskActivity(nextActivities, taskId, activity);
    const nextSeeds = [...taskDetailSeedNodesRef.current];
    for (const id of next.affectedIds) {
      const original = currentNodes.find((node): node is TaskNode => node.kind === "task" && node.id === id);
      if (original && !nextSeeds.some(seed => seed.id === id)) nextSeeds.push({ ...original });
    }
    const nextPeriods = { ...taskPeriodOverrides };
    const nextLegacy = { ...legacyTaskSnapshots };
    let legacyChanged = false;
    for (const { taskId, patch } of proposal.updates) {
      const node = next.nodes.find((item): item is TaskNode => item.kind === "task" && item.id === taskId)!;
      if (patch.endDate !== undefined || patch.startDate !== undefined) {
        delete nextPeriods[taskId];
      }
      if (nextLegacy[taskId]) {
        nextLegacy[taskId] = {
          ...nextLegacy[taskId],
          ...(patch.title !== undefined ? { title: node.name } : {}),
          ...(patch.goal !== undefined ? { goal: node.goal ?? "" } : {}),
          ...(patch.ownerId ? { ownerId: patch.ownerId, proposedOwnerId: undefined, ownerAssignmentStatus: "confirmed" as const } : {}),
          ...(patch.endDate !== undefined || patch.startDate !== undefined ? { plannedStartOn: node.plannedStartOn, plannedEndOn: node.plannedEndOn } : {}),
        };
        legacyChanged = true;
      }
    }
    const writes: Array<[string, string]> = [
      [workspaceNodesStorageKey, JSON.stringify(next.nodes)],
      [taskActivityStorageKey, JSON.stringify(nextActivities)],
      [taskDetailSeedsStorageKey, JSON.stringify(nextSeeds)],
      [taskOwnerProposalsStorageKey, JSON.stringify({})],
      ...(legacyChanged ? [["agentdoor-created-tasks", JSON.stringify(nextLegacy)] as [string, string]] : []),
    ];
    try { commitTaskAiStorage(localStorage, writes); }
    catch (caught) {
      try { recoverTaskAiStorage(localStorage); }
      catch (recoveryError) { setTaskStorageRecoveryError(recoveryError instanceof Error ? recoveryError.message : "本地记录需要恢复，暂时停止编辑。"); }
      throw caught;
    }
    workspaceNodesRef.current = next.nodes;
    taskDetailSeedNodesRef.current = nextSeeds;
    setWorkspaceNodes(next.nodes);
    setTaskActivityStore(nextActivities);
    setTaskDetailSeedNodes(nextSeeds);
    setTaskOwnerProposals({});
    setTaskPeriodOverrides(nextPeriods);
    if (legacyChanged) { setLegacyTaskSnapshots(nextLegacy); setLegacyTaskSnapshotsDirty(true); }
  };

  return (
    <MockDataProvider tasks={additionalMockTasks}><MemberInvitationProvider ref={memberInvitationsRef} state={personalCenterState} onStateChange={setPersonalCenterState} teamId={activeTeamId} members={collaborationMembers}>
    <PersonDirectoryProvider members={collaborationMembers}>
    <PersonalTagsProvider tags={tagDefinitions} onChange={savePersonalTags}>
    <div className="app-shell task-workspace-shell">
      <WorkspaceTopbar
        activeTeamId={activeTeamId}
        onConnectAi={() => setGlobalAiConnectionOpen(true)}
        onSignOut={signOutWorkspace}
        showDemoNotifications={showDemoData}
        onOpenNotificationTask={(taskId) => {
          setTaskQuery("");
          setTaskFilters(createInitialTaskListFilters(currentUserId));
          setTaskAttentionTarget(null);
          openTask(taskId, false);
        }}
        onOpenPersonalCenter={(module) => openPersonalCenter(module)}
        onTeamChange={changeActiveTeam}
        teams={personalCenterState.teams}
        theme={theme}
        toggleTheme={() => setTheme((current) => current === "light" ? "dark" : "light")}
        userId={currentUserId}
        userProfile={personalCenterState.profile}
      />

      <PersonalCenterModal activeModule={personalCenterModule} activeTeamId={activeTeamId} members={collaborationMembers} onActiveTeamChange={changeActiveTeam} onModuleChange={setPersonalCenterModule} onOpenChange={changePersonalInfoOpen} onOpenEvidence={openTask} onStateChange={setPersonalCenterState} open={personalInfoOpen} state={personalCenterState} />

      <main className="main-content">
        {personalTagLoadError && <p role="alert">{personalTagLoadError}</p>}
        <TaskWorkspace
            currentUserId={currentUserId}
            filters={taskFilters}
            hidden={activeSection !== "home" && activeSection !== "tasks" && activeSection !== "conversation"}
            members={collaborationMembers}
            nodes={teamWorkspaceNodes}
            onCreateTask={startNewTaskConversation}
            onDeleteTask={requestDeleteTask}
            onFiltersChange={setTaskFilters}
            onManageTags={() => { setActiveSection("settings"); focusPrimaryHeadingAfterNavigation(); }}
            onQueryChange={setTaskQuery}
            onTaskSelect={(task) => openTask(task.id)}
            onShowWorkbench={() => showPrimarySection("tasks")}
            query={taskQuery}
            selectedTaskId={selectedTaskId}
            showingCreation={activeSection === "conversation"}
            showingWorkbench={activeSection === "home"}
            tagDefinitions={tagDefinitions}
            teamId={activeTeamId}
            workbench={<PersonalWorkbench
              analysisError={workbenchAnalysisError}
              analyzing={workbenchAnalyzing}
              currentUserName={currentUserName}
              hidden={activeSection !== "home"}
              model={personalWorkbenchModel}
              onConnectAi={(trigger) => { workbenchAiConnectionTrigger.current = trigger; setWorkbenchAiConnectionOpen(true); }}
              onOpenTask={(taskId) => { setTaskAttentionTarget(null); openTask(taskId); }}
              onOpenTaskList={showTaskList}
              onReanalyze={() => void reanalyzePersonalWorkbench()}
            />}
            creation={creationSessionOpen ? <TaskCreationExperience
              onCancel={closeTaskCreation}
              onDraftStart={() => { creationSessionCompleted.current = false; }}
              active={activeSection === "conversation"}
              creationParent={creationParentContext}
              currentUserId={currentUserId}
              teamId={activeTeamId}
              existingTasks={taskCreationExistingTasks}
              key={conversationRevision}
              members={collaborationMembers}
              onCreateTaskPlan={createTaskPlanFromConversation}
              onCreateSubtask={(parentTaskId, draft) => createTaskPlanFromConversation(draft, parentTaskId)}
              onOpenTask={openTask}
              onInviteMembers={(returnFocus) => openMemberInviteDialog(returnFocus)}
              onPathSelect={selectCreationPath}
              tags={tagDefinitions}
            /> : null}
        >
          {selectedTaskId && selectedTaskDetail ? (
          <TaskDetail
            key={`${activeTeamId}:${selectedTaskId}`}
            currentUserId={currentUserId}
            teamId={activeTeamId}
            aiAdjustmentContext={selectedAiAdjustmentContext}
            completedMinutesByTaskId={selectedCompletedEffortMinutes}
            effortTasks={selectedEffortTasks}
            progressComparisonsByTaskId={progressComparisons}
            onRepredict={() => refreshTaskPrediction(selectedTaskId)}
            progressTask={selectedTreeTask?.kind === "task" ? withProgressDates(selectedTreeTask) : undefined}
            recordedActivities={taskActivityStore[selectedTaskId] ?? []}
            childTasks={selectedChildTasks}
            dependencyTasks={selectedDependencyTasks}
            dependencyTaskIds={selectedDependencyTaskIds}
            availableDependencyTasks={availableDependencyTasks}
            onTaskDependenciesSave={saveTaskDependencies}
            currentUser={currentUserName}
            initialAttentionTarget={taskAttentionTarget}
            members={collaborationMembers}
            onFileSaved={() => touchTask(selectedTaskId)}
            onActivityAppend={(activity) => appendActivityForTask(selectedTaskId, activity)}
            onAiAdjustmentApply={applyTaskAiAdjustment}
            onCreateSubtask={startNewSubtaskConversation}
            onDeleteSubtask={requestDeleteSubtask}
            onSubtaskCriteriaSave={saveSubtaskCriteria}
            onTaskCriterionConfirm={(index, confirmed, expected) => {
              if (taskStorageRecoveryError) throw new Error(taskStorageRecoveryError);
              if (!selectedTaskId) throw new Error("No task selected");
              persistTaskDefinition(confirmTaskCriterion(workspaceNodesRef.current, selectedTaskId, expected, index, confirmed, currentUserName));
            }}
            onTaskCriteriaSave={saveTaskCriteria}
            onInitialAttentionTargetHandled={() => setTaskAttentionTarget(null)}
            onInviteMembers={(returnFocus) => openMemberInviteDialog(returnFocus)}
            onOpenRelatedTask={openTask}
            onOwnerChange={changeOwner}
            onParticipantsChange={changeParticipants}
            parentTask={selectedParentTask ? toTaskRelationSummary(selectedParentTask) : undefined}
            onBackToList={showTaskList}
            pathItems={selectedTaskPath}
            onPathSelect={(nodeId) => {
              const node = teamWorkspaceNodes.find((item) => item.id === nodeId);
              if (node?.kind === "task") {
                setTaskAttentionTarget(selectedTreeTask?.kind === "task" && selectedTreeTask.parentTaskId === node.id
                  ? { kind: "subtasks", targetId: selectedTreeTask.id } : null);
                openTask(node.id);
              } else {
                showTaskList();
              }
            }}
            task={selectedTaskDetail}
            taskId={selectedTaskId}
            plannedEndOn={selectedTaskPeriodOverride === undefined ? (selectedTreeTask?.kind === "task" ? selectedTreeTask.plannedEndOn : undefined) ?? selectedLegacyTask?.plannedEndOn : selectedTaskPeriodOverride?.end}
            plannedStartOn={selectedTaskPeriodOverride === undefined ? (selectedTreeTask?.kind === "task" ? selectedTreeTask.plannedStartOn : undefined) ?? selectedLegacyTask?.plannedStartOn : selectedTaskPeriodOverride?.start}
            tagDefinitions={tagDefinitions}
            tags={selectedTreeTask?.kind === "task" ? selectedTreeTask.labels ?? [] : []}
            onTaskStatusChange={selectedTreeTask?.kind === "task" ? (status) => {
              changeTaskStatus(selectedTaskId, status);
            } : undefined}
            onTaskAppearanceChange={changeTaskAppearance}
            onTaskGoalChange={changeTaskGoal}
            onTaskTitleChange={changeTaskTitle}
            onTaskPeriodChange={changeTaskPeriod}
            onTagsChange={(labels) => changeTaskTags(selectedTaskId, labels)}
          />
          ) : null}
        </TaskWorkspace>

        {activeSection === "ai" ? (
          <AiConnectionPage onBack={showTaskList} />
        ) : activeSection === "settings" ? (
          <TagManagementPage
            tags={tagDefinitions}
            onBack={showTaskList}
            onChange={savePersonalTags}
          />
        ) : null}

      </main>
      <Dialog onOpenChange={setGlobalAiConnectionOpen} open={globalAiConnectionOpen}>
        <DialogContent className="global-ai-guide-dialog" finalFocus={() => document.getElementById("workspace-ai-trigger") ?? false}>
          <header className="global-ai-guide-header">
            <DialogTitle>{ui("连接 AI")}</DialogTitle>
            <DialogDescription>{ui("安装并登录 TaskDoor CLI，在本地工具中继续工作。")}</DialogDescription>
          </header>
          <div className="global-ai-guide-body"><AiConnectionPage embedded /></div>
        </DialogContent>
      </Dialog>
      <TaskDeleteDialog
        open={Boolean(subtaskDeleteTarget)}
        preview={subtaskDeletion.preview}
        error={subtaskDeleteError || subtaskDeletion.error}
        disabled={Boolean(taskStorageRecoveryError)}
        onClose={() => { setSubtaskDeleteTarget(null); setSubtaskDeleteError(""); }}
        onConfirm={confirmDeleteSubtask}
        finalFocus={() => subtaskDeleteReturnFocus.current?.isConnected ? subtaskDeleteReturnFocus.current : document.getElementById(`task-subtasks-${selectedTaskId}`) ?? false}
      />
      <TaskDeleteDialog
        open={Boolean(taskDeleteTarget)}
        preview={taskDeletion.preview}
        error={taskDeleteError || taskDeletion.error}
        disabled={Boolean(taskStorageRecoveryError)}
        onClose={() => { setTaskDeleteTarget(null); setTaskDeleteError(""); }}
        onConfirm={confirmDeleteTask}
        finalFocus={() => document.getElementById("task-workspace-list-heading") ?? false}
      />
      {workbenchAiConnectionOpen && (
        <AiConnectionDialog
          onClose={() => setWorkbenchAiConnectionOpen(false)}
          request={workbenchAiConnectionRequest}
          returnFocus={workbenchAiConnectionTrigger.current}
        />
      )}
      {taskStorageRecoveryError && <Dialog open><DialogContent showCloseButton={false}><DialogTitle>先恢复本地任务记录</DialogTitle><DialogDescription>{taskStorageRecoveryError}</DialogDescription><p>当前未保存的输入已保留。恢复完成前，暂时停止其他编辑。</p><Button onClick={() => { try { recoverTaskAiStorage(localStorage); setTaskStorageRecoveryError(""); } catch (error) { setTaskStorageRecoveryError(error instanceof Error ? error.message : "恢复尚未完成，请检查浏览器存储后重试。"); } }} type="button">重试恢复</Button></DialogContent></Dialog>}
    </div>
    </PersonalTagsProvider>
    </PersonDirectoryProvider>
    </MemberInvitationProvider></MockDataProvider>
  );
}

/** Resolve unfinished task writes before any task state is read or rendered. */
export default function AppWithTaskRecovery() {
  const [recoveryError, setRecoveryError] = useState(() => {
    try { recoverTaskAiStorage(localStorage); return ""; }
    catch (error) { return error instanceof Error ? error.message : "本地任务记录暂时无法读取。"; }
  });
  if (!recoveryError) return <App />;
  return <main className="task-storage-recovery"><h1>本地任务记录需要恢复</h1><p role="alert">{recoveryError}</p><p>尚未加载任务，避免覆盖原记录。检查浏览器存储设置后可重试。</p><Button onClick={() => { try { recoverTaskAiStorage(localStorage); setRecoveryError(""); } catch (error) { setRecoveryError(error instanceof Error ? error.message : "恢复未完成，请重试。"); } }} type="button">重试恢复</Button></main>;
}
