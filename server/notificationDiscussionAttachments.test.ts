import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readTaskDiscussionNotifications } from "../src/app/workspace/lib/discussion-notifications.ts";
import { createCollaborationSnapshot, deleteCollaborationMessage, postCollaborationMessage, saveCollaboration, updateCollaborationMessage, type CollaborationMessage } from "../src/features/tasks/lib/task-collaboration.ts";
import { notificationsInScope } from "../src/features/notifications/lib/notification-scope.ts";
import type { WorkspaceNotification } from "../src/ai/mock/data/notificationExamples.ts";
import type { TaskFileNode, TaskNode } from "../src/shared/model/task-model.ts";

register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { NotificationItem } = await import("../src/features/notifications/components/GlobalNotifications.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");

const at = "2026-11-10T10:00:00+08:00";
const task: TaskNode = { id: "task", kind: "task", name: "核对方案", parentId: "root", teamId: "team", ownerId: "author", participantIds: ["recipient"], status: "进行中", updatedAt: at };
const people = [{ id: "author", name: "作者" }, { id: "recipient", name: "收件人" }];
const fileA: TaskFileNode = { id: "file-a", kind: "file", name: "同名方案.pdf", parentId: null, updatedAt: at, version: 1, previewData: { kind: "pdf", pages: ["A"] } };
const fileB: TaskFileNode = { ...fileA, id: "file-b", version: 2, previewData: { kind: "pdf", pages: ["B"] } };
const refs = [fileA, fileB].map(file => ({ fileId: file.id, version: file.version!, name: file.name }));

function fixture(files = [fileA, fileB]) {
  const records = new Map<string, string>();
  const storage = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
  const scope = JSON.stringify([task.teamId, task.id]);
  let current = createCollaborationSnapshot(files);
  const publish = (message: CollaborationMessage) => {
    current = saveCollaboration(storage, scope, current.revision, postCollaborationMessage(current, { message, visiblePeople: people }));
  };
  const read = () => readTaskDiscussionNotifications(storage, task.teamId!, "recipient", [task], people, "zh-CN");
  return { records, storage, scope, publish, read, snapshot: () => current };
}

test("真实提及和直接回复投影保留新消息正文与同名附件的固定身份", () => {
  const source = fixture();
  source.publish({ id: "parent", author: "recipient", type: "member-post", message: "原消息不能冒充新回复正文", time: "", createdAt: at });
  const body = "@收件人 请核对两个方案。\n第二行保持原文。";
  source.publish({ id: "mention", author: "author", type: "member-post", message: body, mentionedPrincipalIds: ["recipient"], attachmentRefs: refs, time: "", createdAt: at });
  source.publish({ id: "reply", author: "author", type: "member-reply", replyToActivityId: "parent", message: "新回复正文", attachmentRefs: [refs[1]], time: "", createdAt: at });
  const items = source.read();
  assert.equal(items.find(item => item.kind === "mention")!.excerpt, body);
  assert.deepEqual(items.find(item => item.kind === "mention")!.attachments, refs);
  assert.equal(items.find(item => item.kind === "reply")!.excerpt, "新回复正文");
  assert.deepEqual(items.find(item => item.kind === "reply")!.attachments, [refs[1]]);
  assert.deepEqual(items.find(item => item.kind === "reply")!.target, { area: "discussion", activityId: "reply" });
});

test("仅附件或仅有效@的消息没有空摘要，真实附件名称仍保留", () => {
  for (const body of ["", "@收件人", " @收件人， "]) {
    const source = fixture();
    source.publish({ id: "mention", author: "author", type: "member-post", message: body, mentionedPrincipalIds: ["recipient"], attachmentRefs: refs, time: "", createdAt: at });
    const [item] = source.read();
    assert.equal(item.excerpt, undefined, body);
    assert.deepEqual(item.attachments, refs);
  }
});

test("附件来源缺失、归档或固定版本不可读时只保留名称，不按同名文件补来源", () => {
  for (const patch of ["missing", "archived", "version"] as const) {
    const source = fixture();
    source.publish({ id: "mention", author: "author", type: "member-post", message: "@收件人 正文仍可读", mentionedPrincipalIds: ["recipient"], attachmentRefs: [refs[0]], time: "", createdAt: at });
    const [key, raw] = [...source.records.entries()][0];
    const saved = JSON.parse(raw);
    saved.files = patch === "missing" ? [fileB] : [{ ...fileA, ...(patch === "archived" ? { archived: true } : { version: 2 }) }, fileB];
    source.storage.setItem(key, JSON.stringify(saved));
    const [item] = source.read();
    assert.equal(item.excerpt, "@收件人 正文仍可读");
    assert.deepEqual(item.attachments, [{ ...refs[0], unavailable: true }], patch);
  }
});

test("已删除消息、损坏附件引用或无法读取来源不暴露旧正文及附件", () => {
  const source = fixture();
  const message: CollaborationMessage = { id: "mention", author: "author", type: "member-post", message: "@收件人 保密正文", mentionedPrincipalIds: ["recipient"], attachmentRefs: refs, time: "", createdAt: at };
  source.publish(message);
  const [key, original] = [...source.records.entries()][0];
  const broken = JSON.parse(original);
  broken.messages[0].attachmentRefs[0].version = 0;
  source.storage.setItem(key, JSON.stringify(broken));
  assert.deepEqual(source.read(), []);
  source.storage.setItem(key, original);
  saveCollaboration(source.storage, source.scope, source.snapshot().revision, deleteCollaborationMessage(source.snapshot(), message, "author"));
  assert.deepEqual(source.read(), []);
  assert.deepEqual(readTaskDiscussionNotifications({ getItem() { throw new Error("denied"); }, setItem() {} }, "team", "recipient", [task], people, "zh-CN"), []);
});

type Element = ReactElement<Record<string, any>>;
function elements(tree: ReactNode): Element[] {
  return Children.toArray(tree).flatMap(child => isValidElement<Record<string, any>>(child) ? [child, ...elements(child.props.children)] : []);
}
function capture(item: WorkspaceNotification, onOpenTask: (...args: unknown[]) => void, onRead: () => void) {
  let tree: ReactNode;
  function Capture() { tree = NotificationItem({ item, onOpenTask, onRead }); return tree; }
  const markup = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Capture) }));
  return { markup, nodes: elements(tree!) };
}
const item: WorkspaceNotification = { id: "mention-ui", kind: "mention", content: "@作者 在", contentAfterTask: " 的讨论中提及了你。", excerpt: "新消息正文",
  task: { id: "task", title: "核对方案" }, target: { area: "discussion", activityId: "message" }, attachments: [...refs, { ...refs[0], version: 3 }],
  createdAt: at, time: "", read: false };

test("正文和纯附件名称在同一内容块内顺序呈现，鼠标和键盘精确导航且不提前已读", () => {
  const opened: unknown[][] = [];
  let reads = 0;
  const rendered = capture(item, (...args) => { opened.push(args); }, () => { reads++; });
  const links = rendered.nodes.filter(node => node.props.className === "notification-attachment-link");
  assert.equal(links.length, 3);
  const content = rendered.nodes.find(node => node.props.className === "notification-item-discussion-content")!;
  const contentNodes = elements(content.props.children);
  assert.ok(contentNodes.some(node => node.props.className === "notification-item-excerpt"));
  assert.ok(contentNodes.some(node => node.props.className === "notification-item-attachments"));
  assert.ok(rendered.markup.indexOf("notification-item-excerpt") < rendered.markup.indexOf("notification-item-attachments"));
  for (const [index, link] of links.entries()) {
    assert.equal(link.props.children, item.attachments![index].name);
    assert.equal(link.props.role, "link");
    assert.equal(link.props.tabIndex, 0);
    link.props.onClick();
    for (const key of ["Enter", " "]) {
      let prevented = false;
      link.props.onKeyDown({ key, preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
    }
    link.props.onKeyDown({ key: "Enter", repeat: true, preventDefault() {} });
  }
  assert.deepEqual(opened, item.attachments!.flatMap(ref => Array.from({ length: 3 }, () => ["task", { area: "discussion", activityId: "message", attachment: { fileId: ref.fileId, version: ref.version } }])));
  assert.equal(reads, 0);
  rendered.nodes.find(node => node.props.className === "notification-task-link")!.props.onClick();
  assert.deepEqual(opened.at(-1), ["task", { area: "discussion", activityId: "message" }]);
  assert.equal(reads, 0);
  const group = rendered.nodes.find(node => node.props.className === "notification-item-attachments")!;
  assert.equal(elements(group).some(node => node.type === "img" || node.type === "svg"), false);
});

test("不可用附件或不完整消息目标只显示文字，不提供伪文件链接", () => {
  for (const patch of [
    { attachments: [{ ...refs[0], unavailable: true }] },
    { attachments: [{ ...refs[0], fileId: "" }] },
    { attachments: [{ ...refs[0], version: 0 }] },
    { target: { area: "discussion" as const } },
    { target: { area: "files" as const, fileId: "file-a" } },
  ]) {
    const rendered = capture({ ...item, ...patch }, () => assert.fail("不可用附件不得导航"), () => assert.fail("只显示附件不能标记已读"));
    assert.equal(rendered.nodes.some(node => node.props.className === "notification-attachment-link"), false);
    assert.ok(rendered.nodes.some(node => node.props.className === "notification-attachment-reference"));
  }
  const onlyAttachments = capture({ ...item, excerpt: undefined }, () => {}, () => {});
  assert.ok(onlyAttachments.nodes.some(node => node.props.className === "notification-item-discussion-content"));
  assert.equal(onlyAttachments.markup.includes("notification-item-excerpt"), false);
  assert.equal(onlyAttachments.nodes.filter(node => node.props.className === "notification-attachment-link").length, 3);
});

test("有附件的@与回复仍在相关通知中，独立文件事件继续无条件排除", () => {
  for (const onlyRelated of [true, false]) {
    const notifications = notificationsInScope([item, { ...item, id: "reply", kind: "reply" as const }, { ...item, id: "file", kind: "file-added" as const, audience: "direct" as const }], onlyRelated);
    assert.deepEqual(notifications.map(notification => notification.id), [item.id, "reply"]);
  }
});

test("有限演示通知来自真实原消息及附件引用，中英文不改写附件名称", async () => {
  const { notificationExamples } = await import("../src/ai/mock/data/notificationExamples.ts");
  const { taskDetailMocks } = await import("../src/ai/mock/data/taskDetailMocks.ts");
  const { notificationCopy } = await import("../src/ai/mock/prototype/notification-copy.ts");
  for (const id of ["live-discussion-mention", "live-discussion-mention-attachments-only"]) {
    const notice = notificationExamples.find(item => item.id === id)!;
    assert.ok(notice);
    const source = taskDetailMocks["fragrance-live"].activities.find(message => message.id === notice.target?.activityId) as CollaborationMessage;
    assert.ok(source && !source.deletedAt);
    assert.deepEqual(notice.attachments, source.attachmentRefs);
    assert.equal(notice.attachments?.length, 2);
    for (const attachment of notice.attachments!) {
      const file = taskDetailMocks["fragrance-live"].files.find(file => file.id === attachment.fileId && !file.archived)!;
      assert.equal(file.name, attachment.name);
      assert.equal(file.version, attachment.version);
    }
    assert.equal(notice.excerpt, id.endsWith("attachments-only") ? undefined : source.message);
    assert.deepEqual(notificationCopy("en", notice).attachments, notice.attachments);
  }
});

test("演示通知重新读取当前讨论，删除或损坏原消息后不保留旧正文和附件", async () => {
  const { readNotificationExamples, notificationExamples } = await import("../src/ai/mock/data/notificationExamples.ts");
  const { taskDetailMocks } = await import("../src/ai/mock/data/taskDetailMocks.ts");
  const detail = taskDetailMocks["fragrance-live"];
  const message = detail.activities.find(item => item.id === "fragrance-live-activity") as CollaborationMessage;
  const source = fixture();
  const scope = JSON.stringify(["creator-commerce", "fragrance-live"]);
  const snapshot = createCollaborationSnapshot(detail.files);
  saveCollaboration(source.storage, scope, 0, deleteCollaborationMessage(snapshot, message, message.author));
  const items = readNotificationExamples(source.storage);
  assert.equal(items.some(item => item.target?.activityId === message.id), false);
  assert.ok(items.some(item => item.id === "live-discussion-mention-attachments-only"));
  const [key] = [...source.records.keys()];
  source.storage.setItem(key, "{broken");
  assert.deepEqual(readNotificationExamples(source.storage).map(item => item.id), notificationExamples.filter(item => item.task?.id !== "fragrance-live").map(item => item.id), "损坏的讨论不应移除其他任务的获赞提醒");
});

test("演示通知按当前原文和引用刷新，文件归档只保留该引用名称", async () => {
  const { readNotificationExamples } = await import("../src/ai/mock/data/notificationExamples.ts");
  const { taskDetailMocks } = await import("../src/ai/mock/data/taskDetailMocks.ts");
  const detail = taskDetailMocks["fragrance-live"];
  const message = detail.activities.find(item => item.id === "fragrance-live-activity") as CollaborationMessage;
  const source = fixture();
  const scope = JSON.stringify(["creator-commerce", "fragrance-live"]);
  const ref = message.attachmentRefs![1];
  let snapshot = createCollaborationSnapshot(detail.files);
  snapshot = saveCollaboration(source.storage, scope, 0, updateCollaborationMessage(snapshot, message, message.author, {
    message: "@周岚 更新后的讨论正文", attachmentRefs: [ref],
  }));
  const changed = readNotificationExamples(source.storage).find(item => item.id === "live-discussion-mention")!;
  assert.equal(changed.excerpt, "@周岚 更新后的讨论正文");
  assert.deepEqual(changed.attachments, [ref]);
  saveCollaboration(source.storage, scope, snapshot.revision, {
    ...snapshot, revision: snapshot.revision + 1,
    files: snapshot.files.map(file => file.id === ref.fileId ? { ...file, archived: true, name: "已更名的源文件.md" } : file),
  });
  const archived = readNotificationExamples(source.storage).find(item => item.id === "live-discussion-mention")!;
  assert.deepEqual(archived.attachments, [{ ...ref, unavailable: true }]);
  assert.equal(archived.excerpt, changed.excerpt);
});
