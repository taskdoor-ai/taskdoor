import assert from "node:assert/strict";
import test from "node:test";
import { getPdfPageRegion, normalizePdfRegionDrag, resolvePdfSelectionMode } from "../src/features/tasks/files/lib/pdf-region-selection.ts";

test("阅读模式保持原生选字，标注的无文字页自动框选，有文字页可切换", () => {
  assert.equal(resolvePdfSelectionMode({ annotationMode: false, hasText: false, preferredMode: "region" }), "text");
  assert.equal(resolvePdfSelectionMode({ annotationMode: true, hasText: false, preferredMode: "text" }), "region");
  assert.equal(resolvePdfSelectionMode({ annotationMode: true, hasText: true, preferredMode: "text" }), "text");
  assert.equal(resolvePdfSelectionMode({ annotationMode: true, hasText: true, preferredMode: "region" }), "region");
});

test("PDF 同页框选按实际显示尺寸归一化，缩放不改变锚点", () => {
  const expected = { x: 0.1, y: 0.2, width: 0.4, height: 0.3 };
  assert.deepEqual(normalizePdfRegionDrag({ x: 120, y: 90 }, { x: 200, y: 150 }, { left: 100, top: 50, width: 200, height: 200 }), expected);
  assert.deepEqual(normalizePdfRegionDrag({ x: 140, y: 130 }, { x: 300, y: 250 }, { left: 100, top: 50, width: 400, height: 400 }), expected);
});

test("反向拖选和页外 pointer capture 坐标裁剪回起始页面", () => {
  assert.deepEqual(normalizePdfRegionDrag({ x: 180, y: 130 }, { x: 40, y: 30 }, { left: 100, top: 50, width: 200, height: 100 }), { x: 0, y: 0, width: 0.4, height: 0.8 });
  assert.deepEqual(normalizePdfRegionDrag({ x: 110, y: 60 }, { x: 900, y: 900 }, { left: 100, top: 50, width: 200, height: 100 }), { x: 0.05, y: 0.1, width: 0.95, height: 0.9 });
});

test("点击、小于六像素的框选和无效坐标不生成区域", () => {
  const page = { left: 0, top: 0, width: 200, height: 100 };
  for (const end of [{ x: 10, y: 10 }, { x: 15, y: 90 }, { x: 90, y: 15 }, { x: NaN, y: 50 }]) assert.equal(normalizePdfRegionDrag({ x: 10, y: 10 }, end, page), null);
  assert.equal(normalizePdfRegionDrag({ x: 10, y: 10 }, { x: 80, y: 80 }, { ...page, width: 0 }), null);
  assert.equal(normalizePdfRegionDrag({ x: 10, y: 10 }, { x: 80, y: 80 }, { ...page, top: Infinity }), null);
});

test("PDF 区域标注只出现在其明确页码上，旧缺页码锚点不猜第一页", () => {
  const region = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
  assert.deepEqual(getPdfPageRegion({ kind: "region", region, pageIndex: 2 }, 2), region);
  assert.equal(getPdfPageRegion({ kind: "region", region, pageIndex: 2 }, 0), null);
  assert.equal(getPdfPageRegion({ kind: "region", region }, 0), null);
  assert.equal(getPdfPageRegion({ kind: "text", region, pageIndex: 2 }, 2), null);
  assert.equal(getPdfPageRegion({ kind: "region", region, pageIndex: -1 }, -1), null);
});

test("区域标记拒绝越界、空框和无效页码", () => {
  for (const region of [{ x: -0.1, y: 0, width: 0.2, height: 0.2 }, { x: 0.9, y: 0, width: 0.2, height: 0.2 }, { x: 0, y: 0, width: 0, height: 0.2 }, { x: NaN, y: 0, width: 0.2, height: 0.2 }]) assert.equal(getPdfPageRegion({ kind: "region", region, pageIndex: 0 }, 0), null);
  assert.equal(getPdfPageRegion({ kind: "region", region: { x: 0, y: 0, width: 1, height: 1 }, pageIndex: 0.5 }, 0.5), null);
});
