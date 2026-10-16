import assert from "node:assert/strict";
import test from "node:test";
import type { DiscussionDraft } from "../src/features/tasks/lib/task-collaboration.ts";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { mergeDiscussionDraft } from "../src/features/tasks/discussion/lib/discussion-draft-insertion.ts";

const file = (id: string, name: string): TaskFileNode => ({ id, name, kind: "file", parentId: null, updatedAt: "今天" });
const draft = (body = ""): DiscussionDraft => ({ body, mentions: [], attachments: [] });

test("标注讨论内容追加到现有未发送正文，保留原有字符并用空行分隔", () => {
  const current = draft("现有草稿 @林洁\n需要确认");
  const incoming = draft("来自文件标注：\n场地已确认");
  assert.equal(mergeDiscussionDraft(current, incoming).body, "现有草稿 @林洁\n需要确认\n\n来自文件标注：\n场地已确认");
  assert.equal(current.body, "现有草稿 @林洁\n需要确认");
});

test("合并提及和附件按稳定 ID 去重，保留原草稿附件与引用", () => {
  const existing = file("existing", "原附件.md");
  const added = file("added", "标注内容.md");
  const quote = { messageId: "source", author: "林洁", text: "原消息" };
  const current = { ...draft("原草稿"), mentions: ["lin", "zhou"], attachments: [existing], quote };
  const incoming = { ...draft("标注内容"), mentions: ["zhou", "han"], attachments: [file("existing", "不可覆盖.md"), added] };
  const merged = mergeDiscussionDraft(current, incoming);
  assert.deepEqual(merged.mentions, ["lin", "zhou", "han"]);
  assert.deepEqual(merged.attachments, [existing, added]);
  assert.deepEqual(merged.quote, quote);
  assert.deepEqual(current.attachments, [existing]);
  assert.deepEqual(incoming.mentions, ["zhou", "han"]);
});

test("任一正文为空时不添加多余分隔，纯附件草稿仍能带入", () => {
  assert.equal(mergeDiscussionDraft(draft(), draft("标注内容")).body, "标注内容");
  assert.equal(mergeDiscussionDraft(draft("原草稿"), draft()).body, "原草稿");
  const attachment = file("only", "截图.png");
  assert.deepEqual(mergeDiscussionDraft(draft(), { ...draft(), attachments: [attachment] }), { body: "", mentions: [], attachments: [attachment] });
});
