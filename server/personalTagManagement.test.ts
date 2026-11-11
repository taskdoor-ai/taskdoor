import assert from "node:assert/strict";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TagDefinition } from "../src/shared/model/task-model.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
globalThis.requestAnimationFrame = callback => { callback(0); return 0; };
const { TagManagementPage } = await import("../src/features/me/components/TagManagementPage.tsx");
const { TagBadge } = await import("../src/shared/ui/TagBadge.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");
type Element = ReactElement<Record<string, any>>;
function elements(tree: ReactNode, match: (element: Element) => boolean): Element[] {
  const found: Element[] = [];
  Children.forEach(tree, child => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (match(child)) found.push(child);
    found.push(...elements(child.props.children, match));
  });
  return found;
}
const tags: TagDefinition[] = [
  { id: "a", name: "商务", icon: "users", color: "blue" },
  { id: "b", name: "内容", icon: "flag", color: "green" },
];
const trigger = { focus() {} };
const createForm = (tree: ReactNode) => elements(tree, item => item.type === "form" && item.props["aria-label"] === "新建标签")[0];
function nameInput(tree: ReactNode) {
  const form = createForm(tree);
  const badge = elements(form, item => item.type === TagBadge)[0];
  return elements(badge.props.renderName(""), item => item.type === "input")[0];
}
function capture(interact: (tree: ReactNode, step: number) => void, onChange = (_tags: TagDefinition[]) => {}, options: Partial<Parameters<typeof TagManagementPage>[0]> = {}) {
  let tree: ReactNode;
  let step = 0;
  function Capture() {
    tree = TagManagementPage({ tags, onBack() {}, onChange, ...options });
    interact(tree, step++);
    return tree;
  }
  const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Capture) }));
  return { tree: tree!, html };
}
function open(tree: ReactNode) {
  const button = elements(tree, item => item.props["aria-expanded"] === false && item.props.ref)[0];
  button.props.onClick({ currentTarget: trigger });
}

test("新建只在标签列表首位展开紧凑行，自动聚焦名称并复用外观入口", () => {
  const { tree, html } = capture((tree, step) => { if (step === 0) open(tree); });
  const list = elements(tree, item => item.type === "ul")[0];
  const rows = elements(list, item => item.type === "li");
  assert.ok(createForm(rows[0]), "新建行应占列表第一个位置");
  assert.equal(rows.length, tags.length + 1);
  assert.equal(nameInput(tree).props.autoFocus, true);
  assert.doesNotMatch(html, /tag-inline-editor|实时预览/);
  assert.match(html, /修改标签图标和底色/);
});

test("新建确认后置于最前，保留既有标签身份和样式", () => {
  const saved: TagDefinition[][] = [];
  capture((tree, step) => {
    if (step === 0) open(tree);
    if (step === 1) nameInput(tree).props.onChange({ target: { value: " 新标签 " } });
    if (step === 2) createForm(tree).props.onSubmit({ preventDefault() {} });
  }, next => saved.push(next));
  assert.equal(saved.length, 1);
  assert.equal(saved[0][0].name, "新标签");
  assert.deepEqual(saved[0].slice(1), tags);
  assert.equal(tags.length, 2);
});

test("重复名称不能新建，Escape取消草稿且不写入列表", () => {
  const saved: TagDefinition[][] = [];
  let duplicateRejected = false;
  const { html } = capture((tree, step) => {
    if (step === 0) open(tree);
    if (step === 1) nameInput(tree).props.onChange({ target: { value: " 商务 " } });
    if (step === 2) {
      duplicateRejected = nameInput(tree).props["aria-invalid"] === true;
      createForm(tree).props.onSubmit({ preventDefault() {} });
      elements(tree, item => item.type === "article")[0].props.onKeyDown({ key: "Escape", nativeEvent: {}, preventDefault() {} });
    }
  }, next => saved.push(next));
  assert.equal(duplicateRejected, true);
  assert.doesNotMatch(html, /aria-label="新建标签"/);
  assert.deepEqual(saved, []);
});

test("新建保存失败保留名称和错误，原列表保持不变", () => {
  const { tree, html } = capture((tree, step) => {
    if (step === 0) open(tree);
    if (step === 1) nameInput(tree).props.onChange({ target: { value: "保留输入" } });
    if (step === 2) createForm(tree).props.onSubmit({ preventDefault() {} });
  }, () => { throw new Error("存储失败"); });
  assert.equal(nameInput(tree).props.value, "保留输入");
  assert.match(html, /role="alert"[^>]*>存储失败/);
  assert.equal(tags.length, 2);
});

test("只读标签和无删除权限的可编辑标签都显示禁用的删除按钮", () => {
  const usedTag: TagDefinition = { id: "c", name: "计划", icon: "flag", color: "green" };
  const html = renderToStaticMarkup(createElement(I18nProvider, {
    initialLocale: "zh-CN",
    children: createElement(TagManagementPage, {
      tags: [...tags, usedTag],
      onBack() {},
      onChange() {},
      canManage: false,
      canCreate: true,
      canManageTag: tag => tag.id !== "b",
      canDeleteTag: tag => tag.id === "a",
      onDeleteTag() {},
    }),
  }));
  assert.match(html, /新建标签/);
  assert.match(html, /修改标签名称：商务/);
  assert.match(html, /修改标签图标和底色：商务/);
  assert.match(html, /修改标签名称：计划/);
  const ownDelete = html.match(/<button[^>]*aria-label="删除标签：商务"[^>]*>.*?<\/button>/)?.[0];
  const otherDelete = html.match(/<button[^>]*aria-label="删除标签：内容"[^>]*>.*?<\/button>/)?.[0];
  const usedDelete = html.match(/<button[^>]*aria-label="删除标签：计划"[^>]*>.*?<\/button>/)?.[0];
  assert.ok(ownDelete);
  assert.ok(otherDelete);
  assert.ok(usedDelete);
  for (const button of [ownDelete, otherDelete, usedDelete]) {
    assert.match(button, /<svg[^>]*lucide-trash-2[^>]*>/);
    assert.doesNotMatch(button, />删除<\/button>/);
  }
  assert.doesNotMatch(ownDelete, /\sdisabled(?:="[^"]*")?(?=\s|>)/);
  assert.match(otherDelete, /\sdisabled(?:="[^"]*")?(?=\s|>)/);
  assert.match(usedDelete, /\sdisabled(?:="[^"]*")?(?=\s|>)/);
  assert.match(html, />内容<\/span>/);
  assert.doesNotMatch(html, /修改标签(?:名称|图标和底色)：内容|拖动排序：[商务内容]+/);
});

test("删除确认展示关联任务数，确认后只请求删除该标签", () => {
  const deleted: string[] = [];
  const saved: TagDefinition[][] = [];
  capture((tree, step) => {
    if (step === 0) {
      const button = elements(tree, item => item.props["aria-label"] === "删除标签：商务")[0];
      button.props.onClick({ currentTarget: { ...trigger, closest: () => null } });
      assert.deepEqual(deleted, []);
    }
    if (step === 1) {
      const confirmation = elements(tree, item => item.type === "p" && typeof item.props.children === "string" && item.props.children.includes("3 条任务"))[0];
      assert.ok(confirmation);
      const button = elements(tree, item => item.props.children === "确认删除")[0];
      button.props.onClick();
    }
  }, next => saved.push(next), {
    canDeleteTag: tag => tag.id === "a",
    onDeleteTag: id => deleted.push(id),
    getTagUsageCount: () => 3,
  });
  assert.deepEqual(deleted, ["a"]);
  assert.deepEqual(saved, []);
});
