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
  sortTaskFileNodes,
} from "../src/features/tasks/files/lib/task-file-tree.ts";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";

const nodes: TaskFileNode[] = [
  { id: "root", kind: "folder", name: "项目", parentId: null, updatedAt: "今天" },
  { id: "child", kind: "folder", name: "资料", parentId: "root", updatedAt: "今天" },
  { id: "md", kind: "file", name: "说明.md", parentId: "child", format: "MD", version: 3, updatedAt: "今天" },
];

test("recognizes preview formats and default icons", () => {
  const cases = { "方案.md": "markdown", "记录.txt": "text", "数据.csv": "table", "名单.xlsx": "table", "说明.pdf": "pdf", "海报.png": "image", "合同.docx": "document", "模型.bin": "unknown", "参考.url": "unknown" } as const;
  for (const [name, kind] of Object.entries(cases)) assert.equal(getPreviewKind(name), kind);
  assert.equal(getPreviewKind("参考.url", "text/uri-list"), "unknown");
  assert.equal(getPreviewKind("参考", "text/uri-list; charset=utf-8"), "unknown");
  assert.equal(getDefaultFileIcon("名单.xlsx"), "Sheet");
  assert.equal(getDefaultFileIcon("参考.url"), "File");
});

test("recognizes structured source extensions and normalized JSON/XML MIME types", () => {
  for (const name of ["快照.json", "快照.JSON"]) assert.equal(getPreviewKind(name, "text/plain"), "json");
  for (const name of ["配置.xml", "配置.XML"]) assert.equal(getPreviewKind(name, "application/octet-stream"), "xml");
  for (const mime of ["application/json", " Application/JSON ; charset=utf-8", "application/ld+json", "application/vnd.taskdoor+json"]) {
    assert.equal(getPreviewKind("source.data", mime), "json", mime);
  }
  for (const mime of ["application/xml", " text/XML ; charset=UTF-8", "application/vnd.taskdoor+xml"]) {
    assert.equal(getPreviewKind("source.data", mime), "xml", mime);
  }
});

test("explicit existing formats and SVG/HTML MIME types keep their preview paths", () => {
  for (const [name, mime, expected] of [
    ["流程.svg", "application/xml", "image"],
    ["页面.html", "application/xml", "html"],
    ["页面.htm", "application/xhtml+xml", "html"],
    ["source.data", "image/svg+xml", "image"],
    ["source.data", "application/xhtml+xml", "html"],
    ["文档.docx", "application/vnd.taskdoor+xml", "document"],
  ]) assert.equal(getPreviewKind(name, mime), expected, `${name}: ${mime}`);
  assert.equal(getPreviewKind("source.data", "application/notjson"), "unknown");
  assert.equal(getPreviewKind("source.data", "application/notxml"), "unknown");
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

test("builds paths through parent folders", () => {
  assert.deepEqual(getNodePath(nodes, "md").map((node) => node.name), ["项目", "资料", "说明.md"]);
});

test("removing the previewed file selects another file rather than a folder", () => {
  const withOtherFile = [...nodes, { ...nodes[2], id: "other", name: "另一个文件.md", parentId: "root" }];
  assert.equal(getSelectionAfterRemoval(withOtherFile, "md", ["md"]), "other");
  assert.equal(getSelectionAfterRemoval(nodes, "md", ["md"]), null);
  assert.equal(getSelectionAfterRemoval(nodes, "root", ["root", "child", "md"]), null);
});

test("preview selection follows the visible tree and skips unavailable folders", () => {
  const withOtherFiles = [
    ...nodes,
    { ...nodes[2], id: "root-file", name: "根文件.md", parentId: null },
    { ...nodes[2], id: "archived-file", name: "旧文件.md", archived: true },
    { ...nodes[1], id: "archived-folder", name: "归档", archived: true },
    { ...nodes[2], id: "hidden-child", parentId: "archived-folder" },
    { ...nodes[2], id: "orphan", parentId: "missing" },
  ];
  assert.equal(getSelectionAfterRemoval(withOtherFiles, "", []), "md");
  assert.equal(getSelectionAfterRemoval(withOtherFiles, "root-file", []), "root-file");
  for (const id of ["root", "missing", "archived-file", "hidden-child", "orphan"]) {
    assert.equal(getSelectionAfterRemoval(withOtherFiles, id, []), "md", id);
  }
  assert.equal(getSelectionAfterRemoval(nodes.filter(node => node.kind === "folder"), "root", []), null);
});
