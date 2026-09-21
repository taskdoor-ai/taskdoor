import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";
import { createTaskChangeActivity } from "./taskActivity";

type DependencyTask = { id: string; parentTaskId?: string; dependsOnTaskIds?: string[] };
const unique = (ids: readonly string[]) => [...new Set(ids)];
export const sameTaskDependencies = (left: readonly string[], right: readonly string[]) => {
  const a = new Set(left);
  const b = new Set(right);
  return a.size === b.size && [...a].every(id => b.has(id));
};

/** Validate the relationship, not whether the current task may start or finish. */
export function getTaskDependencyIssue(tasks: readonly DependencyTask[], taskId: string, candidateId: string): string | undefined {
  if (taskId === candidateId) return "不能将任务自身设为前置依赖。";
  const byId = new Map(tasks.map(task => [task.id, task]));
  if (!byId.has(candidateId)) return "前置任务不可用，请核对当前可见任务。";
  const reaches = (start: string, target: string, parents: boolean) => {
    const pending = [start];
    const visited = new Set<string>();
    while (pending.length) {
      const id = pending.pop()!;
      if (id === target) return true;
      if (visited.has(id)) continue;
      visited.add(id);
      const task = byId.get(id);
      pending.push(...(parents ? task?.parentTaskId ? [task.parentTaskId] : [] : task?.dependsOnTaskIds ?? []));
    }
    return false;
  };
  if (reaches(taskId, candidateId, true) || reaches(candidateId, taskId, true)) return "父子任务的归属关系不是前置依赖。";
  if (reaches(candidateId, taskId, false)) return "这个前置依赖会形成循环，请重新核对。";
}

export function getTaskDependencySummary(ids: readonly string[], tasks: readonly { id: string; status: string }[]): string | null {
  const byId = new Map(tasks.map(task => [task.id, task]));
  let pending = 0;
  let unknown = 0;
  for (const id of unique(ids)) {
    const task = byId.get(id);
    if (!task || task.status === "已取消") unknown++;
    else if (task.status !== "已完成") pending++;
  }
  const parts = [pending ? `${pending} 项未完成` : "", unknown ? `${unknown} 项待核对` : ""].filter(Boolean);
  return parts.length ? `前置依赖：${parts.join("，")}` : null;
}

export function applyTaskDependencies(nodes: WorkspaceNode[], taskId: string, expected: string[], values: string[], author: string, visibleTaskIds: readonly string[]) {
  const visible = new Set(visibleTaskIds);
  const original = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === taskId);
  if (!original || !visible.has(taskId)) throw new Error("当前任务已不存在或不可用，请返回任务列表。");
  const before = original.dependsOnTaskIds ?? [];
  if (!sameTaskDependencies(before, expected)) throw new Error("前置依赖已被其他操作更新，请核对最新内容后再保存。");
  const next = unique(values);
  const tasks = nodes.filter((node): node is TaskNode => node.kind === "task");
  for (const id of next) {
    // Keep unresolved historical references until the user explicitly removes them.
    if (before.includes(id)) continue;
    const candidate = tasks.find(task => task.id === id);
    if (!candidate || !visible.has(id) || candidate.teamId !== original.teamId) throw new Error("前置任务不可用，请核对当前可见任务。");
    const issue = getTaskDependencyIssue(tasks, taskId, id);
    if (issue) throw new Error(issue);
  }
  if (sameTaskDependencies(before, next)) return { nodes, original, activity: null };
  const label = (ids: string[]) => ids.map(id => visible.has(id) ? tasks.find(task => task.id === id)?.name || "任务不可用" : "任务不可用").join("、") || null;
  // Distinct same-name tasks must still produce a change record.
  const beforeLabel = label(before);
  const afterLabel = label(next);
  const activity = createTaskChangeActivity({
    author, type: "task-definition-change", message: "修改前置依赖",
    changes: [{ label: "前置依赖", before: beforeLabel, after: beforeLabel === afterLabel ? `${afterLabel}（关联任务已变更）` : afterLabel }],
  });
  return { nodes: nodes.map(node => node.id === taskId ? { ...original, dependsOnTaskIds: next, updatedAt: new Date().toISOString() } : node), original, activity };
}
