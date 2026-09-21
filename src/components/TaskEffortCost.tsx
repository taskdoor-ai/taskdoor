import { useI18n } from "../i18n/I18nProvider";
import { useGlobalUi } from "../i18n/globalUi";
import { Tooltip } from "@base-ui/react/tooltip";
import { ChevronDown, Info } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";
import { formatEffortPersonDays } from "../lib/taskEffort";
import { getTaskEffortDistribution, type TaskEffortDistributionInput } from "../lib/taskEffortDistribution";
import { type TaskProgressComparisonSeries } from "../lib/taskProgressComparison";
import { TaskProgressOverview } from "./TaskProgressOverview";
import { getTaskProgressDisplay } from "../lib/taskProgressDisplay";
import { TaskStatusBadge } from "./TaskStatusBadge";


function shareLabel(share: number) {
  if (share > 0 && share < .001) return "<0.1%";
  if (share < 1 && share > .999) return ">99.9%";
  return `${Number((share * 100).toFixed(1))}%`;
}

/** Displays saved estimates for caller-selected leaves; it does not run an estimator. */
export function TaskEffortCost({ tasks, completedMinutesByTaskId, progressComparisonsByTaskId, comparisonAsOf, onOpenTask, mode = "detail", showDistribution = false, presentation = "field", label = "预计投入", defaultExpanded, progressPresentationByTaskId }: {
  tasks: readonly TaskEffortDistributionInput[];
  completedMinutesByTaskId?: Readonly<Record<string, number | null>>;
  progressComparisonsByTaskId?: Readonly<Record<string, TaskProgressComparisonSeries | undefined>>;
  comparisonAsOf?: string;
  onOpenTask?: (taskId: string) => void;
  mode?: "detail" | "creation" | "example";
  showDistribution?: boolean;
  presentation?: "field" | "summary";
  label?: string;
  defaultExpanded?: boolean;
  progressPresentationByTaskId?: Readonly<Record<string, ComponentProps<typeof TaskProgressOverview>>>;
}) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const effortLabel = (minutes: number) => formatEffortPersonDays(minutes, locale);
  const [tipOpen, setTipOpen] = useState(false);
  const [distributionExpanded, setDistributionExpanded] = useState(defaultExpanded ?? presentation === "field");
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
    ? ui(model.state === "partial" ? "已估部分约 {0}" : "约 {0}", {0: effortLabel(model.knownMinutes)})
    : model.state === "stale" ? ui("需重新估算") : ui("暂无法估算");
  const manual = mode === "creation" && model.hasManual;
  const isSummary = presentation === "summary";
  const distribution = showDistribution && model.rows.length > 0 && (isSummary || hasEstimate);
  const distributionTitle = isSummary ? ui("子任务进度") : ui("子任务工时分布");
  const distributionSummary = ui("{0}/{1} 项已估{2}", {0: model.estimatedCount, 1: model.totalCount, 2: model.state !== "available" ? ui(" · 占比待估算完整") : ""});
  const estimationBasis = ui("按人天展示，1 人天＝8 人时。结合资料量、完成标准及人／AI 分工估算，历史内容只用于解释具体工作差异，不从完成历时推算人工投入。等待时长不计入，人数也不直接决定工期。");
  const explanation = hasEstimate
    ? ui("{0}{1}{2}预计投入不代表实际耗时。{3}", {0: manual ? ui("当前含已保存的手工估算。") : ui("基于当前已记录的估算。"), 1: estimationBasis, 2: model.totalCount > 1 ? ui("汇总 {0} 项子任务，", {0: model.totalCount}) : "", 3: model.state === "partial" ? ui("部分任务尚未完成有效估算，暂不计算总工时及占比。") : model.totalMinutes === 0 ? ui("总工时为零，不计算占比。") : distribution ? ui("占比为各子任务预计工时占总工时的比例，与完成度无关。") : ""})
    : model.state === "stale" ? ui("任务范围或人／AI 分工已变化，原估算不再适用，需重新估算。")
      : model.state === "invalid" ? ui("估算记录不完整或数据异常，暂无法汇总工时及占比。")
        : ui("尚无适用于当前任务的模型工时估算。{0}缺失值不按零计算。", {0: estimationBasis});

  if (presentation === "summary" && !distribution) return null;

  return <div className="task-effort-cost" data-presentation={presentation} data-state={model.state}>
    {presentation !== "summary" && <span className="task-effort-field-label">{ui(label)}</span>}
    <div className="task-effort-cost-content">
      {presentation !== "summary" && <div className="task-effort-cost-summary">
        <span className="task-effort-cost-value">{value}</span>
        <Tooltip.Root onOpenChange={setTipOpen} open={tipOpen}>
          <Tooltip.Trigger aria-describedby={tipOpen ? tipId : undefined} aria-label={ui("预计人类工时说明")} className="task-effort-info" closeOnClick={false} delay={150} onClick={() => setTipOpen(true)} type="button">
            <Info aria-hidden="true" size={14} />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner className="task-effort-tip-positioner" side="top" sideOffset={6}>
              <Tooltip.Popup className="task-effort-tip" id={tipId} role="tooltip">{explanation}</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
        {manual && <span className="task-effort-source-badge">{ui("含手工估算")}</span>}
      </div>}
      {distribution && <section aria-label={distributionTitle} className="task-effort-distribution">
        <button aria-controls={distributionId} aria-expanded={distributionExpanded} aria-label={`${distributionExpanded ? ui("收起") : ui("展开")}${distributionTitle}`} className="task-effort-distribution-heading" onClick={() => setDistributionExpanded(value => !value)} type="button">
          <span className="task-effort-distribution-title">{distributionTitle}<span>{ui("按工时从高到低")}</span></span>
          <span className="task-effort-distribution-heading-end">{!isSummary && <span title={distributionSummary}>{distributionSummary}</span>}<span className="task-effort-distribution-toggle">{distributionExpanded ? ui("收起") : ui("展开")}<ChevronDown aria-hidden="true" size={14} /></span></span>
        </button>
        <ol hidden={!distributionExpanded} id={distributionId}>{distributionRows.map(row => {
          const completedMinutes = completedMinutesByTaskId && Object.prototype.hasOwnProperty.call(completedMinutesByTaskId, row.id)
            ? completedMinutesByTaskId[row.id] : null;
          const task = tasks.find(task => task.id === row.id || task.clientId === row.id);
          const comparison = progressComparisonsByTaskId?.[row.id];
          const progress = progressPresentationByTaskId?.[row.id]?.model ?? getTaskProgressDisplay({series:comparison,task,scopeMinutes:row.minutes,
            completedMinutes: comparison && task?.status ? undefined : completedMinutes,
            expectedAsOf:comparisonAsOf});
          const canOpen = isSummary && onOpenTask && tasks.some(task => task.id?.trim() === row.id);
          return <li key={row.id}>
            <div className="task-effort-distribution-row">
              {canOpen ? <button className="task-effort-distribution-name" onClick={() => onOpenTask(row.id)} type="button">{row.title}</button>
                : <span className="task-effort-distribution-name">{row.title}</span>}
              {isSummary && task?.status && <TaskStatusBadge size="sm" value={task.status} />}
              {!isSummary && <span aria-label={row.minutes === null ? undefined : ui("预计投入 {0}{1}", {0: effortLabel(row.minutes), 1: row.share === null ? "" : ui("，工时占比 {0}", {0: shareLabel(row.share)})})} className="task-effort-distribution-metrics">
                <span className="task-effort-distribution-amount">{row.minutes === null ? row.state === "stale" ? ui("需重估") : ui("未估算") : effortLabel(row.minutes)}</span>
                {row.share !== null && <> · <span className="task-effort-distribution-share">{shareLabel(row.share)}</span></>}
              </span>}
            </div>
            {!isSummary && row.share !== null && <div aria-label={ui("{0}工时占比", {0: row.title})} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Number((row.share * 100).toFixed(6))} className="task-effort-distribution-track" role="meter"><span style={{ width: `${row.share * 100}%` }} /></div>}
            {isSummary && <TaskProgressOverview model={progress} compact label={ui("{0}完成进度", {0: row.title})} {...progressPresentationByTaskId?.[row.id]} />}
          </li>;
        })}</ol>
      </section>}
    </div>
  </div>;
}
