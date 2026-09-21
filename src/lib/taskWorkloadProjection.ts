import { getTaskProgressDisplay, type TaskProgressContext } from "./taskProgressDisplay";
import { rollupProgressForecast } from "../data/taskProgressHistory";
import type { TaskBurnUpSeries } from "./taskBurnUp";
import { getTaskEffortDistribution, type TaskEffortDistributionInput } from "./taskEffortDistribution";
import { getTaskProgressAssessment } from "./taskProgressAssessment";
import { getTaskProgressComparison, type TaskProgressComparisonSeries } from "./taskProgressComparison";

/** Shared evidence projection for the progress chart and the current-situation analysis. */
export function getTaskWorkloadProjection({ comparison, progressTask, completedMinutesByTaskId, progressComparisonsByTaskId, effortTasks = [], hasSubtasks = effortTasks.length > 1, series }: {
  comparison?: TaskProgressComparisonSeries;
  progressTask?: TaskProgressContext;
  completedMinutesByTaskId?: Readonly<Record<string, number | null>>;
  progressComparisonsByTaskId?: Readonly<Record<string, TaskProgressComparisonSeries | undefined>>;
  effortTasks?: TaskEffortDistributionInput[];
  hasSubtasks?: boolean;
  series?: TaskBurnUpSeries;
}) {
  const assessment = getTaskProgressAssessment(series, effortTasks);
  const mode: "example" | "detail" = assessment.source === "example" || (series?.source !== "recorded" && getTaskProgressComparison(comparison)) ? "example" : "detail";
  const effort = getTaskEffortDistribution(effortTasks, mode);
  const childProgress = hasSubtasks ? effort.rows.map(row => getTaskProgressDisplay({series:progressComparisonsByTaskId?.[row.id],
    task:effortTasks.find(task => task.id === row.id),scopeMinutes:row.minutes,
    completedMinutes:progressComparisonsByTaskId?.[row.id] ? undefined : completedMinutesByTaskId?.[row.id] ?? null,
    expectedAsOf:comparison?.asOf})) : [];
  const aggregate = childProgress.length > 0 && effortTasks.some(task => task.status)
    ? childProgress.every(item => item.currentMinutes !== null) ? childProgress.reduce((sum,item)=>sum+item.currentMinutes!,0) : null : undefined;
  // Project the latest leaf observations at one date, without rewriting saved fixture history.
  let summaryComparison = comparison;
  if (comparison && aggregate != null && effort.totalMinutes === comparison.workload.at(-1)?.scopeMinutes) {
    const asOf = [comparison.asOf,...childProgress.map(item=>item.asOf)].sort().at(-1)!;
    const point = {...comparison.workload.at(-1)!,at:asOf,completedMinutes:Math.round(aggregate),note:"按叶子当前完成量汇总；原 AI 快照保留"};
    summaryComparison = {...comparison,asOf,workload:asOf > comparison.asOf ? [...comparison.workload,point] : [...comparison.workload.slice(0,-1),point],
    };
    const observations = childProgress.map((item): TaskProgressComparisonSeries | undefined => {
      if (!item.historySeries) return undefined;
      const saved = item.historySeries, latest = saved.workload.at(-1)!;
      const point = {...latest, completedMinutes: Math.round(item.currentMinutes!)};
      return {...saved, workload: [...saved.workload.slice(0,-1), point],
        timing: {...saved.timing, forecastOn:item.forecastOn, completedOn:item.completedOn ?? undefined},
        forecastTrend:item.forecastOn ? saved.forecastTrend : undefined};
    });
    const remaining = childProgress.filter(item => item.currentMinutes !== item.total);
    const forecastOn = remaining.length && remaining.every(item=>item.forecastOn && item.forecastOn>=asOf)
      ? remaining.map(item=>item.forecastOn!).sort().at(-1)! : null;
    summaryComparison.timing={...comparison.timing,forecastOn};
    summaryComparison.forecastTrend = observations.every((item): item is TaskProgressComparisonSeries => Boolean(item))
      ? rollupProgressForecast(observations,point) : undefined;
  }
  const recorded = series?.source === "recorded";
  const fallbackDisplay = getTaskProgressDisplay({task:progressTask,
    scopeMinutes:recorded && assessment.scopeHours !== null ? assessment.scopeHours * 60 : effort.totalMinutes,
    completedMinutes:recorded ? assessment.completedHours === null ? null : assessment.completedHours * 60 : aggregate ?? null,
    sourceLabel:!recorded && aggregate !== undefined ? "子任务汇总" : undefined});
  const display = series?.source !== "recorded" && summaryComparison && getTaskProgressComparison(summaryComparison)
    ? getTaskProgressDisplay({series:summaryComparison,task:progressTask,scopeMinutes:effort.totalMinutes,completedMinutes:aggregate,sourceLabel:aggregate !== undefined ? "子任务汇总" : undefined})
    : fallbackDisplay;
  return { assessment, mode, effort, aggregate, comparison:summaryComparison, display };
}
