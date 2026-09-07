import assert from "node:assert/strict";
import test from "node:test";
import { getPersonalTagStorageKey, loadPersonalTags, preparePersonalTaskTags } from "../src/lib/personalTags.ts";
import type { TagDefinition } from "../src/data/tagGroups.ts";
import type { TaskPlanDraft } from "../src/lib/taskAssistantProtocol.ts";
import { commitTaskAiStorage } from "../src/lib/taskAiAdjustmentStorage.ts";

const existing: TagDefinition[] = [{ id: "client", name: "客户沟通", icon: "users", color: "blue" }];
const task = { title: "跟进客户", goal: "确认结果", ownerId: "", participantIds: [], startDate: "", endDate: "", labels: ["客户沟通", " 新标签 ", "新标签", ""] };

test("个人标签隔离保存，并保留用户主动清空的列表", () => {
  const values = new Map([[getPersonalTagStorageKey("甲"), "[]"], [getPersonalTagStorageKey("乙"), JSON.stringify(existing)]]);
  const storage = { getItem: (key: string) => values.get(key) ?? null };
  assert.deepEqual(loadPersonalTags(storage, "甲", existing), []);
  assert.deepEqual(loadPersonalTags(storage, "乙", []), existing);
});

test("AI 为主任务和子任务补充标签，复用原标签的 ID 与样式并去重", () => {
  const result = preparePersonalTaskTags(existing, { mainTask: task, subtasks: [{ ...task, labels: ["子任务标签", "新标签"] }] });
  assert.deepEqual(result.draft.mainTask.labels, ["客户沟通", "新标签"]);
  assert.deepEqual(result.tags.map(tag => tag.name), ["客户沟通", "新标签", "子任务标签"]);
  assert.deepEqual(result.tags[0], existing[0]);
  assert.equal(existing.length, 1);
  assert.equal(preparePersonalTaskTags(result.tags, result.draft).tags.length, 3);
});

test("AI 可以维护个人标签的名称、外观和可用列表", () => {
  const draft: TaskPlanDraft = { mainTask: task, subtasks: [], tagOperations: [
    { action: "rename", name: "客户沟通", newName: "客户跟进" },
    { action: "upsert", name: "客户跟进", color: "green", icon: "flag" },
    { action: "delete", name: "新标签" },
  ] };
  const result = preparePersonalTaskTags(existing, draft);
  assert.deepEqual(result.tags, [{ id: "client", name: "客户跟进", color: "green", icon: "flag" }]);
  assert.deepEqual(result.draft.mainTask.labels, ["客户跟进"]);
  assert.deepEqual(existing[0], { id: "client", name: "客户沟通", icon: "users", color: "blue" });
});

test("标签重命名冲突时保留原列表并报告错误", () => {
  assert.throws(() => preparePersonalTaskTags([...existing, { id: "other", name: "已有名称", color: "gray", icon: "tag" }], {
    mainTask: task, subtasks: [], tagOperations: [{ action: "rename", name: "客户沟通", newName: "已有名称" }],
  }), /已存在/);
});

test("个人标签写入失败时，创建的任务也会回滚且不影响他人的标签", () => {
  const personalKey = getPersonalTagStorageKey("甲");
  const otherKey = getPersonalTagStorageKey("乙");
  const values = new Map([["tasks", "[]"], [personalKey, JSON.stringify(existing)], [otherKey, "[]"]]);
  const before = new Map(values);
  let failOnce = true;
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (key === personalKey && failOnce) { failOnce = false; throw new Error("quota"); }
      values.set(key, value);
    },
    removeItem: (key: string) => { values.delete(key); },
  };
  const next = preparePersonalTaskTags(existing, { mainTask: task, subtasks: [] });
  assert.throws(() => commitTaskAiStorage(storage, [["tasks", JSON.stringify([next.draft.mainTask])], [personalKey, JSON.stringify(next.tags)]]), /回滚/);
  assert.deepEqual(values, before);
});
