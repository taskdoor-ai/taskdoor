import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { Download, FileQuestion, Image as ImageIcon } from "lucide-react";
import React, { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { getTaskFileContent, type TaskFileContent } from "@/features/tasks/files/lib/task-file-editing";
import { getPreviewKind } from "@/features/tasks/files/lib/task-file-tree";
import { isBuiltinTaskAsset, readDiscussionBlob } from "@/features/tasks/files/lib/discussion-uploads";
import type { FileDiscussionThread } from "@/features/tasks/lib/task-collaboration";
import { LexicalFileDocument } from "@/features/tasks/files/components/LexicalFileDocument";
import { FileImageAnnotations } from "@/features/tasks/files/components/FileImageAnnotations";
import { TaskImageViewer } from "@/features/tasks/files/components/TaskImageViewer";
import { TaskHtmlAnnotations } from "@/features/tasks/files/components/TaskHtmlAnnotations";
import type { TaskFileAnnotation } from "@/features/tasks/files/lib/task-file-annotations";
import { FileSourceLineNumbers } from "@/features/tasks/files/components/FileSourceLineNumbers";

const TaskPdfViewer = lazy(() => import("@/features/tasks/files/components/TaskPdfViewer").then(module => ({ default: module.TaskPdfViewer })));
const TaskPresentationViewer = lazy(() => import("@/features/tasks/files/components/TaskPresentationViewer").then(module => ({ default: module.TaskPresentationViewer })));

export type TaskFileTextSelection = { text: string; location: string; documentText?: string; selectionStart?: number; selectionEnd?: number; pageIndex?: number; region?: { x: number; y: number; width: number; height: number }; imageSrc?: string; screenshot?: string; screenshotPromise?: Promise<string | undefined>; elementLabel?: string; elementSelector?: string; rect: { left: number; bottom: number } };
type ViewerProps = {
  file: TaskFileNode;
  draft?: TaskFileContent | null;
  onChange?: (content: TaskFileContent) => void;
  onSelection?: (selection: TaskFileTextSelection | null) => void;
  onSelectText?: () => void;
  threads?: FileDiscussionThread[];
  activeThreadId?: string | null;
  annotationFocusSequence?: number;
  onThreadSelect?: (id: string, trigger?: HTMLElement) => void;
  annotationMode?: boolean;
  annotations?: TaskFileAnnotation[];
  draftAnchor?: TaskFileAnnotation["anchor"] | null;
};

function useFileUrl(file: TaskFileNode) {
  const [state, setState] = useState({ url: "", error: "", loading: Boolean(file.blobId) });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let url = "";
    setState({ url: "", error: "", loading: Boolean(file.blobId) });
    if (file.blobId) readDiscussionBlob(file.blobId).then(blob => {
      if (cancelled) return;
      if (!blob) { setState({ url: "", error: "附件原文件无法读取，请重新上传。", loading: false }); return; }
      url = URL.createObjectURL(blob);
      setState({ url, error: "", loading: false });
    }).catch(error => { if (!cancelled) setState({ url: "", error: error instanceof Error ? error.message : "附件读取失败。", loading: false }); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [file.blobId, attempt]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}

/** A file's text is downloaded as it reads; other files by their kept bytes. */
const downloadsText = (file: TaskFileNode) => {
  const kind = getPreviewKind(file.name, file.mimeType);
  const hasHtmlSource = file.content !== undefined || Boolean(file.previewData && "text" in file.previewData);
  return getTaskFileContent(file)?.kind === "text" && (["markdown", "text", "json", "xml"].includes(kind) || (kind === "html" && hasHtmlSource));
};

/** Whether a file has anything to download: its bytes, or text it reads as. */
export const canDownload = (file: TaskFileNode) => Boolean(file.blobId) || downloadsText(file);

/** Saves the file under its name; answers the line to show when it could not, "" when it did. */
export async function downloadTaskFile(file: TaskFileNode): Promise<string> {
  try {
    const content = getTaskFileContent(file);
    const kind = getPreviewKind(file.name, file.mimeType);
    const textMime = kind === "json" ? "application/json;charset=utf-8" : kind === "xml" ? "application/xml;charset=utf-8" : file.mimeType || (kind === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8");
    const blob = content?.kind === "text" && downloadsText(file) ? new Blob([content.text], { type: textMime }) : await readDiscussionBlob(file.blobId!);
    if (!blob) return "附件原文件无法读取，请重新上传。";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "";
  } catch (failure) { return failure instanceof Error ? failure.message : "下载失败，请重试。"; }
}

export function TaskFileDownload({ file }: { file: TaskFileNode }) {
  const ui = useGlobalUi();
  const [error, setError] = useState("");
  if (!canDownload(file)) return null;
  return <><button aria-label={ui("下载文件")} className="task-file-download-button" title={ui("下载文件")} type="button" onClick={async () => setError(await downloadTaskFile(file))}><Download size={16} /></button>{error && <span className="task-file-save-error" role="alert">{ui(error)}</span>}</>;
}

function OriginalFilePreview({ file, annotationMode, annotations, draftAnchor, activeThreadId, annotationFocusSequence, onThreadSelect, onSelection }: Pick<ViewerProps, "file" | "annotationMode" | "annotations" | "draftAnchor" | "activeThreadId" | "annotationFocusSequence" | "onThreadSelect" | "onSelection">) {
  const ui = useGlobalUi();
  const { url, loading, error, retry } = useFileUrl(file);
  const kind = getPreviewKind(file.name, file.mimeType);
  if (loading) return <p role="status">{ui("正在读取附件…")}</p>;
  if (error) return <div className="task-file-viewer-unsupported"><p role="alert">{ui(error)}</p><button onClick={retry} type="button">{ui("重试")}</button></div>;
  if (url && kind === "image") return usesTaskImageViewer(file, { annotationMode, annotations, draftAnchor }) ? <TaskImageViewer alt={file.name} src={url} /> : <FileImageAnnotations activeThreadId={activeThreadId} alt={file.name} annotationMode={annotationMode} annotations={annotations} imageSrc={file.previewData?.kind === "image" ? file.previewData.src : undefined} onSelection={onSelection} onThreadSelect={onThreadSelect} src={url} version={file.version ?? 1} />;
  if (url && kind === "pdf") return <Suspense fallback={<p role="status">{ui("正在读取附件…")}</p>}><TaskPdfViewer activeThreadId={activeThreadId} annotationMode={annotationMode} annotations={annotations} draftAnchor={draftAnchor} file={file} focusSequence={annotationFocusSequence} onSelection={onSelection} onThreadSelect={onThreadSelect} url={url} /></Suspense>;
  if (url && kind === "presentation") return <Suspense fallback={<p role="status">{ui("正在读取附件…")}</p>}><TaskPresentationViewer activeThreadId={activeThreadId} annotationMode={annotationMode} annotations={annotations} draftAnchor={draftAnchor} file={file} focusSequence={annotationFocusSequence} onSelection={onSelection} onThreadSelect={onThreadSelect} url={url} /></Suspense>;
  return <div className="task-file-viewer-unsupported"><FileQuestion size={32} /><strong>{ui("暂不支持在线预览此格式")}</strong><p>{ui("可以下载原文件查看。")}</p><TaskFileDownload file={file} /></div>;
}

/** Shared by the reader and its outer toolbar so fullscreen has one owner. */
export function usesTaskImageViewer(file: TaskFileNode, { annotationMode, annotations, draftAnchor }: Pick<ViewerProps, "annotationMode" | "annotations" | "draftAnchor"> = {}) {
  return getPreviewKind(file.name, file.mimeType) === "image" && !Boolean(annotationMode || draftAnchor?.kind === "region" || annotations?.some(item => item.fileId === file.id && item.version === (file.version ?? 1) && item.anchor.kind === "region" && item.anchor.region));
}

function EditableText({ value, onChange, label, className = "", onSelection, location, source = false }: {
  value: string; onChange: (text: string) => void; label: string; className?: string;
  location: string; onSelection?: ViewerProps["onSelection"]; source?: boolean;
}) {
  const ui = useGlobalUi();
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => { element.style.height = "auto"; element.style.height = `${element.scrollHeight}px`; };
    resize();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(element.parentElement!);
    return () => observer?.disconnect();
  }, [value]);
  return <textarea aria-label={label} className={`task-file-editable-text ${className}`} onChange={event => onChange(event.target.value)} onSelect={event => {
    const field = event.currentTarget;
    const text = field.value.slice(field.selectionStart, field.selectionEnd);
    const rect = field.getBoundingClientRect();
    onSelection?.(text.trim() ? { text, location, documentText: field.value, selectionStart: field.selectionStart, selectionEnd: field.selectionEnd, rect: { left: rect.left, bottom: Math.max(rect.top + 38, Math.min(rect.bottom, window.innerHeight - 12)) } } : null);
  }} placeholder={ui("开始写作…")} ref={ref} rows={1} spellCheck={!source} value={value} wrap={source ? "off" : undefined} />;
}

function TextDocument({ text, onChange, onSelection, onSelectText }: {
  text: string; onChange?: (text: string) => void; onSelection?: ViewerProps["onSelection"]; onSelectText?: () => void;
}) {
  const ui = useGlobalUi();
  // Keep paragraph identities stable while typing, including inserted blank lines.
  const [blocks, setBlocks] = useState(() => text.split(/\n{2}/));
  const visibleBlocks = onChange ? blocks : text.split(/\n{2}/);
  return <article aria-label={ui("文件正文")} className="task-file-document" onMouseUp={onChange ? undefined : onSelectText}>
    {visibleBlocks.map((block, index) => {
      const prefix = block.match(/^#{1,6} /)?.[0] ?? "";
      const heading = prefix ? Math.min(prefix.trim().length, 3) : 0;
      const value = block.slice(prefix.length);
      if (onChange) return <EditableText className={heading ? `task-file-heading-${heading}` : ""} key={index} label={index === 0 ? ui("编辑文件正文") : ui("编辑正文第 {0} 段", {0: index + 1})} location={ui("第 {0} 段", {0: index + 1})} onChange={nextText => {
        const next = blocks.map((item, i) => i === index ? prefix + nextText : item);
        setBlocks(next); onChange(next.join("\n\n"));
      }} onSelection={selection => {
        const offset = blocks.slice(0, index).reduce((sum, item) => sum + item.length + 2, 0) + prefix.length;
        onSelection?.(selection ? { ...selection, documentText: text, selectionStart: offset + (selection.selectionStart ?? 0), selectionEnd: offset + (selection.selectionEnd ?? 0) } : null);
      }} value={value} />;
      if (heading === 1) return <h1 key={index}>{value}</h1>;
      if (heading === 2) return <h2 key={index}>{value}</h2>;
      if (heading === 3) return <h3 key={index}>{value}</h3>;
      return <p key={index}>{value}</p>;
    })}
  </article>;
}

function columnName(index: number): string {
  let value = index + 1;
  let label = "";
  while (value > 0) { label = String.fromCharCode(65 + (value - 1) % 26) + label; value = Math.floor((value - 1) / 26); }
  return label;
}

function TableDocument({ content, onChange, annotationMode, onSelection }: { content: Extract<TaskFileContent, { kind: "table" }>; onChange?: ViewerProps["onChange"]; annotationMode?: boolean; onSelection?: ViewerProps["onSelection"] }) {
  const ui = useGlobalUi();
  const [activeIndex, setActiveIndex] = useState(0);
  const sheet = content.sheets[activeIndex] ?? content.sheets[0];
  const updateCell = (row: number, column: number, value: string) => onChange?.({ ...content, sheets: content.sheets.map((item, i) => i !== activeIndex ? item : row === 0
    ? { ...item, columns: item.columns.map((cell, c) => c === column ? value : cell) }
    : { ...item, rows: item.rows.map((cells, r) => r !== row - 1 ? cells : cells.map((cell, c) => c === column ? value : cell)) }) });
  const readCell = (cell: string, row: number, column: number) => {
    if (!annotationMode || !onSelection || !cell.trim()) return cell;
    const location = `${sheet.name} ${columnName(column)}${row}`;
    return <button aria-label={ui("标注") + ` ${location}: ${cell}`} onClick={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      onSelection({ text: cell, location, documentText: cell, selectionStart: 0, selectionEnd: cell.length, rect: { left: rect.left, bottom: rect.bottom } });
    }} style={{ display: "block", width: "100%", padding: 0, border: 0, background: "transparent", color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }} type="button">{cell}</button>;
  };
  return <div className="task-file-viewer-table-wrap">
    <div aria-label={ui("工作表")} className="task-file-viewer-sheets">{content.sheets.map((item, i) => <button aria-pressed={i === activeIndex} className={i === activeIndex ? "active" : ""} key={i} onClick={() => setActiveIndex(i)} type="button">{item.name}</button>)}</div>
    {sheet ? <div className="task-file-viewer-grid"><table><thead><tr><th>#</th>{sheet.columns.map((column, c) => <th key={c}>{onChange ? <input aria-label={`${sheet.name} ${columnName(c)}1`} onChange={event => updateCell(0, c, event.target.value)} value={column} /> : readCell(column, 1, c)}</th>)}</tr></thead><tbody>{sheet.rows.map((row, r) => <tr key={r}><th>{r + 2}</th>{row.map((cell, c) => <td key={c}>{onChange ? <input aria-label={`${sheet.name} ${columnName(c)}${r + 2}`} onChange={event => updateCell(r + 1, c, event.target.value)} value={cell} /> : readCell(cell, r + 2, c)}</td>)}</tr>)}</tbody></table></div> : <p className="task-file-format-note">{ui("文件中没有可编辑的工作表。")}</p>}
  </div>;
}

export function TaskFileViewer({ file, draft, onChange, onSelection, onSelectText, threads, activeThreadId, annotationFocusSequence, onThreadSelect, annotationMode, annotations, draftAnchor }: ViewerProps) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const content = draft ?? getTaskFileContent(file);
  const previewKind = getPreviewKind(file.name, file.mimeType);
  const focusedPageRegion = (draftAnchor?.kind === "region" && draftAnchor.pageIndex !== undefined) || annotations?.some(item => item.id === activeThreadId && item.fileId === file.id && item.version === (file.version ?? 1) && item.anchor.kind === "region" && item.anchor.pageIndex !== undefined);
  if (previewKind === "html" && !onChange) return <TaskHtmlAnnotations activeThreadId={activeThreadId} annotationMode={annotationMode} annotations={annotations} draftAnchor={draftAnchor} file={file} html={content?.kind === "text" ? content.text : undefined} onSelection={onSelection} onThreadSelect={onThreadSelect} />;
  // Text revisions keep saved content, except a page-region lookup explicitly
  // targets the retained original bytes and their page geometry.
  if (previewKind === "pdf" && file.blobId && ((file.version ?? 1) === 1 || content?.kind !== "pdf" || focusedPageRegion) && !onChange) return <OriginalFilePreview activeThreadId={activeThreadId} annotationFocusSequence={annotationFocusSequence} annotationMode={annotationMode} annotations={annotations} draftAnchor={draftAnchor} file={file} onSelection={onSelection} onThreadSelect={onThreadSelect} />;
  const source = previewKind === "json" || previewKind === "xml";
  if (content?.kind === "text" && source && onChange) return <article className="task-file-document task-file-source-document"><FileSourceLineNumbers text={content.text} /><div className="task-file-source-content"><EditableText className="task-file-source-input" label={ui("编辑文件正文")} location={ui("所选正文")} onChange={text => onChange({ kind: "text", text })} onSelection={onSelection} source value={content.text} /></div></article>;
  if (content?.kind === "text") return onChange ? <TextDocument key="editing" onChange={text => onChange({ kind: "text", text })} onSelection={onSelection} text={content.text} /> : <LexicalFileDocument activeThreadId={activeThreadId} annotationMode={annotationMode} draftAnchor={draftAnchor} markdown={previewKind === "markdown" || (previewKind === "document" && isBuiltinTaskAsset(file.blobId))} onSelection={onSelection} onThreadSelect={onThreadSelect} source={source} text={content.text} threads={threads} version={file.version ?? 1} />;
  if (content?.kind === "table") return <TableDocument annotationMode={annotationMode} content={content} onChange={onChange} onSelection={onSelection} />;
  if (content?.kind === "pdf") return <div className="task-file-document task-file-pdf-document">
    <p className="task-file-format-note">{d('pdfText')}</p>
    {content.pages.map((page, index) => {
      const selectPage = (selection: TaskFileTextSelection | null) => onSelection?.(selection ? { ...selection, location: ui("第 {0} 页", {0: index + 1}), pageIndex: index } : null);
      return <section className="task-file-pdf-page" key={index}><small>{ui("第")}{index + 1}{ui("页")}</small>{onChange ? <EditableText label={ui("编辑第 {0} 页正文", {0: index + 1})} location={ui("第 {0} 页", {0: index + 1})} onChange={text => onChange({ kind: "pdf", pages: content.pages.map((item, i) => i === index ? text : item) })} onSelection={selectPage} value={page} /> : <LexicalFileDocument activeThreadId={activeThreadId} annotationMode={annotationMode} draftAnchor={draftAnchor} onSelection={selectPage} onThreadSelect={onThreadSelect} pageIndex={index} text={page} threads={threads} version={file.version ?? 1} />}</section>;
    })}
  </div>;
  if (file.blobId) return <OriginalFilePreview activeThreadId={activeThreadId} annotationFocusSequence={annotationFocusSequence} annotationMode={annotationMode} annotations={annotations} draftAnchor={draftAnchor} file={file} onSelection={onSelection} onThreadSelect={onThreadSelect} />;
  if (getPreviewKind(file.name, file.mimeType) === "image") {
    const data = file.previewData?.kind === "image" ? file.previewData : null;
    return data?.src ? usesTaskImageViewer(file, { annotationMode, annotations, draftAnchor }) ? <TaskImageViewer alt={data.alt} src={data.src} /> : <FileImageAnnotations activeThreadId={activeThreadId} alt={data.alt} annotationMode={annotationMode} annotations={annotations} imageSrc={data.src} onSelection={onSelection} onThreadSelect={onThreadSelect} src={data.src} version={file.version ?? 1} /> : <div className="task-file-viewer-image"><div><ImageIcon size={36} /><strong>{d('noImagePreview')}</strong></div></div>;
  }
  return <div className="task-file-viewer-unsupported"><FileQuestion size={32} /><strong>{d('noEditableContent')}</strong><p>{d('unsupportedFormat')}</p></div>;
}
