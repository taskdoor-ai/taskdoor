import { useGlobalUi } from "@/shared/i18n/global-ui";
import React, { useEffect, useMemo } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { $isMarkNode, $unwrapMarkNode, $wrapSelectionInMarkNode, MarkNode } from "@lexical/mark";
import { $createParagraphNode, $createRangeSelection, $createTextNode, $getNearestNodeFromDOMNode, $getRoot, $isElementNode, $isTextNode, $nodesOfType, $setSelection, type LexicalNode, type TextNode } from "lexical";
import type { FileDiscussionThread } from "@/features/tasks/lib/task-collaboration";
import type { TaskFileTextSelection } from "@/features/tasks/files/components/TaskFileViewer";
import type { TaskFileAnnotation } from "@/features/tasks/files/lib/task-file-annotations";
import { captureFileAnnotationElement } from "@/features/tasks/files/lib/capture-file-annotation";
import { FileSourceLineNumbers } from "@/features/tasks/files/components/FileSourceLineNumbers";

type Props = { text: string; markdown?: boolean; source?: boolean; pageIndex?: number; version?: number; threads?: FileDiscussionThread[]; activeThreadId?: string | null; annotationMode?: boolean; draftAnchor?: TaskFileAnnotation["anchor"] | null; onThreadSelect?: (id: string, trigger?: HTMLElement) => void; onSelection?: (selection: TaskFileTextSelection | null) => void };

const DRAFT_MARK_ID = "__taskdoor_file_annotation_draft__";

function getOffset(node: TextNode, offset: number) {
  let result = offset;
  let current: LexicalNode = node;
  while (current.getParent()) {
    for (const sibling of current.getPreviousSiblings()) {
      result += sibling.getTextContentSize();
      if ($isElementNode(sibling) && !sibling.isInline()) result += 2;
    }
    current = current.getParent()!;
  }
  return result;
}

/** Mark only a verified passage; stale or ambiguous source offsets remain unmarked. */
export function $markDocumentQuote({ quote, documentText: sourceText, selectionStart, selectionEnd }: Pick<FileDiscussionThread, "quote" | "documentText" | "selectionStart" | "selectionEnd">, sourceMarkdown: string, id: string) {
  const documentText = $getRoot().getTextContent();
  if (!quote?.trim()) return false;
  if (sourceText !== documentText) {
    // Source Markdown may include markup. A unique passage may be mapped in the same source only.
    if (sourceText !== sourceMarkdown) return false;
    const match = documentText.indexOf(quote);
    if (match < 0 || match !== documentText.lastIndexOf(quote)) return false;
    selectionStart = match;
    selectionEnd = match + quote.length;
  }
  if (selectionStart == null || selectionEnd == null || !Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd) || selectionStart < 0 || selectionEnd <= selectionStart || documentText.slice(selectionStart, selectionEnd) !== quote) return false;
  const points = $getRoot().getAllTextNodes().map(node => ({ node, start: getOffset(node, 0), end: getOffset(node, node.getTextContentSize()) }));
  const start = points.find(point => selectionStart! >= point.start && selectionStart! < point.end);
  const end = [...points].reverse().find(point => selectionEnd! > point.start && selectionEnd! <= point.end);
  if (!start || !end) return false;
  const range = $createRangeSelection();
  range.setTextNodeRange(start.node, selectionStart - start.start, end.node, selectionEnd - end.start);
  $wrapSelectionInMarkNode(range, false, id);
  return true;
}

function DocumentPlugin({ text, markdown, source, pageIndex, version, threads = [], activeThreadId, draftAnchor, onThreadSelect, onSelection }: Props) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      if (source) root.append($createParagraphNode().append($createTextNode(text)));
      else if (markdown) $convertFromMarkdownString(text, TRANSFORMERS);
      else text.split("\n\n").forEach(paragraph => root.append($createParagraphNode().append($createTextNode(paragraph))));
      $setSelection(null);
    }, { discrete: true });
  }, [editor, text, markdown, source]);
  useEffect(() => {
    editor.update(() => {
      $nodesOfType(MarkNode).forEach($unwrapMarkNode);
      for (const thread of threads) {
        if (!thread.quote || thread.pageIndex !== pageIndex || (version != null && thread.version !== version)) continue;
        $markDocumentQuote(thread, text, thread.id);
      }
      if (draftAnchor?.kind === "text" && draftAnchor.pageIndex === pageIndex) $markDocumentQuote({ quote: draftAnchor.quote ?? "", documentText: draftAnchor.documentText ?? "", selectionStart: draftAnchor.selectionStart, selectionEnd: draftAnchor.selectionEnd }, text, DRAFT_MARK_ID);
      $setSelection(null);
    }, { discrete: true });
  }, [editor, text, markdown, pageIndex, version, threads, draftAnchor]);
  useEffect(() => {
    editor.read(() => {
      for (const mark of $nodesOfType(MarkNode)) {
        const element = editor.getElementByKey(mark.getKey());
        if (!element) continue;
        const active = Boolean(activeThreadId && mark.getIDs().includes(activeThreadId));
        element.dataset.active = String(active);
        element.dataset.draft = String(mark.getIDs().includes(DRAFT_MARK_ID));
        if (active) element.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    });
  }, [editor, activeThreadId, threads, draftAnchor]);
  useEffect(() => {
    const capture = () => {
      const root = editor.getRootElement();
      const native = window.getSelection();
      if (!native || native.isCollapsed || !native.rangeCount || !root?.contains(native.anchorNode) || !root.contains(native.focusNode)) { onSelection?.(null); return; }
      const domRange = native.getRangeAt(0);
      editor.read(() => {
        const selection = $createRangeSelection();
        selection.applyDOMRange(domRange);
        const points = selection.getStartEndPoints();
        const first = $getRoot().getAllTextNodes()[0];
        const start = selection.isBackward() ? points[1] : points[0];
        const end = selection.isBackward() ? points[0] : points[1];
        const startNode = start.getNode();
        const endNode = end.getNode();
        if (!first || !$isTextNode(startNode) || !$isTextNode(endNode)) return;
        const documentText = $getRoot().getTextContent();
        const selectionStart = getOffset(startNode, start.offset);
        const selectionEnd = getOffset(endNode, end.offset);
        const quote = documentText.slice(selectionStart, selectionEnd);
        const rect = domRange.getBoundingClientRect();
        if (quote.trim()) onSelection?.({ text: quote, documentText, selectionStart, selectionEnd, location: "所选正文", screenshotPromise: captureFileAnnotationElement(root, rect), rect: { left: rect.left, bottom: rect.bottom } });
      });
    };
    const click = (event: MouseEvent) => {
      if (!window.getSelection()?.isCollapsed) return;
      const target = event.target as Node;
      editor.read(() => {
        let node = $getNearestNodeFromDOMNode(target);
        while (node && !$isMarkNode(node)) node = node.getParent();
        if ($isMarkNode(node)) {
          const threadId = node.getIDs().find(id => id !== DRAFT_MARK_ID);
          if (threadId) onThreadSelect?.(threadId);
        }
      });
    };
    return editor.registerRootListener((root, previous) => {
      previous?.removeEventListener("mouseup", capture);
      previous?.removeEventListener("keyup", capture);
      previous?.removeEventListener("click", click);
      root?.addEventListener("mouseup", capture);
      root?.addEventListener("keyup", capture);
      root?.addEventListener("click", click);
    });
  }, [editor, onSelection, onThreadSelect]);
  return null;
}

export function LexicalFileDocument(props: Props) {
  const ui = useGlobalUi();
  const config = useMemo(() => ({ namespace: "AgentDoorFileDocument", editable: false, nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode, MarkNode], theme: { mark: "task-file-discussion-mark", markOverlap: "task-file-discussion-mark-overlap" }, onError(error: Error) { console.error(error); } }), []);
  const content = <RichTextPlugin contentEditable={<ContentEditable aria-label={ui("文件正文")} role="document" />} ErrorBoundary={LexicalErrorBoundary} placeholder={null} />;
  return <LexicalComposer initialConfig={config}><article className={`task-file-document task-file-lexical-document${props.source ? " task-file-source-document" : ""}`} data-annotation-mode={Boolean(props.annotationMode)}>{props.source ? <><FileSourceLineNumbers text={props.text} /><div className="task-file-source-content">{content}</div></> : content}<DocumentPlugin {...props} /></article></LexicalComposer>;
}
