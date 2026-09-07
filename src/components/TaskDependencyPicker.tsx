import { Check, GitBranch, Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export type TaskDependencyOption = {
  disabled?: boolean;
  disabledReason?: string;
  index: number;
  title: string;
};

type TaskDependencyPickerProps = {
  onChange: (indexes: number[]) => void;
  options: TaskDependencyOption[];
  selected: number[];
};

export function TaskDependencyPicker({ onChange, options, selected }: TaskDependencyPickerProps) {
  const selectedIndexes = new Set(selected);
  const selectedOptions = selected
    .map((index) => options.find((option) => option.index === index))
    .filter((option): option is TaskDependencyOption => Boolean(option));

  const toggleDependency = (option: TaskDependencyOption) => {
    if (option.disabled) return;
    const next = selectedIndexes.has(option.index)
      ? selected.filter((index) => index !== option.index)
      : [...selected, option.index];
    onChange(next.sort((left, right) => left - right));
  };

  return <div className="task-dependency-picker">
    <div aria-label="已选前置依赖" className="task-dependency-selected" data-empty={!selectedOptions.length || undefined} role="list">
      {!selectedOptions.length && <span className="task-dependency-empty"><GitBranch aria-hidden="true" />无前置依赖</span>}
      {selectedOptions.length > 0 && <GitBranch aria-hidden="true" className="task-dependency-selected-icon" />}
      {selectedOptions.map((option) => <span className="task-dependency-chip" key={option.index} role="listitem">
        <span>{option.title}</span>
        <button aria-label={`移除前置依赖：${option.title}`} onClick={() => onChange(selected.filter((index) => index !== option.index))} type="button"><X aria-hidden="true" /></button>
      </span>)}
      <Popover>
        <PopoverTrigger aria-label="添加前置依赖" className="task-dependency-add" type="button"><Plus aria-hidden="true" /><span>添加依赖</span></PopoverTrigger>
        <PopoverContent aria-label="选择前置依赖" className="task-dependency-popover">
          <header><div><strong>选择前置依赖</strong><p>仅作协作参考，可随时调整，不限制任务开始或完成。</p></div>{selected.length > 0 && <button className="task-dependency-clear" onClick={() => onChange([])} type="button">清除全部</button>}</header>
          <div aria-label="可选前置依赖" className="task-dependency-options" role="group">
            {options.map((option) => {
              const checked = selectedIndexes.has(option.index);
              return <button aria-disabled={option.disabled || undefined} aria-pressed={checked} className="task-dependency-option" data-disabled={option.disabled || undefined} key={option.index} onClick={() => toggleDependency(option)} type="button">
                <span aria-hidden="true" className="task-dependency-option-check">{checked && <Check />}</span>
                <span><strong>{option.title}</strong>{option.disabled && <small>{option.disabledReason ?? "会形成循环依赖"}</small>}</span>
              </button>;
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  </div>;
}
