import assert from "node:assert/strict";
import test from "node:test";
import type { TaskDetailContent, TaskFileNode } from "../src/shared/model/task-model.ts";
import { collaborationScope, projectTaskCollaboration } from "../src/features/tasks/lib/useTaskCollaboration.ts";
import { getTaskContentIndicators } from "../src/features/tasks/lib/task-content-indicators.ts";
import {
  createCollaborationSnapshot, getDiscussionAttachment, getTaskFiles,
  loadCollaboration, postCollaborationMessage, replaceCollaborationFiles, saveCollaboration,
  type CollaborationMessage,
} from "../src/features/tasks/lib/task-collaboration.ts";

const now = "2026-10-15T02:00:00.000Z";
const source: TaskFileNode = { id: "source", kind: "file", name: "任务方案.md", content: "任务正文", parentId: null, version: 3, updatedAt: now, createdById: "周岚" };
const material: TaskFileNode = { ...source, id: "annotation-material", name: "文件标注.md", content: "标注的完整内容", version: 1, attachmentOnly: true };
const message = (id: string): CollaborationMessage => ({ id, author: "周岚", type: "member-post", message: "", time: "刚刚", createdAt: now });
function storage() {
  const records = new Map<string, string>();
  let writes = 0;
  return { records, get writes() { return writes; }, getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); writes++; } };
}

test("标注材料随消息持久化回读，任务文件投影和数量均不包含它", () => {
  const saved = storage();
  const initial = createCollaborationSnapshot([source]);
  const next = postCollaborationMessage(initial, { message: message("annotation-post"), attachments: [material] });
  saveCollaboration(saved, "team:attachment", 0, next);
  const restored = loadCollaboration(saved, "team:attachment", []);
  assert.deepEqual(getTaskFiles(restored.files), [source]);
  assert.equal(getTaskFiles(restored.files).filter(file => file.kind === "file").length, 1);
  const ref = restored.messages[0].attachmentRefs![0];
  assert.deepEqual(ref, { fileId: material.id, name: material.name, version: 1 });
  assert.deepEqual(getDiscussionAttachment(restored.files, ref), material);
  assert.equal(restored.files.length, 2, "原始附件材料仍保存在协作快照中");
  assert.deepEqual(initial.files, [source], "草稿或候选发布结果不污染已提交文件");
});

test("普通讨论新附件仅随消息保存，同 ID 的已有任务文件不被附件覆盖", () => {
  const upload: TaskFileNode = { ...source, id: "ordinary-upload", version: 1, name: "正常上传.md" };
  const next = postCollaborationMessage(createCollaborationSnapshot([source]), { message: message("ordinary-post"), attachments: [{ ...source, content: "不可覆盖", version: 9 }, upload] });
  assert.equal(next.files.some(file => file.kind === "folder"), false);
  assert.deepEqual(getTaskFiles(next.files), [source]);
  assert.deepEqual(getDiscussionAttachment(next.files, next.messages[0].attachmentRefs![1]), { ...upload, discussionOnly: true, createdById: "周岚" });
  assert.deepEqual(next.messages[0].attachmentRefs, [{ fileId: source.id, version: 3, name: source.name }, { fileId: upload.id, version: 1, name: upload.name }]);
  assert.deepEqual(getDiscussionAttachment(next.files, { fileId: source.id, name: source.name, version: 2 }), source, "普通任务附件保留现有历史版本回退行为");
});

test("普通发言和回复附件持久化回读，不入文件与数量，重试不重复", () => {
  const saved = storage();
  const initial = createCollaborationSnapshot([source]);
  const firstUpload: TaskFileNode = { ...source, id: "first-upload", version: 1 };
  const first = postCollaborationMessage(initial, { message: message("first-upload-post"), attachments: [firstUpload, firstUpload] });
  assert.equal(first.files.some(file => file.kind === "folder"), false);
  assert.equal(first.files.find(file => file.id === firstUpload.id)?.discussionOnly, true);
  assert.deepEqual(initial.files, [source], "候选发布不能改变原快照或移动历史根文件");
  saveCollaboration(saved, "team:ordinary-uploads", 0, first);

  const restored = loadCollaboration(saved, "team:ordinary-uploads", []);
  const input = { message: { ...message("second-upload-post"), type: "member-reply" as const, replyToActivityId: "first-upload-post" }, attachments: [{ ...firstUpload, id: "second-upload" }] };
  const second = postCollaborationMessage(restored, input);
  assert.deepEqual(second.files.filter(file => file.kind === "folder"), []);
  assert.deepEqual(getTaskFiles(second.files), [source]);
  assert.deepEqual(getTaskContentIndicators({ enabled: true, messages: second.messages, files: second.files }), { discussionCount: 2, fileCount: 1 });
  assert.equal(second.files.filter(file => file.id === firstUpload.id).length, 1);
  assert.equal(first.messages[0].attachmentRefs?.length, 1);
  assert.equal(postCollaborationMessage(second, input), second);
  saveCollaboration(saved, "team:ordinary-uploads", first.revision, second);
  const reloaded = loadCollaboration(saved, "team:ordinary-uploads", []);
  assert.deepEqual(reloaded.files, second.files);
  for (const posted of reloaded.messages) assert.equal(getDiscussionAttachment(reloaded.files, posted.attachmentRefs![0])?.content, firstUpload.content);
});

test("历史中英文讨论目录及已收纳文件保留，新附件不再进入它们", () => {
  for (const name of ["讨论", "Discussion", "discussions"]) {
    const folder: TaskFileNode = { id: "existing-discussions", kind: "folder", name, parentId: null, updatedAt: now };
    const historical = { ...source, parentId: folder.id };
    const upload: TaskFileNode = { ...source, id: `upload-${name}`, version: 1 };
    const saved = storage();
    const before = createCollaborationSnapshot([folder, historical]);
    saveCollaboration(saved, `team:history-${name}`, 0, { ...before, revision: 1 });
    const restored = loadCollaboration(saved, `team:history-${name}`, []);
    assert.deepEqual(restored.files, [folder, historical], "载入不迁移或重新标记历史数据");
    const next = postCollaborationMessage(restored, { message: message(`post-${name}`), attachments: [upload] });
    assert.deepEqual(next.files.filter(file => file.kind === "folder"), [folder]);
    assert.equal(next.files.find(file => file.id === upload.id)?.parentId, null);
    assert.deepEqual(getTaskFiles(next.files), [folder, historical]);
    assert.deepEqual(next.files.find(file => file.id === source.id), historical);
  }
});

test("只引用已有文件不会创建目录、迁移文件或覆盖指定位置", () => {
  const folder: TaskFileNode = { id: "user-folder", kind: "folder", name: "用户资料", parentId: null, updatedAt: now };
  const nested: TaskFileNode = { ...source, id: "nested-file", parentId: folder.id };
  const initial = createCollaborationSnapshot([folder, source, nested]);
  const next = postCollaborationMessage(initial, { message: message("existing-only"), attachments: [{ ...source, name: "不可覆盖.md", version: 9 }, { ...nested, parentId: null }] });
  assert.deepEqual(next.files, initial.files);
  assert.deepEqual(next.messages[0].attachmentRefs, [{ fileId: source.id, version: 3, name: source.name }, { fileId: nested.id, version: 3, name: nested.name }]);
});

test("新附件不形成目录项，已有目录和文件位置保持", () => {
  const userFolder: TaskFileNode = { id: "user-folder", kind: "folder", name: "用户资料", parentId: null, updatedAt: now };
  const nestedFolder: TaskFileNode = { ...userFolder, id: "nested-discussions", name: "讨论", parentId: userFolder.id };
  const located: TaskFileNode = { ...source, id: "located-upload", parentId: userFolder.id, version: 1 };
  const rootUpload: TaskFileNode = { ...source, id: "root-upload", version: 1 };
  const next = postCollaborationMessage(createCollaborationSnapshot([userFolder, nestedFolder]), { message: message("located-post"), attachments: [located, rootUpload] });
  assert.deepEqual(getTaskFiles(next.files), [userFolder, nestedFolder]);
  assert.equal(next.files.find(file => file.id === located.id)?.parentId, null);
  assert.equal(next.files.find(file => file.id === rootUpload.id)?.parentId, null);
  assert.deepEqual(next.files.find(file => file.id === nestedFolder.id), nestedFolder);
});

test("同名普通文件和归档目录保持，只有讨论附件时文件数为零", () => {
  const sameName: TaskFileNode = { ...source, id: "same-name", name: "讨论" };
  const archived: TaskFileNode = { id: "archived-discussions", kind: "folder", name: "讨论 (2)", parentId: null, updatedAt: now, archived: true };
  const initial = createCollaborationSnapshot([sameName, archived]);
  const first = postCollaborationMessage(initial, { message: message("conflict-post"), attachments: [{ ...source, id: "first-conflict-upload" }] });
  assert.deepEqual(first.files.filter(file => file.kind === "folder"), [archived]);
  assert.deepEqual(first.files.find(file => file.id === sameName.id), sameName);
  assert.deepEqual(first.files.find(file => file.id === archived.id), archived);
  const second = postCollaborationMessage(first, { message: message("reuse-conflict-post"), attachments: [{ ...source, id: "second-conflict-upload" }] });
  assert.deepEqual(getTaskFiles(second.files), [sameName, archived]);
  const attachmentTask = postCollaborationMessage(createCollaborationSnapshot([]), { message: message("attachment-only-post"), attachments: [source] });
  assert.deepEqual(getTaskContentIndicators({ enabled: true, messages: attachmentTask.messages, files: attachmentTask.files }), { discussionCount: 1, fileCount: 0 });
});

test("普通上传保存失败不留下目录，原附件可重试发布并只持久化一次", () => {
  const saved = storage();
  const initial = createCollaborationSnapshot([source]);
  const upload: TaskFileNode = { ...source, id: "retry-ordinary-upload", version: 1 };
  const input = { message: message("retry-ordinary-post"), attachments: [upload] };
  const candidate = postCollaborationMessage(initial, input);
  assert.throws(() => saveCollaboration({ getItem: saved.getItem, setItem() { throw new Error("quota"); } }, "team:ordinary-retry", 0, candidate), /保存/);
  assert.deepEqual(loadCollaboration(saved, "team:ordinary-retry", [source]), initial);
  assert.deepEqual(upload.parentId, null, "暂存附件本身保持可重试");
  const retry = postCollaborationMessage(initial, input);
  const committed = saveCollaboration(saved, "team:ordinary-retry", 0, retry);
  assert.equal(postCollaborationMessage(committed, input), committed);
  assert.equal(saved.writes, 1);
  assert.equal(committed.files.filter(file => file.kind === "folder").length, 0);
  assert.deepEqual(getTaskFiles(committed.files), [source]);
  assert.equal(committed.files.filter(file => file.id === upload.id).length, 1);
});

test("拒写不会落入任务文件或丢草稿附件，重试及重复确认只保存一份材料", () => {
  const saved = storage();
  const initial = createCollaborationSnapshot([source]);
  const input = { message: message("retry-post"), attachments: [material, material] };
  const candidate = postCollaborationMessage(initial, input);
  assert.throws(() => saveCollaboration({ getItem: saved.getItem, setItem() { throw new Error("quota"); } }, "team:retry", 0, candidate), /保存/);
  assert.deepEqual(loadCollaboration(saved, "team:retry", [source]), initial);
  assert.deepEqual(getTaskFiles(initial.files), [source]);
  const retry = postCollaborationMessage(initial, input);
  const committed = saveCollaboration(saved, "team:retry", 0, retry);
  assert.deepEqual(saveCollaboration(saved, "team:retry", 0, retry), committed);
  assert.equal(postCollaborationMessage(committed, input), committed);
  assert.equal(saved.writes, 1);
  assert.equal(committed.files.filter(file => file.id === material.id).length, 1);
  assert.equal(committed.messages[0].attachmentRefs?.length, 1);
  assert.equal(getDiscussionAttachment(loadCollaboration(saved, "team:retry", []).files, committed.messages[0].attachmentRefs![0])?.content, material.content);
});

test("任务文件树替换不会删除或覆盖讨论附件，仍可从消息按 ID 与版本读取", () => {
  const initial = postCollaborationMessage(createCollaborationSnapshot([source]), { message: message("tree-post"), attachments: [material] });
  const moved = { ...source, name: "重命名方案.md" };
  const changed = replaceCollaborationFiles(initial, [moved]);
  assert.deepEqual(getTaskFiles(changed.files), [moved]);
  assert.deepEqual(changed.messages, initial.messages);
  assert.deepEqual(getDiscussionAttachment(changed.files, initial.messages[0].attachmentRefs![0]), material);
  const emptied = replaceCollaborationFiles(changed, []);
  assert.deepEqual(getTaskFiles(emptied.files), []);
  assert.deepEqual(getDiscussionAttachment(emptied.files, initial.messages[0].attachmentRefs![0]), material);
  assert.equal(getDiscussionAttachment(emptied.files, { fileId: material.id, name: material.name, version: 2 }), undefined, "讨论材料不冒充另一个源版本");
});

test("普通讨论附件可更新保存版本，目录整理不能删除或重新收纳它", () => {
  const initial = postCollaborationMessage(createCollaborationSnapshot([source]), { message: message("ordinary-edit"), attachments: [{ ...source, id: "editable-upload", version: 1 }] });
  const ref = initial.messages[0].attachmentRefs![0];
  const original = getDiscussionAttachment(initial.files, ref)!;
  const edited = { ...original, version: 2, content: "已保存的新版正文", discussionOnly: undefined, parentId: "user-folder", createdById: "another-person" };
  const changed = replaceCollaborationFiles(initial, [source, edited]);
  assert.deepEqual(getTaskFiles(changed.files), [source]);
  assert.deepEqual(getDiscussionAttachment(changed.files, ref), { ...edited, discussionOnly: true, parentId: null, createdById: "周岚" });
  assert.deepEqual(changed.messages[0].attachmentRefs, [ref], "编辑不更新已发布消息的固定版本引用");
  const cleaned = replaceCollaborationFiles(changed, []);
  assert.deepEqual(getTaskFiles(cleaned.files), []);
  assert.deepEqual(getDiscussionAttachment(cleaned.files, ref), getDiscussionAttachment(changed.files, ref));
  assert.throws(() => replaceCollaborationFiles(changed, [original]), /版本/, "旧附件数据不能覆盖已保存新版");
});

test("讨论专用标识只允许文件使用，版本冲突拒绝覆盖原材料", () => {
  assert.throws(() => createCollaborationSnapshot([{ ...material, kind: "folder" }]), /附件|标识/);
  assert.throws(() => createCollaborationSnapshot([{ ...source, kind: "folder", discussionOnly: true }]), /附件|标识/);
  const initial = postCollaborationMessage(createCollaborationSnapshot([]), { message: message("first-post"), attachments: [material] });
  assert.throws(() => postCollaborationMessage(initial, { message: message("second-post"), attachments: [{ ...material, version: 2 }] }), /版本/);
  assert.deepEqual(getDiscussionAttachment(initial.files, initial.messages[0].attachmentRefs![0]), material);
});

test("任务详情投影排除讨论材料，保存的消息引用保持可读", () => {
  const detail: TaskDetailContent = { activities: [], commits: [], due: "", files: [source, material], goal: "", owner: "周岚", participants: [], status: "进行中", summary: "", title: "标注讨论" };
  assert.deepEqual(projectTaskCollaboration("team", "projection", detail).files, [source]);
  const saved = storage();
  const posted = postCollaborationMessage(createCollaborationSnapshot([source]), { message: message("projection-post"), attachments: [material] });
  saveCollaboration(saved, collaborationScope("team", "projection"), 0, posted);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: saved } });
  try {
    const projected = projectTaskCollaboration("team", "projection", { ...detail, files: [source] });
    assert.deepEqual(projected.files, [source]);
    assert.equal(projected.activities[0].id, "projection-post");
    const restored = loadCollaboration(saved, collaborationScope("team", "projection"), []);
    assert.deepEqual(getDiscussionAttachment(restored.files, restored.messages[0].attachmentRefs![0]), material);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
