import type { TaskDiagnosisConflictInput, TaskDiagnosisFinding, TaskDiagnosisTask } from "@/shared/model/task-diagnosis";
import { getMockContextDiagnosis } from "@/ai/mock/lib/mockTaskDiagnosis";
import { hasTaskDecisionBasis } from "@/features/tasks/lib/task-decision-evidence";
import { formatLegacyDateLabel } from "@/shared/lib/date-time";

export type TaskDiagnosisReport = {
  checkedAt?: string;
  coverage: {
    contextTaskCount?: number;
    unavailableFileCount?: number;
    checkedTaskCount: number;
    note: string;
  };
  findings: TaskDiagnosisFinding[];
  rootTaskId: string;
};

export type TaskDiagnosisInput = {
  checkedAt?: string;
  descendantTasks?: TaskDiagnosisTask[];
  /** @deprecated 兼容旧调用；新调用应传入全部后代任务。 */
  childTasks?: TaskDiagnosisTask[];
  decisionConflicts?: TaskDiagnosisConflictInput[];
  /** @deprecated Historical input only; current diagnosis ignores predecessor links. */
  dependencyTaskIds?: string[];
  /** @deprecated Historical input only; current diagnosis ignores predecessor links. */
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

function taskStateFact(task: TaskDiagnosisTask, prefix = ""): string {
  return `${prefix}「${task.title}」当前为${task.status}${task.dueAt ? `，截止 ${formatLegacyDateLabel(task.dueAt)}` : ""}。`;
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

export function getTaskDiagnosisReport({ checkedAt, descendantTasks, childTasks = [], decisionConflicts = [], task }: TaskDiagnosisInput): TaskDiagnosisReport {
  const scopedDescendants = descendantTasks ?? childTasks.map((item) => ({ ...item, parentTaskId: item.parentTaskId ?? task.id }));
  const rootTask: TaskDiagnosisTask = { ...task, decisionConflicts };
  const scopeTasks = [rootTask, ...scopedDescendants.filter((item) => item.id !== task.id)];
  const scopeTasksById = new Map(scopeTasks.map((item) => [item.id, item]));
  const findings: TaskDiagnosisFinding[] = [];

  for (const consumer of scopeTasks) {
    if (consumer.status === "已取消") continue;
    const subject = findingSubject(consumer, task.id, scopeTasksById);
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

  return {
    ...(checkedAt ? { checkedAt } : {}),
    coverage: {
      contextTaskCount: scopeTasks.filter((item) => item.context).length,
      unavailableFileCount: scopeTasks.reduce((sum, item) => sum + (item.context?.unavailableFileCount ?? 0), 0),
      checkedTaskCount: scopeTasks.length,
      note: "当前任务及下级任务的可见记录已完成核对。",
    },
    findings,
    rootTaskId: task.id,
  };
}
