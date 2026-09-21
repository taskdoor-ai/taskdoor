import { useProgressCopy } from "../i18n/progressCopy";
import React, { useId, type ReactNode } from "react";
import type { TaskSituationModel, TaskSituationReference } from "../lib/taskSituation";

type TaskCurrentSituationProps = {
  hasBurnUp?: boolean;
  model: TaskSituationModel;
  onOpenReference?: (reference: TaskSituationReference) => void;
  trend?: ReactNode;
  trendLabel?: string;
};

export function TaskCurrentSituation({ hasBurnUp = false, model, trend, trendLabel = "子任务工作量趋势" }: TaskCurrentSituationProps) {
  const p = useProgressCopy();
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
    ? [p(model.summary), ...currentItems.map(item => p(item.text))].filter(Boolean).join(" ")
    : p("暂无可用的进展记录。");
  const nextItems = isRecorded ? model.groups.find(group => group.id === "next")?.items ?? [] : [];
  const visibleTrend = isRecorded ? trend : undefined;

  return <section aria-labelledby={titleId} className="task-situation" data-freshness={isRecorded ? model.freshness : "missing"} data-has-burn-up={Boolean(visibleTrend && hasBurnUp)} data-has-trend={Boolean(visibleTrend)}>
    <div className="task-situation-layout">
      <div className="task-situation-content">
        <div className="task-situation-column task-situation-current" data-column="current">
          <div className="task-situation-heading">
            <h2 id={titleId}>{p("当前情况")}</h2>
            <div className="task-situation-meta">
              {isRecorded && model.freshness === "stale" && <span className="task-situation-stale">{p("摘要待核对")}</span>}
            </div>
          </div>
          <p className="task-situation-summary">{currentDescription}</p>
          {isRecorded && model.freshness === "stale" && model.notice && <p className="task-situation-notice">{p(model.notice)}</p>}
        </div>
        {nextItems.length > 0 && <div className="task-situation-column task-situation-next" data-column="next">
          <div className="task-situation-heading"><h2 id={nextTitleId}>{p("下一步建议")}</h2></div>
          <ol aria-labelledby={nextTitleId} className="task-situation-list">
            {nextItems.map((item, index) => <li className="task-situation-item" key={`next-${index}`}>
              <span>{p(item.text)}</span>
            </li>)}
          </ol>
        </div>}
      </div>
      {visibleTrend && <aside aria-label={p(trendLabel)} className="task-situation-trend">{visibleTrend}</aside>}
    </div>
  </section>;
}
