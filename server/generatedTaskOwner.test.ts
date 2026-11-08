import assert from "node:assert/strict";
import test from "node:test";
import { defaultGeneratedOwnerId } from "../src/features/tasks/lib/generated-task-owner.ts";
import { createCreationForm, withGeneratedOwnerDefaults } from "../src/features/tasks/lib/task-creation-form.ts";
import { commitManualWorkspaceTask } from "../src/features/tasks/lib/workspace-task-creation.ts";

const team = ["me", "lin", "wang"];

test("AI 未指定负责人或指定团队外人员时，由创建人负责；AI 指定的团队成员保留", () => {
  assert.equal(defaultGeneratedOwnerId("", "me", team), "me");
  assert.equal(defaultGeneratedOwnerId(undefined, "me", team), "me");
  assert.equal(defaultGeneratedOwnerId("outsider", "me", team), "me");
  assert.equal(defaultGeneratedOwnerId("lin", "me", team), "lin");
  assert.equal(defaultGeneratedOwnerId("", "", team), "", "没有可用的创建人时不凭空指定");
});

test("创建页方案：负责人为空时默认创建人，创建人不再重复列为参与人", () => {
  const form = createCreationForm("整理下周例会纪要", { currentUserId: "me", members: [], currentDate: "2026-11-08", timezone: "Asia/Shanghai" }, "single-task");
  const unowned = { ...form, mainTask: { ...form.mainTask, ownerId: "", participantIds: ["me", "lin"] } };
  const owned = withGeneratedOwnerDefaults(unowned, "me", team);
  assert.equal(owned.mainTask.ownerId, "me");
  assert.deepEqual(owned.mainTask.participantIds, ["lin"]);
  const chosen = withGeneratedOwnerDefaults({ ...form, mainTask: { ...form.mainTask, ownerId: "lin", participantIds: ["me"] } }, "me", team);
  assert.equal(chosen.mainTask.ownerId, "lin");
  assert.deepEqual(chosen.mainTask.participantIds, ["me"]);
});

test("一行新建保存时写入创建人为负责人", () => {
  const storage = new Map<string, string>();
  const result = commitManualWorkspaceTask({ getItem: key => storage.get(key) ?? null, setItem: (key, value) => void storage.set(key, value), removeItem: key => void storage.delete(key) }, [], {
    currentUserId: "me", teamId: "team", title: "准备发布会", content: { goal: "", completionCriteria: [] }, ownerId: "me", idForIndex: () => "new-task",
  });
  const created = result.nodes.find(node => node.id === result.mainTaskId);
  assert.equal(created && "ownerId" in created ? created.ownerId : undefined, "me");
});
