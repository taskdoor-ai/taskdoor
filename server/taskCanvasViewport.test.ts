import assert from "node:assert/strict";
import test from "node:test";
import { clampCanvasZoom, getCanvasPanPosition, getFitCanvasZoom, stepCanvasZoom } from "../src/lib/taskCanvasViewport.ts";

test("画布缩放始终限制在可读范围内", () => {
  assert.equal(clampCanvasZoom(0.2), 0.45);
  assert.equal(clampCanvasZoom(1.8), 1.4);
  assert.equal(stepCanvasZoom(1, 1), 1.1);
  assert.equal(stepCanvasZoom(0.45, -1), 0.45);
});

test("适合视野会同时参考画布宽高且不放大稀疏画布", () => {
  assert.equal(getFitCanvasZoom({ contentHeight: 720, contentWidth: 1200, viewportHeight: 540, viewportWidth: 900 }), 0.72);
  assert.equal(getFitCanvasZoom({ contentHeight: 360, contentWidth: 720, viewportHeight: 640, viewportWidth: 1200 }), 1);
});

test("拖动画布只换算视野滚动位置且不会越过起点", () => {
  assert.deepEqual(getCanvasPanPosition({ currentX: 130, currentY: 80, originLeft: 240, originTop: 150, startX: 100, startY: 100 }), { left: 210, top: 170 });
  assert.deepEqual(getCanvasPanPosition({ currentX: 500, currentY: 500, originLeft: 20, originTop: 30, startX: 100, startY: 100 }), { left: 0, top: 0 });
});
