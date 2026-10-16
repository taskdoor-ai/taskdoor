import assert from "node:assert/strict";
import test from "node:test";
import { reportVisibleDiscussionRead } from "../src/features/tasks/discussion/lib/discussion-read.ts";

function element({ presented = true, hidden = false } = {}): HTMLElement {
  return {
    getClientRects: () => presented ? [{}] : [],
    closest: () => hidden ? {} : null,
  } as unknown as HTMLElement;
}

test("同一讨论区重复打开来源，每次实际呈现后都产生新回执", () => {
  const calls: Array<{ ids: string[]; through: string }> = [];
  const input = { active: true, readable: true, content: element(), visibilityState: "visible" as const, activityIds: ["first", "second"], onRead: (ids: string[], through: string) => calls.push({ ids, through }) };
  assert.equal(reportVisibleDiscussionRead(input), true, "初次进入区域可报告阅读");
  assert.equal(reportVisibleDiscussionRead({ ...input, source: element() }), true, "仍在同一讨论区时，成功呈现消息来源后再次报告");
  assert.equal(reportVisibleDiscussionRead(input), true, "区域级通知再次打开也有独立回执");
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map(call => call.ids), [["first", "second"], ["first", "second"], ["first", "second"]]);
  assert.ok(calls.every(call => Number.isFinite(Date.parse(call.through))));
});

test("导航前、隐藏或不存在的来源不产生已读回执", () => {
  let reads = 0;
  const input = { active: true, readable: true, content: element(), visibilityState: "visible" as const, activityIds: ["first"], onRead: () => { reads++; } };
  for (const patch of [
    { active: false }, { readable: false }, { content: null }, { content: element({ hidden: true }) },
    { visibilityState: "hidden" as const }, { source: null }, { source: element({ presented: false }) }, { source: element({ hidden: true }) },
  ]) assert.equal(reportVisibleDiscussionRead({ ...input, ...patch }), false);
  assert.equal(reads, 0);
});
