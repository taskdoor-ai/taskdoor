import { AgentActivityIndicator } from "./ui/ai-agent-response";
import { Button } from "./ui/button";

/** One transient feedback surface for initial planning and contextual AI edits. */
export function TaskAiWorking({ label, detail, onCancel, cancelLabel = "停止 AI 处理" }: {
  label: string;
  detail?: string;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  return <div className="task-ai-working">
    <div aria-atomic="true" className="task-ai-working-status" role="status">
      <AgentActivityIndicator />
      <div>
        <strong>{label}<span aria-hidden="true">…</span></strong>
        {detail && <p>{detail}</p>}
      </div>
    </div>
    {onCancel && <Button aria-label={cancelLabel} autoFocus onClick={onCancel} size="sm" type="button" variant="ghost">停止</Button>}
  </div>;
}
