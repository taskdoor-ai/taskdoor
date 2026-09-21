import { useProgressCopy } from "../i18n/progressCopy";
import { useDetailCopy } from "../i18n/detailMessages";
import { Tooltip } from "@base-ui/react/tooltip";
import React, { type ReactNode } from "react";
import type { TaskProgressDisplay } from "../lib/taskProgressDisplay";

const stageNames = ["少量完成", "部分完成", "大部分完成", "接近完成"] as const;

/** A coarse view of the existing evidence; it never writes a task status or chart value. */
export function TaskProgressStage({ model, compact = false, label = "完成进度", action, unavailableLabel = "未形成结果" }: {
  model: Pick<TaskProgressDisplay, "ratio" | "sourceLabel">;
  compact?: boolean;
  label?: string;
  action?: ReactNode;
  unavailableLabel?: string;
}) {
  const p = useProgressCopy();
  const d = useDetailCopy();
  const { ratio, sourceLabel } = model;
  const available = ratio !== null && Number.isFinite(ratio) && ratio >= 0 && ratio <= 1;
  const confirmed = available && sourceLabel === "用户确认";
  // Zero is evidenced but has no filled segment; never infer confirmation from 100%.
  const stage = !available ? null : ratio === 0 ? 0 : ratio < .25 ? 1 : ratio < .5 ? 2 : ratio < .9 ? 3 : 4;
  const name = confirmed ? p("已完成") : stage === null ? unavailableLabel : stage === 0 ? d('noResult') : stageNames[stage - 1];
  const source = sourceLabel === "子任务汇总" ? "AI 预测" : sourceLabel;
  return <div className="task-progress-stage-row">
    <div className="task-progress-stage" data-size={compact ? "compact" : "regular"}
      data-progress-source={sourceLabel} data-progress-state={available ? "available" : "unknown"}
      role="group" aria-label={`${p(label)}: ${p(name)}${available ? `; ${p(source)}` : p("；尚无可用进度依据")}`}>
      {!compact && <span aria-hidden="true" className="task-progress-stage-heading">{p("进度")}</span>}
      <span className="task-progress-stage-track">
        {stageNames.map((stageName, index) => {
          const step = index + 1;
          const tooltip = p(stageName);
          return <Tooltip.Root key={stageName}>
            <Tooltip.Trigger aria-label={tooltip} className="task-progress-stage-step" closeOnClick={false}
              data-filled={step <= (stage ?? 0)} delay={150} type="button" />
            <Tooltip.Portal>
              <Tooltip.Positioner className="task-progress-stage-tip-positioner" collisionPadding={12} side="top" sideOffset={8}>
                <Tooltip.Popup className="task-progress-stage-tip" role="tooltip">{tooltip}</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>;
        })}</span>
      <span aria-hidden="true" className="task-progress-stage-label">{p(name)}</span>
      {available && <span aria-hidden="true" className={`task-progress-stage-source${source === "AI 预测" ? " task-ai-prediction-label" : ""}`}>{p(source)}</span>}
    </div>
    {action}
  </div>;
}
