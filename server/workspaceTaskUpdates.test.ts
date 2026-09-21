import assert from "node:assert/strict";
import test from "node:test";
import { workspaceNodes } from "../src/data/workspaceNodes.ts";
import { updateWorkspaceTaskStatus } from "../src/lib/workspaceTaskUpdates.ts";

test("从概览修改状态只更新目标任务并记录最新时间", () => {
  const targetId = "fragrance-growth";
  const updated = updateWorkspaceTaskStatus(workspaceNodes, targetId, "已阻塞");
  const target = updated.find((node) => node.id === targetId);
  const untouched = updated.find((node) => node.id === "fragrance-content");

  assert.equal(target?.kind, "task");
  assert.equal(target?.kind === "task" ? target.status : undefined, "已阻塞");
  assert.ok(Number.isFinite(Date.parse(target?.updatedAt ?? "")));
  assert.equal(untouched, workspaceNodes.find((node) => node.id === "fragrance-content"));
});
