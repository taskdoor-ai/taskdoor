import assert from "node:assert/strict";
import test from "node:test";
import type { WorkspaceNode } from "../src/data/workspaceNodes.ts";
import { getDirectChildTaskCounts } from "../src/lib/taskRelationProjection.ts";

const task = (id: string, parentTaskId?: string): WorkspaceNode => ({
  id,
  kind: "task",
  name: id,
  ownerId: "周岚",
  parentId: "workspace-root",
  parentTaskId,
  status: "待开始",
  updatedAt: "刚刚",
});

test("只统计每个任务的直接下一级子任务", () => {
  const nodes: WorkspaceNode[] = [
    task("root"),
    task("child", "root"),
    task("grandchild", "child"),
    task("great-grandchild", "grandchild"),
    { id: "attachment", kind: "file", name: "附件", parentId: "child", fileType: "md", updatedAt: "刚刚" },
  ];

  const counts = getDirectChildTaskCounts(nodes);

  assert.equal(counts.get("root"), 1);
  assert.equal(counts.get("child"), 1);
  assert.equal(counts.get("grandchild"), 1);
  assert.equal(counts.has("great-grandchild"), false);
  assert.equal(counts.has("attachment"), false);
});
