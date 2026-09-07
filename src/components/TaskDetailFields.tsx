import { useId, type ReactNode } from "react";
import { TaskCreationEditableText as EditableText } from "./TaskCreationEditableText";
import { TaskCriteriaFields } from "./TaskCriteriaFields";
import { TaskExecutionTipsField } from "./TaskExecutionTipsField";

type TaskFieldValues = {
  title: string;
  completionCriteria: string[];
  executionTips: string[];
};

type Props = {
  value: TaskFieldValues;
  labels: { name: string; criteria: string };
  onChange: (patch: Partial<TaskFieldValues>) => void;
  variant?: "heading" | "embedded";
  disabled?: boolean;
  showExecutionTips?: boolean;
  icon?: ReactNode;
  titleAction?: ReactNode;
  description?: { label: string; inputLabel: string; value: string; onChange?: (value: string) => void };
  properties?: ReactNode;
  attributes?: ReactNode;
  dependencies?: ReactNode;
  effort?: ReactNode;
};

/** Shared task fields; the caller owns draft/commit behaviour and task relationships. */
export function TaskDetailFields({ value, labels, onChange, variant = "embedded", disabled = false, showExecutionTips = false, icon, titleAction, description, properties, attributes, dependencies, effort }: Props) {
  const id = useId();
  const update = (patch: Partial<TaskFieldValues>) => { if (!disabled) onChange(patch); };
  const nameInput = <EditableText className={variant === "heading" ? "task-detail-title-input" : "task-detail-inline-name"} disabled={disabled} id={`${id}-name`} label={labels.name} onChange={title => update({ title })} placeholder="任务名称" value={value.title} />;

  return <div className={`task-detail-fields task-detail-fields-${variant}`}>
    {variant === "heading" ? <div className="task-detail-title-row">{icon}<h1>{nameInput}</h1></div> :
      <div className="task-detail-field-row task-detail-name-field">
        <label className="task-detail-field-label" htmlFor={`${id}-name`}>名称</label>
        <div className="task-detail-name-control">{nameInput}{titleAction}</div>
      </div>}
    <div className={variant === "heading" ? "task-detail-description" : "task-detail-fields-body"}>
      {description && <div className="task-detail-goal-field">
        <span className="task-detail-field-label">{description.label}</span>
        {description.onChange ? <EditableText className="task-detail-goal-input" disabled={disabled} label={description.inputLabel} onChange={next => { if (!disabled) description.onChange?.(next); }} placeholder="这件事希望带来什么结果？" value={description.value} /> : <p className="creation-inherited-goal">{description.value}</p>}
      </div>}
      <section aria-label="完成标准" className="task-detail-completion creation-completion">
        <span className="task-detail-field-label">完成标准</span>
        <TaskCriteriaFields disabled={disabled} idPrefix={`${id}-criterion`} label={labels.criteria} onChange={completionCriteria => update({ completionCriteria })} values={value.completionCriteria} />
      </section>
      {showExecutionTips && <TaskExecutionTipsField disabled={disabled} onChange={executionTips => update({ executionTips })} values={value.executionTips} />}
      {dependencies}
      {effort}
      {properties}
      {attributes && <div className="task-detail-extra-fields">{attributes}</div>}
    </div>
  </div>;
}
