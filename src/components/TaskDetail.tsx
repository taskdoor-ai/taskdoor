import { AtSign, Check, ChevronRight, Plus, Send, Sparkles, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { type TaskActivityMock, type TaskDetailMock, type TaskFileNode } from "../data/taskDetailMocks";
import { type TagDefinition } from "../data/tagGroups";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { getTaskActivityItems, getTaskDetailTabForTarget, getTaskInsightSource, isDiscussionActivity } from "../lib/taskActivity";
import type { TaskAiAdjustmentContext, TaskAiAdjustmentProposal, TaskAiAdjustmentScope } from "../lib/taskAiAdjustmentTypes";
import { buildDiscussionAiRequest, type DiscussionAiTarget } from "../lib/taskDiscussionAi";
import { buildTaskAiConnectionRequest } from "../lib/taskAiConnection";
import { runAgentdoorReanalysis } from "../lib/agentdoorReanalysis";
import type { TaskEffortEstimate } from "../lib/taskEffort";
import { getTaskDiagnosisDescendants, getTaskDiagnosisReport, type TaskDiagnosisTask } from "../lib/taskDiagnosis";
import { buildTaskDiagnosisContext, type TaskDiagnosisFileSnapshot } from "../lib/taskDiagnosisContext";
import type { TaskEffortDistributionInput } from "../lib/taskEffortDistribution";
import { getTaskProgressAssessment } from "../lib/taskProgressAssessment";
import { createTaskMemberRecommendations } from "../lib/taskMemberRecommendations";
import { useResponsiveControlSize } from "../lib/useResponsiveControlSize";
import { TaskWorkloadSummary } from "./TaskWorkloadSummary";
import { getTaskSituationModel, type TaskSituationReference } from "../lib/taskSituation";
import { MemberSelector, type Member } from "./MemberSelector";
import { AiConnectionDialog, type AiConnectionRequest } from "./AiConnectionDialog";
import { PersonAvatar, PersonName, type PersonInvitationStatus } from "./PersonAvatar";
import { TaskTagList } from "./TaskTagList";
import { TaskActivityFileLink } from "./TaskActivityFileLink";
import { TaskActivityLog } from "./TaskActivityLog";
import { TaskAppearancePicker } from "./TaskAppearancePicker";
import { TaskCompletionCriteria } from "./TaskCompletionCriteria";
import { TaskCurrentSituation } from "./TaskCurrentSituation";
import type { TaskDateRange } from "./TaskDateRangePicker";
import { TaskDiscussion } from "./TaskDiscussion";
import { TaskDiagnosisReport } from "./TaskDiagnosisReport";
import { TaskDueDatePicker } from "./TaskDueDatePicker";
import { TaskIcon } from "./TaskIcon";
import type { TaskRelationSummary } from "./TaskRelationsSection";
import { TaskStatusBadge, type TaskStatus } from "./TaskStatusBadge";
import { TaskSubtaskList } from "./TaskSubtaskList";
import { TaskDependenciesField } from "./TaskDependenciesField";
import { TaskAiAdjustmentPopover, useTaskAiAdjustmentDrafts } from "./TaskAiAdjustmentPopover";
import { Textarea } from "./ui/input";
import { Button } from "./ui/button";
import { TaskFileExplorer } from "./task-files/TaskFileExplorer";
import type { TaskFileTextSelection } from "./task-files/TaskFileViewer";
import "../styles/task-records.css";
import "../styles/task-heading.css";
import "../styles/task-ai-adjustment.css";
import "../styles/task-criteria-editor.css";
import "../styles/task-situation.css";
import "../styles/task-effort.css";
import "../styles/task-diagnosis.css";
import "../styles/task-subtask-editing.css";

export type TaskAttentionTarget = {
  kind: "activity" | "commit" | "file" | "insight" | "criteria" | "subtasks" | "details" | "discussion";
  targetId: string;
};

type TaskDetailTab = "discussion" | "subtasks" | "diagnosis" | "files" | "activity";

type TaskDetailProps = {
  aiAdjustmentContext?: TaskAiAdjustmentContext | null;
  completedMinutesByTaskId?: Readonly<Record<string, number | null>>;
  effortTasks?: TaskEffortDistributionInput[];
  recordedActivities?: TaskActivityMock[];
  onTaskEffortChange?: (estimate: TaskEffortEstimate, expectedSignature: string) => void | Promise<void>;
  onTaskCriteriaSave?: (values: string[], expected: string[]) => void | Promise<void>;
  childTasks?: TaskRelationSummary[];
  parentTask?: TaskRelationSummary;
  dependencyTasks?: TaskRelationSummary[];
  dependencyTaskIds?: string[];
  availableDependencyTasks?: TaskRelationSummary[];
  onTaskDependenciesSave?: (values: string[], expected: string[]) => void | Promise<void>;
  diagnosisTasks?: TaskDiagnosisTask[];
  currentUser?: string;
  initialAttentionTarget?: TaskAttentionTarget | null;
  initialProposedOwnerId?: string;
  members: Member[];
  onActivityAppend?: (activity: TaskActivityMock) => void;
  onAiAdjustmentApply?: (proposal: TaskAiAdjustmentProposal) => void | Promise<void>;
  onSubtaskCriteriaSave?: (taskId: string, values: string[], expected: string[]) => void | Promise<void>;
  onCreateSubtask?: () => void;
  onDeleteSubtask?: (taskId: string, returnFocus?: HTMLElement | null) => void;
  onInitialAttentionTargetHandled?: () => void;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
  onOpenRelatedTask?: (taskId: string) => void;
  onOwnerChange?: (owner: string[]) => void;
  onOwnerProposalChange?: (ownerId?: string) => void;
  onParticipantsChange?: (participants: string[]) => void;
  onPathSelect?: (nodeId: string) => void;
  onTagsChange?: (tags: string[]) => void;
  onTaskGoalChange?: (goal: string) => void;
  onTaskTitleChange?: (title: string) => void;
  onTaskAppearanceChange?: (appearance: { iconName: TaskIconName; iconTone: TaskIconTone }) => void;
  onTaskPeriodChange?: (range: TaskDateRange | null) => void;
  onTaskStatusChange?: (status: TaskStatus) => void;
  pathItems?: Array<{ id: string; label: string }>;
  plannedEndOn?: string;
  plannedStartOn?: string;
  tagDefinitions?: TagDefinition[];
  tags?: string[];
  task: TaskDetailMock;
  taskId: string;
};

function toDateInputValue(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized === "—" || normalized.includes("未设置") || normalized.includes("待排期")) return "";
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const date = new Date();
  if (normalized.includes("今天")) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  const chineseDateMatch = normalized.match(/(\d+)\s*月\s*(\d+)\s*日/);
  if (!chineseDateMatch) return "";
  return `${date.getFullYear()}-${String(Number(chineseDateMatch[1])).padStart(2, "0")}-${String(Number(chineseDateMatch[2])).padStart(2, "0")}`;
}

export function TaskDetail({
  aiAdjustmentContext,
  completedMinutesByTaskId,
  effortTasks = [],
  recordedActivities = [],
  childTasks = [],
  dependencyTasks = [],
  dependencyTaskIds,
  availableDependencyTasks,
  onTaskDependenciesSave,
  diagnosisTasks,
  currentUser = "周岚",
  initialAttentionTarget = null,
  initialProposedOwnerId,
  members,
  onActivityAppend,
  onAiAdjustmentApply,
  onSubtaskCriteriaSave,
  onTaskCriteriaSave,
  onCreateSubtask,
  onDeleteSubtask,
  onInitialAttentionTargetHandled,
  onInviteMembers,
  onOpenRelatedTask,
  onOwnerChange,
  onOwnerProposalChange,
  onParticipantsChange,
  onPathSelect,
  onTagsChange,
  onTaskGoalChange,
  onTaskTitleChange,
  onTaskAppearanceChange,
  onTaskPeriodChange,
  onTaskStatusChange,
  parentTask,
  pathItems,
  plannedEndOn,
  tagDefinitions = [],
  tags = [],
  task,
  taskId,
}: TaskDetailProps) {
  const completionCriteria = task.completionCriteria ?? [];
  const burnUp = task.burnUp;
  const progressAssessment = getTaskProgressAssessment(burnUp, effortTasks);
  const hasBurnUp = progressAssessment.hasTrend;
  const firstFile = task.files.find((node) => node.kind === "file");
  const fileCount = task.files.filter((node) => node.kind === "file").length;
  const [localActivities, setLocalActivities] = useState<TaskActivityMock[]>([]);
  const activities = useMemo(() => [...localActivities, ...task.activities], [localActivities, task.activities]);
  const initialTab: TaskDetailTab = getTaskDetailTabForTarget(activities, initialAttentionTarget);

  const [activeTab, setActiveTab] = useState<TaskDetailTab>(initialTab);
  const [currentOwner, setCurrentOwner] = useState([task.owner]);
  const [pendingOwnerId, setPendingOwnerId] = useState(initialProposedOwnerId);
  const [currentParticipants, setCurrentParticipants] = useState(task.participants);
  const [participantInvitationStatus, setParticipantInvitationStatus] = useState<Record<string, PersonInvitationStatus>>(() => Object.fromEntries(task.participants.map((id) => [id, task.participantInvitationStatus?.[id] ?? "accepted"])));
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const progressNeedsReview = currentStatus === "已完成" && progressAssessment.progressRatio !== null && progressAssessment.progressRatio < 1;
  const [selectedFileId, setSelectedFileId] = useState(initialAttentionTarget?.kind === "file" ? initialAttentionTarget.targetId : firstFile?.id ?? "");
  const [selectionDraft, setSelectionDraft] = useState<{ location: string; source: string; text: string; x: number; y: number } | null>(null);
  const [selectionQuestion, setSelectionQuestion] = useState("");
  const [activityMention, setActivityMention] = useState("");
  const [sourceRecord, setSourceRecord] = useState<TaskActivityMock | null>(null);
  const [attentionMessage, setAttentionMessage] = useState("");
  const [situationAttentionId, setSituationAttentionId] = useState<string>();
  const [discussionAttention, setDiscussionAttention] = useState<{ id: string; sequence: number }>();
  const [aiConnectionRequest, setAiConnectionRequest] = useState<{ taskId: string; request: AiConnectionRequest } | null>(null);
  const aiConnectionTrigger = useRef<HTMLElement | null>(null);
  const connectionButtonSize = useResponsiveControlSize();
  const [currentTitle, setCurrentTitle] = useState(task.title);
  const [currentGoal, setCurrentGoal] = useState(task.goal);
  const [aiScope, setAiScope] = useState<TaskAiAdjustmentScope | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const aiDraftSession = useTaskAiAdjustmentDrafts();
  const [aiNotice, setAiNotice] = useState("");
  const aiReturnFocus = useRef<HTMLElement | null>(null);
  const [diagnosisAnalyzing, setDiagnosisAnalyzing] = useState(false);
  const [diagnosisAnalysisError, setDiagnosisAnalysisError] = useState("");
  const [diagnosisAnalysisSnapshot, setDiagnosisAnalysisSnapshot] = useState<{ signature: string; checkedAt: string }>();
  const diagnosisAnalysisInFlight = useRef(false);
  const [diagnosisFileSnapshot, setDiagnosisFileSnapshot] = useState<TaskDiagnosisFileSnapshot>();

  useEffect(() => {
    setDiagnosisAnalyzing(false);
    setDiagnosisAnalysisError("");
    setDiagnosisAnalysisSnapshot(undefined);
    setDiagnosisFileSnapshot(undefined);
  }, [task.diagnosis?.checkedAt, taskId]);

  useEffect(() => { setCurrentTitle(task.title); }, [task.title]);
  useEffect(() => { setCurrentGoal(task.goal); }, [task.goal]);
  useEffect(() => { setCurrentOwner([task.owner]); }, [task.owner]);
  useEffect(() => { setPendingOwnerId(initialProposedOwnerId); }, [initialProposedOwnerId]);
  const participantSignature = JSON.stringify(task.participants);
  const invitationSignature = JSON.stringify(task.participantInvitationStatus ?? {});
  useEffect(() => {
    setCurrentParticipants(task.participants);
    setParticipantInvitationStatus(Object.fromEntries(task.participants.map(id => [id, task.participantInvitationStatus?.[id] ?? "pending"])));
  }, [participantSignature, invitationSignature]);

  const openAiAdjustment = (scope: TaskAiAdjustmentScope, returnFocus?: HTMLElement | null) => {
    if (!aiAdjustmentContext || !onAiAdjustmentApply) return;
    aiReturnFocus.current = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setAiScope(scope); setAiOpen(true); setAiNotice("");
  };
  const applyAiAdjustment = async (proposal: TaskAiAdjustmentProposal) => {
    if (!onAiAdjustmentApply) throw new Error("当前任务不可进行 AI 调整。");
    await onAiAdjustmentApply(proposal);
    setAiNotice("修改已保存，并记录到任务活动。");
  };

  useEffect(() => {
    setCurrentStatus(task.status);
  }, [task.status]);

  const confirmedOwnerId = currentOwner[0] ?? task.owner;
  const displayedOwnerId = pendingOwnerId ?? confirmedOwnerId;
  const ownerInvitationStatus = displayedOwnerId ? { [displayedOwnerId]: pendingOwnerId ? "pending" as const : "accepted" as const } : {};
  const participantMembers = useMemo(() => members.filter((member) => !currentOwner.includes(member.id)), [currentOwner, members]);
  const memberRecommendations = useMemo(() => createTaskMemberRecommendations({ members, taskText: `${currentTitle} ${currentGoal} ${tags.join(" ")}` }), [currentGoal, currentTitle, members, tags]);
  const activityPeople = Array.from(new Set([currentOwner[0] ?? task.owner, ...currentParticipants].filter(Boolean)));
  const taskActivityItems = getTaskActivityItems(activities, task.commits);
  const discussionCount = activities.filter(isDiscussionActivity).length;
  const diagnosisDescendantTasks = diagnosisTasks ? getTaskDiagnosisDescendants(diagnosisTasks, taskId) : childTasks;
  const situation = getTaskSituationModel({
    taskId,
    task: { ...task, activities, status: currentStatus, owner: confirmedOwnerId },
    ownerName: confirmedOwnerId ? members.find(member => member.id === confirmedOwnerId)?.name.trim() || "负责人" : "",
    childTasks,
    dependencyTasks,
    dependencyTaskIds,
    recordedActivities: [...localActivities, ...recordedActivities],
  });
  const diagnosisInput = {
    task: {
      id: taskId, title: currentTitle, status: currentStatus, dueAt: plannedEndOn ?? task.due,
      context: {
        ...(diagnosisTasks?.find((item) => item.id === taskId)?.context ?? buildTaskDiagnosisContext(taskId, task, typeof window === "undefined" ? undefined : window.localStorage)),
        ...diagnosisFileSnapshot,
        goal: currentGoal, completionCriteria, activities, commits: task.commits,
      },
    },
    descendantTasks: diagnosisDescendantTasks,
    dependencyTaskIds: dependencyTaskIds ?? dependencyTasks.map((item) => item.id),
    dependencyTasks: diagnosisTasks ?? dependencyTasks,
    decisionConflicts: task.diagnosis?.decisionConflicts,
  };
  const diagnosisSignature = JSON.stringify(diagnosisInput);
  const diagnosisReport = getTaskDiagnosisReport({
    ...diagnosisInput,
    checkedAt: diagnosisAnalysisSnapshot?.signature === diagnosisSignature ? diagnosisAnalysisSnapshot.checkedAt : undefined,
  });

  const reanalyzeDiagnosis = async () => {
    if (diagnosisAnalysisInFlight.current) return;
    diagnosisAnalysisInFlight.current = true;
    setDiagnosisAnalyzing(true);
    setDiagnosisAnalysisError("");
    try {
      await runAgentdoorReanalysis({ analyze: () => {
        getTaskDiagnosisReport(diagnosisInput);
        setDiagnosisAnalysisSnapshot({ signature: diagnosisSignature, checkedAt: new Date().toISOString() });
      } });
    } catch {
      setDiagnosisAnalysisError("重新分析失败，当前结果未更新，请重试。");
    } finally {
      diagnosisAnalysisInFlight.current = false;
      setDiagnosisAnalyzing(false);
    }
  };

  const openTaskAiConnection = (trigger: HTMLElement) => {
    const request = buildTaskAiConnectionRequest({
      taskId, currentUser, pendingOwnerId, due: plannedEndOn ?? task.due, tags, parentTask,
      task: { ...task, title: currentTitle, goal: currentGoal, owner: confirmedOwnerId, participants: currentParticipants, participantInvitationStatus, status: currentStatus, activities },
    });
    aiConnectionTrigger.current = trigger;
    setAiConnectionRequest({ taskId, request });
  };

  const openDiscussionAi = (target: DiscussionAiTarget, trigger: HTMLElement) => {
    const request = buildDiscussionAiRequest({ taskId, currentUser, target, task: { ...task, activities, title: currentTitle, goal: currentGoal, status: currentStatus } });
    if (!request) { setAttentionMessage("这条讨论或回复暂不可用，请核对当前记录。"); return; }
    aiConnectionTrigger.current = trigger;
    setAiConnectionRequest({ taskId, request });
  };
  const closeAiConnection = () => {
    setAiConnectionRequest(null);
    // The discussion stays mounted, so closing the dialog does not discard its draft.
  };

  useEffect(() => {
    if (!initialAttentionTarget) return;
    const tab = getTaskDetailTabForTarget(activities, initialAttentionTarget);
    setActiveTab(tab);
    setAttentionMessage("");
    if (initialAttentionTarget.kind === "details" || initialAttentionTarget.kind === "discussion") {
      const timer = window.setTimeout(() => {
        const target = document.getElementById(initialAttentionTarget.kind === "details" ? `task-heading-${taskId}` : "task-detail-panel-discussion");
        target?.scrollIntoView({ block: "nearest" });
        target?.focus({ preventScroll: true });
        onInitialAttentionTargetHandled?.();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (initialAttentionTarget.kind === "criteria" || initialAttentionTarget.kind === "subtasks") {
      const timer = window.setTimeout(() => {
        if (initialAttentionTarget.kind === "criteria") {
          const criteria = document.getElementById(`task-criteria-${taskId}`);
          if (criteria) {
            criteria.scrollIntoView({ block: "nearest" });
            criteria.focus({ preventScroll: true });
          }
        } else {
          const tab = document.getElementById("task-detail-tab-subtasks");
          tab?.scrollIntoView({ block: "nearest" });
          tab?.focus({ preventScroll: true });
        }
        onInitialAttentionTargetHandled?.();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const record = activities.find((item) => item.id === initialAttentionTarget.targetId);
    if (record && isDiscussionActivity(record)) setDiscussionAttention(previous => ({ id: record.id, sequence: (previous?.sequence ?? 0) + 1 }));
    const isInsight = initialAttentionTarget.kind === "insight" || record?.type === "ai-insight";
    if (isInsight) {
      const source = getTaskInsightSource(activities, initialAttentionTarget.targetId);
      setSourceRecord(source);
      if (!source) setAttentionMessage("这条历史建议暂不可用，任务讨论和变更记录仍可查看。");
    } else {
      setSourceRecord(null);
    }
    if (initialAttentionTarget.kind === "file") {
      setSelectedFileId(initialAttentionTarget.targetId);
    }
    const timer = window.setTimeout(() => {
      const targetId = isInsight ? "task-source-record" : initialAttentionTarget.kind === "file" ? `task-file-preview-${initialAttentionTarget.targetId}` : `task-${initialAttentionTarget.kind}-${initialAttentionTarget.targetId}`;
      const target = document.getElementById(targetId);
      if (!target && !isInsight) setAttentionMessage("这条记录暂不可用，可继续查看当前任务的讨论和变更。");
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
      onInitialAttentionTargetHandled?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activities, initialAttentionTarget, onInitialAttentionTargetHandled, taskId]);

  const changeOwner = (value: string[]) => {
    const nextOwnerId = value[0];
    if (!nextOwnerId) {
      if (pendingOwnerId) {
        setPendingOwnerId(undefined);
        onOwnerProposalChange?.(undefined);
        return;
      }
      setCurrentOwner([""]);
      setPendingOwnerId(undefined);
      onOwnerChange?.([]);
      onOwnerProposalChange?.(undefined);
      return;
    }
    if (onOwnerProposalChange) {
      const proposal = nextOwnerId === (currentOwner[0] ?? task.owner) ? undefined : nextOwnerId;
      setPendingOwnerId(proposal);
      onOwnerProposalChange(proposal);
      return;
    }
    setCurrentOwner(value);
    setCurrentParticipants((items) => items.filter((id) => !value.includes(id)));
    setParticipantInvitationStatus((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !value.includes(id))));
    onOwnerChange?.(value);
  };

  const changeParticipants = (value: string[]) => {
    setParticipantInvitationStatus((current) => Object.fromEntries(value.map((id) => [id, current[id] ?? "pending"])));
    setCurrentParticipants(value);
    onParticipantsChange?.(value);
  };

  const changeStatus = (value: TaskStatus) => {
    if (!onTaskStatusChange) return;
    setCurrentStatus(value);
    onTaskStatusChange(value);
  };

  const appendActivity = (message: string, replyToActivityId?: string) => {
    if (!message.trim()) return;
    const now = new Date();
    const activity: TaskActivityMock = {
      id: crypto.randomUUID(),
      author: currentUser,
      createdAt: now.toISOString(),
      message: message.trim(),
      time: now.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }),
      type: replyToActivityId ? "member-reply" : "member-post",
      ...(replyToActivityId ? { replyToActivityId } : {}),
    };
    if (onActivityAppend) onActivityAppend(activity);
    else setLocalActivities((items) => [activity, ...items]);
  };

  const openFile = (id: string) => {
    if (!task.files.some((file) => file.id === id && file.kind === "file" && !file.archived)) {
      setAttentionMessage("这个文件暂不可用，可继续查看讨论和任务变更。");
      return;
    }
    setAttentionMessage("");
    setSelectedFileId(id);
    setActiveTab("files");
    window.setTimeout(() => document.getElementById(`task-file-preview-${id}`)?.focus({ preventScroll: true }), 0);
  };

  const openSituationReference = (reference: TaskSituationReference) => {
    setAttentionMessage("");
    if (reference.kind === "details") {
      const details = document.getElementById(`task-heading-${taskId}`);
      details?.scrollIntoView({ block: "nearest" });
      details?.focus({ preventScroll: true });
      return;
    }
    if (reference.kind === "discussion") {
      setActiveTab("discussion");
      window.setTimeout(() => {
        const discussion = document.getElementById("task-detail-panel-discussion");
        discussion?.scrollIntoView({ block: "start" });
        discussion?.focus({ preventScroll: true });
      }, 0);
      return;
    }
    if (reference.kind === "task") {
      if (reference.id === taskId) {
        setActiveTab("activity");
        window.setTimeout(() => document.getElementById("task-detail-tab-activity")?.focus(), 0);
      } else if (reference.id && onOpenRelatedTask && (
        childTasks.some(item => item.id === reference.id)
        || dependencyTasks.some(item => item.id === reference.id)
        || pathItems?.some(item => item.id === reference.id)
      )) onOpenRelatedTask(reference.id);
      else setAttentionMessage("关联任务暂不可用，可继续查看当前记录。");
      return;
    }
    if (reference.kind === "criteria") {
      const criteria = document.getElementById(`task-criteria-${taskId}`);
      if (criteria) {
        criteria.scrollIntoView({ block: "nearest" });
        criteria.focus({ preventScroll: true });
      }
      return;
    }
    if (reference.kind === "file" && reference.id) {
      openFile(reference.id);
      window.setTimeout(() => document.getElementById("task-detail-panel-files")?.scrollIntoView({ block: "start" }), 0);
      return;
    }
    if (reference.kind === "subtasks") {
      setActiveTab("subtasks");
      window.setTimeout(() => {
        const tab = document.getElementById("task-detail-tab-subtasks");
        tab?.scrollIntoView({ block: "nearest" });
        tab?.focus({ preventScroll: true });
      }, 0);
      return;
    }
    const activity = activities.find(item => item.id === reference.id);
    if (!activity || activity.type === "ai-insight") {
      setAttentionMessage("这条依据暂不可用，请核对当前任务记录。");
      return;
    }
    setActiveTab(isDiscussionActivity(activity) ? "discussion" : "activity");
    if (isDiscussionActivity(activity)) setDiscussionAttention(previous => ({ id: activity.id, sequence: (previous?.sequence ?? 0) + 1 }));
    setSituationAttentionId(activity.id);
    window.setTimeout(() => {
      const target = document.getElementById(`task-activity-${activity.id}`);
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
    }, 0);
  };

  const openActivityDiscussion = (activityId: string) => {
    const activity = activities.find((item) => item.id === activityId);
    if (!activity || !isDiscussionActivity(activity)) {
      setAttentionMessage("这条讨论暂不可用，请核对当前任务记录。");
      return;
    }
    setAttentionMessage("");
    setActiveTab("discussion");
    setDiscussionAttention(previous => ({ id: activity.id, sequence: (previous?.sequence ?? 0) + 1 }));
    window.setTimeout(() => {
      const target = document.getElementById(`task-activity-${activity.id}`);
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
    }, 0);
  };

  const captureFileSelection = (file: TaskFileNode, fileSelection?: TaskFileTextSelection) => {
    const selection = window.getSelection();
    const text = fileSelection?.text.trim() || selection?.toString().trim();
    if (!text || file.kind !== "file") return;
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const rect = fileSelection?.rect ?? range?.getBoundingClientRect();
    if (!rect) return;
    setSelectionDraft({
      location: fileSelection?.location ?? "文件正文选区",
      source: file.name,
      text: text.slice(0, 600),
      x: Math.max(12, Math.min(window.innerWidth - 414, rect.left)),
      y: Math.max(12, Math.min(window.innerHeight - 220, rect.bottom + 10)),
    });
  };

  const publishSelectionActivity = () => {
    if (!selectionDraft) return;
    const mention = activityMention ? `@${activityMention} ` : "";
    const question = selectionQuestion.trim() || "这段信息会影响当前结论，请确认应该如何处理。";
    appendActivity(`${mention}${question}\n\n引用「${selectionDraft.source}」：${selectionDraft.text}`);
    setSelectionDraft(null);
    setSelectionQuestion("");
    setActivityMention("");
    window.getSelection()?.removeAllRanges();
    setActiveTab("discussion");
  };

  const tabs: Array<{ count?: number; id: TaskDetailTab; label: string }> = [
    { count: discussionCount, id: "discussion", label: "讨论" },
    { count: diagnosisReport.findings.length, id: "diagnosis", label: "诊断" },
    { count: childTasks.length, id: "subtasks", label: "子任务" },
    { count: fileCount, id: "files", label: "文件" },
    { count: taskActivityItems.length, id: "activity", label: "活动" },
  ];

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: TaskDetailTab) => {
    const currentIndex = tabs.findIndex((item) => item.id === currentTab);
    const nextIndex = event.key === "ArrowRight"
      ? (currentIndex + 1) % tabs.length
      : event.key === "ArrowLeft"
        ? (currentIndex - 1 + tabs.length) % tabs.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    window.requestAnimationFrame(() => document.getElementById(`task-detail-tab-${nextTab.id}`)?.focus({ preventScroll: true }));
  };

  return <section className="task-detail-view">
    <header className="task-detail-header" data-tone={task.iconTone ?? "neutral"}>
      <div className="task-detail-kicker">{pathItems?.length ? <nav aria-label="任务路径" className="task-detail-path">{pathItems.map((item, index) => <span key={item.id}>
        {index > 0 && <ChevronRight aria-hidden="true" size={12} />}
        {index < pathItems.length - 1 ? <button onClick={() => onPathSelect?.(item.id)} type="button">{item.label}</button> : <em aria-current="page">{item.label}</em>}
      </span>)}</nav> : null}</div>
      <div className="task-detail-hero-card" data-current-situation data-tone={task.iconTone ?? "neutral"}>
        <div aria-label="任务信息" className="task-detail-heading-main" id={`task-heading-${taskId}`} tabIndex={-1}>
          <div className="task-detail-heading-copy">
            <div className="task-detail-title-row">
              {onTaskAppearanceChange ? <TaskAppearancePicker iconName={task.iconName} onChange={onTaskAppearanceChange} tone={task.iconTone} /> : <TaskIcon iconName={task.iconName} size="lg" tone={task.iconTone} />}
              <h1><Textarea aria-label="任务名称" className="task-detail-title-input" onBlur={() => { if (currentTitle !== task.title) onTaskTitleChange?.(currentTitle); }} onChange={(event) => setCurrentTitle(event.target.value.replace(/[\r\n]+/g, " "))} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.blur(); } }} rows={1} value={currentTitle} /></h1>
              <div className="task-ai-detail-tools"><Button aria-haspopup="dialog" aria-label="连接 AI：当前任务" onClick={event => openTaskAiConnection(event.currentTarget)} size={connectionButtonSize === "touch" ? "icon-touch" : "icon-sm"} title="连接 AI" type="button" variant="ai"><Sparkles aria-hidden="true" size={15} /></Button></div>
            </div>
            <div className="task-detail-description">
              <div className="task-detail-goal-field"><span className="task-detail-field-label">目标</span><Textarea aria-label="任务目标" className="task-detail-goal-input" onBlur={() => { if (!aiAdjustmentContext?.task.goalInherited && currentGoal !== task.goal) onTaskGoalChange?.(currentGoal); }} onChange={(event) => setCurrentGoal(event.target.value)} placeholder="尚未设置任务目标" readOnly={aiAdjustmentContext?.task.goalInherited} rows={1} value={currentGoal} /></div>
              <div aria-label="完成标准" id={`task-criteria-${taskId}`} key={`criteria-${taskId}`} tabIndex={-1}>
                <TaskCompletionCriteria criteria={completionCriteria} onSave={onTaskCriteriaSave} source="recorded" />
              </div>
              <TaskDependenciesField dependencyIds={dependencyTaskIds ?? dependencyTasks.map(task => task.id)} key={`dependencies-${taskId}`} onOpenTask={onOpenRelatedTask} onSave={onTaskDependenciesSave} taskId={taskId} tasks={availableDependencyTasks ?? dependencyTasks} />
            </div>
          </div>
        </div>
        <div aria-label="任务属性" className="task-detail-properties">
          <div className="task-detail-property"><small>负责人</small><MemberSelector allowUnassigned={!displayedOwnerId} disabled={!onOwnerChange && !onOwnerProposalChange} hideHeader hideSelectedName invitationStatusById={ownerInvitationStatus} label="负责人" max={1} memberRecommendations={memberRecommendations} members={members} min={0} onChange={changeOwner} onInviteMembers={onInviteMembers} selected={displayedOwnerId ? [displayedOwnerId] : []} /></div>
          <div className="task-detail-property"><small>参与人</small><MemberSelector displayMax={4} hideHeader hideSelectedName invitationStatusById={participantInvitationStatus} label="参与人" memberRecommendations={memberRecommendations} members={participantMembers} onChange={changeParticipants} onInviteMembers={onInviteMembers} selected={currentParticipants} stacked /></div>
          <div className="task-detail-property task-detail-status-field"><small>状态</small><TaskStatusBadge editable={Boolean(onTaskStatusChange)} onChange={changeStatus} value={currentStatus} /></div>
            <TaskDueDatePicker initialValue={plannedEndOn ?? toDateInputValue(task.due)} key={`due-${taskId}`} label="截止时间" onChange={(endDate) => onTaskPeriodChange?.(endDate ? { end: endDate, start: "" } : null)} />
          <TaskTagList key={`tags-${taskId}`} onChange={onTagsChange} selected={tags} tags={tagDefinitions} />
        </div>
        <TaskCurrentSituation hasBurnUp={hasBurnUp} key={`situation-${taskId}`} model={situation} onOpenReference={openSituationReference} trend={<TaskWorkloadSummary completedMinutesByTaskId={completedMinutesByTaskId} key={taskId} effortTasks={effortTasks} hasSubtasks={childTasks.length > 0} onOpenTask={onOpenRelatedTask} needsReview={progressNeedsReview} series={burnUp} />} trendLabel="完成进度与燃起图" />
      </div>
    </header>

    {aiNotice && <p className="task-ai-inline-notice" role="status"><Check aria-hidden="true" size={14} />{aiNotice}<button aria-label="关闭调整提示" onClick={() => setAiNotice("")} type="button"><X size={13} /></button></p>}

    <div aria-label="任务详情" className="task-detail-tabs" role="tablist">{tabs.map(({ count, id, label }) => <button
      aria-controls={`task-detail-panel-${id}`}
      aria-selected={activeTab === id}
      className={activeTab === id ? "active" : ""}
      id={`task-detail-tab-${id}`}
      key={id}
      onClick={() => setActiveTab(id)}
      onKeyDown={(event) => handleTabKeyDown(event, id)}
      role="tab"
      tabIndex={activeTab === id ? 0 : -1}
      type="button"
    ><span>{label}</span>{count !== undefined && <small>{count}</small>}</button>)}</div>

    {attentionMessage && <p className="task-attention-message" role="status">{attentionMessage}</p>}
    {sourceRecord && <aside aria-label="历史建议来源" className="task-source-record" id="task-source-record" tabIndex={-1}>
      <header><strong>历史 AI 建议</strong><time dateTime={Number.isFinite(Date.parse(sourceRecord.createdAt ?? "")) ? sourceRecord.createdAt : undefined}>{!Number.isFinite(Date.parse(sourceRecord.createdAt ?? "")) && "原时间："}{sourceRecord.time}</time><button aria-label="关闭来源记录" onClick={() => setSourceRecord(null)} type="button"><X size={15} /></button></header>
      <p>{sourceRecord.message}</p><small>仅展示原引用，不计入讨论或任务活动。</small>
      {sourceRecord.file && <TaskActivityFileLink fileId={task.files.find((file) => file.kind === "file" && !file.archived && file.name === sourceRecord.file)?.id} fileName={sourceRecord.file} onOpen={openFile} />}
    </aside>}

    <section aria-labelledby="task-detail-tab-discussion" className="task-detail-section task-discussion-panel first-section" hidden={activeTab !== "discussion"} id="task-detail-panel-discussion" role="tabpanel" tabIndex={-1}>
      <TaskDiscussion activities={activities} attentionTarget={discussionAttention} currentUser={currentUser} files={task.files} key={taskId} onConnectAi={openDiscussionAi} onOpenFile={openFile} onPost={appendActivity} people={activityPeople} />
    </section>

      <section aria-labelledby="task-detail-tab-diagnosis" className="task-detail-section task-diagnosis-panel first-section" hidden={activeTab !== "diagnosis"} id="task-detail-panel-diagnosis" role="tabpanel" tabIndex={-1}>
        <TaskDiagnosisReport
          analysisError={diagnosisAnalysisError}
          analyzing={diagnosisAnalyzing}
          onReanalyze={() => void reanalyzeDiagnosis()}
          report={diagnosisReport}
        />
      </section>

      <section aria-labelledby="task-detail-tab-subtasks" className="task-detail-section task-subtask-list-section first-section" hidden={activeTab !== "subtasks"} id="task-detail-panel-subtasks" role="tabpanel">
      <div className="task-section-heading task-ai-module-heading task-subtask-heading">
        <div><h2>子任务（{childTasks.length}）</h2></div>
        <div className="task-subtask-heading-actions">
          {onCreateSubtask && <Button onClick={onCreateSubtask} size="sm" type="button"><Plus aria-hidden="true" size={14} />新增子任务</Button>}
        </div>
      </div>
      <TaskSubtaskList dependencyTasks={availableDependencyTasks} onOpenTask={onOpenRelatedTask} tasks={childTasks} />
    </section>

      <section aria-labelledby="task-detail-tab-files" className="task-detail-section task-files-panel first-section" hidden={activeTab !== "files"} id="task-detail-panel-files" role="tabpanel">
      <TaskFileExplorer currentUser={currentUser} files={task.files} focusedFileId={selectedFileId} key={taskId} onFilesChange={setDiagnosisFileSnapshot} onSelectText={captureFileSelection} taskId={taskId} />
      {selectionDraft && <div className="selection-discussion-composer" style={{ left: selectionDraft.x, top: selectionDraft.y }}>
        <div className="selection-discussion-quote"><span><small>{selectionDraft.source} · {selectionDraft.location}</small><q>{selectionDraft.text}</q></span></div>
        <div className="selection-discussion-body">
          <div className="selection-discussion-mentions"><AtSign size={12} />{activityPeople.filter((person) => person !== currentUser).map((person) => <button aria-pressed={activityMention === person} className={activityMention === person ? "active" : ""} key={person} onClick={() => setActivityMention(activityMention === person ? "" : person)} type="button"><PersonAvatar name={person} personId={person} profilePreviewFocusable={false} size="xs" /><PersonName name={person} personId={person} /></button>)}</div>
          <input aria-label="围绕选中内容提出问题" onChange={(event) => setSelectionQuestion(event.target.value)} placeholder="你希望协作者确认什么？" value={selectionQuestion} />
          <button className="selection-discussion-send" onClick={publishSelectionActivity} type="button">发起对话<Send size={12} /></button>
          <button className="selection-discussion-cancel" onClick={() => { setSelectionDraft(null); setSelectionQuestion(""); window.getSelection()?.removeAllRanges(); }} type="button">取消</button>
        </div>
      </div>}
    </section>

    {activeTab === "activity" && <section aria-labelledby="task-detail-tab-activity" className="task-detail-section task-activity-section first-section" id="task-detail-panel-activity" role="tabpanel" tabIndex={-1}>
      <TaskActivityLog activities={activities} commits={task.commits} files={task.files} focusedTargetId={situationAttentionId ?? initialAttentionTarget?.targetId} onOpenDiscussion={openActivityDiscussion} onOpenFile={openFile} />
    </section>}

    {aiScope && aiAdjustmentContext && onAiAdjustmentApply && <TaskAiAdjustmentPopover anchor={aiReturnFocus.current} context={aiAdjustmentContext} draftSession={aiDraftSession} onApply={applyAiAdjustment} onOpenChange={setAiOpen} open={aiOpen} scope={aiScope} />}
    {aiConnectionRequest?.taskId === taskId && <AiConnectionDialog onClose={closeAiConnection} request={aiConnectionRequest.request} returnFocus={aiConnectionTrigger.current} />}
  </section>;
}
