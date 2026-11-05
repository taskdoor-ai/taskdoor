type TaskDetailTabLabelProps = {
  label: string;
  count: number | null;
};

export function describeTaskDetailTab(label: string, count: number | null, locale: string) {
  return [label, count === null || count === 0 ? null : String(count)]
    .filter(part => part !== null).join(locale.startsWith("en") ? ", " : "，");
}

export function TaskDetailTabLabel({ label, count }: TaskDetailTabLabelProps) {
  return <span className="task-detail-tab-label">
    <span>{label}</span>
    {count !== null && count > 0 && <span aria-hidden="true" className="task-detail-tab-count">{count > 99 ? "99+" : count}</span>}
  </span>;
}
