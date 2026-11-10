import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import type { CollaborationMessage } from "../src/features/tasks/lib/task-collaboration.ts";
import { resolveDiscussionNotificationAttachment } from "../src/features/tasks/lib/discussion-notification-source.ts";

const file: TaskFileNode = { id: "source-file", kind: "file", name: "已改名的文件.txt", version: 2, content: "当前新版正文", parentId: null, updatedAt: "" };
const ref = { fileId: file.id, version: 1, name: "发言时的文件名.txt" };
const message: CollaborationMessage = { id: "source-message", author: "author", type: "member-post", time: "", message: "请核对这个附件", attachmentRefs: [ref] };
const target = { messageId: message.id, fileId: file.id, version: 1 };

test("讨论通知附件严格匹配已发布消息的文件身份及引用版本，不依名称定位", () => {
  const sameName = { ...file, id: "other-file" };
  const actual = resolveDiscussionNotificationAttachment([message], [sameName, file], target);
  assert.ok(actual, "有效讨论引用应解析为准确来源");
  assert.strictEqual(actual.message, message);
  assert.strictEqual(actual.ref, ref);
  assert.strictEqual(actual.file, file);
  assert.equal(actual.ref.version, 1, "不能把旧引用改成当前v2");
  assert.equal(resolveDiscussionNotificationAttachment([message], [sameName], target), undefined);
  assert.equal(resolveDiscussionNotificationAttachment([message], [file], { ...target, fileId: sameName.id }), undefined);
});

test("消息已删、类型错误、引用版本不符或文件失效时不能打开其他来源", () => {
  const invalidMessages: CollaborationMessage[][] = [
    [], [{ ...message, deletedAt: "2026-11-10T09:00:00Z" }],
    [{ ...message, type: "status-change" }], [{ ...message, attachmentRefs: [] }],
    [{ ...message, attachmentRefs: [{ ...ref, version: 2 }] }],
  ];
  for (const messages of invalidMessages) assert.equal(resolveDiscussionNotificationAttachment(messages, [file], target), undefined);
  for (const version of [0, -1, 1.5, NaN, Infinity]) {
    assert.equal(resolveDiscussionNotificationAttachment([message], [file], { ...target, version }), undefined);
  }
  assert.equal(resolveDiscussionNotificationAttachment([message], [{ ...file, archived: true }], target), undefined);
  assert.equal(resolveDiscussionNotificationAttachment([message], [{ ...file, kind: "folder" }], target), undefined);
  assert.equal(resolveDiscussionNotificationAttachment([message], [file], { ...target, messageId: "other-message" }), undefined);
});

test("真实讨论专属、生成及历史退役来源可被原回复引用，独立材料仍严格核对版本", () => {
  for (const patch of [{ discussionOnly: true as const }, { attachmentOnly: true as const }, { retiredBuiltin: true as const }]) {
    const source = { ...file, ...patch, version: 1 };
    const reply = { ...message, type: "member-reply" as const };
    assert.strictEqual(resolveDiscussionNotificationAttachment([reply], [source], target)?.file, source);
  }
  assert.equal(resolveDiscussionNotificationAttachment([message], [{ ...file, attachmentOnly: true }], target), undefined, "不可变生成材料没有别的引用版本");
});

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
await import("../src/features/tasks/components/TaskDetail.tsx");
const { TaskDiscussion } = await import("../src/features/tasks/components/TaskDiscussion.tsx");
const { TaskDiscussionMessage } = await import("../src/features/tasks/discussion/components/TaskDiscussionMessage.tsx");
const { TaskFileExplorer } = await import("../src/features/tasks/files/components/TaskFileExplorer.tsx");
const { TaskFileViewer } = await import("../src/features/tasks/files/components/TaskFileViewer.tsx");
const { Dialog, DialogContent } = await import("../src/shared/ui/dialog.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");
type Element = ReactElement<Record<string, any>>;
function elements(tree: ReactNode): Element[] {
  return Children.toArray(tree).flatMap(child => isValidElement<Record<string, any>>(child)
    ? [child, ...elements(child.props.children)] : []);
}

test("有效旧引用缺少完整版本快照时显示不可用，关闭预览返回原讨论附件", () => {
  let tree: ReactNode;
  const attachment = { isConnected: true, focus() {} } as HTMLElement;
  function Capture() {
    tree = TaskFileExplorer({
      browserMode: true, files: [file], focusedFileId: file.id, focusedVersion: ref.version,
      focusedTrigger: attachment, preserveFocusedDirectory: true, taskId: "discussion-notification-fixed-version", currentUser: "reader",
    });
    return null;
  }
  renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Capture) }));
  const nodes = elements(tree!);
  assert.equal(nodes.some(node => node.type === TaskFileViewer), false, "不能显示当前新版冒充旧版");
  const preview = nodes.find(node => node.type === Dialog && elements(node.props.children).some(child => child.type === DialogContent && child.props.className?.includes("task-file-preview-dialog")))!;
  assert.equal(preview.props.open, true, "明确显示引用不可用，而非打开别的文件");
  const popup = nodes.find(node => node.type === DialogContent && node.props.className?.includes("task-file-preview-dialog"))!;
  assert.strictEqual(popup.props.finalFocus(), attachment);
  const versionNotice = nodes.find(node => node.props.className === "task-file-reference-version")!;
  const markup = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: versionNotice }));
  assert.ok(markup.includes("v1 暂不可用"));
});

test("当前扁平讨论流的回复及附件首次渲染即存在，不依赖旧版回复展开", () => {
  const reply = { ...message, id: "notification-reply", type: "member-reply" as const, replyToActivityId: "parent-message" };
  const parent = { ...message, id: reply.replyToActivityId, attachmentRefs: [] };
  let tree: ReactNode;
  function Capture() {
    tree = TaskDiscussion({
      activities: [parent, reply], files: [file], currentUser: "reader", people: [],
      attentionTarget: { id: reply.id, sequence: 1 }, onOpenFile() {}, onPost() {},
    });
    return null;
  }
  renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Capture) }));
  const published = elements(tree!).filter(node => node.type === TaskDiscussionMessage);
  assert.deepEqual(published.map(node => node.props.message.id), [parent.id, reply.id]);
  const replyElement = published.find(node => node.props.message.id === reply.id)!;
  const markup = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: replyElement }));
  assert.ok(markup.includes(`id="task-activity-${reply.id}"`));
  assert.ok(markup.includes(`data-key="${file.id}:${ref.version}"`), "原回复附件可供通知路径直接定位与返回焦点");
});
