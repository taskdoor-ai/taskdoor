import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { TaskNode, TaskFileNode } from "../src/shared/model/task-model.ts";
import { createWorkspaceTaskDetail } from "../src/ai/mock/data/taskDetailMocks.ts";
import { BUILTIN_TASK_ASSET_PREFIX, isBuiltinTaskAsset, readDiscussionBlob } from "../src/features/tasks/files/lib/discussion-uploads.ts";
import { createCollaborationSnapshot, loadCollaboration, mergeCollaborationMessages, replaceCollaborationFiles, saveCollaboration, TASK_COLLABORATION_STORAGE_PREFIX } from "../src/features/tasks/lib/task-collaboration.ts";

const samples = await import("../src/ai/mock/data/serumLaunchDiscussionSamples.ts").catch((error: unknown) => {
  if (error && typeof error === "object" && "code" in error && error.code === "ERR_MODULE_NOT_FOUND") return null;
  throw error;
});
function fixture() { assert.ok(samples, "尚未提供任务自带的讨论附件样例包"); return samples; }
const task: TaskNode = { id: "ccx-serum-launch", kind: "task", teamId: "creator-commerce", parentId: "workspace-root", name: "完成秋季抗老精华首发闭环1111000", ownerId: "周岚", participantIds: ["梁川"], status: "已完成", updatedAt: "2026-10-20T12:00:00+08:00" };
const scope = JSON.stringify([task.teamId, task.id]);
const key = `${TASK_COLLABORATION_STORAGE_PREFIX}${encodeURIComponent(scope)}`;
function storage() {
  const records = new Map<string, string>();
  let writes = 0;
  return { records, get writes() { return writes; }, getItem: (name: string) => records.get(name) ?? null, setItem: (name: string, value: string) => { records.set(name, value); writes++; } };
}

test("只给精华主任务补11种原件和4条明确标注的示例，任务现状不被重写", () => {
  const api = fixture();
  const before = structuredClone(task);
  const files = api.getSerumLaunchDiscussionFiles(task);
  const activities = api.getSerumLaunchDiscussionActivities(task);
  const attachments = files.filter(file => file.kind === "file");
  assert.equal(attachments.length, 11);
  assert.deepEqual(new Set(attachments.map(file => file.format)), new Set(["JPG", "PNG", "WEBP", "SVG", "PDF", "PPTX", "HTML", "TXT", "MD", "JSON", "XML"]));
  const folder = files.find(file => file.kind === "folder")!;
  assert.equal(folder.name, "讨论");
  assert.equal(folder.parentId, null);
  assert.ok(attachments.every(file => file.parentId === folder.id && file.version === 1 && isBuiltinTaskAsset(file.blobId)));
  assert.equal(activities.length, 4);
  assert.deepEqual(activities.slice(0, 3).map(message => message.message.match(/^【([^】]+)】/)?.[1]), ["附件样例·视觉素材", "附件样例·执行资料", "附件样例·交接配置"]);
  assert.ok(activities.every(message => message.id.startsWith(`${task.id}-discussion-sample-`) && message.author === "TaskDoor 示例"));
  for (const message of activities) for (const ref of message.attachmentRefs ?? []) assert.ok(attachments.some(file => file.id === ref.fileId && file.version === ref.version && file.name === ref.name));
  const markdown = attachments.find(file => file.format === "MD")!;
  assert.equal(activities[3].replyToActivityId, activities[2].id);
  assert.deepEqual(activities[3].attachmentRefs, [{ fileId: markdown.id, version: 1, name: markdown.name }]);
  const detail = createWorkspaceTaskDetail(task);
  assert.equal(detail.title, task.name);
  assert.equal(detail.status, task.status);
  assert.deepEqual(detail.participants, task.participantIds);
  assert.ok(files.every(file => detail.files.some(node => node.id === file.id)));
  assert.ok(activities.every(message => detail.activities.some(item => item.id === message.id)));
  assert.deepEqual(task, before);
  assert.deepEqual(api.getSerumLaunchDiscussionFiles({ ...task, id: "another-task" }), []);
  assert.deepEqual(api.getSerumLaunchDiscussionActivities({ ...task, id: "another-task" }), []);
});

test("旧快照只合入一次并复用根讨论目录，已有文件、消息、编辑历史及删除均保留", () => {
  const api = fixture();
  for (const name of ["讨论", "Discussion", "discussions"]) {
    const saved = storage();
    const folder: TaskFileNode = { id: "user-discussions", kind: "folder", name, parentId: null, updatedAt: "用户时间" };
    const userFile: TaskFileNode = { id: "user-file", kind: "file", name: "用户版本.md", content: "用户内容", parentId: folder.id, version: 8, updatedAt: "用户时间" };
    const old = { ...createCollaborationSnapshot([folder, userFile]), revision: 5, messages: [{ id: "user-discussion", author: "周岚", message: "原有讨论", time: "昨天", type: "member-post" as const }] };
    saved.records.set(key, JSON.stringify(old));
    saved.records.set("agentdoor-task-file-edits:ccx-serum-launch", "用户原编辑记录");
    const seeded = loadCollaboration(saved, scope, api.getSerumLaunchDiscussionFiles(task));
    assert.deepEqual(seeded.files.slice(0, 2), old.files);
    assert.equal(seeded.files.length, old.files.length + 11);
    assert.deepEqual(seeded.files.filter(file => file.kind === "folder"), [folder]);
    assert.ok(seeded.files.filter(file => file.builtinPackId === api.SERUM_LAUNCH_DISCUSSION_PACK_ID).every(file => file.parentId === folder.id));
    assert.deepEqual(seeded.messages, old.messages);
    assert.equal(saved.getItem("agentdoor-task-file-edits:ccx-serum-launch"), "用户原编辑记录");
    assert.equal(saved.writes, 1);
    assert.deepEqual(loadCollaboration(saved, scope, api.getSerumLaunchDiscussionFiles(task)), seeded);
    assert.equal(saved.writes, 1);
    const removed = replaceCollaborationFiles(seeded, seeded.files.filter(file => file.builtinPackId !== api.SERUM_LAUNCH_DISCUSSION_PACK_ID));
    saveCollaboration(saved, scope, seeded.revision, removed);
    assert.deepEqual(loadCollaboration(saved, scope, api.getSerumLaunchDiscussionFiles(task)), removed);
    const deletedSeed = { ...api.getSerumLaunchDiscussionActivities(task)[0], message: "", deletedAt: "2026-10-21T11:00:00+08:00" };
    const messages = mergeCollaborationMessages(api.getSerumLaunchDiscussionActivities(task), [old.messages[0], deletedSeed]);
    assert.equal(messages.filter(message => message.id === deletedSeed.id).length, 1);
    assert.equal(messages.find(message => message.id === deletedSeed.id)?.deletedAt, deletedSeed.deletedAt);
    assert.ok(messages.some(message => message.id === old.messages[0].id));
  }
});

test("新快照删除过的样例与目录不复活，首次补包保存失败不污染原记录", () => {
  const api = fixture();
  const seed = api.getSerumLaunchDiscussionFiles(task);
  const saved = storage();
  const initial = createCollaborationSnapshot(seed);
  const removed = replaceCollaborationFiles(initial, []);
  saveCollaboration(saved, scope, 0, removed);
  assert.deepEqual(loadCollaboration(saved, scope, seed), removed);
  const old = { ...createCollaborationSnapshot([]), revision: 6 };
  saved.records.set(key, JSON.stringify(old));
  assert.throws(() => loadCollaboration({ getItem: saved.getItem, setItem() { throw new Error("quota"); } }, scope, seed), /保存/);
  assert.equal(saved.getItem(key), JSON.stringify(old));
});

test("11种附件都读取对应的同源真实原件，文本预览逐字同源", async () => {
  const files = fixture().getSerumLaunchDiscussionFiles(task).filter(file => file.kind === "file");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(init?.credentials, "same-origin");
    assert.equal(init?.redirect, "error");
    return new Response(readFileSync(new URL(`../public${String(input)}`, import.meta.url)));
  };
  try {
    for (const file of files) {
      const bytes = readFileSync(new URL(`../public${file.blobId!.slice(BUILTIN_TASK_ASSET_PREFIX.length)}`, import.meta.url));
      assert.equal(file.sizeBytes, bytes.length, file.name);
      const blob = await readDiscussionBlob(file.blobId!);
      assert.ok(blob);
      assert.deepEqual(Buffer.from(await blob.arrayBuffer()), bytes);
      if (["HTML", "TXT", "MD", "JSON", "XML"].includes(file.format!)) assert.equal(file.content, bytes.toString("utf8"), file.name);
    }
  } finally { globalThis.fetch = originalFetch; }
});
