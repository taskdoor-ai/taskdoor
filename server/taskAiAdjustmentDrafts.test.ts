import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyTaskAiAdjustmentDraft,
  getTaskAiAdjustmentDraftKey,
  taskAiAdjustmentDraftReducer,
  type TaskAiAdjustmentDrafts,
} from "../src/lib/taskAiAdjustmentDrafts.ts";
import type { TaskAiAdjustmentProposal, TaskAiAdjustmentScope } from "../src/lib/taskAiAdjustmentTypes.ts";

const proposal: TaskAiAdjustmentProposal = {
  baseSignature: "task-version-1",
  instruction: "补充完成标准",
  scope: { kind: "task" },
  updates: [],
  additions: [],
  changes: [],
  summary: "建议已生成",
};

test("草稿键按模式、主任务、范围与子任务分别隔离", () => {
  const contexts: Array<["draft" | "saved", string, TaskAiAdjustmentScope]> = [
    ["draft", "task-1", { kind: "task" }],
    ["saved", "task-1", { kind: "task" }],
    ["draft", "task-2", { kind: "task" }],
    ["draft", "task-1", { kind: "subtasks" }],
    ["draft", "task-1", { kind: "subtask", taskId: "child-1" }],
    ["draft", "task-1", { kind: "subtask", taskId: "child-2" }],
  ];

  const keys = contexts.map(([mode, taskId, scope]) => {
    const key = getTaskAiAdjustmentDraftKey(mode, taskId, scope);
    assert.deepEqual(JSON.parse(key), [mode, taskId, scope.kind, scope.kind === "subtask" ? scope.taskId : null]);
    assert.equal(getTaskAiAdjustmentDraftKey(mode, taskId, { ...scope }), key);
    return key;
  });

  assert.equal(new Set(keys).size, contexts.length);
});

test("包含分隔符、引号、换行及 Unicode 的任务 ID 不会造成草稿键碰撞", () => {
  const ids = ["", "a:b", "a|b", 'a\"b', "a\\b", "a\nb", "[null]", "任务🚀"];
  const keys = ids.flatMap((taskId) => ids.map((childId) => (
    getTaskAiAdjustmentDraftKey("saved", taskId, { kind: "subtask", taskId: childId })
  )));

  assert.equal(new Set(keys).size, ids.length ** 2);
  assert.notEqual(
    getTaskAiAdjustmentDraftKey("saved", "a:subtask:b", { kind: "subtask", taskId: "c" }),
    getTaskAiAdjustmentDraftKey("saved", "a", { kind: "subtask", taskId: "b:subtask:c" }),
  );
});

test("patch 新范围以独立的空草稿补齐全部字段", () => {
  const state: TaskAiAdjustmentDrafts = {};
  const key = getTaskAiAdjustmentDraftKey("draft", "task-1", { kind: "task" });

  const next = taskAiAdjustmentDraftReducer(state, { type: "patch", key, patch: { instruction: "优化目标" } });

  assert.deepEqual(next[key], { instruction: "优化目标", proposal: null, error: "", notice: "" });
  assert.notEqual(next, state);
  assert.notEqual(next[key], emptyTaskAiAdjustmentDraft);
  assert.deepEqual(state, {});
  assert.deepEqual(emptyTaskAiAdjustmentDraft, { instruction: "", proposal: null, error: "", notice: "" });
});

test("patch 当前范围只改指定字段并保留其他范围和同范围未改字段", () => {
  const key = getTaskAiAdjustmentDraftKey("saved", "task-1", { kind: "task" });
  const otherKey = getTaskAiAdjustmentDraftKey("saved", "task-1", { kind: "subtasks" });
  const current = Object.freeze({ instruction: "旧指令", proposal, error: "旧错误", notice: "旧提示" });
  const other = Object.freeze({ instruction: "拆分子任务", proposal: null, error: "", notice: "保留" });
  const state: TaskAiAdjustmentDrafts = Object.freeze({ [key]: current, [otherKey]: other });

  const next = taskAiAdjustmentDraftReducer(state, { type: "patch", key, patch: { instruction: "新指令", error: "" } });

  assert.deepEqual(next[key], { instruction: "新指令", proposal, error: "", notice: "旧提示" });
  assert.equal(next[key].proposal, proposal);
  assert.equal(next[otherKey], other);
  assert.notEqual(next, state);
  assert.notEqual(next[key], current);
  assert.deepEqual(state[key], { instruction: "旧指令", proposal, error: "旧错误", notice: "旧提示" });
  assert.deepEqual(state[otherKey], { instruction: "拆分子任务", proposal: null, error: "", notice: "保留" });
});

test("patch 可以清空当前范围的候选、错误和提示但保留指令", () => {
  const key = getTaskAiAdjustmentDraftKey("saved", "task-1", { kind: "task" });
  const state: TaskAiAdjustmentDrafts = {
    [key]: { instruction: "保留指令", proposal, error: "旧错误", notice: "旧提示" },
  };

  const next = taskAiAdjustmentDraftReducer(state, {
    type: "patch", key, patch: { proposal: null, error: "", notice: "" },
  });

  assert.deepEqual(next[key], { instruction: "保留指令", proposal: null, error: "", notice: "" });
  assert.equal(state[key].proposal, proposal);
});

test("往返多个范围仍可取回各自的指令、候选、错误和提示", () => {
  const taskKey = getTaskAiAdjustmentDraftKey("draft", "task-1", { kind: "task" });
  const childKey = getTaskAiAdjustmentDraftKey("draft", "task-1", { kind: "subtask", taskId: "child-1" });
  const taskDraft = { instruction: "调整主任务", proposal, error: "主任务错误", notice: "主任务提示" };
  const childDraft = { instruction: "调整子任务", proposal: null, error: "子任务错误", notice: "子任务提示" };

  const taskState = taskAiAdjustmentDraftReducer({}, { type: "patch", key: taskKey, patch: taskDraft });
  const childState = taskAiAdjustmentDraftReducer(taskState, { type: "patch", key: childKey, patch: childDraft });
  const next = taskAiAdjustmentDraftReducer(childState, { type: "patch", key: taskKey, patch: { notice: "新提示" } });

  assert.deepEqual(next[taskKey], { ...taskDraft, notice: "新提示" });
  assert.deepEqual(next[childKey], childDraft);
  assert.deepEqual(taskState[taskKey], taskDraft);
  assert.equal(taskState[childKey], undefined);
});

test("discard 只删除当前范围且不更改原状态或其他草稿", () => {
  const key = getTaskAiAdjustmentDraftKey("saved", "task-1", { kind: "task" });
  const otherKey = getTaskAiAdjustmentDraftKey("saved", "task-1", { kind: "subtask", taskId: "child-1" });
  const current = Object.freeze({ instruction: "丢弃", proposal, error: "错误", notice: "提示" });
  const other = Object.freeze({ instruction: "保留", proposal: null, error: "", notice: "" });
  const state: TaskAiAdjustmentDrafts = Object.freeze({ [key]: current, [otherKey]: other });

  const next = taskAiAdjustmentDraftReducer(state, { type: "discard", key });

  assert.deepEqual(Object.keys(next), [otherKey]);
  assert.equal(next[otherKey], other);
  assert.notEqual(next, state);
  assert.equal(state[key], current);
  assert.equal(state[otherKey], other);
  assert.deepEqual(emptyTaskAiAdjustmentDraft, { instruction: "", proposal: null, error: "", notice: "" });
});

test("discard 不存在的范围直接返回原状态", () => {
  const key = getTaskAiAdjustmentDraftKey("saved", "task-1", { kind: "task" });
  const state: TaskAiAdjustmentDrafts = { [key]: { ...emptyTaskAiAdjustmentDraft, instruction: "保留" } };

  assert.equal(taskAiAdjustmentDraftReducer(state, { type: "discard", key: "missing" }), state);
  assert.equal(taskAiAdjustmentDraftReducer(state, { type: "discard", key: "toString" }), state);
});

test("patch 不把对象原型上的同名属性当成既有草稿", () => {
  const state: TaskAiAdjustmentDrafts = {};

  const next = taskAiAdjustmentDraftReducer(state, { type: "patch", key: "__proto__", patch: { instruction: "新指令" } });

  assert.ok(Object.hasOwn(next, "__proto__"));
  assert.deepEqual(next["__proto__"], { instruction: "新指令", proposal: null, error: "", notice: "" });
  assert.equal(Object.getPrototypeOf(next), Object.prototype);
  assert.deepEqual(state, {});
});
