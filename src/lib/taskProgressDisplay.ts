import { taskCalendarDate, taskScheduleError } from "./taskSchedule";
import type { TaskNode } from "../data/workspaceNodes";
import { getTaskProgressComparison, type TaskProgressComparisonSeries } from "./taskProgressComparison";

export type TaskProgressContext = Partial<Pick<TaskNode, "status" | "plannedStartOn" | "plannedEndOn" | "createdAt" | "effortBaseline" | "effortEstimate" | "goal" | "completionCriteria" | "executionTips">> & {
  completedAt?: string;
  progressReopenedAt?: string;
};
export const progressDate = taskCalendarDate;
export function getTaskProgressDisplay({series, task, scopeMinutes, completedMinutes, expectedAsOf, sourceLabel}: {
  series?: TaskProgressComparisonSeries;
  task?: TaskProgressContext;
  scopeMinutes?: number | null;
  completedMinutes?: number | null;
  expectedAsOf?: string;
  sourceLabel?: string;
}) {
  // A saved confirmation is not an AI assessment. Reopening restores only the
  // independently recorded AI value, with its original observation date.
  const restoreConfirmed = Boolean(task?.progressReopenedAt && task.status !== "已完成" && task.status !== "已取消" && series?.timing.completedOn);
  const priorAi = series?.aiAssessment;
  const priorDay = progressDate(priorAi?.observedAt);
  const canRestoreAi = restoreConfirmed && priorAi && priorDay && series
    && priorAi.scopeVersion === series.workload.at(-1)?.scopeVersion
    && priorAi.scopeMinutes === series.workload.at(-1)?.scopeMinutes
    && Number.isSafeInteger(priorAi.completedMinutes) && priorAi.completedMinutes >= 0 && priorAi.completedMinutes <= priorAi.scopeMinutes;
  if (canRestoreAi && series) {
    series = {...series, asOf:priorDay, workload:[...series.workload.filter(point=>point.at<priorDay),
      {at:priorDay,scopeMinutes:priorAi.scopeMinutes,completedMinutes:priorAi.completedMinutes,scopeVersion:priorAi.scopeVersion,note:priorAi.basis}],
      timing:{...series.timing,completedOn:undefined}};
  }
  const originalModel = getTaskProgressComparison(series);
  const confirmedDate = task?.status === "已完成" || task?.status === "已取消" ? progressDate(task.completedAt) : null;
  const savedAssessment = series?.aiAssessment;
  const aiAssessment = savedAssessment && progressDate(savedAssessment.observedAt)
    && Number.isSafeInteger(savedAssessment.scopeMinutes) && savedAssessment.scopeMinutes > 0
    && Number.isSafeInteger(savedAssessment.completedMinutes) && savedAssessment.completedMinutes >= 0
    && savedAssessment.completedMinutes <= savedAssessment.scopeMinutes && savedAssessment.scopeVersion
    ? {...savedAssessment, ratio:savedAssessment.completedMinutes / savedAssessment.scopeMinutes} : null;
  const confirmationAt = task?.status === "已完成" && confirmedDate ? task.completedAt! : null;
  let assessmentTiming: "before" | "after" | "unknown" = "unknown";
  if (aiAssessment && confirmationAt) {
    const precise = aiAssessment.observedAt.includes("T") && confirmationAt.includes("T");
    const difference = precise ? Date.parse(aiAssessment.observedAt) - Date.parse(confirmationAt)
      : Date.parse(progressDate(aiAssessment.observedAt)!) - Date.parse(confirmedDate!);
    if (difference < 0) assessmentTiming="before";
    else if (difference > 0) assessmentTiming="after";
  }
  // A status event adds a confirmation observation; fixed AI snapshots are never mutated.
  let historySeries = series;
  if (series && originalModel && confirmedDate && confirmedDate >= series.asOf
    && (scopeMinutes === undefined || scopeMinutes === originalModel.latest.scopeMinutes)) {
    const point = {...originalModel.latest,at:confirmedDate,completedMinutes:originalModel.latest.scopeMinutes,
      note:"用户确认完成；AI 预测独立保留，可在计算明细查看"};
    historySeries = {...series,asOf:confirmedDate,workload:confirmedDate > series.asOf ? [...series.workload,point] : [...series.workload.slice(0,-1),point],
      timing:{...series.timing,completedOn:confirmedDate}};
  }
  const model = getTaskProgressComparison(historySeries);
  const total = scopeMinutes === undefined ? model?.latest.scopeMinutes ?? null : scopeMinutes;
  const scopeValid = typeof total === "number" && Number.isFinite(total) && total > 0;
  const sameScope = model && scopeValid && total === model.latest.scopeMinutes;
  const planChanged = Boolean(series && task && (
    (task.plannedStartOn !== undefined && task.plannedStartOn !== series.timing.startOn) ||
    (task.plannedEndOn !== undefined && task.plannedEndOn !== series.timing.dueOn)));
  const sameObservation = expectedAsOf === undefined || series?.asOf === expectedAsOf;
  const reopened = Boolean(task?.progressReopenedAt && task.status !== "已完成" && task.status !== "已取消");
  const amount = completedMinutes === undefined ? (sameScope ? model?.latest.completedMinutes ?? null : null) : completedMinutes;
  let ratio = scopeValid && typeof amount === "number" && Number.isFinite(amount) && amount >= 0 && amount <= total! ? amount / total! : null;
  if (restoreConfirmed && !canRestoreAi) ratio = null;
  let label = sourceLabel ?? (series ? "AI 预测" : "已记录");
  // Active status changes are not new workload observations. Scope, delivered work,
  // history and forecasts keep their evidence values, even while the task is waiting.
  if (task?.status === "已完成") { ratio=1; label="用户确认"; }
  else if (task?.status === "已取消") { label="取消时进度"; if (confirmedDate) ratio=1; }
  if (ratio === null) label="尚无进度预测";
  const expectedRatio = sameScope && sameObservation && !planChanged ? model!.expectedRatio : null;
  const expectedMinutes = expectedRatio === null ? null : expectedRatio * total!;
  const currentMinutes = ratio === null || !scopeValid ? null : ratio * total!;
  const deltaMinutes = currentMinutes === null || expectedMinutes === null ? null : currentMinutes-expectedMinutes;
  const asOf = progressDate(task?.completedAt) ?? series?.asOf ?? progressDate(new Date().toISOString())!;
  // Task creation is independent of the editable plan and progress observation dates.
  const startOn = task ? progressDate(task.createdAt) : model?.creation?.day ?? null;
  const savedDueOn = task?.plannedEndOn !== undefined ? progressDate(task.plannedEndOn) : model?.dueOn ?? null;
  const scheduleIssue = taskScheduleError(savedDueOn, startOn);
  const dueOn = scheduleIssue ? null : savedDueOn;
  const completedOn = task?.status === "已完成" ? progressDate(task.completedAt)
    : !task?.status && ratio === 1 ? model?.completedOn ?? null : null;
  const cancelled = task?.status === "已取消";
  // The user's deadline is a comparison target, never an input that invalidates an AI forecast.
  // Each child owns its observation date; a newer parent confirmation does not invalidate that forecast.
  const forecastOn = !cancelled && task?.status !== "已完成" && ratio !== null && sameScope ? model!.forecastOn : null;
  const finishOn=completedOn ?? forecastOn;
  const deltaDays=dueOn && finishOn ? (Date.parse(finishOn)-Date.parse(dueOn))/86400000 : null;
  const timeTone=deltaDays === null ? "unknown" : deltaDays > 0 ? "behind" : deltaDays < 0 ? "ahead" : "on-track";
  const timeStatus=cancelled ? "已取消" : task?.status === "已完成" && !completedOn ? "完成日期待确认"
    : !dueOn ? "未设截止时间" : ratio === 1 && !completedOn ? "等待完成确认"
      : deltaDays === null ? ""
      : deltaDays === 0 ? (completedOn ? "按期完成" : "预计按期")
        : `${completedOn ? "" : "预计"}${deltaDays > 0 ? "延期" : "提前"} ${Math.abs(deltaDays)} 天`;
  return {ratio,sourceLabel:label,expectedRatio,expectedMinutes,currentMinutes,total,deltaMinutes,
    aiAssessment,assessmentTiming,confirmationAt,
    relation:deltaMinutes === null ? "unknown" : deltaMinutes > 0 ? "ahead" : deltaMinutes < 0 ? "behind" : "on-track",
    scheduleIssue,asOf,startOn,dueOn,forecastOn,completedOn,finishOn,deltaDays,timeTone,timeStatus,cancelled,planChanged,reopened,historySeries};
}
export type TaskProgressDisplay = ReturnType<typeof getTaskProgressDisplay>;
