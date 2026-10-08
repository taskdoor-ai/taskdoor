import type { TaskActivityMock, TaskCommitMock, TaskFileNode } from "@/shared/model/task-model";

// The shapes the diagnosis mocks and the task detail share. The report builder stays in
// lib/taskDiagnosis.ts with its input and report types.

export type TaskDiagnosisContext = {
  goal: string;
  completionCriteria: string[];
  activities: TaskActivityMock[];
  commits: TaskCommitMock[];
  files: TaskFileNode[];
  unavailableFileCount?: number;
};

export type TaskDiagnosisTask = {
  context?: TaskDiagnosisContext;
  decisionConflicts?: TaskDiagnosisConflictInput[];
  dependsOnTaskIds?: string[];
  dueAt?: string;
  id: string;
  parentTaskId?: string;
  status: string;
  title: string;
};

export type TaskDiagnosisEvidence = {
  fact: string;
  id: string;
  kind: "activity" | "file" | "task" | "goal" | "criterion" | "commit";
  source: string;
};

export type TaskDiagnosisFinding = {
  conclusion: string;
  evidence: TaskDiagnosisEvidence[];
  id: string;
  impact: string;
  recommendation: string;
  severity: "blocked" | "review";
  subject: {
    id: string;
    path: string[];
    title: string;
  };
  title: string;
  type: "decision-conflict" | "execution-blocker";
};

export type TaskDiagnosisConflictInput = Omit<TaskDiagnosisFinding, "id" | "severity" | "subject" | "type"> & {
  id: string;
};

export type TaskDiagnosisSnapshot = {
  checkedAt?: string;
  decisionConflicts: TaskDiagnosisConflictInput[];
};
