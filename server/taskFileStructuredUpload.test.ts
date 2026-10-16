import assert from "node:assert/strict";
import { after, test } from "node:test";
import { prepareDiscussionUpload, readDiscussionBlob } from "../src/features/tasks/files/lib/discussion-uploads.ts";
import { getPreviewKind } from "../src/features/tasks/files/lib/task-file-tree.ts";

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
