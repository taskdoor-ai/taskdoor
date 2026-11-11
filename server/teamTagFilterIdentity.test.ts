import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskListProjection } from "../src/features/tasks/lib/task-list-projection.ts";
import type { TagDefinition, TaskNode } from "../src/shared/model/task-model.ts";

const tag: TagDefinition = { id: "local-team-tag", name: "旧名", icon: "tag", color: "blue" };
const task: TaskNode = { id: "task", kind: "task", parentId: "root", name: "任务", ownerId: "me", status: "进行中", updatedAt: "今天", labels: ["旧名"] };
const filter = { owner: "all", status: "all", tag: "all", tags: ["旧名"], tagIds: [tag.id] };

test("a selected local team tag still matches the same task after a catalog rename", () => {
  assert.equal(buildTaskListProjection([task], "", filter, [tag]).visibleTasks.length, 1);
  const renamed = { ...tag, name: "新名" };
  assert.deepEqual(buildTaskListProjection([{ ...task, labels: [renamed.name] }], "", filter, [renamed]).visibleTasks.map(item => item.id), [task.id]);
});

test("a missing identity cannot silently match a new same-name tag or a private catalog item", () => {
  const replacement = { ...tag, id: "different-local-id" };
  assert.equal(buildTaskListProjection([task], "", filter, [replacement]).visibleTasks.length, 0);
  assert.equal(buildTaskListProjection([task], "", filter, []).visibleTasks.length, 0);
});
