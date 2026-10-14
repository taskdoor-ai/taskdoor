import assert from "node:assert/strict";
import test from "node:test";
import { discardCreationSession, hasUnsubmittedCreation } from "../src/features/tasks/lib/task-creation-exit.ts";
import type { CreationSession, CreationWorkspaceDraft } from "../src/features/tasks/lib/task-creation-sessions.ts";

const workspace = (patch: Partial<CreationWorkspaceDraft> = {}): CreationWorkspaceDraft => ({
  request: "", planning: null, answers: {}, processes: [], editingBrief: false, ...patch,
});
const session = (id: string, updatedAt: number, created = false): CreationSession => ({
  id, updatedAt, workspace: workspace({ request: "准备交付材料" }), clarificationStep: 0, parent: null,
  ...(created ? { created: { mainTaskId: "task-1", createdCount: 1, taskTitles: ["交付材料"] } } : {}),
});
function memoryStorage(raw: string | null, failure?: "read" | "write") {
  let value = raw;
  let writes = 0;
  return {
    get value() { return value; },
    get writes() { return writes; },
    getItem(_key: string) { if (failure === "read") throw new Error("unavailable"); return value; },
    setItem(_key: string, next: string) { if (failure === "write") throw new Error("quota"); value = next; writes += 1; },
    removeItem(_key: string) { if (failure === "write") throw new Error("blocked"); value = null; writes += 1; },
  };
}

test("空白及纯空格创建输入无需丢弃确认", () => {
  assert.equal(hasUnsubmittedCreation({ workspace: workspace() }), false);
  assert.equal(hasUnsubmittedCreation({ workspace: workspace({ request: " \n ", answers: { goal: " ", deliverable: "\n" } }) }), false);
});

test("输入、澄清、预览、生成过程及待保存编辑均属于未提交内容", () => {
  assert.equal(hasUnsubmittedCreation({ workspace: workspace({ request: "整理材料" }) }), true);
  assert.equal(hasUnsubmittedCreation({ workspace: workspace({ answers: { goal: "目标" } }) }), true);
  assert.equal(hasUnsubmittedCreation({ workspace: workspace({ answers: { deliverable: "结果" } }) }), true);
  assert.equal(hasUnsubmittedCreation({ workspace: workspace({ planning: { stage: "unavailable", request: "整理", message: "补充内容" } }) }), true);
  assert.equal(hasUnsubmittedCreation({ workspace: workspace({ planning: { stage: "clarify", request: "整理", scenarioId: "test", questions: [] } }) }), true);
  assert.equal(hasUnsubmittedCreation({ workspace: workspace({ processes: [{ id: 1, title: "生成", request: "整理", answers: {}, steps: [], activeStep: 0, status: "running" }] }) }), true);
  assert.equal(hasUnsubmittedCreation({ workspace: workspace(), pendingEdits: true }), true);
});

test("已创建或已丢弃优先于任何残留输入与编辑状态", () => {
  const draft = workspace({ request: "已创建的内容" });
  assert.equal(hasUnsubmittedCreation({ workspace: draft, completed: true, pendingEdits: true }), false);
  assert.equal(hasUnsubmittedCreation({ workspace: draft, discarded: true, pendingEdits: true }), false);
});

test("确认丢弃只清理当前未创建会话，保留其他草稿和创建记录", () => {
  const records = [session("current", 30), session("other", 20), session("created", 10, true)];
  const storage = memoryStorage(JSON.stringify(records));
  discardCreationSession(storage, "history", "current");
  assert.deepEqual(JSON.parse(storage.value!), records.slice(1));
  assert.equal(storage.writes, 1);
});

test("仅剩本次草稿时清理存储键", () => {
  const storage = memoryStorage(JSON.stringify([session("current", 1)]));
  discardCreationSession(storage, "history", "current");
  assert.equal(storage.value, null);
  assert.equal(storage.writes, 1);
});

test("已创建会话、空历史和不存在的会话不产生写入", () => {
  for (const raw of [null, "[]", JSON.stringify([session("other", 1)]), JSON.stringify([session("current", 1, true)])]) {
    const storage = memoryStorage(raw);
    discardCreationSession(storage, "history", "current");
    assert.equal(storage.value, raw);
    assert.equal(storage.writes, 0);
  }
});

test("损坏的创建历史报错并保留原文", () => {
  for (const raw of ["broken json", '[{"id":"current"}]']) {
    const storage = memoryStorage(raw);
    assert.throws(() => discardCreationSession(storage, "history", "current"), /保留/);
    assert.equal(storage.value, raw);
    assert.equal(storage.writes, 0);
  }
});

test("保存或移除失败明确保留本次草稿", () => {
  for (const records of [[session("current", 2), session("other", 1)], [session("current", 1)]]) {
    const raw = JSON.stringify(records);
    const storage = memoryStorage(raw, "write");
    assert.throws(() => discardCreationSession(storage, "history", "current"), /保留.*重试/);
    assert.equal(storage.value, raw);
    assert.equal(storage.writes, 0);
  }
});

test("读取失败不写入创建历史并说明内容保留", () => {
  const raw = JSON.stringify([session("current", 1)]);
  const storage = memoryStorage(raw, "read");
  assert.throws(() => discardCreationSession(storage, "history", "current"), /保留.*重试/);
  assert.equal(storage.value, raw);
  assert.equal(storage.writes, 0);
});
