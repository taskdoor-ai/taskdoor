import assert from "node:assert/strict";
import test from "node:test";
import { filterDiscussionMessages } from "../src/features/tasks/discussion/lib/discussion-filter.ts";
import { splitPinnedMessages } from "../src/features/tasks/discussion/lib/discussion-pins.ts";
import type { CollaborationMessage } from "../src/features/tasks/lib/task-collaboration.ts";

const message = (id: string, author: string, patch: Partial<CollaborationMessage> = {}): CollaborationMessage => ({ id, author, message: id, type: "member-post", time: "", ...patch });
const messages = [
  message("my-post", "me"), message("other-post", "other"),
  message("my-reply", "me", { replyToActivityId: "other-post", type: "member-reply" }),
  message("to-me", "other", { replyToActivityId: "my-post", type: "member-reply" }),
  message("self-reply", "me", { replyToActivityId: "my-post", type: "member-reply" }),
  message("mention", "other", { mentionedPrincipalIds: ["me"] }),
  message("all-members", "other", { mentionsAllTaskMembers: true }),
  message("plain-at", "other", { message: "@me 普通文本" }),
  message("attachment", "other", { message: "", attachmentRefs: [{ fileId: "missing", version: 1, name: "最终验收.PDF" }] }),
  message("legacy", "other", { file: "旧附件.md" }),
  message("deleted", "me", { deletedAt: "2026-11-20T01:00:00Z" }),
];
const options = { query: "", scope: "all" as const, attachmentsOnly: false, currentUser: "me", records: new Map(messages.map(item => [item.id, item])) };
const ids = (values: CollaborationMessage[]) => values.map(item => item.id);

test("讨论关系范围依据直接回复和有效提及，排除自回复和普通@文本误判", () => {
  assert.deepEqual(ids(filterDiscussionMessages(messages, { ...options, scope: "mine" })), ["my-post", "my-reply", "self-reply"]);
  assert.deepEqual(ids(filterDiscussionMessages(messages, { ...options, scope: "my-replies" })), ["my-reply"]);
  assert.deepEqual(ids(filterDiscussionMessages(messages, { ...options, scope: "replies-to-me" })), ["to-me"]);
  assert.deepEqual(ids(filterDiscussionMessages(messages, { ...options, scope: "related" })), ["my-post", "my-reply", "to-me", "self-reply", "mention", "all-members"]);
});

test("附件条件与原文、显示文本和关系范围取交集，失效附件仍按消息引用可找回", () => {
  assert.deepEqual(ids(filterDiscussionMessages(messages, { ...options, attachmentsOnly: true })), ["attachment", "legacy"]);
  assert.deepEqual(ids(filterDiscussionMessages(messages, { ...options, attachmentsOnly: true, query: " 验收 pdf " })), ["attachment"]);
  assert.deepEqual(ids(filterDiscussionMessages(messages, { ...options, attachmentsOnly: true, scope: "mine" })), []);
  assert.deepEqual(ids(filterDiscussionMessages(messages, { ...options, query: "translated", searchText: item => item.id === "other-post" ? "Translated text" : "" })), ["other-post"]);
  assert.deepEqual(ids(filterDiscussionMessages(messages, { ...options, query: "不存在" })), []);
});

test("同名不同ID不冒充本人，删除或缺失的回复原文不建立相关关系", () => {
  const records = new Map(options.records);
  records.set("my-post", { ...records.get("my-post")!, deletedAt: "2026-11-20T01:00:00Z" });
  assert.deepEqual(ids(filterDiscussionMessages(messages, { ...options, records, scope: "replies-to-me" })), []);
  assert.deepEqual(ids(filterDiscussionMessages(messages, { ...options, currentUser: "another-id", currentUserName: "同名", scope: "mine" })), []);
  assert.deepEqual(ids(filterDiscussionMessages([message("orphan", "other", { replyToActivityId: "absent" })], { ...options, scope: "replies-to-me" })), []);
});

test("筛选覆盖置顶和普通消息，清除条件后按原置顶与时间流顺序恢复", () => {
  const pins = [{ messageId: "my-post", pinnedAt: "2026-11-20T01:00:00Z", pinnedBy: "me" }, { messageId: "other-post", pinnedAt: "2026-11-20T02:00:00Z", pinnedBy: "me" }];
  const mine = splitPinnedMessages(filterDiscussionMessages(messages, { ...options, scope: "mine" }), pins);
  assert.deepEqual(ids(mine.pinned), ["my-post"]);
  assert.deepEqual(ids(mine.timeline), ["my-reply", "self-reply"]);
  const restored = splitPinnedMessages(filterDiscussionMessages(messages, options), pins);
  assert.deepEqual(ids(restored.pinned), ["other-post", "my-post"]);
  assert.deepEqual(ids(restored.timeline), ids(messages).filter(id => !["my-post", "other-post", "deleted"].includes(id)));
  assert.equal(pins.length, 2);
});
