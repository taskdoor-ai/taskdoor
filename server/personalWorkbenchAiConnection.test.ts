import assert from "node:assert/strict";
import test from "node:test";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import { buildPersonalWorkbenchModel } from "../src/lib/personalWorkbench.ts";
import { buildPersonalWorkbenchAiConnectionRequest } from "../src/lib/personalWorkbenchAiConnection.ts";

const task = (input: Partial<TaskNode> & Pick<TaskNode, "id" | "name">): TaskNode => {
  const { id, name, ...patch } = input;
  return {
    id,
    kind: "task",
    name,
    ownerId: "me-id",
    parentId: "root",
    status: "进行中",
    updatedAt: "2026-09-01",
    ...patch,
  };
};

test("我的工作连接只带入当前用户正式负责的完整任务列表", () => {
  const model = buildPersonalWorkbenchModel({
    asOf: "2026-09-01T10:00:00+08:00",
    currentUserId: "me-id",
    tasks: [
      task({ id: "active", name: "当前执行任务", plannedEndOn: "2026-09-02" }),
      task({ id: "completed", name: "已完成任务", status: "已完成" }),
      task({ id: "cancelled", name: "已取消任务", status: "已取消" }),
      task({ id: "participant", name: "仅参与的任务", ownerId: "other-id", participantIds: ["me-id"] }),
      task({ id: "proposal", name: "待接受负责人提议", ownerId: "other-id", proposedOwnerId: "me-id" }),
      task({ id: "other", name: "其他成员任务", ownerId: "other-id" }),
    ],
  });

  const request = buildPersonalWorkbenchAiConnectionRequest(model);
  assert.equal(request.workObject.kind, "任务列表");
  assert.equal(request.workObject.title, "我的任务列表");
  assert.match(request.workObject.meta ?? "", /共 3 项正式负责的任务/);
  const listItems = request.context.filter((item) => item.label === "任务");
  assert.equal(listItems.length, 3);
  const exported = listItems.map((item) => item.value).join("\n\n");
  for (const value of ["当前执行任务", "active", "已完成任务", "completed", "已取消任务", "cancelled", "状态："]) {
    assert.match(exported, new RegExp(value));
  }
  for (const excluded of ["仅参与的任务", "待接受负责人提议", "其他成员任务", "participant", "proposal", "other-id"]) {
    assert.doesNotMatch(exported, new RegExp(excluded));
  }
  assert.doesNotMatch(exported, /当前情况|任务类型|截止|记录时效|优先原因|下一步建议|讨论|文件正文/);
  assert.match(request.context[0].value, /不受左侧搜索、状态或标签筛选影响/);
  assert.match(request.context[0].value, /每项只含 Task ID、名称和真实状态/);
  assert.match(request.context[0].value, /不带入其他成员任务、待接受负责人提议、排序建议、讨论、文件正文或任务详情/);
  assert.deepEqual(request.contextPreview?.items, [{
    id: "owned-tasks",
    label: "我的任务列表",
    title: "我的任务列表",
    detail: "共 3 项正式负责的任务 · 每项包含 Task ID、名称、状态 · 数据快照 2026-09-01T10:00:00+08:00",
  }]);
});

test("没有正式负责任务时保留空任务列表，不生成占位任务", () => {
  const model = buildPersonalWorkbenchModel({
    asOf: "2026-09-01",
    currentUserId: "me-id",
    tasks: [task({ id: "proposal", name: "待接受负责人提议", ownerId: "other-id", proposedOwnerId: "me-id" })],
  });
  const request = buildPersonalWorkbenchAiConnectionRequest(model);
  assert.match(request.workObject.meta ?? "", /共 0 项正式负责的任务/);
  assert.match(request.contextPreview?.items[0].detail ?? "", /共 0 项正式负责的任务/);
  assert.deepEqual(request.context.map((item) => item.label), ["来源与范围"]);
  assert.doesNotMatch(JSON.stringify(request), /待接受负责人提议（proposal）|任务 ID：proposal/);
});
