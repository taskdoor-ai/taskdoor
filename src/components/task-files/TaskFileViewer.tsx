import { useGlobalUi } from "../../i18n/globalUi";
import { useDetailCopy } from "../../i18n/detailMessages";
import { Download, FileQuestion, Image as ImageIcon } from "lucide-react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TaskFileNode } from "../../data/taskDetailMocks";
import { getTaskFileContent, type TaskFileContent } from "../../lib/taskFileEditing";
import { getPreviewKind } from "../../lib/taskFileTree";
import { readDiscussionBlob } from "../../lib/discussionUploads";
import type { FileDiscussionThread } from "../../lib/taskCollaboration";
import { LexicalFileDocument } from "./LexicalFileDocument";

export type TaskFileTextSelection = { text: string; location: string; documentText?: string; selectionStart?: number; selectionEnd?: number; pageIndex?: number; rect: { left: number; bottom: number } };
type ViewerProps = {
  file: TaskFileNode;
  draft?: TaskFileContent | null;
  onChange?: (content: TaskFileContent) => void;
  onSelection?: (selection: TaskFileTextSelection | null) => void;
  onSelectText?: () => void;
  threads?: FileDiscussionThread[];
  activeThreadId?: string | null;
  onThreadSelect?: (id: string) => void;
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

export function TaskFileDownload({ file }: { file: TaskFileNode }) {
  const ui = useGlobalUi();
  const [error, setError] = useState("");
  const content = getTaskFileContent(file);
  const textDownload = content?.kind === "text" && ["markdown", "text"].includes(getPreviewKind(file.name, file.mimeType));
  if (!file.blobId && !textDownload) return null;
  return <><button aria-label={ui("下载文件")} className="task-file-download-button" title={ui("下载文件")} type="button" onClick={async () => {
    try {
      const blob = textDownload ? new Blob([content.text], { type: file.mimeType || "text/plain;charset=utf-8" }) : await readDiscussionBlob(file.blobId!);
      if (!blob) throw new Error(ui("附件原文件无法读取，请重新上传。"));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.name; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000); setError("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : ui("下载失败，请重试。")); }
  }}><Download size={16} /></button>{error && <span className="task-file-save-error" role="alert">{ui(error)}</span>}</>;
}

function OriginalFilePreview({ file }: { file: TaskFileNode }) {
  const ui = useGlobalUi();
  const { url, loading, error, retry } = useFileUrl(file);
  const kind = getPreviewKind(file.name, file.mimeType);
  if (loading) return <p role="status">{ui("正在读取附件…")}</p>;
  if (error) return <div className="task-file-viewer-unsupported"><p role="alert">{ui(error)}</p><button onClick={retry} type="button">{ui("重试")}</button></div>;
  if (url && kind === "image") return <div className="task-file-viewer-image"><img alt={file.name} src={url} /></div>;
  if (url && kind === "pdf") return <iframe className="task-file-original-pdf" src={url} title={file.name} />;
  return <div className="task-file-viewer-unsupported"><FileQuestion size={32} /><strong>{ui("暂不支持在线预览此格式")}</strong><p>{ui("可以下载原文件查看，也可以在右侧讨论整个文件。")}</p><TaskFileDownload file={file} /></div>;
}

function EditableText({ value, onChange, label, className = "", onSelection, location }: {
  value: string; onChange: (text: string) => void; label: string; className?: string;
  location: string; onSelection?: ViewerProps["onSelection"];
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
  }} placeholder={ui("开始写作…")} ref={ref} rows={1} spellCheck value={value} />;
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

function TableDocument({ content, onChange }: { content: Extract<TaskFileContent, { kind: "table" }>; onChange?: ViewerProps["onChange"] }) {
  const ui = useGlobalUi();
  const [activeIndex, setActiveIndex] = useState(0);
  const sheet = content.sheets[activeIndex] ?? content.sheets[0];
  const updateCell = (row: number, column: number, value: string) => onChange?.({ ...content, sheets: content.sheets.map((item, i) => i !== activeIndex ? item : row === 0
    ? { ...item, columns: item.columns.map((cell, c) => c === column ? value : cell) }
    : { ...item, rows: item.rows.map((cells, r) => r !== row - 1 ? cells : cells.map((cell, c) => c === column ? value : cell)) }) });
  return <div className="task-file-viewer-table-wrap">
    <div aria-label={ui("工作表")} className="task-file-viewer-sheets">{content.sheets.map((item, i) => <button aria-pressed={i === activeIndex} className={i === activeIndex ? "active" : ""} key={i} onClick={() => setActiveIndex(i)} type="button">{item.name}</button>)}</div>
    {sheet ? <div className="task-file-viewer-grid"><table><thead><tr><th>#</th>{sheet.columns.map((column, c) => <th key={c}>{onChange ? <input aria-label={`${sheet.name} ${columnName(c)}1`} onChange={event => updateCell(0, c, event.target.value)} value={column} /> : column}</th>)}</tr></thead><tbody>{sheet.rows.map((row, r) => <tr key={r}><th>{r + 2}</th>{row.map((cell, c) => <td key={c}>{onChange ? <input aria-label={`${sheet.name} ${columnName(c)}${r + 2}`} onChange={event => updateCell(r + 1, c, event.target.value)} value={cell} /> : cell}</td>)}</tr>)}</tbody></table></div> : <p className="task-file-format-note">{ui("文件中没有可编辑的工作表。")}</p>}
  </div>;
}

export function TaskFileViewer({ file, draft, onChange, onSelection, onSelectText, threads, activeThreadId, onThreadSelect }: ViewerProps) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const content = draft ?? getTaskFileContent(file);
  if (content?.kind === "text") return onChange ? <TextDocument key="editing" onChange={text => onChange({ kind: "text", text })} onSelection={onSelection} text={content.text} /> : <LexicalFileDocument activeThreadId={activeThreadId} markdown={getPreviewKind(file.name, file.mimeType) === "markdown"} onSelection={onSelection} onThreadSelect={onThreadSelect} text={content.text} threads={threads} version={file.version ?? 1} />;
  if (content?.kind === "table") return <TableDocument content={content} onChange={onChange} />;
  if (content?.kind === "pdf") return <div className="task-file-document task-file-pdf-document">
    <p className="task-file-format-note">{d('pdfText')}</p>
    {content.pages.map((page, index) => {
      const selectPage = (selection: TaskFileTextSelection | null) => onSelection?.(selection ? { ...selection, location: ui("第 {0} 页", {0: index + 1}), pageIndex: index } : null);
      return <section className="task-file-pdf-page" key={index}><small>{ui("第")}{index + 1}{ui("页")}</small>{onChange ? <EditableText label={ui("编辑第 {0} 页正文", {0: index + 1})} location={ui("第 {0} 页", {0: index + 1})} onChange={text => onChange({ kind: "pdf", pages: content.pages.map((item, i) => i === index ? text : item) })} onSelection={selectPage} value={page} /> : <LexicalFileDocument activeThreadId={activeThreadId} onSelection={selectPage} onThreadSelect={onThreadSelect} pageIndex={index} text={page} threads={threads} version={file.version ?? 1} />}</section>;
    })}
  </div>;
  if (file.blobId) return <OriginalFilePreview file={file} />;
  if (getPreviewKind(file.name, file.mimeType) === "image") {
    const data = file.previewData?.kind === "image" ? file.previewData : null;
    return <div className="task-file-viewer-image">{data?.src ? <img alt={data.alt} src={data.src} /> : <div><ImageIcon size={36} /><strong>{d('noImagePreview')}</strong></div>}</div>;
  }
  return <div className="task-file-viewer-unsupported"><FileQuestion size={32} /><strong>{d('noEditableContent')}</strong><p>{d('unsupportedFormat')}</p></div>;
}
