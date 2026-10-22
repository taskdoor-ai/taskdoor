import assert from "node:assert/strict";
import test from "node:test";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { hasTaskFileVisualCover, hasVideoFramePicture, taskFileThumbnailKey, taskVideoCoverTimes } from "../src/features/tasks/files/lib/task-file-cover.ts";
import { TaskFileThumbnailCache } from "../src/features/tasks/files/lib/task-file-thumbnail-cache.ts";
import { cacheTaskPresentationPreview, readCachedTaskPresentationPreview, subscribeTaskPresentationPreview } from "../src/features/tasks/files/lib/task-presentation-preview-cache.ts";
import { renderTaskFileCover } from "../src/features/tasks/files/lib/render-task-file-cover.ts";

const file: TaskFileNode = { id: "cover", kind: "file", name: "总览.mp4", parentId: null, updatedAt: "", version: 1, blobId: "blob-cover-original" };
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

test("cover cache follows original bytes and exact version, never filename or latest file id", () => {
  const key = taskFileThumbnailKey(file);
  assert.equal(taskFileThumbnailKey({ ...file, id: "another-reference", name: "改名.mp4" }), key);
  assert.notEqual(taskFileThumbnailKey({ ...file, version: 2 }), key);
  assert.notEqual(taskFileThumbnailKey({ ...file, blobId: "new-original" }), key);
  const image: TaskFileNode = { ...file, name: "image.png", blobId: undefined, previewData: { kind: "image", alt: "", src: "data:image/png;base64,b2xk" } };
  assert.notEqual(taskFileThumbnailKey(image), taskFileThumbnailKey({ ...image, previewData: { kind: "image", alt: "", src: "data:image/png;base64,bmV3" } }));
  const draft = { ...file, blobId: undefined };
  assert.notEqual(taskFileThumbnailKey(draft, new Blob(["first"])), taskFileThumbnailKey(draft, new Blob(["second"])));
  assert.equal(taskFileThumbnailKey(file, new Blob(["same stored original"])), key);
});

test("visual sources cover image/video/PDF/PPT or an existing real image preview; audio and plain sources keep glyphs", () => {
  for (const name of ["image.png", "video.mp4", "doc.pdf", "slides.pptx"]) assert.equal(hasTaskFileVisualCover({ ...file, name }), true);
  for (const name of ["audio.mp3", "config.json", "config.xml", "readme.md", "web.html", "notes.txt"]) assert.equal(hasTaskFileVisualCover({ ...file, name }), false);
  assert.equal(hasTaskFileVisualCover({ ...file, name: "readme.md", previewData: { kind: "image", alt: "", src: "data:image/png;base64,Y292ZXI=" } }), true);
});

test("video samples remain inside duration and distinguish a picture from a black/transparent frame", () => {
  for (const duration of [0.01, 0.2, 0.7, 2, 13.2]) {
    const times = taskVideoCoverTimes(duration);
    assert.ok(times.every(time => time >= 0 && time < duration));
    assert.deepEqual(times, [...times].sort((a, b) => a - b));
  }
  assert.deepEqual(taskVideoCoverTimes(Infinity), [0]);
  assert.equal(hasVideoFramePicture(new Uint8ClampedArray(64)), false);
  const black = new Uint8ClampedArray(64); for (let index = 3; index < black.length; index += 4) black[index] = 255;
  assert.equal(hasVideoFramePicture(black), false);
  assert.equal(hasVideoFramePicture(new Uint8ClampedArray(64).fill(240)), true);
  const darkPicture = black.slice(); darkPicture[0] = darkPicture[1] = darkPicture[2] = 40;
  assert.equal(hasVideoFramePicture(darkPicture), true);
});

test("simultaneous references share one cover job and release only after the final subscriber leaves", async () => {
  const cache = new TaskFileThumbnailCache();
  let jobs = 0;
  let aborted = false;
  const load = (signal: AbortSignal) => new Promise<Blob | null>((_resolve, reject) => {
    jobs++;
    signal.addEventListener("abort", () => { aborted = true; reject(new DOMException("Aborted", "AbortError")); }, { once: true });
  });
  const first = cache.acquire("shared", load), second = cache.acquire("shared", load);
  const failure = assert.rejects(first.promise, error => error instanceof DOMException && error.name === "AbortError");
  await tick();
  assert.equal(jobs, 1);
  assert.equal(first.promise, second.promise);
  first.release(); assert.equal(aborted, false);
  second.release(); assert.equal(aborted, true);
  await failure;
});

test("offscreen work is queued with at most two decoders and finished covers are reused", async () => {
  const cache = new TaskFileThumbnailCache();
  const finishes: Array<() => void> = [];
  let jobs = 0, active = 0, maximum = 0;
  const load = async () => { jobs++; active++; maximum = Math.max(maximum, active); await new Promise<void>(resolve => finishes.push(resolve)); active--; return new Blob(["cover"]); };
  const first = cache.acquire("a", load), second = cache.acquire("b", load), third = cache.acquire("c", load);
  await tick(); assert.equal(jobs, 2);
  finishes.shift()!(); await first.promise; await tick(); assert.equal(jobs, 3);
  finishes.splice(0).forEach(finish => finish());
  await Promise.all([second.promise, third.promise]);
  first.release(); second.release(); third.release();
  const cached = cache.acquire("a", load); await cached.promise; cached.release();
  assert.equal(jobs, 3);
  assert.equal(maximum, 2);
});

test("cover cache evicts unobserved bytes and can retry a failed job without poisoning later views", async () => {
  const cache = new TaskFileThumbnailCache(1, 8);
  let jobs = 0;
  const load = async () => { jobs++; return new Blob(["12345678"]); };
  const first = cache.acquire("a", load); await first.promise; first.release();
  const second = cache.acquire("b", load); await second.promise; second.release();
  const again = cache.acquire("a", load); await again.promise; again.release();
  assert.equal(jobs, 3);
  const failed = cache.acquire("bad", async () => { throw new Error("decode"); });
  await assert.rejects(failed.promise, /decode/); failed.release();
  const retried = cache.acquire("bad", load); assert.ok(await retried.promise); retried.release();
});

test("a viewer-produced presentation PDF notifies only matching source/version subscribers", () => {
  const slides = { ...file, id: "slides-cache-test", name: "汇报.pptx", blobId: "slides-cache-test-original" };
  const pdf = new Blob(["%PDF-real-derived-preview"], { type: "application/pdf" });
  let notifications = 0;
  const unsubscribe = subscribeTaskPresentationPreview(slides, () => notifications++);
  cacheTaskPresentationPreview(slides, pdf);
  assert.equal(readCachedTaskPresentationPreview({ ...slides, id: "same-source-another-card" }), pdf);
  assert.equal(readCachedTaskPresentationPreview({ ...slides, version: 2 }), undefined);
  assert.equal(readCachedTaskPresentationPreview({ ...slides, blobId: "different-source" }), undefined);
  assert.equal(notifications, 1);
  unsubscribe(); cacheTaskPresentationPreview(slides, pdf); assert.equal(notifications, 1);
});

test("video cover seeks past black frames without play and releases its media URL/canvas", async () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalCreateUrl = URL.createObjectURL, originalRevokeUrl = URL.revokeObjectURL;
  const seeks: number[] = [], released: string[] = [];
  let played = 0, paused = 0, source = "", currentTime = 0, loads = 0;
  const events = new EventTarget();
  const video = Object.assign(events, {
    duration: 13.2, videoWidth: 1920, videoHeight: 1080, muted: false, preload: "", playsInline: false,
    get src() { return source; }, set src(value: string) { source = value; },
    get currentTime() { return currentTime; }, set currentTime(value: number) { currentTime = value; seeks.push(value); queueMicrotask(() => events.dispatchEvent(new Event("seeked"))); },
    play: () => { played++; }, pause: () => { paused++; }, removeAttribute: (name: string) => { if (name === "src") source = ""; },
    load: () => { loads++; if (source) queueMicrotask(() => events.dispatchEvent(new Event("loadeddata"))); },
  });
  // Object.assign copies accessors as values, so keep the browser-like properties live.
  Object.defineProperties(video, { src: { get: () => source, set: (value: string) => { source = value; } }, currentTime: { get: () => currentTime, set: (value: number) => { currentTime = value; seeks.push(value); queueMicrotask(() => events.dispatchEvent(new Event("seeked"))); } } });
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: () => {}, getImageData: () => ({ data: new Uint8ClampedArray(64).fill(currentTime >= 1 ? 240 : 0) }) }), toBlob: (callback: BlobCallback) => callback(new Blob(["real decoded frame"], { type: "image/jpeg" })) };
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: (tag: string) => tag === "video" ? video : canvas } });
  URL.createObjectURL = () => "blob:cover-only"; URL.revokeObjectURL = url => { released.push(url); };
  try {
    const cover = await renderTaskFileCover({ ...file, blobId: undefined }, new AbortController().signal, new Blob(["video bytes"]));
    assert.equal(await cover?.text(), "real decoded frame");
    assert.deepEqual(seeks, [0.05, 0.35, 1]);
    assert.equal(played, 0);
    assert.equal(video.muted, true);
    assert.equal(paused, 1);
    assert.equal(loads, 2);
    assert.equal(source, "");
    assert.deepEqual(released, ["blob:cover-only"]);
    assert.equal(canvas.width, 0); assert.equal(canvas.height, 0);
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument); else Reflect.deleteProperty(globalThis, "document");
    URL.createObjectURL = originalCreateUrl; URL.revokeObjectURL = originalRevokeUrl;
  }
});
