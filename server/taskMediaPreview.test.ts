import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { TaskNode } from "../src/shared/model/task-model.ts";
import { getPreviewKind } from "../src/features/tasks/files/lib/task-file-tree.ts";
import { canAnnotateTaskFile, canEditTaskFile, isSupportedTaskFileUpload } from "../src/features/tasks/files/lib/task-file-capabilities.ts";
import { getTaskFileContent } from "../src/features/tasks/files/lib/task-file-editing.ts";
import { bindTaskMediaPlaybackSource, getTaskMediaPlaybackError, stopTaskMediaPlayback } from "../src/features/tasks/files/lib/task-media-playback.ts";
import { BUILTIN_TASK_ASSET_PREFIX, readDiscussionBlob } from "../src/features/tasks/files/lib/discussion-uploads.ts";
import { getSerumLaunchMediaDiscussionActivities, getSerumLaunchMediaDiscussionFiles, SERUM_LAUNCH_MEDIA_DISCUSSION_PACK_ID } from "../src/ai/mock/data/serumLaunchMediaDiscussionSamples.ts";
import { getSerumLaunchDiscussionActivities, getSerumLaunchDiscussionFiles, SERUM_LAUNCH_DISCUSSION_PACK_ID } from "../src/ai/mock/data/serumLaunchDiscussionSamples.ts";
import { createCollaborationSnapshot, getDiscussionAttachment, loadCollaboration, replaceCollaborationFiles, saveCollaboration, TASK_COLLABORATION_STORAGE_PREFIX } from "../src/features/tasks/lib/task-collaboration.ts";

const task: TaskNode = { id: "ccx-serum-launch", kind: "task", teamId: "creator-commerce", parentId: "workspace-root", name: "完成秋季抗老精华首发闭环1111000", ownerId: "周岚", participantIds: ["梁川"], status: "已完成", updatedAt: "2026-10-20T12:00:00+08:00" };

test("fresh snapshots merge the two built-in discussion roots and retain all 13 files and fixed refs", () => {
  const seeds = [...getSerumLaunchDiscussionFiles(task), ...getSerumLaunchMediaDiscussionFiles(task)];
  const before = structuredClone(seeds);
  const direct = createCollaborationSnapshot(seeds);
  const fresh = loadCollaboration({ getItem: () => null, setItem: () => { throw new Error("首次读取不应写入"); } }, "fresh", seeds);
  assert.deepEqual(fresh, direct);
  const folders = fresh.files.filter(file => file.kind === "folder" && file.parentId === null && file.name === "讨论");
  assert.equal(folders.length, 1);
  const files = fresh.files.filter(file => file.kind === "file");
  assert.equal(files.length, 13);
  assert.ok(files.every(file => file.parentId === folders[0].id));
  assert.deepEqual(fresh.appliedFilePacks, [SERUM_LAUNCH_DISCUSSION_PACK_ID, SERUM_LAUNCH_MEDIA_DISCUSSION_PACK_ID]);
  for (const activity of [...getSerumLaunchDiscussionActivities(task), ...getSerumLaunchMediaDiscussionActivities(task)]) {
    for (const ref of activity.attachmentRefs ?? []) {
      const file = getDiscussionAttachment(fresh.files, ref);
      assert.ok(file);
      assert.equal(file.version, ref.version);
      assert.equal(file.name, ref.name);
    }
  }
  assert.deepEqual(seeds, before);
  const userFolders = [
    { id: "user-folder-a", kind: "folder" as const, name: "讨论", parentId: null, updatedAt: "用户时间" },
    { id: "user-folder-b", kind: "folder" as const, name: "讨论", parentId: null, updatedAt: "用户时间", archived: true },
  ];
  const withUserFolders = createCollaborationSnapshot([...userFolders, ...seeds]);
  assert.deepEqual(withUserFolders.files.filter(file => file.kind === "folder"), userFolders);
  assert.ok(withUserFolders.files.filter(file => file.kind === "file").every(file => file.parentId === userFolders[0].id));
});

test("MP3/MP4 suffixes and exact MIME types route to media without broadening to other formats", () => {
  for (const [name, mime, kind] of [["简报.MP3", "text/plain", "audio"], ["总览.mp4", "application/octet-stream", "video"], ["简报", "audio/mpeg", "audio"], ["总览", "video/mp4", "video"]]) {
    assert.equal(getPreviewKind(name, mime), kind);
    assert.equal(isSupportedTaskFileUpload({ name, mimeType: mime }), true);
  }
  for (const [name, mime] of [["素材.wav", "audio/mpeg"], ["素材.mov", "video/mp4"], ["素材.webm", "video/mp4"], ["素材", "audio/ogg"], ["素材", "video/webm"]]) assert.equal(isSupportedTaskFileUpload({ name, mimeType: mime }), false);
});

test("media remains read-only without adding postponed annotations or accidental text parsing", () => {
  for (const file of getSerumLaunchMediaDiscussionFiles(task).filter(file => file.kind === "file")) {
    assert.equal(canEditTaskFile(file), false);
    assert.equal(canAnnotateTaskFile(file), false);
    assert.equal(getTaskFileContent({ ...file, content: "旧文字快照", previewData: { kind: "text", text: "不应成为音视频正文" } }), null);
  }
  assert.equal(canAnnotateTaskFile({ name: "手册.pdf" }), true);
  assert.equal(canAnnotateTaskFile({ name: "说明.md" }), true);
});

test("closing or replacing media pauses and releases the decoder in order", () => {
  const calls: string[] = [];
  stopTaskMediaPlayback({ pause: () => { calls.push("pause"); }, removeAttribute: name => { calls.push(`remove:${name}`); }, load: () => { calls.push("load"); } });
  assert.deepEqual(calls, ["pause", "remove:src", "load"]);
});

test("StrictMode effect replay restores the same media node's source without autoplay, then still releases on close", () => {
  const url = "blob:original-video";
  const attributes = new Map([["src", url]]);
  let loads = 0, pauses = 0, plays = 0;
  const media = {
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => { attributes.set(name, value); },
    removeAttribute: (name: string) => { attributes.delete(name); },
    pause: () => { pauses++; }, load: () => { loads++; }, play: () => { plays++; },
  };
  const firstCleanup = bindTaskMediaPlaybackSource(media, url);
  assert.equal(loads, 0, "React 已设置原地址，首次 setup 不重复打断载入");
  firstCleanup();
  assert.equal(media.getAttribute("src"), null);
  const secondCleanup = bindTaskMediaPlaybackSource(media, url);
  assert.equal(media.getAttribute("src"), url, "第二次 setup 恢复 cleanup 移除的地址");
  assert.equal(loads, 2, "清理一次，恢复后重新读取一次");
  assert.equal(plays, 0);
  secondCleanup();
  assert.equal(media.getAttribute("src"), null);
  assert.equal(pauses, 2, "真正关闭仍暂停并释放解码器");
});

test("playback errors distinguish interrupted reads from unsupported or damaged encoding", () => {
  assert.match(getTaskMediaPlaybackError(2), /读取中断.*重试/);
  for (const code of [3, 4]) assert.match(getTaskMediaPlaybackError(code), /编码.*损坏.*下载/);
  assert.match(getTaskMediaPlaybackError(), /重试.*下载/);
});

test("discussion media refs use the real MP3/MP4 original bytes and exact version", async () => {
  const before = structuredClone(task);
  const files = getSerumLaunchMediaDiscussionFiles(task).filter(file => file.kind === "file");
  assert.deepEqual(files.map(file => file.format), ["MP3", "MP4"]);
  const activity = getSerumLaunchMediaDiscussionActivities(task)[0];
  assert.equal(activity.author, "TaskDoor 示例");
  assert.equal(activity.attachmentRefs?.length, 2);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(init?.credentials, "same-origin");
    assert.equal(init?.redirect, "error");
    return new Response(readFileSync(new URL(`../public${String(input)}`, import.meta.url)));
  };
  try {
    for (const file of files) {
      assert.ok(activity.attachmentRefs?.some(ref => ref.fileId === file.id && ref.version === file.version));
      const bytes = readFileSync(new URL(`../public${file.blobId!.slice(BUILTIN_TASK_ASSET_PREFIX.length)}`, import.meta.url));
      assert.equal(file.sizeBytes, bytes.length);
      const blob = await readDiscussionBlob(file.blobId!);
      assert.ok(blob);
      assert.deepEqual(Buffer.from(await blob.arrayBuffer()), bytes);
    }
  } finally { globalThis.fetch = originalFetch; }
  assert.deepEqual(task, before);
  assert.deepEqual(getSerumLaunchMediaDiscussionFiles({ ...task, id: "other" }), []);
});

test("incremental media pack preserves deleted older samples and user records, and applies only once", () => {
  const records = new Map<string, string>();
  const storage = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
  const scope = JSON.stringify([task.teamId, task.id]);
  const key = `${TASK_COLLABORATION_STORAGE_PREFIX}${encodeURIComponent(scope)}`;
  const folder = { id: "user-discussion-folder", kind: "folder" as const, name: "讨论", parentId: null, updatedAt: "用户时间" };
  const user = { id: "user-file", kind: "file" as const, name: "用户说明.md", content: "用户内容", parentId: folder.id, version: 9, updatedAt: "用户时间" };
  const before = { ...createCollaborationSnapshot([folder, user]), revision: 5, appliedFilePacks: [SERUM_LAUNCH_DISCUSSION_PACK_ID], messages: [{ id: "user-post", author: "周岚", type: "member-post" as const, message: "原讨论", time: "昨天" }] };
  records.set(key, JSON.stringify(before));
  const seed = [...getSerumLaunchDiscussionFiles(task), ...getSerumLaunchMediaDiscussionFiles(task)];
  const next = loadCollaboration(storage, scope, seed);
  assert.deepEqual(next.files.slice(0, 2), before.files);
  assert.deepEqual(next.messages, before.messages);
  assert.equal(next.files.length, 4);
  assert.ok(next.files.filter(file => file.builtinPackId === SERUM_LAUNCH_MEDIA_DISCUSSION_PACK_ID).every(file => file.parentId === folder.id));
  assert.equal(next.files.some(file => file.builtinPackId === SERUM_LAUNCH_DISCUSSION_PACK_ID), false);
  assert.deepEqual(loadCollaboration(storage, scope, seed), next);
  const removed = replaceCollaborationFiles(next, [folder, user]);
  saveCollaboration(storage, scope, next.revision, removed);
  assert.deepEqual(loadCollaboration(storage, scope, seed), removed);
});
