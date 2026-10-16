import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { applyTaskFileEdit, createTaskFileRevision } from "../src/features/tasks/files/lib/task-file-editing.ts";

registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
  return nextLoad(url, context);
} });
const { downloadTaskFile, TaskFileViewer } = await import("../src/features/tasks/files/components/TaskFileViewer.tsx");

const examples = [
  { extension: "json", mime: "application/json", source: '{\n  "description": "保留空白",\n\n  "items": [1, 2]\n}\n', edited: '{\n  "description": "修改后的值",\n\n  "items": [1, 2]\n}\n' },
  { extension: "xml", mime: "application/xml", source: '<root>\n  <description>保留空白</description>\n\n  <script>literal text</script>\n</root>\n', edited: '<root>\n  <description>修改后的值</description>\n\n  <script>literal text</script>\n</root>\n' },
];

for (const example of examples) {
  const file: TaskFileNode = { id: example.extension, kind: "file", parentId: null, name: `实际上传.${example.extension}`, updatedAt: "刚刚", mimeType: example.mime, blobId: "original-upload", content: example.source, version: 1 };

  test(`${example.extension} 源码编辑使用一个完整文本框，保留缩进、空行与字面标签`, () => {
    const markup = renderToStaticMarkup(createElement(TaskFileViewer, { file, onChange: () => undefined }));
    assert.equal((markup.match(/<textarea\b/g) ?? []).length, 1, "源码不能被拆成正文段落编辑器");
    assert.match(markup, /spellcheck="false"/i);
    assert.doesNotMatch(markup, /<script>/, "XML中的标签不能作为DOM执行");
    const escaped = example.source.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
    assert.ok(markup.includes(escaped), "完整源码布局原样进入编辑器");
  });

  test(`${example.extension} 保存后下载当前版本源码，不读取首次上传的旧字节`, async () => {
    const revision = createTaskFileRevision(file, { kind: "text", text: example.edited }, "周岚", "2026-10-16T12:00:00Z");
    assert.ok(revision);
    const saved = applyTaskFileEdit(file, revision);
    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    const originalCreateUrl = URL.createObjectURL;
    let downloaded: Blob | undefined;
    const anchor = { href: "", download: "", clicked: false, click() { this.clicked = true; } };
    Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => anchor } });
    URL.createObjectURL = blob => { assert.ok(blob instanceof Blob); downloaded = blob; return originalCreateUrl(blob); };
    try {
      assert.equal(await downloadTaskFile(saved), "");
      assert.equal(anchor.clicked, true);
      assert.equal(anchor.download, file.name);
      assert.ok(downloaded);
      assert.equal(downloaded.type, `${example.mime};charset=utf-8`);
      assert.equal(await downloaded.text(), example.edited);
    } finally {
      URL.createObjectURL = originalCreateUrl;
      if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
      else delete (globalThis as { document?: unknown }).document;
    }
  });
}
