import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  NOTIFICATION_PREFERENCES_CHANGED_EVENT,
  notificationPreferencesKey,
  readNotificationPreferences,
  saveNotificationPreferences,
} from "../src/features/notifications/lib/notification-preferences.ts";
import { isRelatedNotification, notificationsInScope } from "../src/features/notifications/lib/notification-scope.ts";
import { notificationReadStateKey, parseNotificationReadState } from "../src/features/notifications/lib/notification-read-state.ts";
import { notificationExamples, type WorkspaceNotification } from "../src/ai/mock/data/notificationExamples.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
const { GlobalNotifications, NotificationItem } = await import("../src/features/notifications/components/GlobalNotifications.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

function withBrowserStorage<T>(storage: ReturnType<typeof memoryStorage>, run: (browser: EventTarget) => T): T {
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const priorStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const browser = Object.assign(new EventTarget(), { location: { search: "" } });
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  try { return run(browser); }
  finally {
    if (priorWindow) Object.defineProperty(globalThis, "window", priorWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (priorStorage) Object.defineProperty(globalThis, "localStorage", priorStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

type Element = ReactElement<Record<string, any>>;
function elements(tree: ReactNode): Element[] {
  return Children.toArray(tree).flatMap(child => isValidElement<Record<string, any>>(child)
    ? [child, ...elements(child.props.children)] : []);
}

function captureNotifications(props: Parameters<typeof GlobalNotifications>[0] = {}) {
  let tree: ReactNode;
  function Capture() { tree = GlobalNotifications(props); return tree; }
  const markup = renderToStaticMarkup(createElement(I18nProvider, {
    initialLocale: "zh-CN", children: createElement(Capture),
  }));
  return { markup, nodes: elements(tree!) };
}

test("通知偏好默认仅相关，按账号隔离并能保存后重新读取", () => {
  const storage = memoryStorage();
  const initial = readNotificationPreferences(storage, "alice");
  assert.deepEqual(initial, { onlyRelated: true });
  initial.onlyRelated = false;
  assert.deepEqual(readNotificationPreferences(storage, "bob"), { onlyRelated: true }, "读取结果不能改写默认值");
  saveNotificationPreferences(storage, "alice", { onlyRelated: false });
  assert.deepEqual(readNotificationPreferences(storage, "alice"), { onlyRelated: false });
  assert.deepEqual(readNotificationPreferences(storage, "bob"), { onlyRelated: true });
  saveNotificationPreferences(storage, "bob", { onlyRelated: true });
  saveNotificationPreferences(storage, "alice", { onlyRelated: true });
  assert.deepEqual(readNotificationPreferences(storage, "alice"), { onlyRelated: true });
  assert.deepEqual(readNotificationPreferences(storage, "bob"), { onlyRelated: true });
  assert.notEqual(notificationPreferencesKey("member:a/b"), notificationPreferencesKey("member:a:b"));
});

test("空账号、损坏配置和存储读取失败均显式失败，不伪装成保存状态", () => {
  const storage = memoryStorage();
  for (const userId of ["", "   "]) {
    assert.throws(() => readNotificationPreferences(storage, userId));
    assert.throws(() => saveNotificationPreferences(storage, userId, { onlyRelated: false }));
  }
  assert.equal(storage.data.size, 0);
  for (const raw of ["invalid-json", "null", "[]", "{}", '{"version":2,"onlyRelated":false}', '{"version":1,"onlyRelated":"false"}']) {
    storage.setItem(notificationPreferencesKey("alice"), raw);
    assert.throws(() => readNotificationPreferences(storage, "alice"), raw);
  }
  assert.throws(() => readNotificationPreferences({ getItem() { throw new Error("storage unavailable"); } }, "alice"), /storage unavailable/);
});

test("保存失败不广播成功，成功保存后仅通知对应账号", () => {
  const storage = memoryStorage();
  withBrowserStorage(storage, browser => {
    const changes: unknown[] = [];
    browser.addEventListener(NOTIFICATION_PREFERENCES_CHANGED_EVENT, event => changes.push((event as CustomEvent).detail));
    const refused = { setItem() { throw new Error("quota exceeded"); } };
    assert.throws(() => saveNotificationPreferences(refused, "alice", { onlyRelated: false }), /quota exceeded/);
    assert.deepEqual(changes, []);
    assert.deepEqual(readNotificationPreferences(storage, "alice"), { onlyRelated: true });
    saveNotificationPreferences(storage, "alice", { onlyRelated: false });
    assert.deepEqual(changes, [{ userId: "alice" }]);
    assert.deepEqual(readNotificationPreferences(storage, "alice"), { onlyRelated: false });
    assert.deepEqual(readNotificationPreferences(storage, "bob"), { onlyRelated: true });
  });
});

test("仅相关范围保留直接提及、回复和必要本人关系，关闭后只恢复允许的动态且不改已读", () => {
  const items: Array<{ id: string; kind: string; audience?: "direct" | "activity"; read: boolean }> = [
    { id: "mention", kind: "mention", read: false },
    { id: "reply", kind: "reply", read: true },
    { id: "invite", kind: "invitation", read: false },
    { id: "handoff", kind: "handoff", read: false },
    { id: "own-comment-like", kind: "like", read: false },
    { id: "followed-discussion", kind: "discussion", read: false },
    { id: "assigned-to-me", kind: "assigned", audience: "direct", read: false },
    { id: "my-owner-cleared", kind: "owner-cleared", audience: "direct", read: false },
    { id: "removed-me", kind: "participant-removed", audience: "direct", read: true },
    { id: "my-task-deleted", kind: "task-deleted", audience: "direct", read: false },
    { id: "file-update", kind: "file-version-added", audience: "activity", read: false },
    { id: "task-update", kind: "task-updated", read: false },
    { id: "other-joined", kind: "member-joined", read: false },
    { id: "other-invited", kind: "invitation", audience: "activity", read: false },
  ];
  const before = structuredClone(items);
  assert.deepEqual(notificationsInScope(items, true).map(item => item.id), [
    "mention", "reply", "invite", "handoff", "own-comment-like", "assigned-to-me", "my-owner-cleared", "removed-me", "my-task-deleted",
  ]);
  const all = notificationsInScope(items, false);
  assert.deepEqual(all.map(item => item.id), [
    "mention", "reply", "invite", "handoff", "own-comment-like", "followed-discussion", "assigned-to-me", "my-owner-cleared", "removed-me", "my-task-deleted",
    "task-update", "other-joined", "other-invited",
  ]);
  assert.notEqual(all, items);
  assert.deepEqual(items, before, "切换范围不能删除历史通知或改写其已读状态");
});

test("全部文件增改删在开关两态均排除，负责人和direct标记也不能例外", () => {
  const files = ["file-added", "file-version-added", "file-deleted"].flatMap(kind =>
    ([undefined, "activity", "direct"] as const).map(audience => ({
      id: `${kind}-${audience ?? "default"}`, kind, audience, ownerId: "alice", recipientId: "alice", read: false,
    })));
  const before = structuredClone(files);
  for (const item of files) assert.equal(isRelatedNotification(item), false, item.id);
  for (const onlyRelated of [true, false]) assert.deepEqual(notificationsInScope(files, onlyRelated), []);
  assert.deepEqual(files, before, "通知排除不删除文件事件历史或改写阅读状态");
});

test("通知默认徽标排除普通团队动态，直接讨论与邀请不丢失", () => {
  const { markup, nodes } = captureNotifications();
  const visible = nodes.filter(node => node.type === NotificationItem).map(node => node.props.item.id);
  const expected = ["live-discussion-mention-attachments-only", "live-discussion-mention", "creator-business-assignment", ...notificationExamples.filter(item => item.kind === "like").map(item => item.id)];
  assert.match(markup, new RegExp(`aria-label="通知 \\(${expected.length}\\)"`));
  assert.deepEqual(new Set(visible), new Set(expected), "已发布的本人评论获赞提醒不能因范围设置丢失");
});

test("徽标、列表与全部已读始终排除文件，带文件引用的@和回复保留", () => {
  const storage = memoryStorage();
  const base = { teamId: "team-a", content: "通知", createdAt: "2026-11-10T08:00:00Z", time: "", read: false };
  const items: WorkspaceNotification[] = [
    { ...base, id: "direct-mention", kind: "mention", file: { id: "file-a", name: "被提及的文件.md" }, target: { area: "discussion", activityId: "post-a" } },
    { ...base, id: "direct-reply", kind: "reply", file: { id: "file-b", name: "回复中的文件.pdf" }, read: true, target: { area: "discussion", activityId: "post-b" } },
    { ...base, id: "other-team-activity", kind: "member-joined", audience: "activity" },
    { ...base, id: "necessary-relation", kind: "member-joined", audience: "direct" },
    ...(["file-added", "file-version-added", "file-deleted"] as const).map(kind => ({
      ...base, id: kind, kind, audience: "direct" as const, file: { id: kind, name: "负责人自己的文件.md" },
      target: { area: "files" as const, fileId: kind },
    })),
  ];
  const before = structuredClone(items);
  withBrowserStorage(storage, () => {
    const props = { discussionNotifications: items, showDemoNotifications: false, teamId: "team-a", userId: "alice" };
    const scoped = captureNotifications(props);
    assert.match(scoped.markup, /aria-label="通知 \(2\)"/);
    assert.deepEqual(scoped.nodes.filter(node => node.type === NotificationItem).map(node => node.props.item.id), [
      "direct-mention", "direct-reply", "necessary-relation",
    ]);
    scoped.nodes.find(node => node.props.className === "notification-mark-read")!.props.onClick();
    const readKey = notificationReadStateKey("team-a", "alice");
    assert.deepEqual(parseNotificationReadState(storage.getItem(readKey)).readIds.sort(), ["direct-mention", "necessary-relation"]);
    assert.deepEqual(items, before, "全部已读通过状态存储处理，不能修改通知历史对象");

    saveNotificationPreferences(storage, "alice", { onlyRelated: false });
    const all = captureNotifications(props);
    assert.deepEqual(all.nodes.filter(node => node.type === NotificationItem).map(node => node.props.item.id), [
      "direct-mention", "direct-reply", "other-team-activity", "necessary-relation",
    ]);
    assert.match(all.markup, /aria-label="通知 \(3\)"/);
    all.nodes.find(node => node.props.className === "notification-mark-read")!.props.onClick();
    assert.deepEqual(parseNotificationReadState(storage.getItem(readKey)).readIds.sort(), [
      "direct-mention", "necessary-relation", "other-team-activity",
    ]);
    assert.deepEqual(items, before);
  });
});
