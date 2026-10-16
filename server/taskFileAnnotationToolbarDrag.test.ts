import assert from "node:assert/strict";
import test from "node:test";
import { clampAnnotationToolbarPosition } from "../src/features/tasks/files/lib/annotation-toolbar-position.ts";

test("工具条在视口内拖动时保留位置，越界时两轴夹回可见范围", () => {
  const size = { width: 320, height: 48 };
  const viewport = { width: 1440, height: 900 };
  assert.deepEqual(clampAnnotationToolbarPosition({ left: 410, top: 300 }, size, viewport), { left: 410, top: 300 });
  assert.deepEqual(clampAnnotationToolbarPosition({ left: -100, top: -40 }, size, viewport), { left: 12, top: 12 });
  assert.deepEqual(clampAnnotationToolbarPosition({ left: 1600, top: 1000 }, size, viewport), { left: 1108, top: 840 });
});

test("窗口缩小后仍可夹回工具条，而非保留原桌面坐标", () => {
  assert.deepEqual(clampAnnotationToolbarPosition({ left: 1108, top: 840 }, { width: 320, height: 48 }, { width: 390, height: 640 }), { left: 58, top: 580 });
});

test("窄屏空间不足时缩小边缘留白，工具条宽于视口时从零坐标开始", () => {
  assert.deepEqual(clampAnnotationToolbarPosition({ left: 200, top: 200 }, { width: 380, height: 48 }, { width: 390, height: 640 }), { left: 5, top: 200 });
  assert.deepEqual(clampAnnotationToolbarPosition({ left: 200, top: 200 }, { width: 430, height: 700 }, { width: 390, height: 640 }), { left: 0, top: 0 });
});

test("夹取不改变来源位置或尺寸，自定义安全边距仍生效", () => {
  const position = Object.freeze({ left: -5, top: 999 });
  const size = Object.freeze({ width: 100, height: 40 });
  const viewport = Object.freeze({ width: 300, height: 200 });
  assert.deepEqual(clampAnnotationToolbarPosition(position, size, viewport, 8), { left: 8, top: 152 });
  assert.deepEqual(position, { left: -5, top: 999 });
});
