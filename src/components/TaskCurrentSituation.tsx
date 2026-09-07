import React, { useId, type ReactNode } from "react";
import type { TaskSituationModel, TaskSituationReference } from "../lib/taskSituation";

type TaskCurrentSituationProps = {
  hasBurnUp?: boolean;
  model: TaskSituationModel;
  onOpenReference?: (reference: TaskSituationReference) => void;
  trend?: ReactNode;
  trendLabel?: string;
};

function dateLabel(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${Number(value.slice(5, 7))}/${Number(value.slice(8, 10))}`;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Shanghai",
  }).format(date);
}

export function TaskCurrentSituation({ hasBurnUp = false, model, trend, trendLabel = "子任务工作量趋势" }: TaskCurrentSituationProps) {
  const titleId = useId();
  const nextTitleId = `${titleId}-next`;
  // Legacy example payloads must not become apparently real by hiding their badge.
  const isRecorded = model.source === "recorded";
  // The model keeps separate projections for other surfaces. In detail, delivery
  // and attention facts are folded into one current-situation section so the user
  // does not have to decode extra group names.
  const currentItems = isRecorded
    ? model.groups.filter(group => group.id === "delivery" || group.id === "attention").flatMap(group => group.items)
    : [];
  const currentDescription = isRecorded
    ? [model.summary, ...currentItems.map(item => item.text)].filter(Boolean).join(" ")
    : "暂无可用的进展记录。";
  const nextItems = isRecorded ? model.groups.find(group => group.id === "next")?.items ?? [] : [];
  const visibleTrend = isRecorded ? trend : undefined;

  return <section aria-labelledby={titleId} className="task-situation" data-freshness={isRecorded ? model.freshness : "missing"} data-has-burn-up={Boolean(visibleTrend && hasBurnUp)} data-has-trend={Boolean(visibleTrend)}>
    <div className="task-situation-layout">
      <div className="task-situation-content">
        <div className="task-situation-column task-situation-current" data-column="current">
          <div className="task-situation-heading">
            <h2 id={titleId}>当前情况</h2>
            <div className="task-situation-meta">
              {isRecorded && model.asOf && <time dateTime={model.asOf}>{model.asOfSource === "discussion" ? "最近讨论" : "截至"} {dateLabel(model.asOf)}</time>}
              {isRecorded && model.freshness === "stale" && <span className="task-situation-stale">摘要待核对</span>}
            </div>
          </div>
          <p className="task-situation-summary">{currentDescription}</p>
          {isRecorded && model.freshness === "stale" && model.notice && <p className="task-situation-notice">{model.notice}</p>}
        </div>
        {nextItems.length > 0 && <div className="task-situation-column task-situation-next" data-column="next">
          <div className="task-situation-heading"><h2 id={nextTitleId}>下一步建议</h2></div>
          <ol aria-labelledby={nextTitleId} className="task-situation-list">
            {nextItems.map((item, index) => <li className="task-situation-item" key={`next-${index}`}>
              <span>{item.text}</span>
            </li>)}
          </ol>
        </div>}
      </div>
      {visibleTrend && <aside aria-label={trendLabel} className="task-situation-trend">{visibleTrend}</aside>}
    </div>
  </section>;
}
