import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { TaskIcon, taskIconOptions, taskIconToneOptions } from "./TaskIcon";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

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
    <PopoverContent align="start" aria-label="选择任务图标与背景" className="task-appearance-popover">
      <header><strong>任务外观</strong><small>选择后自动保存</small></header>
      <fieldset className="task-appearance-fieldset">
        <legend>图标</legend>
        <div className="task-appearance-icon-grid">
          {taskIconOptions.map((option) => {
            const Icon = option.icon;
            return <label key={option.value} title={option.label}><input aria-label={option.label} checked={iconName === option.value} className="task-appearance-radio" name="task-icon-choice" onChange={() => onChange({ iconName: option.value, iconTone: tone })} type="radio" value={option.value} /><Icon aria-hidden="true" /></label>;
          })}
        </div>
      </fieldset>
      <fieldset className="task-appearance-fieldset">
        <legend>背景</legend>
        <div className="task-appearance-tone-grid">
          {taskIconToneOptions.map((option) => <label data-tone={option.value} key={option.value} title={option.label}><input aria-label={option.label} checked={tone === option.value} className="task-appearance-radio" name="task-tone-choice" onChange={() => onChange({ iconName, iconTone: option.value })} type="radio" value={option.value} /><span aria-hidden="true" /></label>)}
        </div>
      </fieldset>
    </PopoverContent>
  </Popover>;
}
