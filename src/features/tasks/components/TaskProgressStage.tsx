import { useProgressCopy } from "@/features/tasks/i18n/progress-copy";
import { taskProgressPercent } from "@/features/tasks/lib/task-progress-percent";
import { Tooltip } from "@base-ui/react/tooltip";
import React, { type ReactNode } from "react";
import type { TaskProgressDisplay } from "@/features/tasks/lib/task-progress-display";

const steps = [1, 2, 3, 4] as const;

/** A coarse view of the existing evidence; it never writes a task status or chart value. */
export function TaskProgressStage({ model, compact = false, label = "完成进度", action, unavailableLabel = "未形成结果" }: {
  model: Pick<TaskProgressDisplay, "ratio" | "sourceLabel">;
  compact?: boolean;
  label?: string;
  action?: ReactNode;
  unavailableLabel?: string;
}) {
  const p = useProgressCopy();
  const { ratio, sourceLabel } = model;
  const available = ratio !== null && Number.isFinite(ratio) && ratio >= 0 && ratio <= 1;
  // Zero is evidenced but has no filled segment; never infer confirmation from 100%.
  const percent = taskProgressPercent(available ? ratio * 100 : null);
  const stage = percent === null ? null : percent / 25;
  const name = percent === null ? unavailableLabel : `${percent}%`;
  const source = sourceLabel === "子任务汇总" ? "AI 预测" : sourceLabel;
  return <div className="task-progress-stage-row">
    <div className="task-progress-stage" data-size={compact ? "compact" : "regular"}
      data-progress-source={sourceLabel} data-progress-state={available ? "available" : "unknown"}
      role="group" aria-label={`${p(label)}: ${p(name)}${available ? `; ${p(source)}` : p("；尚无可用进度依据")}`}>
      {!compact && <span aria-hidden="true" className="task-progress-stage-heading">{p("进度")}</span>}
      <span className="task-progress-stage-track">
        {steps.map(step => {
          const tooltip = `${step * 25}%`;
          return <Tooltip.Root key={step}>
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
