import assert from "node:assert/strict";
import test from "node:test";
import * as annotations from "../src/features/tasks/files/lib/task-file-annotations.ts";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";

const file = (content = "重复段落\n中间内容\n重复段落", version = 1): TaskFileNode => ({
  id: "file-a", kind: "file", parentId: null, name: "方案.md", content, version, updatedAt: "2026-10-15T01:00:00.000Z",
});
const make = (source = file(), overrides = {}) => annotations.createTaskFileAnnotation({
  id: "annotation-a", taskId: "task-a", file: source, authorId: "user-a", authorName: "周岚", body: "缩短这一段，并保留原有重点。",
  anchor: { kind: "text", quote: "重复段落", selectionStart: 10, selectionEnd: 14, location: "第 3 行" },
  createdAt: "2026-10-15T02:00:00.000Z", ...overrides,
});

test("PDF文字选区保留页码与准确偏移，截图范围不把它变成区域标注", () => {
  assert.equal(typeof annotations.getTaskFileSelectionAnchor, "function");
  const source: TaskFileNode = { ...file(), name: "报告.pdf", blobId: "pdf-bytes", mimeType: "application/pdf", previewData: { kind: "pdf", pages: ["旧提取文字", "旧提取文字"] } };
  const anchor = annotations.getTaskFileSelectionAnchor({ text: "重复原文", location: "第 2 页", documentText: "重复原文\n第二处重复原文", selectionStart: 8, selectionEnd: 12, pageIndex: 1, region: { x: .1, y: .2, width: .4, height: .1 } });
  assert.equal(anchor.kind, "text");
  assert.equal(anchor.region, undefined);
  assert.equal(anchor.pageIndex, 1);
  const note = make(source, { anchor });
  assert.deepEqual(annotations.resolveTaskFileAnnotationTextRange(note.anchor, anchor.documentText!), { start: 8, end: 12 });
  const store = storage();
  annotations.saveTaskFileAnnotations(store, "task-a", [note], { actorId: "user-a", files: [source] });
  assert.deepEqual(annotations.readTaskFileAnnotations(store, "task-a")[0].anchor, anchor);
});

test("图片和HTML元素框选继续保留区域锚点，不因元素含文字而转成文字选区", () => {
  assert.equal(typeof annotations.getTaskFileSelectionAnchor, "function");
  const region = { x: .1, y: .2, width: .4, height: .1 };
  assert.equal(annotations.getTaskFileSelectionAnchor({ text: "", location: "图片区域", region }).kind, "region");
  const html = annotations.getTaskFileSelectionAnchor({ text: "主标题", location: "主标题", region, elementSelector: "main > h1" });
  assert.equal(html.kind, "region");
  assert.deepEqual(html.region, region);
  assert.equal(html.elementSelector, "main > h1");
});
function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

test("文本批注按选区偏移锁定重复原文，不自动指向第一个同名段落", () => {
  assert.equal(typeof annotations.createTaskFileAnnotation, "function");
  const note = make();
  assert.deepEqual(annotations.resolveTaskFileAnnotationTextRange(note.anchor, file().content!), { start: 10, end: 14 });
  assert.equal(annotations.resolveTaskFileAnnotationTextRange({ kind: "text", quote: "重复段落", location: "正文" }, file().content!), null);
  assert.throws(() => make(file(), { anchor: { kind: "text", quote: "重复段落", selectionStart: 5, selectionEnd: 9, location: "正文" } }), /原文|选区/);
});

test("交接只包含选中意见和固定旧版快照，不串入新版本或未选意见", () => {
  const old = make();
  const current = file("最新版本正文，不应该替换旧版上下文。", 2);
  const other = make(current, { id: "annotation-b", body: "这条没有选择的意见不能交接。", anchor: { kind: "file", location: "整个文件" } });
  const result = annotations.buildFileAnnotationContext({ taskId: "task-a", taskTitle: "评审方案", annotations: [old, other], selectedIds: [old.id], files: [current] });
  assert.deepEqual(result.items.map(item => item.id), [old.id]);
  assert.match(result.markdown, /固定版本.*v1/);
  assert.match(result.markdown, /当前.*v2/);
  assert.match(result.markdown, /重复段落/);
  assert.match(result.markdown, /缩短这一段/);
  assert.doesNotMatch(result.markdown, /最新版本正文|这条没有选择/);
  assert.equal(old.source.version, 1);
  assert.throws(() => annotations.buildFileAnnotationContext({ taskId: "task-a", taskTitle: "方案", annotations: [old], selectedIds: [old.id], files: [] }), /删除|不存在|交接/);
});

test("修订上下文保留批注意见原文，不自动包含用于沟通的回复", () => {
  const note = make();
  const replied = [{ ...note, replies: [{ id: "legacy", authorId: "user-b", authorName: "李林", body: "沟通回复不属于本次提交的修改要求。", createdAt: "2026-10-15T03:00:00.000Z" }] }];
  const result = annotations.buildFileAnnotationContext({ taskId: "task-a", taskTitle: "评审", annotations: replied, selectedIds: [note.id], files: [file()] });
  assert.match(result.markdown, /缩短这一段/);
  assert.doesNotMatch(result.markdown, /沟通回复不属于|回复补充/);
});

test("英文交接文案保留材料原文，内部存储标识明确需要先下载真实修订包", () => {
  const source = { ...file(), blobId: "taskdoor-internal-blob" };
  const note = make(source);
  const result = annotations.buildFileAnnotationContext({ taskId: "task-a", taskTitle: "中文任务名称", taskGoal: "保留中文目标。", annotations: [note], selectedIds: [note.id], files: [source], locale: "en" });
  assert.match(result.markdown, /^# File revision feedback/);
  assert.match(result.markdown, /Fixed version: v1/);
  assert.match(result.markdown, /Opinion \(original\)/);
  assert.match(result.markdown, /Internal TaskDoor storage ID: taskdoor-internal-blob/);
  assert.match(result.markdown, /download the revision bundle in TaskDoor.*extract/i);
  assert.match(result.markdown, /cannot.*local file path/i);
  assert.match(result.markdown, /中文任务名称|保留中文目标/);
  assert.match(result.markdown, /方案\.md|周岚|缩短这一段|重复段落/);
  assert.doesNotMatch(result.markdown, /批注标识|文件标识|固定版本|提出者|修改意见（原文）|可通过 TaskDoor 文件下载获取原文件/);
});

test("保存新意见仅接受当前有效版本，已保存正文允许作者更正但选区仍不可覆盖", () => {
  const store = storage();
  const note = make();
  annotations.saveTaskFileAnnotations(store, "task-a", [note], { actorId: "user-a", files: [file()] });
  assert.deepEqual(annotations.readTaskFileAnnotations(store, "task-a"), [note]);
  annotations.saveTaskFileAnnotations(store, "task-a", [{ ...note, body: "作者更正后的修改要求" }], { actorId: "user-a", files: [file()] });
  assert.equal(annotations.readTaskFileAnnotations(store, "task-a")[0].body, "作者更正后的修改要求");
  assert.throws(() => annotations.saveTaskFileAnnotations(store, "task-a", [{ ...note, body: "作者更正后的修改要求", anchor: { ...note.anchor, location: "其他位置" } }], { actorId: "user-a", files: [file()] }), /位置|覆盖|不可/);
  assert.throws(() => annotations.saveTaskFileAnnotations(storage(), "task-a", [note], { actorId: "user-a", files: [file("更新", 2)] }), /版本/);
  assert.throws(() => annotations.saveTaskFileAnnotations(storage(), "task-a", [note], { actorId: "user-b", files: [file()] }), /本人|作者/);
});

test("作者编辑意见保留固定快照、选区与回复，非作者和空正文均不能编辑", () => {
  const note = make();
  const replied = [{ ...note, replies: [{ id: "reply", authorId: "user-b", authorName: "李林", body: "一条需要保留的沟通回复", createdAt: "2026-10-15T03:00:00.000Z" }] }];
  assert.equal(typeof annotations.updateTaskFileAnnotationBody, "function");
  const edited = annotations.updateTaskFileAnnotationBody(replied, note.id, "user-a", "保留原重点，调整为两句话。");
  assert.equal(edited[0].body, "保留原重点，调整为两句话。");
  assert.deepEqual({ ...edited[0], body: replied[0].body }, replied[0]);
  assert.equal(replied[0].body, note.body, "编辑不能修改调用方原列表");
  assert.throws(() => annotations.updateTaskFileAnnotationBody(replied, note.id, "user-b", "不是作者"), /作者/);
  assert.throws(() => annotations.updateTaskFileAnnotationBody(replied, note.id, "user-a", "  "), /意见|正文/);
  const store = storage();
  annotations.saveTaskFileAnnotations(store, "task-a", [note], { actorId: "user-a", files: [file()] });
  store.values.set(`${annotations.TASK_FILE_ANNOTATIONS_STORAGE_PREFIX}task-a`, JSON.stringify(replied));
  assert.throws(() => annotations.saveTaskFileAnnotations(store, "task-a", edited, { actorId: "user-b", files: [file()] }), /作者/);
  annotations.saveTaskFileAnnotations(store, "task-a", edited, { actorId: "user-a", files: [file("当前新版本", 2)] });
  assert.deepEqual(annotations.readTaskFileAnnotations(store, "task-a"), edited);
  assert.throws(() => annotations.saveTaskFileAnnotations(store, "task-a", [{ ...edited[0], source: { ...edited[0].source, content: `${edited[0].source.content}\n试图覆盖快照` } }], { actorId: "user-a", files: [file()] }), /源文件|覆盖|不可/);
});

test("局部截图与 HTML 来源随批注保存，截图仅接受有大小限制的 PNG 或 JPEG data URL", () => {
  const screenshot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=";
  const original = make();
  const anchor = { ...original.anchor, screenshot, elementLabel: "主标题", elementSelector: "main > h1" };
  const note = make(file(), { anchor });
  assert.deepEqual(note.anchor, anchor);
  const store = storage();
  annotations.saveTaskFileAnnotations(store, "task-a", [note], { actorId: "user-a", files: [file()] });
  assert.deepEqual(annotations.readTaskFileAnnotations(store, "task-a")[0].anchor, anchor);
  for (const invalid of ["https://example.com/screenshot.png", "blob:temporary-image", "data:image/svg+xml;base64,PHN2Zz4=", "data:image/png;base64,not-base64!"])
    assert.throws(() => make(file(), { anchor: { ...anchor, screenshot: invalid } }), /截图|PNG|JPEG/);
  const oversized = `data:image/png;base64,${"AAAA".repeat(Math.ceil(annotations.TASK_FILE_ANNOTATION_SCREENSHOT_MAX_BYTES / 3) + 1)}`;
  assert.throws(() => make(file(), { anchor: { ...anchor, screenshot: oversized } }), /截图|大小|MiB/);
  assert.equal(make().anchor.screenshot, undefined, "没有截图的既有批注仍有效");
  const context = annotations.buildFileAnnotationContext({ taskId: "task-a", taskTitle: "界面评审", annotations: [note], selectedIds: [note.id], files: [file()] });
  assert.match(context.markdown, /主标题|main > h1/);
  assert.ok(context.markdown.includes(screenshot));
});

test("标注只允许作者编辑和删除，不接受新增回复，旧回复可读取但不进入交接", () => {
  const store = storage();
  const note = make();
  annotations.saveTaskFileAnnotations(store, "task-a", [note], { actorId: "user-a", files: [file()] });
  assert.throws(() => annotations.deleteTaskFileAnnotation([note], note.id, "user-b"), /作者/);
  const replied = [{ ...note, replies: [{ id: "old-reply", authorId: "user-a", authorName: "周岚", body: "旧回复", createdAt: "2026-10-15T03:00:00.000Z" }] }];
  assert.throws(() => annotations.saveTaskFileAnnotations(store, "task-a", replied, { actorId: "user-a", files: [file()] }), /不支持.*回复/);
  assert.throws(() => annotations.saveTaskFileAnnotations(storage(), "task-a", replied, { actorId: "user-a", files: [file()] }), /不支持.*回复/);
  store.values.set(`${annotations.TASK_FILE_ANNOTATIONS_STORAGE_PREFIX}task-a`, JSON.stringify(replied));
  assert.equal(annotations.readTaskFileAnnotations(store, "task-a")[0].replies?.length, 1);
  assert.throws(() => annotations.saveTaskFileAnnotations(store, "task-a", [note], { actorId: "user-a", files: [file()] }), /回复|历史/);
  annotations.saveTaskFileAnnotations(store, "task-a", annotations.deleteTaskFileAnnotation(replied, note.id, "user-a"), { actorId: "user-a", files: [file()] });
  assert.deepEqual(annotations.readTaskFileAnnotations(store, "task-a"), []);
});

test("存储损坏或读写失败时保留原数据并报告失败，不按空列表覆盖", () => {
  const store = storage();
  const key = `${annotations.TASK_FILE_ANNOTATIONS_STORAGE_PREFIX}task-a`;
  store.values.set(key, "{broken");
  assert.throws(() => annotations.readTaskFileAnnotations(store, "task-a"), /损坏/);
  assert.throws(() => annotations.saveTaskFileAnnotations(store, "task-a", [make()], { actorId: "user-a", files: [file()] }), /损坏/);
  assert.equal(store.values.get(key), "{broken");
  assert.throws(() => annotations.readTaskFileAnnotations({ getItem: () => { throw new Error("blocked"); } }, "task-a"), /读取/);
  assert.throws(() => annotations.saveTaskFileAnnotations({ getItem: () => null, setItem: () => { throw new Error("quota"); } }, "task-a", [make()], { actorId: "user-a", files: [file()] }), /保存/);
  assert.throws(() => annotations.saveTaskFileAnnotations({ getItem: () => null, setItem: () => undefined }, "task-a", [make()], { actorId: "user-a", files: [file()] }), /保存/);
});
