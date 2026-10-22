import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";

register("data:text/javascript," + encodeURIComponent("export async function load(url, context, nextLoad) {\n  if (url.endsWith(\".svg\")) return { format: \"module\", source: \"export default \" + JSON.stringify(url), shortCircuit: true };\n  if (url.endsWith(\".css\")) return { format: \"module\", source: \"export default {}\", shortCircuit: true };\n  return nextLoad(url, context);\n}"), import.meta.url);
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { TaskFileDownload } = await import("../src/features/tasks/files/components/TaskFileDownload.tsx");
const { canDownload, downloadTaskFile } = await import("../src/features/tasks/files/lib/task-file-download.ts");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");
const node = (name: string, patch: Partial<TaskFileNode> = {}): TaskFileNode => ({ id: name, name, kind: "file", parentId: null, updatedAt: "", version: 1, ...patch });

async function captureDownload(run: () => Promise<string>) {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalCreateUrl = URL.createObjectURL;
  const anchor = { href: "", download: "", clicked: false, click() { this.clicked = true; } };
  let bytes: Blob | undefined;
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => anchor } });
  URL.createObjectURL = value => { bytes = value as Blob; return "blob:preview-download-test"; };
  try { return { error: await run(), anchor, bytes }; }
  finally {
    URL.createObjectURL = originalCreateUrl;
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
}

test("every supported preview has a labelled download control", () => {
  for (const name of ["图片.png", "版面.pdf", "讲稿.pptx", "文档.md", "说明.txt", "网页.html", "快照.json", "配置.xml", "简报.mp3", "总览.mp4"]) {
    const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(TaskFileDownload, { file: node(name, { blobId: "existing-original" }) }) }));
    assert.match(html, /aria-label="下载文件"/, name);
    assert.match(html, />下载<\//, `${name}的下载入口有可见文案`);
    assert.doesNotMatch(html, / disabled(?:=|>)/, name);
  }
});

test("an image that can be previewed by src downloads those exact bytes without re-encoding", async () => {
  const image = node("完整图片.webp", { previewData: { kind: "image", alt: "", src: "https://assets.example.test/original.webp" } });
  assert.equal(canDownload(image), true);
  const originalFetch = globalThis.fetch;
  const originalBytes = new Uint8Array([82, 73, 70, 70, 0, 255, 128]);
  const requests: unknown[][] = [];
  globalThis.fetch = async (...args) => { requests.push(args); return new Response(originalBytes, { headers: { "Content-Type": "image/webp" } }); };
  try {
    const result = await captureDownload(() => downloadTaskFile(image));
    assert.equal(result.error, "");
    assert.equal(result.anchor.download, image.name);
    assert.equal(result.anchor.clicked, true);
    assert.deepEqual(new Uint8Array(await result.bytes!.arrayBuffer()), originalBytes);
    assert.equal(result.bytes!.type, "image/webp");
    assert.deepEqual(requests, [[image.previewData!.kind === "image" ? image.previewData.src : "", { credentials: "omit", redirect: "error" }]]);
  } finally { globalThis.fetch = originalFetch; }
});

test("source-only previews cannot masquerade as original PDF or Office files", async () => {
  for (const file of [node("旧资料.pdf", { previewData: { kind: "pdf", pages: ["只有文字摘要"] } }), node("旧表格.xlsx", { previewData: { kind: "table", sheets: [] } }), node("缺失.txt")]) {
    assert.equal(canDownload(file), false, file.name);
    const result = await captureDownload(() => downloadTaskFile(file));
    assert.equal(result.error, "附件原文件无法读取，请重新上传。");
    assert.equal(result.anchor.clicked, false);
    const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(TaskFileDownload, { file }) }));
    assert.match(html, /disabled/, file.name);
    assert.match(html, /原文件不可用，暂无法下载。/, file.name);
  }
});

test("text downloads use the saved version and retain legitimate empty documents", async () => {
  for (const text of ["# 当前保存的 v2\n", ""]) {
    const file = node("当前文档.md", { version: 2, content: text, blobId: "original-upload-v1" });
    assert.equal(canDownload(file), true);
    const result = await captureDownload(() => downloadTaskFile(file));
    assert.equal(result.error, "");
    assert.equal(await result.bytes!.text(), text);
    assert.equal(result.anchor.download, file.name);
  }
});

test("an inaccessible image gives an error without downloading a placeholder", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("missing", { status: 404 });
  try {
    const result = await captureDownload(() => downloadTaskFile(node("图片.png", { previewData: { kind: "image", alt: "", src: "https://assets.example.test/missing.png" } })));
    assert.equal(result.error, "附件原文件无法读取，请重新上传。");
    assert.equal(result.anchor.clicked, false);
  } finally { globalThis.fetch = originalFetch; }
});
