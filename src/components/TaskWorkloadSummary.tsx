import React from "react";
import type { TaskBurnUpSeries } from "../lib/taskBurnUp";
import { formatEffortPersonDays } from "../lib/taskEffort";
import { getTaskEffortDistribution, type TaskEffortDistributionInput } from "../lib/taskEffortDistribution";
import { getTaskProgressAssessment } from "../lib/taskProgressAssessment";
import { TaskBurnUpSparkline } from "./TaskBurnUpSparkline";
import { TaskEffortCost } from "./TaskEffortCost";

/** The detail summary uses the recorded burn-up ledger as its single progress source. */
export function TaskWorkloadSummary({ completedMinutesByTaskId, effortTasks = [], hasSubtasks = effortTasks.length > 1, onOpenTask, needsReview = false, series }: {
  completedMinutesByTaskId?: Readonly<Record<string, number | null>>;
  effortTasks?: TaskEffortDistributionInput[];
  hasSubtasks?: boolean;
  onOpenTask?: (taskId: string) => void;
  needsReview?: boolean;
  series?: TaskBurnUpSeries;
}) {
  const assessment = getTaskProgressAssessment(series, effortTasks);
  const mode = assessment.source === "example" ? "example" : "detail";
  const effort = getTaskEffortDistribution(effortTasks, mode);
  const effortDays = formatEffortPersonDays(effort.knownMinutes);
  const effortSummary = effort.state === "available" ? `预计投入 ${effortDays}`
    : effort.state === "partial" ? `已估部分 ${effortDays}`
      : effort.state === "stale" ? "预计投入 需重估"
        : effort.state === "invalid" ? "预计投入 待核对" : "预计投入 待估算";
  const breakdown = hasSubtasks ? <TaskEffortCost
    completedMinutesByTaskId={completedMinutesByTaskId}
    onOpenTask={onOpenTask}
    mode={mode}
    presentation="summary"
    showDistribution
    tasks={effortTasks}
  /> : null;
  return <TaskBurnUpSparkline assessment={assessment} breakdown={breakdown} effortSummary={effortSummary} needsReview={needsReview} />;
}
