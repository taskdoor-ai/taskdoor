import { useRemainingCopy } from "../i18n/remainingMessages";
import { useDetailCopy } from "../i18n/detailMessages";
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
  const u = useRemainingCopy();
  const d = useDetailCopy();
  return <Popover>
    <PopoverTrigger aria-label={d('editAppearance')} className="task-appearance-trigger" type="button">
      <TaskIcon iconName={iconName} size="lg" tone={tone} />
    </PopoverTrigger>
    <PopoverContent align="start" aria-label={u('chooseAppearance')} className="task-appearance-popover" collisionPadding={16}>
      <header><strong>{u('taskAppearance')}</strong><small>{u('autoSave')}</small></header>
      <AppearancePicker
        color={tone} icon={iconName} iconColumns={4} colorColumns={4}
        iconOptions={taskIconOptions}
        colorOptions={taskIconToneOptions.map(option => ({ ...option, color: option.value === "neutral" ? "gray" : option.value }))}
        onIconChange={nextIcon => onChange({ iconName: nextIcon, iconTone: tone })}
        onColorChange={nextTone => onChange({ iconName, iconTone: nextTone })}
        preview={<TaskIcon iconName={iconName} size="lg" tone={tone} />} previewNote={u('appearanceNote')}
      />
    </PopoverContent>
  </Popover>;
}
