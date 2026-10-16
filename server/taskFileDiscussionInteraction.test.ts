import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskFileTextSelection } from "../src/features/tasks/files/components/TaskFileViewer.tsx";
import { TASK_FILE_UPLOAD_ACCEPT } from "../src/features/tasks/files/lib/task-file-capabilities.ts";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { I18nProvider } from "../src/shared/i18n/I18nProvider.tsx";

registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
  if (url.endsWith(".svg")) return { format: "module", source: `export default ${JSON.stringify(url)}`, shortCircuit: true };
  return nextLoad(url, context);
} });
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { TaskFileExplorer } = await import("../src/features/tasks/files/components/TaskFileExplorer.tsx");
const { TaskFileViewer } = await import("../src/features/tasks/files/components/TaskFileViewer.tsx");
const { LexicalFileDocument } = await import("../src/features/tasks/files/components/LexicalFileDocument.tsx");
const { DiscussionComposer } = await import("../src/features/tasks/discussion/components/DiscussionComposer.tsx");
const { TaskFileAnnotationComposer } = await import("../src/features/tasks/files/components/TaskFileAnnotationDialogs.tsx");
const { PopoverContent } = await import("../src/shared/ui/popover.tsx");

const renderChinese = (tree: ReactNode) => renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: tree }));

type Element = ReactElement<Record<string, any>>;
function elements(tree: ReactNode, match: (element: Element) => boolean): Element[] {
  const found: Element[] = [];
  Children.forEach(tree, child => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (match(child)) found.push(child);
    found.push(...elements(child.props.children, match));
  });
  return found;
}
function capture(render: () => ReactNode, initialize?: (tree: ReactNode) => void) {
  let tree: ReactNode = null;
  function Capture() {
    tree = render();
    initialize?.(tree);
    return tree;
  }
  const html = renderChinese(createElement(Capture));
  return { html, tree };
}
const pdf: TaskFileNode = { id: "rules", kind: "file", name: "规则.pdf", parentId: null, updatedAt: "2026-09-15 09:00", version: 1, previewData: { kind: "pdf", pages: ["请核对适用范围。", "请核对适用范围。"] } };

test("PDF 每页继续提供精确标注选区与对应页码", () => {
  const selected: TaskFileTextSelection[] = [];
  const { tree } = capture(() => TaskFileViewer({ file: pdf, onSelection: selection => { if (selection) selected.push(selection); } }));
  const pages = elements(tree, node => node.type === LexicalFileDocument);
  assert.equal(pages.length, 2, "PDF 每页必须使用可评论的正文阅读器");
  pages[1].props.onSelection({ text: "适用范围", documentText: "请核对适用范围。", selectionStart: 3, selectionEnd: 7, location: "所选正文", rect: { left: 100, bottom: 200 } });
  assert.equal((selected[0] as TaskFileTextSelection & { pageIndex?: number }).pageIndex, 1);
  assert.equal(selected[0].location, "第 2 页");
  assert.equal(selected[0].documentText?.slice(selected[0].selectionStart, selected[0].selectionEnd), selected[0].text);
});

test("PDF 预置正文不开放原件编辑，但保留正文选区和标注", () => {
  const { tree } = capture(() => TaskFileExplorer({ files: [pdf], taskId: "pdf-readonly-comment", currentUser: "周岚", currentUserId: "user-a" }));
  assert.equal(elements(tree, item => item.props["aria-label"] === "编辑文件").length, 0);
  assert.equal(elements(tree, item => item.props["aria-label"] === "文件标注").length, 1);
  const viewer = elements(tree, node => node.type === TaskFileViewer)[0];
  assert.equal(viewer.props.onChange, undefined);
  assert.equal(typeof viewer.props.onSelection, "function");
});

test("文件上传入口声明预览白名单，文本格式仍允许编辑", () => {
  const source: TaskFileNode = { ...pdf, id: "upload-source", name: "配置.json", previewData: { kind: "text", text: "{\"ready\": true}" } };
  const { tree } = capture(() => TaskFileExplorer({ files: [source], taskId: "source-edit-policy", currentUser: "周岚" }));
  const input = elements(tree, item => item.type === "input" && item.props.type === "file")[0];
  assert.equal(input.props.accept, TASK_FILE_UPLOAD_ACCEPT);
  assert.equal(elements(tree, item => item.props["aria-label"] === "编辑文件").length, 1);
});

test("混合上传遇到不支持格式立即拒绝整批，不进入写入进度", () => {
  let attempted = false;
  const { html } = capture(() => TaskFileExplorer({ files: [pdf], taskId: "mixed-upload-policy", currentUser: "周岚" }), tree => {
    if (attempted) return;
    attempted = true;
    const input = elements(tree, item => item.type === "input" && item.props.type === "file")[0];
    input.props.onChange({ target: { files: [new File(["{}"], "配置.json"), new File(["demo"], "简报.docx")] } });
  });
  assert.match(html, /不支持上传「简报.docx」/);
  assert.doesNotMatch(html, /正在上传 0\/2 个文件/);
});

test("讨论上传复用同一白名单，拒绝混合批次且不污染附件草稿", () => {
  let attempted = false;
  const { html, tree } = capture(() => {
    const wrapper = DiscussionComposer({ people: [], files: [], onSubmit: () => {}, draftKey: "unsupported-mixed-comment" });
    return (wrapper.type as (props: typeof wrapper.props) => ReactNode)(wrapper.props);
  }, tree => {
    const input = elements(tree, item => item.type === "input" && item.props.type === "file")[0];
    assert.equal(input.props.accept, TASK_FILE_UPLOAD_ACCEPT);
    if (attempted) return;
    attempted = true;
    input.props.onChange({ currentTarget: { files: [new File(["{}"], "配置.json"), new File(["demo"], "视频.mp4")], value: "" } });
  });
  assert.match(html, /不支持上传「视频.mp4」/);
  assert.equal(elements(tree, item => item.props.className === "discussion-composer-attachment").length, 0);
});

test("文件阅读只保留标注，没有独立讨论区域或入口", () => {
  const { html } = capture(() => TaskFileExplorer({ files: [pdf], taskId: "annotation-entry", currentUser: "周岚", currentUserId: "user-a", onStartDiscussion: () => {} }));
  assert.doesNotMatch(html, /task-file-discussion-(?:panel|trigger|bubble)|查看文件讨论|评论整个文件|评论这段文字/);
  assert.match(html, /文件标注/);
});

test("PDF页内区域直接进入意见输入，保留页码、矩形与局部截图", () => {
  const region = { x: .2, y: .3, width: .4, height: .2 };
  const screenshot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=";
  let selected = false;
  const { tree } = capture(() => TaskFileExplorer({ files: [pdf], taskId: "pdf-region-comment", currentUser: "周岚" }), tree => {
    if (selected) return;
    selected = true;
    const prior = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", { configurable: true, value: { getSelection: () => null } });
    try { elements(tree, node => node.type === TaskFileViewer)[0].props.onSelection({ text: "第2页区域", location: "第2页", pageIndex: 1, region, screenshot, rect: { left: 120, bottom: 240 } }); }
    finally { if (prior) Object.defineProperty(globalThis, "window", prior); else delete (globalThis as { window?: unknown }).window; }
  });
  const draft = elements(tree, node => node.type === TaskFileAnnotationComposer)[0].props.draft;
  assert.equal(draft.anchor.kind, "region");
  assert.equal(draft.anchor.pageIndex, 1);
  assert.deepEqual(draft.anchor.region, region);
  assert.equal(draft.anchor.screenshot, screenshot);
  assert.equal(draft.anchor.selectionStart, undefined);
});

test("全屏查看中的标注意见输入留在全屏容器内", () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "document");
  const fullscreenRoot = { nodeType: 1 };
  Object.defineProperty(globalThis, "document", { configurable: true, value: { fullscreenElement: fullscreenRoot } });
  try {
    const { tree } = capture(() => TaskFileAnnotationComposer({ draft: null, onChange: () => {}, onClose: () => {}, onSubmit: () => {} }));
    const popup = elements(tree, node => node.type === PopoverContent)[0];
    assert.equal(popup.props.portalContainer, fullscreenRoot);
    const portal = PopoverContent(popup.props as Parameters<typeof PopoverContent>[0]);
    assert.equal(portal.props.container, fullscreenRoot);
  } finally {
    if (prior) Object.defineProperty(globalThis, "document", prior);
    else delete (globalThis as { document?: unknown }).document;
  }
});

test("普通预览的意见浮层使用默认页面容器，不因空全屏目标而消失", () => {
  const { tree } = capture(() => TaskFileAnnotationComposer({ draft: null, onChange: () => {}, onClose: () => {}, onSubmit: () => {} }));
  const popup = elements(tree, node => node.type === PopoverContent)[0];
  const portal = PopoverContent(popup.props as Parameters<typeof PopoverContent>[0]);
  assert.equal(portal.props.container, undefined);
});
