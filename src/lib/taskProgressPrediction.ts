import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";
import { rollupProgressForecast, rollupProgressHistory } from "../data/taskProgressHistory";
import { getTaskProgressComparison, type TaskProgressComparisonSeries } from "./taskProgressComparison";
import { getTaskProgressDisplay } from "./taskProgressDisplay";
import { getTaskEffortState } from "./taskEffort";

export type ProgressPredictionRecord = { inputKey: string; checkedAt: string; series: TaskProgressComparisonSeries };
export type ProgressPredictionStore = Record<string, ProgressPredictionRecord>;
export const progressPredictionStorageKey = "agentdoor-progress-predictions-v1";

export function progressPredictionInputKey(nodes: readonly WorkspaceNode[], taskId: string): string {
  const ids = new Set([taskId]);
  let previousSize = 0;
  while (previousSize !== ids.size) {
    previousSize = ids.size;
    nodes.forEach(node => { if (node.kind === "task" && node.parentTaskId && ids.has(node.parentTaskId)) ids.add(node.id); });
  }
  // Deadlines only affect the comparison label. They do not invalidate AI evidence.
  return JSON.stringify(nodes.filter((node): node is TaskNode => node.kind === "task" && ids.has(node.id)).map(task => ({
    id: task.id, parentTaskId: task.parentTaskId, status: task.status, completedAt: task.completedAt,
    progressReopenedAt: task.progressReopenedAt, goal: task.goal, completionCriteria: task.completionCriteria,
    effortEstimate: task.effortEstimate, dependsOnTaskIds: task.dependsOnTaskIds,
  })).sort((a,b) => a.id.localeCompare(b.id)));
}

export function readProgressPredictions(value: unknown): ProgressPredictionStore {
  const result: ProgressPredictionStore = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [id, item] of Object.entries(value)) {
    try {
      if (item && typeof item.inputKey === "string" && typeof item.checkedAt === "string"
        && Number.isFinite(Date.parse(item.checkedAt)) && getTaskProgressComparison(item.series)) result[id] = item;
    } catch { /* A malformed saved result must not hide the original evidence. */ }
  }
  return result;
}

/** Recalculate from the Demo's saved observations and current confirmations.
 * A repeated run is allowed to return the same values; it never fabricates new delivery evidence. */
export function recalculateTaskProgressPrediction({ nodes, taskId, getSeries, checkedAt = new Date().toISOString() }: {
  nodes: readonly WorkspaceNode[];
  taskId: string;
  getSeries: (id: string) => TaskProgressComparisonSeries | undefined;
  checkedAt?: string;
}): ProgressPredictionRecord {
  const visiting = new Set<string>();
  const calculate = (id: string): TaskProgressComparisonSeries => {
    const task = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === id);
    if (!task || visiting.has(id)) throw new Error("任务关系已变化，请刷新后重试。");
    visiting.add(id);
    const base = getSeries(id);
    const children = nodes.filter((node): node is TaskNode => node.kind === "task" && node.parentTaskId === id && node.teamId === task.teamId);
    if (!children.length) {
      const model = getTaskProgressComparison(base);
      if (!base || !model) throw new Error(["proposed","confirmed"].includes(getTaskEffortState(task))
        ? `「${task.name}」已有总工作量估算，尚缺完成量预测依据。`
        : `「${task.name}」尚无工作量评估依据，请先补充交付记录。`);
      const currentScope = task.effortEstimate?.minutes;
      if (currentScope != null && currentScope !== model.latest.scopeMinutes) throw new Error(`「${task.name}」的工作范围已变化，请先更新工作量评估。`);
      visiting.delete(id);
      return structuredClone(base);
    }
    const childSeries = children.map(child => {
      const series = calculate(child.id);
      const display = getTaskProgressDisplay({ series, task: child });
      const result = structuredClone(display.historySeries ?? series);
      result.timing = { ...result.timing, forecastOn: display.forecastOn, completedOn: display.completedOn ?? undefined };
      if (!display.forecastOn) delete result.forecastTrend;
      return result;
    });
    const workload = rollupProgressHistory(childSeries, `prediction-${id}`);
    const latest = workload.at(-1);
    if (!latest || !latest.scopeMinutes) throw new Error("子任务工作量尚不完整，暂时无法汇总预测。");
    const forecastTrend = rollupProgressForecast(childSeries, latest);
    const remaining = childSeries.map(getTaskProgressComparison).filter(model => model && model.latest.completedMinutes < model.latest.scopeMinutes);
    const forecastOn = remaining.length && remaining.every(model => model!.forecastOn && model!.forecastOn >= latest.at)
      ? remaining.map(model => model!.forecastOn!).sort().at(-1)! : null;
    visiting.delete(id);
    return { source: "example", scenario: "子任务汇总", asOf: latest.at,
      ...(base?.creation ? {creation:structuredClone(base.creation)} : {}),
      explanation: "按当前子任务评估与用户确认重新汇总，原始 AI 记录保留。", workload,
      expected: { scopeVersion: latest.scopeVersion, points: [] }, forecastTrend,
      timing: { startOn: base?.timing.startOn ?? task.plannedStartOn ?? "", dueOn: base?.timing.dueOn ?? task.plannedEndOn ?? null,
        forecastOn, scopeVersion: latest.scopeVersion, basis: "未完成子任务的有效预测取最晚日期，不按截止时间反推。" } };
  };
  const series = calculate(taskId);
  if (!getTaskProgressComparison(series)) throw new Error("预测结果不完整，已保留原记录，请重试。");
  return { inputKey: progressPredictionInputKey(nodes, taskId), checkedAt, series };
}
