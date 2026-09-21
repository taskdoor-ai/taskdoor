import { useProgressCopy } from "../i18n/progressCopy";
import React from "react";
import { formatPersonDays } from "../lib/taskEffort";
import type { TaskProgressDisplay } from "../lib/taskProgressDisplay";
import { getTaskProgressComparison } from "../lib/taskProgressComparison";
import { TaskPredictionMarker, TaskProgressTrack } from "./TaskProgressTrack";

const percent = (ratio: number | null) => ratio === null ? "—" : `${Number((ratio * 100).toFixed(1))}%`;
const shortDate = (date: string | null) => date ? `${Number(date.slice(5,7))}/${Number(date.slice(8,10))}` : "—";
const days = (minutes: number) => formatPersonDays(minutes / 480);

/** The same work scale and date scale are used by a task and its compact children. */
export function TaskProgressOverview({model, compact = false, label = "完成进度", observationLabel = "当前", showSchedule = true, showScheduleHeading = true, showScheduleLabel = true, progress}: {
  model: TaskProgressDisplay; compact?: boolean; label?: string;
  progress?: React.ReactNode;
  showSchedule?: boolean;
  showScheduleHeading?: boolean;
  showScheduleLabel?: boolean;
  emptyComparisonLabel?: string | null; emptyExpectedLabel?: string | null; observationLabel?: string;
}) {
  const p = useProgressCopy();
  // Keep the exact rollup source in calculation details; the summary names the prediction.
  const visibleSource = model.sourceLabel === "子任务汇总" ? p("AI 预测") : model.sourceLabel;
  const workDescription=p(`${model.sourceLabel}${model.ratio === null ? "" : ` ${percent(model.ratio)}`}；${model.currentMinutes === null ? "完成量未知" : `完成量 ${days(model.currentMinutes)}`}；${model.total === null ? "总量未知" : `总量 ${days(model.total)}`}。截至 ${model.asOf}。${model.sourceLabel === "用户确认" ? "来自用户完成声明。" : "预测不代表用户确认。"}`);
  const finishDescription = model.completedOn ? p(`用户确认完成：${model.completedOn}`)
    : model.forecastOn ? p(`AI 预测完成：${model.forecastOn}`) : p("完工预测：尚无");
  const timeDescription=p(`用户设置的计划完成日期：${model.dueOn ?? "未设置"}；${finishDescription}；观测日期 ${model.asOf}。日期差按当前截止日期计算；修改截止不改变 AI 预测日期。`);
  const history = getTaskProgressComparison(model.historySeries);
  const createdOn = model.startOn ?? history?.creation?.day ?? history?.history[0]?.at ?? null;
  const hasDates=Boolean(createdOn || model.dueOn || model.finishOn);
  const scheduleDifferenceLabel = model.deltaDays === null || !model.dueOn || !model.finishOn ? null
    : model.deltaDays === 0 ? p("按期")
      : p(`${model.deltaDays > 0 ? "延期" : "提前"} ${Math.abs(model.deltaDays)} 天`);
  const dateLabels = [
    {kind:"start",label:p("创建"),date:createdOn},
    {kind:"now",label:observationLabel,date:model.asOf},
    {kind:"plan",label:p("计划结束"),date:model.dueOn},
    {kind:model.completedOn ? "completed" : "forecast",label:model.completedOn ? p("确认完成") : p("AI 预测"),date:model.finishOn},
  ].filter((item): item is typeof item & {date:string} => Boolean(item.date));
  // Each date owns a column: its marker and label align without leader lines.
  // Shared dates collapse into one column; flexible intervals preserve chronology
  // while reserving intrinsic label widths, rather than implying a duration scale.
  const dates=[...new Set(dateLabels.map(item=>item.date))].sort();
  const stops=dates.map(date=>({date,labels:dateLabels.filter(item=>item.date === date)}));
  const comparisonStart = model.dueOn && model.finishOn ? dates.indexOf(model.dueOn < model.finishOn ? model.dueOn : model.finishOn) : -1;
  const comparisonEnd = model.dueOn && model.finishOn ? dates.indexOf(model.dueOn > model.finishOn ? model.dueOn : model.finishOn) : -1;
  const comparisonGap = comparisonEnd > comparisonStart
    ? dates.slice(comparisonStart, comparisonEnd).reduce((longest, date, offset) => {
      const index = comparisonStart + offset;
      return Date.parse(dates[index+1])-Date.parse(date) > Date.parse(dates[longest+1])-Date.parse(dates[longest]) ? index : longest;
    }, comparisonStart) : -1;
  const interval=(left:string,right:string) => {
    const overrun=Boolean(model.dueOn && left >= model.dueOn);
    const difference=Boolean(model.finishOn && model.dueOn && model.finishOn < model.dueOn && left >= model.finishOn && right <= model.dueOn);
    return {kind:overrun || difference ? model.completedOn ? "actual" : model.forecastOn ? "forecast" : "observed" : "planned",
      className:overrun ? "task-progress-schedule-overrun" : difference ? "task-progress-schedule-difference" : "task-progress-schedule-planned"};
  };
  const showUnsetDeadline = compact && !model.dueOn && !model.scheduleIssue;
  const gridColumns=stops.flatMap((stop,index)=>index === stops.length-1 ? ["max-content"] : ["max-content",`minmax(16px, ${(Date.parse(stops[index+1].date)-Date.parse(stop.date))/86400000}fr)`]).join(" ") + (showUnsetDeadline ? " minmax(16px, 1fr) max-content" : "");
  return <div className="task-progress-overview" data-size={compact ? "compact" : "regular"} data-progress-source={model.sourceLabel} data-progress-state={model.ratio === null ? "unknown" : "available"}>
    {progress ?? <><div className="task-completion-progress-metrics">
      <div className="task-progress-actual-metric">{model.ratio === null
        ? <span className="task-progress-empty-label">{model.sourceLabel}</span>
        : <><strong className="task-completion-progress-value">{percent(model.ratio)}</strong><span className={visibleSource.includes(p("AI 预测")) ? "task-ai-prediction-label" : undefined}>{p(visibleSource)}</span></>}</div>
    </div>
    <TaskProgressTrack actualRatio={model.ratio} expectedRatio={null} label={p(label)} actualDescription={workDescription} /></>}
    {model.scheduleIssue && <p className="task-schedule-error" role="status">{model.scheduleIssue}{p("请重新设置截止时间。")}</p>}
    {showSchedule && <div className="task-progress-schedule" aria-label={p("任务完成时间")} data-relation={model.timeTone}>
      {showScheduleHeading && <div className="task-progress-schedule-heading">{showScheduleLabel && <span>{p("完成时间")}</span>}{model.timeStatus && <span className="task-progress-time-status" data-relation={model.timeTone} title={timeDescription}>{p(model.timeStatus)}</span>}</div>}
      {hasDates ? <div className="task-progress-schedule-chart" role="group" aria-label={p("时间轴：创建、当前日期、计划完成与预计完成日期")} title={timeDescription}>
        <div className="task-progress-schedule-axis task-progress-schedule-track" style={{gridTemplateColumns:gridColumns}}>
          {stops.map((stop,index)=>{
            const first=index === 0, last=index === stops.length-1;
            const anchor=first ? 0 : last ? 100 : 50;
            const has=(kind:string)=>stop.labels.some(item=>item.kind === kind);
            const before=index > 0 ? interval(stops[index-1].date,stop.date) : null;
            const after=!last ? interval(stop.date,stops[index+1].date) : null;
            return <React.Fragment key={stop.date}>
              <div className="task-progress-schedule-stop" style={{gridColumn:index * 2 + 1}} data-date={stop.date} data-edge={first ? "first" : last ? "last" : "middle"}>
                {before && <span aria-hidden="true" className="task-progress-schedule-link" data-kind={before.kind} data-side="before"/>}
                {after && <span aria-hidden="true" className="task-progress-schedule-link" data-kind={after.kind} data-side="after"/>}
                <div className="task-progress-schedule-node">
                  {has("start") && <span aria-hidden="true" className="task-progress-schedule-start" style={{left:`${anchor}%`}}/>}
                  {has("now") && <span aria-label={p(`当前观测 ${shortDate(stop.date)}`)} className="task-progress-schedule-now" role="img" style={{left:`${anchor}%`}}/>}
                  {has("plan") && <span aria-label={p(`计划完成 ${shortDate(stop.date)}，用户设置`)} className="task-progress-schedule-deadline" role="img" style={{left:`${anchor}%`}}/>}
                  {has("completed") && <span aria-label={p(`用户确认完成 ${shortDate(stop.date)}`)} className="task-progress-completed-marker" role="img" style={{left:`${anchor}%`}}/>}
                  {has("forecast") && <TaskPredictionMarker position={anchor} label={p(`AI 预测 ${shortDate(stop.date)}`)} description={timeDescription} showLabel={false}/>}
                </div>
                <span className="task-progress-schedule-label" data-kind={has("forecast") ? "forecast" : has("completed") ? "completed" : undefined}>
                  <span className="task-progress-schedule-types">{stop.labels.map((item,i)=><React.Fragment key={item.kind}>{i>0 && <span aria-hidden="true" className="task-progress-schedule-separator">｜</span>}<span data-kind={item.kind}>{p(item.label)}</span></React.Fragment>)}</span>
                  <time dateTime={stop.date}>{shortDate(stop.date)}</time>
                  {scheduleDifferenceLabel && model.deltaDays === 0 && has("plan") && <span className="task-progress-schedule-delta" data-coincident="true" data-relation={model.timeTone}>{scheduleDifferenceLabel}</span>}
                </span>
              </div>
              {after && <div className={`task-progress-schedule-gap ${after.className}`} data-kind={after.kind} data-has-delta={index === comparisonGap ? "true" : undefined} style={{gridColumn:index * 2 + 2}}>
                {index === comparisonGap && <span className="task-progress-schedule-delta" data-relation={model.timeTone}>{scheduleDifferenceLabel}</span>}
              </div>}
            </React.Fragment>;
          })}
          {showUnsetDeadline && <span className="task-progress-schedule-unset" style={{gridColumn:stops.length * 2 + 1}}>{p("未设置截止时间")}</span>}
        </div>
      </div> : <p className="task-progress-unavailable">{p("设置计划时间后可对比")}</p>}
    </div>}
  </div>;
}
