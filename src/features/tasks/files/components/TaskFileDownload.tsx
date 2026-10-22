import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { Button } from "@/shared/ui/button";
import { canDownload, downloadTaskFile } from "@/features/tasks/files/lib/task-file-download";

export function TaskFileDownload({ file, onError }: { file: TaskFileNode; onError?: (message: string) => void }) {
  const ui = useGlobalUi();
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  useEffect(() => { setError(""); }, [file.id, file.version]);
  const available = canDownload(file);
  return <><Button aria-busy={downloading || undefined} aria-label={ui("下载文件")} className="task-file-download-button task-file-action-button" disabled={!available || downloading} size="sm" title={ui(available ? "下载文件" : "原文件不可用，暂无法下载。")} type="button" variant="ghost" onClick={async () => {
    if (downloading) return;
    setDownloading(true); setError("");
    try {
      const message = ui(await downloadTaskFile(file));
      if (onError) onError(message); else setError(message);
    } finally { setDownloading(false); }
  }}><Download aria-hidden="true" size={16} /><span>{ui("下载")}</span></Button>{error && <span className="task-file-save-error" role="alert">{error}</span>}</>;
}
