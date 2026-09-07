import assert from "node:assert/strict";
import test from "node:test";
import {
  createFolder,
  deleteFolder,
  getDefaultFileIcon,
  getNodePath,
  getPreviewKind,
  getSelectionAfterRemoval,
  moveNode,
  renameNode,
  restoreDefaultIcon,
  setNodeIcon,
  sortTaskFileNodes,
} from "../src/lib/taskFileTree.ts";
import type { TaskFileNode } from "../src/data/taskDetailMocks.ts";

const nodes: TaskFileNode[] = [
  { id: "root", kind: "folder", name: "项目", parentId: null, updatedAt: "今天" },
  { id: "child", kind: "folder", name: "资料", parentId: "root", updatedAt: "今天" },
  { id: "md", kind: "file", name: "说明.md", parentId: "child", format: "MD", version: 3, updatedAt: "今天" },
];

test("recognizes preview formats and default icons", () => {
  const cases = { "方案.md": "markdown", "记录.txt": "text", "数据.csv": "table", "名单.xlsx": "table", "说明.pdf": "pdf", "海报.png": "image", "合同.docx": "document", "模型.bin": "unknown" } as const;
  for (const [name, kind] of Object.entries(cases)) assert.equal(getPreviewKind(name), kind);
  assert.equal(getDefaultFileIcon("名单.xlsx"), "Sheet");
});

test("keeps folders before files and sorts names", () => {
  assert.deepEqual(sortTaskFileNodes([{ ...nodes[2], name: "B.md" }, { ...nodes[1], name: "A" }]).map((node) => node.name), ["A", "B.md"]);
});

test("creates and renames folders without sibling duplicates", () => {
  const created = createFolder(nodes, "root", "执行");
  assert.equal(created.nodes.at(-1)?.parentId, "root");
  assert.throws(() => createFolder(created.nodes, "root", "执行"), /同级已存在/);
  assert.equal(renameNode(nodes, "child", "参考资料").find((node) => node.id === "child")?.name, "参考资料");
});

test("moves a node exactly once and rejects descendants", () => {
  assert.equal(moveNode(nodes, "md", "root").find((node) => node.id === "md")?.parentId, "root");
  assert.throws(() => moveNode(nodes, "root", "child"), /后代/);
});

test("deletes non-empty folders with explicit policies", () => {
  const moved = deleteFolder(nodes, "child", "move-contents");
  assert.equal(moved.some((node) => node.id === "child"), false);
  assert.equal(moved.find((node) => node.id === "md")?.parentId, "root");
  const archived = deleteFolder(nodes, "child", "archive");
  assert.equal(archived.find((node) => node.id === "child")?.archived, true);
  assert.equal(archived.find((node) => node.id === "md")?.archived, true);
});

test("builds paths and restores icon overrides", () => {
  assert.deepEqual(getNodePath(nodes, "md").map((node) => node.name), ["项目", "资料", "说明.md"]);
  const customized = setNodeIcon(nodes, "md", "NotebookTabs");
  assert.equal(customized.find((node) => node.id === "md")?.iconName, "NotebookTabs");
  assert.equal(restoreDefaultIcon(customized, "md").find((node) => node.id === "md")?.iconName, undefined);
});

test("falls back to parent after removing selected node", () => {
  assert.equal(getSelectionAfterRemoval(nodes, "md", ["md"]), "child");
  assert.equal(getSelectionAfterRemoval(nodes, "root", ["root", "child", "md"]), null);
});
