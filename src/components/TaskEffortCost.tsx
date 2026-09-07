import { Tooltip } from "@base-ui/react/tooltip";
import { ChevronDown, Info } from "lucide-react";
import { useId, useState } from "react";
import { formatEffortPersonDays } from "../lib/taskEffort";
import { getTaskEffortDistribution, type TaskEffortDistributionInput } from "../lib/taskEffortDistribution";

function effortLabel(minutes: number) {
  return formatEffortPersonDays(minutes);
}

function shareLabel(share: number) {
  if (share > 0 && share < .001) return "<0.1%";
  if (share < 1 && share > .999) return ">99.9%";
  return `${Number((share * 100).toFixed(1))}%`;
}

/** Displays saved estimates for caller-selected leaves; it does not run an estimator. */
export function TaskEffortCost({ tasks, completedMinutesByTaskId, onOpenTask, mode = "detail", showDistribution = false, presentation = "field", label = "预计投入" }: {
  tasks: readonly TaskEffortDistributionInput[];
  completedMinutesByTaskId?: Readonly<Record<string, number | null>>;
  onOpenTask?: (taskId: string) => void;
  mode?: "detail" | "creation" | "example";
  showDistribution?: boolean;
  presentation?: "field" | "summary";
  label?: string;
}) {
  const [tipOpen, setTipOpen] = useState(false);
  const [distributionExpanded, setDistributionExpanded] = useState(presentation === "field");
  const tipId = useId();
  const distributionId = useId();
  const model = getTaskEffortDistribution(tasks, mode);
  // Sort a display copy only. Equal estimates and unavailable rows keep their original order.
  const distributionRows = [...model.rows].sort((left, right) => {
    if (left.minutes === null) return right.minutes === null ? 0 : 1;
    if (right.minutes === null) return -1;
    return right.minutes - left.minutes;
  });
  const hasEstimate = model.state === "available" || model.state === "partial";
  const value = hasEstimate
    ? `${model.state === "partial" ? "已估部分约" : "约"} ${effortLabel(model.knownMinutes)}`
    : model.state === "stale" ? "需重新估算" : "暂无法估算";
  const manual = mode === "creation" && model.hasManual;
  const isSummary = presentation === "summary";
  const distribution = showDistribution && model.rows.length > 0 && (isSummary || hasEstimate);
  const distributionTitle = isSummary ? "子任务投入与进度" : "子任务工时分布";
  const distributionSummary = `${model.estimatedCount}/${model.totalCount} 项已估${model.state !== "available" ? " · 占比待估算完整" : ""}`;
  const estimationBasis = "按人天展示，1 人天＝8 人时。结合资料量、完成标准及人／AI 分工估算，历史内容只用于解释具体工作差异，不从完成历时推算人工投入。等待时长不计入，人数也不直接决定工期。";
  const explanation = hasEstimate
    ? `${manual ? "当前含已保存的手工估算。" : "基于当前已记录的估算。"}${estimationBasis}${model.totalCount > 1 ? `汇总 ${model.totalCount} 项子任务，` : ""}预计投入不代表实际耗时。${model.state === "partial" ? "部分任务尚未完成有效估算，暂不计算总工时及占比。" : model.totalMinutes === 0 ? "总工时为零，不计算占比。" : distribution ? "占比为各子任务预计工时占总工时的比例，与完成度无关。" : ""}`
    : model.state === "stale" ? "任务范围或人／AI 分工已变化，原估算不再适用，需重新估算。"
      : model.state === "invalid" ? "估算记录不完整或数据异常，暂无法汇总工时及占比。"
        : `尚无适用于当前任务的模型工时估算。${estimationBasis}缺失值不按零计算。`;

  if (presentation === "summary" && !distribution) return null;

  return <div className="task-effort-cost" data-presentation={presentation} data-state={model.state}>
    {presentation !== "summary" && <span className="task-effort-field-label">{label}</span>}
    <div className="task-effort-cost-content">
      {presentation !== "summary" && <div className="task-effort-cost-summary">
        <span className="task-effort-cost-value">{value}</span>
        <Tooltip.Root onOpenChange={setTipOpen} open={tipOpen}>
          <Tooltip.Trigger aria-describedby={tipOpen ? tipId : undefined} aria-label="预计人类工时说明" className="task-effort-info" closeOnClick={false} delay={150} onClick={() => setTipOpen(true)} type="button">
            <Info aria-hidden="true" size={14} />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner className="task-effort-tip-positioner" side="top" sideOffset={6}>
              <Tooltip.Popup className="task-effort-tip" id={tipId} role="tooltip">{explanation}</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
        {manual && <span className="task-effort-source-badge">含手工估算</span>}
      </div>}
      {distribution && <section aria-label={distributionTitle} className="task-effort-distribution">
        <button aria-controls={distributionId} aria-expanded={distributionExpanded} aria-label={`${distributionExpanded ? "收起" : "展开"}${distributionTitle}`} className="task-effort-distribution-heading" onClick={() => setDistributionExpanded(value => !value)} type="button">
          <span className="task-effort-distribution-title">{distributionTitle}<span>按工时从高到低</span></span>
          <span className="task-effort-distribution-heading-end">{!isSummary && <span title={distributionSummary}>{distributionSummary}</span>}<span className="task-effort-distribution-toggle">{distributionExpanded ? "收起" : "展开"}<ChevronDown aria-hidden="true" size={14} /></span></span>
        </button>
        <ol hidden={!distributionExpanded} id={distributionId}>{distributionRows.map(row => {
          const completedMinutes = completedMinutesByTaskId && Object.prototype.hasOwnProperty.call(completedMinutesByTaskId, row.id)
            ? completedMinutesByTaskId[row.id] : null;
          const validCompleted = typeof completedMinutes === "number" && Number.isFinite(completedMinutes) && completedMinutes >= 0;
          const completionRatio = row.minutes !== null && row.minutes > 0 && validCompleted && completedMinutes <= row.minutes
            ? completedMinutes / row.minutes
            : null;
          const progressLabel = completionRatio !== null ? `已完成 ${shareLabel(completionRatio)}`
            : completedMinutes == null ? "进度未知" : "进度待核对";
          const canOpen = isSummary && onOpenTask && tasks.some(task => task.id?.trim() === row.id);
          return <li key={row.id}>
            <div className="task-effort-distribution-row">
              {canOpen ? <button className="task-effort-distribution-name" onClick={() => onOpenTask(row.id)} type="button">{row.title}</button>
                : <span className="task-effort-distribution-name">{row.title}</span>}
              <span className="task-effort-distribution-metrics">
                <span className="task-effort-distribution-amount">{row.minutes === null ? row.state === "stale" ? "需重估" : "未估算" : `预计 ${effortLabel(row.minutes)}`}</span>
                {row.share !== null && <> · <span aria-label={`工时占比 ${shareLabel(row.share)}`} className="task-effort-distribution-share">占总投入 {shareLabel(row.share)}</span></>}
              </span>
              {isSummary && <span className="task-effort-distribution-progress">{progressLabel}</span>}
            </div>
            {!isSummary && row.share !== null && <div aria-label={`${row.title}工时占比`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Number((row.share * 100).toFixed(6))} className="task-effort-distribution-track" role="meter"><span style={{ width: `${row.share * 100}%` }} /></div>}
            {isSummary && (completionRatio !== null
              ? <div aria-label={`${row.title}完成进度`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Number((completionRatio * 100).toFixed(6))} className="task-effort-distribution-track" role="progressbar"><span style={{ width: `${completionRatio * 100}%` }} /></div>
              : <div aria-label={`${row.title}完成进度：${progressLabel}`} className="task-effort-distribution-track" role="img" />)}
          </li>;
        })}</ol>
      </section>}
    </div>
  </div>;
}
