type TaskDetailTabLabelProps = {
  label: string;
  count: number | null;
};

export function describeTaskDetailTab(label: string, count: number | null, locale: string) {
  return [label, count === null ? null : String(count)]
    .filter(part => part !== null).join(locale.startsWith("en") ? ", " : "，");
}

export function TaskDetailTabLabel({ label, count }: TaskDetailTabLabelProps) {
  return <span className="task-detail-tab-label">
    <span>{label}</span>
    {count !== null && <span aria-hidden="true" className="task-detail-tab-count">{count > 99 ? "99+" : count}</span>}
  </span>;
}
