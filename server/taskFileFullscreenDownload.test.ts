import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { globalUiText } from "../src/shared/i18n/global-ui.ts";
import FullscreenButton from "../src/features/tasks/files/components/FullscreenButton.tsx";
import { canDownload, downloadTaskFile } from "../src/features/tasks/files/components/TaskFileViewer.tsx";

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const explorer = read("features/tasks/files/components/TaskFileExplorer.tsx");
const button = read("features/tasks/files/components/FullscreenButton.tsx");

function withDocument<T>(stub: object, run: () => T): T {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: stub });
  try { return run(); }
  finally { if (previous) Object.defineProperty(globalThis, "document", previous); else delete (globalThis as { document?: unknown }).document; }
}

const render = (kind: string, fullscreenEnabled = true) => withDocument({ fullscreenEnabled }, () =>
  renderToStaticMarkup(createElement(FullscreenButton, { kind, onSelection: () => undefined, target: createRef<HTMLElement>() })));

test("全屏按钮与「版本」同为 ghost sm 文件操作按钮，只给能预览的格式", () => {
  for (const kind of ["image", "pdf", "markdown", "text", "table"]) {
    const html = render(kind);
    // Node has no stored locale, so the demo's default English shows.
    assert.match(html, /aria-label="Full screen"/, kind);
    assert.match(html, /title="Full screen"/, kind);
    assert.match(html, /class="[^"]*task-file-action-button/, kind);
    assert.match(html, /<svg/, kind);
  }
  for (const kind of ["document", "unknown"]) assert.equal(render(kind), "", kind);
});

test("浏览器不允许全屏时不显示全屏按钮", () => {
  assert.equal(render("image", false), "");
});

test("全屏只作用于查看器，入口在文件名右侧、更多操作左侧", () => {
  assert.match(explorer, /className="task-file-explorer-viewer" onScroll=\{\(\) => setSelection\(null\)\} ref=\{viewerRef\}/);
  const fullscreen = explorer.indexOf("<FullscreenButton");
  assert.ok(fullscreen > explorer.indexOf("task-file-editor-path"), "在文件名之后");
  assert.ok(fullscreen < explorer.indexOf('aria-label={ui("更多文件操作")}'), "在更多操作之前");
  assert.match(explorer, /\{!isEditing && !loadError && !imageViewerOwnsFullscreen && <FullscreenButton [^>]*target=\{viewerRef\}/, "编辑、读取失败或普通图片已有框架全屏时不重复显示");
  assert.match(button, /requestFullscreen\(\)\.catch\(\(\) => \{\}\)/);
  assert.match(button, /task-file-viewer-unsupported/, "无法预览时不显示");
  assert.match(button, /fullscreenchange/);
});

test("全屏时查看器铺满页面底色，图片和 PDF 按屏幕高度适配", () => {
  const css = read("features/tasks/styles/task-file-editor.css");
  assert.match(css, /\.task-file-explorer-viewer:fullscreen \{[^}]*background: var\(--ad-canvas\)/);
  const pdfCss = read("features/tasks/styles/task-file-pdf-viewer.css");
  assert.match(pdfCss, /:fullscreen[^{]*\.task-pdf-viewer__viewport[^{]*\{[^}]*100dvh/);
  assert.match(css, /:fullscreen[^{]*\.task-file-viewer-image img[^{]*\{[^}]*100dvh/);
  assert.doesNotMatch(css, /:fullscreen[^{]*task-file-editor-toolbar/);
});

test("「更多」菜单里的下载在移动到之前，只给有内容可下的文件", () => {
  const item = explorer.indexOf('<Download size={14} />{ui("下载")}');
  assert.ok(item > 0, "菜单里有下载");
  assert.ok(item < explorer.indexOf('{ui("移动到")}'), "在移动到之前");
  assert.match(explorer, /selected\.kind === "file" && canDownload\(selected\) && <DropdownMenuItem onClick=\{async \(\) => setError\(ui\(await downloadTaskFile\(selected\)\)\)\}>/);
});

test("下载 Markdown 保存为同名文件，没有内容的文件不提供下载", async () => {
  const markdown: TaskFileNode = { id: "note", kind: "file", parentId: null, name: "决策.md", updatedAt: "昨天", content: "# 决策" };
  const unknown: TaskFileNode = { id: "zip", kind: "file", parentId: null, name: "素材.zip", updatedAt: "昨天" };
  assert.equal(canDownload(markdown), true);
  assert.equal(canDownload(unknown), false);
  const anchor = { href: "", download: "", clicked: false, click() { this.clicked = true; } };
  const error = await withDocument({ createElement: () => anchor }, () => downloadTaskFile(markdown));
  assert.equal(error, "");
  assert.equal(anchor.download, "决策.md");
  assert.equal(anchor.clicked, true);
  assert.match(anchor.href, /^blob:/);
});

test("生成的 HTML 附件下载原始 HTML 字节与同名文件，默认 MIME 为 text/html", async () => {
  const source = "<!doctype html><html lang=\"zh\"><body><h1>标注内容</h1><p>保留截图与批注</p></body></html>";
  const html: TaskFileNode = { id: "annotation-html", kind: "file", parentId: null, name: "文件标注.html", updatedAt: "刚刚", content: source, attachmentOnly: true };
  assert.equal(canDownload(html), true);
  assert.equal(canDownload({ ...html, content: undefined }), false, "无来源正文或原始字节的 HTML 不提供空下载");
  const anchor = { href: "", download: "", clicked: false, click() { this.clicked = true; } };
  let downloaded: Blob | undefined;
  const original = URL.createObjectURL;
  URL.createObjectURL = blob => { assert.ok(blob instanceof Blob); downloaded = blob; return original(blob); };
  try {
    const error = await withDocument({ createElement: () => anchor }, () => downloadTaskFile(html));
    assert.equal(error, "");
    assert.equal(anchor.download, "文件标注.html");
    assert.equal(anchor.clicked, true);
    assert.ok(downloaded);
    assert.equal(downloaded.type, "text/html;charset=utf-8");
    assert.equal(await downloaded.text(), source);
  } finally { URL.createObjectURL = original; }
});

test("全屏与下载的英文文案", () => {
  assert.equal(globalUiText("en", "全屏"), "Full screen");
  assert.equal(globalUiText("en", "退出全屏"), "Exit full screen");
  assert.equal(globalUiText("en", "下载"), "Download");
});
