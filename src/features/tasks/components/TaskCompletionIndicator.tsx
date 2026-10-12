import { useEffect, useRef, useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Check, Undo2 } from "lucide-react";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useProgressCopy } from "@/features/tasks/i18n/progress-copy";
import { taskProgressPercent } from "@/features/tasks/lib/task-progress-percent";
import { TaskProgressIcon } from "@/shared/ui/TaskProgressIcon";
import { taskStatusDefinition, type TaskStatus } from "@/shared/ui/TaskStatusBadge";
import { toast } from "@/shared/ui/toast";

type Props = { completed: boolean; status?: TaskStatus; progressRatio: number | null; evidence?: string; onToggle?: () => boolean };
const stages = ["未形成结果", "少量完成", "部分完成", "基本完成", "接近完成"];

/** AI fills the four segments; only human confirmation changes the task status. */
export function TaskCompletionIndicator({ completed, status, progressRatio, evidence, onToggle }: Props) {
  const ui = useGlobalUi();
  const p = useProgressCopy();
  const [celebrating, setCelebrating] = useState(false);
  const wasCompleted = useRef(completed);
  useEffect(() => {
    const justCompleted = !wasCompleted.current && completed;
    wasCompleted.current = completed;
    if (!justCompleted) return;
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), 420);
    return () => clearTimeout(timer);
  }, [completed]);
  const percent = taskProgressPercent(progressRatio === null ? null : progressRatio * 100);
  const stage = (percent ?? 0) / 25;
  const action = ui(completed ? "撤销任务完成" : "标记整个任务完成");
  const assessment = percent === null ? ui("AI 暂无评估") : ui("AI 分析：{stage}", { stage: p(stages[stage]) });
  const toggle = () => {
    if (onToggle?.()) toast.success(ui(completed ? "已撤销确认" : "已人工确认"));
  };
  return <Tooltip.Root><span className="criterion-orbit-wrap task-completion-wrap" data-tone={taskStatusDefinition[completed ? "已完成" : status ?? "进行中"].tone}>
    <Tooltip.Trigger delay={180} type="button" role="checkbox" aria-checked={completed} aria-label={`${action}；${assessment}`} aria-disabled={!onToggle} className="criterion-orbit task-completion-orbit" data-confirmed={completed} data-celebrating={celebrating} onClick={toggle}>
      <TaskProgressIcon ratio={progressRatio} completed={completed} cancelled={status === "已取消"} />
      {onToggle && <span className="criterion-orbit-hover" aria-hidden="true">{completed ? <Undo2 size={13} /> : <Check size={13} strokeWidth={2.4} />}</span>}
    </Tooltip.Trigger>
    <Tooltip.Portal><Tooltip.Positioner side="top" align="start" sideOffset={8} collisionPadding={12} className="task-completion-tip-positioner"><Tooltip.Popup className="task-completion-tip"><strong>{assessment}</strong>{percent !== null && evidence?.trim() && <span>{ui("评估依据：{evidence}", { evidence: p(evidence.trim()) })}</span>}<span>{ui(completed ? onToggle ? "已人工确认 · 点击撤销" : "已人工确认" : onToggle ? "点击标记整个任务完成，保留标准确认记录" : "只读")}</span></Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal>
  </span></Tooltip.Root>;
}
