import type { TaskEffortEstimate } from "./taskEffort";

/** Shared local-Mock candidate contract. Nothing in this module writes tasks. */
export type TaskAiEditableTask = {
  id: string;
  title: string;
  goal: string;
  goalInherited?: boolean;
  parentTaskId?: string;
  completionCriteria: string[];
  executionTips: string[];
  ownerId: string;
  proposedOwnerId?: string;
  participantIds: string[];
  createdAt?: string;
  startDate: string;
  endDate: string;
  endDateLabel?: string;
  dependsOnTaskIds: string[];
  effortEstimate?: TaskEffortEstimate;
};

export type TaskAiAdjustmentScope =
  | { kind: "task" }
  | { kind: "subtasks" }
  | { kind: "subtask"; taskId: string };

export type TaskAiAdjustmentContext = {
  mode: "draft" | "saved";
  currentUserId: string;
  task: TaskAiEditableTask;
  subtasks: TaskAiEditableTask[];
  members: Array<{ id: string; name: string; availability?: string; currentWork?: string[]; dynamicResponsibility?: string }>;
  dependencyTasks: Array<{ id: string; title: string; dependsOnTaskIds: string[]; parentTaskId?: string; endDate?: string }>;
  canAddSubtasks: boolean;
};

export type TaskAiEditableFields = Pick<TaskAiEditableTask,
  "title" | "goal" | "completionCriteria" | "executionTips" | "ownerId" | "participantIds" | "startDate" | "endDate" | "dependsOnTaskIds" | "effortEstimate"
>;

export type TaskAiAdjustmentChange = {
  taskId: string;
  taskTitle: string;
  label: string;
  before: string | null;
  after: string | null;
};

export type TaskAiAdjustmentProposal = {
  baseSignature: string;
  instruction: string;
  scope: TaskAiAdjustmentScope;
  updates: Array<{ taskId: string; patch: Partial<TaskAiEditableFields> }>;
  additions: TaskAiEditableTask[];
  changes: TaskAiAdjustmentChange[];
  summary: string;
};

export type TaskAiAdjustmentResult = { proposal: TaskAiAdjustmentProposal } | { error: string };

export type TaskAiAdjustmentApplicationStatus = "pending" | "applied" | "not_applied" | "expired" | "no_change";

/** Observable local preview status, never a model's internal reasoning or a tool trace. */
export type TaskAiAdjustmentProgress = {
  id: string;
  taskId: string;
  instruction: string;
  steps: Array<{ label: string; detail: string; basis: string }>;
  activeStep: number;
  status: "running" | "completed" | "stopped" | "failed";
  outcome?: string;
  responseSummary?: string;
  changes?: TaskAiAdjustmentChange[];
  applicationStatus?: TaskAiAdjustmentApplicationStatus;
};
