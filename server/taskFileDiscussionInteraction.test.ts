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
const { TaskFileBrowser } = await import("../src/features/tasks/files/components/TaskFileBrowser.tsx");
const { Dialog } = await import("../src/shared/ui/dialog.tsx");
const { AlertDialog } = await import("../src/shared/ui/alert-dialog.tsx");
const { getTaskFileDrafts, updateTaskFileDrafts } = await import("../src/features/tasks/files/lib/task-file-drafts.ts");
const { TaskImageViewer } = await import("../src/features/tasks/files/components/TaskImageViewer.tsx");
const { FileImageAnnotations } = await import("../src/features/tasks/files/components/FileImageAnnotations.tsx");
const { createTaskFileAnnotation } = await import("../src/features/tasks/files/lib/task-file-annotations.ts");
const { default: FullscreenButton } = await import("../src/features/tasks/files/components/FullscreenButton.tsx");

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

test("文件主区初始只浏览目录，选择具体文件才打开对应预览", () => {
  const folder: TaskFileNode = { id: "materials", kind: "folder", name: "资料", parentId: null, updatedAt: "" };
  const file = { ...pdf, parentId: folder.id };
  const another = { ...pdf, id: "other", name: "补充规则.pdf" };
  const initial = capture(() => TaskFileExplorer({ browserMode: true, files: [folder, file, another], taskId: "browser-files", currentUser: "周岚" }));
  assert.equal(elements(initial.tree, node => node.type === Dialog)[0].props.open, false);
  assert.match(initial.html, /task-file-browser-items/);
  assert.doesNotMatch(initial.html, /class="task-file-explorer-preview"/);

  let opened = false;
  const selected = capture(() => TaskFileExplorer({ browserMode: true, files: [folder, file, another], taskId: "browser-open", currentUser: "周岚" }), tree => {
    if (opened) return;
    opened = true;
    elements(tree, node => node.type === TaskFileBrowser)[0].props.onOpen(another.id, null);
  });
  assert.equal(elements(selected.tree, node => node.type === Dialog)[0].props.open, true);
  assert.equal(elements(selected.tree, node => node.type === TaskFileViewer)[0].props.file.id, another.id);
});

test("来源定位直接打开指定文件及版本所在目录", () => {
  const folder: TaskFileNode = { id: "sources", kind: "folder", name: "来源", parentId: null, updatedAt: "" };
  const file = { ...pdf, parentId: folder.id };
  const { tree } = capture(() => TaskFileExplorer({ browserMode: true, files: [folder, file], taskId: "browser-source", focusedFileId: file.id, focusedVersion: 1, currentUser: "周岚" }));
  assert.equal(elements(tree, node => node.type === Dialog)[0].props.open, true);
  assert.equal(elements(tree, node => node.type === TaskFileViewer)[0].props.file.id, file.id);
  assert.equal(elements(tree, node => node.type === TaskFileBrowser)[0].props.directoryId, folder.id);
});

test("关闭有修改的文件预览先确认，明确关闭后保留原草稿及版本", () => {
  const taskId = "browser-retain-draft";
  const file: TaskFileNode = { id: "editable", kind: "file", name: "记录.md", parentId: null, updatedAt: "", version: 3, content: "已保存正文" };
  const draft = { content: { kind: "text" as const, text: "仍未保存的正文" }, baseVersion: 3 };
  updateTaskFileDrafts(taskId, { [file.id]: draft });
  try {
    let requested = false;
    const asked = capture(() => TaskFileExplorer({ browserMode: true, files: [file], taskId, focusedFileId: file.id, currentUser: "周岚" }), tree => {
      if (requested) return;
      requested = true;
      elements(tree, node => node.type === Dialog)[0].props.onOpenChange(false);
    });
    assert.equal(elements(asked.tree, node => node.type === Dialog)[0].props.open, true);
    assert.equal(elements(asked.tree, node => node.type === AlertDialog)[0].props.open, true);

    let closeStep = 0;
    const retained = capture(() => TaskFileExplorer({ browserMode: true, files: [file], taskId, focusedFileId: file.id, currentUser: "周岚" }), tree => {
      if (closeStep === 0) { closeStep++; elements(tree, node => node.type === Dialog)[0].props.onOpenChange(false); }
      else if (closeStep === 1) {
        assert.equal(elements(tree, node => node.type === AlertDialog)[0].props.open, true);
        closeStep++;
        elements(tree, node => node.props.children === "保留草稿并关闭")[0].props.onClick();
      }
    });
    assert.equal(elements(retained.tree, node => node.type === Dialog)[0].props.open, false);
    assert.deepEqual(getTaskFileDrafts(taskId)?.[file.id], draft);
  } finally { updateTaskFileDrafts(taskId, {}); }
});

test("普通图片预览进入内嵌图片查看器，原预览URL与替代文字保留", () => {
  const src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=";
  const file: TaskFileNode = { id: "image-view", kind: "file", name: "主视觉.png", parentId: null, version: 2, updatedAt: "", previewData: { kind: "image", src, alt: "主视觉原图" } };
  const { tree } = capture(() => TaskFileViewer({ file }));
  const viewer = elements(tree, node => node.type === TaskImageViewer)[0];
  assert.equal(viewer.props.src, src);
  assert.equal(viewer.props.alt, "主视觉原图");
  assert.equal(elements(tree, node => node.type === FileImageAnnotations).length, 0);
});

test("图片标注及当前版本区域定位保持原标注器，旧版本标记不拦普通阅读", () => {
  const file: TaskFileNode = { id: "annotated-image", kind: "file", name: "主视觉.png", parentId: null, version: 2, updatedAt: "", previewData: { kind: "image", src: "data:image/png;base64,AA==", alt: "主视觉" } };
  const annotation = createTaskFileAnnotation({ taskId: "image-route", file, authorId: "user-a", authorName: "周岚", body: "修改这个区域", anchor: { kind: "region", location: "图片区域", region: { x: .1, y: .2, width: .3, height: .4 } } });
  const selection = () => {};
  const editing = capture(() => TaskFileViewer({ file, annotationMode: true, onSelection: selection }));
  assert.equal(elements(editing.tree, node => node.type === FileImageAnnotations)[0].props.onSelection, selection);
  const locating = capture(() => TaskFileViewer({ file, annotations: [annotation], activeThreadId: annotation.id }));
  assert.equal(elements(locating.tree, node => node.type === FileImageAnnotations)[0].props.activeThreadId, annotation.id);
  const prior = capture(() => TaskFileViewer({ file, annotations: [{ ...annotation, version: 1 }] }));
  assert.equal(elements(prior.tree, node => node.type === TaskImageViewer).length, 1);
});

test("普通图片不重复显示外层全屏，开启标注后恢复原全屏入口", () => {
  const file: TaskFileNode = { id: "fullscreen-image", kind: "file", name: "主视觉.png", parentId: null, version: 1, updatedAt: "", previewData: { kind: "image", src: "data:image/png;base64,AA==", alt: "主视觉" } };
  const ordinary = capture(() => TaskFileExplorer({ files: [file], taskId: "image-fullscreen-owner", currentUser: "周岚" }));
  assert.equal(elements(ordinary.tree, node => node.type === FullscreenButton).length, 0);
  let started = false;
  const marking = capture(() => TaskFileExplorer({ files: [file], taskId: "image-fullscreen-marking", currentUser: "周岚" }), tree => {
    if (started) return;
    started = true;
    elements(tree, node => node.props["aria-label"] === "文件标注")[0].props.onClick();
  });
  assert.equal(elements(marking.tree, node => node.type === FullscreenButton).length, 1);
  const document = capture(() => TaskFileExplorer({ files: [pdf], taskId: "pdf-fullscreen-unchanged", currentUser: "周岚" }));
  assert.equal(elements(document.tree, node => node.type === FullscreenButton).length, 1);
});
