import assert from "node:assert/strict";
import test from "node:test";
import { canMoveTaskFileTo, getTaskFileMoveDestinations, getTaskFileFolderDestinations } from "../src/features/tasks/files/lib/task-file-action-options.ts";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";

const nodes: TaskFileNode[] = [
  { id: "root-b", kind: "folder", name: "B", parentId: null, updatedAt: "今天" },
  { id: "root-a", kind: "folder", name: "A", parentId: null, updatedAt: "今天" },
  { id: "child", kind: "folder", name: "资料", parentId: "root-b", updatedAt: "今天" },
  { id: "deep", kind: "folder", name: "附件", parentId: "child", updatedAt: "今天" },
  { id: "file", kind: "file", name: "说明.md", parentId: "child", updatedAt: "今天" },
  { id: "hidden", kind: "folder", name: "旧材料", parentId: null, archived: true, updatedAt: "昨天" },
  { id: "hidden-child", kind: "folder", name: "归档下的资料", parentId: "hidden", updatedAt: "昨天" },
];

test("移动目的地以任务文件顶层开始，并保持按同级名称排序的目录层级", () => {
  assert.deepEqual(getTaskFileMoveDestinations(nodes, "file").map(({ id, depth }) => ({ id, depth })), [
    { id: null, depth: 0 },
    { id: "root-a", depth: 1 },
    { id: "root-b", depth: 1 },
    { id: "child", depth: 2 },
    { id: "deep", depth: 3 },
  ]);
});

test("文件夹移动不提供自身及后代，不能提交当前位置", () => {
  assert.deepEqual(getTaskFileMoveDestinations(nodes, "child").map(({ id }) => id), [null, "root-a", "root-b"]);
  for (const target of ["root-b", "child", "deep"]) assert.equal(canMoveTaskFileTo(nodes, "child", target), false, target);
  assert.equal(canMoveTaskFileTo(nodes, "child", "root-a"), true);
});

test("文件可移到任务文件顶层，已在顶层的项目不能重复移动", () => {
  assert.equal(canMoveTaskFileTo(nodes, "file", null), true);
  assert.equal(canMoveTaskFileTo(nodes, "root-a", null), false);
  assert.equal(canMoveTaskFileTo(nodes, "file", "child"), false);
});

test("归档、不可见目录和不存在的项目不能作为移动目的地", () => {
  for (const target of ["hidden", "hidden-child", "file", "missing"]) assert.equal(canMoveTaskFileTo(nodes, "file", target), false, target);
  assert.deepEqual(getTaskFileMoveDestinations(nodes, "missing"), []);
  assert.equal(canMoveTaskFileTo(nodes, "hidden", "root-a"), false);
});

test("保存新文件可选择根目录和完整有效层级，不提供归档树或孤立目录", () => {
  assert.deepEqual(getTaskFileFolderDestinations([...nodes, { id: "orphan", kind: "folder", name: "失效目录", parentId: "missing", updatedAt: "今天" }]).map(({ id, depth }) => ({ id, depth })), [
    { id: null, depth: 0 }, { id: "root-a", depth: 1 }, { id: "root-b", depth: 1 }, { id: "child", depth: 2 }, { id: "deep", depth: 3 },
  ]);
  assert.deepEqual(getTaskFileFolderDestinations([]), [{ id: null, depth: 0 }]);
});
