import assert from "node:assert/strict";
import test from "node:test";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import type { TaskFileContent } from "../src/features/tasks/files/lib/task-file-editing.ts";

// A missing implementation is an explicit failing assertion during the first TDD run.
const editing = await import("../src/features/tasks/files/lib/task-file-editing.ts").catch((error: unknown) => {
  if (error && typeof error === "object" && "code" in error && error.code === "ERR_MODULE_NOT_FOUND") return null;
  throw error;
});
function api() { assert.ok(editing, "文件编辑数据模块尚未实现"); return editing; }
const revisionDiff = await import("../src/features/tasks/files/lib/task-file-revision-diff.ts").catch((error: unknown) => {
  if (error && typeof error === "object" && "code" in error && error.code === "ERR_MODULE_NOT_FOUND") return null;
  throw error;
});
function comparisonApi() { assert.ok(revisionDiff, "文件版本比较模块尚未实现"); return revisionDiff; }

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

test("新修订快照保存完整真实前后正文，读写后未修改行仍保留", () => {
  const record = changedFile();
  const revision = record.revisions[0];
  assert.deepEqual(revision.beforeContent, { kind: "text", text: textFile.content });
  assert.deepEqual(revision.afterContent, record.content);
  assert.notEqual(revision.afterContent, record.content);
  const storage = new MemoryStorage();
  api().saveTaskFileEdit(storage, "snapshots", record, 4);
  const restored = api().readTaskFileEdits(storage, "snapshots").notes;
  assert.deepEqual(restored, record);
  assert.deepEqual(comparisonApi().getTaskFileRevisionComparison(restored.revisions[0]), {
    mode: "full", contentKind: "text", before: textFile.content,
    after: "第一行\n修改后的第二行\n第三行",
  });
});

test("新修订快照深拷贝 PDF 页与表格行，来源、输入和保存正文互不共享", () => {
  const samples: Array<{ file: TaskFileNode; next: TaskFileContent }> = [
    { file: { ...textFile, name: "说明.pdf", previewData: { kind: "pdf", pages: ["原始页", "第二页"] } }, next: { kind: "pdf", pages: ["新页", "第二页"] } },
    { file: { ...textFile, name: "说明.xlsx", previewData: { kind: "table", sheets: [{ name: "进度", columns: ["事项"], rows: [["原值"]] }] } }, next: { kind: "table", sheets: [{ name: "进度", columns: ["事项"], rows: [["新值"]] }] } },
  ];
  for (const { file, next } of samples) {
    const record = api().createTaskFileRevision(file, next, "真实编辑人", now)!;
    const before = structuredClone(api().getTaskFileContent(file));
    const after = structuredClone(next);
    const revision = record.revisions[0];
    if (next.kind === "pdf" && file.previewData?.kind === "pdf" && record.content.kind === "pdf") {
      next.pages[0] = "改输入";
      file.previewData.pages[0] = "改来源";
      record.content.pages[0] = "改保存正文";
    } else if (next.kind === "table" && file.previewData?.kind === "table" && record.content.kind === "table") {
      next.sheets[0].rows[0][0] = "改输入";
      file.previewData.sheets[0].columns[0] = "改来源";
      record.content.sheets[0].rows[0][0] = "改保存正文";
    } else assert.fail("样本格式不一致");
    assert.deepEqual(revision.beforeContent, before);
    assert.deepEqual(revision.afterContent, after);
    assert.notEqual(revision.beforeContent, revision.afterContent);
  }
});

test("旧修订缺少快照仍可读取保存，仅返回真实修改片段且不补造完整旧文件", () => {
  const record = changedFile();
  delete record.revisions[0].beforeContent;
  delete record.revisions[0].afterContent;
  const storage = new MemoryStorage();
  api().saveTaskFileEdit(storage, "legacy-snapshots", record, 4);
  const restored = api().readTaskFileEdits(storage, "legacy-snapshots").notes;
  assert.deepEqual(restored, record);
  assert.equal(Object.hasOwn(restored.revisions[0], "beforeContent"), false);
  assert.equal(Object.hasOwn(restored.revisions[0], "afterContent"), false);
  const comparison = comparisonApi().getTaskFileRevisionComparison(restored.revisions[0]);
  assert.deepEqual(comparison, { mode: "partial", changes: record.revisions[0].changes });
  assert.equal(Object.hasOwn(comparison, "before"), false);
  assert.equal(Object.hasOwn(comparison, "after"), false);
  if (comparison.mode === "partial") comparison.changes[0].before = "外部修改";
  assert.equal(restored.revisions[0].changes[0].before, "第二行");
  const next = api().createTaskFileRevision(api().applyTaskFileEdit(textFile, restored), { kind: "text", text: "后续真实正文" }, "下一位编辑人", now)!;
  next.revisions = [...restored.revisions, ...next.revisions];
  api().saveTaskFileEdit(storage, "legacy-snapshots", next, 5);
  assert.deepEqual(api().readTaskFileEdits(storage, "legacy-snapshots").notes, next);
});

test("快照缺失单侧、格式损坏或与保存正文矛盾时保护原始记录并拒绝覆盖", () => {
  const storage = new MemoryStorage();
  const record = changedFile();
  api().saveTaskFileEdit(storage, "invalid-snapshots", record, 4);
  const key = [...storage.values.keys()][0];
  const revision = record.revisions[0];
  const invalidSnapshots = [
    { ...revision, beforeContent: undefined },
    { ...revision, afterContent: undefined },
    { ...revision, beforeContent: { kind: "pdf", pages: ["不一致"] } },
    { ...revision, beforeContent: { kind: "text", text: null } },
    { ...revision, afterContent: { kind: "text", text: "与已保存正文矛盾" } },
    { ...revision, beforeContent: { kind: "table", sheets: [{ name: "损坏", columns: ["列"], rows: [null] }] } },
  ];
  for (const invalid of invalidSnapshots) {
    const raw = JSON.stringify({ notes: { ...record, revisions: [invalid] } });
    storage.values.set(key, raw);
    assert.throws(() => api().readTaskFileEdits(storage, "invalid-snapshots"), /损坏/);
    assert.throws(() => api().saveTaskFileEdit(storage, "invalid-snapshots", record, 4), /损坏/);
    assert.equal(storage.values.get(key), raw);
  }
});

test("PDF 与表格比较转换保留真实页边界、工作表名、列与单元格，快照读写保持", () => {
  const samples: Array<{ file: TaskFileNode; next: TaskFileContent; before: string; after: string }> = [
    {
      file: { ...textFile, name: "规范.pdf", previewData: { kind: "pdf", pages: ["标题\n原值", ""] } },
      next: { kind: "pdf", pages: ["标题\n新值", ""] },
      before: "第 1 页\n标题\n原值\n\n第 2 页\n",
      after: "第 1 页\n标题\n新值\n\n第 2 页\n",
    },
    {
      file: { ...textFile, name: "进度.xlsx", previewData: { kind: "table", sheets: [{ name: "进度", columns: ["事项", "说明"], rows: [["验收", "第一行\n第二行"], ["引用", '原文"引号']] }, { name: "空表", columns: [], rows: [] }] } },
      next: { kind: "table", sheets: [{ name: "进度", columns: ["事项", "说明"], rows: [["验收", "第一行\n已确认"], ["引用", '原文"引号']] }, { name: "空表", columns: [], rows: [] }] },
      before: '工作表：进度\n事项\t说明\n验收\t"第一行\n第二行"\n引用\t"原文""引号"\n\n工作表：空表\n',
      after: '工作表：进度\n事项\t说明\n验收\t"第一行\n已确认"\n引用\t"原文""引号"\n\n工作表：空表\n',
    },
  ];
  for (const { file, next, before, after } of samples) {
    const record = api().createTaskFileRevision(file, next, "实际作者", now)!;
    const storage = new MemoryStorage();
    api().saveTaskFileEdit(storage, "structured-snapshots", record, 4);
    const first = api().readTaskFileEdits(storage, "structured-snapshots").notes;
    const second = api().readTaskFileEdits(storage, "structured-snapshots").notes;
    assert.deepEqual(first, record);
    assert.notEqual(first.revisions[0].beforeContent, second.revisions[0].beforeContent);
    assert.notEqual(first.revisions[0].afterContent, first.content);
    assert.deepEqual(comparisonApi().getTaskFileRevisionComparison(first.revisions[0]), { mode: "full", contentKind: next.kind, before, after });
  }
});
