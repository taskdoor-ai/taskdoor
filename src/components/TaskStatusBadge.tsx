import {
  Check,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock5,
  ScanSearch,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type TaskStatus = "待开始" | "进行中" | "待审核" | "已阻塞" | "已完成" | "已取消";

type StatusDefinition = {
  description: string;
  icon: LucideIcon;
  tone: "neutral" | "progress" | "review" | "warning" | "success" | "failed";
};

export const taskStatusOptions: TaskStatus[] = ["待开始", "进行中", "待审核", "已阻塞", "已完成", "已取消"];

export const taskStatusDefinition: Record<TaskStatus, StatusDefinition> = {
  "待开始": { description: "任务已建立，尚未开始推进", icon: Clock5, tone: "neutral" },
  "进行中": { description: "协作者正在推进任务", icon: CircleDashed, tone: "progress" },
  "待审核": { description: "成果已提交，等待确认", icon: ScanSearch, tone: "review" },
  "已阻塞": { description: "存在阻塞，需要先处理", icon: TriangleAlert, tone: "warning" },
  "已完成": { description: "任务目标已达成，结果已确认", icon: CircleCheck, tone: "success" },
  "已取消": { description: "任务已停止推进", icon: CircleX, tone: "failed" },
};

type TaskStatusBadgeProps = {
  editable?: boolean;
  onChange?: (status: TaskStatus) => void;
  size?: "sm" | "md";
  value: TaskStatus;
};

// Adapted from Arihant Jain's Status Badge on 21st.dev.
export function TaskStatusBadge({ editable = false, onChange, size = "md", value }: TaskStatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const definition = taskStatusDefinition[value];
  const Icon = definition.icon;
  const badgeContent = <>
    <Icon aria-hidden="true" strokeWidth={2.6} />
    <span>{value}</span>
    {editable && <ChevronDown aria-hidden="true" className="task-status-chevron" strokeWidth={2} />}
  </>;

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`task-status-control ${open ? "open" : ""}`} ref={rootRef}>
      {editable ? <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`task-status-badge ${definition.tone} ${size} editable`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >{badgeContent}</button> : <span className={`task-status-badge ${definition.tone} ${size}`}>{badgeContent}</span>}

      {editable && open && (
        <div aria-label="修改任务状态" className="task-status-menu" role="listbox">
          <div className="task-status-menu-heading"><strong>任务状态</strong><small>选择后立即同步</small></div>
          {taskStatusOptions.map((status) => {
            const option = taskStatusDefinition[status];
            const OptionIcon = option.icon;
            const selected = status === value;
            return (
              <button
                aria-selected={selected}
                className={selected ? "selected" : ""}
                key={status}
                onClick={() => {
                  onChange?.(status);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className={`task-status-option-icon ${option.tone}`}><OptionIcon strokeWidth={2.5} /></span>
                <span><strong>{status}</strong><small>{option.description}</small></span>
                {selected && <Check aria-hidden="true" className="task-status-option-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
