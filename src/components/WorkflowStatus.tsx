type WorkflowStatusProps = {
  detail: string;
  state: "pending" | "active" | "complete";
  label: string;
};

// Adapted from 21st.dev Status Badge #521 by serafimcloud.
// Keeps the paired status + context labels so a state always explains its next action.
export function WorkflowStatus({ detail, label, state }: WorkflowStatusProps) {
  return (
    <span className={`workflow-status ${state}`}>
      <span><i />{label}</span>
      <b />
      <small>{detail}</small>
    </span>
  );
}
