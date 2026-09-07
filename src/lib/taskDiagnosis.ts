import type { TaskActivityMock, TaskCommitMock, TaskFileNode } from "../data/taskDetailMocks";
import { getMockContextDiagnosis } from "./mockTaskDiagnosis";
import { hasTaskDecisionBasis } from "./taskDecisionEvidence";

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

export type TaskDiagnosisReport = {
  checkedAt?: string;
  coverage: {
    contextTaskCount?: number;
    unavailableFileCount?: number;
    checkedTaskCount: number;
    missingDependencyCount: number;
    note: string;
    visibleDependencyCount: number;
  };
  findings: TaskDiagnosisFinding[];
  rootTaskId: string;
};

export type TaskDiagnosisConflictInput = Omit<TaskDiagnosisFinding, "id" | "severity" | "subject" | "type"> & {
  id: string;
};

export type TaskDiagnosisSnapshot = {
  checkedAt?: string;
  decisionConflicts: TaskDiagnosisConflictInput[];
};

export type TaskDiagnosisInput = {
  checkedAt?: string;
  descendantTasks?: TaskDiagnosisTask[];
  /** @deprecated 兼容旧调用；新调用应传入全部后代任务。 */
  childTasks?: TaskDiagnosisTask[];
  decisionConflicts?: TaskDiagnosisConflictInput[];
  dependencyTaskIds?: string[];
  dependencyTasks?: TaskDiagnosisTask[];
  task: TaskDiagnosisTask;
};

export function getTaskDiagnosisDescendants<T extends { id: string; parentTaskId?: string }>(tasks: readonly T[], rootTaskId: string): T[] {
  const childrenByParentId = new Map<string, T[]>();
  for (const task of tasks) if (task.parentTaskId) childrenByParentId.set(task.parentTaskId, [...(childrenByParentId.get(task.parentTaskId) ?? []), task]);
  const descendants: T[] = [];
  const visited = new Set([rootTaskId]);
  const queue = [...(childrenByParentId.get(rootTaskId) ?? [])];
  while (queue.length) {
    const task = queue.shift();
    if (!task || visited.has(task.id)) continue;
    visited.add(task.id);
    descendants.push(task);
    queue.push(...(childrenByParentId.get(task.id) ?? []));
  }
  return descendants;
}

function taskNames(tasks: TaskDiagnosisTask[]): string {
  return tasks.map((item) => `「${item.title}」`).join("、");
}

function taskStateFact(task: TaskDiagnosisTask, prefix = ""): string {
  return `${prefix}「${task.title}」当前为${task.status}${task.dueAt ? `，截止 ${task.dueAt}` : ""}。`;
}

function dateOrder(value?: string): number | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return Number(iso[2]) * 100 + Number(iso[3]);
  const chinese = value.match(/(\d+)\s*月\s*(\d+)\s*日/);
  return chinese ? Number(chinese[1]) * 100 + Number(chinese[2]) : null;
}

function findingSubject(task: TaskDiagnosisTask, rootTaskId: string, tasksById: Map<string, TaskDiagnosisTask>): TaskDiagnosisFinding["subject"] {
  if (task.id === rootTaskId) return { id: task.id, path: [task.title], title: task.title };
  const path = [task.title];
  const visited = new Set([task.id]);
  let parentId = task.parentTaskId;
  while (parentId && parentId !== rootTaskId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = tasksById.get(parentId);
    if (!parent) break;
    path.unshift(parent.title);
    parentId = parent.parentTaskId;
  }
  return { id: task.id, path, title: task.title };
}

function executionBlocker(consumer: TaskDiagnosisTask, incomplete: TaskDiagnosisTask[], subject: TaskDiagnosisFinding["subject"]): TaskDiagnosisFinding {
  const consumerDate = dateOrder(consumer.dueAt);
  const lateDependency = consumerDate === null ? undefined : incomplete.find((item) => {
    const dependencyDate = dateOrder(item.dueAt);
    return dependencyDate !== null && dependencyDate > consumerDate;
  });
  const primary = lateDependency ?? incomplete[0];
  const additional = incomplete.length > 1 ? `，另有 ${incomplete.length - 1} 项前置尚未完成` : "";
  return {
      conclusion: lateDependency
        ? `前置任务「${primary.title}」当前${primary.status}，计划于 ${primary.dueAt} 完成，晚于「${consumer.title}」的 ${consumer.dueAt} 截止${additional}。`
        : `「${consumer.title}」依赖「${primary.title}」，该前置任务仍处于${primary.status}状态${additional}。`,
      evidence: [
        {
          kind: "task",
          id: consumer.id,
          source: consumer.title,
          fact: `「${consumer.title}」依赖${taskNames(incomplete)}${lateDependency ? `，当前截止 ${consumer.dueAt}` : ""}。`,
        },
        ...incomplete.map((item) => ({ kind: "task" as const, id: item.id, source: item.title, fact: taskStateFact(item) })),
      ],
      id: `execution-blocker:${consumer.id}`,
      impact: lateDependency
        ? "前置交付晚于后续截止，可能影响依赖该结果的部分，建议核对排期。"
        : "前置任务尚未标记完成，可能影响依赖该结果的部分，不代表当前任务不能推进。",
      recommendation: lateDependency
        ? "建议确认前置与后续任务的时间顺序，核对可并行推进的范围；依赖可按实际情况调整。"
        : "建议核对前置结果和可并行推进的范围；依赖仅作参考，可按实际情况调整。",
      severity: "review",
      subject,
      title: lateDependency
        ? `前置「${primary.title}」交付晚于当前任务截止，建议核对排期`
        : incomplete.length > 1
          ? `${incomplete.length} 项前置任务尚未完成，建议核对`
          : `前置「${primary.title}」尚未完成，建议核对`,
      type: "execution-blocker",
  };
}

function completedWithIncompleteDependency(consumer: TaskDiagnosisTask, incomplete: TaskDiagnosisTask[], subject: TaskDiagnosisFinding["subject"]): TaskDiagnosisFinding {
  const primary = incomplete[0];
  return {
    conclusion: `「${consumer.title}」已标记为已完成，但前置「${primary.title}」仍处于${primary.status}状态${incomplete.length > 1 ? `，另有 ${incomplete.length - 1} 项前置尚未完成` : ""}。`,
    evidence: [
      {
        kind: "task",
        id: consumer.id,
        source: consumer.title,
        fact: `「${consumer.title}」已标记为已完成，同时仍依赖${taskNames(incomplete)}。`,
      },
      ...incomplete.map((item) => ({ kind: "task" as const, id: item.id, source: item.title, fact: taskStateFact(item) })),
    ],
    id: `decision-conflict:completion-dependency:${consumer.id}`,
    impact: "完成结论与前置任务记录不一致，成员无法据此确认执行链路已经闭合。",
    recommendation: "先核对前置任务是否已经交付；若仍需该前置结果，应重新确认当前任务的完成状态。",
    severity: "review",
    subject,
    title: incomplete.length > 1
      ? `「${consumer.title}」已完成，但仍有 ${incomplete.length} 项前置未完成`
      : `「${consumer.title}」已完成，但前置「${primary.title}」仍未完成`,
    type: "decision-conflict",
  };
}

function completedWithUnfinishedDescendants(
  parent: TaskDiagnosisTask,
  unfinished: TaskDiagnosisTask[],
  subject: TaskDiagnosisFinding["subject"],
  isRoot: boolean,
): TaskDiagnosisFinding {
  const primary = unfinished[0];
  const parentLabel = isRoot ? "主任务" : `子任务「${parent.title}」`;
  return {
    conclusion: `${parentLabel}已标记为已完成，但下级任务「${primary.title}」仍处于${primary.status}状态${unfinished.length > 1 ? `，另有 ${unfinished.length - 1} 个下级任务尚未结束` : ""}。`,
    evidence: [
      { kind: "task", id: parent.id, source: parent.title, fact: `「${parent.title}」已标记为已完成。` },
      ...unfinished.map((item) => ({ kind: "task" as const, id: item.id, source: item.title, fact: taskStateFact(item, "下级任务") })),
    ],
    id: `decision-conflict:completion:${parent.id}`,
    impact: "任务的完成结论与当前执行记录不一致，成员可能据此作出不同判断。",
    recommendation: "先核对未结束下级任务是否仍属于当前范围，再确认任务完成结论。",
    severity: "review",
    subject,
    title: isRoot ? "主任务已完成，但仍有未结束子任务" : `「${parent.title}」已完成，但仍有未结束下级任务`,
    type: "decision-conflict",
  };
}

export function getTaskDiagnosisReport({ checkedAt, descendantTasks, childTasks = [], decisionConflicts = [], dependencyTaskIds = [], dependencyTasks = [], task }: TaskDiagnosisInput): TaskDiagnosisReport {
  const scopedDescendants = descendantTasks ?? childTasks.map((item) => ({ ...item, parentTaskId: item.parentTaskId ?? task.id }));
  const rootTask: TaskDiagnosisTask = { ...task, decisionConflicts };
  const scopeTasks = [rootTask, ...scopedDescendants.filter((item) => item.id !== task.id)];
  const visibleTasks = new Map([...scopeTasks, ...dependencyTasks].map((item) => [item.id, item]));
  const scopeTasksById = new Map(scopeTasks.map((item) => [item.id, item]));
  const missingDependencyIds = new Set<string>();
  const visibleDependencyIds = new Set<string>();
  const findings: TaskDiagnosisFinding[] = [];

  for (const consumer of scopeTasks) {
    if (consumer.status === "已取消") continue;
    const subject = findingSubject(consumer, task.id, scopeTasksById);
    const ids = consumer.id === task.id ? dependencyTaskIds : consumer.dependsOnTaskIds ?? [];
    const incomplete: TaskDiagnosisTask[] = [];
    for (const id of ids) {
      const dependency = visibleTasks.get(id);
      if (!dependency) {
        missingDependencyIds.add(id);
        continue;
      }
      visibleDependencyIds.add(id);
      if (dependency.id !== consumer.id && dependency.status !== "已完成" && dependency.status !== "已取消") incomplete.push(dependency);
    }
    if (incomplete.length) findings.push(consumer.status === "已完成"
      ? completedWithIncompleteDependency(consumer, incomplete, subject)
      : executionBlocker(consumer, incomplete, subject));

    if (consumer.status === "已完成") {
      const unfinishedDescendants = getTaskDiagnosisDescendants(scopedDescendants, consumer.id).filter((item) => item.status !== "已完成" && item.status !== "已取消");
      if (unfinishedDescendants.length) findings.push(completedWithUnfinishedDescendants(consumer, unfinishedDescendants, subject, consumer.id === task.id));
    }

    findings.push(...getMockContextDiagnosis(consumer, subject));
    // 当前上下文优先；两侧内容消失时不能回退到旧的预填冲突。
    for (const conflict of consumer.context ? [] : consumer.decisionConflicts ?? []) {
      if (!hasTaskDecisionBasis(conflict.evidence)) continue;
      findings.push({
        ...conflict,
        id: `decision-conflict:${consumer.id}:${conflict.id}`,
        severity: "review",
        subject,
        type: "decision-conflict",
      });
    }
  }

  const missingDependencyCount = missingDependencyIds.size;
  return {
    ...(checkedAt ? { checkedAt } : {}),
    coverage: {
      contextTaskCount: scopeTasks.filter((item) => item.context).length,
      unavailableFileCount: scopeTasks.reduce((sum, item) => sum + (item.context?.unavailableFileCount ?? 0), 0),
      checkedTaskCount: scopeTasks.length,
      missingDependencyCount,
      note: missingDependencyCount
        ? `另有 ${missingDependencyCount} 项依赖不可见或已不存在，本次未完成核对。`
        : "当前任务范围内的可见依赖已完成核对。",
      visibleDependencyCount: visibleDependencyIds.size,
    },
    findings,
    rootTaskId: task.id,
  };
}
