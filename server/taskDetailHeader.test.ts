import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getTaskDetailPathItems } from "../src/features/tasks/lib/task-detail-path.ts";
import { MemberSelector } from "../src/features/members/components/MemberSelector.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const root = { id: "workspace-root", label: "任务" };
const grandparent = { id: "project", label: "新品上市" };
const parent = { id: "parent", label: "上市准备" };
const current = { id: "current", label: "核对物料" };

test("顶层任务不把合成任务入口或历史路径作为父任务", () => {
  assert.deepEqual(getTaskDetailPathItems([root, current], current.id), []);
  assert.deepEqual(getTaskDetailPathItems([root, parent, current], current.id), []);
  assert.deepEqual(getTaskDetailPathItems(undefined, current.id), []);
});

test("子任务从真实祖先开始保留完整任务路径，不伪造缺失父任务", () => {
  const path = [root, grandparent, parent, current];
  assert.deepEqual(getTaskDetailPathItems(path, current.id, parent.id), [grandparent, parent, current]);
  assert.deepEqual(path, [root, grandparent, parent, current], "展示不能改写来源路径");
  assert.deepEqual(getTaskDetailPathItems([root, current], current.id, parent.id), []);
  assert.deepEqual(getTaskDetailPathItems(path, "missing", parent.id), []);
  assert.deepEqual(getTaskDetailPathItems(path, current.id, "missing"), []);
});

test("详情使用真实父任务投影，长路径保留完整可读名称及独立返回入口", () => {
  const detail = read("features/tasks/components/TaskDetail.tsx");
  assert.match(detail, /getTaskDetailPathItems\(pathItems, taskId, parentTask\?\.id\)/);
  assert.match(detail, /taskPathItems\.length > 0 \? <nav/);
  assert.match(detail, /title=\{label\}/);
  assert.match(detail, /<TaskSidebarToggle/);
  assert.match(detail, /onClick=\{onBackToList\}/);
});

test("移除负责人直接提交空数组且不收集原因，保存成功后才改变详情投影", () => {
  const selector = read("features/members/components/MemberSelector.tsx");
  assert.match(selector, /onClick=\{\(\) => onChange\(\[\]\)\}/);
  const detail = read("features/tasks/components/TaskDetail.tsx");
  const handler = detail.slice(detail.indexOf("const changeOwner ="), detail.indexOf("const changeParticipants ="));
  assert.match(handler, /await onOwnerChange\(value\)/);
  assert.ok(handler.indexOf("await onOwnerChange(value)") < handler.indexOf("setCurrentOwner(value)"));
  assert.match(handler, /catch/);
  assert.match(handler, /setOwnerSaveFailed\(true\)/);
  assert.doesNotMatch(handler, /reason|原因|prompt\(|confirm\(/);
  assert.match(detail, /disabled=\{!onOwnerChange \|\| ownerSaving\}/);
  assert.match(detail, /id=\{`task-owner-save-error-\$\{taskId\}`\} role="alert"/);
});

test("实际负责人移除按钮一次点击直接清空，禁用状态保留原负责人", () => {
  const changes: string[][] = [];
  let buttons: ReactElement<Record<string, any>>[] = [];
  const collect = (tree: ReactNode) => Children.forEach(tree, child => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (child.type === "button") buttons.push(child);
    collect(child.props.children);
  });
  const props = { label: "负责人", max: 1, min: 0, members: [{ id: "owner", name: "负责人甲", email: "owner@example.com", role: "成员" }], selected: ["owner"], onChange: (value: string[]) => changes.push(value) };
  function Capture({ disabled = false }: { disabled?: boolean }) {
    collect(MemberSelector({ ...props, disabled }));
    return null;
  }
  renderToStaticMarkup(createElement(Capture));
  assert.equal(buttons.length, 1);
  buttons[0].props.onClick();
  assert.deepEqual(changes, [[]]);
  buttons = [];
  renderToStaticMarkup(createElement(Capture, { disabled: true }));
  assert.equal(buttons[0].props.disabled, true);
  assert.deepEqual(props.selected, ["owner"]);
});
