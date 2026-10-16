import assert from "node:assert/strict";
import test from "node:test";
import { getTaskFileNodeIconName } from "../src/features/tasks/files/lib/task-file-icons.ts";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";

const file: TaskFileNode = { id: "file", kind: "file", name: "方案.pdf", parentId: null, updatedAt: "今天", iconName: "Star" };

test("文件按当前类型展示标识，旧自定义图标不覆盖类型", () => {
  for (const [name, expected] of Object.entries({ "方案.pdf": "FileText", "数据.csv": "Sheet", "海报.png": "Image", "说明.md": "NotebookTabs", "记录.txt": "FileType2", "模型.bin": "File" })) {
    assert.equal(getTaskFileNodeIconName({ ...file, name }), expected, name);
  }
});

test("分组始终显示文件夹标识，并保留展开状态", () => {
  const folder: TaskFileNode = { ...file, kind: "folder", name: "材料" };
  assert.equal(getTaskFileNodeIconName(folder), "Folder");
  assert.equal(getTaskFileNodeIconName(folder, true), "FolderOpen");
});
