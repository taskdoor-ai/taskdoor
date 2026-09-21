import { useProgressCopy } from "../i18n/progressCopy";
import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "./ui/toast";

export function TaskProgressRefresh({ onRepredict, scope = "progress" }: { onRepredict: () => Promise<void>; scope?: "progress" | "task" }) {
  const p = useProgressCopy();
  const action = scope === "task" ? p("分析") : p("预测");
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try { await onRepredict(); toast.success(p(`已重新${action}`), { description: scope === "task" ? p("已按当前记录核对当前情况、下一步建议和进度；依据未变化时，分析结果可能保持不变。") : p("已按当前评估与确认记录重新核对；依据未变化时，预测结果可能保持不变。") }); }
    catch (caught) { const message = caught instanceof Error ? caught.message : p(`${action}未完成，请重试。`); setError(message); toast.error(message); }
    finally { pending.current = false; setBusy(false); }
  };
  return <button type="button" className="task-progress-refresh" disabled={busy} aria-busy={busy}
    title={error || (scope === "task" ? p("重新分析当前情况、下一步建议和进度") : p("根据当前评估与子任务状态重新预测"))} onClick={() => void refresh()}>
    <RefreshCw size={13} aria-hidden="true"/>{busy ? p(`${action}中…`) : error ? p(`重试${action}`) : p(`重新${action}`)}
  </button>;
}
