import React, { useEffect, useRef, useState } from "react";
import { Bold, Code2, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { $isHeadingNode } from "@lexical/rich-text";
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from "@lexical/list";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $getSelection, $isRangeSelection, $setSelection, FORMAT_TEXT_COMMAND, type RangeSelection, type TextFormatType } from "lexical";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { FileSourceLineNumbers } from "@/features/tasks/files/components/FileSourceLineNumbers";
import { $exportTaskMarkdown, $importTaskMarkdown, $setTaskMarkdownBlock, isSafeMarkdownLink, needsMarkdownSourceMode, TASK_MARKDOWN_NODES, TASK_MARKDOWN_TRANSFORMERS, type TaskMarkdownBlock } from "@/features/tasks/files/lib/task-markdown-editing";
import "@/features/tasks/styles/task-markdown-editor.css";

type Props = { text: string; onChange: (text: string) => void };

function MarkdownToolbar() {
  const ui = useGlobalUi();
  const [editor] = useLexicalComposerContext();
  const savedSelection = useRef<RangeSelection | null>(null);
  const [format, setFormat] = useState({ block: "paragraph", bold: false, italic: false, code: false, list: "", link: "", canLink: false });
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  useEffect(() => editor.registerUpdateListener(({ editorState }) => editorState.read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    savedSelection.current = selection.clone();
    const node = selection.anchor.getNode();
    const top = node.getTopLevelElement();
    const list = [node, ...node.getParents()].find($isListNode);
    const link = [node, ...node.getParents()].find($isLinkNode);
    const block = $isHeadingNode(top) ? top.getTag() : top?.getType() === "quote" ? "quote" : top?.getType() === "code" ? "code" : "paragraph";
    setFormat({ block, bold: selection.hasFormat("bold"), italic: selection.hasFormat("italic"), code: selection.hasFormat("code"), list: list?.getListType() ?? "", link: link?.getURL() ?? "", canLink: !selection.isCollapsed() || Boolean(link) });
  })), [editor]);
  const update = (action: () => void) => {
    editor.update(() => {
      if (savedSelection.current) $setSelection(savedSelection.current.clone());
      action();
    });
    editor.focus();
  };
  const textFormat = (type: TextFormatType) => update(() => { editor.dispatchCommand(FORMAT_TEXT_COMMAND, type); });
  const setBlock = (block: TaskMarkdownBlock) => update(() => {
    if (format.list) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    $setTaskMarkdownBlock(block);
  });
  return <>
    <div aria-label={ui("文字格式")} className="task-markdown-toolbar" role="toolbar" onMouseDown={event => { if ((event.target as HTMLElement).closest("button")) event.preventDefault(); }}>
      <select aria-label={ui("段落格式")} onChange={event => setBlock(event.target.value as TaskMarkdownBlock)} value={format.block}>
        <option value="paragraph">{ui("正文")}</option><option value="h1">{ui("一级标题")}</option><option value="h2">{ui("二级标题")}</option><option value="h3">{ui("三级标题")}</option>
        <option value="h4">H4</option><option value="h5">H5</option><option value="h6">H6</option><option value="quote">{ui("引用")}</option><option value="code">{ui("代码块")}</option>
      </select>
      <button aria-label={ui("加粗")} aria-pressed={format.bold} onClick={() => textFormat("bold")} title={ui("加粗")} type="button"><Bold size={16} /></button>
      <button aria-label={ui("斜体")} aria-pressed={format.italic} onClick={() => textFormat("italic")} title={ui("斜体")} type="button"><Italic size={16} /></button>
      <button aria-label={ui("无序列表")} aria-pressed={format.list === "bullet"} onClick={() => update(() => { editor.dispatchCommand(format.list === "bullet" ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND, undefined); })} title={ui("无序列表")} type="button"><List size={16} /></button>
      <button aria-label={ui("有序列表")} aria-pressed={format.list === "number"} onClick={() => update(() => { editor.dispatchCommand(format.list === "number" ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined); })} title={ui("有序列表")} type="button"><ListOrdered size={16} /></button>
      <button aria-label={ui("引用")} aria-pressed={format.block === "quote"} onClick={() => setBlock(format.block === "quote" ? "paragraph" : "quote")} title={ui("引用")} type="button"><Quote size={16} /></button>
      <button aria-label={ui("行内代码")} aria-pressed={format.code} onClick={() => textFormat("code")} title={ui("行内代码")} type="button"><Code2 size={16} /></button>
      <button aria-label={ui("链接")} aria-pressed={Boolean(format.link)} disabled={!format.canLink} onClick={() => { setLinkUrl(format.link); setLinkOpen(open => !open); }} title={ui("选中文字后添加链接")} type="button"><Link2 size={16} /></button>
    </div>
    {linkOpen && <form className="task-markdown-link-form" onSubmit={event => { event.preventDefault(); if (!isSafeMarkdownLink(linkUrl)) return; update(() => { editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl.trim()); }); setLinkOpen(false); }}>
      <label>{ui("链接地址")}<input autoFocus onChange={event => setLinkUrl(event.target.value)} placeholder="https://" value={linkUrl} /></label>
      <button disabled={!isSafeMarkdownLink(linkUrl)} type="submit">{ui("应用")}</button>
      {format.link && <button onClick={() => { update(() => { editor.dispatchCommand(TOGGLE_LINK_COMMAND, null); }); setLinkOpen(false); }} type="button">{ui("移除链接")}</button>}
      <button onClick={() => { setLinkOpen(false); editor.focus(); }} type="button">{ui("取消")}</button>
    </form>}
  </>;
}

function VisualMarkdownEditor({ text, onChange, onError }: Props & { onError: () => void }) {
  const ui = useGlobalUi();
  const lastExport = useRef("");
  const [config] = useState(() => ({
    namespace: "TaskDoorMarkdownEditor", nodes: TASK_MARKDOWN_NODES,
    editorState: () => { $importTaskMarkdown(text); lastExport.current = $exportTaskMarkdown(); },
    theme: { code: "task-markdown-code-block", text: { bold: "task-markdown-bold", italic: "task-markdown-italic", strikethrough: "task-markdown-strikethrough", code: "task-markdown-inline-code" } },
    onError,
  }));
  return <LexicalComposer initialConfig={config}>
    <MarkdownToolbar />
    <div className="task-markdown-editing-body task-file-document">
      <RichTextPlugin contentEditable={<ContentEditable aria-label={ui("编辑 Markdown 正文")} className="task-markdown-content" spellCheck />} ErrorBoundary={LexicalErrorBoundary} placeholder={null} />
    </div>
    <HistoryPlugin /><ListPlugin shouldPreserveNumbering /><LinkPlugin validateUrl={isSafeMarkdownLink} /><MarkdownShortcutPlugin transformers={TASK_MARKDOWN_TRANSFORMERS} />
    <OnChangePlugin ignoreSelectionChange onChange={state => state.read(() => {
      const markdown = $exportTaskMarkdown();
      if (markdown === lastExport.current) return;
      lastExport.current = markdown;
      onChange(markdown);
    })} />
  </LexicalComposer>;
}

export function TaskMarkdownEditor({ text, onChange }: Props) {
  const ui = useGlobalUi();
  const unsupported = needsMarkdownSourceMode(text);
  const [mode, setMode] = useState<"visual" | "source">(() => unsupported ? "source" : "visual");
  const [failed, setFailed] = useState(false);
  const source = mode === "source" || unsupported || failed;
  return <section className="task-markdown-editor">
    <div aria-label={ui("Markdown 编辑模式")} className="task-markdown-modes" role="group">
      <button aria-pressed={!source} disabled={unsupported || failed} onClick={() => setMode("visual")} type="button">{ui("可视编辑")}</button>
      <button aria-pressed={source} onClick={() => setMode("source")} type="button">{ui("Markdown 源码")}</button>
    </div>
    {unsupported && <p className="task-markdown-notice" role="status">{ui("此文档含表格或其他暂不支持的 Markdown 语法，已保留源码编辑，避免丢失内容。")}</p>}
    {failed && <p className="task-markdown-notice" role="alert">{ui("可视编辑暂不可用，原文已保留，请继续编辑源码。")}</p>}
    {source ? <div className="task-file-source-document task-markdown-source"><FileSourceLineNumbers text={text} /><div className="task-file-source-content"><textarea aria-label={ui("编辑 Markdown 源码")} onChange={event => onChange(event.target.value)} spellCheck={false} value={text} wrap="off" /></div></div>
      : <VisualMarkdownEditor onChange={onChange} onError={() => setFailed(true)} text={text} />}
  </section>;
}
