import assert from "node:assert/strict";
import test from "node:test";
import { getPreviewKind } from "../src/features/tasks/files/lib/task-file-tree.ts";
import { getTaskFileContent } from "../src/features/tasks/files/lib/task-file-editing.ts";

test("PowerPoint 原件按扩展名或 MIME 识别为演示文稿", () => {
  for (const name of ["方案.ppt", "方案.PPTX"]) assert.equal(getPreviewKind(name), "presentation");
  for (const mime of ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]) {
    assert.equal(getPreviewKind("附件", mime), "presentation");
  }
});

test("演示文稿预览不把附带文字当作可编辑正文或新版原件", () => {
  for (const name of ["方案.ppt", "方案.pptx"]) assert.equal(getTaskFileContent({ id: "slides", kind: "file", name, parentId: null, updatedAt: "今天", content: "不能用此文字替代幻灯片", blobId: "original", version: 1 }), null);
});
