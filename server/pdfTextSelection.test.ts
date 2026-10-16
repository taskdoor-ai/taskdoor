import assert from "node:assert/strict";
import test from "node:test";
import { normalizePdfSelectionRects, normalizePdfTextRange } from "../src/features/tasks/files/lib/pdf-text-selection.ts";

test("PDF 页内偏移保留第二处重复文字的位置", () => {
  assert.deepEqual(normalizePdfTextRange("重复\n说明\n重复", 6, 8), {
    text: "重复", documentText: "重复\n说明\n重复", selectionStart: 6, selectionEnd: 8,
  });
});

test("PDF 选区裁掉首尾空白时同步移动偏移，保留跨行原文", () => {
  const selected = normalizePdfTextRange("标题\n  第一行\n第二行  \n尾", 3, 14);
  assert.deepEqual(selected, {
    text: "第一行\n第二行", documentText: "标题\n  第一行\n第二行  \n尾", selectionStart: 5, selectionEnd: 12,
  });
  assert.equal(selected!.documentText.slice(selected!.selectionStart, selected!.selectionEnd), selected!.text);
});

test("PDF 中文与 emoji 使用 DOM 的 UTF16 偏移且不截断代理对", () => {
  assert.deepEqual(normalizePdfTextRange("甲😀乙\n丙😀丁", 5, 9), {
    text: "丙😀丁", documentText: "甲😀乙\n丙😀丁", selectionStart: 5, selectionEnd: 9,
  });
  assert.equal(normalizePdfTextRange("甲😀乙", 1, 3)?.text, "😀");
  assert.equal(normalizePdfTextRange("甲😀乙", 2, 3), null);
  assert.equal(normalizePdfTextRange("甲😀乙", 1, 2), null);
});

test("PDF 空选区、越界、倒置和非整数偏移不产生标注", () => {
  for (const [start, end] of [[-1, 2], [0, 99], [3, 2], [2, 2], [0.5, 2], [0, NaN]]) {
    assert.equal(normalizePdfTextRange("  正文  ", start, end), null);
  }
  assert.equal(normalizePdfTextRange(" \n\t ", 0, 4), null);
});

test("PDF 文字矩形按页面 CSS 坐标规范化并裁掉页外部分", () => {
  assert.deepEqual(normalizePdfSelectionRects([
    { left: 80, top: 60, width: 60, height: 10 },
    { left: 120, top: 80, width: 100, height: 10 },
    { left: 400, top: 200, width: 20, height: 10 },
  ], { left: 100, top: 50, width: 200, height: 100 }), [
    { x: 0, y: 0.1, width: 0.2, height: 0.1 },
    { x: 0.1, y: 0.3, width: 0.5, height: 0.1 },
  ]);
});

test("PDF 未完成布局和无效矩形不生成截图区域", () => {
  assert.deepEqual(normalizePdfSelectionRects([{ left: 0, top: 0, width: 10, height: 10 }], { left: 0, top: 0, width: 0, height: 20 }), []);
  assert.deepEqual(normalizePdfSelectionRects([
    { left: NaN, top: 0, width: 10, height: 10 },
    { left: 0, top: 0, width: -1, height: 10 },
  ], { left: 0, top: 0, width: 20, height: 20 }), []);
});
