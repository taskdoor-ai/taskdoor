import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeWorkspaceNodes } from "../src/data/workspaceNodes.ts";
import { taskPlanDraftSchema } from "../src/lib/taskAssistantProtocol.ts";
import { createWorkspaceTasksFromDraft } from "../src/lib/workspaceTaskCreation.ts";

test("任务创建后负责人和参与人直接生效，不生成待接受流程", () => {
  const draft = taskPlanDraftSchema.parse({
    mainTask: {
      title: "发布复盘",
      goal: "形成复盘结论",
      completionCriteria: ["结论已记录"],
      executionTips: [],
      ownerId: "owner",
      participantIds: ["participant"],
      labels: [],
      startDate: "",
      endDate: "",
    },
    subtasks: [],
  });

  const created = createWorkspaceTasksFromDraft([], draft, {
    currentUserId: "creator",
    idForIndex: () => "created-task",
    participantsReviewed: true,
  }).createdNodes[0];

  assert.equal(created.ownerId, "owner");
  assert.equal(created.proposedOwnerId, undefined);
  assert.deepEqual(created.participantIds, ["participant"]);
});

test("读取旧的负责人提议时直接转为正式负责人", () => {
  const restored = normalizeWorkspaceNodes([{
    id: "legacy-task",
    kind: "task",
    name: "历史任务",
    ownerId: "old-owner",
    proposedOwnerId: "new-owner",
    parentId: "workspace-root",
    status: "进行中",
    updatedAt: "2026-09-19T10:00:00+08:00",
  }]).find(node => node.id === "legacy-task");

  assert.equal(restored?.kind, "task");
  if (restored?.kind !== "task") return;
  assert.equal(restored.ownerId, "new-owner");
  assert.equal(restored.proposedOwnerId, undefined);
});

test("当前任务界面与 AI 上下文不再展示负责人或参与人的待接受状态", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../src/components/TaskDetail.tsx", import.meta.url), "utf8");
  const workbench = readFileSync(new URL("../src/components/PersonalWorkbench.tsx", import.meta.url), "utf8");
  const taskContext = readFileSync(new URL("../src/lib/taskAiConnection.ts", import.meta.url), "utf8");
  const discussionContext = readFileSync(new URL("../src/lib/taskDiscussionAi.ts", import.meta.url), "utf8");

  assert.doesNotMatch(app, /onOwnerProposalChange=|发起负责人变更邀请|新增参与人（待接受）/);
  assert.doesNotMatch(detail, /initialProposedOwnerId|onOwnerProposalChange|pendingOwnerId|ownerInvitationStatus/);
  assert.doesNotMatch(workbench, /负责人提议待你回应|待接受提议不计入/);
  assert.doesNotMatch(taskContext + discussionContext, /待接受|已接受|接受状态/);
});
