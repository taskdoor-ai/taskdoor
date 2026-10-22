import type { FileAnnotationExitController } from "@/features/tasks/files/lib/useTaskFileAnnotations";
import { normalizeTaskStatus } from "@/shared/model/task-model";
import { TaskCompletionIndicator } from "@/features/tasks/components/TaskCompletionIndicator";
import { TaskDetailTabLabel, describeTaskDetailTab } from "@/features/tasks/components/TaskDetailTabLabel";
import { TaskDetailStickySummary } from "@/features/tasks/components/TaskDetailStickySummary";
import { getTaskContentIndicators } from "@/features/tasks/lib/task-content-indicators";
import { getTaskDetailPathItems } from "@/features/tasks/lib/task-detail-path";
import { TaskSidebarToggle } from "@/features/tasks/components/TaskSidebarToggle";
import { useTaskTextSaveFeedback } from "@/features/tasks/lib/useTaskTextSaveFeedback";
import { useGlobalUi } from '@/shared/i18n/global-ui';
import "@/features/tasks/styles/task-criterion-review.css";
import "@/features/tasks/styles/task-ai-adjustment.css";
import { useI18n } from '@/shared/i18n/I18nProvider';
import { formatDisplayDateTime, formatLegacyDateLabel } from '@/shared/lib/date-time';
import { mockTagName, mockPersonName } from '@/ai/mock/i18n/mockContent';
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { MockTaskProvider, useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { taskCalendarDate } from "@/features/tasks/lib/task-schedule";
import { useTeamTimeZone } from "@/shared/lib/useTeamTimeZone";
import { ArrowLeft, ChevronRight, Plus, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { type TaskActivityMock, type TaskDetailContent, type TaskFileNode, type TaskIconName, type TaskIconTone } from "@/shared/model/task-model";
import { type TagDefinition } from "@/ai/mock/data/tagGroups";

import { getTaskDetailTabForTarget, getTaskInsightSource, isDiscussionActivity } from "@/features/tasks/lib/task-activity";
import { buildDiscussionAiRequest, type DiscussionAiTarget } from "@/features/tasks/discussion/lib/task-discussion-ai";
import { buildTaskAiConnectionRequest } from "@/features/tasks/lib/task-ai-connection";
import type { TaskEffortDistributionInput } from "@/features/tasks/lib/task-effort-distribution";
import type { TaskProgressContext } from "@/features/tasks/lib/task-progress-display";
import { getTaskProgressAssessment } from "@/features/tasks/lib/task-progress-assessment";
import { getTaskProgressDemoExample } from "@/ai/mock/data/taskProgressDemo";
import type { TaskProgressComparisonSeries } from "@/features/tasks/lib/task-progress-comparison";
import { createTaskMemberRecommendations } from "@/ai/mock/lib/taskMemberRecommendations";
import { getTaskWorkloadProjection } from "@/features/tasks/lib/task-workload-projection";
import { TaskWorkloadSummary } from "@/features/tasks/components/TaskWorkloadSummary";
import { TaskProgressRefresh } from "@/features/tasks/components/TaskProgressRefresh";
import { getTaskSituationModel, type TaskSituationReference } from "@/features/tasks/lib/task-situation";
import { MemberSelector, type Member } from "@/features/members/components/MemberSelector";
import { AiConnectionDialog, launchAiContext, type AiShortcutAttempt, type AiConnectionRequest } from "@/features/ai-connection/components/AiConnectionDialog";
import { AiConnectionButton } from "@/features/ai-connection/components/AiConnectionButton";
import { TaskTagList } from "@/features/tasks/components/TaskTagList";
import { TaskActivityFileLink } from "@/features/tasks/components/TaskActivityFileLink";
import { TaskActivityLog } from "@/features/tasks/components/TaskActivityLog";
import { TaskCompletionCriteria } from "@/features/tasks/components/TaskCompletionCriteria";
import { TaskCurrentSituation } from "@/features/tasks/components/TaskCurrentSituation";
import type { TaskDateRange } from "@/features/tasks/components/TaskDateRangePicker";
import { TaskDiscussion } from "@/features/tasks/components/TaskDiscussion";
import { TaskDueDatePicker } from "@/features/tasks/components/TaskDueDatePicker";
import type { TaskRelationSummary } from "@/features/tasks/components/TaskRelationsSection";
import { TaskStatusBadge, type TaskStatus } from "@/shared/ui/TaskStatusBadge";
import { TaskSubtaskList } from "@/features/tasks/components/TaskSubtaskList";
import { toast } from "@/shared/ui/toast";
import { Input, Textarea } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { TaskFileExplorer } from "@/features/tasks/files/components/TaskFileExplorer";
import { getDiscussionAttachment, getTaskFiles, deleteCollaborationMessage, mergeCollaborationMessages, postCollaborationMessage, replaceCollaborationFiles, type CollaborationMessage, type CollaborationSnapshot, type DiscussionDraft } from "@/features/tasks/lib/task-collaboration";
import { useTaskCollaboration } from "@/features/tasks/lib/useTaskCollaboration";
import "@/features/tasks/styles/task-records.css";
import "@/features/tasks/styles/discussion-messages.css";
import "@/features/tasks/styles/discussion-composer.css";
import "@/features/tasks/styles/task-file-discussions.css";
import "@/features/tasks/styles/task-progress-comparison.css";
import "@/features/tasks/styles/task-situation.css";
import "@/features/tasks/styles/task-effort.css";
import "@/features/tasks/styles/task-subtask-editing.css";
import "@/features/tasks/styles/task-detail-split.css";
import "@/features/tasks/styles/task-discussion-feed.css";

export type TaskAttentionTarget = {
  kind: "activity" | "commit" | "file" | "insight" | "criteria" | "subtasks" | "details" | "discussion";
  targetId: string;
};

type TaskDetailTab = "information" | "ai" | "discussion" | "files" | "activity";

type TaskDetailProps = {
  completedMinutesByTaskId?: Readonly<Record<string, number | null>>;
  effortTasks?: TaskEffortDistributionInput[];
  progressComparisonsByTaskId?: Readonly<Record<string, TaskProgressComparisonSeries | undefined>>;
  recordedActivities?: TaskActivityMock[];
  onTaskCriterionConfirm?: (index: number, confirmed: boolean, expected: string[]) => void | Promise<void>;
  onTaskCriteriaSave?: (values: string[], expected: string[]) => void | Promise<void>;
  childTasks?: TaskRelationSummary[];
  parentTask?: TaskRelationSummary;
  currentUser?: string;
  currentUserId?: string;
  teamId?: string;
  initialAttentionTarget?: TaskAttentionTarget | null;
  members: Member[];
  onFileSaved?: () => void;
  onAnnotationExitControllerChange?: (controller: FileAnnotationExitController | null) => void;
  onActivityAppend?: (activity: TaskActivityMock) => void;
  onSubtaskCriteriaSave?: (taskId: string, values: string[], expected: string[]) => void | Promise<void>;
  onCreateSubtask?: () => void;
  onDeleteSubtask?: (taskId: string, returnFocus?: HTMLElement | null) => void;
  onInitialAttentionTargetHandled?: () => void;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
  onOpenRelatedTask?: (taskId: string) => void;
  onOwnerChange?: (owner: string[]) => void | Promise<void>;
  onParticipantsChange?: (participants: string[]) => void;
  onDiscussionSave?: (current: CollaborationSnapshot, next: CollaborationSnapshot, message: CollaborationMessage) => CollaborationSnapshot;
  onDiscussionRead?: (taskId: string, activityIds: string[], readThrough: string) => void;
  onPathSelect?: (nodeId: string) => void;
  onBackToList?: () => void;
  onTagsChange?: (tags: string[]) => void;
  onTaskGoalChange?: (goal: string) => void | Promise<void>;
  onTaskTitleChange?: (title: string) => void | Promise<void>;
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
  task: TaskDetailContent;
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
  completedMinutesByTaskId,
  effortTasks = [],
  progressComparisonsByTaskId = {},
  recordedActivities = [],
  childTasks = [],
  currentUser = "周岚",
  currentUserId = currentUser,
  teamId = "demo",
  initialAttentionTarget = null,
  members,
  onFileSaved,
  onAnnotationExitControllerChange,
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
  onDiscussionSave,
  onDiscussionRead,
  onPathSelect,
  onBackToList,
  onTagsChange,
  onTaskGoalChange,
  onTaskTitleChange,
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
  const { locale } = useI18n();
  const timeZone = useTeamTimeZone();
  const [editingOriginal, setEditingOriginal] = useState<"title" | "goal" | null>(null);
  const d = useDetailCopy();
  const completionCriteria = task.completionCriteria ?? [];
  const burnUp = task.burnUp;
  const progressAssessment = getTaskProgressAssessment(burnUp, effortTasks);
  const hasBurnUp = progressAssessment.hasTrend;
  const mock = useMockText();
  const collaboration = useTaskCollaboration(teamId, taskId, task.files);
  const pendingDiscussionRef = useRef<{ signature: string; message: CollaborationMessage } | null>(null);
  const allFiles = collaboration.snapshot.files;
  const taskFiles = useMemo(() => getTaskFiles(allFiles), [allFiles]);
  const allMessages = useMemo(() => mergeCollaborationMessages(task.activities, collaboration.snapshot.messages), [task.activities, collaboration.snapshot.messages]);
  const contentIndicators = getTaskContentIndicators({
    messages: allMessages, files: taskFiles,
    enabled: !collaboration.error,
  });
  const activities = allMessages;
  const localActivities = collaboration.snapshot.messages.filter(message => !message.deletedAt);
  const initialTab = getTaskDetailTabForTarget(activities, initialAttentionTarget);
  const [activeTab, setDetailTab] = useState<TaskDetailTab>(
    !initialAttentionTarget || ["details", "criteria", "subtasks"].includes(initialAttentionTarget.kind) || initialTab === "subtasks" ? "information" : initialTab);
  const setActiveTab = (tab: TaskDetailTab | "subtasks") => setDetailTab(tab === "subtasks" ? "information" : tab);
  const [currentOwner, setCurrentOwner] = useState([task.owner]);
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [ownerSaveFailed, setOwnerSaveFailed] = useState(false);
  const ownerSaveSequence = useRef(0);
  const ownerSaveScope = useRef(`${teamId}:${taskId}`);
  ownerSaveScope.current = `${teamId}:${taskId}`;
  const [currentParticipants, setCurrentParticipants] = useState(task.participants);
  const [currentStatus, setCurrentStatus] = useState(normalizeTaskStatus(task.status));
  const previousIncompleteStatus = useRef<TaskStatus>(task.status === "已完成" ? "进行中" : normalizeTaskStatus(task.status));
  const progressNeedsReview = currentStatus === "已完成" && progressAssessment.progressRatio !== null && progressAssessment.progressRatio < 1;
  const [selectedFileId, setSelectedFileId] = useState(initialAttentionTarget?.kind === "file" ? initialAttentionTarget.targetId : "");
  const [selectedFileVersion, setSelectedFileVersion] = useState<number>();
  const [fileFocusSequence, setFileFocusSequence] = useState(0);
  const filePreviewTrigger = useRef<HTMLElement | null>(null);
  const [sourceRecord, setSourceRecord] = useState<TaskActivityMock | null>(null);
  const [attentionMessage, setAttentionMessage] = useState("");
  const [situationAttentionId, setSituationAttentionId] = useState<string>();
  const [discussionAttention, setDiscussionAttention] = useState<{ id: string; sequence: number }>();
  const [discussionReadRequestSequence, setDiscussionReadRequestSequence] = useState(0);
  const [attachmentPreview, setAttachmentPreview] = useState<{ taskId: string; file: TaskFileNode } | null>(null);
  const [discussionInsertion, setDiscussionInsertion] = useState<{ id: string; draft: DiscussionDraft; onPublished: (draft: DiscussionDraft) => void }>();
  const [aiConnectionRequest, setAiConnectionRequest] = useState<{ taskId: string; request: AiConnectionRequest } | null>(null);
  const aiConnectionTrigger = useRef<HTMLElement | null>(null);
  const [currentTitle, setCurrentTitle] = useState(task.title);
  const [currentGoal, setCurrentGoal] = useState(task.goal);
  const titleSave = useTaskTextSaveFeedback(`${teamId}:${taskId}`);
  const goalSave = useTaskTextSaveFeedback(`${teamId}:${taskId}`);
  const detailScrollRef = useRef<HTMLElement>(null);
  const detailHeaderRef = useRef<HTMLElement>(null);
  useEffect(() => { detailScrollRef.current?.scrollTo({ top: 0 }); }, [taskId]);

  useEffect(() => { setCurrentTitle(task.title); }, [task.title]);
  useEffect(() => { setCurrentGoal(task.goal); }, [task.goal]);
  useEffect(() => { setCurrentOwner([task.owner]); }, [task.owner]);
  useEffect(() => {
    ownerSaveSequence.current += 1;
    setOwnerSaving(false);
    setOwnerSaveFailed(false);
    return () => { ownerSaveSequence.current += 1; };
  }, [teamId, taskId]);
  const participantSignature = JSON.stringify(task.participants);
  useEffect(() => {
    setCurrentParticipants(task.participants);
  }, [participantSignature]);

  useEffect(() => { previousIncompleteStatus.current = task.status === "已完成" ? "进行中" : normalizeTaskStatus(task.status); }, [taskId]);

  useEffect(() => {
    setCurrentStatus(normalizeTaskStatus(task.status));
    if (task.status !== "已完成") previousIncompleteStatus.current = normalizeTaskStatus(task.status);
  }, [task.status, taskId]);

  const confirmedOwnerId = currentOwner[0] ?? "";
  const displayedOwnerId = confirmedOwnerId;
  const displayedOwnerName = mockPersonName(locale, displayedOwnerId, members.find(member => member.id === displayedOwnerId)?.name || displayedOwnerId || d('noOwner'));
  const participantMembers = useMemo(() => members.filter((member) => !currentOwner.includes(member.id)), [currentOwner, members]);
  const memberRecommendations = useMemo(() => createTaskMemberRecommendations({ members, taskText: `${currentTitle} ${currentGoal} ${tags.join(" ")}` }), [currentGoal, currentTitle, members, tags]);
  const activityPeople = members.filter(member => member.membershipStatus !== "invited").map(member => member.id);
  const progressComparison = getTaskProgressDemoExample(taskId, progressComparisonsByTaskId[taskId]);
  const leafProgressComparisons = Object.fromEntries(effortTasks.filter(task => task.id).map(task => [task.id!, getTaskProgressDemoExample(task.id!, progressComparisonsByTaskId[task.id!])]));
  const workloadProjection = getTaskWorkloadProjection({ timeZone, progressTask: { ...progressTask, status: currentStatus }, comparison: progressComparison,
    effortTasks, hasSubtasks: childTasks.length > 0, series: burnUp, completedMinutesByTaskId, progressComparisonsByTaskId: leafProgressComparisons });
  const taskAiProjection = getTaskWorkloadProjection({ timeZone, progressTask: { ...progressTask, status: undefined, completedAt: undefined }, comparison: progressComparison,
    effortTasks, hasSubtasks: childTasks.length > 0, series: burnUp, completedMinutesByTaskId, progressComparisonsByTaskId: leafProgressComparisons });
  const taskAiProgressRatio = taskAiProjection.display.aiAssessment?.ratio ?? taskAiProjection.display.ratio;
  const taskAiProgressEvidence = taskAiProjection.display.aiAssessment
    ? taskAiProjection.display.aiAssessment.basis
    : taskAiProjection.display.historySeries?.workload.at(-1)?.note ?? taskAiProjection.assessment.burnUp.latest?.note;
  // A name, status, or estimate alone does not establish execution progress.
  const hasAnalysisEvidence = taskAiProjection.display.ratio !== null;
  const visibleTab = activeTab === "ai" && !hasAnalysisEvidence ? "information" : activeTab;
  useEffect(() => {
    if (hasAnalysisEvidence || activeTab !== "ai") return;
    setDetailTab("information");
    if (document.activeElement === document.body || document.activeElement?.id === "task-detail-tab-ai") {
      document.getElementById("task-detail-tab-information")?.focus({ preventScroll: true });
    }
  }, [activeTab, hasAnalysisEvidence]);
  const situation = getTaskSituationModel({
    progress: workloadProjection.display,
    progressScopeState: workloadProjection.effort.state,
    taskId,
    task: { ...task, files: taskFiles, activities, status: currentStatus, owner: confirmedOwnerId },
    ownerName: confirmedOwnerId ? members.find(member => member.id === confirmedOwnerId)?.name.trim() || d('owner') : "",
    childTasks,
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
    if (shortcut) return launchAiContext(request, shortcut.agent, shortcut.signal, undefined, undefined, locale);
    aiConnectionTrigger.current = trigger;
    setAiConnectionRequest({ taskId, request });
  };

  const openDiscussionAi = (target: DiscussionAiTarget, trigger: HTMLElement, shortcut?: AiShortcutAttempt) => {
    const request = buildDiscussionAiRequest({ taskId, currentUser, target, tags,
      task: { ...task, activities: allMessages, files: taskFiles, title: currentTitle, goal: currentGoal, status: currentStatus, owner: confirmedOwnerId, participants: currentParticipants, due: plannedEndOn ?? task.due },
    });
    if (!request) { setAttentionMessage(d('replyUnavailable')); return; }
    if (shortcut) return launchAiContext(request, shortcut.agent, shortcut.signal, undefined, undefined, locale);
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
        if (initialAttentionTarget.kind === "discussion" && target?.getClientRects().length && !target.closest('[hidden], [aria-hidden="true"]')) {
          setDiscussionReadRequestSequence(sequence => sequence + 1);
        }
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

  const changeOwner = async (value: string[]) => {
    if (!onOwnerChange || ownerSaving) return;
    const sequence = ++ownerSaveSequence.current;
    const scope = ownerSaveScope.current;
    const isCurrent = () => sequence === ownerSaveSequence.current && scope === ownerSaveScope.current;
    setOwnerSaveFailed(false);
    setOwnerSaving(true);
    try {
      await onOwnerChange(value);
      if (!isCurrent()) return;
      setCurrentOwner(value);
      setCurrentParticipants((items) => items.filter((id) => !value.includes(id)));
    } catch {
      if (isCurrent()) setOwnerSaveFailed(true);
    } finally {
      if (isCurrent()) setOwnerSaving(false);
    }
  };

  const changeParticipants = (value: string[]) => {
    setCurrentParticipants(value);
    onParticipantsChange?.(value);
  };

  const changeStatus = (value: TaskStatus) => {
    if (!onTaskStatusChange) return false;
    try {
      onTaskStatusChange(value);
      setCurrentStatus(normalizeTaskStatus(value));
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : d("statusSaveFailed"));
      return false;
    }
  };

  const setTaskCompleted = (completed: boolean) => {
    if (completed && currentStatus !== "已完成") previousIncompleteStatus.current = currentStatus;
    return changeStatus(completed ? "已完成" : previousIncompleteStatus.current);
  };

  const postDiscussion = (draft: DiscussionDraft, replyToActivityId?: string) => {
    const signature = JSON.stringify({ draft, replyToActivityId });
    const now = new Date();
    const message: CollaborationMessage = pendingDiscussionRef.current?.signature === signature ? pendingDiscussionRef.current.message : {
      id: crypto.randomUUID(), author: currentUserId, createdAt: now.toISOString(), message: draft.body.trim(),
      time: now.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }),
      type: replyToActivityId ? "member-reply" : "member-post", replyToActivityId,
      mentionedPrincipalIds: draft.mentions, quote: draft.quote,
    };
    pendingDiscussionRef.current = { signature, message };
    collaboration.commit(snapshot => postCollaborationMessage(snapshot, { message, attachments: draft.attachments, contextMessages: allMessages, visiblePeople: members.filter(member => member.membershipStatus !== "invited") }), onDiscussionSave ? (current, next) => onDiscussionSave(current, next, message) : undefined);
    pendingDiscussionRef.current = null;
  };
  const ownActor = (message: CollaborationMessage) => {
    if (message.author !== currentUserId && message.author !== currentUser) throw new Error(d('authorOnly'));
    return message.author;
  };
  const deleteDiscussion = (message: CollaborationMessage) => collaboration.commit(snapshot => deleteCollaborationMessage(snapshot, message, ownActor(message)));

  const openFile = (id: string, version?: number, fromDiscussion = false, trigger?: HTMLElement) => {
    const candidate = allFiles.find(file => file.id === id);
    const file = candidate && getDiscussionAttachment(allFiles, { fileId: id, name: candidate.name, version: version ?? candidate.version ?? 1 });
    if (!file) { setAttentionMessage(d('fileUnavailable')); return; }
    setAttentionMessage("");
    setAttachmentPreview(file.attachmentOnly || file.retiredBuiltin ? { taskId, file } : null);
    filePreviewTrigger.current = fromDiscussion ? trigger ?? (typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null) : null;
    setSelectedFileId(id);
    setSelectedFileVersion(version);
    setFileFocusSequence(value => value + 1);
    if (!fromDiscussion) {
      setActiveTab("files");
      window.setTimeout(() => document.getElementById(`task-file-preview-${id}`)?.focus({ preventScroll: true }), 0);
    }
  };

  const previewAttachment = (file: TaskFileNode, trigger: HTMLElement) => {
    if (taskFiles.some(candidate => candidate.id === file.id && !candidate.archived)) {
      openFile(file.id, file.version, true, trigger);
      return;
    }
    setAttentionMessage("");
    filePreviewTrigger.current = trigger;
    setAttachmentPreview({ taskId, file });
    setSelectedFileId(file.id);
    setSelectedFileVersion(file.version);
    setFileFocusSequence(value => value + 1);
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

  const tabs: Array<{ id: TaskDetailTab; label: string; count?: number | null }> = [
    { id: "information", label: d("basicInformation") },
    { id: "discussion", label: d('discussion'), count: contentIndicators.discussionCount },
    { id: "files", label: d('files'), count: contentIndicators.fileCount },
    { id: "activity", label: d('activity') },
    ...(hasAnalysisEvidence ? [{ id: "ai" as const, label: d('analysisTab') }] : []),
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

  const taskPathItems = getTaskDetailPathItems(pathItems, taskId, parentTask?.id);

  return <MockTaskProvider taskId={taskId}><section aria-label={d('details')} className="task-detail-view task-detail-split" ref={detailScrollRef} tabIndex={-1}>
    <TaskDetailStickySummary activeTab={visibleTab} due={plannedEndOn ?? task.due} headerRef={detailHeaderRef} ownerId={displayedOwnerId} ownerName={displayedOwnerName} progressRatio={taskAiProgressRatio} scrollRef={detailScrollRef} status={currentStatus} taskId={taskId} title={editingOriginal === "title" || titleSave.status === "error" ? currentTitle : mock.field(taskId, "title", currentTitle)} />
    <header className="task-detail-header" ref={detailHeaderRef}>
      <div className="task-detail-kicker"><TaskSidebarToggle />{onBackToList && <Button aria-label={d('backToList')} className="task-detail-back-to-list" onClick={onBackToList} size="icon-sm" type="button" variant="ghost"><ArrowLeft size={17}/></Button>}{taskPathItems.length > 0 ? <nav aria-label={d('path')} className="task-detail-path">{taskPathItems.map((item, index) => {
        const label = mock.field(item.id, "title", item.label);
        return <span key={item.id}>
        {index > 0 && <ChevronRight aria-hidden="true" size={12} />}
        {index < taskPathItems.length - 1 && onPathSelect ? <button onClick={() => onPathSelect(item.id)} title={label} type="button">{label}</button> : <em aria-current={index === taskPathItems.length - 1 ? "page" : undefined} title={label}>{label}</em>}
      </span>;
      })}</nav> : null}</div>
            <div className="task-detail-title-row">
              <TaskCompletionIndicator key={taskId} status={currentStatus} completed={currentStatus === "已完成"} progressRatio={taskAiProgressRatio} evidence={taskAiProgressEvidence} onToggle={onTaskStatusChange ? () => setTaskCompleted(currentStatus !== "已完成") : undefined} />
              <div aria-busy={titleSave.status === "saving" || undefined} className="task-detail-title-content"><h1><Input title={editingOriginal === "title" ? currentTitle : mock.field(taskId, "title", currentTitle)} readOnly={!onTaskTitleChange} aria-label={d('name')} aria-describedby={titleSave.status === "error" ? `task-title-save-error-${taskId}` : undefined} className="task-detail-title-input" onFocus={() => { titleSave.clear(); setEditingOriginal("title"); }} onBlur={() => { setEditingOriginal(null); void titleSave.save(currentTitle, task.title, onTaskTitleChange); }} onChange={(event) => { titleSave.clear(); setCurrentTitle(event.target.value.replace(/[\r\n]+/g, " ")); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.blur(); } }} value={editingOriginal === "title" || titleSave.status === "error" ? currentTitle : mock.field(taskId, "title", currentTitle)} /></h1>{titleSave.status === "saving" && <span className="sr-only" role="status">{d("fieldSaving")}</span>}</div>
              <div className="task-ai-detail-tools"><AiConnectionButton contextLabel={d('current')} key={taskId} onConnect={openTaskAiConnection} /></div>
            </div>
      {titleSave.status === "error" && <p className="task-field-save-error" id={`task-title-save-error-${taskId}`} role="alert">{d("fieldSaveFailed")}</p>}
      <div aria-label={d('properties')} className="task-detail-primary-properties">
        <div className="task-detail-property task-detail-status-field"><small>{d('status')}</small><TaskStatusBadge editable={Boolean(onTaskStatusChange)} onChange={changeStatus} size="sm" value={currentStatus} progressRatio={taskAiProgressRatio} /></div>
        <div aria-busy={ownerSaving || undefined} aria-describedby={ownerSaveFailed ? `task-owner-save-error-${taskId}` : undefined} aria-label={`${d("owner")}: ${displayedOwnerName}`} className="task-detail-property" role="group" title={displayedOwnerName}><small>{d('owner')}</small><MemberSelector avatarSize="sm" allowUnassigned={!displayedOwnerId} disabled={!onOwnerChange || ownerSaving} hideHeader hideSelectedName={Boolean(displayedOwnerId)} label={d('owner')} max={1} memberRecommendations={memberRecommendations} members={members} min={0} onChange={changeOwner} onInviteMembers={onInviteMembers} selected={displayedOwnerId ? [displayedOwnerId] : []} /></div>
        <div className="task-detail-property task-detail-participants"><small>{d('participants')}</small><MemberSelector avatarSize="sm" displayMax={4} hideHeader hideSelectedName key={taskId} label={d('participants')} memberRecommendations={memberRecommendations} members={participantMembers} disabled={!onParticipantsChange} onChange={changeParticipants} onInviteMembers={onInviteMembers} selected={currentParticipants} showFullList stacked /></div>
        <TaskDueDatePicker minDate={taskCalendarDate(progressTask?.createdAt, timeZone) ?? ""} initialValue={plannedEndOn ?? toDateInputValue(task.due)} key={`due-${taskId}`} label={d('dueDate')} onChange={(endDate) => onTaskPeriodChange?.(endDate ? { end: endDate, start: "" } : null)} />
      </div>
      {ownerSaveFailed && <p className="task-field-save-error" id={`task-owner-save-error-${taskId}`} role="alert">{locale === "en" ? "Could not update the owner. The previous owner is unchanged. Please try again." : "负责人修改失败，仍保留原负责人，请重试。"}</p>}
    </header>
    <div className="task-detail-columns">
    <div aria-label={d('taskCollaboration')} className="task-detail-body" id="task-detail-collaboration">

    <div className="task-detail-collaboration-header">
      <div aria-label={d('details')} className="task-detail-tabs" role="tablist">{tabs.map(({ id, label, count }) => <button
      aria-controls={`task-detail-panel-${id}`}
      aria-label={describeTaskDetailTab(label, count ?? null, locale)}
      aria-selected={visibleTab === id}
      className={visibleTab === id ? "active" : ""}
      id={`task-detail-tab-${id}`}
      key={id}
      onClick={() => setActiveTab(id)}
      onKeyDown={(event) => handleTabKeyDown(event, id)}
      role="tab"
      tabIndex={visibleTab === id ? 0 : -1}
      title={describeTaskDetailTab(label, count ?? null, locale)}
      type="button"
    ><TaskDetailTabLabel label={label} count={count ?? null} /></button>)}</div>
    </div>

    {collaboration.error && <p className="task-attention-message" role="alert">{collaboration.error}<button onClick={collaboration.reload} type="button">{d('reload')}</button></p>}
    {attentionMessage && <p className="task-attention-message" role="status">{attentionMessage}</p>}
    {sourceRecord && <aside aria-label={d('suggestionSource')} className="task-source-record" id="task-source-record" tabIndex={-1}>
      <header><strong>{d('previousSuggestion')}</strong><time dateTime={Number.isFinite(Date.parse(sourceRecord.createdAt ?? "")) ? sourceRecord.createdAt : undefined} title={sourceRecord.createdAt ? formatDisplayDateTime(sourceRecord.createdAt, { locale, year: "always" }) ?? undefined : undefined}>{!Number.isFinite(Date.parse(sourceRecord.createdAt ?? "")) && d('originalTime')}{formatDisplayDateTime(sourceRecord.createdAt ?? "", { locale }) ?? formatLegacyDateLabel(sourceRecord.time, locale)}</time><button aria-label={d('closeSource')} onClick={() => setSourceRecord(null)} type="button"><X size={15} /></button></header>
      <p>{sourceRecord.message}</p><small>{d('sourceHint')}</small>
      {sourceRecord.file && <TaskActivityFileLink fileId={taskFiles.find((file) => file.kind === "file" && !file.archived && file.name === sourceRecord.file)?.id} fileName={sourceRecord.file} onOpen={openFile} />}
    </aside>}

    <div aria-labelledby="task-detail-tab-information" className="task-detail-document-pane" hidden={visibleTab !== "information"} id="task-detail-panel-information" role="tabpanel" tabIndex={-1}>
      <section aria-label={d('goalAndExecution')} className="task-detail-document" id="task-detail-document" tabIndex={-1}>
        <div aria-label={d('information')} className="task-detail-brief" id={`task-heading-${taskId}`} tabIndex={-1}>
            <div className="task-detail-description">
              <div className="task-detail-goal-field"><span className="task-detail-field-label">{d('goal')}</span><div className="task-detail-goal-content"><div aria-busy={goalSave.status === "saving" || undefined} className="task-detail-goal-editor"><Textarea aria-label={d('taskGoal')} aria-describedby={goalSave.status === "error" ? `task-goal-save-error-${taskId}` : undefined} className="task-detail-goal-input" onFocus={() => { goalSave.clear(); setEditingOriginal("goal"); }} onBlur={() => { setEditingOriginal(null); void goalSave.save(currentGoal, task.goal, onTaskGoalChange); }} onChange={(event) => { goalSave.clear(); setCurrentGoal(event.target.value); }} placeholder={onTaskGoalChange ? d('addGoal') : d('noGoal')} readOnly={!onTaskGoalChange} rows={1} value={editingOriginal === "goal" || goalSave.status === "error" ? currentGoal : mock.field(taskId, "goal", currentGoal)} />{goalSave.status === "saving" && <span className="sr-only" role="status">{d("fieldSaving")}</span>}</div>{goalSave.status === "error" && <p className="task-field-save-error" id={`task-goal-save-error-${taskId}`} role="alert">{d("fieldSaveFailed")}</p>}</div></div>
              <div aria-label={d('criteria')} id={`task-criteria-${taskId}`} key={`criteria-${taskId}`} tabIndex={-1}>
                <TaskCompletionCriteria completed={currentStatus === "已完成"} onTaskComplete={onTaskStatusChange ? setTaskCompleted : undefined} key={taskId} reviews={task.criterionReviews} onConfirm={onTaskCriterionConfirm} criteria={completionCriteria} onSave={onTaskCriteriaSave} source="recorded" />
              </div>
            </div>
        </div>

      <section aria-labelledby={`task-subtasks-heading-${taskId}`} className="task-detail-section task-subtask-list-section first-section" id={`task-subtasks-${taskId}`} tabIndex={-1}>
      <div className="task-section-heading task-ai-module-heading task-subtask-heading">
        <div><h2 id={`task-subtasks-heading-${taskId}`}>{d('subtasks')}</h2></div>
        <div className="task-subtask-heading-actions">
          {onCreateSubtask && <Button onClick={onCreateSubtask} size="sm" type="button" variant="outline"><Plus aria-hidden="true" size={14} />{d('add')}</Button>}
        </div>
      </div>
      <TaskSubtaskList progressComparisonsByTaskId={progressComparisonsByTaskId} effortTasks={effortTasks} completedMinutesByTaskId={completedMinutesByTaskId} onOpenTask={onOpenRelatedTask} tasks={childTasks} />
    </section>

        {(tags.length > 0 || onTagsChange) && <section aria-labelledby={`task-tags-heading-${taskId}`} className="task-detail-section task-detail-tags-section">
          <div className="task-section-heading"><h2 id={`task-tags-heading-${taskId}`}>{d('tags')}</h2></div>
          <TaskTagList key={`tags-${taskId}`} onChange={onTagsChange} selected={tags} tags={tagDefinitions} />
        </section>}
      </section>
    </div>

    {hasAnalysisEvidence && <section aria-labelledby="task-detail-tab-ai" className="task-detail-ai-panel" hidden={visibleTab !== "ai"} id="task-detail-panel-ai" role="tabpanel">
        <div className="task-detail-ai-analysis" key={`ai-analysis-${taskId}`}>
          <section aria-label={d('progress')} className="task-detail-progress-section">
          <TaskWorkloadSummary compact headingAction={onRepredict ? <div className="task-detail-analysis-action">
            <TaskProgressRefresh key={taskId} scope="task" onRepredict={refreshAnalysis}/>
          </div> : undefined} progressTask={{...progressTask,status:currentStatus}} comparison={progressComparison} completedMinutesByTaskId={completedMinutesByTaskId} progressComparisonsByTaskId={leafProgressComparisons} key={taskId} effortTasks={effortTasks} hasSubtasks={childTasks.length > 0} onOpenTask={onOpenRelatedTask} needsReview={progressNeedsReview} series={burnUp} />
          </section>
          <TaskCurrentSituation hasBurnUp={hasBurnUp} key={`situation-${taskId}`} model={situation} onOpenReference={openSituationReference}/>
        </div>    </section>}

    <section aria-labelledby="task-detail-tab-discussion" className="task-detail-section task-discussion-panel first-section" hidden={activeTab !== "discussion"} id="task-detail-panel-discussion" role="tabpanel" tabIndex={-1}>
      <TaskDiscussion active={visibleTab === 'discussion'} readable={!collaboration.error} readRequestSequence={discussionReadRequestSequence} onRead={(ids, through) => onDiscussionRead?.(taskId, ids, through)} activities={activities} attentionTarget={discussionAttention} draftInsertion={discussionInsertion} currentUser={currentUserId} currentUserName={currentUser} draftKey={collaboration.scopeKey} files={allFiles} key={taskId} onConnectAi={openDiscussionAi} onOpenFile={(id, version) => openFile(id, version, true)} onPreviewAttachment={previewAttachment} onPost={(draft, replyToId) => { postDiscussion(draft, replyToId); if (!replyToId && discussionInsertion) { discussionInsertion.onPublished(draft); setDiscussionInsertion(undefined); } }} onDelete={deleteDiscussion} people={activityPeople} />
    </section>

      <section aria-labelledby="task-detail-tab-files" className="task-detail-section task-files-panel first-section" hidden={activeTab !== "files"} id="task-detail-panel-files" role="tabpanel">
      <TaskFileExplorer browserMode transientPreviewFile={attachmentPreview?.taskId === taskId ? attachmentPreview.file : null} onPreviewClose={() => setAttachmentPreview(null)} onAnnotationExitControllerChange={onAnnotationExitControllerChange} onSaved={onFileSaved} currentUser={currentUser} currentUserId={currentUserId} onStartDiscussion={(draft, onPublished) => { setDiscussionInsertion({ id: crypto.randomUUID(), draft, onPublished }); setActiveTab("discussion"); }} files={taskFiles} focusedFileId={selectedFileId} focusedVersion={selectedFileVersion} focusedSequence={fileFocusSequence} focusedTrigger={activeTab === "discussion" ? filePreviewTrigger.current : null} preserveFocusedDirectory={activeTab === "discussion"} key={taskId} taskId={taskId} taskTitle={currentTitle} taskGoal={task.goal}
        onNodesChange={files => collaboration.commit(snapshot => replaceCollaborationFiles(snapshot, files))}
        />
    </section>

    {activeTab === "activity" && <section aria-labelledby="task-detail-tab-activity" className="task-detail-section task-activity-section first-section" id="task-detail-panel-activity" role="tabpanel" tabIndex={-1}>
      <TaskActivityLog activities={activities.filter(message => !message.deletedAt)} commits={task.commits} files={taskFiles} focusedTargetId={situationAttentionId ?? initialAttentionTarget?.targetId} onOpenDiscussion={openActivityDiscussion} onOpenFile={openFile} />
    </section>}

    </div>
    </div>

    {aiConnectionRequest?.taskId === taskId && <AiConnectionDialog onClose={closeAiConnection} request={aiConnectionRequest.request} returnFocus={aiConnectionTrigger.current} />}
  </section></MockTaskProvider>;
}
