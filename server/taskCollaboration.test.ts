import assert from "node:assert/strict";
import test from "node:test";
import type { TaskFileNode } from "../src/data/taskDetailMocks.ts";
import { getTaskDiscussionThreads } from "../src/lib/taskActivity.ts";
import {
  TASK_COLLABORATION_STORAGE_PREFIX,
  createCollaborationSnapshot, loadCollaboration, saveCollaboration,
  postCollaborationMessage, updateCollaborationMessage, deleteCollaborationMessage,
  setFileThreadResolved, replaceCollaborationFiles, mergeCollaborationMessages,
  type CollaborationMessage, type FileDiscussionThread,
} from "../src/lib/taskCollaboration.ts";

const now = "2026-09-14T09:00:00.000Z";
const file: TaskFileNode = { id: "file-a", kind: "file", name: "方案.md", parentId: "folder-a", updatedAt: now, content: "第一段\n需要确认的正文\n第三段", version: 3 };
const folder: TaskFileNode = { id: "folder-a", kind: "folder", name: "资料", parentId: null, updatedAt: now };
const seeds = [folder, file];
const people = [{ id: "zhou", name: "周岚" }, { id: "lin", name: "林川" }, { id: "chen", name: "陈宁" }];
const message = (id: string, patch: Partial<CollaborationMessage> = {}): CollaborationMessage => ({ id, author: "周岚", type: "member-post", message: "请确认", time: "刚刚", createdAt: now, ...patch });
const thread = (patch: Partial<FileDiscussionThread> = {}): FileDiscussionThread => ({ id: "thread-a", fileId: file.id, version: 3, quote: "需要确认的正文", documentText: file.content!, selectionStart: 4, selectionEnd: 11, createdBy: "周岚", createdAt: now, ...patch });
function memoryStorage() {
  const records = new Map<string, string>();
  const writes: string[] = [];
  return { records, writes, getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); writes.push(key); } };
}
const key = (scope: string) => `${TASK_COLLABORATION_STORAGE_PREFIX}${encodeURIComponent(scope)}`;

test("消息、附件、文件评论及通知一次保存，按团队与任务隔离并能回读", () => {
  const storage = memoryStorage();
  const initial = loadCollaboration(storage, "team-a:task-a", seeds);
  const attachment: TaskFileNode = { ...file, id: "upload-a", parentId: null, version: 1, blobId: "blob-upload-a", sizeBytes: 2, originalName: "方案.md" };
  const next = postCollaborationMessage(initial, { message: message("post-a", { fileThreadId: "thread-a", mentionedPrincipalIds: ["lin"] }), attachments: [attachment], thread: thread({ pageIndex: 1 }), visiblePeople: people });
  assert.equal(next.revision, 1);
  assert.equal(initial.files.length, 2);
  assert.equal(initial.messages.length, 0);
  assert.equal(saveCollaboration(storage, "team-a:task-a", 0, next).revision, 1);
  assert.equal(storage.writes.length, 1);
  const restored = loadCollaboration(storage, "team-a:task-a", []);
  assert.deepEqual(restored, next);
  assert.equal(restored.threads[0].pageIndex, 1, "PDF 页码刷新后仍保留");
  assert.equal(restored.files.find(item => item.id === "upload-a")?.blobId, attachment.blobId);
  assert.equal(loadCollaboration(storage, "team-b:task-a", []).messages.length, 0);
  assert.equal(loadCollaboration(storage, "team-a:task-b", []).messages.length, 0);
});

test("存储拒写时不发布半份消息或附件，原快照和原存储保持可重试", () => {
  const storage = memoryStorage();
  const initial = createCollaborationSnapshot(seeds);
  const next = postCollaborationMessage(initial, { message: message("post-a"), attachments: [{ ...file, id: "upload-a" }] });
  const rejecting = { getItem: storage.getItem, setItem() { throw new Error("quota"); } };
  assert.throws(() => saveCollaboration(rejecting, "team-a:task-a", 0, next), /保存/);
  assert.equal(initial.messages.length, 0);
  assert.deepEqual(initial.files, seeds);
  assert.equal(storage.records.size, 0);
  saveCollaboration(storage, "team-a:task-a", 0, next);
  assert.equal(loadCollaboration(storage, "team-a:task-a", []).messages.length, 1);
});

test("保存读取最新 revision 拒绝旧窗口覆盖，同一结果重复提交幂等", () => {
  const storage = memoryStorage();
  const initial = createCollaborationSnapshot(seeds);
  const first = postCollaborationMessage(initial, { message: message("first") });
  const stale = postCollaborationMessage(initial, { message: message("stale") });
  saveCollaboration(storage, "team:task", 0, first);
  assert.deepEqual(saveCollaboration(storage, "team:task", 0, first), first);
  assert.equal(storage.writes.length, 1);
  assert.throws(() => saveCollaboration(storage, "team:task", 0, stale), /变化|冲突|最新/);
  assert.deepEqual(loadCollaboration(storage, "team:task", []), first);
  assert.throws(() => saveCollaboration(storage, "team:task", 1, { ...first, revision: 4 }), /版本|revision/);
});

test("JSON 或结构损坏读取报错，保存不清空损坏记录", () => {
  const storage = memoryStorage();
  for (const raw of ["{", JSON.stringify({ revision: 1, files: seeds, messages: [], threads: [], notifications: "bad" }), JSON.stringify({ revision: 1, files: seeds, messages: [message("x", { attachmentRefs: [{ fileId: file.id, version: 0, name: file.name }] })], threads: [], notifications: [] })]) {
    storage.records.set(key("team:task"), raw);
    assert.throws(() => loadCollaboration(storage, "team:task", seeds), /损坏/);
    assert.throws(() => saveCollaboration(storage, "team:task", 0, postCollaborationMessage(createCollaborationSnapshot(seeds), { message: message("next") })), /损坏/);
    assert.equal(storage.getItem(key("team:task")), raw);
  }
  assert.equal(storage.writes.length, 0);
});

test("回复某条回复保留具体对象且归入原根串，重复提交不增加消息", () => {
  const root = message("root");
  const reply = message("reply", { author: "林川", type: "member-reply", replyToActivityId: "root" });
  const nested = message("nested", { type: "member-reply", replyToActivityId: "reply", quote: { messageId: "reply", author: "林川", text: "请确认" } });
  let snapshot = createCollaborationSnapshot([]);
  for (const item of [root, reply, nested]) snapshot = postCollaborationMessage(snapshot, { message: item });
  assert.equal(snapshot.messages.find(item => item.id === "nested")?.replyToActivityId, "reply");
  assert.deepEqual(snapshot.messages.find(item => item.id === "nested")?.quote, nested.quote);
  const groups = getTaskDiscussionThreads(snapshot.messages);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].activity.id, "root");
  assert.deepEqual(new Set(groups[0].replies.map(item => item.id)), new Set(["reply", "nested"]));
  assert.equal(postCollaborationMessage(snapshot, { message: nested }), snapshot);
});

test("文件讨论保留版本、原文和选择位置，回复继承文件串且不能跨串", () => {
  const initial = postCollaborationMessage(createCollaborationSnapshot(seeds), { message: message("root", { fileThreadId: "thread-a" }), thread: thread() });
  const next = postCollaborationMessage(initial, { message: message("reply", { author: "林川", type: "member-reply", replyToActivityId: "root" }) });
  assert.equal(next.messages[1].fileThreadId, "thread-a");
  assert.deepEqual(next.threads[0], thread());
  assert.throws(() => postCollaborationMessage(next, { message: message("cross", { type: "member-reply", replyToActivityId: "root", fileThreadId: "other" }), thread: thread({ id: "other" }) }), /讨论|跨/);
  assert.throws(() => postCollaborationMessage(next, { message: message("missing", { fileThreadId: "missing" }) }), /讨论/);
});

test("附件按文件 ID 去重、保留现有位置，同名新上传不覆盖已有正文", () => {
  const incoming = { ...file, parentId: null, name: "重命名.md", content: "错误覆盖", version: 9 };
  const uploaded = { ...file, id: "new-file", content: "另一份正文", version: 1 };
  const next = postCollaborationMessage(createCollaborationSnapshot(seeds), { message: message("post"), attachments: [incoming, incoming, uploaded] });
  assert.equal(next.files.length, 3);
  assert.deepEqual(next.files.find(item => item.id === file.id), file);
  assert.equal(next.files.find(item => item.id === uploaded.id)?.content, "另一份正文");
  assert.deepEqual(next.messages[0].attachmentRefs, [{ fileId: file.id, version: 3, name: file.name }, { fileId: uploaded.id, version: 1, name: file.name }]);
});

test("编辑只允许作者，既有样例消息可作为完整覆盖写入且保持回复关系", () => {
  const seed = message("seed", { replyToActivityId: "earlier", attachmentRefs: [{ fileId: file.id, version: 3, name: file.name }] });
  const initial = createCollaborationSnapshot(seeds);
  assert.throws(() => updateCollaborationMessage(initial, seed, "林川", { message: "冒名" }), /作者|本人/);
  const next = updateCollaborationMessage(initial, seed, "周岚", { message: "已补充", mentionedPrincipalIds: ["lin", "lin"] });
  assert.equal(next.revision, 1);
  assert.equal(next.messages[0].message, "已补充");
  assert.equal(next.messages[0].replyToActivityId, "earlier");
  assert.deepEqual(next.messages[0].attachmentRefs, seed.attachmentRefs);
  assert.deepEqual(next.messages[0].mentionedPrincipalIds, ["lin"]);
  assert.ok(next.messages[0].updatedAt);
  assert.equal(mergeCollaborationMessages([seed, message("other")], next.messages).length, 2);
  assert.equal(mergeCollaborationMessages([seed], next.messages)[0].message, "已补充");
});

test("删除只留消息占位，文件、引用和回复链保留且不可再次编辑", () => {
  const initial = postCollaborationMessage(createCollaborationSnapshot(seeds), { message: message("root"), attachments: [file] });
  const withReply = postCollaborationMessage(initial, { message: message("reply", { type: "member-reply", replyToActivityId: "root", quote: { messageId: "root", author: "周岚", text: "请确认" } }) });
  assert.throws(() => deleteCollaborationMessage(withReply, initial.messages[0], "林川"), /作者|本人/);
  const next = deleteCollaborationMessage(withReply, initial.messages[0], "周岚");
  assert.deepEqual(next.files, seeds);
  assert.equal(next.messages.length, 2);
  assert.ok(next.messages[0].deletedAt);
  assert.equal(next.messages[0].message, "");
  assert.equal(next.messages[1].replyToActivityId, "root");
  assert.equal(next.messages[1].quote?.text, "请确认");
  assert.throws(() => updateCollaborationMessage(next, next.messages[0], "周岚", { message: "复活" }), /删除/);
});

test("文件评论解决与重开保留源版本，仅创建人或管理者可变更", () => {
  const initial = postCollaborationMessage(createCollaborationSnapshot(seeds), { message: message("root", { fileThreadId: "thread-a" }), thread: thread() });
  assert.throws(() => setFileThreadResolved(initial, "thread-a", "林川", true), /权限|创建人/);
  const resolved = setFileThreadResolved(initial, "thread-a", "周岚", true);
  assert.ok(resolved.threads[0].resolvedAt);
  assert.equal(resolved.threads[0].resolvedBy, "周岚");
  const reopened = setFileThreadResolved(resolved, "thread-a", "林川", false, true);
  assert.equal(reopened.revision, 3);
  assert.equal(reopened.threads[0].resolvedAt, undefined);
  assert.equal(reopened.threads[0].resolvedBy, undefined);
  assert.deepEqual(reopened.threads[0], thread());
});

test("回复与重复 @ 合并为每个收件人一条本地通知，排除本人和不可见成员", () => {
  const initial = postCollaborationMessage(createCollaborationSnapshot([]), { message: message("root", { author: "林川" }) });
  const next = postCollaborationMessage(initial, { message: message("reply", { type: "member-reply", replyToActivityId: "root", mentionedPrincipalIds: ["lin", "lin", "zhou", "chen", "outsider"] }), visiblePeople: people });
  assert.deepEqual(next.notifications.map(item => ({ recipientId: item.recipientId, reason: item.reason })), [{ recipientId: "lin", reason: "reply" }, { recipientId: "chen", reason: "mention" }]);
  assert.ok(next.notifications.every(item => item.messageId === "reply" && item.actor === "周岚"));
  assert.equal(postCollaborationMessage(next, { message: next.messages[1], visiblePeople: people }), next);
});

test("引用样例回复也可找到通知对象，编辑不补发通知", () => {
  const next = postCollaborationMessage(createCollaborationSnapshot([]), { message: message("reply", { type: "member-reply", replyToActivityId: "seed", quote: { messageId: "seed", author: "林川", text: "原话" } }), visiblePeople: people });
  assert.equal(next.notifications[0].recipientId, "lin");
  const edited = updateCollaborationMessage(next, next.messages[0], "周岚", { message: "补充", mentionedPrincipalIds: ["chen"] });
  assert.deepEqual(edited.notifications, next.notifications);
});

test("文件移动或删除只替换文件树，保留讨论和历史附件引用", () => {
  const initial = postCollaborationMessage(createCollaborationSnapshot(seeds), { message: message("root", { fileThreadId: "thread-a" }), thread: thread(), attachments: [file] });
  const next = replaceCollaborationFiles(initial, [folder]);
  assert.equal(next.revision, 2);
  assert.deepEqual(next.threads, initial.threads);
  assert.deepEqual(next.messages, initial.messages);
  const storage = memoryStorage();
  saveCollaboration(storage, "team:task", 0, initial);
  saveCollaboration(storage, "team:task", 1, next);
  assert.deepEqual(loadCollaboration(storage, "team:task", seeds).files, [folder]);
});


test("种子消息通过上下文解析具体回复对象，以稳定成员 ID 创建通知", () => {
  const seed = message("seed", { author: "lin" });
  const next = postCollaborationMessage(createCollaborationSnapshot([]), {
    message: message("reply", { author: "zhou", type: "member-reply", replyToActivityId: "seed", mentionedPrincipalIds: ["zhou", "lin"] }),
    contextMessages: [seed], visiblePeople: people,
  });
  assert.equal(next.messages[0].replyToActivityId, "seed");
  assert.deepEqual(next.notifications.map(item => [item.recipientId, item.reason]), [["lin", "reply"]]);
});

test("编辑移除附件引用不删除文件，也不改变消息作者与原回复对象", () => {
  const initial = postCollaborationMessage(createCollaborationSnapshot(seeds), { message: message("root"), attachments: [file] });
  const next = updateCollaborationMessage(initial, initial.messages[0], "周岚", { message: "附件已移除", attachmentRefs: [] });
  assert.deepEqual(next.messages[0].attachmentRefs, []);
  assert.deepEqual(next.files, initial.files);
  assert.equal(next.messages[0].author, "周岚");
});

test("编辑新增附件与正文在同一次 revision 和单次存储写入中提交，失败可重试", () => {
  const storage = memoryStorage();
  const initial = postCollaborationMessage(createCollaborationSnapshot(seeds), { message: message("root"), attachments: [file] });
  saveCollaboration(storage, "team:edit", 0, initial);
  const uploaded: TaskFileNode = { ...file, id: "uploaded-on-edit", version: 1, blobId: "blob-on-edit" };
  const next = updateCollaborationMessage(initial, initial.messages[0], "周岚", { message: "补充附件", attachmentRefs: [...initial.messages[0].attachmentRefs!, { fileId: uploaded.id, version: 1, name: uploaded.name }] }, [uploaded]);
  assert.equal(next.revision, initial.revision + 1);
  assert.equal(next.files.find(item => item.id === uploaded.id)?.blobId, "blob-on-edit");
  assert.deepEqual(next.messages[0].attachmentRefs?.map(ref => ref.fileId), [file.id, uploaded.id]);
  const rejecting = { getItem: storage.getItem, setItem() { throw new Error("quota"); } };
  assert.throws(() => saveCollaboration(rejecting, "team:edit", initial.revision, next), /保存/);
  assert.deepEqual(loadCollaboration(storage, "team:edit", []), initial);
  assert.equal(initial.files.find(item => item.id === uploaded.id), undefined);
  saveCollaboration(storage, "team:edit", initial.revision, next);
  assert.equal(storage.writes.length, 2, "初始化后编辑只增加一次写入");
  assert.deepEqual(loadCollaboration(storage, "team:edit", []), next);
});

test("编辑保留已有附件的历史版本，同一文件当前版本不会重复加入或自动升级引用", () => {
  const initial = postCollaborationMessage(createCollaborationSnapshot(seeds), { message: message("root"), attachments: [file] });
  const newerFile = { ...file, version: 4, content: "新的正文" };
  const latest = replaceCollaborationFiles(initial, [folder, newerFile]);
  const uploaded = { ...file, id: "new-upload", version: 1 };
  const next = updateCollaborationMessage(latest, initial.messages[0], "周岚", { message: "继续引用第三版" }, [newerFile, uploaded]);
  assert.deepEqual(next.messages[0].attachmentRefs, [{ fileId: file.id, version: 3, name: file.name }, { fileId: uploaded.id, version: 1, name: uploaded.name }]);
  assert.equal(next.files.find(item => item.id === file.id)?.version, 4);
});

test("新增消息不能引用已归档附件，包括直接引用和传入旧文件对象", () => {
  const archived = createCollaborationSnapshot([folder, { ...file, archived: true }]);
  assert.throws(() => postCollaborationMessage(archived, { message: message("new"), attachments: [file] }), /归档/);
  assert.throws(() => postCollaborationMessage(archived, { message: message("new", { attachmentRefs: [{ fileId: file.id, version: 3, name: file.name }] }) }), /归档/);
  assert.equal(archived.messages.length, 0);
});

test("删除消息后拒绝新增直接回复，原有回复和历史引用仍保留", () => {
  const initial = postCollaborationMessage(createCollaborationSnapshot([]), { message: message("root") });
  const withReply = postCollaborationMessage(initial, { message: message("reply", { type: "member-reply", replyToActivityId: "root" }) });
  const deleted = deleteCollaborationMessage(withReply, initial.messages[0], "周岚");
  assert.throws(() => postCollaborationMessage(deleted, { message: message("new-reply", { type: "member-reply", replyToActivityId: "root" }), contextMessages: [initial.messages[0]] }), /删除/);
  assert.equal(deleted.messages[1].replyToActivityId, "root");
  const nested = postCollaborationMessage(deleted, { message: message("nested", { type: "member-reply", replyToActivityId: "reply" }) });
  assert.equal(nested.messages[2].replyToActivityId, "reply");
});
