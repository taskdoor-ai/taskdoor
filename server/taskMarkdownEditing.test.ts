import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createEditor, $getRoot, FORMAT_TEXT_COMMAND } from "lexical";
import { registerRichText } from "@lexical/rich-text";
import { INSERT_UNORDERED_LIST_COMMAND, registerList } from "@lexical/list";
import { registerLink, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { namedSignals } from "@lexical/extension";
import { I18nProvider } from "../src/shared/i18n/I18nProvider.tsx";
import { $exportTaskMarkdown, $importTaskMarkdown, $setTaskMarkdownBlock, isSafeMarkdownLink, needsMarkdownSourceMode, TASK_MARKDOWN_NODES } from "../src/features/tasks/files/lib/task-markdown-editing.ts";

register("data:text/javascript," + encodeURIComponent("export async function load(url, context, nextLoad) {\n  if (url.endsWith(\".css\")) return { format: \"module\", source: \"\", shortCircuit: true };\n  return nextLoad(url, context);\n}"), import.meta.url);
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { TaskMarkdownEditor } = await import("../src/features/tasks/files/components/TaskMarkdownEditor.tsx");
const { TaskFileViewer } = await import("../src/features/tasks/files/components/TaskFileViewer.tsx");
const renderChinese = (children: React.ReactNode) => renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children }));

function editorWith(text: string) {
  const editor = createEditor({ namespace: "markdown-test", nodes: TASK_MARKDOWN_NODES, onError: error => { throw error; } });
  editor.update(() => $importTaskMarkdown(text), { discrete: true });
  return editor;
}

const markdownSemantics = (editor: ReturnType<typeof editorWith>) => JSON.parse(JSON.stringify(editor.getEditorState().toJSON(), (key, value) => key === "rel" || key === "target" ? undefined : value));

test("Markdown可视编辑往返保留标题、加粗斜体、列表起始编号、引用、代码和链接语义", () => {
  const original = '# 首发交接\n\n确认 **范围**、*负责方*、`skuId` 和 [资料](https://example.test/path "资料标题")。\n\n- 已交付\n- 待确认\n\n3. 首项\n4. 次项\n\n> 保留原口径\n\n```json\n{"sku":"A", "count": 2}\n```';
  assert.equal(needsMarkdownSourceMode(original), false);
  const first = editorWith(original);
  const serialized = first.getEditorState().read($exportTaskMarkdown);
  const second = editorWith(serialized);
  assert.deepEqual(second.getEditorState().toJSON(), first.getEditorState().toJSON());
  assert.equal(second.getEditorState().read($exportTaskMarkdown), serialized);
});

test("标准Markdown空行只分隔内容块，不生成额外空段，代码内部空行与缩进保持", () => {
  const original = '\n# 交接\n\n\n说明正文。\n\n## 待办\n\n- 核对范围\n- 确认负责人\n\n> 原有口径\n\n```text\n  const value = 1;\n\n  return value;\n```\n\n';
  const editor = editorWith(original);
  editor.getEditorState().read(() => {
    const blocks = $getRoot().getChildren();
    assert.deepEqual(blocks.map(node => node.getType()), ["heading", "paragraph", "heading", "list", "quote", "code"]);
    assert.ok(blocks.every(node => node.getTextContent().length > 0));
    assert.equal(blocks.at(-1)!.getTextContent(), "  const value = 1;\n\n  return value;");
  });
  const exported = editor.getEditorState().read($exportTaskMarkdown);
  assert.deepEqual(editorWith(exported).getEditorState().toJSON(), editor.getEditorState().toJSON());
  assert.equal(needsMarkdownSourceMode("第一行  \n第二行"), true);
  assert.equal(needsMarkdownSourceMode("第一行\\\n第二行"), true);
});

test("格式工具使用Lexical真实命令并输出可重新导入的Markdown", () => {
  const editor = editorWith("待核对");
  const cleanups = [registerRichText(editor), registerList(editor), registerLink(editor, namedSignals({ validateUrl: isSafeMarkdownLink, attributes: {} }))];
  try {
    editor.update(() => {
      $getRoot().getFirstDescendant()!.selectStart();
      $setTaskMarkdownBlock("h2");
      const node = $getRoot().getAllTextNodes()[0];
      node.select(0, node.getTextContentSize());
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://example.test/spec");
    }, { discrete: true });
    const markdown = editor.getEditorState().read($exportTaskMarkdown);
    assert.deepEqual(markdownSemantics(editorWith(markdown)), markdownSemantics(editor));
    assert.equal(editor.getEditorState().toJSON().root.children[0].type, "heading");
    editor.update(() => { editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined); }, { discrete: true });
    assert.equal(editor.getEditorState().toJSON().root.children[0].type, "list");
    const listed = editor.getEditorState().read($exportTaskMarkdown);
    assert.deepEqual(markdownSemantics(editorWith(listed)), markdownSemantics(editor));
  } finally { cleanups.forEach(cleanup => cleanup()); }
});

test("表格、图片、任务清单、引用式链接及HTML等保持源码，代码中的同样字面量不会误拦截", () => {
  for (const text of ["| 事项 | 状态 |\n| --- | --- |\n| 发布 | 待确认 |", "![海报](hero.png)", "- [x] 已交付", "[说明][spec]\n\n[spec]: /spec", "<details><summary>详情</summary>原文</details>", "标题\n===", "前言\n\n---\n\n正文", "注释[^1]\n\n[^1]: 内容"]) {
    assert.equal(needsMarkdownSourceMode(text), true, text);
  }
  assert.equal(needsMarkdownSourceMode('```md\n| 列 | 值 |\n| --- | --- |\n![image](x)\n- [x] done\n```\n\n一段 `![literal](x)`'), false);
});

test("默认可视编辑不创建假修改；源码保护保留完整原文且可视入口禁用", () => {
  const changes: string[] = [];
  const visual = renderChinese(createElement(TaskMarkdownEditor, { text: "## 交接\n\n- 核对", onChange: value => changes.push(value) }));
  assert.match(visual, /aria-label="编辑 Markdown 正文"/);
  assert.match(visual, /aria-label="文字格式"/);
  assert.doesNotMatch(visual, /<textarea/);
  assert.deepEqual(changes, []);
  const source = '| 事项 | 状态 |\n| --- | --- |\n| A & B | <原文> |\n';
  const protectedMarkup = renderChinese(createElement(TaskMarkdownEditor, { text: source, onChange: value => changes.push(value) }));
  assert.match(protectedMarkup, /暂不支持的 Markdown/);
  assert.match(protectedMarkup, /<button[^>]*disabled=""[^>]*>可视编辑/);
  assert.ok(protectedMarkup.includes(source.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")));
  assert.deepEqual(changes, []);
});

test("MD编辑实际接入新编辑器，其他文本格式维持各自原入口", () => {
  const file = { id: "doc", kind: "file" as const, parentId: null, name: "交接.md", updatedAt: "今天", version: 1, content: "# 标题\n\n- 事项" };
  const html = renderChinese(createElement(TaskFileViewer, { file, onChange: () => undefined }));
  assert.match(html, /task-markdown-editor/);
  for (const name of ["交接.txt", "交接.html", "交接.json", "交接.xml"]) {
    const other = renderChinese(createElement(TaskFileViewer, { file: { ...file, name }, onChange: () => undefined }));
    assert.doesNotMatch(other, /task-markdown-editor/, name);
    assert.match(other, /<textarea/, name);
  }
});

test("链接工具接受网页、邮件及相对路径，拒绝执行协议", () => {
  for (const url of ["https://example.test/spec", "mailto:team@example.test", "../spec.md", "/files/a", "#scope"]) assert.equal(isSafeMarkdownLink(url), true, url);
  for (const url of ["", "javascript:alert(1)", "data:text/html,content", "java\nscript:alert(1)"]) assert.equal(isSafeMarkdownLink(url), false, url);
});
