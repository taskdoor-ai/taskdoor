import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { CodeHighlightNode, CodeNode, $createCodeNode } from "@lexical/code";
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { $setBlocksType } from "@lexical/selection";
import { $createParagraphNode, $getSelection, $isRangeSelection } from "lexical";

// The reader and editor use Lexical's same Markdown nodes and official transformers.
export const TASK_MARKDOWN_NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode];
export const TASK_MARKDOWN_TRANSFORMERS = TRANSFORMERS;
export type TaskMarkdownBlock = "paragraph" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "quote" | "code";

export function $importTaskMarkdown(text: string) {
  // Standard Markdown blank lines separate blocks; preserving each newline would
  // turn those separators into editable empty paragraphs. Code keeps its own lines.
  $convertFromMarkdownString(text, TASK_MARKDOWN_TRANSFORMERS);
}

export function $exportTaskMarkdown() {
  return $convertToMarkdownString(TASK_MARKDOWN_TRANSFORMERS);
}

export function $setTaskMarkdownBlock(block: TaskMarkdownBlock) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  $setBlocksType(selection, () => block === "paragraph" ? $createParagraphNode()
    : block === "quote" ? $createQuoteNode()
    : block === "code" ? $createCodeNode()
    : $createHeadingNode(block));
}

/** Unsupported structures stay in the exact source editor instead of being flattened. */
export function needsMarkdownSourceMode(markdown: string): boolean {
  let fence: { marker: string; length: number } | null = null;
  const outsideCode = markdown.split(/\r?\n/).map(line => {
    const match = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (match && match[1][0] === fence.marker && match[1].length >= fence.length && !match[2].trim()) fence = null;
      return "";
    }
    if (match) { fence = { marker: match[1][0], length: match[1].length }; return ""; }
    return line.replace(/(`+).*?\1/g, "");
  }).join("\n");
  return [
    /^\s{0,3}\|?\s*:?-{3,}:?\s*\|(?:\s*:?-{3,}:?\s*\|?)+\s*$/m,
    /!\[[^\]]*\]\s*[\[(]/,
    /^\s*(?:[-+*]|\d+[.)])\s+\[[ xX]\](?:\s|$)/m,
    /^\s{0,3}\[[^\]]+\]:/m,
    /\[[^\]]+\]\[[^\]]*\]/,
    /<\/?[A-Za-z][^>\n]*>|<!--|<!DOCTYPE/i,
    /^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,}|=+)$/m,
    /^(?: {4}|\t)(?![-+*]\s|\d+[.)]\s)\S/m,
    /(?: {2,}|\\)$/m,
    /^\s*\$\$|\\\(|\\\[/m,
  ].some(pattern => pattern.test(outsideCode));
}

export function isSafeMarkdownLink(value: string) {
  const url = value.trim();
  return Boolean(url) && !/[\u0000-\u001f\u007f]/.test(url)
    && (!url.includes(":") || /^(https?:|mailto:|tel:)/i.test(url));
}
