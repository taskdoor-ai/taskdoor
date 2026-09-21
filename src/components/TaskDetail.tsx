import { useGlobalUi } from '../i18n/globalUi';
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu";
import "../styles/task-criterion-review.css";
import { useI18n } from '../i18n/I18nProvider';
import { mockTagName, mockPersonName } from '../i18n/mockContent';
import { useDetailCopy } from "../i18n/detailMessages";
import { MockTaskProvider, useMockText } from "../i18n/MockDataProvider";
import { taskCalendarDate } from "../lib/taskSchedule";
import { ArrowLeft, Check, ChevronRight, Plus, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { type TaskActivityMock, type TaskDetailMock, type TaskFileNode } from "../data/taskDetailMocks";
import { type TagDefinition } from "../data/tagGroups";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { getTaskDetailTabForTarget, getTaskInsightSource, isDiscussionActivity } from "../lib/taskActivity";
import type { TaskAiAdjustmentContext, TaskAiAdjustmentProposal, TaskAiAdjustmentScope } from "../lib/taskAiAdjustmentTypes";
import { buildDiscussionAiRequest, type DiscussionAiTarget } from "../lib/taskDiscussionAi";
import { buildTaskAiConnectionRequest } from "../lib/taskAiConnection";
import type { TaskEffortDistributionInput } from "../lib/taskEffortDistribution";
import type { TaskProgressContext } from "../lib/taskProgressDisplay";
import { getTaskProgressAssessment } from "../lib/taskProgressAssessment";
import { getTaskProgressDemoExample } from "../data/taskProgressDemo";
import type { TaskProgressComparisonSeries } from "../lib/taskProgressComparison";
import { createTaskMemberRecommendations } from "../lib/taskMemberRecommendations";
import { getTaskWorkloadProjection } from "../lib/taskWorkloadProjection";
import { TaskWorkloadSummary } from "./TaskWorkloadSummary";
import { TaskProgressRefresh } from "./TaskProgressRefresh";
import { getTaskSituationModel, type TaskSituationReference } from "../lib/taskSituation";
import { MemberSelector, type Member } from "./MemberSelector";
import { AiConnectionDialog, launchAiContext, type AiShortcutAttempt, type AiConnectionRequest } from "./AiConnectionDialog";
import { AiConnectionButton } from "./AiConnectionButton";
import { TaskTagList } from "./TaskTagList";
import { TaskActivityFileLink } from "./TaskActivityFileLink";
import { TaskActivityLog } from "./TaskActivityLog";
import { TaskAppearancePicker } from "./TaskAppearancePicker";
import { TaskCompletionCriteria } from "./TaskCompletionCriteria";
import { TaskCurrentSituation } from "./TaskCurrentSituation";
import type { TaskDateRange } from "./TaskDateRangePicker";
import { TaskDiscussion } from "./TaskDiscussion";
import { TaskDueDatePicker } from "./TaskDueDatePicker";
import { TaskIcon } from "./TaskIcon";
import type { TaskRelationSummary } from "./TaskRelationsSection";
import { TaskStatusBadge, type TaskStatus } from "./TaskStatusBadge";
import { TaskSubtaskList } from "./TaskSubtaskList";
import { TaskDependenciesField } from "./TaskDependenciesField";
import { FixedScrollThumb } from "./FixedScrollThumb";
import { TaskAiAdjustmentPopover, useTaskAiAdjustmentDrafts } from "./TaskAiAdjustmentPopover";
import { Textarea } from "./ui/input";
import { Button } from "./ui/button";
import { TaskFileExplorer } from "./task-files/TaskFileExplorer";
import { deleteCollaborationMessage, mergeCollaborationMessages, postCollaborationMessage, replaceCollaborationFiles, setFileThreadResolved, updateCollaborationMessage, type CollaborationMessage, type DiscussionDraft, type FileDiscussionThread } from "../lib/taskCollaboration";
import { useTaskCollaboration } from "../lib/useTaskCollaboration";
import "../styles/task-records.css";
import "../styles/discussion-messages.css";
import "../styles/discussion-composer.css";
import "../styles/task-file-discussions.css";
import "../styles/task-heading.css";
import "../styles/task-progress-comparison.css";
import "../styles/task-ai-adjustment.css";
import "../styles/task-criteria-editor.css";
import "../styles/task-situation.css";
import "../styles/task-effort.css";
import "../styles/task-subtask-editing.css";
import "../styles/task-detail-split.css";

export type TaskAttentionTarget = {
  kind: "activity" | "commit" | "file" | "insight" | "criteria" | "subtasks" | "details" | "discussion";
  targetId: string;
};

type TaskDetailTab = "information" | "discussion" | "files" | "activity";

type TaskDetailProps = {
  aiAdjustmentContext?: TaskAiAdjustmentContext | null;
  completedMinutesByTaskId?: Readonly<Record<string, number | null>>;
  effortTasks?: TaskEffortDistributionInput[];
  progressComparisonsByTaskId?: Readonly<Record<string, TaskProgressComparisonSeries | undefined>>;
  recordedActivities?: TaskActivityMock[];
  onTaskCriterionConfirm?: (index: number, confirmed: boolean, expected: string[]) => void | Promise<void>;
  onTaskCriteriaSave?: (values: string[], expected: string[]) => void | Promise<void>;
  childTasks?: TaskRelationSummary[];
  parentTask?: TaskRelationSummary;
  dependencyTasks?: TaskRelationSummary[];
  dependencyTaskIds?: string[];
  availableDependencyTasks?: TaskRelationSummary[];
  onTaskDependenciesSave?: (values: string[], expected: string[]) => void | Promise<void>;
  currentUser?: string;
  currentUserId?: string;
  teamId?: string;
  initialAttentionTarget?: TaskAttentionTarget | null;
  members: Member[];
  onFileSaved?: () => void;
  onActivityAppend?: (activity: TaskActivityMock) => void;
  onAiAdjustmentApply?: (proposal: TaskAiAdjustmentProposal) => void | Promise<void>;
  onSubtaskCriteriaSave?: (taskId: string, values: string[], expected: string[]) => void | Promise<void>;
  onCreateSubtask?: () => void;
  onDeleteSubtask?: (taskId: string, returnFocus?: HTMLElement | null) => void;
  onInitialAttentionTargetHandled?: () => void;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
  onOpenRelatedTask?: (taskId: string) => void;
  onOwnerChange?: (owner: string[]) => void;
  onParticipantsChange?: (participants: string[]) => void;
  onPathSelect?: (nodeId: string) => void;
  onBackToList?: () => void;
  onTagsChange?: (tags: string[]) => void;
  onTaskGoalChange?: (goal: string) => void;
  onTaskTitleChange?: (title: string) => void;
  onTaskAppearanceChange?: (appearance: { iconName: TaskIconName; iconTone: TaskIconTone }) => void;
  onTaskPeriodChange?: (range: TaskDateRange | null) => void;
  onTaskStatusChange?: (status: TaskStatus) => void;
  onRepredict?: () => Promise<void>;
  pathItems?: Array<{ id: string; label: string }>;
  plannedEndOn?: string;
  plannedStartOn?: string;
  progressTask?: TaskProgressContext;
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
  progressComparisonsByTaskId = {},
  recordedActivities = [],
  childTasks = [],
  dependencyTasks = [],
  dependencyTaskIds,
  availableDependencyTasks,
  onTaskDependenciesSave,
  currentUser = "周岚",
  currentUserId = currentUser,
  teamId = "demo",
  initialAttentionTarget = null,
  members,
  onFileSaved,
  onAiAdjustmentApply,
  onSubtaskCriteriaSave,
  onTaskCriteriaSave,
  onTaskCriterionConfirm,
  onCreateSubtask,
  onDeleteSubtask,
  onInitialAttentionTargetHandled,
  onInviteMembers,
  onOpenRelatedTask,
  onOwnerChange,
  onParticipantsChange,
  onPathSelect,
  onBackToList,
  onTagsChange,
  onTaskGoalChange,
  onTaskTitleChange,
  onTaskAppearanceChange,
  onTaskPeriodChange,
  onTaskStatusChange,
  onRepredict,
  parentTask,
  pathItems,
  plannedEndOn,
  progressTask,
  tagDefinitions = [],
  tags = [],
  task,
  taskId,
}: TaskDetailProps) {
  const ui = useGlobalUi();
  const { locale, autoTranslate, originalTasks, toggleTaskOriginal } = useI18n();
  const [editingOriginal, setEditingOriginal] = useState<"title" | "goal" | null>(null);
  const d = useDetailCopy();
  const completionCriteria = task.completionCriteria ?? [];
  const currentDependencyIds = dependencyTaskIds ?? dependencyTasks.map(item => item.id);
  const burnUp = task.burnUp;
  const progressAssessment = getTaskProgressAssessment(burnUp, effortTasks);
  const hasBurnUp = progressAssessment.hasTrend;
  const mock = useMockText();
  const collaboration = useTaskCollaboration(teamId, taskId, task.files);
  const taskFiles = collaboration.snapshot.files;
  const firstFile = taskFiles.find(node => node.kind === "file" && !node.archived);
  const allMessages = useMemo(() => mergeCollaborationMessages(task.activities, collaboration.snapshot.messages), [task.activities, collaboration.snapshot.messages]);
  const activities = useMemo(() => allMessages.filter(message => !message.fileThreadId), [allMessages]);
  const localActivities = collaboration.snapshot.messages.filter(message => !message.fileThreadId && !message.deletedAt);
  const initialTab = getTaskDetailTabForTarget(activities, initialAttentionTarget);
  const [activeTab, setDetailTab] = useState<TaskDetailTab>(
    !initialAttentionTarget || ["details", "criteria", "subtasks"].includes(initialAttentionTarget.kind) || initialTab === "subtasks" ? "information" : initialTab);
  const setActiveTab = (tab: TaskDetailTab | "subtasks") => setDetailTab(tab === "subtasks" ? "information" : tab);
  const [currentOwner, setCurrentOwner] = useState([task.owner]);
  const [currentParticipants, setCurrentParticipants] = useState(task.participants);
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const progressNeedsReview = currentStatus === "已完成" && progressAssessment.progressRatio !== null && progressAssessment.progressRatio < 1;
  const [selectedFileId, setSelectedFileId] = useState(initialAttentionTarget?.kind === "file" ? initialAttentionTarget.targetId : firstFile?.id ?? "");
  const [selectedFileVersion, setSelectedFileVersion] = useState<number>();
  const [fileFocusSequence, setFileFocusSequence] = useState(0);
  const [sourceRecord, setSourceRecord] = useState<TaskActivityMock | null>(null);
  const [attentionMessage, setAttentionMessage] = useState("");
  const [situationAttentionId, setSituationAttentionId] = useState<string>();
  const [discussionAttention, setDiscussionAttention] = useState<{ id: string; sequence: number }>();
  const [aiConnectionRequest, setAiConnectionRequest] = useState<{ taskId: string; request: AiConnectionRequest } | null>(null);
  const aiConnectionTrigger = useRef<HTMLElement | null>(null);
  const [currentTitle, setCurrentTitle] = useState(task.title);
  const [currentGoal, setCurrentGoal] = useState(task.goal);
  const [aiScope, setAiScope] = useState<TaskAiAdjustmentScope | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const aiDraftSession = useTaskAiAdjustmentDrafts();
  const [aiNotice, setAiNotice] = useState("");
  const aiReturnFocus = useRef<HTMLElement | null>(null);
  const documentScrollRef = useRef<HTMLElement>(null);

  useEffect(() => { setCurrentTitle(task.title); }, [task.title]);
  useEffect(() => { setCurrentGoal(task.goal); }, [task.goal]);
  useEffect(() => { setCurrentOwner([task.owner]); }, [task.owner]);
  const participantSignature = JSON.stringify(task.participants);
  useEffect(() => {
    setCurrentParticipants(task.participants);
  }, [participantSignature]);

  const openAiAdjustment = (scope: TaskAiAdjustmentScope, returnFocus?: HTMLElement | null) => {
    if (!aiAdjustmentContext || !onAiAdjustmentApply) return;
    aiReturnFocus.current = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setAiScope(scope); setAiOpen(true); setAiNotice("");
  };
  const applyAiAdjustment = async (proposal: TaskAiAdjustmentProposal) => {
    if (!onAiAdjustmentApply) throw new Error(d('aiUnavailable'));
    await onAiAdjustmentApply(proposal);
    setAiNotice(d('savedActivity'));
  };

  useEffect(() => {
    setCurrentStatus(task.status);
  }, [task.status]);

  const confirmedOwnerId = currentOwner[0] ?? task.owner;
  const displayedOwnerId = confirmedOwnerId;
  const displayedOwnerName = mockPersonName(locale, displayedOwnerId, members.find(member => member.id === displayedOwnerId)?.name || displayedOwnerId || d('noOwner'));
  const participantMembers = useMemo(() => members.filter((member) => !currentOwner.includes(member.id)), [currentOwner, members]);
  const memberRecommendations = useMemo(() => createTaskMemberRecommendations({ members, taskText: `${currentTitle} ${currentGoal} ${tags.join(" ")}` }), [currentGoal, currentTitle, members, tags]);
  const activityPeople = members.filter(member => member.membershipStatus !== "invited").map(member => member.id);
  const progressComparison = getTaskProgressDemoExample(taskId, progressComparisonsByTaskId[taskId]);
  const leafProgressComparisons = Object.fromEntries(effortTasks.filter(task => task.id).map(task => [task.id!, getTaskProgressDemoExample(task.id!, progressComparisonsByTaskId[task.id!])]));
  const workloadProjection = getTaskWorkloadProjection({ progressTask: { ...progressTask, status: currentStatus }, comparison: progressComparison,
    effortTasks, hasSubtasks: childTasks.length > 0, series: burnUp, completedMinutesByTaskId, progressComparisonsByTaskId: leafProgressComparisons });
  const situation = getTaskSituationModel({
    progress: workloadProjection.display,
    progressScopeState: workloadProjection.effort.state,
    taskId,
    task: { ...task, files: taskFiles, activities, status: currentStatus, owner: confirmedOwnerId },
    ownerName: confirmedOwnerId ? members.find(member => member.id === confirmedOwnerId)?.name.trim() || d('owner') : "",
    childTasks,
    dependencyTasks,
    dependencyTaskIds,
    recordedActivities: [...localActivities, ...recordedActivities],
  });

  const refreshAnalysis = async () => {
    if (!collaboration.reload()) throw new Error(d('analysisReadFailed'));
    if (currentStatus !== "已完成" && currentStatus !== "已取消") await onRepredict?.();
  };

  const openTaskAiConnection = (trigger: HTMLElement, shortcut?: AiShortcutAttempt) => {
    const request = buildTaskAiConnectionRequest({
      taskId, currentUser, due: plannedEndOn ?? task.due, tags, parentTask,
      task: { ...task, title: currentTitle, goal: currentGoal, owner: confirmedOwnerId, participants: currentParticipants, status: currentStatus, activities },
    });
    if (request.contextPreview) request.contextPreview.items = request.contextPreview.items.map(item => item.label === "标签"
      ? { ...item, value: tags.map(name => { const tag = tagDefinitions.find(tag => tag.name === name); return tag ? mockTagName(locale, tag.id, name) : name; }).join(locale === "en" ? ", " : "、") }
      : item);
    if (shortcut) return launchAiContext(request, shortcut.agent, shortcut.signal);
    aiConnectionTrigger.current = trigger;
    setAiConnectionRequest({ taskId, request });
  };

  const openDiscussionAi = (target: DiscussionAiTarget, trigger: HTMLElement, shortcut?: AiShortcutAttempt) => {
    const request = buildDiscussionAiRequest({ taskId, currentUser, target, tags,
      task: { ...task, activities, files: taskFiles, title: currentTitle, goal: currentGoal, status: currentStatus, owner: confirmedOwnerId, participants: currentParticipants, due: plannedEndOn ?? task.due },
    });
    if (!request) { setAttentionMessage(d('replyUnavailable')); return; }
    if (shortcut) return launchAiContext(request, shortcut.agent, shortcut.signal);
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
    if (["details", "criteria", "subtasks"].includes(initialAttentionTarget.kind)) {
      setActiveTab("information");
    }
    else setActiveTab(tab);
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
          const section = document.getElementById(`task-subtasks-${taskId}`);
          const target = section?.querySelector<HTMLButtonElement>(`button[data-task-id="${CSS.escape(initialAttentionTarget.targetId)}"]`) ?? section;
          target?.scrollIntoView({ block: "nearest" });
          target?.focus({ preventScroll: true });
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
      if (!source) setAttentionMessage(d('historyUnavailable'));
    } else {
      setSourceRecord(null);
    }
    if (initialAttentionTarget.kind === "file") {
      setSelectedFileId(initialAttentionTarget.targetId);
    }
    const timer = window.setTimeout(() => {
      const targetId = isInsight ? "task-source-record" : initialAttentionTarget.kind === "file" ? `task-file-preview-${initialAttentionTarget.targetId}` : `task-${initialAttentionTarget.kind}-${initialAttentionTarget.targetId}`;
      const target = document.getElementById(targetId);
      if (!target && !isInsight) setAttentionMessage(d('recordUnavailable'));
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
      onInitialAttentionTargetHandled?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activities, initialAttentionTarget, onInitialAttentionTargetHandled, taskId]);

  const changeOwner = (value: string[]) => {
    const nextOwnerId = value[0];
    if (!nextOwnerId) {
      setCurrentOwner([""]);
      onOwnerChange?.([]);
      return;
    }
    setCurrentOwner(value);
    setCurrentParticipants((items) => items.filter((id) => !value.includes(id)));
    onOwnerChange?.(value);
  };

  const changeParticipants = (value: string[]) => {
    setCurrentParticipants(value);
    onParticipantsChange?.(value);
  };

  const changeStatus = (value: TaskStatus) => {
    if (!onTaskStatusChange) return;
    setCurrentStatus(value);
    onTaskStatusChange(value);
  };

  const postDiscussion = (draft: DiscussionDraft, replyToActivityId?: string, thread?: FileDiscussionThread) => {
    const now = new Date();
    const message: CollaborationMessage = {
      id: crypto.randomUUID(), author: currentUserId, createdAt: now.toISOString(), message: draft.body.trim(),
      time: now.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }),
      type: replyToActivityId ? "member-reply" : "member-post", replyToActivityId,
      mentionedPrincipalIds: draft.mentions, quote: draft.quote, fileThreadId: thread?.id,
    };
    collaboration.commit(snapshot => postCollaborationMessage(snapshot, { message, attachments: draft.attachments, thread, contextMessages: allMessages, visiblePeople: members.filter(member => member.membershipStatus !== "invited") }));
  };
  const ownActor = (message: CollaborationMessage) => {
    if (message.author !== currentUserId && message.author !== currentUser) throw new Error(d('authorOnly'));
    return message.author;
  };
  const editDiscussion = (message: CollaborationMessage, draft: DiscussionDraft) => collaboration.commit(snapshot => updateCollaborationMessage(snapshot, message, ownActor(message), {
    message: draft.body.trim(), mentionedPrincipalIds: draft.mentions, quote: draft.quote,
    attachmentRefs: draft.attachments.map(file => message.attachmentRefs?.find(ref => ref.fileId === file.id) ?? { fileId: file.id, version: file.version ?? 1, name: file.name }),
  }, draft.attachments));
  const deleteDiscussion = (message: CollaborationMessage) => collaboration.commit(snapshot => deleteCollaborationMessage(snapshot, message, ownActor(message)));

  const openFile = (id: string, version?: number) => {
    if (!taskFiles.some((file) => file.id === id && file.kind === "file" && !file.archived)) {
      setAttentionMessage(d('fileUnavailable'));
      return;
    }
    setAttentionMessage("");
    setSelectedFileId(id);
    setSelectedFileVersion(version);
    setFileFocusSequence(value => value + 1);
    setActiveTab("files");
    window.setTimeout(() => document.getElementById(`task-file-preview-${id}`)?.focus({ preventScroll: true }), 0);
  };

  const openSituationReference = (reference: TaskSituationReference) => {
    setAttentionMessage("");
    if (reference.kind === "details") {
      setActiveTab("information");
      window.requestAnimationFrame(() => {
        const details = document.getElementById(`task-heading-${taskId}`);
        details?.scrollIntoView({ block: "nearest" });
        details?.focus({ preventScroll: true });
      });
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
      else setAttentionMessage(d('taskUnavailable'));
      return;
    }
    if (reference.kind === "criteria") {
      setActiveTab("information");
      window.requestAnimationFrame(() => {
        const criteria = document.getElementById(`task-criteria-${taskId}`);
        if (!criteria) return;
        criteria.scrollIntoView({ block: "nearest" });
        criteria.focus({ preventScroll: true });
      });
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
        const tab = document.getElementById(`task-subtasks-${taskId}`);
        tab?.scrollIntoView({ block: "nearest" });
        tab?.focus({ preventScroll: true });
      }, 0);
      return;
    }
    const activity = activities.find(item => item.id === reference.id);
    if (!activity || activity.type === "ai-insight") {
      setAttentionMessage(d('evidenceUnavailable'));
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
      setAttentionMessage(d('discussionUnavailable'));
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

  const tabs: Array<{ id: TaskDetailTab; label: string }> = [
    { id: "information", label: d("basicInformation") },
    { id: "discussion", label: d('discussion') },
    { id: "files", label: d('files') },
    { id: "activity", label: d('activity') },
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

  return <MockTaskProvider taskId={taskId}><section className="task-detail-view task-detail-split">
    <header className="task-detail-header" data-tone={task.iconTone ?? "neutral"}>
      <div className="task-detail-kicker">{onBackToList && <Button aria-label={d('backToList')} className="task-detail-back-to-list" onClick={onBackToList} size="icon-sm" type="button" variant="ghost"><ArrowLeft size={17}/></Button>}{pathItems?.length ? <nav aria-label={d('path')} className="task-detail-path">{pathItems.map((item, index) => <span key={item.id}>
        {index > 0 && <ChevronRight aria-hidden="true" size={12} />}
        {index < pathItems.length - 1 ? <button onClick={() => onPathSelect?.(item.id)} type="button">{item.label === "任务" ? d("task") : mock.field(item.id, "title", item.label)}</button> : <em aria-current="page">{item.label === "任务" ? d("task") : mock.field(item.id, "title", item.label)}</em>}
      </span>)}</nav> : null}</div>
            <div className="task-detail-title-row">
              {onTaskAppearanceChange ? <TaskAppearancePicker iconName={task.iconName} onChange={onTaskAppearanceChange} tone={task.iconTone} /> : <TaskIcon iconName={task.iconName} size="lg" tone={task.iconTone} />}
              <h1><Textarea readOnly={!onTaskTitleChange} aria-label={d('name')} className="task-detail-title-input" onFocus={() => setEditingOriginal("title")} onBlur={() => { setEditingOriginal(null); if (currentTitle !== task.title) onTaskTitleChange?.(currentTitle); }} onChange={(event) => setCurrentTitle(event.target.value.replace(/[\r\n]+/g, " "))} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.blur(); } }} rows={1} value={editingOriginal === "title" ? currentTitle : mock.field(taskId, "title", currentTitle)} /></h1>
              <div className="task-ai-detail-tools"><AiConnectionButton contextLabel={d('current')} key={taskId} onConnect={openTaskAiConnection} /><DropdownMenu><DropdownMenuTrigger aria-label={ui('任务阅读选项')} className="task-reading-menu"><MoreHorizontal size={18} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={!autoTranslate} onClick={() => toggleTaskOriginal(taskId)}>{originalTasks.has(taskId) ? ui('显示任务译文') : ui('查看任务原文')}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
            </div>
      {editingOriginal && <small className="content-editing-original">{ui("正在编辑原文")}</small>}
      <div aria-label={d('properties')} className="task-detail-primary-properties">
        <div className="task-detail-property task-detail-status-field"><small>{d('status')}</small><TaskStatusBadge editable={Boolean(onTaskStatusChange)} onChange={changeStatus} size="sm" value={currentStatus} /></div>
        <div aria-label={`${d("owner")}: ${displayedOwnerName}`} className="task-detail-property" role="group" title={displayedOwnerName}><small>{d('owner')}</small><MemberSelector avatarSize="sm" allowUnassigned={!displayedOwnerId} disabled={!onOwnerChange} hideHeader hideSelectedName={Boolean(displayedOwnerId)} label={d('owner')} max={1} memberRecommendations={memberRecommendations} members={members} min={0} onChange={changeOwner} onInviteMembers={onInviteMembers} selected={displayedOwnerId ? [displayedOwnerId] : []} /></div>
        <div className="task-detail-property task-detail-participants"><small>{d('participants')}</small><MemberSelector avatarSize="sm" displayMax={4} hideHeader hideSelectedName label={d('participants')} memberRecommendations={memberRecommendations} members={participantMembers} disabled={!onParticipantsChange} onChange={changeParticipants} onInviteMembers={onInviteMembers} selected={currentParticipants} stacked /></div>
        <TaskDueDatePicker minDate={taskCalendarDate(progressTask?.createdAt) ?? ""} initialValue={plannedEndOn ?? toDateInputValue(task.due)} key={`due-${taskId}`} label={d('dueDate')} onChange={(endDate) => onTaskPeriodChange?.(endDate ? { end: endDate, start: "" } : null)} />
      </div>
    </header>
    <div className="task-detail-columns">
    <div aria-label={d('taskCollaboration')} className="task-detail-body" id="task-detail-collaboration">
    {aiNotice && <p className="task-ai-inline-notice" role="status"><Check aria-hidden="true" size={14} />{aiNotice}<button aria-label={d('dismissUpdate')} onClick={() => setAiNotice("")} type="button"><X size={13} /></button></p>}

    <div className="task-detail-collaboration-header">
      <div aria-label={d('details')} className="task-detail-tabs" role="tablist">{tabs.map(({ id, label }) => <button
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
    ><span>{label}</span></button>)}</div>
    </div>

    {collaboration.error && <p className="task-attention-message" role="alert">{collaboration.error}<button onClick={collaboration.reload} type="button">{d('reload')}</button></p>}
    {attentionMessage && <p className="task-attention-message" role="status">{attentionMessage}</p>}
    {sourceRecord && <aside aria-label={d('suggestionSource')} className="task-source-record" id="task-source-record" tabIndex={-1}>
      <header><strong>{d('previousSuggestion')}</strong><time dateTime={Number.isFinite(Date.parse(sourceRecord.createdAt ?? "")) ? sourceRecord.createdAt : undefined}>{!Number.isFinite(Date.parse(sourceRecord.createdAt ?? "")) && d('originalTime')}{sourceRecord.time}</time><button aria-label={d('closeSource')} onClick={() => setSourceRecord(null)} type="button"><X size={15} /></button></header>
      <p>{sourceRecord.message}</p><small>{d('sourceHint')}</small>
      {sourceRecord.file && <TaskActivityFileLink fileId={taskFiles.find((file) => file.kind === "file" && !file.archived && file.name === sourceRecord.file)?.id} fileName={sourceRecord.file} onOpen={openFile} />}
    </aside>}

    <div aria-labelledby="task-detail-tab-information" className="task-detail-document-pane" hidden={activeTab !== "information"} id="task-detail-panel-information" role="tabpanel" tabIndex={-1}>
      <section aria-label={d('goalAndExecution')} className="task-detail-document" id="task-detail-document" ref={documentScrollRef} tabIndex={-1}>
        <div aria-label={d('information')} className="task-detail-brief" id={`task-heading-${taskId}`} tabIndex={-1}>
            <div className="task-detail-description">
              <div className="task-detail-goal-field"><span className="task-detail-field-label">{d('goal')}</span><Textarea aria-label={d('taskGoal')} className="task-detail-goal-input" onFocus={() => setEditingOriginal("goal")} onBlur={() => { setEditingOriginal(null); if (currentGoal !== task.goal) onTaskGoalChange?.(currentGoal); }} onChange={(event) => setCurrentGoal(event.target.value)} placeholder={onTaskGoalChange ? d('addGoal') : d('noGoal')} readOnly={!onTaskGoalChange} rows={1} value={editingOriginal === "goal" ? currentGoal : mock.field(taskId, "goal", currentGoal)} /></div>
              <div aria-label={d('criteria')} id={`task-criteria-${taskId}`} key={`criteria-${taskId}`} tabIndex={-1}>
                <TaskCompletionCriteria key={taskId} reviews={task.criterionReviews} onConfirm={onTaskCriterionConfirm} criteria={completionCriteria} onSave={onTaskCriteriaSave} source="recorded" />
              </div>
            </div>
        </div>
        <details className="task-detail-ai-analysis" key={`ai-analysis-${taskId}`}><summary><span>{d('analysis')}</span></summary>
          {onRepredict && <div className="task-detail-analysis-action"><TaskProgressRefresh key={taskId} scope="task" onRepredict={refreshAnalysis}/></div>}
          <section aria-label={d('progress')} className="task-detail-progress-section">
          <TaskWorkloadSummary compact progressTask={{...progressTask,status:currentStatus}} comparison={progressComparison} completedMinutesByTaskId={completedMinutesByTaskId} progressComparisonsByTaskId={leafProgressComparisons} key={taskId} effortTasks={effortTasks} hasSubtasks={childTasks.length > 0} onOpenTask={onOpenRelatedTask} needsReview={progressNeedsReview} series={burnUp} />
          </section>
          <TaskCurrentSituation hasBurnUp={hasBurnUp} key={`situation-${taskId}`} model={situation} onOpenReference={openSituationReference}/>
        </details>
      <section aria-labelledby={`task-subtasks-heading-${taskId}`} className="task-detail-section task-subtask-list-section first-section" id={`task-subtasks-${taskId}`} tabIndex={-1}>
      <div className="task-section-heading task-ai-module-heading task-subtask-heading">
        <div><h2 id={`task-subtasks-heading-${taskId}`}>{d('subtasks')}</h2></div>
        <div className="task-subtask-heading-actions">
          {onCreateSubtask && <Button onClick={onCreateSubtask} size="sm" type="button" variant="outline"><Plus aria-hidden="true" size={14} />{d('add')}</Button>}
        </div>
      </div>
      <TaskSubtaskList progressComparisonsByTaskId={progressComparisonsByTaskId} effortTasks={effortTasks} completedMinutesByTaskId={completedMinutesByTaskId} onOpenTask={onOpenRelatedTask} tasks={childTasks} />
    </section>

        {(currentDependencyIds.length > 0 || onTaskDependenciesSave) && <section aria-labelledby={`task-dependencies-heading-${taskId}`} className="task-detail-section task-detail-dependencies-section" key={`dependency-details-${taskId}`}>
          <div className="task-section-heading"><h2 id={`task-dependencies-heading-${taskId}`}>{d('dependencies')}</h2>{currentDependencyIds.length > 0 && <small>{currentDependencyIds.length}</small>}</div>
          <TaskDependenciesField dependencyIds={currentDependencyIds} onOpenTask={onOpenRelatedTask} onSave={onTaskDependenciesSave} taskId={taskId} tasks={availableDependencyTasks ?? dependencyTasks} />
        </section>}
        {(tags.length > 0 || onTagsChange) && <section aria-labelledby={`task-tags-heading-${taskId}`} className="task-detail-section task-detail-tags-section">
          <div className="task-section-heading"><h2 id={`task-tags-heading-${taskId}`}>{d('tags')}</h2></div>
          <TaskTagList key={`tags-${taskId}`} onChange={onTagsChange} selected={tags} tags={tagDefinitions} />
        </section>}
      </section>
      <FixedScrollThumb scrollRef={documentScrollRef} topInset={52} />
    </div>

    <section aria-labelledby="task-detail-tab-discussion" className="task-detail-section task-discussion-panel first-section" hidden={activeTab !== "discussion"} id="task-detail-panel-discussion" role="tabpanel" tabIndex={-1}>
      <TaskDiscussion activities={activities} attentionTarget={discussionAttention} currentUser={currentUserId} currentUserName={currentUser} draftKey={collaboration.scopeKey} files={taskFiles} key={taskId} onConnectAi={openDiscussionAi} onOpenFile={openFile} onPost={postDiscussion} onEdit={editDiscussion} onDelete={deleteDiscussion} people={activityPeople} />
    </section>

      <section aria-labelledby="task-detail-tab-files" className="task-detail-section task-files-panel first-section" hidden={activeTab !== "files"} id="task-detail-panel-files" role="tabpanel">
      <TaskFileExplorer onSaved={onFileSaved} currentUser={currentUser} files={taskFiles} focusedFileId={selectedFileId} focusedVersion={selectedFileVersion} focusedSequence={fileFocusSequence} key={taskId} taskId={taskId}
        onNodesChange={files => collaboration.commit(snapshot => replaceCollaborationFiles(snapshot, files))}
        collaboration={{ threads: collaboration.snapshot.threads, messages: allMessages.filter(message => Boolean(message.fileThreadId)), people: activityPeople, currentUserId, currentUserName: currentUser,
          canManage: currentOwner.includes(currentUserId) || currentOwner.includes(currentUser),
          onPost: (draft, thread, replyToId) => postDiscussion(draft, replyToId, thread), onEdit: editDiscussion, onDelete: deleteDiscussion,
          onResolve: (id, resolved) => collaboration.commit(snapshot => setFileThreadResolved(snapshot, id, currentUserId, resolved, currentOwner.includes(currentUserId) || currentOwner.includes(currentUser))),
        }} />
    </section>

    {activeTab === "activity" && <section aria-labelledby="task-detail-tab-activity" className="task-detail-section task-activity-section first-section" id="task-detail-panel-activity" role="tabpanel" tabIndex={-1}>
      <TaskActivityLog activities={activities.filter(message => !message.deletedAt)} commits={task.commits} files={taskFiles} focusedTargetId={situationAttentionId ?? initialAttentionTarget?.targetId} onOpenDiscussion={openActivityDiscussion} onOpenFile={openFile} />
    </section>}

    </div>
    </div>

    {aiScope && aiAdjustmentContext && onAiAdjustmentApply && <TaskAiAdjustmentPopover anchor={aiReturnFocus.current} context={aiAdjustmentContext} draftSession={aiDraftSession} onApply={applyAiAdjustment} onOpenChange={setAiOpen} open={aiOpen} scope={aiScope} />}
    {aiConnectionRequest?.taskId === taskId && <AiConnectionDialog onClose={closeAiConnection} request={aiConnectionRequest.request} returnFocus={aiConnectionTrigger.current} />}
  </section></MockTaskProvider>;
}
