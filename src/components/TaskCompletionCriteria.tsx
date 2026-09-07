import React from "react";
import { TaskCriteriaEditor } from "./TaskCriteriaEditor";

type TaskCompletionCriteriaProps = {
  criteria?: string[];
  source?: "recorded" | "example";
  label?: string;
  onSave?: (values: string[], expected: string[]) => void | Promise<void>;
};

export function TaskCompletionCriteria({ criteria = [], source = "recorded", label = "当前任务", onSave }: TaskCompletionCriteriaProps) {
  const items = criteria.map((item) => item.trim()).filter(Boolean);

  return <section aria-label="完成标准" className="task-detail-completion" data-source={source}>
    <div className="task-detail-field-label">完成标准</div>
    <div className="task-detail-completion-content">
      {onSave ? <TaskCriteriaEditor criteria={criteria} label={label} onSave={onSave} variant="heading" /> : items.length ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="task-heading-empty">尚未设置完成标准</p>}
    </div>
  </section>;
}
