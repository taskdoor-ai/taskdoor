import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

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
  return Children.toArray(tree).flatMap(child => isValidElement<Record<string, any>>(child) ? [child, ...elements(child.props.children)] : []);
}
function capture(props: Parameters<typeof NotificationItem>[0]) {
  let tree: ReactNode;
  function Capture() { tree = NotificationItem(props); return tree; }
  renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Capture) }));
  return elements(tree!);
}

test("讨论通知链接只导航到讨论来源，成功呈现前不提前已读", () => {
  let reads = 0;
  const opens: unknown[][] = [];
  const target = { area: "discussion" as const, activityId: "post-a" };
  const nodes = capture({
    item: { id: "regional", kind: "mention", task: { id: "task-a", title: "任务甲" }, target, content: "任务甲中有人提及你", createdAt: "2026-10-16T01:00:00Z", time: "", read: false },
    onRead: () => { reads++; }, onOpenTask: (...args) => { opens.push(args); },
  });
  nodes.find(node => node.props.className === "notification-task-link")!.props.onClick();
  assert.equal(reads, 0, "失败或无权访问不能被导航点击误记为已读");
  assert.deepEqual(opens, [["task-a", target]]);
  nodes.find(node => node.props.className === "notification-item-read")!.props.onClick();
  assert.equal(reads, 1, "独立手动标已读仍可用");
});

test("普通事件保持原单条操作，文件区域不被当成讨论读取", () => {
  for (const target of [undefined, { area: "files" as const, fileId: "file-a" }]) {
    let reads = 0;
    const opens: unknown[][] = [];
    const nodes = capture({
      item: { id: "other", kind: "invitation", task: { id: "task-a", title: "任务甲" }, target, content: "邀请你参与任务甲", createdAt: "2026-10-16T01:00:00Z", time: "", read: false },
      onRead: () => { reads++; }, onOpenTask: (...args) => { opens.push(args); },
    });
    nodes.find(node => node.props.className === "notification-task-link")!.props.onClick();
    assert.equal(reads, target ? 0 : 1);
    assert.deepEqual(opens, [["task-a", target]]);
  }
});
