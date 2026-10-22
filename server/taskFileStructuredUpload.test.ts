import assert from "node:assert/strict";
import { after, test } from "node:test";
import { prepareDiscussionUpload, readDiscussionBlob } from "../src/features/tasks/files/lib/discussion-uploads.ts";
import { getPreviewKind } from "../src/features/tasks/files/lib/task-file-tree.ts";
import * as taskUploads from "../src/features/tasks/files/lib/task-file-upload.ts";

// Node has no IndexedDB. This storage-only substitute keeps the real File reading
// and upload preparation paths under test, including the retained original blob.
const records = new Map<string, { id: string; blob: Blob }>();
const previousIndexedDb = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
const database = {
  transaction() {
    const transaction = {
      oncomplete: null as (() => void) | null,
      objectStore: () => ({
        put(record: { id: string; blob: Blob }) {
          records.set(record.id, record);
          queueMicrotask(() => transaction.oncomplete?.());
        },
        get(id: string) {
          const request = { result: records.get(id), onsuccess: null as (() => void) | null };
          queueMicrotask(() => request.onsuccess?.());
          return request;
        },
      }),
    };
    return transaction;
  },
};
Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: {
  open() {
    const request = { result: database, onsuccess: null as (() => void) | null };
    queueMicrotask(() => request.onsuccess?.());
    return request;
  },
} });
after(() => {
  if (previousIndexedDb) Object.defineProperty(globalThis, "indexedDB", previousIndexedDb);
  else Reflect.deleteProperty(globalThis, "indexedDB");
});

test("任务文件在真实1GiB边界内可接收，超限先于读取和存储拒绝", async () => {
  const limit = 1024 ** 3;
  assert.equal(taskUploads.TASK_FILE_UPLOAD_MAX_BYTES, limit);
  for (const size of [0, limit - 1, limit]) assert.doesNotThrow(() => taskUploads.validateTaskFileUploadSizes([{ name: "原件.pdf", size }]));
  const before = records.size;
  let reads = 0;
  const oversized = { name: "超大.pdf", size: limit + 1, type: "application/pdf", text: async () => { reads++; return ""; } } as File;
  assert.throws(() => taskUploads.validateTaskFileUploadSizes([oversized]), /1GB/);
  await assert.rejects(taskUploads.prepareTaskFileUpload(oversized), /1GB/);
  assert.equal(reads, 0);
  assert.equal(records.size, before);
});

test("真实32MiB任务文件越过旧20MiB限制，保留原Blob；讨论仍拒绝", async () => {
  const bytes = new Uint8Array(32 * 1024 * 1024);
  bytes[0] = 37; bytes[bytes.length - 1] = 127;
  const original = new File([bytes], "大文件.pdf", { type: "application/pdf" });
  const node = await taskUploads.prepareTaskFileUpload(original);
  assert.equal(node.sizeBytes, original.size);
  const retained = await readDiscussionBlob(node.blobId!);
  assert.equal(retained, original);
  assert.equal(new Uint8Array(await retained!.slice(0, 1).arrayBuffer())[0], 37);
  assert.equal(new Uint8Array(await retained!.slice(-1).arrayBuffer())[0], 127);
  await assert.rejects(prepareDiscussionUpload(original), /20\.97 MB/);
});

test("大文本任务文件保留原Blob且不预读全文，小文本仍可编辑", async () => {
  const original = new File([new Uint8Array(32 * 1024 * 1024)], "大文本.txt", { type: "text/plain" });
  let reads = 0;
  Object.defineProperty(original, "text", { value: async () => { reads++; throw new Error("不得预读大文本"); } });
  const node = await taskUploads.prepareTaskFileUpload(original);
  assert.equal(reads, 0);
  assert.equal(node.content, undefined);
  assert.equal(node.previewData, undefined);
  assert.equal(await readDiscussionBlob(node.blobId!), original);
  const small = await taskUploads.prepareTaskFileUpload(new File(["原文\n"], "可编辑.txt", { type: "text/plain" }));
  assert.equal(small.content, "原文\n");
});

test("上传大小按真实字节显示十进制 KB 和 MB，原件大小不变", async () => {
  for (const [size, label] of [[4096, "4.1 KB"], [2_000_000, "2.0 MB"]] as const) {
    const original = new File([new Uint8Array(size)], "原件.pdf", { type: "application/pdf" });
    const node = await prepareDiscussionUpload(original);
    assert.equal(node.sizeBytes, size);
    assert.equal(node.sizeLabel, label);
    assert.equal((await readDiscussionBlob(node.blobId!))?.size, size);
  }
});

test("actual JSON/XML uploads preserve source whitespace and original bytes without preset preview data", async () => {
  const sources = [
    { name: "快照.json", type: "", kind: "json", text: '  {\r\n  "name": "原文", "count": 2\r\n}\n' },
    { name: "未格式化.JSON", type: "text/plain", kind: "json", text: '{ "z":1, "a": [2,3] }\n' },
    { name: "配置.xml", type: "", kind: "xml", text: '<?xml version="1.0"?>\r\n<!-- 原文 -->\r\n<配置 属性="值">  保留空格 </配置>\r\n' },
    { name: "配置.XML", type: "application/octet-stream", kind: "xml", text: '<root>\n  <value />\n</root>\n' },
  ];
  for (const source of sources) {
    const original = new File([source.text], source.name, { type: source.type });
    const node = await prepareDiscussionUpload(original);
    assert.equal(getPreviewKind(node.name, node.mimeType), source.kind);
    assert.equal(node.mimeType, `application/${source.kind}`);
    assert.equal(node.content, source.text);
    assert.deepEqual(node.previewData, { kind: "text", text: source.text });
    assert.equal(node.originalName, source.name);
    assert.ok(node.blobId);
    const retained = await readDiscussionBlob(node.blobId);
    assert.ok(retained);
    assert.deepEqual(new Uint8Array(await retained.arrayBuffer()), new Uint8Array(await original.arrayBuffer()));
  }
});

test("MIME-only JSON/XML uploads read the actual file and use canonical source MIME types", async () => {
  for (const [mime, kind] of [
    [" Application/JSON ; charset=UTF-8", "json"],
    ["application/ld+json", "json"],
    ["application/vnd.taskdoor+json", "json"],
    ["application/xml", "xml"],
    ["Text/XML; charset=utf-8", "xml"],
    ["application/vnd.taskdoor+xml", "xml"],
  ]) {
    const text = kind === "json" ? '{\n "raw": true\n}\n' : '<root>\n  原文\n</root>\n';
    const node = await prepareDiscussionUpload(new File([text], "source", { type: mime }));
    assert.equal(node.content, text, mime);
    assert.deepEqual(node.previewData, { kind: "text", text }, mime);
    assert.equal(node.mimeType, `application/${kind}`, mime);
    assert.equal(getPreviewKind(node.name, node.mimeType), kind, mime);
    assert.equal(await (await readDiscussionBlob(node.blobId!))?.text(), text, mime);
  }
});

test("SVG uploads remain original images instead of becoming XML source", async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" /></svg>';
  for (const [name, type] of [["流程.svg", "application/xml"], ["source", "image/svg+xml"]]) {
    const node = await prepareDiscussionUpload(new File([svg], name, { type }));
    assert.equal(getPreviewKind(node.name, node.mimeType), "image");
    assert.equal(node.content, undefined);
    assert.equal(node.previewData, undefined);
    assert.equal(await (await readDiscussionBlob(node.blobId!))?.text(), svg);
  }
});

test("unsupported uploads fail before reading content or storing any original blob", async () => {
  const before = records.size;
  for (const name of ["合同.docx", "预算.xlsx", "明细.csv", "组件.mdx", "照片.heic", "资料.zip", "配置.data"]) {
    let reads = 0;
    const file = new File(["not supported"], name, { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => { reads++; return "not supported"; } });
    await assert.rejects(prepareDiscussionUpload(file), error => error instanceof Error && error.message.includes(name) && error.message.includes("不支持"));
    assert.equal(reads, 0, name);
    assert.equal(records.size, before, name);
  }
});

test("supported extensionless plain text and HTML uploads retain readable source", async () => {
  for (const type of ["text/plain", "application/xhtml+xml"]) {
    const source = type === "text/plain" ? "保留正文\n\n下一段\n" : "<html><p>原文</p></html>";
    const node = await prepareDiscussionUpload(new File([source], "source", { type }));
    assert.equal(node.content, source);
    assert.deepEqual(node.previewData, { kind: "text", text: source });
    assert.equal(await (await readDiscussionBlob(node.blobId!))?.text(), source);
  }
});

test("MP3/MP4 uploads normalize playback MIME while keeping original binary bytes and no text snapshot", async () => {
  const bytes = new Uint8Array([0, 255, 1, 73, 68, 51, 2, 128]);
  for (const [name, type, mime, kind] of [["简报.MP3", "text/plain", "audio/mpeg", "audio"], ["总览.mp4", "", "video/mp4", "video"], ["原件", "audio/mp3", "audio/mpeg", "audio"], ["原件", "video/mp4", "video/mp4", "video"]]) {
    const original = new File([bytes], name, { type });
    const node = await prepareDiscussionUpload(original);
    assert.equal(node.mimeType, mime);
    assert.equal(getPreviewKind(node.name, node.mimeType), kind);
    assert.equal(node.content, undefined);
    assert.equal(node.previewData, undefined);
    assert.deepEqual(new Uint8Array(await (await readDiscussionBlob(node.blobId!))!.arrayBuffer()), bytes);
  }
});
