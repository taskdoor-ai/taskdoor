import assert from "node:assert/strict";
import test from "node:test";
import { strFromU8, unzipSync } from "fflate";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { buildFileAnnotationContext, createTaskFileAnnotation, getTaskFileSelectionAnchor, readTaskFileAnnotations, saveTaskFileAnnotations, updateTaskFileAnnotationBody } from "../src/features/tasks/files/lib/task-file-annotations.ts";
import { createFileAnnotationDocument } from "../src/features/tasks/files/lib/task-file-annotation-document.ts";
import { buildFileAnnotationBundle } from "../src/features/tasks/files/lib/task-file-annotation-bundle.ts";

const screenshot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=";
const region = { x: .1, y: .2, width: .4, height: .3 };
const source = (extension: string): TaskFileNode => ({ id: `source-${extension}`, kind: "file", name: `评审.${extension}`, parentId: null, updatedAt: "2026-10-16T10:00:00Z", version: 2, blobId: `original-${extension}` });
const note = (file: TaskFileNode, pageIndex: number | undefined = 2) => createTaskFileAnnotation({ taskId: "task", file, id: `note-${file.id}`, authorId: "author", authorName: "周岚", body: "请调整这片区域。", anchor: { kind: "region", location: "所框区域", quote: "第3页区域", pageIndex, region, screenshot } });
const context = (item: ReturnType<typeof note>) => buildFileAnnotationContext({ taskId: "task", taskTitle: "评审", annotations: [item], selectedIds: [item.id], files: [item.source] });

test("PDF/PPT region anchors require an exact page while old image/HTML regions remain valid", () => {
  for (const extension of ["pdf", "ppt", "pptx"]) {
    const file = source(extension);
    assert.throws(() => createTaskFileAnnotation({ ...note(file), file, anchor: { kind: "region", location: "缺少页码的区域", region } }), /页码/);
    for (const pageIndex of [-1, .5, NaN]) assert.throws(() => note(source(extension), pageIndex), /页码/);
  }
  for (const extension of ["png", "html"]) {
    const item = createTaskFileAnnotation({ taskId: "task", file: source(extension), authorId: "author", authorName: "周岚", body: "旧区域意见", anchor: { kind: "region", location: "旧区域", region } });
    assert.equal(item.anchor.pageIndex, undefined);
    assert.deepEqual(item.anchor.region, region);
    assert.deepEqual(readTaskFileAnnotations({ getItem: () => JSON.stringify([item]) }, "task"), [item]);
  }
});

test("page region creation, author edits and storage round trips keep the fixed source and page", () => {
  // Extracted text is not the page-count authority for retained original bytes.
  const file = { ...source("pdf"), previewData: { kind: "pdf" as const, pages: ["旧文本快照"] } };
  const anchor = getTaskFileSelectionAnchor({ text: "第3页区域", location: "所框区域", pageIndex: 2, region, screenshot });
  assert.equal(anchor.kind, "region");
  assert.equal(anchor.selectionStart, undefined);
  const item = createTaskFileAnnotation({ ...note(source("pdf")), file, anchor });
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  saveTaskFileAnnotations(storage, "task", [item], { actorId: "author", files: [file] });
  const edited = updateTaskFileAnnotationBody(readTaskFileAnnotations(storage, "task"), item.id, "author", "只缩短区域内标题。");
  saveTaskFileAnnotations(storage, "task", edited, { actorId: "author", files: [file] });
  const restored = readTaskFileAnnotations(storage, "task")[0];
  assert.deepEqual(restored.anchor, anchor);
  assert.deepEqual(restored.source, item.source);
  assert.equal(restored.version, 2);
  assert.equal(restored.body, "只缩短区域内标题。");
});

test("page-region handoff labels coordinates as page-relative, never as referenced text", () => {
  const item = note(source("pptx"));
  const value = context(item);
  assert.match(value.markdown, /页码：第 3 页/);
  assert.match(value.markdown, /页内区域（相对本页，范围 0–1）/);
  assert.doesNotMatch(value.markdown, /### 对应原文/);
  const html = createFileAnnotationDocument(value, { taskTitle: "评审", authorName: "周岚" }).content!;
  assert.match(html, /data-anchor-kind="region"/);
  assert.match(html, /data-page-index="2"/);
  assert.match(html, /data-region=/);
  assert.match(html, /第 3 页/);
  assert.ok(html.includes(screenshot));
  assert.doesNotMatch(html, /<blockquote>第3页区域<\/blockquote>|查看原文/);
});

test("page-region bundles retain original PDF/PPT bytes plus page, region and screenshot metadata", async () => {
  for (const extension of ["pdf", "pptx"]) {
    const file: TaskFileNode = extension === "pdf" ? { ...source(extension), previewData: { kind: "pdf", pages: ["旧文本快照"] } } : { ...source(extension), content: "预提取文字不代替幻灯片原件" };
    const item = note(file);
    const original = new Uint8Array([37, 80, 68, 70, 45, 10]);
    const result = await buildFileAnnotationBundle(context(item), "zh-CN", { readBlob: async id => { assert.equal(id, file.blobId); return new Blob([original]); } });
    const entries = unzipSync(result.bytes);
    const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
    assert.equal(manifest.materials[0].representation, "original-bytes");
    assert.ok(manifest.materials[0].path.endsWith(`.${extension}`));
    assert.deepEqual(entries[manifest.materials[0].path], original);
    assert.deepEqual(manifest.annotations[0].anchor, item.anchor);
    assert.deepEqual(entries[manifest.annotations[0].previewPath], new Uint8Array(Buffer.from(screenshot.split(",")[1], "base64")));
    assert.match(strFromU8(entries["修订要求.md"]), /页内区域.*相对本页/);
  }
  const noOriginal = { ...source("pdf"), blobId: undefined, previewData: { kind: "pdf" as const, pages: ["1", "2", "3"] } };
  await assert.rejects(buildFileAnnotationBundle(context(note(noOriginal)), "zh-CN", { readBlob: async () => null }), /原文件|原材料/);
});
