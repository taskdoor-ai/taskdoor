import assert from "node:assert/strict";
import test from "node:test";
import type { TaskFileNode } from "../src/data/taskDetailMocks.ts";

// A missing implementation is an explicit failing assertion during the first TDD run.
const editing = await import("../src/lib/taskFileEditing.ts").catch((error: unknown) => {
  if (error && typeof error === "object" && "code" in error && error.code === "ERR_MODULE_NOT_FOUND") return null;
  throw error;
});
function api() { assert.ok(editing, "文件编辑数据模块尚未实现"); return editing; }

const now = "2026-08-31T05:30:00.000Z";
const textFile: TaskFileNode = { id: "notes", kind: "file", name: "说明.md", parentId: null, updatedAt: "昨天", version: 4, content: "第一行\n第二行\n第三行" };
class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
function changedFile(author = "陈默") {
  const record = api().createTaskFileRevision(textFile, { kind: "text", text: "第一行\n修改后的第二行\n第三行" }, author, now);
  assert.ok(record);
  return record;
}

test("只提取实际格式的已有内容，文本优先使用预览正文且允许空文档", () => {
  const { getTaskFileContent } = api();
  assert.deepEqual(getTaskFileContent(textFile), { kind: "text", text: textFile.content });
  assert.deepEqual(getTaskFileContent({ ...textFile, previewData: { kind: "document", text: "" } }), { kind: "text", text: "" });
  assert.deepEqual(getTaskFileContent({ ...textFile, name: "空白.txt", content: undefined }), { kind: "text", text: "" });
  assert.equal(getTaskFileContent({ ...textFile, name: "清单.xlsx" }), null);
  assert.equal(getTaskFileContent({ ...textFile, name: "扫描.pdf" }), null);
  assert.equal(getTaskFileContent({ ...textFile, name: "图片.png" }), null);
  assert.equal(getTaskFileContent({ ...textFile, name: "附件.bin" }), null);
  assert.equal(getTaskFileContent({ ...textFile, kind: "folder" }), null);
});

test("没有差异不增加版本或产生变更记录", () => {
  assert.equal(api().createTaskFileRevision(textFile, { kind: "text", text: textFile.content! }, "周岚", now), null);
});

test("文本修改保留真实修改人、精确时间、版本和行位置的前后值", () => {
  const record = changedFile("实际编辑人");
  assert.equal(record.fileId, "notes");
  assert.equal(record.version, 5);
  assert.equal(record.revisions.length, 1);
  assert.equal(record.revisions[0].author, "实际编辑人");
  assert.equal(record.revisions[0].createdAt, now);
  assert.equal(record.revisions[0].baseVersion, 4);
  assert.equal(record.revisions[0].version, 5);
  assert.ok(record.revisions[0].id);
  assert.deepEqual(record.revisions[0].changes, [{ location: "第 2 行", before: "第二行", after: "修改后的第二行" }]);
});

test("插入和删除保留真实行位置，不把其后的未修改行登记为修改", () => {
  const inserted = api().createTaskFileRevision(textFile, { kind: "text", text: "新增\n第一行\n第二行\n第三行" }, "周岚", now);
  assert.deepEqual(inserted?.revisions[0].changes, [{ location: "第 1 行", before: "", after: "新增" }]);
  const removed = api().createTaskFileRevision(textFile, { kind: "text", text: "第一行\n第三行" }, "周岚", now);
  assert.deepEqual(removed?.revisions[0].changes, [{ location: "第 2 行（原文）", before: "第二行", after: "" }]);
});

test("空文档可写入并可清空，不回退到占位正文", () => {
  const empty = { ...textFile, content: "" };
  const written = api().createTaskFileRevision(empty, { kind: "text", text: "第一句" }, "周岚", now);
  assert.ok(written);
  const applied = api().applyTaskFileEdit(empty, written);
  const cleared = api().createTaskFileRevision(applied, { kind: "text", text: "" }, "周岚", now);
  assert.ok(cleared);
  assert.equal(api().applyTaskFileEdit(applied, cleared).content, "");
  assert.deepEqual(api().getTaskFileContent(api().applyTaskFileEdit(applied, cleared)), { kind: "text", text: "" });
});

test("PDF 正文修改精确记录页码和行号，不改写成普通文档", () => {
  const pdf: TaskFileNode = { ...textFile, name: "规范.pdf", previewData: { kind: "pdf", pages: ["第一页", "标题\n原值"] } };
  const content = { kind: "pdf" as const, pages: ["第一页", "标题\n新值"] };
  const record = api().createTaskFileRevision(pdf, content, "林洁", now);
  assert.ok(record);
  assert.deepEqual(record.revisions[0].changes, [{ location: "第 2 页 · 第 2 行", before: "原值", after: "新值" }]);
  assert.deepEqual(api().applyTaskFileEdit(pdf, record).previewData, content);
});

test("表格记录实际工作表与单元格坐标，包括列名", () => {
  const table: TaskFileNode = { ...textFile, name: "进度.xlsx", previewData: { kind: "table", sheets: [{ name: "进度", columns: ["事项", "状态"], rows: [["验收", "待确认"]] }] } };
  const content = { kind: "table" as const, sheets: [{ name: "进度", columns: ["事项", "进展"], rows: [["验收", "已确认"]] }] };
  const record = api().createTaskFileRevision(table, content, "梁川", now);
  assert.ok(record);
  assert.deepEqual(record.revisions[0].changes, [
    { location: "进度 · B1", before: "状态", after: "进展" },
    { location: "进度 · B2", before: "待确认", after: "已确认" },
  ]);
  assert.deepEqual(api().applyTaskFileEdit(table, record).previewData, content);
});

test("正文提取和应用均不共享可变数组，更新后同步 content 与 previewData", () => {
  const document: TaskFileNode = { ...textFile, name: "说明.docx", previewData: { kind: "document", text: "原文" } };
  const record = api().createTaskFileRevision(document, { kind: "text", text: "新正文" }, "周岚", now);
  assert.ok(record);
  const next = api().applyTaskFileEdit(document, record);
  assert.equal(next.content, "新正文");
  assert.deepEqual(next.previewData, { kind: "document", text: "新正文" });
  assert.equal(next.version, 5);
  assert.equal(next.updatedAt, now);
  assert.equal(document.content, textFile.content);
  const pdf: TaskFileNode = { ...textFile, name: "规范.pdf", previewData: { kind: "pdf", pages: ["原始页"] } };
  const content = api().getTaskFileContent(pdf);
  assert.ok(content?.kind === "pdf");
  content.pages[0] = "外部修改";
  assert.deepEqual(pdf.previewData, { kind: "pdf", pages: ["原始页"] });
});

test("拒绝格式转换、错文件套用、无作者及非法时间", () => {
  assert.throws(() => api().createTaskFileRevision(textFile, { kind: "pdf", pages: ["替换"] }, "周岚", now), /格式/);
  assert.throws(() => api().applyTaskFileEdit({ ...textFile, id: "other" }, changedFile()), /文件/);
  assert.throws(() => changedFile("  "), /修改人/);
  assert.throws(() => api().createTaskFileRevision(textFile, { kind: "text", text: "新值" }, "周岚", "bad-date"), /时间/);
});

test("较新的来源版本不能被旧本地版本覆盖或回退", () => {
  const record = changedFile();
  const newerSource = { ...textFile, version: 7, content: "较新的来源正文" };
  assert.throws(() => api().applyTaskFileEdit(newerSource, record), /来源版本|版本.*较新|旧.*版本/);
  assert.equal(newerSource.version, 7);
  assert.equal(newerSource.content, "较新的来源正文");
  assert.equal(api().applyTaskFileEdit({ ...textFile, version: record.version }, record).version, record.version);
});

test("保存按任务隔离，刷新后保留正文、真实版本及修改记录", () => {
  const storage = new MemoryStorage();
  const record = changedFile();
  api().saveTaskFileEdit(storage, "task-a", record, 4);
  assert.deepEqual(api().readTaskFileEdits(storage, "task-a").notes, record);
  assert.deepEqual(api().readTaskFileEdits(storage, "task-b"), {});
  assert.ok([...storage.values.keys()].every(key => key.startsWith(api().TASK_FILE_EDITS_STORAGE_PREFIX)));
});

test("后续版本保留既有历史，过期版本不能覆盖最新正文", () => {
  const storage = new MemoryStorage();
  const first = changedFile();
  api().saveTaskFileEdit(storage, "task-a", first, 4);
  const second = api().createTaskFileRevision(api().applyTaskFileEdit(textFile, first), { kind: "text", text: "后续版本" }, "林洁", now);
  assert.ok(second);
  second.revisions = [...second.revisions, ...first.revisions];
  api().saveTaskFileEdit(storage, "task-a", second, 5);
  assert.deepEqual(api().readTaskFileEdits(storage, "task-a").notes, second);
  assert.throws(() => api().saveTaskFileEdit(storage, "task-a", first, 4), /版本|其他/);
  assert.deepEqual(api().readTaskFileEdits(storage, "task-a").notes, second);
});

test("读取/写入异常向调用者抛错，失败后原始记录仍在", () => {
  const storage = new MemoryStorage();
  const record = changedFile();
  api().saveTaskFileEdit(storage, "task-a", record, 4);
  const previous = new Map(storage.values);
  const failingRead = { getItem() { throw new Error("读取被拒绝"); }, setItem() {} };
  assert.throws(() => api().readTaskFileEdits(failingRead, "task-a"), /读取/);
  const failingWrite = { getItem: storage.getItem.bind(storage), setItem() { throw new Error("配额已满"); } };
  assert.throws(() => api().saveTaskFileEdit(failingWrite, "task-b", record, 4), /保存|配额/);
  assert.deepEqual(storage.values, previous);
});

test("损坏的存储不可静默覆盖，原型键保持普通数据且不能污染对象", () => {
  const storage = new MemoryStorage();
  const record = changedFile();
  api().saveTaskFileEdit(storage, "task-a", record, 4);
  const key = [...storage.values.keys()][0];
  storage.values.set(key, "{broken");
  assert.throws(() => api().readTaskFileEdits(storage, "task-a"), /损坏|解析/);
  assert.throws(() => api().saveTaskFileEdit(storage, "task-a", record, 4), /损坏|解析/);
  assert.equal(storage.values.get(key), "{broken");
  const protoFile = { ...textFile, id: "__proto__" };
  const protoRecord = api().createTaskFileRevision(protoFile, { kind: "text", text: "受控正文" }, "周岚", now);
  assert.ok(protoRecord);
  api().saveTaskFileEdit(storage, "__proto__", protoRecord, 4);
  const restored = api().readTaskFileEdits(storage, "__proto__");
  assert.equal(Object.hasOwn(restored, "__proto__"), true);
  assert.deepEqual(restored["__proto__"], protoRecord);
  assert.equal(Object.getPrototypeOf(restored), Object.prototype);
  assert.equal(({} as { polluted?: unknown }).polluted, undefined);
});

test("不接收不完整内容、错误版本和冒充另一文件的存储记录", () => {
  const storage = new MemoryStorage();
  const record = changedFile();
  api().saveTaskFileEdit(storage, "task-a", record, 4);
  const key = [...storage.values.keys()][0];
  for (const invalid of [
    { notes: { ...record, fileId: "elsewhere" } },
    { notes: { ...record, version: -1 } },
    { notes: { ...record, content: { kind: "table", sheets: [{ name: "伪造" }] } } },
    { notes: { ...record, revisions: [{ ...record.revisions[0], author: null }] } },
  ]) {
    storage.values.set(key, JSON.stringify(invalid));
    assert.throws(() => api().readTaskFileEdits(storage, "task-a"), /损坏|记录/);
  }
});

test("最近更新按当前文件版本寻找真实记录，不依赖历史数组顺序", () => {
  const { getTaskFileLastUpdate } = api();
  assert.equal(typeof getTaskFileLastUpdate, "function", "尚未提供最近更新信息函数");
  const current = changedFile("实际修改人").revisions[0];
  const older = { ...current, id: "older", version: 4, baseVersion: 3, author: "旧修改人", createdAt: "2026-08-30T01:00:00.000Z" };
  const newer = { ...current, id: "newer", version: 6, baseVersion: 5, author: "另一版本修改人", createdAt: "2026-09-01T01:00:00.000Z" };
  const file = { ...textFile, version: 5, updatedAt: "不能代替记录时间" };
  for (const revisions of [[current, older, newer], [newer, current, older], [older, newer, current]]) {
    assert.deepEqual(getTaskFileLastUpdate(file, revisions), { author: "实际修改人", updatedAt: now, isExact: true });
  }
});

test("无对应版本时最近更新保留来源时间，不挪用其他版本修改人", () => {
  const { getTaskFileLastUpdate } = api();
  assert.equal(typeof getTaskFileLastUpdate, "function", "尚未提供最近更新信息函数");
  const revisions = changedFile().revisions;
  for (const updatedAt of ["刚刚", "今天", "昨天 10:24", "2 天前", "2026-08-31", "2026-08-31 13:30:00", ""]) {
    assert.deepEqual(getTaskFileLastUpdate({ ...textFile, updatedAt }, revisions), { author: null, updatedAt, isExact: false });
  }
});

test("来源最近更新只有有效 ISO 日期时间才标记为精确，不转换原值", () => {
  const { getTaskFileLastUpdate } = api();
  assert.equal(typeof getTaskFileLastUpdate, "function", "尚未提供最近更新信息函数");
  for (const updatedAt of ["2026-08-31T05:30:00.000Z", "2026-08-31T13:30:00+08:00", "2026-08-31T13:30"]) {
    assert.deepEqual(getTaskFileLastUpdate({ ...textFile, updatedAt }, []), { author: null, updatedAt, isExact: true });
  }
  for (const updatedAt of ["2026-99-31T05:30:00Z", "2026-02-30T05:30:00Z", "2026-08-31T25:30:00Z", "not-a-date"]) {
    assert.deepEqual(getTaskFileLastUpdate({ ...textFile, updatedAt }, []), { author: null, updatedAt, isExact: false });
  }
});
