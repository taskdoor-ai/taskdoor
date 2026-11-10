import { buildDiscussionSubtaskRequest, isDiscussionSubtaskRequestCurrent } from "@/features/tasks/lib/discussion-subtask-draft";
import "@/features/tasks/styles/task-detail-properties.css";
import type { FileAnnotationExitController } from "@/features/tasks/files/lib/useTaskFileAnnotations";
import { normalizeTaskStatus } from "@/shared/model/task-model";
import { TaskCompletionIndicator } from "@/features/tasks/components/TaskCompletionIndicator";
import { TaskDetailTabLabel, describeTaskDetailTab } from "@/features/tasks/components/TaskDetailTabLabel";
import { TaskDetailStickySummary } from "@/features/tasks/components/TaskDetailStickySummary";
import { getTaskContentIndicators } from "@/features/tasks/lib/task-content-indicators";
import { getTaskDetailPathItems } from "@/features/tasks/lib/task-detail-path";
import { useTaskTextSaveFeedback } from "@/features/tasks/lib/useTaskTextSaveFeedback";
import { useGlobalUi } from '@/shared/i18n/global-ui';
import "@/features/tasks/styles/task-criterion-review.css";
import "@/features/tasks/styles/task-ai-adjustment.css";
import { useI18n } from '@/shared/i18n/I18nProvider';
import { copyTextToClipboard } from "@/shared/lib/clipboard";
import { formatDisplayDateTime, formatLegacyDateLabel } from '@/shared/lib/date-time';
import { mockTagName, mockPersonName } from '@/ai/mock/i18n/mockContent';
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { MockTaskProvider, useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { taskCalendarDate } from "@/features/tasks/lib/task-schedule";
import { useTeamTimeZone } from "@/shared/lib/useTeamTimeZone";
import { Tooltip } from "@base-ui/react/tooltip";
import { ArrowLeft, ChevronRight, Star, X } from "lucide-react";
import { useFavorite } from "@/features/me/lib/favorites";
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
import type { DiscussionTaskLink } from "@/features/tasks/discussion/components/TaskDiscussionTaskLinks";
import type { DiscussionReferenceTask } from "@/features/tasks/discussion/lib/discussion-task-reference";
import { TaskDueDatePicker } from "@/features/tasks/components/TaskDueDatePicker";
import type { TaskRelationSummary } from "@/features/tasks/components/TaskRelationsSection";
import { TaskStatusBadge, type TaskStatus } from "@/shared/ui/TaskStatusBadge";
import { TaskSubtasksPane } from "@/features/tasks/components/TaskSubtasksPane";
import { DiscussionSubtaskCreateForm } from "@/features/tasks/components/DiscussionSubtaskCreateForm";
import type { NewSubtaskDraft } from "@/features/tasks/lib/workspace-subtask-editing";
import { TaskSubtaskSuggestions } from "@/features/tasks/components/TaskSubtaskSuggestions";
import { useSubtaskSuggestionReview } from "@/features/tasks/lib/useSubtaskSuggestionReview";
import { groupSubtaskSuggestionsByDiscussionRoot, groupTaskDiscussionLinksByRoot, isSubtaskSuggestionContextCurrent, type SubtaskSuggestion, type SubtaskSuggestionReview } from "@/features/tasks/lib/task-subtask-suggestions";
import { toast } from "@/shared/ui/toast";
import { Input, Textarea } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { TaskFileExplorer } from "@/features/tasks/files/components/TaskFileExplorer";
import { ALL_TASK_MEMBERS_MENTION_ID, getDiscussionAttachment, getTaskFiles, deleteCollaborationMessage, mergeCollaborationMessages, postCollaborationMessage, replaceCollaborationFiles, type CollaborationMessage, type CollaborationSnapshot, type DiscussionDraft } from "@/features/tasks/lib/task-collaboration";
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
import { TaskLeaveDialog, type TaskLeaveKind } from "@/features/tasks/components/TaskLeaveDialog";
import "@/features/tasks/styles/task-discussion-feed.css";

export type TaskAttentionTarget = {
  kind: "activity" | "commit" | "file" | "insight" | "criteria" | "subtasks" | "details" | "discussion";
  targetId: string;
};

type TaskDetailTab = "subtasks" | "ai" | "discussion" | "files" | "activity";

type TaskDetailProps = {
  hidden?: boolean;
  /** Includes historical discussion sources excluded from the visible file list. */
  collaborationSeedFiles?: TaskFileNode[];
  completedMinutesByTaskId?: Readonly<Record<string, number | null>>;
  effortTasks?: TaskEffortDistributionInput[];
  progressComparisonsByTaskId?: Readonly<Record<string, TaskProgressComparisonSeries | undefined>>;
  recordedActivities?: TaskActivityMock[];
  onTaskCriterionConfirm?: (index: number, confirmed: boolean, expected: string[]) => void | Promise<void>;
  onTaskCriteriaSave?: (values: string[], expected: string[]) => void | Promise<void>;
  childTasks?: TaskRelationSummary[];
  subtaskSuggestions?: SubtaskSuggestion[];
  projectSubtaskSuggestions?: (messages: TaskActivityMock[]) => SubtaskSuggestion[];
  canConfirmSubtaskSuggestions?: boolean;
  onConfirmSubtaskSuggestions?: (suggestions: SubtaskSuggestion[], review: SubtaskSuggestionReview, expectedReviewRaw: string | null, entry: "subtasks" | "discussion") => Promise<void>;
  subtaskDiscussionLinks?: Array<DiscussionTaskLink & { messageId: string }>;
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
  onCreateSubtask?: (draft: NewSubtaskDraft) => void | Promise<void>;
  onCreateDiscussionSubtask?: (draft: NewSubtaskDraft) => void | Promise<void>;
  onDeleteSubtask?: (taskId: string, returnFocus?: HTMLElement | null) => void;
  onInitialAttentionTargetHandled?: () => void;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
  onOpenRelatedTask?: (taskId: string) => void;
  onOwnerChange?: (owner: string[]) => void | Promise<void>;
  onParticipantsChange?: (participants: string[]) => void;
  discussionReferenceTasks?: DiscussionReferenceTask[];
  onOpenDiscussionReferenceTask?: (taskId: string) => void;
  onDiscussionSave?: (current: CollaborationSnapshot, next: CollaborationSnapshot, message: CollaborationMessage) => CollaborationSnapshot;
  onDiscussionRead?: (taskId: string, activityIds: string[], readThrough: string) => void;
  onPathSelect?: (nodeId: string) => void;
  onBackToList?: () => void;
  hidePathNavigation?: boolean;
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
  taskNumber?: number;
  /** The task owner, the team Owner and Admins may pin discussion messages. */
  canPinDiscussion?: boolean;
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
  collaborationSeedFiles,
  completedMinutesByTaskId,
  effortTasks = [],
  progressComparisonsByTaskId = {},
  recordedActivities = [],
  childTasks = [],
  subtaskSuggestions = [],
  projectSubtaskSuggestions,
  canConfirmSubtaskSuggestions = false,
  onConfirmSubtaskSuggestions,
  subtaskDiscussionLinks = [],
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
  onCreateDiscussionSubtask = onCreateSubtask,
  onDeleteSubtask,
  onInitialAttentionTargetHandled,
  onInviteMembers,
  onOpenRelatedTask,
  onOwnerChange,
  onParticipantsChange,
  discussionReferenceTasks,
  onOpenDiscussionReferenceTask,
  onDiscussionSave,
  onDiscussionRead,
  onPathSelect,
  onBackToList,
  hidePathNavigation = false,
  hidden = false,
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
  taskNumber,
  canPinDiscussion = false,
}: TaskDetailProps) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const timeZone = useTeamTimeZone();
  const [editingOriginal, setEditingOriginal] = useState<"title" | "goal" | null>(null);
  const [discussionSubtaskSource, setDiscussionSubtaskSource] = useState<NonNullable<NewSubtaskDraft["sourceDiscussion"]> | null>(null);
  const discussionSubtaskTrigger = useRef<HTMLElement | null>(null);
  const d = useDetailCopy();
  const taskFavorite = useFavorite("task", taskId);
  const favoriteLabel = taskFavorite.active ? (locale === "en" ? "Remove from favorites" : "取消收藏") : (locale === "en" ? "Add to favorites" : "收藏");
  const taskNumberText = taskNumber === undefined ? undefined : `#${taskNumber}`;
  const taskNumberCopyLabel = taskNumberText === undefined ? undefined : `${d("copyTaskNumber")} ${taskNumberText}`;
  const copyTaskNumber = async (text: string) => {
    try {
      await copyTextToClipboard(text);
      toast.success(d("taskNumberCopied"));
    } catch {
      toast.error(d("taskNumberCopyFailed"));
    }
  };
  const completionCriteria = task.completionCriteria ?? [];
  const burnUp = task.burnUp;
  const progressAssessment = getTaskProgressAssessment(burnUp, effortTasks);
  const hasBurnUp = progressAssessment.hasTrend;
  const mock = useMockText();
  const collaboration = useTaskCollaboration(teamId, taskId, collaborationSeedFiles ?? task.files);
  const pendingDiscussionRef = useRef<{ signature: string; message: CollaborationMessage } | null>(null);
  const allFiles = collaboration.snapshot.files;
  const taskFiles = useMemo(() => getTaskFiles(allFiles), [allFiles]);
  const discussionFiles = useMemo(() => allFiles.filter(file => file.discussionOnly), [allFiles]);
  const allMessages = useMemo(() => mergeCollaborationMessages(task.activities, collaboration.snapshot.messages), [task.activities, collaboration.snapshot.messages]);
  const contentIndicators = getTaskContentIndicators({
    messages: allMessages, files: taskFiles,
    enabled: !collaboration.error,
  });
  const activities = allMessages;
  const suggestionsById = new Map(subtaskSuggestions.map(item => [item.id, item]));
  if (!collaboration.error) {
    for (const item of projectSubtaskSuggestions?.(activities) ?? []) suggestionsById.set(item.id, item);
  }
  const suggestionReview = useSubtaskSuggestionReview(teamId, taskId, [...suggestionsById.values()]);
  const currentSuggestions = suggestionReview.suggestions.filter(item => isSubtaskSuggestionContextCurrent(item, activities));
  const outdatedSuggestions = suggestionReview.suggestions.filter(item => !isSubtaskSuggestionContextCurrent(item, activities));
  const suggestionsByDiscussionRoot = groupSubtaskSuggestionsByDiscussionRoot(currentSuggestions, activities);
  const outdatedByDiscussionRoot = groupSubtaskSuggestionsByDiscussionRoot(outdatedSuggestions, activities);
  const discussionFollowups: Record<string, { tasks: DiscussionTaskLink[]; suggestionCount: number; hasOutdated?: boolean }> = {};
  for (const [messageId, tasks] of groupTaskDiscussionLinksByRoot(subtaskDiscussionLinks, activities)) {
    discussionFollowups[messageId] = { tasks, suggestionCount: 0 };
  }
  for (const [messageId, suggestions] of suggestionsByDiscussionRoot) {
    (discussionFollowups[messageId] ??= { tasks: [], suggestionCount: 0 }).suggestionCount = suggestions.length;
  }
  for (const messageId of outdatedByDiscussionRoot.keys()) {
    (discussionFollowups[messageId] ??= { tasks: [], suggestionCount: 0 }).hasOutdated = true;
  }
  const localActivities = collaboration.snapshot.messages.filter(message => !message.deletedAt);
  const initialTab = getTaskDetailTabForTarget(activities, initialAttentionTarget);
  const [activeTab, setDetailTab] = useState<TaskDetailTab>(
    !initialAttentionTarget || ["details", "criteria"].includes(initialAttentionTarget.kind) ? "discussion" : initialTab);
  const setActiveTab = (tab: TaskDetailTab) => setDetailTab(tab);
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
  const hasAnalysisContent = taskAiProgressRatio !== null;
  const visibleTab = activeTab === "ai" && !hasAnalysisContent ? "discussion" : activeTab;
  useEffect(() => {
    if (activeTab !== "ai" || hasAnalysisContent) return;
    setDetailTab("discussion");
    if (document.activeElement?.id === "task-detail-tab-ai") {
      document.getElementById("task-detail-tab-discussion")?.focus({ preventScroll: true });
    }
  }, [activeTab, hasAnalysisContent]);
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
      task: { ...task, activities: allMessages, files: allFiles, title: currentTitle, goal: currentGoal, status: currentStatus, owner: confirmedOwnerId, participants: currentParticipants, due: plannedEndOn ?? task.due },
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
    if (["details", "criteria"].includes(initialAttentionTarget.kind)) {
      setActiveTab("discussion");
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

  const changeOwner = async (value: string[]): Promise<boolean> => {
    if (!onOwnerChange || ownerSaving) return false;
    const sequence = ++ownerSaveSequence.current;
    const scope = ownerSaveScope.current;
    const isCurrent = () => sequence === ownerSaveSequence.current && scope === ownerSaveScope.current;
    setOwnerSaveFailed(false);
    setOwnerSaving(true);
    try {
      await onOwnerChange(value);
      if (!isCurrent()) return false;
      setCurrentOwner(value);
      setCurrentParticipants((items) => items.filter((id) => !value.includes(id)));
      return true;
    } catch {
      if (isCurrent()) setOwnerSaveFailed(true);
      return false;
    } finally {
      if (isCurrent()) setOwnerSaving(false);
    }
  };

  const changeParticipants = (value: string[]) => {
    setCurrentParticipants(value);
    onParticipantsChange?.(value);
  };

  // A task keeps at least one person, and taking away your own access asks first; nothing changes until confirmed.
  const [peopleError, setPeopleError] = useState(false);
  const [leaveRequest, setLeaveRequest] = useState<{ kind: TaskLeaveKind; apply: () => Promise<boolean> } | null>(null);
  useEffect(() => { setPeopleError(false); setLeaveRequest(null); }, [taskId]);
  const keepsAPerson = (ownerId: string, participants: string[]) => Boolean(ownerId) || participants.length > 0;
  const requestOwnerChange = (value: string[]) => {
    const nextOwner = value[0] ?? "";
    const nextParticipants = currentParticipants.filter(id => id !== nextOwner);
    if (!keepsAPerson(nextOwner, nextParticipants)) { setPeopleError(true); return; }
    setPeopleError(false);
    if (confirmedOwnerId === currentUserId && nextOwner !== currentUserId && !nextParticipants.includes(currentUserId)) {
      setLeaveRequest({ kind: "owner", apply: () => changeOwner(value) });
      return;
    }
    void changeOwner(value);
  };
  const requestParticipantsChange = (value: string[]) => {
    if (!keepsAPerson(confirmedOwnerId, value)) { setPeopleError(true); return; }
    setPeopleError(false);
    if (confirmedOwnerId !== currentUserId && currentParticipants.includes(currentUserId) && !value.includes(currentUserId)) {
      setLeaveRequest({ kind: "collaborator", apply: async () => { changeParticipants(value); return true; } });
      return;
    }
    changeParticipants(value);
  };
  const confirmLeave = async () => {
    const request = leaveRequest;
    setLeaveRequest(null);
    if (!request || !await request.apply()) return;
    toast.success(d("leftTask"));
    onBackToList?.();
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
      mentionedPrincipalIds: draft.mentions.filter(id => id !== ALL_TASK_MEMBERS_MENTION_ID),
      ...(draft.mentions.includes(ALL_TASK_MEMBERS_MENTION_ID) ? { mentionsAllTaskMembers: true } : {}),
      quote: draft.quote,
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

  const openDiscussionSubtask = (message: CollaborationMessage, trigger: HTMLElement) => {
    if (!onCreateDiscussionSubtask || collaboration.error || discussionSubtaskSource || message.deletedAt) return;
    discussionSubtaskTrigger.current = trigger;
    setDiscussionSubtaskSource({ taskId, messageId: message.id, body: message.message, author: message.author });
  };
  const closeDiscussionSubtask = () => {
    const trigger = discussionSubtaskTrigger.current;
    const messageId = discussionSubtaskSource?.messageId;
    setDiscussionSubtaskSource(null);
    window.requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      else (document.getElementById(`task-activity-${messageId}`) ?? document.getElementById("task-detail-panel-discussion"))?.focus({ preventScroll: true });
    });
  };
  const createDiscussionSubtask = async (draft: NewSubtaskDraft) => {
    if (!onCreateDiscussionSubtask) throw new Error(locale === "en" ? "You no longer have permission to create subtasks here. Your input has been kept." : "你已没有当前任务的子任务创建权限，输入已保留。");
    await onCreateDiscussionSubtask(draft);
    toast.success(locale === "en" ? "Subtask created" : "子任务已创建");
  };
  const renderDiscussionSubtask = (message: CollaborationMessage) => {
    if (!discussionSubtaskSource || discussionSubtaskSource.messageId !== message.id) return null;
    let request;
    try { request = buildDiscussionSubtaskRequest({ locale, currentDate: taskCalendarDate(new Date().toISOString(), timeZone)!, task: { id: taskId, title: currentTitle, goal: currentGoal, completionCriteria }, sourceMessageId: discussionSubtaskSource.messageId, messages: allMessages, members, labels: tagDefinitions.map(tag => tag.name), referenceTasks: discussionReferenceTasks }); } catch { /* Keep the source and allow manual editing when context cannot be read. */ }
    return <DiscussionSubtaskCreateForm messages={allMessages} request={request} currentUserId={currentUserId} id={`task-discussion-subtask-create-${taskId}-${message.id}`} source={discussionSubtaskSource} contextCurrent={(!request || isDiscussionSubtaskRequestCurrent(request, allMessages)) && allMessages.some(item => item.id === discussionSubtaskSource.messageId && !item.deletedAt && ["member-post", "member-reply"].includes(item.type) && item.message === discussionSubtaskSource.body && item.author === discussionSubtaskSource.author)} key={`${taskId}-${message.id}`} members={members} onCancel={closeDiscussionSubtask} onCreate={createDiscussionSubtask} tags={tagDefinitions} />;
  };

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
    if (allFiles.some(candidate => candidate.id === file.id && !candidate.archived)) {
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
      setActiveTab("discussion");
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
      setActiveTab("discussion");
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
    { id: "discussion", label: d('discussion'), count: contentIndicators.discussionCount },
    { id: "files", label: d('files'), count: contentIndicators.fileCount },
    { id: "subtasks", label: d("subtasks") },
    { id: "activity", label: d('activity') },
    ...(hasAnalysisContent ? [{ id: "ai" as const, label: d('analysisTab') }] : []),
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

  const renderSubtaskSuggestions = (messageId?: string) => {
    const scopedSuggestions = messageId === undefined ? currentSuggestions : suggestionsByDiscussionRoot.get(messageId) ?? [];
    const hasOutdated = messageId === undefined ? outdatedSuggestions.length > 0 : Boolean(outdatedByDiscussionRoot.get(messageId)?.length);
    const entry = messageId === undefined ? "subtasks" : "discussion";
    const canConfirm = entry === "subtasks" ? Boolean(onCreateSubtask) : canConfirmSubtaskSuggestions;
    return <>
      {suggestionReview.error && (scopedSuggestions.length > 0 || hasOutdated) && <p className="task-subtask-suggestions-notice is-error" role="alert">{suggestionReview.error}<button className="task-subtask-suggestions-reload" onClick={suggestionReview.reload} type="button">{locale === "en" ? "Reload suggestions" : "重新载入建议"}</button></p>}
      {hasOutdated && <p className="task-subtask-suggestions-update" role="status">{locale === "en" ? "Discussion changed. Suggestions need to be refreshed." : "讨论已更新，建议待重新整理。"}</p>}
      <TaskSubtaskSuggestions
        currentUserId={currentUserId}
        tags={tagDefinitions}
        suggestions={scopedSuggestions}
        members={members}
        disabled={!canConfirm || !onConfirmSubtaskSuggestions || suggestionReview.blocked || Boolean(collaboration.error)}
        onDismissSelected={suggestionReview.dismissMany}
        variant={entry}
        onConfirm={async (ids: string[], draft?: NewSubtaskDraft) => {
          if (!onConfirmSubtaskSuggestions) throw new Error(locale === "en" ? "Task creation is unavailable. Please reopen this task." : "当前无法创建任务，请重新打开任务。");
          const requestedIds = new Set(ids);
          const requestedSuggestions = scopedSuggestions.filter(item => requestedIds.has(item.id));
          if (!requestedIds.size || requestedSuggestions.length !== requestedIds.size) {
            throw new Error(locale === "en" ? "These suggestions have changed. Review the current list and try again." : "建议已有变化，请核对当前列表后重试。");
          }
          const finalSuggestions = draft ? requestedSuggestions.map(item => ({ ...item, title: draft.title, completionCriteria: draft.completionCriteria, labels: draft.labels, goal: draft.goal ?? "", ownerId: draft.ownerId ?? "", participantIds: draft.participantIds, endDate: draft.endDate ?? "" })) : requestedSuggestions;
          await onConfirmSubtaskSuggestions(finalSuggestions, suggestionReview.review, suggestionReview.savedRaw.current, entry);
          suggestionReview.reload();
          if (messageId !== undefined) window.requestAnimationFrame(() => document.getElementById(`task-activity-${messageId}`)?.focus({ preventScroll: true }));
        }}
      />
    </>;
  };

  return <MockTaskProvider taskId={taskId}><section aria-label={d('details')} className="task-detail-view task-detail-split" hidden={hidden} inert={hidden} ref={detailScrollRef} tabIndex={-1}>
    <TaskDetailStickySummary status={currentStatus} progressRatio={taskAiProgressRatio} pathItems={taskPathItems.map(item => ({ ...item, label: mock.field(item.id, "title", item.label) }))} onPathSelect={onPathSelect} activeTab={visibleTab} headerRef={detailHeaderRef} scrollRef={detailScrollRef} taskId={taskId} title={editingOriginal === "title" || titleSave.status === "error" ? currentTitle : mock.field(taskId, "title", currentTitle)} />
    <div className="task-detail-property-layout">
    <header className="task-detail-header" ref={detailHeaderRef}>
      {!hidePathNavigation && taskPathItems.some(item => item.id !== taskId) && <div className="task-detail-kicker">{taskPathItems.some(item => item.id !== taskId) ? <nav aria-label={d('path')} className="task-detail-path">{taskPathItems.map((item, index) => {
        const label = mock.field(item.id, "title", item.label);
        return <span key={item.id}>
        {index > 0 && <ChevronRight aria-hidden="true" size={12} />}
        {index < taskPathItems.length - 1 && onPathSelect ? <button onClick={() => onPathSelect(item.id)} title={label} type="button">{label}</button> : <em aria-current={index === taskPathItems.length - 1 ? "page" : undefined} title={label}>{label}</em>}
      </span>;
      })}</nav> : null}</div>}
            <div className="task-detail-title-row">
              <TaskCompletionIndicator key={taskId} status={currentStatus} completed={currentStatus === "已完成"} progressRatio={taskAiProgressRatio} evidence={taskAiProgressEvidence} onToggle={onTaskStatusChange ? () => setTaskCompleted(currentStatus !== "已完成") : undefined} />
              <div aria-busy={titleSave.status === "saving" || undefined} className="task-detail-title-content"><h1><Input title={editingOriginal === "title" ? currentTitle : mock.field(taskId, "title", currentTitle)} readOnly={!onTaskTitleChange} aria-label={d('name')} aria-describedby={titleSave.status === "error" ? `task-title-save-error-${taskId}` : undefined} className="task-detail-title-input" onFocus={() => { titleSave.clear(); setEditingOriginal("title"); }} onBlur={() => { setEditingOriginal(null); void titleSave.save(currentTitle, task.title, onTaskTitleChange); }} onChange={(event) => { titleSave.clear(); setCurrentTitle(event.target.value.replace(/[\r\n]+/g, " ")); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.blur(); } }} value={editingOriginal === "title" || titleSave.status === "error" ? currentTitle : mock.field(taskId, "title", currentTitle)} /></h1>{titleSave.status === "saving" && <span className="sr-only" role="status">{d("fieldSaving")}</span>}</div>
              <div className="task-ai-detail-tools">
                {taskNumberText !== undefined && <Tooltip.Root>
                  <Tooltip.Trigger
                    aria-label={taskNumberCopyLabel}
                    delay={180}
                    onClick={() => void copyTaskNumber(taskNumberText)}
                    render={<Button className="task-number-copy w-auto min-w-(--ad-control-height-sm) px-1.5 tabular-nums" size="icon-sm" type="button" variant="ghost" />}
                  >
                    {taskNumberText}
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner className="z-100" side="bottom" sideOffset={6}>
                      <Tooltip.Popup className="rounded-(--ad-radius-control) bg-(--ad-ink) px-2 py-1 text-(length:--ad-text-caption) text-(--ad-surface) whitespace-nowrap">
                        {taskNumberCopyLabel}
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>}
                {taskFavorite.available && <Button aria-label={favoriteLabel} className="task-favorite-toggle" data-active={taskFavorite.active || undefined} onClick={() => { if (taskFavorite.toggle() === null) toast.error(locale === "en" ? "Could not update favorites. Please try again." : "收藏未能更新，请重试。"); }} size="icon-sm" title={favoriteLabel} type="button" variant="ghost"><Star aria-hidden="true" /></Button>}
                <AiConnectionButton contextLabel={d('current')} key={taskId} onConnect={openTaskAiConnection} />
              </div>
            </div>
      {titleSave.status === "error" && <p className="task-field-save-error" id={`task-title-save-error-${taskId}`} role="alert">{d("fieldSaveFailed")}</p>}

      <section aria-label={d('goalAndExecution')} className="task-detail-header-definition" id="task-detail-document">
        <div aria-label={d('information')} className="task-detail-brief" id={`task-heading-${taskId}`} tabIndex={-1}>
            <div className="task-detail-description">
              <div className="task-detail-goal-field"><span className="task-detail-field-label">{d('goal')}</span><div className="task-detail-goal-content"><div aria-busy={goalSave.status === "saving" || undefined} className="task-detail-goal-editor"><Textarea aria-label={d('taskGoal')} aria-describedby={goalSave.status === "error" ? `task-goal-save-error-${taskId}` : undefined} className="task-detail-goal-input" onFocus={() => { goalSave.clear(); setEditingOriginal("goal"); }} onBlur={() => { setEditingOriginal(null); void goalSave.save(currentGoal, task.goal, onTaskGoalChange); }} onChange={(event) => { goalSave.clear(); setCurrentGoal(event.target.value); }} placeholder={onTaskGoalChange ? d('addGoal') : d('noGoal')} readOnly={!onTaskGoalChange} rows={1} value={editingOriginal === "goal" || goalSave.status === "error" ? currentGoal : mock.field(taskId, "goal", currentGoal)} />{goalSave.status === "saving" && <span className="sr-only" role="status">{d("fieldSaving")}</span>}</div>{goalSave.status === "error" && <p className="task-field-save-error" id={`task-goal-save-error-${taskId}`} role="alert">{d("fieldSaveFailed")}</p>}</div></div>
              <div aria-label={d('criteria')} id={`task-criteria-${taskId}`} key={`criteria-${taskId}`} tabIndex={-1}>
                <TaskCompletionCriteria completed={currentStatus === "已完成"} onTaskComplete={onTaskStatusChange ? setTaskCompleted : undefined} key={taskId} reviews={task.criterionReviews} onConfirm={onTaskCriterionConfirm} criteria={completionCriteria} onSave={onTaskCriteriaSave} source="recorded" />
              </div>
            </div>
        </div>



      </section>
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


    <div aria-labelledby="task-detail-tab-subtasks" className="task-detail-subtasks-pane" hidden={visibleTab !== "subtasks"} id="task-detail-panel-subtasks" role="tabpanel" tabIndex={-1}>
      <TaskSubtasksPane taskId={taskId} key={taskId} currentUserId={currentUserId} members={members} tags={tagDefinitions} onCreate={onCreateSubtask} progressComparisonsByTaskId={progressComparisonsByTaskId} effortTasks={effortTasks} completedMinutesByTaskId={completedMinutesByTaskId} onOpenTask={onOpenRelatedTask} tasks={childTasks} suggestions={renderSubtaskSuggestions()} />
    </div>

    {hasAnalysisContent && <section aria-labelledby="task-detail-tab-ai" className="task-detail-ai-panel" hidden={visibleTab !== "ai"} id="task-detail-panel-ai" role="tabpanel">
        <div className="task-detail-ai-analysis" key={`ai-analysis-${taskId}`}>
          <section aria-label={d('progress')} className="task-detail-progress-section">
          <TaskWorkloadSummary compact headingAction={onRepredict ? <div className="task-detail-analysis-action">
            <TaskProgressRefresh key={taskId} scope="task" onRepredict={refreshAnalysis}/>
          </div> : undefined} progressTask={{...progressTask,status:currentStatus}} comparison={progressComparison} completedMinutesByTaskId={completedMinutesByTaskId} progressComparisonsByTaskId={leafProgressComparisons} key={taskId} effortTasks={effortTasks} hasSubtasks={childTasks.length > 0} onOpenTask={onOpenRelatedTask} needsReview={progressNeedsReview} series={burnUp} />
          </section>
          <TaskCurrentSituation hasBurnUp={hasBurnUp} key={`situation-${taskId}`} model={situation} onOpenReference={openSituationReference}/>
        </div>    </section>}

    <section aria-labelledby="task-detail-tab-discussion" className="task-detail-section task-discussion-panel first-section" hidden={visibleTab !== "discussion"} id="task-detail-panel-discussion" role="tabpanel" tabIndex={-1}>
      <TaskDiscussion teamId={teamId ?? ""} taskId={taskId} canPin={canPinDiscussion} active={visibleTab === 'discussion'} readable={!collaboration.error} readRequestSequence={discussionReadRequestSequence} onRead={(ids, through) => onDiscussionRead?.(taskId, ids, through)} activities={activities} attentionTarget={discussionAttention} draftInsertion={discussionInsertion} currentUser={currentUserId} currentUserName={currentUser} draftKey={collaboration.scopeKey} files={allFiles} key={taskId} onConnectAi={openDiscussionAi} onOpenFile={(id, version) => openFile(id, version, true)} onPreviewAttachment={previewAttachment} onPost={(draft, replyToId) => { postDiscussion(draft, replyToId); if (!replyToId && discussionInsertion) { discussionInsertion.onPublished(draft); setDiscussionInsertion(undefined); } }} onDelete={deleteDiscussion} people={activityPeople}
        onCreateSubtask={onCreateDiscussionSubtask && !collaboration.error ? openDiscussionSubtask : undefined} creatingSubtask={Boolean(discussionSubtaskSource)} retainedSubtaskSources={discussionSubtaskSource ? [discussionSubtaskSource] : []} renderAfterMessage={renderDiscussionSubtask} followupsByMessageId={discussionFollowups} onOpenFollowupTask={onOpenRelatedTask} referenceTasks={discussionReferenceTasks} onOpenReferenceTask={onOpenDiscussionReferenceTask} renderSuggestions={messageId => renderSubtaskSuggestions(messageId)} />
    </section>

      <section aria-labelledby="task-detail-tab-files" className="task-detail-section task-files-panel first-section" hidden={activeTab !== "files"} id="task-detail-panel-files" role="tabpanel">
      <TaskFileExplorer browserMode deletionAccess={{ ownerId: confirmedOwnerId, participantIds: currentParticipants, activeMemberIds: activityPeople }} discussionFiles={discussionFiles} transientPreviewFile={attachmentPreview?.taskId === taskId ? attachmentPreview.file : null} onPreviewClose={() => setAttachmentPreview(null)} onAnnotationExitControllerChange={onAnnotationExitControllerChange} onSaved={onFileSaved} currentUser={currentUser} currentUserId={currentUserId} onStartDiscussion={(draft, onPublished) => { setDiscussionInsertion({ id: crypto.randomUUID(), draft, onPublished }); setActiveTab("discussion"); }} files={taskFiles} focusedFileId={selectedFileId} focusedVersion={selectedFileVersion} focusedSequence={fileFocusSequence} focusedTrigger={activeTab === "discussion" ? filePreviewTrigger.current : null} preserveFocusedDirectory={activeTab === "discussion"} key={taskId} taskId={taskId} taskTitle={currentTitle} taskGoal={task.goal}
        onNodesChange={files => collaboration.commit(snapshot => replaceCollaborationFiles(snapshot, files, { actorId: currentUserId, ownerId: confirmedOwnerId, participantIds: currentParticipants, activeMemberIds: activityPeople }))}
        />
    </section>

    {activeTab === "activity" && <section aria-labelledby="task-detail-tab-activity" className="task-detail-section task-activity-section first-section" id="task-detail-panel-activity" role="tabpanel" tabIndex={-1}>
      <TaskActivityLog activities={activities.filter(message => !message.deletedAt)} commits={task.commits} files={taskFiles} focusedTargetId={situationAttentionId ?? initialAttentionTarget?.targetId} onOpenDiscussion={openActivityDiscussion} onOpenFile={openFile} />
    </section>}

    </div>
    </div>

    <aside className="task-detail-property-sidebar" aria-label={d('properties')}>
      <div aria-label={d('properties')} className="task-detail-primary-properties">
        <div className="task-detail-property task-detail-status-field"><small>{d('status')}</small><TaskStatusBadge editable={Boolean(onTaskStatusChange)} onChange={changeStatus} size="sm" value={currentStatus} progressRatio={taskAiProgressRatio} /></div>
        <div aria-busy={ownerSaving || undefined} aria-describedby={ownerSaveFailed ? `task-owner-save-error-${taskId}` : undefined} aria-label={`${d("owner")}: ${displayedOwnerName}`} className="task-detail-property" role="group" title={displayedOwnerName}><small>{d('ownerField')}</small><MemberSelector avatarSize="sm" stacked allowUnassigned={!displayedOwnerId} disabled={!onOwnerChange || ownerSaving} hideHeader hideSelectedName label={d('owner')} max={1} memberRecommendations={memberRecommendations} members={members} min={0} onChange={requestOwnerChange} onInviteMembers={onInviteMembers} selected={displayedOwnerId ? [displayedOwnerId] : []} /></div>
        <div className="task-detail-property task-detail-participants"><MemberSelector participantSummary showFullList avatarSize="sm" displayMax={Math.max(currentParticipants.length, 1)} hideHeader hideSelectedName key={taskId} label={d('participantsField')} memberRecommendations={memberRecommendations} members={participantMembers} disabled={!onParticipantsChange} onChange={requestParticipantsChange} onInviteMembers={onInviteMembers} selected={currentParticipants} stacked /></div>
        <TaskDueDatePicker minDate={taskCalendarDate(progressTask?.createdAt, timeZone) ?? ""} initialValue={plannedEndOn ?? toDateInputValue(task.due)} key={`due-${taskId}`} label={d('dueDate')} onChange={(endDate) => onTaskPeriodChange?.(endDate ? { end: endDate, start: "" } : null)} />
      </div>
      {peopleError && <p className="task-field-save-error" role="alert">{d("needsAPerson")}</p>}
      {ownerSaveFailed && <p className="task-field-save-error" id={`task-owner-save-error-${taskId}`} role="alert">{locale === "en" ? "Could not update the assignee. The previous assignee is unchanged. Please try again." : "负责人修改失败，仍保留原负责人，请重试。"}</p>}
        {(tags.length > 0 || onTagsChange) && <section aria-labelledby={`task-tags-heading-${taskId}`} className="task-detail-section task-detail-tags-section">
          <h2 className="task-detail-property-sidebar-heading" id={`task-tags-heading-${taskId}`}>{d('tags')}</h2>
          <TaskTagList showAll iconOnly key={`tags-${taskId}`} onChange={onTagsChange} selected={tags} tags={tagDefinitions} />
        </section>}
    </aside>
    </div>

    <TaskLeaveDialog kind={leaveRequest?.kind ?? null} onCancel={() => setLeaveRequest(null)} onConfirm={() => { void confirmLeave(); }} />
    {aiConnectionRequest?.taskId === taskId && <AiConnectionDialog onClose={closeAiConnection} request={aiConnectionRequest.request} returnFocus={aiConnectionTrigger.current} />}
  </section></MockTaskProvider>;
}
