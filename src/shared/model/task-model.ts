import type { CriterionReview } from "@/features/tasks/lib/task-criterion-review";
import type { TaskBurnUpSeries } from "@/shared/model/task-burn-up";
import type { TaskDiagnosisSnapshot } from "@/shared/model/task-diagnosis";
import type { TaskEffortBaseline, TaskEffortEstimate } from "@/shared/model/task-effort";

// The task domain's types (TaskDoor ADR-0014 §3), moved unchanged out of data/workspaceNodes.ts,
// data/taskDetailMocks.ts and data/sharedTypes.ts. The fixtures keep the seeds and import these.

type BaseNode = {
  id: string;
  kind: "folder" | "task" | "file";
  name: string;
  parentId: string | null;
  /** Local fixture projection only. Production authorization must remain server-side. */
  teamId?: string;
  updatedAt: string;
};

export type FolderNode = BaseNode & { kind: "folder" };

export const taskIconToneValues = ["neutral", "blue", "cyan", "green", "amber", "red", "purple", "pink", "teal", "orange", "indigo", "slate", "ocean", "jade", "olive", "apricot", "lilac", "rose"] as const;
export type TaskIconTone = typeof taskIconToneValues[number];
export const taskIconNameValues = ["list-todo", "clipboard-check", "target", "flag", "briefcase", "file-check", "chart", "sparkles", "megaphone", "shopping-bag", "gift", "store", "pen-tool", "palette", "camera", "video", "mic", "file-text", "presentation", "book-open", "code", "bug", "database", "globe", "users", "message-square", "calendar-days", "handshake", "rocket", "lightbulb", "shield-check", "package"] as const;
export type TaskIconName = typeof taskIconNameValues[number];
export type WorkspaceTaskStatus = "待开始" | "进行中" | "待审核" | "已阻塞" | "已完成" | "已取消";

export type TaskNode = BaseNode & {
  kind: "task";
  completionCriteria?: string[];
  criterionReviews?: CriterionReview[];
  executionTips?: string[];
  effortEstimate?: TaskEffortEstimate;
  effortBaseline?: TaskEffortBaseline;
  proposedOwnerId?: string;
  createdFrom?: "task-planner" | "task-editor";
  createdBy?: string;
  createdAt?: string;
  completedAt?: string;
  progressReopenedAt?: string;
  dependsOnTaskIds?: string[];
  ownerId: string;
  participantIds?: string[];
  parentTaskId?: string;
  plannedEndOn?: string;
  plannedStartOn?: string;
  status: WorkspaceTaskStatus;
  goal?: string;
  dueAt?: string;
  iconName?: TaskIconName;
  iconTone?: TaskIconTone;
  labels?: string[];
};

export type FileNode = BaseNode & {
  kind: "file";
  fileType: string;
  size?: string;
};

export type WorkspaceNode = FolderNode | TaskNode | FileNode;

export const workspaceRootId = "workspace-root";

type TaskStatus = TaskNode["status"];

export type TaskDetailId = "fragrance-creator-wrapup" | "fragrance-creator-business" | "fragrance-content" | "fragrance-live" | "fragrance-product" | "fragrance-growth" | "fragrance-data" | "fragrance-compliance" | "fragrance-final-decision";

export type TaskFileNode = {
  blobId?: string;
  sizeBytes?: number;
  originalName?: string;
  archived?: boolean;
  content?: string;
  format?: string;
  iconName?: string;
  id: string;
  kind: "folder" | "file";
  mimeType?: string;
  name: string;
  parentId: string | null;
  previewData?:
    | { kind: "table"; sheets: Array<{ name: string; columns: string[]; rows: string[][] }> }
    | { kind: "image"; alt: string; src: string; width?: number; height?: number }
    | { kind: "pdf"; pages: string[] }
    | { kind: "markdown" | "text" | "document"; text: string };
  sizeLabel?: string;
  updatedAt: string;
  version?: number;
};

export type TaskActivityType =
  | "member-post"
  | "member-reply"
  | "ai-insight"
  | "status-change"
  | "schedule-change"
  | "participant-added"
  | "title-change"
  | "goal-change"
  | "owner-change"
  | "owner-proposal"
  | "participants-change"
  | "tags-change"
  | "appearance-change"
  | "task-definition-change";

export type TaskActivityChange = {
  label: string;
  before: string | null;
  after: string | null;
};

export type TaskActivityMock = {
  author: string;
  changes?: TaskActivityChange[];
  createdAt?: string;
  file?: string;
  id: string;
  insightType?: "协作重点" | "状态一致性" | "证据缺口" | "验收风险";
  message: string;
  replyToActivityId?: string;
  time: string;
  type: TaskActivityType;
};

export type TaskCommitMock = {
  author: string;
  createdAt?: string;
  files: string[];
  id: string;
  message: string;
  time: string;
};

export type TaskDetailContent = {
  burnUp?: TaskBurnUpSeries;
  completionCriteria?: string[];
  criterionReviews?: CriterionReview[];
  executionTips?: string[];
  activities: TaskActivityMock[];
  commits: TaskCommitMock[];
  due: string;
  diagnosis?: TaskDiagnosisSnapshot;
  files: TaskFileNode[];
  goal: string;
  iconName?: TaskIconName;
  iconTone?: TaskIconTone;
  owner: string;
  participantInvitationStatus?: Record<string, "accepted" | "pending">;
  participants: string[];
  status: TaskStatus;
  summary: string;
  title: string;
};

/** Shared data contracts kept free of component/runtime imports. */
export type PersonOption = {
  membershipStatus?: "active" | "invited";
  avatarUrl?: string;
  availability?: string;
  currentWork?: string[];
  dynamicResponsibility?: string;
  email: string;
  id: string;
  name: string;
  phone?: string;
  recentActivity?: string;
  role: string;
  statusMessage?: string;
};

export type TagIconName = "tag" | "folder" | "flag" | "layers" | "package" | "shopping" | "users" | "building" | "coins" | "shield" | "wrench" | "sparkles";
export type TagColorName = "gray" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "red" | "purple" | "pink";
export type TagDefinition = { id: string; name: string; icon: TagIconName; color: TagColorName };
