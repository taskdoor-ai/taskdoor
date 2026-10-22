import assert from "node:assert/strict";
import test from "node:test";
import * as uploads from "../src/features/tasks/files/lib/task-file-upload.ts";

test("大文本下载回退覆盖HTML与各文本格式，只在内部处理窗口外生效", () => {
  const boundary = 20 * 1024 * 1024;
  for (const name of ["原件.html", "原件.htm", "原件.md", "原件.txt", "原件.log", "原件.json", "原件.xml"]) {
    assert.equal(uploads.isTaskFileTextPreviewDeferred({ name, sizeBytes: boundary }), false, name);
    assert.equal(uploads.isTaskFileTextPreviewDeferred({ name, sizeBytes: boundary + 1 }), true, name);
    assert.equal(uploads.isTaskFileTextPreviewDeferred({ name, sizeBytes: 1024 ** 3 }), true, name);
    assert.equal(uploads.isTaskFileTextPreviewDeferred({ name }), false, "未知字节不伪造大小");
  }
  assert.equal(uploads.isTaskFileTextPreviewDeferred({ name: "原件", mimeType: "text/html", sizeBytes: boundary + 1 }), true);
  for (const name of ["原件.pdf", "原件.pptx", "原件.png", "原件.mp4", "原件.mp3"]) {
    assert.equal(uploads.isTaskFileTextPreviewDeferred({ name, sizeBytes: 1024 ** 3 }), false, name);
  }
});
