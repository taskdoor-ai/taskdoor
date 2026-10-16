import assert from "node:assert/strict";
import test from "node:test";
import type { CollaborationMessage } from "../src/features/tasks/lib/task-collaboration.ts";
import { buildDiscussionFeed } from "../src/features/tasks/discussion/lib/discussion-feed.ts";

const message = (id: string, patch: Partial<CollaborationMessage> = {}): CollaborationMessage => ({
  id, type: "member-post", author: "周岚", message: `${id} 的内容`, time: "时间未知", ...patch,
});
const ids = (messages: readonly CollaborationMessage[]) => messages.map(item => item.id);

test("逐条消息按真实发布时间倒序，保留精确的直接父消息 ID", () => {
  const first = message("first", { createdAt: "2026-09-01T01:00:00Z" });
  const second = message("second", { createdAt: "2026-09-01T02:00:00Z" });
  const reply = message("reply", { type: "member-reply", replyToActivityId: first.id, createdAt: "2026-09-01T03:00:00Z" });
  const nested = message("nested", { type: "member-reply", replyToActivityId: reply.id, createdAt: "2026-09-01T04:00:00Z" });
  const latest = message("latest", { type: "member-reply", replyToActivityId: second.id, createdAt: "2026-09-01T05:00:00Z" });
  const feed = buildDiscussionFeed([nested, latest, second, reply, first]);
  assert.deepEqual(ids(feed.messages), ["latest", "nested", "reply", "second", "first"]);
  assert.deepEqual(Object.keys(feed), ["messages"], "平铺投影不提供同串入口的数据");
  assert.equal(reply.replyToActivityId, first.id);
  assert.equal(nested.replyToActivityId, reply.id, "直接父消息关系不能被主消息串归属覆盖");
});

test("孤立、循环及自引用回复保留一次，未知时间沿用原输入顺序", () => {
  const orphan = message("orphan", { type: "member-reply", replyToActivityId: "missing" });
  const child = message("child", { type: "member-reply", replyToActivityId: orphan.id });
  const a = message("a", { type: "member-reply", replyToActivityId: "b" });
  const b = message("b", { type: "member-reply", replyToActivityId: a.id });
  const tail = message("tail", { type: "member-reply", replyToActivityId: b.id });
  const self = message("self", { type: "member-reply", replyToActivityId: "self" });
  const source = [orphan, child, tail, b, a, self];
  const feed = buildDiscussionFeed(source);
  assert.deepEqual(ids(feed.messages), ids(source));
  assert.equal(new Set(ids(feed.messages)).size, source.length);
  assert.equal(feed.messages.find(item => item.id === tail.id)?.replyToActivityId, b.id);
  assert.equal(feed.messages.find(item => item.id === a.id)?.replyToActivityId, b.id);
});

test("删除记录不进入消息流，存活回复保留直接父 ID 且不暴露已删正文", () => {
  const root = message("root", { deletedAt: "2026-09-02T01:00:00Z", file: "秘密.md", attachmentRefs: [{ fileId: "secret", name: "秘密附件.pdf", version: 1 }], quote: { messageId: "secret", author: "周岚", text: "秘密引用" } });
  const deletedReply = message("deleted-reply", { type: "member-reply", replyToActivityId: root.id, deletedAt: root.deletedAt });
  const survivingReply = message("surviving-reply", { type: "member-reply", replyToActivityId: deletedReply.id });
  const gone = message("gone", { deletedAt: root.deletedAt });
  const feed = buildDiscussionFeed([root, deletedReply, survivingReply, gone]);
  assert.deepEqual(ids(feed.messages), [survivingReply.id]);
  assert.equal(feed.messages[0].replyToActivityId, deletedReply.id);
  assert.doesNotMatch(JSON.stringify(feed), /秘密|root 的内容|deleted-reply 的内容/);
  assert.equal(root.message, "root 的内容", "输入记录仍保留给存储层，投影不能删除源数据");
});

test("历史文件消息统一进入任务讨论，非讨论活动不进入消息流", () => {
  const file = message("file", { fileThreadId: "file-thread" });
  const fileReply = message("file-reply", { type: "member-reply", fileThreadId: file.fileThreadId, replyToActivityId: file.id });
  const activity = message("activity", { type: "status-change" });
  const reply = message("reply", { type: "member-reply", replyToActivityId: activity.id });
  const post = message("post");
  const feed = buildDiscussionFeed([file, activity, fileReply, reply, post]);
  assert.deepEqual(ids(feed.messages), [file.id, fileReply.id, reply.id, post.id]);
  assert.equal(fileReply.fileThreadId, file.fileThreadId, "历史归属保持，不改写保存记录");
});

test("完整 time 与 createdAt 共同排序，未知历史顺序稳定，编辑不改变位置", () => {
  const unknownA = message("unknown-a", { time: "刚刚" });
  const unknownB = message("unknown-b", { time: "9/14 17:30" });
  const newest = message("newest", { createdAt: "2026-09-14T04:00:00Z", time: "昨天" });
  const sameA = message("same-a", { createdAt: "2026-09-14T03:00:00Z", updatedAt: "2027-01-01T00:00:00Z" });
  const oldest = message("oldest", { time: "2026-09-14T02:00:00Z", createdAt: "invalid" });
  const sameB = message("same-b", { time: "2026-09-14T03:00:00Z" });
  const feed = buildDiscussionFeed([newest, unknownA, sameA, unknownB, oldest, sameB]);
  assert.deepEqual(ids(feed.messages), [newest.id, sameA.id, sameB.id, oldest.id, unknownA.id, unknownB.id]);
});

test("重复 ID 只保留第一条记录，投影不修改输入及其消息对象", () => {
  const original = message("same", { createdAt: "2026-09-01T01:00:00Z" });
  const duplicate = message("same", { message: "后续重复正文", createdAt: "2026-09-01T04:00:00Z" });
  const reply = message("reply", { type: "member-reply", replyToActivityId: original.id, createdAt: "2026-09-01T02:00:00Z" });
  const source = [reply, original, duplicate].map(item => Object.freeze(item));
  Object.freeze(source);
  const feed = buildDiscussionFeed(source);
  assert.deepEqual(feed.messages, [reply, original]);
  assert.equal(feed.messages[1], original);
  assert.deepEqual(ids(source), [reply.id, original.id, duplicate.id]);
  const deletedFirst = { ...original, deletedAt: "2026-09-01T03:00:00Z" };
  assert.deepEqual(buildDiscussionFeed([deletedFirst, duplicate]).messages, [], "后续重复记录不能恢复已删除正文");
});
