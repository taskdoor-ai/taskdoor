import assert from "node:assert/strict";
import test from "node:test";
import type { TaskDetailContent, TaskFileNode } from "../src/shared/model/task-model.ts";
import { collaborationScope, projectTaskCollaboration } from "../src/features/tasks/lib/useTaskCollaboration.ts";
import {
  createCollaborationSnapshot, getDiscussionAttachment, getTaskFiles,
  loadCollaboration, postCollaborationMessage, replaceCollaborationFiles, saveCollaboration,
  type CollaborationMessage,
} from "../src/features/tasks/lib/task-collaboration.ts";

const now = "2026-10-15T02:00:00.000Z";
const source: TaskFileNode = { id: "source", kind: "file", name: "任务方案.md", content: "任务正文", parentId: null, version: 3, updatedAt: now };
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

test("普通上传继续进入任务文件，同 ID 的已有任务文件不被附件覆盖", () => {
  const upload: TaskFileNode = { ...source, id: "ordinary-upload", version: 1, name: "正常上传.md" };
  const next = postCollaborationMessage(createCollaborationSnapshot([source]), { message: message("ordinary-post"), attachments: [{ ...source, content: "不可覆盖", version: 9 }, upload] });
  assert.deepEqual(getTaskFiles(next.files), [source, upload]);
  assert.deepEqual(next.messages[0].attachmentRefs, [{ fileId: source.id, version: 3, name: source.name }, { fileId: upload.id, version: 1, name: upload.name }]);
  assert.deepEqual(getDiscussionAttachment(next.files, { fileId: source.id, name: source.name, version: 2 }), source, "普通任务附件保留现有历史版本回退行为");
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

test("讨论专用标识只允许文件使用，版本冲突拒绝覆盖原材料", () => {
  assert.throws(() => createCollaborationSnapshot([{ ...material, kind: "folder" }]), /附件|标识/);
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
