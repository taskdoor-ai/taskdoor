import { useI18n } from "../i18n/I18nProvider";
import { useProgressCopy } from "../i18n/progressCopy";
import { useGlobalUi } from "../i18n/globalUi";
import React from "react";
import { getTaskProgressDisplay, type TaskProgressContext } from "../lib/taskProgressDisplay";
import { TaskProgressOverview } from "./TaskProgressOverview";
import { TaskProgressStage } from "./TaskProgressStage";
import { TaskProgressRefresh } from "./TaskProgressRefresh";
import { getTaskWorkloadProjection } from "../lib/taskWorkloadProjection";
import type { TaskBurnUpSeries } from "../lib/taskBurnUp";
import { formatEffortPersonDays } from "../lib/taskEffort";
import { type TaskEffortDistributionInput } from "../lib/taskEffortDistribution";
import { TaskBurnUpSparkline } from "./TaskBurnUpSparkline";
import { TaskEffortCost } from "./TaskEffortCost";
import { TaskProgressComparison } from "./TaskProgressComparison";
import { getTaskProgressComparison, type TaskProgressComparisonSeries } from "../lib/taskProgressComparison";

/** Recorded progress takes precedence; selected demo tasks may show an isolated pace comparison. */
export function TaskWorkloadSummary({ compact = false, progressTask, comparison, completedMinutesByTaskId, progressComparisonsByTaskId, effortTasks = [], hasSubtasks = effortTasks.length > 1, onOpenTask, onRepredict, needsReview = false, series }: {
  compact?: boolean;
  comparison?: TaskProgressComparisonSeries;
  progressTask?: TaskProgressContext;
  completedMinutesByTaskId?: Readonly<Record<string, number | null>>;
  progressComparisonsByTaskId?: Readonly<Record<string, TaskProgressComparisonSeries | undefined>>;
  effortTasks?: TaskEffortDistributionInput[];
  hasSubtasks?: boolean;
  onOpenTask?: (taskId: string) => void;
  onRepredict?: () => Promise<void>;
  needsReview?: boolean;
  series?: TaskBurnUpSeries;
}) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const p = useProgressCopy();
  const projection = getTaskWorkloadProjection({comparison,progressTask,completedMinutesByTaskId,progressComparisonsByTaskId,effortTasks,hasSubtasks,series});
  const { assessment, mode, effort, aggregate, comparison:summaryComparison, display:fallbackDisplay } = projection;
  const predictionAction = onRepredict && progressTask?.status !== "已完成" && progressTask?.status !== "已取消"
    ? <TaskProgressRefresh onRepredict={onRepredict}/> : undefined;
  const effortDays = formatEffortPersonDays(effort.knownMinutes, locale);
  const effortSummary = effort.state === "available" ? ui("预计投入 {0}", {0: effortDays})
    : effort.state === "partial" ? ui("已估部分 {0}", {0: effortDays})
      : effort.state === "stale" ? ui("预计投入 需重估")
        : effort.state === "invalid" ? ui("预计投入 待核对") : ui("预计投入 待估算");
  const breakdown = hasSubtasks && !compact ? <TaskEffortCost
    completedMinutesByTaskId={completedMinutesByTaskId}
    progressComparisonsByTaskId={series?.source === "recorded" ? undefined : progressComparisonsByTaskId}
    comparisonAsOf={comparison?.asOf}
    onOpenTask={onOpenTask}
    mode={mode}
    presentation="summary"
    showDistribution
    tasks={effortTasks}
  /> : null;
  // Estimates (including the creation baseline) are not progress history.
  const comparisonModel = series?.source !== "recorded" ? getTaskProgressComparison(summaryComparison) : null;
  const hasProgress = comparisonModel
    ? comparisonModel.history.some(point => point.completedMinutes > 0)
    : assessment.burnUp.points.some(point => point.completedHours !== null && point.completedHours > 0);
  if (!hasProgress) return <section aria-label={ui("任务进度")}>
    <TaskProgressStage model={fallbackDisplay} action={predictionAction}/>
    {!compact && <p className="task-completion-effort-total">{effortSummary}</p>}
    {breakdown}
    {assessment.state === "invalid" && <p className="task-burnup-state">{ui("数据待核对")}</p>}
    {fallbackDisplay.scheduleIssue && <p className="task-schedule-error" role="status">{p(fallbackDisplay.scheduleIssue)}{ui("请重新设置截止时间。")}</p>}
  </section>;
  if (series?.source !== "recorded" && summaryComparison && getTaskProgressComparison(summaryComparison)) return <TaskProgressComparison compact={compact} headingAction={predictionAction} progressTask={progressTask} completedMinutes={aggregate} completionSource={aggregate !== undefined ? ui("子任务汇总") : undefined} breakdown={breakdown} currentScopeMinutes={effort.totalMinutes} currentEstimateLabel={effortSummary} series={summaryComparison} />;
  // Keep saved burn-up history while giving every Demo task the same status semantics.
  // Standalone history has no task model; adapt its existing ratio only for the summary.
  // Keep fallbackDisplay unchanged because it also supplies the burn-up date markers.
  const stageDisplay = compact && !progressTask ? getTaskProgressDisplay({
    scopeMinutes:assessment.scopeHours === null ? null : assessment.scopeHours * 60,
    completedMinutes:assessment.progressRatio === null || assessment.completedHours === null ? null : assessment.completedHours * 60,
  }) : fallbackDisplay;
  const progress = compact ? <TaskProgressStage model={stageDisplay} action={predictionAction}/> : progressTask ? <>
    <div className="task-burnup-heading"><span>{ui("完成进度")}</span>{predictionAction}</div>
    <TaskProgressOverview model={fallbackDisplay} showSchedule={false} />
    {breakdown}
  </> : undefined;
  return <TaskBurnUpSparkline compact={compact} assessment={assessment} breakdown={breakdown} effortSummary={effortSummary} needsReview={needsReview} progress={progress} timing={progressTask ? fallbackDisplay : undefined} />;
}
