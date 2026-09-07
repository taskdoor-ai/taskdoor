import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { TaskIcon, taskIconOptions, taskIconToneOptions } from "./TaskIcon";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { AppearancePicker } from "./AppearancePicker";

type TaskAppearancePickerProps = {
  iconName?: TaskIconName;
  onChange: (appearance: { iconName: TaskIconName; iconTone: TaskIconTone }) => void;
  tone?: TaskIconTone;
};

export function TaskAppearancePicker({ iconName = "list-todo", onChange, tone = "neutral" }: TaskAppearancePickerProps) {
  return <Popover>
    <PopoverTrigger aria-label="编辑任务图标与背景" className="task-appearance-trigger" type="button">
      <TaskIcon iconName={iconName} size="lg" tone={tone} />
    </PopoverTrigger>
    <PopoverContent align="start" aria-label="选择任务图标与背景" className="task-appearance-popover" collisionPadding={16}>
      <header><strong>任务外观</strong><small>选择后自动保存</small></header>
      <AppearancePicker
        color={tone} icon={iconName} iconColumns={4} colorColumns={4}
        iconOptions={taskIconOptions}
        colorOptions={taskIconToneOptions.map(option => ({ ...option, color: option.value === "neutral" ? "gray" : option.value }))}
        onIconChange={nextIcon => onChange({ iconName: nextIcon, iconTone: tone })}
        onColorChange={nextTone => onChange({ iconName, iconTone: nextTone })}
        preview={<TaskIcon iconName={iconName} size="lg" tone={tone} />} previewNote="任务详情与列表中保持一致"
      />
    </PopoverContent>
  </Popover>;
}
