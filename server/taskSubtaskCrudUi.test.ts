import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import test, { type TestContext } from "node:test";
import React, { Children, createElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    if (url.endsWith(".css")) return { format: "module", source: "export default {}", shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
const { TaskSubtaskCreateForm: Form } = await import("../src/features/tasks/components/TaskSubtaskCreateForm.tsx");
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
function mockAnimationFrame(t: TestContext) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { requestAnimationFrame: () => 0 } });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  });
}
const requestInput = (tree: ReactNode) => elements(tree, node => node.type === "input")[0];
const cancelButton = (tree: ReactNode) => elements(tree, node => node.props.children === "Cancel")[0];
const panel = (tree: ReactNode) => elements(tree, node => node.type === "div")[0];
const form = (tree: ReactNode) => elements(tree, node => node.type === "form")[0];
const submit = (tree: ReactNode) => form(tree).props.onSubmit({ preventDefault() {} });
const props = { id: "new-subtask", inline: true, open: true, members: [], tags: [], onCreate: () => undefined, onCancel: () => undefined };

test("子任务页通过原地新增入口提交需求", () => {
  const source = read("features/tasks/components/TaskDetail.tsx");
  assert.match(source, /hidden=\{visibleTab !== "subtasks"\}/);
  assert.match(source, /<TaskSubtasksPane[^>]*onCreate=\{onCreateSubtask\}/);
});

test("新增只收集单条需求，取消不触发创建", () => {
  let created = 0;
  let canceled = 0;
  const tree = capture(() => Form({ ...props, onCreate: () => { created++; }, onCancel: () => { canceled++; } }));
  const html = renderToStaticMarkup(createElement(Form, props));
  assert.match(html, /aria-label="Subtask request"/);
  assert.equal(elements(tree, node => node.type === "input" || node.type === "textarea").length, 1);
  cancelButton(tree).props.onClick();
  assert.equal(created, 0);
  assert.equal(canceled, 1);
});

test("空需求被阻止并显示可读错误", () => {
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

test("隐藏再打开仍保留需求，键盘 Escape 只收起不写入", () => {
  let step = 0;
  let created = 0;
  let reopen: () => void = () => undefined;
  const tree = capture(() => {
    const [open, setOpen] = useState(true);
    reopen = () => setOpen(true);
    return Form({ ...props, open, onCreate: () => { created++; }, onCancel: () => setOpen(false) });
  }, node => {
    switch (step++) {
      case 0: requestInput(node).props.onChange({ target: { value: "完成交付检查并提交检查记录" } }); break;
      case 1: form(node).props.onKeyDown({ key: "Escape", nativeEvent: { isComposing: false }, preventDefault() {} }); break;
      case 2: assert.equal(panel(node).props.hidden, true); reopen(); break;
    }
  });
  assert.equal(requestInput(tree).props.value, "完成交付检查并提交检查记录");
  assert.equal(panel(tree).props.hidden, false);
  assert.equal(created, 0);
});

test("确认创建提交完整需求，生成期间防止重复提交和取消", async t => {
  mockAnimationFrame(t);
  let step = 0;
  let finish: () => void = () => undefined;
  const calls: unknown[] = [];
  let closed = 0;
  let saving: Promise<void> | undefined;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const tree = capture(() => Form({ ...props, onCreate: draft => { calls.push(draft); return pending; }, onCancel: () => { closed++; } }), node => {
    switch (step++) {
      case 0: requestInput(node).props.onChange({ target: { value: " 完成交付检查并提交检查记录 " } }); break;
      case 1: saving = submit(node); void submit(node); break;
    }
  });
  assert.deepEqual(calls, [{ title: "完成交付检查并提交检查记录", goal: "", ownerId: "", labels: [], endDate: "", participantIds: [], completionCriteria: [] }]);
  assert.equal(requestInput(tree).props.disabled, true);
  assert.equal(cancelButton(tree).props.disabled, true);
  assert.equal(closed, 0);
  finish();
  await saving;
  assert.equal(closed, 1);
});

test("生成失败保留需求并显示错误，不关闭表单", async t => {
  mockAnimationFrame(t);
  let step = 0;
  let closed = 0;
  let saving: Promise<void> | undefined;
  const tree = capture(() => Form({ ...props, onCreate: () => { throw new Error("生成失败，请重试"); }, onCancel: () => { closed++; } }), node => {
    switch (step++) {
      case 0: requestInput(node).props.onChange({ target: { value: "完成交付检查并提交检查记录" } }); break;
      case 1: saving = submit(node); break;
    }
  });
  await saving;
  assert.equal(requestInput(tree).props.value, "完成交付检查并提交检查记录");
  assert.equal(elements(tree, node => node.props.role === "alert")[0].props.children, "生成失败，请重试");
  assert.equal(requestInput(tree).props.disabled, false);
  assert.equal(closed, 0);
});

test("新增操作沿用语义 Token 并保留窄屏 44px 操作目标", () => {
  assert.ok(existsSync(new URL("../src/features/tasks/styles/task-subtask-editing.css", import.meta.url)));
  const css = read("features/tasks/styles/task-subtask-editing.css");
  assert.match(css, /--ad-control-touch-min/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test("讨论日期估计可见，人工修改或清空后去掉估计说明且不保存为任务字段", async () => {
  const { TaskDueDatePicker } = await import("../src/features/tasks/components/TaskDueDatePicker.tsx");
  const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");
  const initialDraft = { title: "修正暗黑模式偏色", goal: "恢复既有黑灰色调。", completionCriteria: ["讨论指出区域不再出现蓝色偏调。"], endDate: "2026-11-12" };
  const endDateSuggestion = "假设主题配置可用，预留局部调整和核对窗口。";
  const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Form, { ...props, inline: false, initialDraft, endDateSuggestion }) }));
  assert.match(html, /AI 预计完成日期，可修改或清除/);
  assert.match(html, /假设主题配置可用/);
  for (const nextDate of ["", "2026-11-14"]) {
    let edited = false;
    const calls: unknown[] = [];
    const tree = capture(() => Form({ ...props, inline: false, initialDraft, endDateSuggestion, onCreate: value => { calls.push(value); } }), node => {
      if (edited) return;
      edited = true;
      elements(node, element => element.type === TaskDueDatePicker)[0].props.onChange(nextDate);
    });
    assert.equal(elements(tree, element => element.props.id === "new-subtask-date-suggestion").length, 0);
    await submit(tree);
    assert.equal((calls[0] as { endDate: string }).endDate, nextDate);
    assert.deepEqual((calls[0] as { completionCriteria: string[] }).completionCriteria, initialDraft.completionCriteria);
    assert.equal("endDateSuggestion" in (calls[0] as object), false);
  }
});
