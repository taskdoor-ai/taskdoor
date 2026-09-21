import type { TaskEffortDistributionInput } from "./taskEffortDistribution";
import { effortEstimateSchema, getTaskEffortState } from "./taskEffort";
import { getTaskBurnUpModel, type TaskBurnUpSeries } from "./taskBurnUp";
import { getTaskEffortBaselineSeries } from "./taskEffortBaseline";

export type TaskProgressAssessmentState = "zero" | "single" | "partial" | "ready" | "stale" | "unavailable" | "invalid";

export type TaskProgressAssessment = {
  state: TaskProgressAssessmentState;
  source: "recorded" | "example" | null;
  progressRatio: number | null;
  scopeHours: number | null;
  completedHours: number | null;
  estimatedLeafCount: number;
  totalLeafCount: number;
  issue: string | null;
  hasTrend: boolean;
  burnUp: ReturnType<typeof getTaskBurnUpModel>;
};

function withoutProgress(
  burnUp: ReturnType<typeof getTaskBurnUpModel>,
  state: "stale" | "partial" | "unavailable" | "invalid",
  issue: string,
  estimatedLeafCount = 0,
  totalLeafCount = 0,
): TaskProgressAssessment {
  return {
    state,
    source: burnUp.source,
    progressRatio: null,
    scopeHours: null,
    completedHours: null,
    estimatedLeafCount,
    totalLeafCount,
    issue,
    hasTrend: false,
    burnUp,
  };
}

export function getTaskProgressAssessment(
  series: TaskBurnUpSeries | undefined,
  effortTasks: readonly TaskEffortDistributionInput[],
): TaskProgressAssessment {
  const burnUp = getTaskBurnUpModel(series);
  const hasTrend = burnUp.points.some(point => point.scopeY !== null || point.completedY !== null);
  if (burnUp.state === "invalid" || burnUp.points.length > 0) {
    return {
      state: burnUp.state === "empty" ? "unavailable" : burnUp.state,
      source: burnUp.source,
      progressRatio: burnUp.progressRatio,
      scopeHours: burnUp.latest?.scopeHours ?? null,
      completedHours: burnUp.latest?.completedHours ?? null,
      estimatedLeafCount: burnUp.coverage?.estimatedLeafCount ?? 0,
      totalLeafCount: burnUp.coverage?.totalLeafCount ?? 0,
      issue: burnUp.issue,
      hasTrend,
      burnUp,
    };
  }
  if (effortTasks.length === 0) return withoutProgress(burnUp, "unavailable", "尚无可用的范围 EWD 记录");

  let totalMinutes = 0;
  let estimatedLeafCount = 0;
  let hasUnknown = false;
  let hasStale = false;
  let hasExample = false;
  for (const task of effortTasks) {
    const parsed = effortEstimateSchema.safeParse(task.effortEstimate);
    if (task.effortEstimate !== undefined && !parsed.success) {
      return withoutProgress(burnUp, "invalid", "范围 EWD 记录格式无效", estimatedLeafCount, effortTasks.length);
    }
    const state = getTaskEffortState(task);
    if (state === "stale") {
      hasStale = true;
      continue;
    }
    if (state === "unknown" || !parsed.success || parsed.data.minutes === null) {
      hasUnknown = true;
      continue;
    }
    if (!Number.isSafeInteger(totalMinutes + parsed.data.minutes)) {
      return withoutProgress(burnUp, "invalid", "范围 EWD 合计超出可计算范围", estimatedLeafCount, effortTasks.length);
    }
    totalMinutes += parsed.data.minutes;
    estimatedLeafCount += 1;
    hasExample ||= parsed.data.basis === "mock";
  }

  if (hasStale) return withoutProgress(burnUp, "stale", "范围 EWD 已过期，需重新核对", estimatedLeafCount, effortTasks.length);
  if (hasUnknown) {
    return withoutProgress(
      burnUp,
      estimatedLeafCount > 0 ? "partial" : "unavailable",
      estimatedLeafCount > 0 ? "范围 EWD 估算不完整" : "尚无可用的范围 EWD 记录",
      estimatedLeafCount,
      effortTasks.length,
    );
  }
  if (totalMinutes <= 0) return withoutProgress(burnUp, "unavailable", "当前范围 EWD 为 0，完成度暂不可计算", estimatedLeafCount, effortTasks.length);

  const baseline = getTaskBurnUpModel(getTaskEffortBaselineSeries(effortTasks));
  return {
    state: baseline.state === "single" ? "single" : "partial",
    source: hasExample ? "example" : "recorded",
    progressRatio: null,
    scopeHours: totalMinutes / 60,
    completedHours: null,
    estimatedLeafCount,
    totalLeafCount: effortTasks.length,
    issue: null,
    hasTrend: baseline.points.some(point => point.scopeY !== null),
    burnUp: baseline,
  };
}
