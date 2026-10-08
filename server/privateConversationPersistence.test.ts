import assert from "node:assert/strict";
import test from "node:test";
import { persistConversationList } from "../src/features/tasks/lib/private-conversation-persistence.ts";

test("对话列表同步写入存储并安全处理写入失败", () => {
  const calls: string[] = [];
  const storage = { setItem: (key: string, value: string) => calls.push(`${key}:${value}`) };
  assert.equal(persistConversationList(storage, "conversations", [{ id: "one" }]), true);
  assert.deepEqual(calls, ['conversations:[{"id":"one"}]']);
  assert.equal(persistConversationList({ setItem: () => { throw new Error("blocked"); } }, "conversations", []), false);
});
