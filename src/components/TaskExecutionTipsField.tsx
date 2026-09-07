import { TaskCreationEditableText } from "./TaskCreationEditableText";

type Props = {
  values: string[];
  onChange: (values: string[]) => void;
  label?: string;
  disabled?: boolean;
};

export function TaskExecutionTipsField({ values, onChange, label = "执行建议", disabled = false }: Props) {
  return <label className="task-execution-tips-field">
    <span className="task-detail-field-label">执行建议</span>
    <TaskCreationEditableText
      className="task-execution-tips-input"
      disabled={disabled}
      label={label}
      onChange={text => { if (!disabled) onChange(text === "" ? [] : text.split("\n")); }}
      placeholder="补充执行方法或注意事项（选填）"
      value={values.join("\n")}
    />
  </label>;
}
