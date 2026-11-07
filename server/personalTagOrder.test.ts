import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement, type PointerEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { moveTagByOffset, reorderTags } from "../src/features/me/lib/tag-order.ts";
import { useTagReorder } from "../src/features/me/lib/useTagReorder.ts";
import type { TagDefinition } from "../src/shared/model/task-model.ts";

const tags: TagDefinition[] = [
  { id: "a", name: "甲", color: "blue", icon: "tag" },
  { id: "b", name: "乙", color: "green", icon: "flag" },
  { id: "c", name: "丙", color: "blue", icon: "users" },
  { id: "d", name: "丁", color: "blue", icon: "tag" },
];
const ids = (items: TagDefinition[]) => items.map(item => item.id);

test("标签可跨列移到目标之前或之后，其他项保持相对顺序", () => {
  assert.deepEqual(ids(reorderTags(tags, "d", "a", "before")), ["d", "a", "b", "c"]);
  assert.deepEqual(ids(reorderTags(tags, "a", "d", "after")), ["b", "c", "d", "a"]);
  assert.deepEqual(ids(reorderTags(tags, "b", "c", "after")), ["a", "c", "b", "d"]);
  assert.deepEqual(ids(reorderTags(tags, "d", "b", "after")), ["a", "b", "d", "c"]);
});

test("排序只创建新的数组，保留标签身份、名称和外观", () => {
  const before = structuredClone(tags);
  const next = reorderTags(tags, "a", "c", "after");
  assert.deepEqual(tags, before);
  assert.notEqual(next, tags);
  assert.equal(next[2], tags[0]);
  assert.equal(next[0], tags[1]);
});

test("原位置、失效身份及已经相邻的空移动不生成保存", () => {
  assert.equal(reorderTags(tags, "a", "a", "after"), tags);
  assert.equal(reorderTags(tags, "missing", "a", "before"), tags);
  assert.equal(reorderTags(tags, "a", "missing", "after"), tags);
  assert.equal(reorderTags(tags, "b", "c", "before"), tags);
  assert.equal(reorderTags(tags, "b", "a", "after"), tags);
});

test("键盘按阅读顺序或列跨度移动，首尾不越界", () => {
  assert.deepEqual(ids(moveTagByOffset(tags, "b", 1)), ["a", "c", "b", "d"]);
  assert.deepEqual(ids(moveTagByOffset(tags, "c", -2)), ["c", "a", "b", "d"]);
  assert.deepEqual(ids(moveTagByOffset(tags, "a", 2)), ["b", "c", "a", "d"]);
  assert.equal(moveTagByOffset(tags, "a", -1), tags);
  assert.equal(moveTagByOffset(tags, "d", 1), tags);
  assert.equal(moveTagByOffset(tags, "missing", 1), tags);
});

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function setup(onChange: (tags: TagDefinition[]) => void, onError = (_message: string) => {}) {
  const target = { dataset: { tagId: "c" }, getBoundingClientRect: () => ({ top: 0, height: 40 }) };
  let hit: typeof target | null = target;
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { elementFromPoint: () => hit && { closest: () => hit } } });
  const list = { contains: (element: unknown) => element === target, closest: () => null } as unknown as HTMLUListElement;
  let api!: ReturnType<typeof useTagReorder>;
  function Capture() { api = useTagReorder({ tags, onChange, onError, disabled: false, listRef: { current: list } }); return null; }
  renderToStaticMarkup(createElement(Capture));
  const handle = api.getHandleProps(tags[0]);
  const pointer = (x: number, y: number) => ({
    pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: y,
    preventDefault() {}, currentTarget: { focus() {}, setPointerCapture() {} },
  }) as unknown as PointerEvent<HTMLButtonElement>;
  return {
    handle, pointer, leave: () => { hit = null; },
    restore: () => { if (previous) Object.defineProperty(globalThis, "document", previous); else Reflect.deleteProperty(globalThis, "document"); },
  };
}

test("拖动经过目标只预览，松手才保存一次；轻点、取消或拖出列表不保存", () => {
  const saved: TagDefinition[][] = [];
  const context = setup(next => saved.push(next));
  const { handle, pointer } = context;
  try {
    handle.onPointerDown!(pointer(0, 0));
    handle.onPointerMove!(pointer(2, 2));
    handle.onPointerUp!(pointer(2, 2));
    assert.equal(saved.length, 0);
    handle.onPointerDown!(pointer(0, 0));
    handle.onPointerMove!(pointer(30, 30));
    assert.equal(saved.length, 0);
    handle.onPointerUp!(pointer(30, 30));
    assert.deepEqual(ids(saved[0]), ["b", "c", "a", "d"]);
    handle.onLostPointerCapture!(pointer(30, 30));
    assert.equal(saved.length, 1);
    handle.onPointerDown!(pointer(0, 0));
    handle.onPointerMove!(pointer(30, 30));
    handle.onPointerCancel!(pointer(30, 30));
    handle.onPointerUp!(pointer(30, 30));
    assert.equal(saved.length, 1);
    handle.onPointerDown!(pointer(0, 0));
    handle.onPointerMove!(pointer(30, 30));
    context.leave();
    handle.onPointerUp!(pointer(500, 500));
    assert.equal(saved.length, 1);
  } finally { context.restore(); }
});

test("保存失败报告错误，原标签顺序和定义保留", () => {
  const errors: string[] = [];
  const before = structuredClone(tags);
  const { handle, pointer, restore } = setup(() => { throw new Error("quota"); }, error => errors.push(error));
  try {
    handle.onPointerDown!(pointer(0, 0));
    handle.onPointerMove!(pointer(30, 30));
    handle.onPointerUp!(pointer(30, 30));
    assert.equal(errors.at(-1), "quota");
    assert.deepEqual(tags, before);
  } finally { restore(); }
});
