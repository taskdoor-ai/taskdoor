import assert from "node:assert/strict";
import test from "node:test";
import { canEditTaskFile, isSupportedTaskFileUpload, TASK_FILE_UPLOAD_ACCEPT, TASK_FILE_UPLOAD_EXTENSIONS_LABEL, validateTaskFileUploads } from "../src/features/tasks/files/lib/task-file-capabilities.ts";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";

test("upload policy accepts only the previewable extension allowlist", () => {
  const supported = ["pdf", "ppt", "pptx", "png", "jpg", "jpeg", "gif", "webp", "svg", "md", "txt", "log", "html", "htm", "json", "xml"];
  for (const extension of supported) {
    assert.equal(isSupportedTaskFileUpload({ name: `文件.${extension.toUpperCase()}`, type: "application/octet-stream" }), true, extension);
    assert.ok(TASK_FILE_UPLOAD_ACCEPT.split(",").includes(`.${extension}`), extension);
  }
  assert.match(TASK_FILE_UPLOAD_EXTENSIONS_LABEL, /PDF/);
  assert.match(TASK_FILE_UPLOAD_EXTENSIONS_LABEL, /JSON/);
  assert.equal(TASK_FILE_UPLOAD_ACCEPT.includes("image/*"), false);
});

test("unsupported suffixes cannot bypass the policy with a supported MIME label", () => {
  for (const extension of ["doc", "docx", "xls", "xlsx", "csv", "tsv", "mdx", "heic", "heif", "tif", "tiff", "avif", "bmp", "ics", "mp3", "mp4", "zip", "data"]) {
    for (const type of ["application/json", "text/plain", "image/png", "application/pdf"]) {
      assert.equal(isSupportedTaskFileUpload({ name: `文件.${extension}`, type }), false, `${extension}: ${type}`);
    }
  }
});

test("only reliable supported MIME types can identify extensionless files", () => {
  for (const mimeType of ["application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "text/plain", "text/html", "application/xhtml+xml", " Application/JSON ; charset=UTF-8", "application/ld+json", "text/xml", "application/vnd.taskdoor+xml"]) {
    assert.equal(isSupportedTaskFileUpload({ name: "原件", mimeType }), true, mimeType);
  }
  for (const type of ["", "image/heic", "image/tiff", "image/avif", "audio/mpeg", "text/markdown", "application/octet-stream"]) {
    assert.equal(isSupportedTaskFileUpload({ name: "原件", type }), false, type);
  }
});

test("batch preflight reports every unsupported filename before upload work begins", () => {
  assert.doesNotThrow(() => validateTaskFileUploads([{ name: "说明.md" }, { name: "配置.xml" }]));
  assert.throws(() => validateTaskFileUploads([{ name: "说明.md" }, { name: "合同.docx" }, { name: "素材.zip" }]), error => error instanceof Error && error.message.includes("合同.docx") && error.message.includes("素材.zip") && error.message.includes("不支持"));
});

test("editing is limited to supported text sources even when a PDF has preset pages", () => {
  for (const extension of ["md", "txt", "log", "html", "htm", "json", "xml"]) assert.equal(canEditTaskFile({ name: `说明.${extension}` }), true, extension);
  for (const mimeType of ["text/plain", "text/html", "application/xhtml+xml", "application/json", "application/vnd.taskdoor+xml"]) assert.equal(canEditTaskFile({ name: "原件", mimeType }), true, mimeType);
  const pdf: TaskFileNode = { id: "pdf", kind: "file", name: "规则.pdf", parentId: null, updatedAt: "今天", previewData: { kind: "pdf", pages: ["可读快照"] } };
  assert.equal(canEditTaskFile(pdf), false);
  for (const extension of ["ppt", "pptx", "png", "svg", "docx", "xlsx", "csv", "mdx", "zip"]) assert.equal(canEditTaskFile({ name: `文件.${extension}`, mimeType: "text/plain" }), false, extension);
});
