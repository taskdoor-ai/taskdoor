import { Check, Plus, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { TaskCreationEditableText } from "./TaskCreationEditableText";

type Props = {
  values: string[];
  onChange: (values: string[]) => void;
  onCommit?: () => void;
  label: string;
  disabled?: boolean;
  idPrefix?: string;
  className?: string;
};

export function TaskCriteriaFields({ values, onChange, onCommit, label, disabled = false, idPrefix, className = "" }: Props) {
  const generatedId = useId();
  const prefix = idPrefix ?? generatedId;
  const root = useRef<HTMLDivElement>(null);
  const focusFrame = useRef(0);
  const displayedValues = values.length ? values : [""];

  useEffect(() => () => { cancelAnimationFrame(focusFrame.current); }, []);

  const focusRow = (index: number) => {
    cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      root.current?.querySelectorAll("textarea")[index]?.focus();
    });
  };

  return <div aria-label={label} className={`task-criteria-fields ${className}`.trim()} onBlur={event => {
    if (!onCommit || (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node))) return;
    onCommit();
  }} ref={root} role="group">
    {displayedValues.map((value, index) => <div className="task-criteria-field-row" key={index}>
      <span aria-hidden="true" className="task-criteria-field-mark"><Check size={13} /></span>
      <TaskCreationEditableText
        className="task-criteria-field-input"
        disabled={disabled}
        id={`${prefix}-${index}`}
        label={`${label} ${index + 1}`}
        onChange={nextValue => {
          if (disabled) return;
          onChange(displayedValues.map((current, currentIndex) => currentIndex === index ? nextValue : current));
        }}
        placeholder="达到什么条件，才算完成？"
        value={value}
      />
      {displayedValues.length > 1 && <button aria-label={`删除${label} ${index + 1}`} className="task-criteria-field-remove" disabled={disabled} onClick={() => {
        if (disabled) return;
        const next = displayedValues.filter((_, currentIndex) => currentIndex !== index);
        onChange(next);
        focusRow(Math.min(index, next.length - 1));
      }} type="button"><X aria-hidden="true" size={13} /></button>}
    </div>)}
    <button aria-label={`添加${label}`} className="task-criteria-field-add" disabled={disabled} onClick={() => {
      if (disabled) return;
      onChange([...displayedValues, ""]);
      focusRow(displayedValues.length);
    }} type="button"><Plus aria-hidden="true" size={13} />添加完成标准</button>
  </div>;
}
