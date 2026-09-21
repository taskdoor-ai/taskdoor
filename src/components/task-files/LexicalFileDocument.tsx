import { useGlobalUi } from "../../i18n/globalUi";
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
import type { FileDiscussionThread } from "../../lib/taskCollaboration";
import type { TaskFileTextSelection } from "./TaskFileViewer";

type Props = { text: string; markdown?: boolean; pageIndex?: number; version?: number; threads?: FileDiscussionThread[]; activeThreadId?: string | null; onThreadSelect?: (id: string) => void; onSelection?: (selection: TaskFileTextSelection | null) => void };

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

function DocumentPlugin({ text, markdown, pageIndex, version, threads = [], activeThreadId, onThreadSelect, onSelection }: Props) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      if (markdown) $convertFromMarkdownString(text, TRANSFORMERS);
      else text.split("\n\n").forEach(paragraph => root.append($createParagraphNode().append($createTextNode(paragraph))));
      $setSelection(null);
    }, { discrete: true });
  }, [editor, text, markdown]);
  useEffect(() => {
    editor.update(() => {
      $nodesOfType(MarkNode).forEach($unwrapMarkNode);
      const documentText = $getRoot().getTextContent();
      for (const thread of threads) {
        if (!thread.quote || thread.pageIndex !== pageIndex || (version != null && thread.version !== version)) continue;
        let selectionStart = thread.selectionStart;
        let selectionEnd = thread.selectionEnd;
        if (thread.documentText !== documentText) {
          // A textarea selects the source Markdown. Only map an unambiguous quote in the same saved source.
          if (thread.documentText !== text) continue;
          const match = documentText.indexOf(thread.quote);
          if (match < 0 || match !== documentText.lastIndexOf(thread.quote)) continue;
          selectionStart = match; selectionEnd = match + thread.quote.length;
        }
        if (selectionStart == null || selectionEnd == null || documentText.slice(selectionStart, selectionEnd) !== thread.quote) continue;
        const nodes = $getRoot().getAllTextNodes();
        const first = nodes[0];
        if (!first) continue;
        const points = nodes.map(node => ({ node, start: getOffset(node, 0), end: getOffset(node, node.getTextContentSize()) }));
        const start = points.find(point => selectionStart! >= point.start && selectionStart! < point.end);
        const end = [...points].reverse().find(point => selectionEnd! > point.start && selectionEnd! <= point.end);
        if (!start || !end) continue;
        const range = $createRangeSelection();
        range.setTextNodeRange(start.node, selectionStart - start.start, end.node, selectionEnd - end.start);
        $wrapSelectionInMarkNode(range, false, thread.id);
      }
      $setSelection(null);
    }, { discrete: true });
  }, [editor, text, markdown, pageIndex, version, threads]);
  useEffect(() => {
    editor.read(() => {
      for (const mark of $nodesOfType(MarkNode)) {
        const element = editor.getElementByKey(mark.getKey());
        if (!element) continue;
        const active = Boolean(activeThreadId && mark.getIDs().includes(activeThreadId));
        element.dataset.active = String(active);
        if (active) element.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    });
  }, [editor, activeThreadId, threads]);
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
        if (quote.trim()) onSelection?.({ text: quote, documentText, selectionStart, selectionEnd, location: "所选正文", rect: { left: rect.left, bottom: rect.bottom } });
      });
    };
    const click = (event: MouseEvent) => {
      if (!window.getSelection()?.isCollapsed) return;
      const target = event.target as Node;
      editor.read(() => {
        let node = $getNearestNodeFromDOMNode(target);
        while (node && !$isMarkNode(node)) node = node.getParent();
        if ($isMarkNode(node)) onThreadSelect?.(node.getIDs()[0]);
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
  return <LexicalComposer initialConfig={config}><article className="task-file-document task-file-lexical-document"><RichTextPlugin contentEditable={<ContentEditable aria-label={ui("文件正文")} role="document" />} ErrorBoundary={LexicalErrorBoundary} placeholder={null} /><DocumentPlugin {...props} /></article></LexicalComposer>;
}
