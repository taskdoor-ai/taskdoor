import assert from "node:assert/strict";
import test from "node:test";
import type { CollaborationMessage } from "../src/features/tasks/lib/task-collaboration.ts";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { getTaskContentIndicators } from "../src/features/tasks/lib/task-content-indicators.ts";

const message = (id: string, patch: Partial<CollaborationMessage> = {}): CollaborationMessage => ({ id, author: "成员", type: "member-post", message: "讨论内容", time: "时间未知", ...patch });
const file = (id: string, patch: Partial<TaskFileNode> = {}): TaskFileNode => ({ id, name: `${id}.md`, kind: "file", parentId: null, updatedAt: "2026-10-13T00:00:00Z", ...patch });

test("统一讨论累计数包含历史文件消息，排除系统活动与删除消息，文件仍排除目录及归档", () => {
  const result = getTaskContentIndicators({ enabled: true, messages: [
    message("post"), message("reply", { type: "member-reply", replyToActivityId: "post" }),
    message("deleted", { deletedAt: "2026-10-13T01:00:00Z" }), message("system", { type: "status-change" }),
    message("file-reply", { type: "member-reply", fileThreadId: "thread-a" }),
    message(""), message("blank-author", { author: " " }),
  ], files: [file("f1"), file("discussion-note", { attachmentOnly: true }), file("folder", { kind: "folder" }), file("archived", { archived: true })] });
  assert.deepEqual(result, { discussionCount: 3, fileCount: 1 });
});

test("按 ID 去重，采用最新消息及文件记录的删除和归档状态", () => {
  const result = getTaskContentIndicators({ enabled: true, messages: [
    message("edited"), message("edited", { message: "编辑后" }),
    message("deleted"), message("deleted", { deletedAt: "2026-10-13T01:00:00Z" }),
  ], files: [file("f1"), file("f1"), file("archived"), file("archived", { archived: true }), file(" ")] });
  assert.deepEqual(result, { discussionCount: 1, fileCount: 1 });
});

test("加载不可用时数量未知，已成功加载的空内容数量为零", () => {
  assert.deepEqual(getTaskContentIndicators({ enabled: false, messages: [message("a")], files: [file("f")] }), { discussionCount: null, fileCount: null });
  assert.deepEqual(getTaskContentIndicators({ enabled: false, messages: [], files: [] }), { discussionCount: null, fileCount: null });
  assert.deepEqual(getTaskContentIndicators({ enabled: true, messages: [], files: [] }), { discussionCount: 0, fileCount: 0 });
});

test("累计数保留实际数量，视觉上的 99+ 由组件处理", () => {
  const result = getTaskContentIndicators({ enabled: true,
    messages: Array.from({ length: 123 }, (_, index) => message(`m-${index}`)),
    files: Array.from({ length: 101 }, (_, index) => file(`f-${index}`)),
  });
  assert.deepEqual(result, { discussionCount: 123, fileCount: 101 });
});
