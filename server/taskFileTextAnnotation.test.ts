import assert from "node:assert/strict";
import test from "node:test";
import { createEditor, $createParagraphNode, $createTextNode, $getRoot, $nodesOfType } from "lexical";
import { MarkNode, $unwrapMarkNode } from "@lexical/mark";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { $markDocumentQuote } from "../src/features/tasks/files/components/LexicalFileDocument.tsx";

function withDocument(text: string, inspect: () => void, markdown = false) {
  const editor = createEditor({ namespace: "file-text-annotation-test", nodes: [MarkNode, HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode], onError: error => { throw error; } });
  editor.update(() => {
    if (markdown) $convertFromMarkdownString(text, TRANSFORMERS);
    else text.split("\n\n").forEach(paragraph => $getRoot().append($createParagraphNode().append($createTextNode(paragraph))));
    inspect();
  }, { discrete: true });
}

test("重复正文批注用精确偏移标出第二处，临时标记清除后正文不变", () => {
  const text = "第一段适用范围。\n\n第二段适用范围。";
  const quote = "适用范围";
  const selectionStart = text.lastIndexOf(quote);
  withDocument(text, () => {
    assert.equal($markDocumentQuote({ quote, documentText: text, selectionStart, selectionEnd: selectionStart + quote.length }, text, "draft"), true);
    const marks = $nodesOfType(MarkNode);
    assert.equal(marks.length, 1);
    assert.equal(marks[0].getTextContent(), quote);
    assert.equal(marks[0].getParent()?.getIndexWithinParent(), 1, "重复的第一处不能误高亮");
    assert.equal($getRoot().getTextContent(), text, "标注不得制造文件内容变更");
    marks.forEach($unwrapMarkNode);
    assert.equal($nodesOfType(MarkNode).length, 0);
    assert.equal($getRoot().getTextContent(), text);
  });
});

test("跨段选区保留完整文字且不把整份正文当成批注", () => {
  const text = "首段开始，首段结尾。\n\n第二段开始，第二段结尾。";
  const selectionStart = text.indexOf("首段结尾");
  const selectionEnd = text.indexOf("第二段开始") + "第二段开始".length;
  const quote = text.slice(selectionStart, selectionEnd);
  withDocument(text, () => {
    assert.equal($markDocumentQuote({ quote, documentText: text, selectionStart, selectionEnd }, text, "draft"), true);
    assert.deepEqual($nodesOfType(MarkNode).map(mark => mark.getTextContent()), ["首段结尾。", "第二段开始"]);
    assert.equal($getRoot().getTextContent(), text);
  });
});

test("正文版本变化、偏移无效及引用不匹配时不猜测批注位置", () => {
  const text = "当前正文需要核对。";
  withDocument(text, () => {
    const valid = { quote: "需要核对", documentText: text, selectionStart: 4, selectionEnd: 8 };
    assert.equal($markDocumentQuote({ ...valid, documentText: "旧正文需要核对。" }, text, "old"), false);
    assert.equal($markDocumentQuote({ ...valid, selectionStart: -1 }, text, "negative"), false);
    assert.equal($markDocumentQuote({ ...valid, selectionStart: 4.5 }, text, "fraction"), false);
    assert.equal($markDocumentQuote({ ...valid, selectionEnd: 7 }, text, "mismatch"), false);
    assert.equal($markDocumentQuote({ ...valid, selectionEnd: 4 }, text, "empty"), false);
    assert.equal($nodesOfType(MarkNode).length, 0);
  });
});

test("Markdown 源文只映射唯一引用，重复文本不回退猜位置", () => {
  const source = "# 规则\n\n请核对**适用范围**。";
  withDocument(source, () => {
    assert.equal($markDocumentQuote({ quote: "适用范围", documentText: source, selectionStart: source.indexOf("适用范围"), selectionEnd: source.indexOf("适用范围") + 4 }, source, "source"), true);
    assert.equal($nodesOfType(MarkNode)[0]?.getTextContent(), "适用范围");
  }, true);
  const repeatedSource = "# 规则\n\n**适用范围**与适用范围。";
  withDocument(repeatedSource, () => {
    assert.equal($markDocumentQuote({ quote: "适用范围", documentText: repeatedSource, selectionStart: repeatedSource.lastIndexOf("适用范围"), selectionEnd: repeatedSource.lastIndexOf("适用范围") + 4 }, repeatedSource, "ambiguous"), false);
    assert.equal($nodesOfType(MarkNode).length, 0);
  }, true);
});
