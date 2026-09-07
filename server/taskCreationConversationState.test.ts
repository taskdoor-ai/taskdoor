import assert from "node:assert/strict";
import test from "node:test";
import { workspaceRootId, type WorkspaceNode } from "../src/data/workspaceNodes.ts";
import { buildTaskCreationConversationRecord, restoreTaskCreationConversationState } from "../src/lib/taskCreationConversationState.ts";
import type { TaskPlanDraft } from "../src/lib/taskAssistantProtocol.ts";
import { createWorkspaceTasksFromDraft, WorkspaceTaskCreationError } from "../src/lib/workspaceTaskCreation.ts";

const draft: TaskPlanDraft = {
  mainTask: { endDate: "", goal: "完成交付", labels: [], ownerId: "周岚", participantIds: [], startDate: "", title: "追加子任务" },
  subtasks: [],
};

test("保存和恢复未完成会话时保留父任务创建目标", () => {
  const saved = buildTaskCreationConversationRecord({ createdPlan: null, id: "c1", output: { draft } }, "parent-1");
  assert.equal(saved.pendingParentTaskId, "parent-1");
  assert.deepEqual(restoreTaskCreationConversationState(saved), { pendingParentTaskId: "parent-1" });
});

test("旧会话记录兼容为空目标，已完成会话不会恢复父任务目标", () => {
  assert.deepEqual(restoreTaskCreationConversationState({ createdPlan: null, output: { draft } }), { pendingParentTaskId: null });
  const completed = buildTaskCreationConversationRecord({ createdPlan: { mainTaskId: "done" }, output: { draft } }, "parent-1");
  assert.equal("pendingParentTaskId" in completed, false);
  assert.deepEqual(restoreTaskCreationConversationState(completed), { pendingParentTaskId: null });
});

test("恢复的父任务目标失效时可识别失败，草案随后可原样独立创建", () => {
  const restored = restoreTaskCreationConversationState({ createdPlan: null, output: { draft }, pendingParentTaskId: "deleted-parent" });
  const nodes: WorkspaceNode[] = [{ id: workspaceRootId, kind: "folder", name: "任务", parentId: null, updatedAt: "刚刚" }];
  assert.throws(
    () => createWorkspaceTasksFromDraft(nodes, draft, { idForIndex: () => "child", parentTaskId: restored.pendingParentTaskId ?? undefined }),
    WorkspaceTaskCreationError,
  );
  const independent = createWorkspaceTasksFromDraft(nodes, draft, { idForIndex: () => "independent" });
  assert.equal(independent.createdNodes[0].name, draft.mainTask.title);
  assert.equal(independent.createdNodes[0].parentTaskId, undefined);
});

test("缺失父任务创建失败后持久记录会清除父目标，恢复后的下一次确认独立创建", () => {
  const savedWithParent = buildTaskCreationConversationRecord({ createdPlan: null, id: "c1", output: { draft } }, "deleted-parent");
  const initialState = restoreTaskCreationConversationState(savedWithParent);
  const nodes: WorkspaceNode[] = [{ id: workspaceRootId, kind: "folder", name: "任务", parentId: null, updatedAt: "刚刚" }];

  assert.throws(
    () => createWorkspaceTasksFromDraft(nodes, draft, { idForIndex: () => "child", parentTaskId: initialState.pendingParentTaskId ?? undefined }),
    (error) => error instanceof WorkspaceTaskCreationError && error.code === "PARENT_TASK_NOT_FOUND",
  );

  const rewrittenAfterFailure = buildTaskCreationConversationRecord(savedWithParent, null);
  const persistedJson = JSON.stringify([rewrittenAfterFailure]);
  const restoredRecord = JSON.parse(persistedJson)[0] as typeof rewrittenAfterFailure;
  const restoredAfterFailure = restoreTaskCreationConversationState(restoredRecord);
  assert.equal(restoredAfterFailure.pendingParentTaskId, null);

  const nextConfirmation = createWorkspaceTasksFromDraft(nodes, draft, {
    idForIndex: () => "independent-after-retry",
    parentTaskId: restoredAfterFailure.pendingParentTaskId ?? undefined,
  });
  assert.equal(nextConfirmation.mainTaskId, "independent-after-retry");
  assert.equal(nextConfirmation.createdNodes[0].parentTaskId, undefined);
});
