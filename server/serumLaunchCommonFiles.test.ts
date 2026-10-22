import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { unzipSync } from "fflate";
import type { TaskFileNode, TaskNode } from "../src/shared/model/task-model.ts";
import { getSerumLaunchCommonFileAssets, SERUM_LAUNCH_COMMON_FILE_PACK_ID } from "../src/ai/mock/data/serumLaunchCommonFileAssets.ts";
import { getSerumLaunchFileAssets, SERUM_LAUNCH_FILE_PACK_ID } from "../src/ai/mock/data/serumLaunchFileAssets.ts";
import { createWorkspaceTaskDetail } from "../src/ai/mock/data/taskDetailMocks.ts";
import { getPreviewKind } from "../src/features/tasks/files/lib/task-file-tree.ts";
import { BUILTIN_TASK_ASSET_PREFIX, isBuiltinTaskAsset, readDiscussionBlob } from "../src/features/tasks/files/lib/discussion-uploads.ts";
import { createCollaborationSnapshot, loadCollaboration, replaceCollaborationFiles, saveCollaboration, TASK_COLLABORATION_STORAGE_PREFIX } from "../src/features/tasks/lib/task-collaboration.ts";

const task: TaskNode = {
  id: "ccx-serum-launch", kind: "task", teamId: "creator-commerce", parentId: "workspace-root",
  name: "完成秋季抗老精华首发闭环", ownerId: "周岚", status: "进行中", updatedAt: "2026-10-16T15:00:00+08:00",
};
const pack = getSerumLaunchCommonFileAssets(task);
const firstPack = getSerumLaunchFileAssets(task);
const legacyPack = getSerumLaunchCommonFileAssets(task, true);
const legacyFirstPack = getSerumLaunchFileAssets(task, true);
const scope = JSON.stringify([task.teamId, task.id]);
const storageKey = `${TASK_COLLABORATION_STORAGE_PREFIX}${encodeURIComponent(scope)}`;
const expectedNames = ["serum-launch-briefing.pptx", "serum-launch-handover.txt", "serum-launch-snapshot.json", "serum-launch-channels.xml", "serum-launch-workflow.svg", "serum-launch-hero.jpg", "serum-launch-hero.webp"];
const bytesAt = (relativePath: string) => readFileSync(new URL(`../public${relativePath}`, import.meta.url));
const bytesOf = (file: TaskFileNode) => bytesAt(file.blobId!.slice(BUILTIN_TASK_ASSET_PREFIX.length));
const firstTwoPackSeeds = () => createWorkspaceTaskDetail(task).files.filter(file => !file.builtinPackId || [SERUM_LAUNCH_FILE_PACK_ID, SERUM_LAUNCH_COMMON_FILE_PACK_ID].includes(file.builtinPackId));
function memoryStorage() {
  const records = new Map<string, string>();
  let writes = 0;
  return { records, get writes() { return writes; }, getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); writes++; } };
}

test("同一精华任务只加入七类支持预览的常用原件，其他任务不追加", () => {
  assert.equal(pack.length, 7);
  assert.deepEqual(pack.map(file => file.originalName).sort(), [...expectedNames].sort());
  assert.deepEqual(new Set(pack.map(file => file.format)), new Set(["PPTX", "TXT", "JSON", "XML", "SVG", "JPG", "WEBP"]));
  assert.equal(new Set(pack.map(file => file.id)).size, 7);
  assert.ok(pack.every(file => file.id.startsWith(`${task.id}-common-`) && file.builtinPackId === SERUM_LAUNCH_COMMON_FILE_PACK_ID
    && file.updatedAt === "2026-10-16T15:00:00+08:00" && file.version === 1 && isBuiltinTaskAsset(file.blobId)));
  const files = firstTwoPackSeeds();
  for (const file of [...firstPack, ...pack]) assert.ok(files.some(node => node.id === file.id), file.name);
  for (const file of pack) assert.equal(files.find(node => node.id === file.parentId)?.kind, "folder", file.name);
  assert.deepEqual(createCollaborationSnapshot(files).appliedFilePacks, [SERUM_LAUNCH_FILE_PACK_ID, SERUM_LAUNCH_COMMON_FILE_PACK_ID]);
  assert.deepEqual(getSerumLaunchCommonFileAssets({ ...task, id: "ccx-serum-content-track" }), []);
  assert.deepEqual(getSerumLaunchCommonFileAssets({ ...task, teamId: "platform" }), []);
  assert.equal(getPreviewKind(pack.find(file => file.format === "PPTX")!.name, pack.find(file => file.format === "PPTX")!.mimeType), "presentation");
  for (const format of ["JPG", "WEBP", "SVG"]) assert.equal(getPreviewKind(pack.find(file => file.format === format)!.name), "image");
});

test("历史原件大小和文本同源，演示文稿及旧交付压缩包保持真实格式", () => {
  const pack = legacyPack;
  const firstPack = legacyFirstPack;
  for (const file of pack) {
    const bytes = bytesOf(file);
    assert.ok(bytes.length > 0, file.name);
    assert.equal(file.sizeBytes, bytes.length, file.name);
    if (file.content !== undefined) {
      assert.equal(file.content, bytes.toString("utf8"), file.name);
      assert.deepEqual(file.previewData, { kind: "text", text: file.content }, file.name);
    } else assert.equal(file.previewData, undefined, "二进制沿用现有原件预览");
  }
  const byFormat = (format: string) => pack.find(file => file.format === format)!;
  for (const format of ["TXT", "JSON", "XML", "ICS"]) assert.equal(typeof byFormat(format).content, "string", format);
  const presentation = unzipSync(bytesOf(byFormat("PPTX")));
  for (const entry of ["[Content_Types].xml", "_rels/.rels", "ppt/presentation.xml", "ppt/_rels/presentation.xml.rels", "ppt/slides/slide1.xml"]) assert.ok(presentation[entry]?.length, entry);
  assert.match(new TextDecoder().decode(presentation["[Content_Types].xml"]), /application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation\.main\+xml/);
  assert.match(new TextDecoder().decode(presentation["ppt/presentation.xml"]), /<p:sldIdLst>/);
  assert.deepEqual([...bytesOf(byFormat("JPG")).subarray(0, 3)], [255, 216, 255]);
  assert.equal(bytesOf(byFormat("WEBP")).subarray(0, 4).toString(), "RIFF");
  assert.equal(bytesOf(byFormat("WEBP")).subarray(8, 12).toString(), "WEBP");
  assert.equal(bytesOf(byFormat("MP4")).subarray(4, 8).toString(), "ftyp");
  const mp3 = bytesOf(byFormat("MP3"));
  assert.ok(mp3.subarray(0, 3).toString() === "ID3" || (mp3[0] === 255 && (mp3[1] & 224) === 224));
  const archive = unzipSync(bytesOf(byFormat("ZIP")));
  const materialBytes = Object.values(archive).filter(bytes => bytes.length > 0);
  for (const file of [...firstPack, ...pack.filter(file => file.format !== "ZIP")]) {
    assert.ok(materialBytes.some(bytes => Buffer.from(bytes).equals(bytesOf(file))), `${file.name} 的完整原件在交付包内`);
  }
  const manifest: Array<{ path: string; sizeBytes: number; sha256: string }> = JSON.parse(new TextDecoder().decode(archive["原件校验清单.json"]));
  assert.equal(manifest.length, 17, "旧六份、新十份以及已有任务进展 PDF 均有原件记录");
  assert.equal(new Set(manifest.map(entry => entry.path)).size, 17);
  for (const entry of manifest) {
    const bytes = archive[entry.path];
    assert.ok(bytes, entry.path);
    assert.equal(bytes.length, entry.sizeBytes, entry.path);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256, entry.path);
  }
  assert.equal(Buffer.from(archive["已有办公与资料/serum-launch-progress-report.pdf"]).subarray(0, 5).toString(), "%PDF-");
  assert.ok(archive["资料目录.md"]?.length);
});

test("旧包已应用后新包只追加一次，保留用户上传 PDF、改名、移动和删除", () => {
  const storage = memoryStorage();
  const deletedOldIds = new Set([firstPack.find(file => file.format === "PDF")!.id, `${task.id}-rule`, `${task.id}-evidence`]);
  const renamed: TaskFileNode = { ...firstPack[0], name: "用户整理的首发总览.html", parentId: null, content: "用户已修改正文", previewData: { kind: "text", text: "用户已修改正文" }, version: 2 };
  const uploadedPdf: TaskFileNode = { id: "user-uploaded-pdf", kind: "file", name: "用户改名的审核资料.pdf", originalName: "上传原始名称.pdf", parentId: null, blobId: "discussion-blob-user-pdf", format: "PDF", mimeType: "application/pdf", version: 3, updatedAt: "2026-10-16T14:00:00+08:00", sizeBytes: 1256 };
  const oldFiles = [...firstTwoPackSeeds().filter(file => file.builtinPackId !== SERUM_LAUNCH_COMMON_FILE_PACK_ID && !deletedOldIds.has(file.id)).map(file => file.id === renamed.id ? renamed : file), uploadedPdf];
  const old = { ...createCollaborationSnapshot(oldFiles), revision: 7, messages: [{ id: "message-common-pack", author: "周岚", message: "保留用户讨论", type: "member-post" as const, time: "今天" }] };
  assert.deepEqual(old.appliedFilePacks, [SERUM_LAUNCH_FILE_PACK_ID]);
  storage.records.set(storageKey, JSON.stringify(old));
  const seed = firstTwoPackSeeds();
  const migrated = loadCollaboration(storage, scope, seed);
  assert.equal(migrated.revision, 8);
  assert.equal(storage.writes, 1);
  assert.deepEqual(migrated.appliedFilePacks, [SERUM_LAUNCH_FILE_PACK_ID, SERUM_LAUNCH_COMMON_FILE_PACK_ID]);
  assert.deepEqual(migrated.files.slice(0, old.files.length), old.files);
  assert.deepEqual(migrated.messages, old.messages);
  assert.equal(migrated.files.length, old.files.length + pack.length);
  assert.deepEqual(migrated.files.find(file => file.id === uploadedPdf.id), uploadedPdf);
  for (const id of deletedOldIds) assert.equal(migrated.files.some(file => file.id === id), false, id);
  for (const file of pack.filter(file => file.parentId === `${task.id}-evidence`)) assert.equal(migrated.files.find(node => node.id === file.id)?.parentId, null, "用户删掉的目录不恢复");
  assert.deepEqual(loadCollaboration(storage, scope, seed), migrated);
  assert.equal(storage.writes, 1, "同一新包再次加载不追加或写入");
  const removed = pack.find(file => file.format === "JSON")!;
  const deleted = replaceCollaborationFiles(migrated, migrated.files.filter(file => file.id !== removed.id));
  saveCollaboration(storage, scope, migrated.revision, deleted);
  assert.deepEqual(loadCollaboration(storage, scope, seed), deleted);
  assert.equal(storage.writes, 2);
  assert.equal(loadCollaboration(storage, scope, seed).files.some(file => file.id === removed.id), false, "新包文件被用户删除后不复活");
});

test("十一条历史固定同源路径均可下载，拒绝变体路径及外部来源", async () => {
  const pack = legacyPack;
  const previousFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    assert.equal(typeof input, "string");
    assert.equal(init?.credentials, "same-origin");
    assert.equal(init?.redirect, "error");
    calls.push(String(input));
    return new Response(bytesAt(String(input)));
  };
  try {
    for (const file of pack) {
      const blob = await readDiscussionBlob(file.blobId!);
      assert.ok(blob);
      assert.deepEqual(Buffer.from(await blob.arrayBuffer()), bytesOf(file), file.name);
    }
    assert.deepEqual(calls, pack.map(file => file.blobId!.slice(BUILTIN_TASK_ASSET_PREFIX.length)));
    for (const invalid of [
      "/task-assets/serum-launch/common/../serum-launch-hero.jpg",
      "/task-assets/serum-launch/common/serum-launch-hero.jpg?download=1",
      "/task-assets/serum-launch/common/serum-launch-hero.jpg#fragment",
      "/task-assets/serum-launch/common/sub/serum-launch-hero.jpg",
      "/task-assets/serum-launch/common/other.mp3",
      "/task-assets/serum-launch/common/serum-launch-hero.JPG",
      "https://example.com/task-assets/serum-launch/common/serum-launch-hero.jpg",
      "//example.com/task-assets/serum-launch/common/serum-launch-hero.jpg",
    ]) await assert.rejects(readDiscussionBlob(`${BUILTIN_TASK_ASSET_PREFIX}${invalid}`), /路径无效/);
    assert.equal(calls.length, 11, "无效地址不发起请求");
  } finally { globalThis.fetch = previousFetch; }
});
