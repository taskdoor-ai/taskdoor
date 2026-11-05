import assert from "node:assert/strict";
import test from "node:test";
import { canCreateWorkspaceSubtask } from "../src/features/tasks/lib/workspace-subtask-editing.ts";

test("负责人和参与者均能创建，空负责人任务仍允许参与者创建", () => {
  const parent = { ownerId: "owner", participantIds: ["collaborator"] };
  assert.equal(canCreateWorkspaceSubtask(parent, "owner", true), true);
  assert.equal(canCreateWorkspaceSubtask(parent, "collaborator", true), true);
  assert.equal(canCreateWorkspaceSubtask({ ...parent, ownerId: "" }, "collaborator", true), true);
});

test("其他团队成员、未加入及已失效身份没有创建权限", () => {
  const parent = { ownerId: "owner", participantIds: ["collaborator"] };
  assert.equal(canCreateWorkspaceSubtask(parent, "other", true), false);
  assert.equal(canCreateWorkspaceSubtask(parent, "owner", false), false);
  assert.equal(canCreateWorkspaceSubtask(parent, "collaborator", false), false);
  assert.equal(canCreateWorkspaceSubtask({ ownerId: "", participantIds: [] }, "", true), false);
  assert.equal(canCreateWorkspaceSubtask(undefined, "owner", true), false);
});
