import React, { useId, useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Info } from "lucide-react";
import { getTaskBurnUpModel, type TaskBurnUpSeries } from "../lib/taskBurnUp";
import { getTaskProgressAssessment, type TaskProgressAssessment } from "../lib/taskProgressAssessment";
import { formatPersonDays, MINUTES_PER_PERSON_DAY } from "../lib/taskEffort";

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

function recordDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone: "Asia/Shanghai" }).format(new Date(value));
}

export function TaskBurnUpSparkline({ assessment, breakdown, effortSummary, needsReview = false, series }: { assessment?: TaskProgressAssessment; breakdown?: React.ReactNode; effortSummary?: string; needsReview?: boolean; series?: TaskBurnUpSeries }) {
  const resolved = assessment ?? getTaskProgressAssessment(series, []);
  const sourceModel = resolved.burnUp;
  const model = getTaskBurnUpModel(sourceModel.source ? { source: sourceModel.source, points: sourceModel.points } : undefined, { width: 196, height: 52 });
  const titleId = useId();
  const progressTipId = useId();
  const [progressTipOpen, setProgressTipOpen] = useState(false);
  const { coverage } = model;
  const hasCoordinates = resolved.hasTrend;
  const incompleteEstimate = Boolean(coverage && !coverage.isComplete) || (resolved.state === "partial" && !coverage);
  const latest = model.latest;
  const unknownHours = Boolean(latest && (latest.scopeHours === null || latest.completedHours === null));
  const currentDataIssue = incompleteEstimate || unknownHours;
  const estimateLabel = incompleteEstimate ? "估算不完整" : "工作量未知";
  const historicalGap = model.state === "partial" && !currentDataIssue;
  const burnUpStateLabel = resolved.state === "invalid" ? "数据待核对"
    : resolved.state === "stale" ? "估算需复核"
      : resolved.state === "unavailable" ? null
        : resolved.state === "zero" ? null
          : model.state === "empty" ? "暂无趋势"
      : model.state === "single" ? "历史不足"
          : currentDataIssue ? estimateLabel
          : historicalGap ? "历史含未估算记录" : null;
  const progressPercent = resolved.progressRatio === null ? null : Number((resolved.progressRatio * 100).toFixed(6));
  const emptyTrendTitle = resolved.state === "invalid" ? "数据待核对"
    : resolved.state === "stale" ? "估算需复核"
      : resolved.state === "partial" ? "估算不完整" : "暂无趋势";
  const emptyTrendDetail = resolved.state === "unavailable" ? "尚无 EWD 历史记录" : resolved.issue ?? "尚无 EWD 历史记录";
  return <section aria-label="任务完成进度与燃起图" className="task-burnup" data-source={resolved.source ?? undefined} data-state={resolved.state}>
    <div className="task-completion-progress" data-column="progress">
      <div className="task-burnup-heading"><span>完成进度</span>
        <Tooltip.Root onOpenChange={setProgressTipOpen} open={progressTipOpen}>
          <Tooltip.Trigger aria-describedby={progressTipOpen ? progressTipId : undefined} aria-label="完成进度说明" className="task-effort-info" closeOnClick={false} delay={150} onClick={() => setProgressTipOpen(value => !value)} type="button">
            <Info aria-hidden="true" size={14} />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner className="task-effort-tip-positioner" side="top" sideOffset={6}>
              <Tooltip.Popup className="task-effort-tip" id={progressTipId} role="tooltip">AI 将结合历史任务完成情况与当前任务的交付记录进行分析，仅供参考，不代表正式验收。当前展示基于本地记录计算，尚未接入 AI 评估服务。</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
      <div className="task-completion-progress-metrics">
        {resolved.progressRatio !== null
          ? <strong className="task-completion-progress-value">{progressLabel(resolved.progressRatio)}</strong>
          : <strong className="task-completion-progress-value is-unavailable">暂不可计算</strong>}
        {effortSummary && <span className="task-completion-effort-total">{effortSummary}</span>}
      </div>
      {resolved.progressRatio !== null
        ? <div aria-label={`完成进度 ${progressLabel(resolved.progressRatio)}`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progressPercent ?? undefined} className="task-completion-progress-track" role="progressbar"><span style={{ width: `${Math.min(100, Math.max(0, progressPercent ?? 0))}%` }} /></div>
        : <div aria-hidden="true" className="task-completion-progress-track" />}
      {breakdown && <div className="task-completion-breakdown">{breakdown}</div>}
      {needsReview && resolved.progressRatio !== null && <p className="task-completion-progress-review">任务状态与验收进度不一致，待核对</p>}
      {burnUpStateLabel && <p className="task-burnup-state">{burnUpStateLabel}
        {resolved.state === "invalid" && <small>{resolved.issue}</small>}
        {resolved.state === "stale" && <small>{resolved.issue}</small>}
        {currentDataIssue && coverage && <small>{model.state === "single" && `${estimateLabel} · `}{incompleteEstimate ? `已估算 ${coverage.estimatedLeafCount}/${coverage.totalLeafCount} 项` : "工时值尚未记录"}</small>}
        {currentDataIssue && !coverage && <small>{resolved.issue}</small>}
      </p>}
    </div>
    <div className="task-burnup-visual" data-column="burnup">
      <div className="task-burnup-heading"><span>燃起图</span></div>
      {hasCoordinates && <div className="task-burnup-legend" aria-label="燃起图图例">
        <span className="task-burnup-legend-scope">新增工作量</span>
        <span className="task-burnup-legend-completed">完成工作量</span>
      </div>}
      {hasCoordinates ? <svg aria-labelledby={titleId} className="task-burnup-chart" role="img" viewBox={`0 0 ${model.width} ${model.height}`}>
        <title id={titleId}>任务工作量随时间的变化：虚线为新增工作量，实线为完成工作量；完成工作量以验收为准，详细数值见下方数据表。</title>
        {model.scopePath && <path className="task-burnup-scope" d={model.scopePath} fill="none" />}
        {model.completedPath && <path className="task-burnup-completed" d={model.completedPath} fill="none" />}
        {model.points.map((point, index) => <React.Fragment key={point.timestamp}>
          {point.scopeY !== null && (index === model.points.length - 1 || (model.points[index - 1]?.scopeY == null && model.points[index + 1]?.scopeY == null)) && <circle className="task-burnup-scope-point" cx={point.x} cy={point.scopeY} r={1.8} />}
          {point.completedY !== null && (index === model.points.length - 1 || (model.points[index - 1]?.completedY == null && model.points[index + 1]?.completedY == null)) && <circle className="task-burnup-completed-point" cx={point.x} cy={point.completedY} r={1.8} />}
        </React.Fragment>)}
      </svg> : <div className="task-burnup-empty"><span><strong>{emptyTrendTitle}</strong><small>{emptyTrendDetail}</small></span></div>}
      {model.points.length > 0 && <div className="task-burnup-footer">
        <span>{model.startAt && shortDate(model.startAt)}{model.endAt !== model.startAt && model.endAt && ` — ${shortDate(model.endAt)}`}</span>
        <details className="task-burnup-details">
          <summary>查看数据</summary>
          <div className="task-burnup-data">
            <p>新增工作量展示纳入当前范围的任务累计工作量，按 EWD 加权，仅累计叶子任务，不按任务个数计算；统一以人天展示，1 人天＝8 人时，不代表日历工期。完成工作量以验收为准，只计入已验收部分对应的 EWD，不代表实际耗时。显示保留最多两位小数，完成比例使用原始值计算。</p>
            {model.state === "single" && <p>历史不足：目前只有一条记录，不推测此前趋势。</p>}
            {currentDataIssue && <p>{estimateLabel}：未知值留空断线，不计算总体完成率。</p>}
            {historicalGap && <p>历史含未估算记录；当前估算已补齐，不回填过去的未知值。</p>}
            <p>时间戳按北京时间显示；日期型记录保留原日期。</p>
            <div className="task-burnup-table-scroll" role="region" aria-label="燃起图数据" tabIndex={0}>
              <table>
                <caption>工作量（按 EWD 加权，单位：人天）</caption>
                <thead><tr><th scope="col">日期</th><th scope="col">新增工作量</th><th scope="col">完成工作量</th><th scope="col">估算覆盖</th></tr></thead>
                <tbody>{model.points.map((point) => <tr key={point.timestamp}>
                  <th scope="row"><time dateTime={point.at}>{recordDate(point.at)}</time>{point.note && <small>{point.note}</small>}</th>
                  <td>{personDays(point.scopeHours)}</td><td>{personDays(point.completedHours)}</td><td>{point.estimatedLeafCount}/{point.totalLeafCount}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </div>
        </details>
      </div>}
    </div>
  </section>;
}
