import assert from "node:assert/strict";
import test from "node:test";
import { unzipSync, strFromU8 } from "fflate";
import * as bundle from "../src/features/tasks/files/lib/task-file-annotation-bundle.ts";
import { buildFileAnnotationContext, createTaskFileAnnotation } from "../src/features/tasks/files/lib/task-file-annotations.ts";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";

const note = (file: TaskFileNode, id: string, body = "请根据标注缩短这一部分。") => createTaskFileAnnotation({
  file, taskId: "task-a", id, authorId: "user-a", authorName: "周岚", body,
  anchor: { kind: "file", location: "整个文件" }, createdAt: "2026-10-15T01:00:00.000Z",
});
const file = (id: string, version = 1): TaskFileNode => ({ id, kind: "file", name: "方案.md", parentId: null, content: `固定版正文 ${version}`, version, updatedAt: "昨天" });
const context = (items: ReturnType<typeof note>[]) => buildFileAnnotationContext({ taskId: "task-a", taskTitle: "评审方案", annotations: items, selectedIds: items.map(item => item.id), files: items.map(item => item.source) });

test("下载包真实包含固定版正文，按文件和版本去重，并给每条意见提供本地材料路径", async () => {
  assert.equal(typeof bundle.buildFileAnnotationBundle, "function");
  const source = file("file-a");
  const notes = [note(source, "a"), note(source, "b"), note(file("file-a", 2), "c")];
  const result = await bundle.buildFileAnnotationBundle(context(notes), "zh-CN", { readBlob: async () => null });
  const entries = unzipSync(result.bytes);
  assert.ok(entries["修订要求.md"]);
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  assert.equal(manifest.materials.length, 2);
  assert.equal(manifest.annotations.length, 3);
  assert.equal(manifest.annotations[0].materialPath, manifest.annotations[1].materialPath);
  assert.notEqual(manifest.annotations[0].materialPath, manifest.annotations[2].materialPath);
  assert.equal(strFromU8(entries[manifest.annotations[0].materialPath]), "固定版正文 1");
  assert.equal(strFromU8(entries[manifest.annotations[2].materialPath]), "固定版正文 2");
  assert.match(strFromU8(entries["修订要求.md"]), new RegExp(manifest.annotations[0].materialPath));
  assert.equal(manifest.annotations[0].body, notes[0].body);
  assert.deepEqual(manifest.annotations[0].anchor, notes[0].anchor);
});

test("局部 PNG 截图导出为真实预览文件，保留意见原文、固定版本和完整 HTML 来源", async () => {
  const screenshot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=";
  const source: TaskFileNode = { ...file("html-source", 3), name: "预览页面.html", mimeType: "text/html", content: "<!doctype html><html><body><h1>原始标题</h1></body></html>", previewData: { kind: "text", text: "原始标题" } };
  const annotated = createTaskFileAnnotation({ ...note(source, "screenshot-opinion", "标题需要缩短，保留既有重点。"), file: source,
    anchor: { kind: "file", location: "主标题", screenshot, elementLabel: "原始标题", elementSelector: "h1" } });
  const originalContext = context([annotated]);
  const result = await bundle.buildFileAnnotationBundle(originalContext, "zh-CN", { readBlob: async () => null });
  const entries = unzipSync(result.bytes);
  const manifest = result.manifest.annotations[0];
  assert.match(manifest.previewPath ?? "", /^previews\/.*\.png$/);
  assert.deepEqual(entries[manifest.previewPath!], new Uint8Array(Buffer.from(screenshot.split(",")[1], "base64")));
  const markdown = strFromU8(entries["修订要求.md"]);
  assert.ok(markdown.includes(`](${manifest.previewPath})`));
  assert.equal(markdown.includes(screenshot), false);
  assert.equal(manifest.body, annotated.body);
  assert.equal(manifest.version, 3);
  assert.deepEqual(manifest.anchor, annotated.anchor);
  assert.match(manifest.materialPath, /\.html$/);
  assert.equal(result.manifest.materials[0].representation, "saved-text");
  assert.equal(strFromU8(entries[manifest.materialPath]), source.content);
  assert.ok(originalContext.markdown.includes(screenshot), "包外预览与连接上下文保留内嵌截图");
});

test("保留原附件字节，结构化预览使用明确的 txt/json 扩展名且不伪装二进制", async () => {
  const pdf: TaskFileNode = { ...file("pdf"), name: "评审.pdf", content: undefined, blobId: "original-pdf" };
  const table: TaskFileNode = { ...file("table"), name: "预算.xlsx", content: undefined, previewData: { kind: "table", sheets: [{ name: "预算", columns: ["项目", "费用"], rows: [["拍摄", "3000"]] }] } };
  const textPdf: TaskFileNode = { ...file("preview-pdf"), name: "旧版.pdf", content: undefined, previewData: { kind: "pdf", pages: ["第一页实际预览正文"] } };
  const original = new Blob([new Uint8Array([37, 80, 68, 70, 45])], { type: "application/pdf" });
  const reads: string[] = [];
  const result = await bundle.buildFileAnnotationBundle(context([note(pdf, "p"), note(table, "t"), note(textPdf, "x")]), "en", { readBlob: async id => { reads.push(id); return original; } });
  const entries = unzipSync(result.bytes);
  assert.ok(entries["Revision-feedback.md"]);
  assert.deepEqual(reads, ["original-pdf"]);
  const [pdfMaterial, tableMaterial, textMaterial] = result.manifest.materials;
  assert.deepEqual([...entries[pdfMaterial.path]], [37, 80, 68, 70, 45]);
  assert.equal(pdfMaterial.representation, "original-bytes");
  assert.match(tableMaterial.path, /\.preview\.json$/);
  assert.equal(JSON.parse(strFromU8(entries[tableMaterial.path])).sheets[0].rows[0][1], "3000");
  assert.match(textMaterial.path, /\.preview\.txt$/);
  assert.match(strFromU8(entries[textMaterial.path]), /第一页实际预览正文/);
  assert.match(tableMaterial.description, /预览|preview/i);
});

test("已编辑文本固定新版使用保存正文，不能把仍指向初次上传的 bytes 当成新版本", async () => {
  const saved: TaskFileNode = { ...file("edited", 2), blobId: "old-upload" };
  const result = await bundle.buildFileAnnotationBundle(context([note(saved, "edited-note")]), "zh-CN", { readBlob: async () => new Blob(["初次上传的旧正文"]) });
  const entries = unzipSync(result.bytes);
  assert.equal(strFromU8(entries[result.manifest.materials[0].path]), "固定版正文 2");
  assert.equal(result.manifest.materials[0].representation, "saved-text");
});

for (const [extension, mimeType, content] of [
  ["json", "application/json", '{\n  "count": 2,\n  "label": "新版"\n}\n'],
  ["xml", "application/xml", '<?xml version="1.0"?>\n<配置 count="2">新版</配置>\n'],
]) {
  test(`修改后的 ${extension.toUpperCase()} 修订包保留扩展名和当前源码，不回退旧附件`, async () => {
    const source: TaskFileNode = { ...file(`code-${extension}`, 2), name: `配置.${extension}`, mimeType, content, previewData: { kind: "text", text: content }, blobId: "old-code-upload" };
    const result = await bundle.buildFileAnnotationBundle(context([note(source, `code-note-${extension}`)]), "zh-CN", { readBlob: async () => null });
    const material = result.manifest.materials[0];
    const entries = unzipSync(result.bytes);
    assert.equal(material.representation, "saved-text");
    assert.ok(material.path.endsWith(`配置.${extension}`));
    assert.equal(strFromU8(entries[material.path]), content);
    assert.equal(result.manifest.annotations[0].materialPath, material.path);
  });
}

test("manifest 只交接批注意见，不把用于沟通的回复正文转成修订要求", async () => {
  const annotated = { ...note(file("with-replies"), "opinion"), replies: [{ id: "reply", authorId: "user-b", authorName: "李林", createdAt: "2026-10-15T02:00:00.000Z", body: "讨论用的补充回复，不属于本次修订意见。" }] };
  const result = await bundle.buildFileAnnotationBundle(context([annotated]), "zh-CN", { readBlob: async () => null });
  assert.equal(Object.hasOwn(result.manifest.annotations[0], "replies"), false);
  assert.doesNotMatch(JSON.stringify(result.manifest), /讨论用的补充回复/);
  assert.doesNotMatch(strFromU8(unzipSync(result.bytes)["修订要求.md"]), /讨论用的补充回复/);
});

test("缺失原件、读取失败和临时图片 URL 都拒绝生成交接包", async () => {
  const source = { ...file("missing"), content: undefined, blobId: "missing-bytes" };
  await assert.rejects(bundle.buildFileAnnotationBundle(context([note(source, "missing-note")]), "zh-CN", { readBlob: async () => null }), /原文件|原材料|读取/);
  await assert.rejects(bundle.buildFileAnnotationBundle(context([note(source, "failed-note")]), "zh-CN", { readBlob: async () => { throw new Error("存储读取失败"); } }), /读取/);
  const image: TaskFileNode = { ...file("temporary"), name: "截图.png", content: undefined, previewData: { kind: "image", src: "blob:expired-image", alt: "临时截图" } };
  await assert.rejects(bundle.buildFileAnnotationBundle(context([note(image, "image-note")]), "zh-CN", { readBlob: async () => null }), /临时|原文件|图片/);
});
