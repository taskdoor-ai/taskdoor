import assert from "node:assert/strict";
import test from "node:test";
import { zipSync } from "fflate";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { prepareTaskPresentationPreview, readCachedTaskPresentationPreview, subscribeTaskPresentationPreview } from "../src/features/tasks/files/lib/task-presentation-preview-cache.ts";
import { renderTaskFileCover } from "../src/features/tasks/files/lib/render-task-file-cover.ts";

const file = (id: string): TaskFileNode => ({ id, kind: "file", name: "首发汇报.pptx", parentId: null, updatedAt: "", version: 1, blobId: `original-${id}`, mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
const pdfResponse = () => new Response("%PDF-derived-first-page", { headers: { "Content-Type": "application/pdf" } });

test("cover and full viewer share one conversion with unchanged PPT bytes, then reuse the version cache", async () => {
  const originalFetch = globalThis.fetch;
  const source = new Blob(["original PPT bytes"]);
  const sourceFile = file("client-share");
  let calls = 0, finish!: () => void, notifications = 0;
  globalThis.fetch = async (input, init) => {
    calls++; assert.equal(String(input), "/api/task-files/presentation-preview?format=pptx");
    assert.equal(init?.method, "POST");
    assert.deepEqual(init?.headers, { "Content-Type": "application/octet-stream", "X-TaskDoor-Presentation-Preview": "1" });
    assert.equal(init?.body, source);
    await new Promise<void>(resolve => { finish = resolve; });
    return pdfResponse();
  };
  const unsubscribe = subscribeTaskPresentationPreview(sourceFile, () => notifications++);
  try {
    const cover = prepareTaskPresentationPreview(sourceFile, new AbortController().signal, source);
    const viewer = prepareTaskPresentationPreview({ ...sourceFile, id: "same-original-in-viewer" }, new AbortController().signal, source);
    assert.equal(calls, 1);
    finish();
    const [coverPdf, viewerPdf] = await Promise.all([cover, viewer]);
    assert.equal(coverPdf, viewerPdf);
    assert.equal(notifications, 1);
    assert.equal(await source.text(), "original PPT bytes");
    assert.equal(await prepareTaskPresentationPreview(sourceFile, new AbortController().signal, source), coverPdf);
    assert.equal(calls, 1);
    assert.equal(readCachedTaskPresentationPreview({ ...sourceFile, version: 2 }), undefined);
    assert.equal(readCachedTaskPresentationPreview({ ...sourceFile, blobId: "another-original" }), undefined);
  } finally { unsubscribe(); globalThis.fetch = originalFetch; }
});

test("one offscreen cover cannot cancel a shared viewer conversion; all consumers leaving aborts it", async () => {
  const originalFetch = globalThis.fetch;
  let signal!: AbortSignal, finish!: () => void;
  globalThis.fetch = async (_input, init) => {
    signal = init!.signal as AbortSignal;
    await new Promise<void>((resolve, reject) => {
      finish = resolve;
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    });
    return pdfResponse();
  };
  try {
    const first = new AbortController(), second = new AbortController();
    const cover = prepareTaskPresentationPreview(file("client-cancel-shared"), first.signal, new Blob(["ppt"]));
    const viewer = prepareTaskPresentationPreview(file("client-cancel-shared"), second.signal);
    const cancelledCover = assert.rejects(cover, error => error instanceof DOMException && error.name === "AbortError");
    first.abort(); await cancelledCover;
    assert.equal(signal.aborted, false);
    finish(); assert.ok(await viewer);
    const alone = new AbortController();
    const last = prepareTaskPresentationPreview(file("client-cancel-all"), alone.signal, new Blob(["ppt"]));
    const cancelledLast = assert.rejects(last, error => error instanceof DOMException && error.name === "AbortError");
    alone.abort(); await cancelledLast;
    assert.equal(signal.aborted, true);
    assert.equal(readCachedTaskPresentationPreview(file("client-cancel-all")), undefined);
  } finally { globalThis.fetch = originalFetch; }
});

test("conversion service errors remain retryable instead of caching a broken cover", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return calls === 1 ? new Response("unavailable", { status: 503 }) : pdfResponse(); };
  const sourceFile = file("client-retry");
  try {
    await assert.rejects(prepareTaskPresentationPreview(sourceFile, new AbortController().signal, new Blob(["ppt"])), /unavailable/);
    assert.equal(readCachedTaskPresentationPreview(sourceFile), undefined);
    assert.ok(await prepareTaskPresentationPreview(sourceFile, new AbortController().signal, new Blob(["ppt"])));
    assert.equal(calls, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test("a cover uses an embedded real thumbnail without starting conversion", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("不应请求转换服务"); };
  const image = new Uint8Array([255, 216, 255, 224, 1, 2, 3]);
  const deck = new Blob([new Uint8Array(zipSync({ "docProps/thumbnail.jpeg": image }))]);
  try {
    const cover = await renderTaskFileCover(file("client-embedded"), new AbortController().signal, deck);
    assert.ok(cover); assert.equal(cover.type, "image/jpeg");
    assert.deepEqual(new Uint8Array(await cover.arrayBuffer()), image);
  } finally { globalThis.fetch = originalFetch; }
});
