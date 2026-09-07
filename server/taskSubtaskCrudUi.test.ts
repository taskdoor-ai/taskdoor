import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import React, { Children, createElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskCriteriaFields } from "../src/components/TaskCriteriaFields.tsx";
import { Input } from "../src/components/ui/input.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
type Element = ReactElement<Record<string, any>>;
const read = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
function elements(tree: ReactNode, match: (element: Element) => boolean): Element[] {
  const found: Element[] = [];
  Children.forEach(tree, child => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (match(child)) found.push(child);
    found.push(...elements(child.props.children, match));
  });
  return found;
}
function capture(render: () => ReactNode, interact?: (tree: ReactNode) => void) {
  let tree: ReactNode = null;
  function Capture() { tree = render(); interact?.(tree); return null; }
  renderToStaticMarkup(createElement(Capture));
  return tree;
}
async function formComponent() {
  assert.ok(existsSync(new URL("../src/components/TaskSubtaskCreateForm.tsx", import.meta.url)), "需要按需展开的子任务新建表单");
  return (await import("../src/components/TaskSubtaskCreateForm.tsx")).TaskSubtaskCreateForm;
}
const titleInput = (tree: ReactNode) => elements(tree, node => node.type === Input)[0];
const criteria = (tree: ReactNode) => elements(tree, node => node.type === TaskCriteriaFields)[0];
const form = (tree: ReactNode) => elements(tree, node => node.type === "form")[0];
const submit = (tree: ReactNode) => form(tree).props.onSubmit({ preventDefault() {} });
const props = { id: "new-subtask", open: true, onCreate: () => undefined, onCancel: () => undefined };

test("子任务页只提供跳转式新增入口", () => {
  const source = read("components/TaskDetail.tsx");
  assert.match(source, /onCreateSubtask\?: \(\) => void/);
  assert.match(source, /onDeleteSubtask\?:/);
  assert.match(source, />新增子任务<|\/>新增子任务</);
  assert.match(source, /onClick=\{onCreateSubtask\}/);
  assert.match(source, /hidden=\{activeTab !== "subtasks"\}/);
  assert.doesNotMatch(source, /activeTab === "subtasks" && <section/);
  assert.match(source, /<TaskSubtaskList onOpenTask=\{onOpenRelatedTask\} tasks=\{childTasks\} \/>/);
  assert.doesNotMatch(source, /<TaskSubtaskList[^>]*onDeleteTask=/);
  assert.doesNotMatch(source, /TaskSubtaskCreateForm|AI 调整子任务安排|subtaskCreateOpen/);
});

test("新增仅复用名称和完成标准字段，取消不触发创建", async () => {
  const Form = await formComponent();
  let created = 0;
  let canceled = 0;
  const tree = capture(() => Form({ ...props, onCreate: () => { created++; }, onCancel: () => { canceled++; } }));
  assert.equal(elements(tree, node => node.type === Input).length, 1);
  assert.equal(elements(tree, node => node.type === TaskCriteriaFields).length, 1);
  const html = renderToStaticMarkup(createElement(Form, props));
  assert.match(html, /子任务名称/);
  assert.match(html, /创建子任务/);
  assert.doesNotMatch(html, /name="owner|name="goal|指派给我/);
  elements(tree, node => node.props.children === "取消")[0].props.onClick();
  assert.equal(created, 0);
  assert.equal(canceled, 1);
});

test("空名称被阻止并显示可读错误", async () => {
  const Form = await formComponent();
  let created = 0;
  let tried = false;
  const tree = capture(() => Form({ ...props, onCreate: () => { created++; } }), node => {
    if (tried) return;
    tried = true;
    void submit(node);
  });
  assert.equal(created, 0);
  assert.equal(elements(tree, node => node.props.role === "alert").length, 1);
});

test("隐藏再打开仍保留草稿，键盘 Escape 只收起不写入", async () => {
  const Form = await formComponent();
  let step = 0;
  let created = 0;
  let reopen: () => void = () => undefined;
  const tree = capture(() => {
    const [open, setOpen] = useState(true);
    reopen = () => setOpen(true);
    return Form({ ...props, open, onCreate: () => { created++; }, onCancel: () => setOpen(false) });
  }, node => {
    switch (step++) {
      case 0: titleInput(node).props.onChange({ target: { value: "交付检查" } }); criteria(node).props.onChange(["提交检查记录"]); break;
      case 1: form(node).props.onKeyDown({ key: "Escape", nativeEvent: { isComposing: false }, preventDefault() {}, stopPropagation() {} }); break;
      case 2: assert.equal(form(node).props.hidden, true); reopen(); break;
    }
  });
  assert.equal(titleInput(tree).props.value, "交付检查");
  assert.deepEqual(criteria(tree).props.values, ["提交检查记录"]);
  assert.equal(form(tree).props.hidden, false);
  assert.equal(created, 0);
});

test("确认创建提交标准化草稿，异步保存期间防止重复提交和取消", async () => {
  const Form = await formComponent();
  let step = 0;
  let finish: () => void = () => undefined;
  const calls: unknown[] = [];
  let closed = 0;
  let saving: Promise<void> | undefined;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const tree = capture(() => Form({ ...props, onCreate: draft => { calls.push(draft); return pending; }, onCancel: () => { closed++; } }), node => {
    switch (step++) {
      case 0: titleInput(node).props.onChange({ target: { value: " 交付检查 " } }); criteria(node).props.onChange([" 提交检查记录 "]); break;
      case 1: saving = submit(node); void submit(node); break;
    }
  });
  assert.deepEqual(calls, [{ title: "交付检查", completionCriteria: ["提交检查记录"] }]);
  assert.equal(titleInput(tree).props.disabled, true);
  assert.equal(criteria(tree).props.disabled, true);
  assert.equal(elements(tree, node => node.props.children === "取消")[0].props.disabled, true);
  assert.equal(closed, 0);
  finish();
  await saving;
  assert.equal(closed, 1);
});

test("保存失败保留输入并显示错误，不关闭表单", async () => {
  const Form = await formComponent();
  let step = 0;
  let closed = 0;
  const tree = capture(() => Form({ ...props, onCreate: () => { throw new Error("存储空间不足，请重试"); }, onCancel: () => { closed++; } }), node => {
    switch (step++) {
      case 0: titleInput(node).props.onChange({ target: { value: "交付检查" } }); criteria(node).props.onChange(["提交检查记录"]); break;
      case 1: void submit(node); break;
    }
  });
  assert.equal(titleInput(tree).props.value, "交付检查");
  assert.deepEqual(criteria(tree).props.values, ["提交检查记录"]);
  assert.equal(elements(tree, node => node.props.role === "alert")[0].props.children, "存储空间不足，请重试");
  assert.equal(titleInput(tree).props.disabled, false);
  assert.equal(closed, 0);
});

test("新增操作沿用语义 Token 并保留窄屏 44px 操作目标", () => {
  assert.ok(existsSync(new URL("../src/styles/task-subtask-editing.css", import.meta.url)));
  const css = read("styles/task-subtask-editing.css");
  assert.match(css, /--ad-control-touch-min/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test("跳转式新增不携带内嵌表单的展开状态", () => {
  const detail = read("components/TaskDetail.tsx");
  assert.doesNotMatch(detail, /aria-controls=\{subtaskCreateId\}|aria-expanded=\{subtaskCreateOpen\}/);
});
