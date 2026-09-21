import { useProgressCopy } from "../i18n/progressCopy";
import { taskCalendarDate } from "../lib/taskSchedule";
import { useBurnUpWidth } from "../lib/useBurnUpWidth";
import { TaskProgressHistory } from "./TaskProgressHistory";
import React, { useId, useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Info } from "lucide-react";
import { getTaskBurnUpModel, type TaskBurnUpSeries } from "../lib/taskBurnUp";
import { getTaskProgressAssessment, type TaskProgressAssessment } from "../lib/taskProgressAssessment";
import { formatPersonDays, MINUTES_PER_PERSON_DAY } from "../lib/taskEffort";
import type { TaskProgressDisplay } from "../lib/taskProgressDisplay";
import { layoutBurnUpDateAxis, TaskBurnUpDateAxis, TaskBurnUpHeading, TaskBurnUpTimeDelta, TaskBurnUpTiming } from "./TaskBurnUpTiming";
import { TaskBurnUpNode } from "./TaskBurnUpNode";

function personDays(value: number | null) {
  return value === null ? "未知" : formatPersonDays(value / (MINUTES_PER_PERSON_DAY / 60)).replace(/ 人天$/u, "");
}

function progressLabel(ratio: number) {
  if (ratio > 0 && ratio < .001) return "<0.1%";
  if (ratio < 1 && ratio > .999) return ">99.9%";
  return `${Number((ratio * 100).toFixed(1))}%`;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" }).format(new Date(value));
}

export function TaskBurnUpSparkline({ compact = false, assessment, breakdown, effortSummary, needsReview = false, series, progress, timing }: { compact?: boolean; assessment?: TaskProgressAssessment; breakdown?: React.ReactNode; effortSummary?: string; needsReview?: boolean; series?: TaskBurnUpSeries; progress?: React.ReactNode; timing?: TaskProgressDisplay }) {
  const p = useProgressCopy();
  const canvas = useBurnUpWidth(196);
  const resolved = assessment ?? getTaskProgressAssessment(series, []);
  const sourceModel = resolved.burnUp;
  const referenceDates = [timing?.startOn, timing?.dueOn, timing?.finishOn].filter((date): date is string => Boolean(date));
  const model = getTaskBurnUpModel(sourceModel.source ? { source: sourceModel.source, points: sourceModel.points } : undefined, { width: canvas.width, height: 52, includeDates: referenceDates });
  const plotTimes = [...model.points.map(point => point.timestamp), ...referenceDates.map(Date.parse)];
  const plotStart = Math.min(...plotTimes);
  const plotEnd = Math.max(...plotTimes);
  const referenceX = (date: string) => plotStart === plotEnd ? model.width / 2 : 4 + (Date.parse(date) - plotStart) / (plotEnd - plotStart) * (model.width - 8);
  const differenceSpace = timing && timing.deltaDays !== null ? 26 : 0;
  const titleId = useId();
  const progressTipId = useId();
  const [progressTipOpen, setProgressTipOpen] = useState(false);
  const { coverage } = model;
  const hasCoordinates = resolved.hasTrend;
  const dateAxis = hasCoordinates && timing && model.latest ? layoutBurnUpDateAxis({ translate: p,
    model: timing, start: new Date(plotStart).toISOString().slice(0, 10), end: new Date(plotEnd).toISOString().slice(0, 10), asOf: taskCalendarDate(model.latest.at)!,
    historyStartOn: taskCalendarDate(model.points[0]?.at) ?? undefined,
    startX: 4, endX: model.width - 4, asOfX: referenceX(model.latest.at), dueX: timing.dueOn ? referenceX(timing.dueOn) : null, finishX: timing.finishOn ? referenceX(timing.finishOn) : null, fontSize: 13,
  }) : undefined;
  const incompleteEstimate = Boolean(coverage && !coverage.isComplete) || (resolved.state === "partial" && !coverage);
  const latest = model.latest;
  const viewStartX = Math.min(0, dateAxis?.labelStartX ?? 0);
  const viewWidth = Math.max(model.width, dateAxis?.labelEndX ?? model.width) - viewStartX;
  const latestPlot = model.points.at(-1);
  const scopeEnd = [timing?.dueOn, timing?.finishOn].filter((at): at is string=>Boolean(at && latestPlot && Date.parse(at)>latestPlot.timestamp)).sort().at(-1);
  const projectScope = Boolean(scopeEnd && latestPlot?.scopeY != null && latestPlot.scopeHours!>0 && !incompleteEstimate
    && resolved.state!=="invalid" && resolved.state!=="stale" && !timing?.cancelled && !timing?.completedOn && timing?.sourceLabel!=="用户确认");
  const unknownHours = Boolean(latest && (latest.scopeHours === null || latest.completedHours === null));
  const currentDataIssue = incompleteEstimate || unknownHours;
  const estimateLabel = incompleteEstimate ? p("估算不完整") : p("工作量未知");
  const historicalGap = model.state === "partial" && !currentDataIssue;
  const burnUpStateLabel = resolved.state === "invalid" ? p("数据待核对")
    : resolved.state === "stale" ? p("估算需复核")
      : resolved.state === "unavailable" ? null
        : resolved.state === "zero" ? null
          : model.state === "empty" ? p("暂无趋势")
      : model.state === "single" ? p("历史不足")
          : currentDataIssue ? estimateLabel
          : historicalGap ? p("历史含未估算记录") : null;
  const progressPercent = resolved.progressRatio === null ? null : Number((resolved.progressRatio * 100).toFixed(6));
  const emptyTrendTitle = resolved.state === "invalid" ? p("数据待核对")
    : resolved.state === "stale" ? p("估算需复核")
      : resolved.state === "partial" ? p("估算不完整") : p("暂无趋势");
  const emptyTrendDetail = resolved.state === "unavailable" ? p("尚无 EWD 历史记录") : resolved.issue ?? p("尚无 EWD 历史记录");
  return <section aria-label={p("任务完成进度与燃起图")} className="task-burnup" data-source={resolved.source ?? undefined} data-state={resolved.state}>
    <TaskProgressHistory compact={compact} summary={<div className="task-completion-progress" data-column="progress">
      {progress ?? <><div className="task-burnup-heading"><span>{p("完成进度")}</span>
        <Tooltip.Root onOpenChange={setProgressTipOpen} open={progressTipOpen}>
          <Tooltip.Trigger aria-describedby={progressTipOpen ? progressTipId : undefined} aria-label={p("完成进度说明")} className="task-effort-info" closeOnClick={false} delay={150} onClick={() => setProgressTipOpen(value => !value)} type="button">
            <Info aria-hidden="true" size={14} />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner className="task-effort-tip-positioner" side="top" sideOffset={6}>
              <Tooltip.Popup className="task-effort-tip" id={progressTipId} role="tooltip">{p("完成进度＝AI 预测完成量 ÷ 总工作量 × 100%。标记「已完成」后显示 100% · 用户确认。")}</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
      <div className="task-completion-progress-metrics">
        {resolved.progressRatio !== null
          ? <strong className="task-completion-progress-value">{progressLabel(resolved.progressRatio)}</strong>
          : <strong className="task-completion-progress-value is-unavailable">{p("暂不可计算")}</strong>}
        {effortSummary && <span className="task-completion-effort-total">{effortSummary}</span>}
      </div>
      {resolved.progressRatio !== null
        ? <div aria-label={p(`完成进度 ${progressLabel(resolved.progressRatio)}`)} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progressPercent ?? undefined} className="task-completion-progress-track" role="progressbar"><span style={{ width: `${Math.min(100, Math.max(0, progressPercent ?? 0))}%` }} /></div>
        : <div aria-hidden="true" className="task-completion-progress-track" />}
      {breakdown && <div className="task-completion-breakdown">{breakdown}</div>}
      {needsReview && resolved.progressRatio !== null && <p className="task-completion-progress-review">{p("任务状态与验收进度不一致，待核对")}</p>}
      {burnUpStateLabel && <p className="task-burnup-state">{burnUpStateLabel}
        {resolved.state === "invalid" && <small>{p(resolved.issue ?? "")}</small>}
        {resolved.state === "stale" && <small>{p(resolved.issue ?? "")}</small>}
        {currentDataIssue && coverage && <small>{model.state === "single" && `${estimateLabel} · `}{incompleteEstimate ? p(`已估算 ${coverage.estimatedLeafCount}/${coverage.totalLeafCount} 项`) : p("工时值尚未记录")}</small>}
        {currentDataIssue && !coverage && <small>{p(resolved.issue ?? "")}</small>}
      </p>}</>}
    </div>}><div ref={canvas.ref} className="task-burnup-visual" data-column="burnup">
      <TaskBurnUpHeading/>
      {hasCoordinates && <div className="task-burnup-legend" aria-label={p("燃起图图例")}>
        <span className="task-burnup-legend-scope">{p("总工作量")}<strong>{personDays(latest?.scopeHours ?? null)}</strong></span>
        {latest?.completedHours != null && <span className="task-burnup-legend-completed">{p("完成工作量")}<strong>{personDays(latest.completedHours)}</strong></span>}
      </div>}
      {hasCoordinates ? <svg aria-labelledby={titleId} className="task-burnup-chart" role="group" viewBox={`${viewStartX} 0 ${viewWidth} ${model.height + differenceSpace + (dateAxis?.height ?? 0)}`}>
        <desc id={titleId}>{p("任务工作量随时间的变化：灰色实线为已记录总工作量，灰色虚线按当前总量延续；蓝线为完成工作量，图例数值单位为人天；悬浮节点查看日期与工作量。")}</desc>
        {timing && <TaskBurnUpTimeDelta model={timing} startX={4} endX={model.width-4} dueX={timing.dueOn ? referenceX(timing.dueOn) : null} finishX={timing.finishOn ? referenceX(timing.finishOn) : null} y={20} fontSize={13}/>}
        <g transform={`translate(0 ${differenceSpace})`}>
        {model.scopePath && <path className="task-burnup-scope" data-overlap={model.scopePath === model.completedPath} d={model.scopePath} fill="none" />}
        {model.completedPath && <path className="task-burnup-completed" d={model.completedPath} fill="none" />}
        {projectScope && latestPlot && <>
          <path className="task-progress-scope-forecast" d={`M ${latestPlot.x} ${latestPlot.scopeY} H ${referenceX(scopeEnd!)}`} fill="none"/>
          <TaskBurnUpNode kind="scope-forecast" date={scopeEnd!} x={referenceX(scopeEnd!)} y={latestPlot.scopeY!} radius={5}
            lines={[p(`预计总工作量 ${personDays(latestPlot.scopeHours)} 人天`),p("暂无预计新增工作，按当前总量延续")]}>
            <circle className="task-burnup-scope-point" cx={referenceX(scopeEnd!)} cy={latestPlot.scopeY!} r={1.8}/>
          </TaskBurnUpNode>
        </>}
        {timing?.dueOn && <line className="task-progress-chart-deadline" x1={referenceX(timing.dueOn)} x2={referenceX(timing.dueOn)} y1={differenceSpace ? -6 : 0} y2={model.height}><title>{p(`计划截止 ${shortDate(timing.dueOn)}`)}</title></line>}
        {timing?.finishOn && <line className={timing.completedOn ? "task-progress-chart-completed-date" : "task-progress-chart-forecast-date"} x1={referenceX(timing.finishOn)} x2={referenceX(timing.finishOn)} y1={differenceSpace ? -6 : 0} y2={model.height}><title>{`${timing.completedOn ? p("确认完成") : p("AI 预测")} ${shortDate(timing.finishOn)}`}</title></line>}
        {model.points.map((point, index) => {
          const showScope = point.scopeY !== null && (index === 0 || index === model.points.length - 1 || (model.points[index - 1]?.scopeY == null && model.points[index + 1]?.scopeY == null));
          const showCompleted = point.completedY !== null && (index === model.points.length - 1 || (model.points[index - 1]?.completedY == null && model.points[index + 1]?.completedY == null));
          const overlap = showScope && showCompleted && point.scopeY === point.completedY;
          return <React.Fragment key={point.timestamp}>
            {showScope && point.scopeY !== null && <TaskBurnUpNode kind="scope" date={point.at} x={point.x} y={point.scopeY} radius={5}
              lines={[p(`总工作量 ${personDays(point.scopeHours)} 人天`), ...(overlap ? [p(`完成量 ${personDays(point.completedHours)} 人天`)] : []), ...(point.note ? [point.note] : [])]}>
              <circle className="task-burnup-scope-point" cx={point.x} cy={point.scopeY} r={overlap ? 3.2 : 1.8}/>
              {overlap && <circle className="task-burnup-completed-point" cx={point.x} cy={point.completedY!} r={1.8}/>}
            </TaskBurnUpNode>}
            {showCompleted && point.completedY !== null && !overlap && <TaskBurnUpNode kind="completed" date={point.at} x={point.x} y={point.completedY} radius={5}
              lines={[p(`完成量 ${personDays(point.completedHours)} 人天`)]}>
              <circle className="task-burnup-completed-point" cx={point.x} cy={point.completedY} r={1.8}/>
            </TaskBurnUpNode>}
          </React.Fragment>;
        })}
        </g>
        {dateAxis && <TaskBurnUpDateAxis layout={dateAxis} y={model.height + differenceSpace}/>}
      </svg> : <div className="task-burnup-empty"><span><strong>{emptyTrendTitle}</strong><small>{p(emptyTrendDetail)}</small></span></div>}
      {timing && <TaskBurnUpTiming model={timing} showDates={!hasCoordinates} showStatus={!hasCoordinates || timing.deltaDays === null}/>}
      {model.points.length > 0 && !dateAxis && <div className="task-burnup-footer">
        {!dateAxis && <span>{shortDate(new Date(plotStart).toISOString())}{plotEnd !== plotStart && ` — ${shortDate(new Date(plotEnd).toISOString())}`}</span>}
      </div>}
    </div></TaskProgressHistory>
  </section>;
}
