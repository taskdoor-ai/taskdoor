import { useDetailCopy } from "../i18n/detailMessages";
import { TaskCreationEditableText } from "./TaskCreationEditableText";

type Props = {
  values: string[];
  onChange: (values: string[]) => void;
  label?: string;
  disabled?: boolean;
};

export function TaskExecutionTipsField({ values, onChange, label, disabled = false }: Props) {
  const d = useDetailCopy();
  return <label className="task-execution-tips-field">
    <span className="task-detail-field-label">{d('executionTips')}</span>
    <TaskCreationEditableText
      className="task-execution-tips-input"
      disabled={disabled}
      label={label ?? d('executionTips')}
      onChange={text => { if (!disabled) onChange(text === "" ? [] : text.split("\n")); }}
      placeholder={d('noExecutionTips')}
      value={values.join("\n")}
    />
  </label>;
}
