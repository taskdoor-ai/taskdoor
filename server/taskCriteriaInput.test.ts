import assert from "node:assert/strict";
import test from "node:test";
import React, { Children, createElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../src/shared/i18n/I18nProvider.tsx";
import { TaskCriteriaFields } from "../src/features/tasks/components/TaskCriteriaFields.tsx";
import { TaskCreationEditableText } from "../src/features/tasks/components/TaskCreationEditableText.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
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
function capture(render: () => ReactNode, initialize?: (tree: Element) => void): Element {
  let tree: ReactNode = null;
  function Capture() { tree = render(); initialize?.(tree as Element); return null; }
  renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Capture) }));
  return tree as Element;
}
function environment() {
  const properties = ["document", "requestAnimationFrame", "cancelAnimationFrame"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const outside = {};
  const document = { activeElement: outside };
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, value: (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; } });
  Object.defineProperty(globalThis, "cancelAnimationFrame", { configurable: true, value: (frame: number) => frames.delete(frame) });
  const inputs = Array.from({ length: 3 }, () => ({ focus() { document.activeElement = this; } }));
  const host = { contains: (target: unknown) => inputs.includes(target as typeof inputs[number]), querySelectorAll: () => inputs };
  return {
    outside, document, inputs, host,
    attach(tree: Element) { tree.props.ref.current = host; },
    flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(16)); },
    restore() { for (const [key, descriptor] of properties) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } },
  };
}

test("中文组词期间失焦不提交，结束后提交最新最终文字", () => {
  const env = environment();
  try {
    let values = ["原标准"];
    const commits: string[][] = [];
    const tree = capture(() => TaskCriteriaFields({ label: "完成标准", values, onChange: next => { values = next; }, onCommit: () => commits.push([...values]) }));
    env.attach(tree);
    const input = elements(tree, node => node.type === TaskCreationEditableText)[0];
    tree.props.onCompositionStart?.();
    input.props.onChange("zhongwen");
    tree.props.onBlur({ relatedTarget: env.outside, currentTarget: env.host });
    env.flush();
    assert.deepEqual(commits, [], "候选尚未结束不能保存拼音/半成品");
    input.props.onChange("中文");
    tree.props.onCompositionEnd?.();
    env.flush();
    assert.deepEqual(commits, [["中文"]]);
  } finally { env.restore(); }
});

test("失焦提交等待状态更新，使用最新渲染的保存回调", () => {
  const env = environment();
  try {
    const commits: string[][] = [];
    let initialized = false;
    const tree = capture(() => {
      const [values, setValues] = useState(["初始标准"]);
      return TaskCriteriaFields({ label: "完成标准", values, onChange: setValues, onCommit: () => commits.push([...values]) });
    }, current => {
      if (initialized) return;
      initialized = true;
      current.props.onBlur({ relatedTarget: env.outside, currentTarget: env.host });
      elements(current, node => node.type === TaskCreationEditableText)[0].props.onChange("同一轮最终输入");
    });
    env.attach(tree);
    assert.deepEqual(commits, []);
    env.flush();
    assert.deepEqual(commits, [["同一轮最终输入"]]);
  } finally { env.restore(); }
});

test("失焦后重新进入标准组会取消待提交，组内切行不提交", () => {
  const env = environment();
  try {
    let commits = 0;
    const tree = capture(() => TaskCriteriaFields({ label: "完成标准", values: ["第一条", "第二条"], onChange: () => {}, onCommit: () => { commits++; } }));
    env.attach(tree);
    tree.props.onBlur({ relatedTarget: env.inputs[1], currentTarget: env.host });
    env.flush();
    assert.equal(commits, 0);
    tree.props.onBlur({ relatedTarget: env.outside, currentTarget: env.host });
    tree.props.onFocus?.();
    env.document.activeElement = env.inputs[0];
    env.flush();
    assert.equal(commits, 0);
  } finally { env.restore(); }
});

test("组内新增遇到空relatedTarget时先完成新增和聚焦，不被失焦保存吞掉", () => {
  const env = environment();
  try {
    let values = ["未保存标准"];
    let commits = 0;
    const tree = capture(() => TaskCriteriaFields({ label: "完成标准", values, onChange: next => { values = next; }, onCommit: () => { commits++; } }));
    env.attach(tree);
    const add = elements(tree, node => node.props.className === "task-criteria-field-add")[0];
    tree.props.onPointerDownCapture?.({ button: 0, target: { closest: () => ({}) } });
    tree.props.onBlur({ relatedTarget: null, currentTarget: env.host });
    env.flush();
    assert.equal(commits, 0);
    add.props.onClick();
    tree.props.onClick?.();
    env.flush();
    assert.deepEqual(values, ["未保存标准", ""]);
    assert.equal(env.document.activeElement, env.inputs[1]);
    assert.equal(commits, 0);
  } finally { env.restore(); }
});

test("组词未结束就失焦仍保留正在输入的原文，不提前切成展示文本", () => {
  let step = 0;
  const tree = capture(() => TaskCreationEditableText({ label: "完成标准", value: "zhongwen", displayValue: "其他展示文本", onChange: () => {} }), current => {
    if (step === 0) { step++; current.props.onFocus(); }
    else if (step === 1) { step++; current.props.onCompositionStart?.(); }
    else if (step === 2) { step++; current.props.onBlur(); }
  });
  assert.equal(tree.props.value, "zhongwen");
});
