import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskDueDatePicker } from "../src/components/TaskDueDatePicker.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("空日期明确显示不设截止时间，不使用含糊的未设置或清空文案", () => {
  const html = renderToStaticMarkup(createElement(TaskDueDatePicker));
  assert.match(html, /aria-label="截止时间：不设截止时间"/);
  assert.match(html, /<strong>不设截止时间<\/strong>/);
  assert.doesNotMatch(html, /未设置|添加到期时间/);
});

test("已有固定日期保持日期值及可访问名称", () => {
  const html = renderToStaticMarkup(createElement(TaskDueDatePicker, { initialValue: "2026-09-20", label: "截止时间" }));
  assert.match(html, /aria-label="截止时间：2026-09-20"/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /<strong>不设截止时间<\/strong>/);
});

test("截止类型使用互斥选项，并监听浮层内容尺寸变化", () => {
  const source = readFileSync(new URL("../src/components/TaskDueDatePicker.tsx", import.meta.url), "utf8");
  assert.match(source, /type="radio"/);
  assert.match(source, /指定日期/);
  assert.match(source, /不设截止时间/);
  assert.doesNotMatch(source, />清空</);
  assert.match(source, /ResizeObserver/);
});

test("日期修改不靠重新挂载同步，避免应用后卸载键盘焦点入口", () => {
  const read = (file: string) => readFileSync(new URL(`../src/components/${file}`, import.meta.url), "utf8");
  assert.match(read("TaskDueDatePicker.tsx"), /setValue\(initialValue\)[\s\S]*?\[initialValue\]/);
  assert.doesNotMatch(read("TaskCreationPlanEditor.tsx"), /<TaskDueDatePicker[^>]*key=/);
  assert.match(read("TaskDetail.tsx"), /<TaskDueDatePicker[^]*?key=\{taskId\} label="截止时间"/);
});
