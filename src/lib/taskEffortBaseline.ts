import { getTaskEffortState, type TaskEffortTask } from "./taskEffort";
import { getTaskBurnUpModel, type TaskBurnUpSeries } from "./taskBurnUp";

/** Saved with creation; later estimates must not rewrite this first observation. */
export type TaskEffortBaseline = { at: string; minutes: number; scopeKey: string; version: number };
export type TaskWithEffortBaseline = TaskEffortTask & { createdAt?: string; effortBaseline?: TaskEffortBaseline };

export const isValidTaskEffortBaseline = (value: unknown): value is TaskEffortBaseline => value !== null && typeof value === "object"
  && "minutes" in value && "version" in value && "scopeKey" in value && "at" in value
  && typeof value.minutes === "number" && Number.isSafeInteger(value.minutes) && value.minutes > 0
  && typeof value.version === "number" && typeof value.scopeKey === "string" && typeof value.at === "string"
  && Number.isSafeInteger(value.version) && value.version > 0 && Boolean(value.scopeKey)
  && getTaskBurnUpModel({source:"recorded",points:[{at:value.at,scopeHours:value.minutes / 60,completedHours:null,estimatedLeafCount:1,totalLeafCount:1}]}).state !== "invalid";

export function createTaskEffortBaseline(task: TaskEffortTask, at: string): TaskEffortBaseline | undefined {
  if (!["confirmed","proposed"].includes(getTaskEffortState(task))) return undefined;
  const estimate = task.effortEstimate!;
  const baseline = {at,minutes:estimate.minutes!,scopeKey:estimate.scopeKey,version:estimate.version};
  return isValidTaskEffortBaseline(baseline) ? baseline : undefined;
}

/** Creation evidence remains valid even after the current scope is edited. */
export function getTaskEffortInitialBaseline(task: TaskWithEffortBaseline): TaskEffortBaseline | undefined {
  if (isValidTaskEffortBaseline(task.effortBaseline)) return task.effortBaseline;
  return !task.effortBaseline && task.effortEstimate?.version === 1 && task.createdAt
    ? createTaskEffortBaseline(task,task.createdAt) : undefined;
}

/** Used only when no progress history exists. Unknown completed work stays null. */
export function getTaskEffortBaselineSeries(tasks: readonly TaskWithEffortBaseline[], asOf = new Date().toISOString()): TaskBurnUpSeries | undefined {
  if (!tasks.length) return undefined;
  const observations = tasks.map(task => {
    const current = createTaskEffortBaseline(task,asOf);
    if (!current) return undefined;
    // Older v1 tasks already saved both their first estimate and creation timestamp.
    // A later estimate without a baseline may only be shown at its current observation.
    const saved = getTaskEffortInitialBaseline(task);
    const initial = saved && saved.version <= current.version ? saved : undefined;
    return initial && Date.parse(initial.at) < Date.parse(asOf) ? [initial,current] : [current];
  });
  if (observations.some(points => !points)) return undefined;
  const histories = observations as TaskEffortBaseline[][];
  const firstComplete = Math.max(...histories.map(points => Date.parse(points[0].at)));
  const dates = [...new Map(histories.flatMap(points => points.map(point => [Date.parse(point.at),point.at] as const))).entries()]
    .filter(([time]) => time >= firstComplete).sort(([a],[b]) => a-b);
  return {source:tasks.some(task => task.effortEstimate?.basis === "mock") ? "example" : "recorded",
    points:dates.map(([time,at]) => ({at,
      scopeHours:histories.reduce((sum,points) => sum + points.filter(point => Date.parse(point.at) <= time).at(-1)!.minutes,0) / 60,
      completedHours:null,estimatedLeafCount:tasks.length,totalLeafCount:tasks.length,
      note:at === asOf ? "当前总工作量估算，完成量尚待预测。" : "创建时保存的总工作量估算。",
    }))};
}
