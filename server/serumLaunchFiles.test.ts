import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { unzipSync } from "fflate";
import type { TaskFileNode, TaskNode } from "../src/shared/model/task-model.ts";
import { getSerumLaunchFileAssets, SERUM_LAUNCH_FILE_PACK_ID } from "../src/ai/mock/data/serumLaunchFileAssets.ts";
import { SERUM_LAUNCH_COMMON_FILE_PACK_ID } from "../src/ai/mock/data/serumLaunchCommonFileAssets.ts";
import { createWorkspaceTaskDetail } from "../src/ai/mock/data/taskDetailMocks.ts";
import { getTaskFileContent } from "../src/features/tasks/files/lib/task-file-editing.ts";
import { getPreviewKind } from "../src/features/tasks/files/lib/task-file-tree.ts";
import { BUILTIN_TASK_ASSET_PREFIX, isBuiltinTaskAsset, readDiscussionBlob } from "../src/features/tasks/files/lib/discussion-uploads.ts";
import { createCollaborationSnapshot, loadCollaboration, replaceCollaborationFiles, saveCollaboration, TASK_COLLABORATION_STORAGE_PREFIX } from "../src/features/tasks/lib/task-collaboration.ts";

const task: TaskNode = {
  id: "ccx-serum-launch", kind: "task", teamId: "creator-commerce", parentId: "workspace-root",
  name: "完成秋季抗老精华首发闭环", ownerId: "周岚", status: "进行中", updatedAt: "2026-09-14T18:00:00+08:00",
};
const pack = getSerumLaunchFileAssets(task);
const legacyPack = getSerumLaunchFileAssets(task, true);
const scope = JSON.stringify([task.teamId, task.id]);
const storageKey = `${TASK_COLLABORATION_STORAGE_PREFIX}${encodeURIComponent(scope)}`;
function memoryStorage() {
  const records = new Map<string, string>();
  let writes = 0;
  return { records, get writes() { return writes; }, getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); writes++; } };
}
const assetBytes = (name: string) => readFileSync(new URL(`../public/task-assets/serum-launch/${name}`, import.meta.url));
const json = (name: string) => JSON.parse(assetBytes(name).toString("utf8"));
const firstPackSeeds = () => createWorkspaceTaskDetail(task).files.filter(file => !file.builtinPackId || file.builtinPackId === SERUM_LAUNCH_FILE_PACK_ID);

test("目标任务只追加三种支持预览的真实素材，其他任务不变", () => {
  assert.equal(pack.length, 3);
  assert.equal(new Set(pack.map(file => file.id)).size, 3);
  assert.deepEqual(pack.map(file => getPreviewKind(file.name, file.mimeType)), ["html", "pdf", "image"]);
  assert.ok(pack.every(file => file.version === 1 && file.builtinPackId === SERUM_LAUNCH_FILE_PACK_ID && isBuiltinTaskAsset(file.blobId)));
  const detail = createWorkspaceTaskDetail(task);
  for (const file of pack) assert.ok(detail.files.some(node => node.id === file.id));
  for (const oldId of ["rule", "history-file", "result"]) assert.ok(detail.files.some(file => file.id === `${task.id}-${oldId}`));
  const byId = new Map(detail.files.map(file => [file.id, file]));
  for (const file of pack) assert.equal(byId.get(file.parentId!)?.kind, "folder");
  assert.deepEqual(getSerumLaunchFileAssets({ ...task, id: "ccx-serum-content-track" }), []);
  assert.deepEqual(getSerumLaunchFileAssets({ ...task, teamId: "platform" }), []);
});

test("保留历史原件，Office与PDF仍有真正格式字节", () => {
  const pack = legacyPack;
  const tables = json("serum-launch-tables.json");
  const documents = json("serum-launch-documents.json");
  assert.equal(getTaskFileContent(pack[0])?.kind, "text");
  assert.equal(pack[0].content, assetBytes("serum-launch-board.html").toString("utf8"));
  assert.deepEqual(getTaskFileContent(pack[1]), { kind: "table", sheets: tables.sheets });
  assert.deepEqual(getTaskFileContent(pack[2]), { kind: "table", sheets: [tables.csv] });
  assert.deepEqual(getTaskFileContent(pack[3]), { kind: "pdf", pages: documents.pdfPages });
  assert.deepEqual(getTaskFileContent(pack[4]), { kind: "text", text: documents.wordText });
  assert.ok(tables.sheets.length >= 3);
  assert.ok(tables.csv.rows.length >= 12);
  assert.ok(documents.pdfPages.length >= 3);
  assert.ok(documents.wordText.length >= 2000);
  const workbook = unzipSync(assetBytes("serum-launch-budget.xlsx"));
  assert.ok(workbook["xl/workbook.xml"]);
  assert.ok(workbook["xl/worksheets/sheet1.xml"]);
  const document = unzipSync(assetBytes("serum-launch-creative-brief.docx"));
  assert.ok(document["word/document.xml"]);
  assert.equal(assetBytes("serum-launch-playbook.pdf").subarray(0, 5).toString(), "%PDF-");
  assert.deepEqual([...assetBytes("serum-launch-hero.png").subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  for (const file of pack) assert.equal(file.sizeBytes, assetBytes(file.originalName!).length, file.name);
});

test("旧快照只补一次素材包，保留改名、移动、正文、上传、消息和用户删除", () => {
  const storage = memoryStorage();
  const oldSeed: TaskFileNode = { id: `${task.id}-result`, kind: "file", parentId: null, name: "我的交付笔记.md", content: "用户已保存的新正文", updatedAt: "2026-10-15T01:00:00.000Z", version: 9 };
  const upload: TaskFileNode = { ...oldSeed, id: "upload-1", name: "用户上传.docx", blobId: "discussion-blob-user" };
  const alreadyEdited: TaskFileNode = { ...pack[0], name: "用户改名.html", parentId: null, content: "用户自己的HTML", previewData: { kind: "text", text: "用户自己的HTML" }, version: 2 };
  const old = { ...createCollaborationSnapshot([]), revision: 7, files: [oldSeed, upload, alreadyEdited], messages: [{ id: "message-1", author: "周岚", message: "保留原讨论", type: "member-post" as const, time: "昨天" }] };
  storage.records.set(storageKey, JSON.stringify(old));
  const migrated = loadCollaboration(storage, scope, firstPackSeeds());
  assert.equal(migrated.revision, 8);
  assert.equal(storage.writes, 1);
  assert.deepEqual(migrated.appliedFilePacks, [SERUM_LAUNCH_FILE_PACK_ID]);
  assert.deepEqual(migrated.files.slice(0, 3), old.files);
  assert.deepEqual(migrated.messages, old.messages);
  assert.equal(migrated.files.length, old.files.length + pack.length - 1);
  assert.ok(migrated.files.slice(3).every(file => file.parentId === null), "不恢复用户已删除的原目录");
  assert.equal(migrated.files.some(file => file.id === `${task.id}-rule`), false, "不把旧通用种子补回");
  const removedId = pack[1].id;
  const deleted = replaceCollaborationFiles(migrated, migrated.files.filter(file => file.id !== removedId));
  saveCollaboration(storage, scope, migrated.revision, deleted);
  assert.deepEqual(loadCollaboration(storage, scope, firstPackSeeds()), deleted);
  assert.equal(storage.writes, 2, "再次加载不重新保存或复活文件");
});

test("新快照记素材包，用户删除后重载不复活；升级失败不覆盖旧存储", () => {
  const storage = memoryStorage();
  const initial = createCollaborationSnapshot(firstPackSeeds());
  assert.deepEqual(initial.appliedFilePacks, [SERUM_LAUNCH_FILE_PACK_ID]);
  const deleted = replaceCollaborationFiles(initial, initial.files.filter(file => file.id !== pack.at(-1)!.id));
  saveCollaboration(storage, scope, 0, deleted);
  assert.deepEqual(loadCollaboration(storage, scope, firstPackSeeds()), deleted);
  const legacy = JSON.stringify({ ...createCollaborationSnapshot([]), revision: 4 });
  storage.records.set(storageKey, legacy);
  const rejecting = { getItem: storage.getItem, setItem() { throw new Error("quota"); } };
  assert.throws(() => loadCollaboration(rejecting, scope, pack), /保存/);
  assert.equal(storage.getItem(storageKey), legacy);
});

test("已应用包只同步同源v1正文与大小，保留整理和历史且不复活删除或覆盖v2", () => {
  const storage = memoryStorage();
  const staleHtml: TaskFileNode = { ...pack[0], name: "我整理的首发页.html", parentId: null, archived: true,
    content: "原素材生成中的旧日期", previewData: { kind: "text", text: "原素材生成中的旧日期" }, sizeBytes: 10, sizeLabel: "10 B", updatedAt: "2026-10-15T01:00:00.000Z" };
  const edited: TaskFileNode = { ...legacyPack[4], content: "用户v2创意正文", previewData: { kind: "document", text: "用户v2创意正文" }, version: 2, sizeBytes: 12, sizeLabel: "12 B" };
  const differentBlob: TaskFileNode = { ...pack[1], blobId: "discussion-blob-reuploaded", sizeBytes: 99 };
  const differentPack: TaskFileNode = { ...pack[2], builtinPackId: "user-pack", sizeBytes: 99 };
  const old = { ...createCollaborationSnapshot(pack), revision: 9, files: [staleHtml, edited, differentBlob, differentPack],
    messages: [{ id: "message-sync", author: "周岚", message: "既有讨论", type: "member-post" as const, time: "昨天" }] };
  storage.records.set(storageKey, JSON.stringify(old));
  const refreshed = loadCollaboration(storage, scope, pack);
  assert.equal(refreshed.revision, 10);
  assert.equal(storage.writes, 1);
  assert.deepEqual(refreshed.files[0], { ...staleHtml, content: pack[0].content, previewData: pack[0].previewData, sizeBytes: pack[0].sizeBytes, sizeLabel: pack[0].sizeLabel });
  assert.deepEqual(refreshed.files.slice(1), old.files.slice(1));
  assert.deepEqual(refreshed.messages, old.messages);
  assert.equal(refreshed.files.length, 4, "同步不补回用户删除的其他文件");
  assert.deepEqual(loadCollaboration(storage, scope, pack), refreshed);
  assert.equal(storage.writes, 1, "来源内容相同不再增加revision或写存储");

  storage.records.set(storageKey, JSON.stringify(old));
  const rejecting = { getItem: storage.getItem, setItem() { throw new Error("quota"); } };
  assert.throws(() => loadCollaboration(rejecting, scope, pack), /保存/);
  assert.equal(storage.getItem(storageKey), JSON.stringify(old), "同步拒写保留原记录");
});

test("内建读取仅请求固定同源资源，历史原件仍返回完整字节", async () => {
  const pack = legacyPack;
  const previousFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    assert.equal(typeof input, "string");
    const path = String(input);
    assert.equal(init?.credentials, "same-origin");
    assert.equal(init?.redirect, "error");
    calls.push(path);
    return new Response(assetBytes(path.split("/").pop()!));
  };
  try {
    for (const file of pack) {
      const blob = await readDiscussionBlob(file.blobId!);
      assert.ok(blob);
      assert.deepEqual(Buffer.from(await blob.arrayBuffer()), assetBytes(file.originalName!));
    }
    assert.deepEqual(calls, pack.map(file => file.blobId!.slice(BUILTIN_TASK_ASSET_PREFIX.length)));
    for (const invalid of ["https://example.com/serum-launch-board.html", "/task-assets/serum-launch/../secret.pdf", "/task-assets/serum-launch/serum-launch-board.html?other=1", "//example.com/task-assets/serum-launch/serum-launch-board.html", "/task-assets/other/file.pdf"]) {
      await assert.rejects(readDiscussionBlob(`${BUILTIN_TASK_ASSET_PREFIX}${invalid}`), /路径无效/);
    }
    assert.equal(calls.length, 6);
    await assert.rejects(readDiscussionBlob("discussion-blob-user"), /当前浏览器无法保存附件/);
    assert.equal(calls.length, 6, "普通上传仍走 IndexedDB，不请求静态资源");
    globalThis.fetch = async () => new Response("missing", { status: 404 });
    await assert.rejects(readDiscussionBlob(pack[3].blobId!), /无法读取/);
    globalThis.fetch = async () => new Response("");
    await assert.rejects(readDiscussionBlob(pack[3].blobId!), /为空/);
  } finally { globalThis.fetch = previousFetch; }
});
