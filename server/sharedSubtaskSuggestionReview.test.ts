import assert from "node:assert/strict";
import test from "node:test";
import * as review from "../src/features/tasks/lib/task-subtask-suggestions.ts";

const suggestion = (id: string, title = "核对授权"): review.SubtaskSuggestion => ({ id, title, goal: "确保素材可发布", completionCriteria: ["留存授权结论"], ownerId: "", endDate: "",
  source: { taskId: "parent", messageId: "message", body: "请核对授权", author: "member", itemKey: "license" }, contextKey: "source-v1", discussionContextKey: "thread-v1" });

test("the same source item keeps one identity across generation batches and renamed titles", () => {
  assert.equal(typeof review.coalesceSubtaskSuggestions, "function");
  const first = suggestion("batch-a");
  const second = suggestion("batch-b", "复核图片与字体授权");
  const items = review.coalesceSubtaskSuggestions([first, second]);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, review.subtaskSuggestionIdentity(first));
  assert.equal(items[0].title, second.title);
  assert.notEqual(review.subtaskSuggestionIdentity(first), review.subtaskSuggestionIdentity({ ...first, source: { ...first.source, itemKey: "brand" } }));
});

test("processed review round trips with its actual task link and retained edited input", () => {
  const item = suggestion("stable");
  const saved = { dismissedIds: [item.id], edits: {}, outcomes: { stable: { status: "added", taskId: "actual-child", at: "2026-11-12T09:00:00Z", suggestion: item } } };
  const loaded = review.readSubtaskSuggestionReview({ getItem: () => JSON.stringify(saved) }, "team", "parent");
  assert.deepEqual(loaded, saved);
  const ignored = { ...saved, outcomes: { stable: { status: "ignored", at: "2026-11-12T09:00:00Z", suggestion: { ...item, title: "用户改过的名称" } } } };
  assert.deepEqual(review.readSubtaskSuggestionReview({ getItem: () => JSON.stringify(ignored) }, "team", "parent"), ignored);
});

test("partial evidence cannot be added even if an entry point invokes creation directly", () => {
  assert.throws(() => review.createWorkspaceSuggestedSubtasks([
    { id: "parent", kind: "task", name: "父任务", teamId: "team", parentId: "root", status: "进行中", ownerId: "member", updatedAt: "2026-11-12T09:00:00Z" },
  ], "parent", [{ ...suggestion("stable"), contextGap: "授权清单未能读取，尚不能确认已有承接" }], {
    currentUserId: "member", teamId: "team", timeZone: "Asia/Shanghai", author: "member", activeMemberIds: ["member"], sourceMessages: [],
  }), /依据|资料/);
});
