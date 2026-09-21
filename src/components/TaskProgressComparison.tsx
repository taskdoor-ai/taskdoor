import { useProgressCopy } from "../i18n/progressCopy";
import { useBurnUpWidth } from "../lib/useBurnUpWidth";
import { TaskProgressHistory } from "./TaskProgressHistory";
import React, { useId } from "react";
import { Info } from "lucide-react";
import { formatPersonDays } from "../lib/taskEffort";
import { getTaskProgressChart, getTaskProgressComparison, type TaskProgressComparisonSeries } from "../lib/taskProgressComparison";
import { TaskProgressOverview } from "./TaskProgressOverview";
import { TaskProgressStage } from "./TaskProgressStage";
import { TaskBurnUpNode } from "./TaskBurnUpNode";
import { layoutBurnUpDateAxis, TaskBurnUpDateAxis, TaskBurnUpHeading, TaskBurnUpTimeDelta, TaskBurnUpTiming } from "./TaskBurnUpTiming";
import { getTaskProgressDisplay, type TaskProgressContext, type TaskProgressDisplay } from "../lib/taskProgressDisplay";

const shortDate = (date: string | null) => date ? `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}` : "—";
const days = (minutes: number) => formatPersonDays(minutes / 480);
const signedWork = (minutes: number) => `${minutes > 0 ? "+" : minutes < 0 ? "−" : ""}${days(Math.abs(minutes))}`;

export function TaskProgressComparison({ compact = false, series, currentScopeMinutes, breakdown, progressTask, completedMinutes, completionSource, presentation, headingAction }: {
  compact?: boolean;
  series: TaskProgressComparisonSeries;
  headingAction?: React.ReactNode;
  currentScopeMinutes?: number | null;
  currentEstimateLabel?: string;
  breakdown?: React.ReactNode;
  progressTask?: TaskProgressContext;
  completedMinutes?: number | null;
  completionSource?: string;
  /** A saved presentation can show missing/stale states without inventing chart records. */
  presentation?: {
    display: TaskProgressDisplay;
    overview?: Omit<React.ComponentProps<typeof TaskProgressOverview>, "model" | "compact">;
    historyEmpty?: string;
    historyLabel?: string;
  };
}) {
  const p = useProgressCopy();
  const id = useId();
  const canvas = useBurnUpWidth(320);
  const sourceModel = getTaskProgressComparison(series);
  if (!sourceModel) return null;
  const scopeChanged = currentScopeMinutes != null && currentScopeMinutes !== sourceModel.latest.scopeMinutes;
  const display = presentation?.display ?? getTaskProgressDisplay({series,task:progressTask,scopeMinutes:currentScopeMinutes,completedMinutes,sourceLabel:completionSource});
  const historyModel = getTaskProgressComparison(display.historySeries) ?? sourceModel;
  const historicalOnly = display.ratio === null && currentScopeMinutes !== undefined
    && historyModel.history.some(point => point.completedMinutes > 0);
  const baseModel = scopeChanged ? {...sourceModel, expectedRatio:null, expectedMinutes:null, deltaMinutes:null, deltaPoints:null, forecastOn:null, finishOn:sourceModel.completedOn, deltaDays:null, relation:"unknown" as const} : historyModel;
  const model = {...baseModel, startOn:display.startOn, forecastOn:display.forecastOn, finishOn:display.finishOn, dueOn:display.dueOn, completedOn:display.completedOn, deltaDays:display.deltaDays};
  const chart = getTaskProgressChart(model,progressTask,{width:canvas.width,projectScope:!display.cancelled && display.sourceLabel!=="用户确认"
    && !scopeChanged && display.total===model.latest.scopeMinutes && presentation?.historyLabel!=="上次记录"});
  const latestRow = chart.rows.at(-1)!;
  const totalsOverlap = latestRow.scopeMinutes === latestRow.completedMinutes;
  // Keep adjacent scope/completion markers reachable without shifting their amounts.
  const forecastNodeRadius = (at:string,y:number) => Math.min(9,...[
    ...chart.forecastRows.filter(p=>p.at===at).map(p=>Math.abs(p.y-y)/2),
    ...chart.scopeForecastRows.filter(p=>p.at===at).map(p=>Math.abs(p.scopeY-y)/2),
  ].filter(distance=>distance>0).map(distance=>Math.max(1,distance)));
  const dateAxis = layoutBurnUpDateAxis({ translate: p, model: display, ...chart, asOf: model.latest.at, historyStartOn: chart.scopeRows[0]?.at, observationLabel: presentation?.historyLabel ?? (historicalOnly ? p("上次记录") : undefined), fontSize:13 });
  const viewStartX = Math.min(0, dateAxis.labelStartX);
  const viewWidth = Math.max(chart.width, dateAxis.labelEndX) - viewStartX;
  const timeExplanation = model.deltaDays === null ? p("暂无法比较完成日与截止日")
    : p(`${model.completedOn ? "实际" : "预计"}${model.deltaDays > 0 ? "延期" : model.deltaDays < 0 ? "提前" : "按期完成"}${model.deltaDays === 0 ? "" : ` ${Math.abs(model.deltaDays)} 天`}，按日历天比较`);
  return <section aria-label={p("任务完成进度与燃起图")} className="task-burnup task-progress-comparison" data-source="example" data-scenario={series.scenario}>
    <TaskProgressHistory compact={compact} summary={<div className="task-completion-progress" data-column="progress">
      {compact ? <TaskProgressStage model={display} action={headingAction} unavailableLabel={historicalOnly ? p("待重新评估") : undefined}/> : <><div className="task-burnup-heading"><span>{p("完成进度")}</span>
        <details className="task-progress-help"><summary aria-label={p("完成进度说明")}><Info aria-hidden="true" size={14}/></summary>
          <p>{p("完成进度＝AI 预测完成量 ÷ 总工作量 × 100%。标记「已完成」后显示 100% · 用户确认。")}</p>
        </details>
        {headingAction}
      </div>
      <TaskProgressOverview model={display} {...presentation?.overview} showSchedule={false} /></>}
      {breakdown && <div className="task-completion-breakdown">{breakdown}</div>}
    </div>}><div ref={canvas.ref} className="task-burnup-visual" data-column="burnup">
      <TaskBurnUpHeading/>
      {presentation?.historyEmpty ? <><div className="task-burnup-empty" role="status">{p(presentation.historyEmpty)}</div><TaskBurnUpTiming model={display} showStatus/></> : <>
      <div aria-label={p("燃起图图例，数值单位为人天")} className="task-burnup-legend"><span className="task-progress-legend-scope" title={p(`${shortDate(model.latest.at)} 总工作量 ${days(model.latest.scopeMinutes)}`)}>{p("总工作量")}<strong>{days(model.latest.scopeMinutes).replace(/ 人天$/u, "")}</strong></span><span className="task-progress-legend-actual" title={p(`${shortDate(model.latest.at)} 完成量 ${days(model.latest.completedMinutes)}`)}>{p("完成量")}<strong>{days(model.latest.completedMinutes).replace(/ 人天$/u, "")}</strong></span>{chart.forecastX !== null && <span className="task-progress-legend-expected" data-trend={Boolean(chart.forecastPath)}>{p("AI 预测")}</span>}</div>
      <div className="task-progress-chart-interaction">
        <svg aria-label={p("燃起图：总工作量与完成量")} aria-describedby={`${id}-desc`} className="task-burnup-chart task-progress-comparison-chart" role="group" viewBox={`${viewStartX} 0 ${viewWidth} ${chart.bottomY + dateAxis.height}`}>
          <desc id={`${id}-desc`}>{p("总工作量包含初始范围与后续增减，保留各日原始量；完成量来自 AI 预测或用户确认。")}{chart.scopeForecastPath && p("灰色虚线为预计总工作量；无预计范围变化时保持当前总量，有依据的新增按未来节点上升。")}{chart.forecastPath ? p("紫色阶梯虚线为未来交付节点的预测完成量，等待阶段持平，不是已完成记录。") : chart.forecastX !== null ? p("紫色竖虚线仅标记预测完成日，暂无未来完成量节点。") : ""}{p("上方连接线只表示日期差。")}{timeExplanation}。</desc>
          <TaskBurnUpTimeDelta model={display} startX={chart.startX} endX={chart.endX} dueX={chart.dueX} finishX={chart.finishX} fontSize={13}/>
          {[0,.5,1].map(ratio => {const y=chart.bottomY-ratio*(chart.bottomY-chart.topY);return <g key={ratio}><line className="task-progress-chart-grid" x1={chart.startX} x2={chart.endX} y1={y} y2={y}/><text className="task-progress-chart-axis" style={{fontSize:13}} x={chart.startX-7} y={y+3} textAnchor="end">{Number((chart.maxDays*ratio).toPrecision(3))}</text></g>;})}
          <path className="task-progress-scope-path" d={chart.scopePath} fill="none"/>
          {chart.scopeOverlapPath && <path className="task-progress-scope-overlap" d={chart.scopeOverlapPath} fill="none"><title>{p("此段总工作量与完成量相等：灰色外沿为总量，蓝色内线为完成量")}</title></path>}
          <path className="task-progress-actual-path" d={chart.completedPath} fill="none"/>
          {chart.scopeForecastPath && <path className="task-progress-scope-forecast" d={chart.scopeForecastPath} fill="none"/>}
          {chart.forecastPath && <path className="task-progress-forecast-trend" d={chart.forecastPath} fill="none"/>}
          {chart.dueX !== null && <line className="task-progress-chart-deadline" x1={chart.dueX} x2={chart.dueX} y1={display.deltaDays !== null ? 24 : chart.topY-4} y2={chart.bottomY}><title>{p(`计划截止 ${shortDate(model.dueOn)}`)}</title></line>}
          {chart.forecastX !== null && <line className="task-progress-chart-forecast-date" x1={chart.forecastX} x2={chart.forecastX} y1={display.deltaDays !== null ? 24 : chart.topY-4} y2={chart.bottomY}><title>{p(`AI 预测完成 ${shortDate(model.forecastOn)}`)}</title></line>}
          {model.completedOn && chart.finishX !== null && <line className="task-progress-chart-completed-date" x1={chart.finishX} x2={chart.finishX} y1={display.deltaDays !== null ? 24 : chart.topY-4} y2={chart.bottomY}><title>{p(`用户确认完成 ${shortDate(model.completedOn)}`)}</title></line>}
          {chart.scopeForecastRows.slice(1).filter(point=>point.at!==model.forecastOn && !chart.forecastRows.some(row=>row.at===point.at && row.completedMinutes===point.scopeMinutes)).map(point=><TaskBurnUpNode key={`scope-${point.at}`} kind="scope-forecast" date={point.at} x={point.x} y={point.scopeY} radius={forecastNodeRadius(point.at,point.scopeY)}
            lines={[p(`AI 预测总工作量 ${days(point.scopeMinutes)}`),point.note]}>
            <circle className="task-progress-scope-point" cx={point.x} cy={point.scopeY} r={3}/>
          </TaskBurnUpNode>)}
          {chart.forecastRows.slice(0,-1).map(point => <TaskBurnUpNode key={point.at} kind="forecast" date={point.at} x={point.x} y={point.y} radius={forecastNodeRadius(point.at,point.y)}
            lines={[p(`AI 预测完成量 ${days(point.completedMinutes)}`),p(`预测总工作量 ${days(point.scopeMinutes)}`)]}>
            {point.completedMinutes===point.scopeMinutes && <circle className="task-progress-scope-point" cx={point.x} cy={point.y} r={6}/>}
            <circle className="task-progress-forecast-milestone" cx={point.x} cy={point.y} r={3}/>
          </TaskBurnUpNode>)}
          {chart.forecastX !== null && model.forecastOn && <TaskBurnUpNode kind="forecast" date={model.forecastOn} x={chart.forecastX} y={chart.finishY}
            lines={[p("AI 预测完成"), p(`预测完成量 ${days(chart.finishScopeMinutes)}`),...(chart.scopeForecastPath ? [p(`预测总工作量 ${days(chart.finishScopeMinutes)}`),chart.scopeForecastRows.find(point=>point.at===model.forecastOn)!.note] : [])]}>
            {chart.scopeForecastPath && <circle className="task-progress-scope-point" cx={chart.forecastX} cy={chart.finishY} r={6}/>}
            <rect className="task-progress-forecast-point" x={chart.forecastX-3.5} y={chart.finishY-3.5} width={7} height={7} rx={1}/>
          </TaskBurnUpNode>}
          {chart.scopeRows.filter((row,i)=>(row.isCreation || i===chart.scopeRows.length-1 || row.addedMinutes!==0) && !(row.at===latestRow.at && row.scopeMinutes===latestRow.scopeMinutes && totalsOverlap)).map((row,i) =>
            <TaskBurnUpNode key={`${row.at}-${i}`} kind="scope" date={row.observedAt} x={row.x} y={row.scopeY}
              lines={[`${row.isCreation ? p("创建时初始总工作量") : p("总工作量")} ${days(row.scopeMinutes)}`, ...(row.addedMinutes ? [`${row.addedMinutes > 0 ? p("新增") : p("缩减")} ${signedWork(row.addedMinutes)}`] : [])]}>
              <circle className="task-progress-scope-point" data-overlap={row.scopeMinutes === row.completedMinutes} cx={row.x} cy={row.scopeY} r={row.scopeMinutes === row.completedMinutes ? 6 : 3}/>
            </TaskBurnUpNode>)}
          <TaskBurnUpNode kind="completed" date={model.latest.at} x={latestRow.x} y={latestRow.completedY}
            lines={[...(totalsOverlap ? [p(`总工作量 ${days(model.latest.scopeMinutes)}`)] : []), p(`完成量 ${days(model.latest.completedMinutes)}`)]}>
            {totalsOverlap && <circle className="task-progress-scope-point" data-overlap="true" cx={latestRow.x} cy={latestRow.scopeY} r={6}/>}
            <circle className="task-progress-actual-point" cx={latestRow.x} cy={latestRow.completedY} r={4}/>
          </TaskBurnUpNode>
          <TaskBurnUpDateAxis layout={dateAxis} y={chart.bottomY}/>
        </svg>
      </div>
      <TaskBurnUpTiming model={display} showDates={false}/>
      </>}
    </div></TaskProgressHistory>
  </section>;
}
