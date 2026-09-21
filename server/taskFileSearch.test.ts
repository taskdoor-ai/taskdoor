import assert from "node:assert/strict";
import test from "node:test";
import type { TaskFileNode } from "../src/data/taskDetailMocks.ts";
import { searchTaskFiles } from "../src/lib/taskFileSearch.ts";

const node = (id: string, name: string, parentId: string | null, kind: "file" | "folder" = "file"): TaskFileNode => ({ id, name, parentId, kind, updatedAt: "2026-09-15", version: 3 });
const files = [node("a", "交付成果", null, "folder"), node("b", "九月", "a", "folder"), node("c", "华东", "b", "folder"), node("d", "证据与记录", null, "folder"), node("one", "预算.xlsx", "c"), node("two", "预算.xlsx", "d"), node("root", "README.md", null)];

test("跨三层文件夹搜索，同名文件保留各自完整路径和原文件身份", () => {
  const results = searchTaskFiles(files, "预算");
  assert.equal(results.length, 2);
  assert.deepEqual(new Set(results.map(result => result.folderPath)), new Set(["交付成果 / 九月 / 华东", "证据与记录"]));
  for (const result of results) assert.strictEqual(result.file, files.find(file => file.id === result.file.id));
});

test("可按文件夹名称与文件名组合查找，忽略英文大小写和多余空格", () => {
  assert.deepEqual(searchTaskFiles(files, "  九月   XLSX ").map(result => result.file.id), ["one"]);
  assert.deepEqual(searchTaskFiles(files, "证据与记录").map(result => result.file.id), ["two"]);
  assert.equal(searchTaskFiles(files, "readme")[0].folderPath, "任务文件");
  assert.deepEqual(searchTaskFiles(files, "不存在的文件"), []);
});

test("搜索不暴露已归档文件、已归档文件夹后代或脱离可见文件树的文件", () => {
  const hidden = [node("archived-folder", "旧资料", null, "folder"), node("child", "预算.xlsx", "archived-folder"), node("deleted", "预算.xlsx", null), node("orphan", "预算.xlsx", "missing")];
  hidden[0].archived = true;
  hidden[2].archived = true;
  assert.deepEqual(searchTaskFiles(hidden, "预算"), []);
});
