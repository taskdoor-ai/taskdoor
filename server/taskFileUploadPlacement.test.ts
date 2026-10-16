import assert from "node:assert/strict";
import test from "node:test";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { placeTaskFileUploads } from "../src/features/tasks/files/lib/task-file-upload.ts";

const file = (id: string, name: string, parentId: string | null = null): TaskFileNode => ({ id, name, parentId, kind: "file", version: 1, updatedAt: "刚刚" });
const folder: TaskFileNode = { id: "folder", name: "交付资料", parentId: null, kind: "folder", updatedAt: "今天" };

test("a batch uses its chosen folder and avoids names from existing files and the same batch", () => {
  const current = [folder, file("existing", "方案.md", "folder"), file("other", "方案 (2).md")];
  const next = placeTaskFileUploads(current, [file("a", "方案.md"), file("b", "方案.md")], "folder");
  assert.deepEqual(next.slice(-2).map(node => [node.name, node.parentId]), [["方案 (2).md", "folder"], ["方案 (3).md", "folder"]]);
  assert.deepEqual(current.map(node => node.name), ["交付资料", "方案.md", "方案 (2).md"]);
});

test("placing an upload preserves intervening changes and supports the task files root", () => {
  const current = [folder, file("renamed", "用户刚重命名.md"), file("added", "后来创建.txt")];
  const next = placeTaskFileUploads(current, [file("upload", "资料.txt")], null);
  assert.deepEqual(next.slice(0, current.length), current);
  assert.equal(next.length, current.length + 1);
  assert.equal(next.at(-1)?.id, "upload");
  assert.equal(next.at(-1)?.parentId, null);
});

test("a removed, archived or non-folder destination rejects the whole batch", () => {
  for (const nodes of [[], [{ ...folder, archived: true }], [file("folder", "附件.md")]]) {
    assert.throws(() => placeTaskFileUploads(nodes, [file("upload", "资料.txt")], "folder"), /上传位置已不可用/);
    assert.equal(nodes.some(node => node.id === "upload"), false);
  }
});
