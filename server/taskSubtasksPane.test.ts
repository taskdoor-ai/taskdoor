import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
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
const { TaskSubtasksPane } = await import("../src/features/tasks/components/TaskSubtasksPane.tsx");
const { TaskSubtaskCreateForm } = await import("../src/features/tasks/components/TaskSubtaskCreateForm.tsx");
const { TaskSubtaskList } = await import("../src/features/tasks/components/TaskSubtaskList.tsx");
type Element = ReactElement<Record<string, any>>;
function elements(tree: ReactNode, match: (element: Element) => boolean): Element[] {
  const result: Element[] = [];
  Children.forEach(tree, child => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (match(child)) result.push(child);
    result.push(...elements(child.props.children, match));
  });
  return result;
}
function capture(render: () => ReactNode, interact?: (tree: ReactNode) => void) {
  let tree: ReactNode = null;
  function Capture() { tree = render(); interact?.(tree); return null; }
  renderToStaticMarkup(createElement(Capture)); return tree;
}
const props = { taskId: "parent", currentUserId: "collaborator", members: [], tags: [], tasks: [], onCreate: () => undefined };
const child = { id: "child", title: "现有子任务", owner: "owner", goal: "", dueAt: "", status: "进行中" as const };
const actions = (tree: ReactNode) => [
  ...elements(tree, item => item.props.className === "task-subtask-create-trigger"),
  ...elements(tree, item => item.type === TaskSubtaskList).flatMap(item => elements(item.props.emptyAction, child => child.props.className === "task-subtask-create-trigger")),
];

test("空状态和已有列表共用一个同名创建入口及同一表单", () => {
  for (const tasks of [[], [child]]) {
    let opened = false;
    const tree = capture(() => TaskSubtasksPane({ ...props, tasks }), value => {
      if (!opened) { opened = true; assert.equal(actions(value).length, 1); actions(value)[0].props.onClick(); }
    });
    const forms = elements(tree, item => item.type === TaskSubtaskCreateForm);
    assert.equal(forms.length, 1);
    assert.equal(forms[0].props.open, true);
    assert.equal(forms[0].props.currentUserId, "collaborator");
  }
  const empty = capture(() => TaskSubtasksPane(props));
  const list = elements(empty, item => item.type === TaskSubtaskList)[0];
  const emptyAction = list.props.emptyAction as Element;
  const populated = capture(() => TaskSubtasksPane({ ...props, tasks: [child] }));
  assert.equal(emptyAction.props.className, actions(populated)[0].props.className);
  assert.deepEqual(emptyAction.props.children[1], actions(populated)[0].props.children[1]);
});

test("无权时两种列表均不提供创建入口", () => {
  for (const tasks of [[], [child]]) {
    const tree = capture(() => TaskSubtasksPane({ ...props, tasks, onCreate: undefined }));
    assert.equal(actions(tree).length, 0);
    const list = elements(tree, item => item.type === TaskSubtaskList)[0];
    assert.ok(list); assert.equal(list.props.emptyAction, undefined);
    assert.equal(elements(tree, item => item.type === TaskSubtaskCreateForm).length, 0);
  }
});

test("打开后失去权限仍保留同一表单，提交拒绝且不执行创建", async () => {
  let step = 0;
  let calls = 0;
  const tree = capture(() => {
    const [allowed, setAllowed] = useState(true);
    const value = TaskSubtasksPane({ ...props, tasks: [child], onCreate: allowed ? () => { calls++; } : undefined });
    if (step === 0) { step++; assert.equal(actions(value).length, 1); actions(value)[0].props.onClick(); }
    else if (step === 1) { step++; setAllowed(false); }
    return value;
  });
  assert.equal(actions(tree).length, 0);
  const form = elements(tree, item => item.type === TaskSubtaskCreateForm)[0];
  assert.ok(form); assert.equal(form.props.open, true);
  await assert.rejects(async () => form.props.onCreate({ title: "已填写名称", goal: "已填写目标", completionCriteria: [] }), /权限|permission/);
  assert.equal(calls, 0);
});
