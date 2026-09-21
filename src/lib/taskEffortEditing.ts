import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";
import { createTaskChangeActivity } from "./taskActivity";
import { getTaskDefinitionGoal } from "./taskGoal";
import { createManualEffortEstimate, effortEstimateSchema, formatEffortPersonDays, getTaskEffortState, type TaskEffortEstimate, type TaskEffortTask } from "./taskEffort";

/** Compare the editable scope and estimate, not unrelated dates, people or appearance. */
export function getTaskEffortEditSignature(task: TaskEffortTask): string {
  return JSON.stringify({ goal: task.goal ?? "", completionCriteria: task.completionCriteria ?? [], executionTips: task.executionTips ?? [], effortEstimate: task.effortEstimate ?? null });
}

export function getWorkspaceEffortLeaves(nodes: WorkspaceNode[], rootId: string): Array<TaskNode & { title: string }> {
  const tasks = nodes.filter((node): node is TaskNode => node.kind === "task");
  const root = tasks.find(task => task.id === rootId);
  if (!root || new Set(tasks.map(task => task.id)).size !== tasks.length) return [];
  const leaves: Array<TaskNode & { title: string }> = [];
  const visited = new Set<string>();
  const visit = (task: TaskNode): boolean => {
    if (visited.has(task.id)) return false;
    visited.add(task.id);
    const children = tasks.filter(item => item.parentTaskId === task.id);
    if (children.length) return children.every(visit);
    leaves.push({ ...task, title: task.name, goal: getTaskDefinitionGoal(nodes, task) });
    return true;
  };
  return visit(root) ? leaves : [];
}

const stateLabel = (task: TaskEffortTask) => ({ unknown: "待估算", proposed: "待确认", confirmed: "已确认", stale: "需复核" })[getTaskEffortState(task)];

/** Explicit human confirmation only. The caller commits the returned nodes and activity together. */
export function applySavedTaskEffort(nodes: WorkspaceNode[], taskId: string, estimate: TaskEffortEstimate, expectedSignature: string, author: string) {
  const original = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === taskId);
  if (!original) throw new Error("任务已不存在，请返回任务列表。");
  if (nodes.some(node => node.kind === "task" && node.parentTaskId === taskId)) throw new Error("主任务投入由子任务汇总，请到对应子任务确认估算。");
  const current = { ...original, goal: getTaskDefinitionGoal(nodes, original) };
  if (getTaskEffortEditSignature(current) !== expectedSignature) throw new Error("任务范围或估算已有变化，请载入最新内容后再确认；当前输入已保留。");
  const parsed = effortEstimateSchema.safeParse(estimate);
  if (!parsed.success) throw new Error("预计投入数据无效，请重新核对估算。");
  const verified = createManualEffortEstimate(current, parsed.data, current.effortEstimate);
  if (JSON.stringify(effortEstimateSchema.parse(verified)) !== JSON.stringify(parsed.data)) throw new Error("估算与当前范围或版本不一致，请重新核对后确认。");
  const previous = original.effortEstimate;
  const activity = createTaskChangeActivity({
    author, type: "task-definition-change", message: "更新预计总投入（EWD）",
    changes: [
      { label: "预计总投入", before: formatEffortPersonDays(previous?.minutes ?? null), after: formatEffortPersonDays(verified.minutes) },
      { label: "AI／工具工作方式", before: previous?.workMethod ?? null, after: verified.workMethod || null },
      { label: "估算依据", before: previous?.reason ?? null, after: verified.reason || null },
      { label: "估算确认", before: stateLabel(current), after: stateLabel({ ...current, effortEstimate: verified }) },
    ],
  });
  if (!activity) return { nodes, activity, original };
  return { nodes: nodes.map(node => node.id === taskId ? { ...original, effortEstimate: verified, updatedAt: new Date().toISOString() } : node), activity, original };
}
