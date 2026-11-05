import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transformSync } from "esbuild";
import type { CollaborationMessage } from "../src/features/tasks/lib/task-collaboration.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    if (url.endsWith(".css")) return { format: "module", source: "export default {}", shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
const { TaskDiscussion } = await import("../src/features/tasks/components/TaskDiscussion.tsx");
const { TaskDiscussionMessage } = await import("../src/features/tasks/discussion/components/TaskDiscussionMessage.tsx");
const { DiscussionComposer } = await import("../src/features/tasks/discussion/components/DiscussionComposer.tsx");
const { DiscussionSubtaskCreateForm } = await import("../src/features/tasks/components/DiscussionSubtaskCreateForm.tsx");
const { TaskSubtaskCreateForm } = await import("../src/features/tasks/components/TaskSubtaskCreateForm.tsx");
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
function capture(render: () => ReactNode, interact?: (tree: ReactNode) => void) {
  let tree: ReactNode = null;
  function Capture() { tree = render(); interact?.(tree); return null; }
  renderToStaticMarkup(createElement(Capture));
  return tree;
}
const message: CollaborationMessage = { id: "source", author: "member", type: "member-post", message: "核对\n材料", time: "今天", createdAt: "2026-10-26T00:00:00Z" };
const other = { ...message, id: "other", message: "其他讨论", createdAt: "2026-10-25T00:00:00Z" };
const source = { taskId: "parent", messageId: message.id, body: message.message, author: message.author };
const props = { activities: [message, other], currentUser: "member", files: [], people: [], onOpenFile: () => undefined, onPost: () => undefined };
const rows = (tree: ReactNode) => elements(tree, item => item.type === TaskDiscussionMessage);
const row = (tree: ReactNode, id = message.id) => rows(tree).find(item => item.props.message.id === id)!;

test("讨论创建在原消息下打开，收起回复且隐藏普通输入并禁用其他创建入口", () => {
  let step = 0;
  const trigger = {} as HTMLElement;
  const calls: unknown[][] = [];
  const tree = capture(() => {
    const [creatingSubtask, setCreatingSubtask] = useState(false);
    return TaskDiscussion({ ...props, creatingSubtask,
      onCreateSubtask: (item, button) => { calls.push([item, button]); setCreatingSubtask(true); },
      renderAfterMessage: item => creatingSubtask && item.id === message.id ? createElement("input", { "aria-label": "子任务草稿" }) : null,
    });
  }, tree => {
    if (step++ === 0) row(tree).props.onReply(message);
    else if (step === 2) {
      assert.equal(elements(tree, item => item.type === DiscussionComposer).length, 1);
      row(tree).props.onCreateSubtask(message, trigger);
    }
  });
  assert.deepEqual(calls, [[message, trigger]]);
  assert.equal(elements(tree, item => item.type === DiscussionComposer).length, 0);
  assert.equal(elements(row(tree).props.children, item => item.type === "input").length, 1);
  assert.equal(row(tree, other.id).props.subtaskCreateDisabled, true);
  assert.equal(row(tree).props.replyExpanded, false);
});

test("来源删除或消失后保持同一消息 key 与草稿宿主，隐藏旧正文和附件并关闭动作", () => {
  for (const activities of [[{ ...message, deletedAt: "2026-10-26T01:00:00Z", file: "附件.docx" }, other], [other]]) {
    const tree = capture(() => TaskDiscussion({ ...props, activities, creatingSubtask: true, retainedSubtaskSources: [source],
      onCreateSubtask: () => undefined, onConnectAi: () => undefined,
      renderAfterMessage: item => item.id === message.id ? createElement("input", { key: "draft", defaultValue: "已经修改的名称" }) : null,
    }));
    const host = row(tree);
    assert.ok(host);
    assert.equal(host.key, message.id);
    assert.equal(host.props.message.message, "");
    assert.equal(host.props.message.file, undefined);
    assert.deepEqual(host.props.message.attachmentRefs, []);
    assert.equal(host.props.onCreateSubtask, undefined);
    assert.equal(host.props.onConnectAi, undefined);
    assert.equal(host.props.replyDisabled, true);
    assert.equal(elements(host.props.children, item => item.type === "input")[0].props.defaultValue, "已经修改的名称");
    assert.equal(elements(host.props.children, item => item.props.role === "alert").length, 1);
    assert.equal(elements(tree, item => item.type === DiscussionComposer).length, 0);
  }
});

test("无创建权限或协作读取失败时不提供创建回调", () => {
  for (const onCreateSubtask of [undefined, () => undefined]) {
    const tree = capture(() => TaskDiscussion({ ...props, readable: false, onCreateSubtask }));
    assert.equal(row(tree).props.onCreateSubtask, undefined);
  }
});

function detailHandler(name: string, bindings: Record<string, unknown>) {
  const detail = readFileSync(new URL("../src/features/tasks/components/TaskDetail.tsx", import.meta.url), "utf8");
  const start = detail.indexOf(`  const ${name} =`);
  const end = detail.indexOf("\n  };", start);
  assert.ok(start >= 0 && end > start, `缺少 ${name}`);
  const compiled = transformSync(detail.slice(start, end + 5), { loader: "tsx", target: "es2022" }).code;
  return new Function(...Object.keys(bindings), `${compiled}; return ${name};`)(...Object.values(bindings));
}

test("详情创建入口保存原文快照和稳定触发器，不提前创建或切换页签", () => {
  const captured: unknown[] = [];
  const discussionSubtaskTrigger = { current: null };
  const trigger = {} as HTMLElement;
  const open = detailHandler("openDiscussionSubtask", {
    onCreateDiscussionSubtask: () => assert.fail("打开表单不能创建任务"), collaboration: { error: "" }, discussionSubtaskSource: null,
    taskId: "parent", discussionSubtaskTrigger, setDiscussionSubtaskSource: (value: unknown) => captured.push(value),
    buildDiscussionSubtaskRequest: () => assert.fail("手动创建不能整理生成请求"),
  });
  open(message, trigger);
  assert.deepEqual(captured, [source]);
  assert.equal(discussionSubtaskTrigger.current, trigger);
});

test("详情明确创建成功才反馈，失败向表单传播保留输入", async () => {
  const calls: unknown[] = [];
  const notifications: string[] = [];
  const create = detailHandler("createDiscussionSubtask", {
    onCreateDiscussionSubtask: (draft: unknown) => { calls.push(draft); }, locale: "zh", toast: { success: (text: string) => notifications.push(text) },
  });
  const draft = { title: "已编辑的名称", completionCriteria: [], sourceDiscussion: source };
  await create(draft);
  assert.deepEqual(calls, [draft]);
  assert.deepEqual(notifications, ["子任务已创建"]);
  const failing = detailHandler("createDiscussionSubtask", { onCreateDiscussionSubtask: () => { throw new Error("来源讨论已变更"); }, locale: "zh", toast: { success: () => assert.fail("失败不能提示成功") } });
  await assert.rejects(() => failing(draft), /来源讨论已变更/);
});

test("关闭表单后回到原菜单触发器，来源已消失时安全回到讨论区域", () => {
  for (const connected of [true, false]) {
    const events: unknown[] = [];
    const trigger = { isConnected: connected, focus: () => events.push("trigger") };
    const close = detailHandler("closeDiscussionSubtask", {
      discussionSubtaskTrigger: { current: trigger }, discussionSubtaskSource: source,
      setDiscussionSubtaskSource: (value: unknown) => events.push(value),
      window: { requestAnimationFrame: (callback: () => void) => { callback(); } },
      document: { getElementById: (id: string) => id === "task-detail-panel-discussion" ? { focus: () => events.push("discussion") } : null },
    });
    close();
    assert.deepEqual(events, [null, connected ? "trigger" : "discussion"]);
  }
});

test("讨论创建立即打开空白表单，仅保留原始来源，不生成或预填任务字段", async () => {
  const created: unknown[] = [];
  const tree = capture(() => DiscussionSubtaskCreateForm({ id: "manual", members: [], tags: [], source, contextCurrent: true,
    onCreate: value => { created.push(value); }, onCancel: () => undefined,
  }));
  const form = elements(tree, item => item.type === TaskSubtaskCreateForm)[0];
  assert.ok(form, "打开即提供输入表单，不经过整理或失败状态");
  assert.equal(form.props.open, true);
  assert.deepEqual(form.props.initialDraft, { sourceDiscussion: source });
  assert.equal(created.length, 0, "打开表单不创建任务");
  const input = { title: "用户手写名称", goal: "用户手写目标", ownerId: "", labels: [], endDate: "", completionCriteria: [], sourceDiscussion: source };
  await form.props.onCreate(input);
  assert.deepEqual(created, [input]);
});

test("手动创建仍在来源变化时拒绝保存，不把输入变成另一个任务", async () => {
  const tree = capture(() => DiscussionSubtaskCreateForm({ id: "manual", members: [], tags: [], source, contextCurrent: false,
    onCreate: () => assert.fail("来源失效不得保存"), onCancel: () => undefined,
  }));
  const form = elements(tree, item => item.type === TaskSubtaskCreateForm)[0];
  assert.ok(form, "保留相同表单供查看或取消，不退回整理提示");
  await assert.rejects(async () => form.props.onCreate({ title: "已填写的名称", completionCriteria: [], sourceDiscussion: source }), /来源|discussion/i);
});

test("讨论创建入口点击时传递当前消息与触发器", () => {
  const calls: unknown[] = [];
  const trigger = {} as HTMLElement;
  const tree = capture(() => TaskDiscussionMessage({ message, currentUser: "other-member", files: [], now: Date.now(), onReply: () => undefined, onLocate: () => undefined, onOpenFile: () => undefined, onCreateSubtask: (...args) => { calls.push(args); } }));
  const button = elements(tree, item => item.props.className === "task-discussion-create-task")[0];
  assert.ok(button);
  button.props.onClick({ currentTarget: trigger });
  assert.deepEqual(calls, [[message, trigger]]);
});
