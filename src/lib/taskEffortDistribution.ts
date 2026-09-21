import type { TaskProgressContext } from "./taskProgressDisplay";
import type { TaskWithEffortBaseline } from "./taskEffortBaseline";
import {
  effortEstimateSchema, getTaskEffortState, summarizeTaskEffort,
  type TaskEffortEstimate, type TaskEffortTask,
} from "./taskEffort";

export type TaskEffortDistributionInput = TaskWithEffortBaseline & TaskProgressContext & {
  id?: string;
  clientId?: string;
  title?: string;
  name?: string;
};

export type TaskEffortDistribution = {
  state: "available" | "partial" | "unavailable" | "stale" | "invalid";
  totalMinutes: number | null;
  knownMinutes: number;
  estimatedCount: number;
  totalCount: number;
  hasMock: boolean;
  hasManual: boolean;
  rows: Array<{
    id: string;
    title: string;
    minutes: number | null;
    share: number | null;
    state: "unknown" | "stale" | "estimated";
    source: TaskEffortEstimate["basis"];
  }>;
};

/** Projects caller-selected leaves; it neither estimates work nor changes task scope. */
export function getTaskEffortDistribution(
  tasks: readonly TaskEffortDistributionInput[],
  mode: "detail" | "creation" | "example" = "detail",
): TaskEffortDistribution {
  const empty: TaskEffortDistribution = {
    state: "unavailable", totalMinutes: null, knownMinutes: 0, estimatedCount: 0,
    totalCount: tasks.length, hasMock: false, hasManual: false, rows: [],
  };
  const invalid = (): TaskEffortDistribution => ({ ...empty, state: "invalid" });

  try {
    const stableIds = tasks.map(task => task.id?.trim() || task.clientId?.trim() || null);
    const presentIds = stableIds.filter((id): id is string => id !== null);
    if (new Set(presentIds).size !== presentIds.length) return invalid();
    const usedIds = new Set(presentIds);
    const eligibleTasks: TaskEffortTask[] = [];
    const rows: TaskEffortDistribution["rows"] = [];

    for (const [index, task] of tasks.entries()) {
      const parsed = effortEstimateSchema.safeParse(task.effortEstimate);
      if (task.effortEstimate !== undefined && !parsed.success) return invalid();
      const source = parsed.success ? parsed.data.basis : "unknown";
      const eligible = source === "model" || (source === "manual" && parsed.success && parsed.data.confirmed)
        || (mode === "creation" && (source === "manual" || source === "mock"))
        || (mode === "example" && source === "mock");
      const eligibleTask = eligible ? task : {};
      const effortState = getTaskEffortState(eligibleTask);
      const state = effortState === "confirmed" || effortState === "proposed" ? "estimated" : effortState;
      eligibleTasks.push(eligibleTask);

      let id = stableIds[index];
      if (id === null) {
        id = `effort-index-${index}`;
        while (usedIds.has(id)) id += "-fallback";
        usedIds.add(id);
      }
      rows.push({
        id, title: task.title?.trim() || task.name?.trim() || `任务 ${index + 1}`,
        minutes: state === "estimated" ? task.effortEstimate!.minutes : null,
        share: null, state, source,
      });
    }

    const summary = summarizeTaskEffort(eligibleTasks);
    const totalMinutes = summary.totalMinutes;
    return {
      state: totalMinutes !== null ? "available"
        : summary.estimatedCount > 0 ? "partial"
        : summary.staleCount > 0 ? "stale" : "unavailable",
      totalMinutes, knownMinutes: summary.knownMinutes, estimatedCount: summary.estimatedCount,
      totalCount: summary.taskCount,
      hasMock: rows.some(row => row.source === "mock"),
      hasManual: rows.some(row => row.source === "manual"),
      // Partial coverage cannot become a seemingly complete distribution of its known subset.
      rows: rows.map(row => ({ ...row, share: totalMinutes !== null && totalMinutes > 0 && row.minutes !== null ? row.minutes / totalMinutes : null })),
    };
  } catch {
    // Invalid input or overflowing totals must not expose plausible percentages or break the UI.
    return invalid();
  }
}
