import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import React, { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FullscreenButton from "../src/features/tasks/files/components/FullscreenButton.tsx";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith(".svg")) return { format: "module", source: `export default ${JSON.stringify(url)}`, shortCircuit: true };
  if (url.endsWith(".css")) return { format: "module", source: "export default {}", shortCircuit: true };
  return nextLoad(url, context);
} });
const { TaskFileGlyph } = await import("../src/features/tasks/files/components/TaskFileGlyph.tsx");

function renderFullscreen(kind: string, fullscreenEnabled = true): string {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { fullscreenEnabled } });
  try {
    return renderToStaticMarkup(createElement(FullscreenButton, { kind, onSelection: () => {}, target: createRef<HTMLElement>() }));
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else delete (globalThis as { document?: unknown }).document;
  }
}

for (const kind of ["json", "xml"]) {
  test(`${kind.toUpperCase()} 源码查看提供全屏入口，浏览器禁止全屏时仍隐藏`, () => {
    assert.match(renderFullscreen(kind), /aria-label="Full screen"/);
    assert.equal(renderFullscreen(kind, false), "");
  });
}

test("JSON/XML按扩展名和MIME识别格式", () => {
  const source: TaskFileNode = { id: "code", kind: "file", name: "配置.json", parentId: null, updatedAt: "今天" };
  for (const [name, mimeType, format] of [
    ["配置.json", "application/json", "json"],
    ["配置.xml", "application/xml", "xml"],
    ["配置", "application/problem+json; charset=utf-8", "json"],
    ["配置", "text/xml; charset=utf-8", "xml"],
  ]) {
    const markup = renderToStaticMarkup(createElement(TaskFileGlyph, { node: { ...source, name, mimeType } }));
    assert.ok(markup.includes(`data-format="${format}"`), name);
  }
  const svg = renderToStaticMarkup(createElement(TaskFileGlyph, { node: { ...source, name: "图.svg", mimeType: "image/svg+xml" } }));
  assert.match(svg, /data-format="image"/);
});
