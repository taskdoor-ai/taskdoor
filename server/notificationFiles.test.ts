import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Locale } from "../src/shared/i18n/core.ts";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { notificationExamples, type WorkspaceNotification } from "../src/ai/mock/data/notificationExamples.ts";
import { findNotificationFile } from "../src/features/tasks/files/lib/notification-file-source.ts";
import { notificationsInScope } from "../src/features/notifications/lib/notification-scope.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
const { NotificationItem } = await import("../src/features/notifications/components/GlobalNotifications.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");

type Element = ReactElement<Record<string, any>>;
function elements(tree: ReactNode): Element[] {
  return Children.toArray(tree).flatMap(child => isValidElement<Record<string, any>>(child)
    ? [child, ...elements(child.props.children)] : []);
}
function capture(props: Parameters<typeof NotificationItem>[0], locale: Locale = "zh-CN") {
  let tree: ReactNode;
  function Capture() { tree = NotificationItem(props); return tree; }
  const markup = renderToStaticMarkup(createElement(I18nProvider, {
    initialLocale: locale, children: createElement(Capture),
  }));
  return { markup, text: markup.replace(/<[^>]+>/g, ""), nodes: elements(tree!) };
}

const notification: WorkspaceNotification = {
  id: "file-event", kind: "file-version-added", content: " @作者 更新了文件", contentAfterFile: "。",
  task: { id: "task-a", title: "任务甲" }, people: [{ id: "author", name: "作者" }],
  file: { id: "file-a", name: "本次交付结论.md", state: "available" },
  target: { area: "files", fileId: "file-a" }, excerpt: "实际消息摘要：请核对投放结论。",
  createdAt: "2026-11-10T08:00:00Z", time: "", read: false,
};

test("历史文件条目的独立链接仍保留准确身份及不提前已读保护", () => {
  let reads = 0;
  const opened: unknown[][] = [];
  const result = capture({ item: notification, onRead: () => { reads++; }, onOpenTask: (...args) => opened.push(args) });
  assert.ok(result.text.includes("@作者 更新了文件 本次交付结论.md。"));
  assert.ok(result.text.includes("任务：任务甲"));
  assert.ok(result.text.includes(notification.excerpt!));
  assert.doesNotMatch(result.text, /\{(?:file|fileName|task|taskName|person|excerpt)\}/);
  const fileLink = result.nodes.find(node => node.props.className === "notification-file-link")!;
  const taskLink = result.nodes.find(node => node.props.className === "notification-task-link")!;
  assert.equal(fileLink.props.title, notification.file!.name);
  assert.equal(taskLink.props.title, notification.task!.title);
  for (const link of [fileLink, taskLink]) {
    assert.equal(link.props.role, "link");
    assert.equal(link.props.tabIndex, 0);
    link.props.onClick();
    for (const key of ["Enter", " "]) {
      let prevented = false;
      link.props.onKeyDown({ key, preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
    }
    link.props.onKeyDown({ key: "Enter", repeat: true, preventDefault() {} });
    link.props.onKeyDown({ key: "Escape", preventDefault() { assert.fail("其他按键不得被接管"); } });
  }
  assert.deepEqual(opened, [
    ["task-a", notification.target], ["task-a", notification.target], ["task-a", notification.target],
    ["task-a", undefined], ["task-a", undefined], ["task-a", undefined],
  ]);
  assert.strictEqual(opened[0][1], notification.target, "文件导航须保留原目标对象");
  assert.equal(reads, 0);
  result.nodes.find(node => node.props.className === "notification-item-read")!.props.onClick();
  assert.equal(reads, 1, "明确标为已读仍独立可用");
});

test("删除、失效、缺少文件名或目标身份不匹配时不生成文件链接，任务上下文保留", () => {
  const patches: Partial<WorkspaceNotification>[] = [
    { kind: "file-deleted" },
    { file: { ...notification.file!, state: "deleted" } },
    { file: { ...notification.file!, state: "unavailable" } },
    { file: undefined },
    { file: { ...notification.file!, name: "  " } },
    { target: undefined },
    { target: { area: "files", fileId: "another-file" } },
    { target: { area: "discussion", activityId: "post-a" } },
  ];
  for (const patch of patches) {
    let reads = 0;
    const opened: unknown[][] = [];
    const result = capture({ item: { ...notification, ...patch }, onRead: () => { reads++; }, onOpenTask: (...args) => opened.push(args) });
    assert.equal(result.nodes.some(node => node.props.className === "notification-file-link"), false, JSON.stringify(patch));
    const unavailable = result.nodes.find(node => node.props.className === "notification-file-reference")!;
    assert.equal(unavailable.props["aria-disabled"], "true");
    assert.equal(unavailable.props.onClick, undefined);
    const taskLink = result.nodes.find(node => node.props.className === "notification-task-link")!;
    taskLink.props.onClick();
    assert.deepEqual(opened, [["task-a", undefined]]);
    assert.equal(reads, 0);
    if (!patch.file || !patch.file.name.trim()) {
      if ("file" in patch) assert.ok(result.text.includes("文件名不可用"));
    }
  }
  const noTask = capture({ item: { ...notification, task: undefined }, onRead() {}, onOpenTask() {} });
  assert.equal(noTask.nodes.some(node => node.props.className === "notification-file-link"), false);
  const noNavigation = capture({ item: notification, onRead() {} });
  assert.equal(noNavigation.nodes.some(node => node.props.className === "notification-file-link"), false);
});

test("实际通知清单不注入文件事件，历史文件负夹具在开关两态都被排除", () => {
  const fileKinds = ["file-added", "file-version-added", "file-deleted"] as const;
  assert.equal(notificationExamples.some(item => fileKinds.includes(item.kind as typeof fileKinds[number])), false);
  const legacy = fileKinds.map(kind => ({ ...notification, kind, audience: "direct" as const }));
  const before = structuredClone(legacy);
  for (const onlyRelated of [true, false]) {
    assert.deepEqual(notificationsInScope([...notificationExamples, ...legacy], onlyRelated).filter(item => fileKinds.includes(item.kind as typeof fileKinds[number])), []);
  }
  assert.deepEqual(legacy, before, "旧记录仅被排除，不删除或改写");
});

const rootFile: TaskFileNode = { id: "file-a", kind: "file", name: "同名交付.md", parentId: null, updatedAt: "" };
const folder: TaskFileNode = { id: "folder-a", kind: "folder", name: "交付目录", parentId: null, updatedAt: "" };
const nested: TaskFileNode = { id: "folder-b", kind: "folder", name: "下级目录", parentId: folder.id, updatedAt: "" };

test("文件来源只接受准确文件ID，同名、错ID或目录不得回退为其他文件", () => {
  const sameName = { ...rootFile, id: "file-b" };
  assert.strictEqual(findNotificationFile([sameName, rootFile, folder], rootFile.id), rootFile);
  for (const id of ["", "missing", "FILE-A", folder.id]) {
    assert.equal(findNotificationFile([sameName, rootFile, folder], id), undefined, id);
  }
  const child = { ...rootFile, parentId: nested.id };
  assert.strictEqual(findNotificationFile([child, nested, folder], child.id), child);
});

test("已归档、退出内置来源及讨论专属文件均不可从任务文件通知打开", () => {
  const sameName = { ...rootFile, id: "file-b" };
  for (const patch of [{ archived: true }, { retiredBuiltin: true as const }, { attachmentOnly: true as const }, { discussionOnly: true as const }]) {
    const invalid = { ...rootFile, ...patch };
    assert.equal(findNotificationFile([invalid, sameName], invalid.id), undefined, JSON.stringify(patch));
  }
});

test("文件来源校验完整祖先链，缺失、失效、错误类型或循环不冒用其他来源", () => {
  const child = { ...rootFile, parentId: nested.id };
  for (const patch of [{ archived: true }, { retiredBuiltin: true as const }, { attachmentOnly: true as const }, { discussionOnly: true as const }]) {
    assert.equal(findNotificationFile([child, nested, { ...folder, ...patch }], child.id), undefined, JSON.stringify(patch));
  }
  assert.equal(findNotificationFile([child, nested], child.id), undefined, "祖先缺失");
  assert.equal(findNotificationFile([child, { ...nested, kind: "file" }, folder], child.id), undefined, "祖先必须是目录");
  assert.equal(findNotificationFile([child, nested, { ...folder, parentId: nested.id }], child.id), undefined, "祖先循环");
  assert.equal(findNotificationFile([{ ...rootFile, parentId: rootFile.id }], rootFile.id), undefined, "自身循环");
  assert.strictEqual(findNotificationFile([rootFile, { ...nested, parentId: folder.id }, { ...folder, parentId: nested.id }], rootFile.id), rootFile, "无关分支损坏不影响有效根文件");
});
