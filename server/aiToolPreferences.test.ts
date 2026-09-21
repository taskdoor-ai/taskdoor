import assert from "node:assert/strict";
import test from "node:test";
import { aiToolIds } from "../src/lib/aiTools.ts";
import { createAiToolPreferenceStore, defaultAiTool, parseAiToolPreferences } from "../src/lib/aiToolPreferences.ts";

function storage() {
  let value: string | null = null;
  return { read: () => value, write: (next: string) => { value = next; } };
}

test("旧 CodeBuddy 偏好迁移到 WorkBuddy，保留默认、位置和使用记录并去重", () => {
  const raw = JSON.stringify({ version: 1, order: ["CodeBuddy", "Cursor", "ChatGPT", "WorkBuddy", "Claude Code"], used: ["CodeBuddy", "Cursor", "WorkBuddy"] });
  const access = { ...storage(), read: () => raw };
  const store = createAiToolPreferenceStore(access);
  assert.equal(defaultAiTool(store.getSnapshot()), "WorkBuddy");
  assert.deepEqual(store.getSnapshot().order, ["WorkBuddy", "Cursor", "ChatGPT", "Claude Code"]);
  assert.deepEqual(store.getSnapshot().used, ["WorkBuddy", "Cursor"]);
  const reverse = parseAiToolPreferences(JSON.stringify({ version: 1, order: ["Cursor", "WorkBuddy", "Claude Code", "CodeBuddy", "ChatGPT"], used: ["WorkBuddy", "CodeBuddy"] }));
  assert.deepEqual(reverse.order, ["Cursor", "WorkBuddy", "Claude Code", "ChatGPT"]);
  assert.deepEqual(reverse.used, ["WorkBuddy"]);
});

test("首次没有默认工具，只有复制成功并尝试打开才记忆，失败和取消不记忆", () => {
  const store = createAiToolPreferenceStore();
  assert.equal(defaultAiTool(store.getSnapshot()), null);
  for (const state of ["copy-failed", "open-failed", "cancelled"]) store.recordAttempt("Cursor", state);
  assert.deepEqual(store.getSnapshot().used, []);
  store.recordAttempt("Cursor", "open-attempted");
  assert.equal(defaultAiTool(store.getSnapshot()), "Cursor");
  assert.deepEqual(store.getSnapshot().used, ["Cursor"]);
});

test("最近打开的工具自动置顶，重复使用旧工具也更新默认，刷新保持选择", () => {
  const access = storage();
  const store = createAiToolPreferenceStore(access);
  store.recordAttempt("WorkBuddy", "open-attempted");
  store.recordAttempt("Claude Code", "open-attempted");
  assert.equal(defaultAiTool(store.getSnapshot()), "Claude Code");
  store.recordAttempt("WorkBuddy", "open-attempted");
  assert.equal(defaultAiTool(store.getSnapshot()), "WorkBuddy");
  assert.deepEqual(store.getSnapshot().order, ["WorkBuddy", "Claude Code", "ChatGPT", "Cursor"]);
  assert.deepEqual(store.getSnapshot().used, ["WorkBuddy", "Claude Code"]);
  for (const status of ["copy-failed", "open-failed", "cancelled", "preview"]) store.recordAttempt("Cursor", status);
  assert.equal(defaultAiTool(store.getSnapshot()), "WorkBuddy");
  assert.deepEqual(createAiToolPreferenceStore(access).getSnapshot(), store.getSnapshot());
  assert.deepEqual(Object.keys(JSON.parse(access.read()!)).sort(), ["order", "used", "version"]);
});

test("损坏、未知和重复ID安全归一化，始终保留全部可选择工具", () => {
  for (const raw of [null, "broken", "null", "[]", '{"version":99}', '{"version":1,"used":{},"order":0}']) {
    const result = parseAiToolPreferences(raw);
    assert.deepEqual(result.order, aiToolIds);
    assert.equal(defaultAiTool(result), null);
  }
  const result = parseAiToolPreferences(JSON.stringify({ version: 1, order: ["Cursor", "other", "Cursor"], used: ["other", "Cursor", "Cursor"] }));
  assert.deepEqual(result.order, ["Cursor", "ChatGPT", "Claude Code", "WorkBuddy"]);
  assert.deepEqual(result.used, ["Cursor"]);
});

test("禁用存储仍能在本次会话中记忆并同步多个入口", () => {
  const store = createAiToolPreferenceStore({ read: () => { throw Error("denied"); }, write: () => { throw Error("denied"); } });
  let updates = 0;
  const stopA = store.subscribe(() => { updates++; });
  const stopB = store.subscribe(() => { updates++; });
  store.recordAttempt("Claude Code", "open-attempted");
  assert.equal(updates, 2);
  assert.equal(defaultAiTool(store.getSnapshot()), "Claude Code");
  stopA(); stopB();
});

test("其他页面的最近使用偏好变化与清空同步", () => {
  let changed!: (raw: string | null) => void;
  let stopped = false;
  const store = createAiToolPreferenceStore({ ...storage(), listen: handler => { changed = handler; return () => { stopped = true; }; } });
  const stop = store.subscribe(() => {});
  changed(JSON.stringify({ version: 1, order: ["WorkBuddy"], used: ["WorkBuddy"] }));
  assert.equal(defaultAiTool(store.getSnapshot()), "WorkBuddy");
  changed(null);
  assert.equal(defaultAiTool(store.getSnapshot()), null);
  stop(); assert.equal(stopped, true);
});

test("再次打开同一工具不重复写入，切换工具同步所有入口", () => {
  const access = storage();
  const store = createAiToolPreferenceStore(access);
  store.recordAttempt("ChatGPT", "open-attempted");
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications++; });
  store.recordAttempt("ChatGPT", "open-attempted");
  assert.equal(notifications, 0);
  store.recordAttempt("Cursor", "open-attempted");
  assert.equal(defaultAiTool(store.getSnapshot()), "Cursor");
  assert.equal(notifications, 1);
  assert.equal(defaultAiTool(createAiToolPreferenceStore(access).getSnapshot()), "Cursor");
  unsubscribe();
});
