import { useEffect, useState, type ComponentProps } from "react";
import { FileWarning, RotateCw } from "lucide-react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { TaskPdfViewer } from "@/features/tasks/files/components/TaskPdfViewer";
import { TaskFileDownload } from "@/features/tasks/files/components/TaskFileViewer";

type Props = ComponentProps<typeof TaskPdfViewer>;

/** A derived static preview keeps the PowerPoint source and its version intact. */
export function TaskPresentationViewer({ url, ...props }: Props) {
  const { locale } = useI18n();
  const english = locale === "en";
  const [preview, setPreview] = useState("");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let previewUrl = "";
    setPreview("");
    setError(false);
    void (async () => {
      const source = await fetch(url, { signal: controller.signal });
      if (!source.ok) throw new Error("Source unavailable");
      const bytes = await source.blob();
      const mime = props.file.mimeType?.toLowerCase().split(";")[0].trim();
      const format = /\.ppt$/i.test(props.file.name) || mime === "application/vnd.ms-powerpoint" ? "ppt" : "pptx";
      const response = await fetch(`/api/task-files/presentation-preview?format=${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream", "X-TaskDoor-Presentation-Preview": "1" },
        body: bytes,
        signal: controller.signal,
      });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("application/pdf")) throw new Error("Preview unavailable");
      const pdf = await response.blob();
      if (!pdf.size || controller.signal.aborted) return;
      previewUrl = URL.createObjectURL(pdf);
      setPreview(previewUrl);
    })().catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => { controller.abort(); if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [url, props.file.id, props.file.name, props.file.mimeType, props.file.version, attempt]);

  if (preview) return <TaskPdfViewer {...props} url={preview} />;
  return <div aria-live="polite" className={`task-pdf-viewer__document-status${error ? " task-file-viewer-unsupported" : ""}`} role={error ? "alert" : "status"}>
    {error ? <><FileWarning aria-hidden="true" size={28} /><p>{english ? "This presentation could not be previewed. Try again or download the original." : "演示文稿暂时无法预览，请重试或下载原文件。"}</p><button onClick={() => setAttempt(value => value + 1)} type="button"><RotateCw aria-hidden="true" size={14} />{english ? "Retry" : "重试"}</button><TaskFileDownload file={props.file} /></> : <><span className="task-pdf-viewer__spinner" /><p>{english ? "Preparing slide preview…" : "正在生成幻灯片预览…"}</p></>}
  </div>;
}
