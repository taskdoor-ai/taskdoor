import assert from "node:assert/strict";
import test from "node:test";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import * as editing from "../src/features/tasks/files/lib/task-file-editing.ts";
import { createCollaborationSnapshot, getDiscussionAttachment, loadCollaboration, postCollaborationMessage, saveCollaboration } from "../src/features/tasks/lib/task-collaboration.ts";
import { createTaskFileAnnotation, validateTaskFileAnnotations } from "../src/features/tasks/files/lib/task-file-annotations.ts";

const first: TaskFileNode = { id: "uploaded-note", kind: "file", name: "交接说明.txt", parentId: null, updatedAt: "2026-10-21T02:00:00.000Z", version: 1, content: "第一版交接说明\n未修改的末行", blobId: "original-v1-bytes", mimeType: "text/plain" };
const now = "2026-10-21T03:00:00.000Z";
function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
function version(file: TaskFileNode, target: number, record?: editing.TaskFileEditRecord) {
  assert.equal(typeof editing.getTaskFileVersion, "function", "缺少精确读取讨论引用版本的能力");
  return editing.getTaskFileVersion(file, target, record);
}
function edited() {
  const record = editing.createTaskFileRevision(first, { kind: "text", text: "第二版交接说明\n未修改的末行" }, "周岚", now)!;
  return { record, latest: editing.applyTaskFileEdit(first, record) };
}

test("上传 v1 后保存 v2 并刷新，旧讨论引用仍精确读取 v1 完整正文", () => {
  const saved = storage();
  const posted = postCollaborationMessage(createCollaborationSnapshot([]), { message: { id: "post-v1", author: "周岚", type: "member-post", message: "请按附件交接", createdAt: first.updatedAt, time: "刚刚" }, attachments: [first] });
  saveCollaboration(saved, "team:version-reference", 0, posted);
  const { record } = edited();
  editing.saveTaskFileEdit(saved, "version-reference", record, 1);
  const restored = loadCollaboration(saved, "team:version-reference", []);
  const records = editing.readTaskFileEdits(saved, "version-reference");
  const currentFiles = restored.files.map(file => records[file.id] ? editing.applyTaskFileEdit(file, records[file.id]) : file);
  const ref = restored.messages[0].attachmentRefs![0];
  const current = getDiscussionAttachment(currentFiles, ref)!;
  assert.equal(current.version, 2);
  const snapshot = version(current, ref.version, records[ref.fileId]);
  assert.ok(snapshot);
  assert.equal(snapshot.version, 1);
  assert.deepEqual(editing.getTaskFileContent(snapshot), { kind: "text", text: first.content });
  assert.equal(current.version, 2, "读取历史不能回退当前文件树");
  assert.equal(ref.version, 1, "历史消息的固定引用不升级");
});

test("连续修改后的中间版本读取匹配快照，返回值不能改写保存历史", () => {
  const { record, latest } = edited();
  const third = editing.createTaskFileRevision(latest, { kind: "text", text: "第三版正文" }, "林川", "2026-10-21T04:00:00.000Z")!;
  third.revisions = [...record.revisions, ...third.revisions];
  const latestThird = editing.applyTaskFileEdit(latest, third);
  const snapshot = version(latestThird, 2, third);
  assert.ok(snapshot);
  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.updatedAt, now);
  assert.deepEqual(editing.getTaskFileContent(snapshot), record.content);
  snapshot.content = "不应污染历史";
  assert.deepEqual(third.revisions[0].afterContent, record.content);
  assert.deepEqual(version(latestThird, 3, third), latestThird);
});

test("没有完整历史、版本不匹配或附件专用材料时，不拿当前正文冒充旧版", () => {
  const { record, latest } = edited();
  const legacy = structuredClone(record);
  delete legacy.revisions[0].beforeContent;
  delete legacy.revisions[0].afterContent;
  assert.equal(version(latest, 1), null);
  assert.equal(version(latest, 1, legacy), null);
  assert.equal(version(latest, 9, record), null);
  assert.equal(version(latest, 0, record), null);
  assert.equal(version(latest, 1, { ...record, fileId: "different-file" }), null);
  assert.equal(version({ ...latest, attachmentOnly: true }, 1, record), null);
  assert.deepEqual(version({ ...latest, attachmentOnly: true }, 2, record), { ...latest, attachmentOnly: true });
});

test("旧版本的标注源始终是旧快照，不能越过当前已保存版本守卫", () => {
  const { record, latest } = edited();
  const snapshot = version(latest, 1, record)!;
  const annotation = createTaskFileAnnotation({ taskId: "task", file: snapshot, authorId: "zhou", authorName: "周岚", body: "旧版本意见", anchor: { kind: "file", location: "整份文件" } });
  assert.equal(annotation.version, 1);
  assert.equal(annotation.source.content, first.content);
  assert.throws(() => validateTaskFileAnnotations("task", [], [annotation], { actorId: "zhou", files: [latest] }), /版本|已保存内容/);
  assert.deepEqual(editing.getTaskFileContent(latest), record.content);
});

test("PDF 与表格读取各自历史快照，不把原始二进制冒充中间修订版本", () => {
  const fixtures: Array<{ file: TaskFileNode; next: editing.TaskFileContent }> = [
    { file: { ...first, name: "规则.pdf", content: undefined, previewData: { kind: "pdf", pages: ["第一页", "第二页"] } }, next: { kind: "pdf", pages: ["第一版修改页", "第二页"] } },
    { file: { ...first, name: "排期.xlsx", content: undefined, previewData: { kind: "table", sheets: [{ name: "排期", columns: ["日期"], rows: [["周一"]] }] } }, next: { kind: "table", sheets: [{ name: "排期", columns: ["日期"], rows: [["周二"]] }] } },
  ];
  for (const { file, next } of fixtures) {
    const second = editing.createTaskFileRevision(file, next, "周岚", now)!;
    const current = editing.applyTaskFileEdit(file, second);
    const thirdContent = next.kind === "pdf" ? { kind: "pdf" as const, pages: ["第三版正文"] } : { kind: "table" as const, sheets: [{ name: "排期", columns: ["日期"], rows: [["周三"]] }] };
    const third = editing.createTaskFileRevision(current, thirdContent, "林川", "2026-10-21T04:00:00.000Z")!;
    third.revisions = [...second.revisions, ...third.revisions];
    const latest = editing.applyTaskFileEdit(current, third);
    const snapshot = version(latest, 2, third)!;
    assert.deepEqual(editing.getTaskFileContent(snapshot), next);
    assert.equal(snapshot.blobId, undefined);
    const original = version(latest, 1, third)!;
    assert.deepEqual(editing.getTaskFileContent(original), editing.getTaskFileContent(file));
    assert.equal(original.blobId, file.blobId);
  }
});
