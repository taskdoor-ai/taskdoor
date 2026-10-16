import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import React, { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../src/shared/i18n/I18nProvider.tsx";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { createTaskFileAnnotation } from "../src/features/tasks/files/lib/task-file-annotations.ts";

registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
  if (url.endsWith(".svg")) return { format: "module", source: `export default ${JSON.stringify(url)}`, shortCircuit: true };
  return nextLoad(url, context);
} });
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { FileAnnotationSourcePreview } = await import("../src/features/tasks/files/components/FileAnnotationSourcePreview.tsx");
const { TaskFileViewer } = await import("../src/features/tasks/files/components/TaskFileViewer.tsx");
const file: TaskFileNode = { id: "pdf-source", kind: "file", name: "原件.pdf", parentId: null, updatedAt: "今天", version: 2, blobId: "pdf-bytes", previewData: { kind: "pdf", pages: ["旧预置正文"] } };
const anchor = { kind: "region" as const, location: "所框区域", quote: "第3页区域", pageIndex: 2, region: { x: .1, y: .2, width: .4, height: .3 } };
const render = (children: ReactNode) => renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children }));

test("missing page-region screenshot remains readable as a page target, never a text quote", () => {
  const html = render(createElement(FileAnnotationSourcePreview, { file, anchor }));
  assert.match(html, /第 3 页/);
  assert.match(html, /截图.*不可用|未保存.*截图/);
  assert.doesNotMatch(html, /<blockquote|<img/);
  const compact = render(createElement(FileAnnotationSourcePreview, { file, anchor, compact: true }));
  assert.match(compact, /第 3 页/);
});

test("looking up a fixed-version page region routes retained PDF bytes with its page anchor", () => {
  const item = createTaskFileAnnotation({ taskId: "task", file, authorId: "author", authorName: "周岚", body: "调整区域", anchor });
  let tree: React.ReactElement | undefined;
  function Capture() {
    tree = TaskFileViewer({ file, activeThreadId: item.id, annotationFocusSequence: 3, annotations: [item] });
    return tree;
  }
  const html = render(createElement(Capture));
  assert.doesNotMatch(html, /旧预置正文/);
  assert.match(html, /正在读取附件/);
  assert.equal((tree?.props as { activeThreadId?: string }).activeThreadId, item.id);
  assert.deepEqual((tree?.props as { annotations?: unknown }).annotations, [item]);
});

test("legacy image and HTML region previews keep their page-free presentation", () => {
  const legacyAnchor = { kind: "region" as const, location: "旧区域", region: anchor.region };
  const imageFile: TaskFileNode = { ...file, name: "旧图.png", previewData: { kind: "image", src: "https://example.invalid/saved.png", alt: "旧图" } };
  const image = render(createElement(FileAnnotationSourcePreview, { file: imageFile, anchor: legacyAnchor }));
  assert.match(image, /<img/);
  assert.doesNotMatch(image, /data-page-index|第 .* 页/);
  const html = render(createElement(FileAnnotationSourcePreview, { file: { ...file, name: "旧页.html" }, anchor: { ...legacyAnchor, quote: "旧HTML标题", elementSelector: "h1" } }));
  assert.match(html, /<blockquote[^>]*>旧HTML标题<\/blockquote>/);
  assert.doesNotMatch(html, /第 .* 页/);
});
