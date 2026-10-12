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

test("全屏只作用于查看器，只用 Esc 退出，按钮在文件名右侧、版本左侧", () => {
  assert.match(explorer, /className="task-file-explorer-viewer" onScroll=\{\(\) => setSelection\(null\)\} ref=\{viewerRef\}/);
  const fullscreen = explorer.indexOf("<FullscreenButton");
  assert.ok(fullscreen > explorer.indexOf("task-file-editor-path"), "在文件名之后");
  assert.ok(fullscreen < explorer.indexOf('<History size={16} />{ui("版本")}'), "在版本之前");
  assert.match(explorer, /\{!isEditing && !loadError && <FullscreenButton [^>]*target=\{viewerRef\}/, "编辑中或读取失败不显示");
  assert.match(button, /requestFullscreen\(\)\.catch\(\(\) => \{\}\)/);
  assert.match(button, /task-file-viewer-unsupported/, "无法预览时不显示");
  assert.match(button, /fullscreenchange/);
  for (const source of [explorer, button]) assert.doesNotMatch(source, /exitFullscreen|退出全屏/);
});

test("全屏时查看器铺满页面底色，图片和 PDF 按屏幕高度适配", () => {
  const css = read("features/tasks/styles/task-file-editor.css");
  assert.match(css, /\.task-file-explorer-viewer:fullscreen \{[^}]*background: var\(--ad-canvas\)/);
  assert.match(css, /:fullscreen[^{]*\.task-file-original-pdf[^{]*\{[^}]*100dvh/);
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

test("全屏与下载的英文文案", () => {
  assert.equal(globalUiText("en", "全屏"), "Full screen");
  assert.equal(globalUiText("en", "下载"), "Download");
});
