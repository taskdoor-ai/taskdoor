import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SmartTextbox, type Segment } from "@tigerabrodioss/fude";
import { TaskDiscussion } from "../src/components/TaskDiscussion.tsx";
import { MentionComposer } from "../src/components/MentionComposer.tsx";
import type { TaskActivityMock } from "../src/data/taskDetailMocks.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

type Element = ReactElement<Record<string, any>>;

function elements(tree: ReactNode, match: (element: Element) => boolean): Element[] {
  const found: Element[] = [];
  Children.forEach(tree, (child) => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (match(child)) found.push(child);
    found.push(...elements(child.props.children, match));
  });
  return found;
}

// Capture the real component's element tree with React's server hook dispatcher.
// Render-phase initialization exercises its actual setters without a mocked component.
function capture(render: () => ReactNode, initialize?: (tree: ReactNode) => void) {
  let tree: ReactNode = null;
  function Capture() {
    tree = render();
    initialize?.(tree);
    return tree;
  }
  const html = renderToStaticMarkup(createElement(Capture));
  return { html, tree };
}

const root: TaskActivityMock = { id: "root-discussion", author: "陈默", type: "member-post", message: "请核对交付范围", time: "昨天" };
const reply: TaskActivityMock = { id: "specific-reply", author: "周岚", type: "member-reply", replyToActivityId: root.id, message: "我已确认范围", time: "今天" };
const props = { activities: [root, reply], currentUser: "林洁", files: [], people: [], onOpenFile: () => undefined, onPost: () => undefined };
const read = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");

test("只有接入回调的主讨论显示共享浅蓝连接 AI 按钮，已发布回复不重复显示", () => {
  const without = renderToStaticMarkup(createElement(TaskDiscussion, props));
  assert.doesNotMatch(without, /title="连接 AI"/);
  const withAi = renderToStaticMarkup(createElement(TaskDiscussion, { ...props, onConnectAi: () => undefined }));
  assert.equal((withAi.match(/title="连接 AI"/g) ?? []).length, 1);
  assert.equal((withAi.match(/data-size="icon-sm"/g) ?? []).length, 1);
  assert.equal((withAi.match(/lucide-sparkles/g) ?? []).length, 1);
  assert.match(withAi, /aria-label="连接 AI：陈默的讨论"/);
  assert.doesNotMatch(withAi, /aria-label="连接 AI：周岚的回复"/);
});

test("主讨论 AI 入口传递整串讨论目标和触发器，不提交发言", () => {
  const calls: unknown[][] = [];
  let posts = 0;
  const { tree } = capture(() => TaskDiscussion({ ...props, onPost: () => { posts++; }, onConnectAi: (...args) => { calls.push(args); } }));
  const buttons = elements(tree, (node) => node.props.title === "连接 AI");
  assert.equal(buttons.length, 1);
  const trigger = {} as HTMLElement;
  buttons[0].props.onClick({ currentTarget: trigger });
  assert.deepEqual(calls, [[{ kind: "discussion", activityId: root.id }, trigger]]);
  assert.equal(posts, 0);
});

test("讨论 AI 位于作者时间行最右侧，回复操作旁和已发布回复均无额外入口", () => {
  const { tree } = capture(() => TaskDiscussion({ ...props, onConnectAi: () => undefined }));
  const record = elements(tree, (node) => node.props.id === `task-activity-${root.id}`)[0];
  const header = elements(record.props.children, (node) => node.type === "header")[0];
  const headerChildren = Children.toArray(header.props.children).filter(isValidElement) as Element[];
  assert.equal(headerChildren.at(-1)?.props["aria-label"], "连接 AI：陈默的讨论");
  assert.equal(elements(header.props.children, (node) => node.props.title === "连接 AI").length, 1);
  for (const area of elements(tree, (node) => node.props.className === "task-discussion-actions" || node.props.className === "task-discussion-replies")) {
    assert.equal(elements(area.props.children, (node) => node.props.title === "连接 AI").length, 0);
  }
});

test("展开回复后仅有主讨论与草稿两个入口，草稿 AI 保留原回复关系并聚焦编辑器", () => {
  const calls: unknown[][] = [];
  let posts = 0;
  let expanded = false;
  const { tree, html } = capture(
    () => TaskDiscussion({ ...props, onPost: () => { posts++; }, onConnectAi: (...args) => { calls.push(args); } }),
    (node) => {
      if (expanded) return;
      expanded = true;
      elements(node, (item) => item.props["aria-expanded"] === false)[0].props.onClick();
    },
  );
  const composer = elements(tree, (node) => node.type === MentionComposer && node.props.actionLabel === "发送回复")[0];
  assert.ok(composer);
  assert.equal((html.match(/title="连接 AI"/g) ?? []).length, 2);
  assert.equal(composer.props.autoFocus, true);
  assert.equal(typeof composer.props.onConnectAi, "function");
  const trigger = {} as HTMLElement;
  composer.props.onConnectAi("尚未发送的回复", trigger);
  assert.deepEqual(calls, [[{ kind: "reply-draft", activityId: root.id, draft: "尚未发送的回复" }, trigger]]);
  assert.equal(posts, 0);
});

test("编辑器 AI 入口读取当前纯文本，反复打开不清空草稿、不触发提交或取消", () => {
  const calls: unknown[][] = [];
  let submits = 0;
  let cancels = 0;
  let initialized = false;
  let connected = false;
  const draft: Segment[] = [{ type: "text", value: "草稿正文" }];
  const trigger = {} as HTMLElement;
  const { tree, html } = capture(
    () => MentionComposer({ compact: true, people: [], onSubmit: () => { submits++; }, onCancel: () => { cancels++; }, onConnectAi: (...args) => { calls.push(args); } }),
    (node) => {
      if (!initialized) {
        initialized = true;
        elements(node, (item) => item.type === SmartTextbox)[0].props.onChange(draft);
        return;
      }
      if (connected) return;
      connected = true;
      const ai = elements(node, (item) => item.props.title === "连接 AI")[0];
      assert.ok(ai, "回复编辑区应有连接 AI 入口");
      ai.props.onClick({ currentTarget: trigger });
      ai.props.onClick({ currentTarget: trigger });
    },
  );
  const ai = elements(tree, (node) => node.props.title === "连接 AI")[0];
  assert.ok(ai, "回复编辑区应有连接 AI 入口");
  const toolbar = elements(tree, (node) => node.props.className === "mention-composer-tools")[0];
  const toolbarChildren = Children.toArray(toolbar.props.children).filter(isValidElement) as Element[];
  assert.equal(toolbarChildren[0].props.ariaLabel, "提及协作者");
  assert.equal(elements(toolbarChildren[1], (node) => node.props.title === "连接 AI").length, 1);
  assert.match(html, /aria-label="连接 AI：当前回复草稿"/);
  assert.deepEqual(calls, [["草稿正文", trigger], ["草稿正文", trigger]]);
  assert.deepEqual(elements(tree, (item) => item.type === SmartTextbox)[0].props.value, draft);
  assert.equal(submits, 0);
  assert.equal(cancels, 0);
});

test("未接入 AI 的编辑器不显示入口，发送与取消仍由原按钮负责", () => {
  const { tree, html } = capture(() => MentionComposer({ people: [], onSubmit: () => undefined, onCancel: () => undefined }));
  assert.doesNotMatch(html, /title="连接 AI"/);
  assert.equal(elements(tree, (node) => node.props.className === "mention-composer-submit").length, 1);
  assert.equal(elements(tree, (node) => node.props.className === "mention-composer-cancel").length, 1);
});

test("稳定定位锚点只包住原消息，不将回复串和回复编辑器包进焦点范围", () => {
  const { tree } = capture(() => TaskDiscussion(props));
  const thread = elements(tree, (node) => node.props.className === "task-discussion-thread")[0];
  assert.equal(thread.props.tabIndex, undefined);
  assert.equal(thread.props.id, undefined);
  for (const id of [root.id, reply.id]) {
    const record = elements(tree, (node) => node.props.id === `task-activity-${id}`)[0];
    assert.ok(record);
    assert.equal(record.props.tabIndex, -1);
    assert.match(record.props.className, /task-discussion-record/);
    assert.equal(elements(record.props.children, (node) => node.props.className === "task-discussion-replies" || node.props.className === "task-discussion-reply-compose").length, 0);
  }
});

test("普通鼠标焦点不画整条讨论粗环，保留原消息的键盘 focus-visible", () => {
  const css = read("styles/task-records.css");
  assert.doesNotMatch(css, /\.task-discussion-thread:focus\b|\.task-discussion-replies\s*>\s*li:focus\b/);
  assert.match(css, /\.task-discussion-record:focus-visible/);
  assert.match(css, /\.task-discussion-record:focus:not\(:focus-visible\)/);
});

test("来源定位使用独立浅底，1800ms结束且换目标与卸载时清除旧计时器", () => {
  const source = read("components/TaskDiscussion.tsx");
  const css = read("styles/task-records.css");
  assert.match(source, /attentionTarget\??:/);
  assert.match(source, /window\.setTimeout\([\s\S]*?1800\)/);
  assert.match(source, /return \(\) => window\.clearTimeout\(timer\)/);
  assert.match(source, /attentionTarget\?\.id, attentionTarget\?\.sequence/);
  assert.match(css, /\.task-discussion-record\.is-attention[^}]*background:/);
});

test("编辑器真正实现可选自动聚焦，共享 AI 按钮避开普通按钮覆盖且手机可达", () => {
  const composer = read("components/MentionComposer.tsx");
  const css = read("styles/task-records.css");
  assert.match(composer, /if \(!autoFocus\) return/);
  assert.match(composer, /querySelector<HTMLElement>\("\.mention-composer-input"\)\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(composer, /\}, \[autoFocus\]\)/);
  assert.match(css, /\.task-discussion-actions\s*>\s*button:not\(\[data-slot="button"\]\)/);
  assert.match(css, /\.mention-composer-tools\s*>\s*button:not\(\[data-slot="button"\]\)/);
  assert.match(css, /\.task-discussion-ai-trigger[^}]*min-width: var\(--ad-control-touch-min\)/);
});

test("主讨论头部为作者时间保留可收缩空间，连接 AI 在右侧独立排列", () => {
  const css = read("styles/task-records.css");
  assert.match(css, /\.task-discussion-record\s*>\s*\.task-discussion-thread-header[^}]*flex-wrap: nowrap/);
  assert.match(css, /\.task-discussion-meta[^}]*min-width: 0/);
  assert.match(css, /\.task-discussion-thread-header\s*>\s*\.task-discussion-ai-trigger[^}]*margin-left: auto/);
});
