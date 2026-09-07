import { FileQuestion, Image as ImageIcon } from "lucide-react";
import React, { useLayoutEffect, useRef, useState } from "react";
import type { TaskFileNode } from "../../data/taskDetailMocks";
import { getTaskFileContent, type TaskFileContent } from "../../lib/taskFileEditing";
import { getPreviewKind } from "../../lib/taskFileTree";

export type TaskFileTextSelection = { text: string; location: string; rect: { left: number; bottom: number } };
type ViewerProps = {
  file: TaskFileNode;
  draft?: TaskFileContent | null;
  onChange?: (content: TaskFileContent) => void;
  onSelection?: (selection: TaskFileTextSelection | null) => void;
  onSelectText?: () => void;
};

function EditableText({ value, onChange, label, className = "", onSelection, location }: {
  value: string; onChange: (text: string) => void; label: string; className?: string;
  location: string; onSelection?: ViewerProps["onSelection"];
}) {
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
    onSelection?.(text.trim() ? { text, location, rect: { left: rect.left, bottom: rect.top } } : null);
  }} placeholder="开始写作…" ref={ref} rows={1} spellCheck value={value} />;
}

function TextDocument({ text, onChange, onSelection, onSelectText }: {
  text: string; onChange?: (text: string) => void; onSelection?: ViewerProps["onSelection"]; onSelectText?: () => void;
}) {
  // Keep paragraph identities stable while typing, including inserted blank lines.
  const [blocks, setBlocks] = useState(() => text.split(/\n{2}/));
  const visibleBlocks = onChange ? blocks : text.split(/\n{2}/);
  return <article aria-label="文件正文" className="task-file-document" onMouseUp={onChange ? undefined : onSelectText}>
    {visibleBlocks.map((block, index) => {
      const prefix = block.match(/^#{1,6} /)?.[0] ?? "";
      const heading = prefix ? Math.min(prefix.trim().length, 3) : 0;
      const value = block.slice(prefix.length);
      if (onChange) return <EditableText className={heading ? `task-file-heading-${heading}` : ""} key={index} label={index === 0 ? "编辑文件正文" : `编辑正文第 ${index + 1} 段`} location={`第 ${index + 1} 段`} onChange={nextText => {
        const next = blocks.map((item, i) => i === index ? prefix + nextText : item);
        setBlocks(next); onChange(next.join("\n\n"));
      }} onSelection={onSelection} value={value} />;
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
  const [activeIndex, setActiveIndex] = useState(0);
  const sheet = content.sheets[activeIndex] ?? content.sheets[0];
  const updateCell = (row: number, column: number, value: string) => onChange?.({ ...content, sheets: content.sheets.map((item, i) => i !== activeIndex ? item : row === 0
    ? { ...item, columns: item.columns.map((cell, c) => c === column ? value : cell) }
    : { ...item, rows: item.rows.map((cells, r) => r !== row - 1 ? cells : cells.map((cell, c) => c === column ? value : cell)) }) });
  return <div className="task-file-viewer-table-wrap">
    <div aria-label="工作表" className="task-file-viewer-sheets">{content.sheets.map((item, i) => <button aria-pressed={i === activeIndex} className={i === activeIndex ? "active" : ""} key={i} onClick={() => setActiveIndex(i)} type="button">{item.name}</button>)}</div>
    {sheet ? <div className="task-file-viewer-grid"><table><thead><tr><th>#</th>{sheet.columns.map((column, c) => <th key={c}>{onChange ? <input aria-label={`${sheet.name} ${columnName(c)}1`} onChange={event => updateCell(0, c, event.target.value)} value={column} /> : column}</th>)}</tr></thead><tbody>{sheet.rows.map((row, r) => <tr key={r}><th>{r + 2}</th>{row.map((cell, c) => <td key={c}>{onChange ? <input aria-label={`${sheet.name} ${columnName(c)}${r + 2}`} onChange={event => updateCell(r + 1, c, event.target.value)} value={cell} /> : cell}</td>)}</tr>)}</tbody></table></div> : <p className="task-file-format-note">文件中没有可编辑的工作表。</p>}
  </div>;
}

export function TaskFileViewer({ file, draft, onChange, onSelection, onSelectText }: ViewerProps) {
  const content = draft ?? getTaskFileContent(file);
  if (content?.kind === "text") return <TextDocument key={onChange ? "editing" : "readonly"} onChange={onChange ? text => onChange({ kind: "text", text }) : undefined} onSelection={onSelection} onSelectText={onSelectText} text={content.text} />;
  if (content?.kind === "table") return <TableDocument content={content} onChange={onChange} />;
  if (content?.kind === "pdf") return <div className="task-file-document task-file-pdf-document">
    <p className="task-file-format-note">PDF 提取正文 · 原文件保持不变</p>
    {content.pages.map((page, index) => <section className="task-file-pdf-page" key={index}><small>第 {index + 1} 页</small>{onChange ? <EditableText label={`编辑第 ${index + 1} 页正文`} location={`第 ${index + 1} 页`} onChange={text => onChange({ kind: "pdf", pages: content.pages.map((item, i) => i === index ? text : item) })} onSelection={onSelection} value={page} /> : <p onMouseUp={onSelectText}>{page}</p>}</section>)}
  </div>;
  if (getPreviewKind(file.name, file.mimeType) === "image") {
    const data = file.previewData?.kind === "image" ? file.previewData : null;
    return <div className="task-file-viewer-image">{data?.src ? <img alt={data.alt} src={data.src} /> : <div><ImageIcon size={36} /><strong>暂无图片预览</strong></div>}</div>;
  }
  return <div className="task-file-viewer-unsupported"><FileQuestion size={32} /><strong>此文件暂无可编辑正文</strong><p>尚未接入该格式的解析与编辑，原文件保持不变。</p></div>;
}
