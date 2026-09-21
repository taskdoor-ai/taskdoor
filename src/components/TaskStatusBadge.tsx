import { useI18n } from "../i18n/I18nProvider";
import { statusMessageKey } from "../i18n/taskStatus";
import {
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock5,
  ScanSearch,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export type TaskStatus = "待开始" | "进行中" | "待审核" | "已阻塞" | "已完成" | "已取消";

type StatusDefinition = {
  description: string;
  icon: LucideIcon;
  tone: "neutral" | "progress" | "review" | "warning" | "success" | "failed";
};

// Legacy 待审核 remains readable; new choices use the five product states.
export const taskStatusOptions: TaskStatus[] = ["待开始", "进行中", "已阻塞", "已完成", "已取消"];

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

export function TaskStatusBadge({ editable = false, onChange, size = "md", value }: TaskStatusBadgeProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const definition = taskStatusDefinition[value];
  const Icon = definition.icon;
  const badgeContent = <>
    <Icon aria-hidden="true" strokeWidth={2.6} />
    <span>{t(statusMessageKey[value])}</span>
    {editable && <ChevronDown aria-hidden="true" className="task-status-chevron" strokeWidth={2} />}
  </>;

  return (
    <div className={`task-status-control ${open ? "open" : ""}`}>
      {editable ? <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger className={`task-status-badge ${definition.tone} ${size} editable`}>
          {badgeContent}
        </DropdownMenuTrigger>
        <DropdownMenuContent aria-label={t("status.change")} className="task-status-menu" align="start" sideOffset={6}>
          <DropdownMenuRadioGroup value={value} onValueChange={(status) => {
            if (!taskStatusOptions.includes(status as TaskStatus)) return;
            onChange?.(status as TaskStatus);
            setOpen(false);
          }}>
            {taskStatusOptions.map((status) => {
              const option = taskStatusDefinition[status];
              const OptionIcon = option.icon;
              return <DropdownMenuRadioItem key={status} value={status}>
                <OptionIcon aria-hidden="true" className={`task-status-menu-icon ${option.tone}`} strokeWidth={2.3} />
                <span>{t(statusMessageKey[status])}</span>
              </DropdownMenuRadioItem>;
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu> : <span className={`task-status-badge ${definition.tone} ${size}`}>{badgeContent}</span>}
    </div>
  );
}
