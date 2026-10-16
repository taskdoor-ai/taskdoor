import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CollaborationMessage, DiscussionDraft } from "../src/features/tasks/lib/task-collaboration.ts";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { relativeTaskTime } from "../src/features/tasks/lib/relative-time.ts";

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
const { DiscussionMessages } = await import("../src/features/tasks/discussion/components/DiscussionMessages.tsx");
const { DiscussionComposer } = await import("../src/features/tasks/discussion/components/DiscussionComposer.tsx");
const { AiConnectionButton } = await import("../src/features/ai-connection/components/AiConnectionButton.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");

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
function capture(render: () => ReactNode, initialize?: (tree: ReactNode) => void) {
  let tree: ReactNode = null;
  function Capture() { tree = render(); initialize?.(tree); return tree; }
  const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Capture) }));
  return { tree, html };
}
const message = (id: string, hour: number, patch: Partial<CollaborationMessage> = {}): CollaborationMessage => ({
  id, author: "陈默", type: "member-post", message: `${id} 的内容`, time: "时间未知", createdAt: `2026-09-14T0${hour}:00:00Z`, ...patch,
});
const root = message("root", 1);
const otherRoot = message("other-root", 2);
const reply = message("reply", 3, { author: "周岚", type: "member-reply", replyToActivityId: root.id });
const nested = message("nested", 4, { author: "林洁", type: "member-reply", replyToActivityId: reply.id });
const otherReply = message("other-reply", 5, { type: "member-reply", replyToActivityId: otherRoot.id });
const activities = [nested, otherReply, root, reply, otherRoot];
const props = { activities, currentUser: "周岚", files: [], people: [], draftKey: "feed-test", onOpenFile: () => undefined, onPost: () => undefined };
const rows = (tree: ReactNode) => elements(tree, item => item.type === TaskDiscussionMessage);
const row = (tree: ReactNode, id: string) => rows(tree).find(item => item.props.message.id === id)!;
const composer = (tree: ReactNode) => elements(tree, item => item.type === DiscussionComposer)[0];
const rowIds = (tree: ReactNode) => rows(tree).map(item => item.props.message.id);
const draft: DiscussionDraft = { body: "我补充确认", mentions: [], attachments: [] };

test("讨论绝对时间跟随语言，跨年及完整提示保留年份", () => {
  const now = new Date(2026, 9, 13, 20).getTime();
  for (const locale of ["zh-CN", "en"]) {
    assert.deepEqual(relativeTaskTime(new Date(2026, 8, 14, 17, 30).toISOString(), locale, now), {
      label: locale === "en" ? "Sep 14, 5:30 PM" : "9月14日 17:30", full: locale === "en" ? "Sep 14, 2026, 5:30 PM" : "2026年9月14日 17:30",
    });
    assert.deepEqual(relativeTaskTime(new Date(2025, 8, 14, 0, 5).toISOString(), locale, now), {
      label: locale === "en" ? "Sep 14, 2025, 12:05 AM" : "2025年9月14日 00:05", full: locale === "en" ? "Sep 14, 2025, 12:05 AM" : "2025年9月14日 00:05",
    });
    assert.equal(relativeTaskTime(new Date(2026, 8, 14, 12).toISOString(), locale, now)?.label, locale === "en" ? "Sep 14, 12:00 PM" : "9月14日 12:00");
    assert.deepEqual(relativeTaskTime(new Date(2027, 0, 1, 9).toISOString(), locale, now), {
      label: locale === "en" ? "Jan 1, 2027, 9:00 AM" : "2027年1月1日 09:00", full: locale === "en" ? "Jan 1, 2027, 9:00 AM" : "2027年1月1日 09:00",
    });
  }
});

test("近期相对时间和昨天时刻跟随界面语言，未知时间仍不补造", () => {
  const now = new Date(2026, 9, 13, 20).getTime();
  const recent = new Date(now - 300_000).toISOString();
  const yesterday = new Date(2026, 9, 12, 17, 30).toISOString();
  assert.equal(relativeTaskTime(recent, "zh-CN", now)?.label, "5分钟前");
  assert.equal(relativeTaskTime(recent, "en", now)?.label, "5 minutes ago");
  assert.equal(relativeTaskTime(yesterday, "zh-CN", now)?.label, "昨天 17:30");
  assert.equal(relativeTaskTime(yesterday, "en", now)?.label, "Yesterday 5:30 PM");
  assert.equal(relativeTaskTime("invalid", "zh-CN", now), null);
});

test("讨论右上角复用 AI 快捷入口，主消息与回复传递各自 ID 和工具选择", async () => {
  for (const message of [root, reply]) {
    const calls: unknown[][] = [];
    const { tree } = capture(() => TaskDiscussionMessage({
      message, currentUser: "周岚", files: [], now: Date.now(), onReply: () => undefined,
      onLocate: () => undefined, onOpenFile: () => undefined,
      onConnectAi: (...args) => { calls.push(args); },
    }));
    const header = elements(tree, item => item.type === "header")[0];
    const ai = elements(header.props.children, item => item.type === AiConnectionButton)[0];
    assert.ok(ai, "AI 快捷入口直接位于消息右上角");
    assert.equal(ai.props.compact, true);
    assert.equal(elements(tree, item => item.props.className === "task-discussion-feed-menu").length, 0, "AI 不再藏在更多菜单里");
    const trigger = {} as HTMLElement;
    const shortcut = { agent: "chatgpt", signal: new AbortController().signal };
    await ai.props.onConnect(trigger, shortcut);
    assert.deepEqual(calls, [[{ kind: message.replyToActivityId ? "reply" : "discussion", activityId: message.id }, trigger, shortcut]]);
  }
});

test("本人删除入口直接在回复左侧，他人消息和无删除权限不显示", () => {
  for (const author of ["member-id", "周岚", "陈默"]) {
    for (const canDelete of [false, true]) {
      const message = { ...reply, author };
      const deleted: CollaborationMessage[] = [];
      const { tree } = capture(() => TaskDiscussionMessage({
        message, currentUser: "member-id", currentUserName: "周岚", files: [], now: Date.now(),
        onReply: () => undefined, onLocate: () => undefined, onOpenFile: () => undefined,
        onDelete: canDelete ? item => { deleted.push(item); } : undefined,
      }));
      const actions = elements(tree, item => item.props.className === "task-discussion-feed-actions")[0];
      const buttons = elements(actions.props.children, item => item.type === "button");
      const expectedDelete = canDelete && author !== "陈默";
      assert.deepEqual(buttons.map(button => button.props.children), expectedDelete ? ["删除", "回复"] : ["回复"]);
      assert.equal(elements(tree, item => item.props.variant === "destructive").length, 0, "删除不藏在更多菜单里");
      if (expectedDelete) { buttons[0].props.onClick(); assert.deepEqual(deleted, [message]); }
    }
  }
});

test("保持挂载的任务讨论新增消息立即显示刚刚，并保留完整时间", context => {
  const mountedAt = Date.parse("2026-10-12T09:39:00.000Z");
  let clock = mountedAt;
  context.mock.method(Date, "now", () => clock);
  const earlier = { ...root, createdAt: new Date(mountedAt - 300_000).toISOString() };
  const fresh = { ...otherRoot, id: "fresh-post", createdAt: new Date(mountedAt + 10_000).toISOString() };
  let records = [earlier], advanced = false;
  const { tree, html } = capture(() => TaskDiscussion({ ...props, activities: records }), node => {
    if (advanced) return;
    advanced = true;
    clock += 10_000;
    records = [fresh, earlier];
    row(node, earlier.id).props.onReply(earlier);
  });
  assert.equal(composer(tree).props.draftKey, `feed-test:reply:${earlier.id}`, "已有交互状态证明组件保持挂载");
  const freshMarkup = html.match(/id="task-activity-fresh-post"[\s\S]*?<\/li>/)?.[0];
  assert.ok(freshMarkup);
  assert.match(freshMarkup, />刚刚<\/time>/);
  assert.ok(freshMarkup.includes(`dateTime="${fresh.createdAt}"`));
  const full = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(fresh.createdAt));
  assert.ok(freshMarkup.includes(`title="${full}"`));
  assert.ok(freshMarkup.includes(`aria-label="${full}"`));
});

test("保持挂载的文件讨论新增回复立即显示刚刚，并保留完整时间", context => {
  const mountedAt = Date.parse("2026-10-12T09:39:00.000Z");
  let clock = mountedAt;
  context.mock.method(Date, "now", () => clock);
  const earlier = { ...root, fileThreadId: "file-thread", createdAt: new Date(mountedAt - 600_000).toISOString() };
  const existingReply = { ...reply, fileThreadId: earlier.fileThreadId, createdAt: new Date(mountedAt - 300_000).toISOString() };
  const fresh = { ...nested, id: "fresh-file-reply", fileThreadId: earlier.fileThreadId, createdAt: new Date(mountedAt + 10_000).toISOString() };
  let records = [earlier, existingReply], advanced = false;
  const { tree, html } = capture(() => DiscussionMessages({ ...props, messages: records, allMessages: records }), node => {
    if (advanced) return;
    advanced = true;
    clock += 10_000;
    records = [earlier, existingReply, fresh];
    elements(node, item => item.props.className === "discussion-expand")[0].props.onClick({ currentTarget: { focus() {} } });
  });
  assert.equal(elements(tree, item => item.props.className === "discussion-collapse").length, 1, "回复列表保持展开而未重新挂载");
  const freshMarkup = html.match(/id="task-activity-fresh-file-reply"[\s\S]*?<\/li>/)?.[0];
  assert.ok(freshMarkup);
  assert.match(freshMarkup, />刚刚<\/time>/);
  assert.ok(freshMarkup.includes(`dateTime="${fresh.createdAt}"`));
  const full = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(fresh.createdAt));
  assert.ok(freshMarkup.includes(`title="${full}"`));
  assert.ok(freshMarkup.includes(`aria-label="${full}"`));
});

test("主消息和多层回复按最新优先平铺，不提供同串入口或回复数量", () => {
  const { tree, html } = capture(() => TaskDiscussion(props));
  assert.deepEqual(rowIds(tree), [otherReply.id, nested.id, reply.id, otherRoot.id, root.id]);
  assert.equal(elements(tree, item => item.type === "ol")[0].props.children.length, activities.length);
  assert.equal(row(tree, reply.id).props.parent.id, root.id);
  assert.equal(row(tree, nested.id).props.parent.id, reply.id);
  for (const item of rows(tree)) {
    assert.equal(item.props.replyCount, undefined);
    assert.equal(item.props.onViewThread, undefined);
  }
  assert.equal((html.match(/class="task-discussion-feed-message"/g) ?? []).length, activities.length);
  assert.doesNotMatch(html, /discussion-collapse|discussion-expand|task-discussion-thread-bar|查看\s*\d+\s*条回复|回复列表|全部讨论/);
  assert.equal(elements(tree, item => item.type === "ol")[0].props.hidden, undefined);
  assert.equal(elements(tree, item => item.type === DiscussionComposer).length, 1);
});

test("回复框跟随所点消息展示并隐藏底部输入，发布仍带该消息 ID", async () => {
  const posts: unknown[][] = [], ai: unknown[][] = [];
  let started = false;
  const { tree, html } = capture(() => TaskDiscussion({ ...props, onPost: (...args) => { posts.push(args); }, onConnectAi: (...args) => { ai.push(args); } }), tree => {
    if (started) return;
    started = true;
    row(tree, nested.id).props.onReply(nested);
  });
  const input = composer(tree);
  assert.equal(input.props.draftKey, `feed-test:reply:${nested.id}`);
  assert.equal(input.props.autoFocus, true);
  assert.equal(input.props.allowQuote, false);
  assert.equal(elements(tree, item => item.type === DiscussionComposer).length, 1);
  assert.equal(elements(row(tree, nested.id).props.children, item => item === input).length, 1, "回复输入框位于所点消息内");
  for (const item of rows(tree).filter(item => item.props.message.id !== nested.id)) {
    assert.equal(elements(item.props.children, element => element.type === DiscussionComposer).length, 0, "其他消息不展开输入框");
  }
  const inlineReply = elements(tree, item => item.props["data-reply-to"] === nested.id)[0];
  assert.ok(inlineReply?.props.className.split(" ").includes("task-discussion-inline-reply"));
  assert.equal(elements(inlineReply.props.children, item => item === input).length, 1);
  assert.equal(elements(tree, item => item.props.className === "task-discussion-compose").length, 0, "回复时隐藏普通发言输入框和底部占位");
  assert.doesNotMatch(html, /task-discussion-reply-context/);
  assert.equal(typeof input.props.onCancel, "function", "沿用输入框内取消入口");
  assert.match(html, /nested 的内容/);
  assert.equal(input.props.onConnectAi, undefined);
  assert.doesNotMatch(html, /连接 AI：当前回复草稿|discussion-composer-ai-trigger/);
  assert.deepEqual(ai, []);
  assert.deepEqual(posts, []);
  await input.props.onSubmit(draft);
  assert.deepEqual(posts, [[draft, nested.id]]);
});

test("消息内回复框排在原消息操作之后，保持原消息内容和回复入口", () => {
  const replyInput = createElement("div", { "data-reply-editor": true }, "回复草稿");
  const { tree } = capture(() => TaskDiscussionMessage({
    message: root, currentUser: props.currentUser, files: [], now: Date.now(),
    onReply: () => undefined, onLocate: () => undefined, onOpenFile: () => undefined,
    children: replyInput,
  }));
  const record = elements(tree, item => item.props.className === "task-discussion-record")[0];
  const children = Children.toArray(record.props.children);
  const footerIndex = children.findIndex(child => isValidElement<Record<string, any>>(child) && child.props.className === "task-discussion-feed-footer");
  const replyIndex = children.findIndex(child => isValidElement<Record<string, any>>(child) && child.props["data-reply-editor"]);
  assert.ok(footerIndex >= 0, "保留原消息操作区");
  assert.ok(replyIndex > footerIndex, "就地回复显示在该消息操作区之后");
});

test("切换回复对象使用各自草稿键，返回原对象继续使用原草稿作用域", () => {
  const keys: string[] = [];
  let step = 0;
  const { tree } = capture(() => TaskDiscussion(props), node => {
    keys.push(composer(node).props.draftKey);
    if (step === 0) { step++; row(node, root.id).props.onReply(root); }
    else if (step === 1) { step++; row(node, nested.id).props.onReply(nested); }
    else if (step === 2) { step++; row(node, root.id).props.onReply(root); }
  });
  assert.deepEqual(keys, ["feed-test:new", `feed-test:reply:${root.id}`, `feed-test:reply:${nested.id}`, `feed-test:reply:${root.id}`]);
  assert.equal(elements(tree, item => item.type === DiscussionComposer).length, 1);
  assert.equal(elements(row(tree, root.id).props.children, item => item.type === DiscussionComposer).length, 1);
  assert.equal(elements(row(tree, nested.id).props.children, item => item.type === DiscussionComposer).length, 0);
});

test("回复目标删除或消失后保留原草稿键，禁发并以非底部输入提示不可用", async () => {
  for (const unavailable of ["deleted", "missing"] as const) {
    let records = activities;
    let started = false;
    const posts: unknown[][] = [];
    const { tree, html } = capture(() => TaskDiscussion({ ...props, activities: records, onPost: (...args) => { posts.push(args); } }), node => {
      if (started) return;
      started = true;
      records = unavailable === "deleted"
        ? activities.map(item => item.id === reply.id ? { ...item, deletedAt: "2026-10-15T05:00:00Z" } : item)
        : activities.filter(item => item.id !== reply.id);
      row(node, reply.id).props.onReply(reply);
    });
    const input = composer(tree);
    assert.equal(input.props.draftKey, `feed-test:reply:${reply.id}`, `${unavailable} 时不能切换到普通发言草稿`);
    assert.equal(input.props.disabled, true);
    assert.equal(elements(tree, item => item.type === DiscussionComposer).length, 1);
    assert.equal(elements(tree, item => item.props.className === "task-discussion-compose").length, 0);
    assert.equal(rows(tree).flatMap(item => elements(item.props.children, element => element.type === DiscussionComposer)).length, 0, "失效目标的草稿不附到其他消息上");
    const fallback = elements(tree, item => item.props["data-reply-to"] === reply.id)[0];
    assert.ok(fallback?.props.className.split(" ").includes("task-discussion-inline-reply"), "保留可取消的非固定回复区");
    assert.equal(elements(fallback.props.children, item => item === input).length, 1);
    assert.match(html, /回复原文不可用/);
    await assert.rejects(input.props.onSubmit(draft), /回复原文不可用/);
    assert.deepEqual(posts, [], "原回复不可用时不应发布成普通消息");
  }
});

test("取消具体回复恢复普通发言草稿键并清除回复上下文", async () => {
  for (const availability of ["available", "deleted", "missing"] as const) {
    const posts: unknown[][] = [];
    let records = activities;
    let step = 0;
    const { tree, html } = capture(() => TaskDiscussion({ ...props, activities: records, onPost: (...args) => { posts.push(args); } }), tree => {
      if (step === 0) {
        step++;
        if (availability === "deleted") records = activities.map(item => item.id === reply.id ? { ...item, deletedAt: "2026-10-15T05:00:00Z" } : item);
        if (availability === "missing") records = activities.filter(item => item.id !== reply.id);
        row(tree, reply.id).props.onReply(reply);
      } else if (step === 1) {
        step++;
        assert.equal(composer(tree).props.draftKey, `feed-test:reply:${reply.id}`);
        assert.equal(composer(tree).props.disabled, availability !== "available");
        composer(tree).props.onCancel();
      }
    });
    assert.equal(composer(tree).props.draftKey, "feed-test:new");
    assert.equal(elements(tree, item => item.props.className === "task-discussion-compose").length, 1, "取消后恢复普通发言输入框");
    assert.doesNotMatch(html, /task-discussion-reply-context/);
    await composer(tree).props.onSubmit(draft);
    assert.deepEqual(posts, [[draft, undefined]]);
  }
});

test("定位同名作者的指定消息不添加高亮，仍保留全部平铺消息", () => {
  let located = false;
  const { tree } = capture(() => TaskDiscussion(props), tree => {
    if (located) return;
    located = true;
    row(tree, nested.id).props.onLocate(otherReply.id);
  });
  assert.deepEqual(rowIds(tree), [otherReply.id, nested.id, reply.id, otherRoot.id, root.id]);
  assert.deepEqual(rows(tree).filter(item => item.props.highlighted).map(item => item.props.message.id), []);
  assert.equal(row(tree, otherReply.id).props.parent.id, otherRoot.id);
});

test("本人主消息和回复不提供编辑或空更多菜单，回复继续发布独立消息", async () => {
  const file: TaskFileNode = { id: "file-a", kind: "file", name: "已更新名.md", parentId: null, version: 4, updatedAt: "今天" };
  const withAttachment = { ...reply, mentionedPrincipalIds: ["林洁"], attachmentRefs: [{ fileId: file.id, name: "原附件名.md", version: 2 }] };
  const ownRoot = { ...root, author: props.currentUser };
  const posts: unknown[][] = [];
  let started = false;
  const renderProps = { ...props, activities: [ownRoot, withAttachment], files: [file], onEdit: () => { assert.fail("任务讨论不能进入消息编辑"); }, onDelete: () => undefined, onPost: (...args: unknown[]) => { posts.push(args); } };
  for (const locale of ["zh-CN", "en"] as const) {
    const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: locale, children: createElement(TaskDiscussion, renderProps) }));
    assert.doesNotMatch(html, /task-discussion-feed-more|task-discussion-feed-menu|更多讨论操作|More message actions/);
    assert.equal((html.match(/class="task-discussion-feed-delete"/g) ?? []).length, 2);
    assert.equal((html.match(/class="task-discussion-feed-reply"/g) ?? []).length, 2);
  }
  const { tree } = capture(() => TaskDiscussion(renderProps), tree => {
    for (const item of rows(tree)) assert.equal(item.props.onEditStart, undefined);
    if (started) return;
    started = true;
    row(tree, reply.id).props.onReply(withAttachment);
  });
  const input = composer(tree);
  assert.equal(input.props.draftKey, `feed-test:reply:${reply.id}`);
  assert.equal(input.props.initialValue, undefined, "回复不能把原消息正文及附件变成编辑草稿");
  await input.props.onSubmit(draft);
  assert.deepEqual(posts, [[draft, reply.id]]);
});

test("发布失败保留回复目标和草稿作用域，不回退到普通发言", async () => {
  let started = false;
  const attempts: string[] = [];
  const { tree, html } = capture(() => TaskDiscussion({ ...props, onPost: (_draft, id) => { attempts.push(id!); throw new Error("保存失败"); } }), tree => {
    if (started) return;
    started = true;
    row(tree, reply.id).props.onReply(reply);
  });
  await assert.rejects(composer(tree).props.onSubmit(draft), /保存失败/);
  assert.deepEqual(attempts, [reply.id]);
  assert.equal(composer(tree).props.draftKey, `feed-test:reply:${reply.id}`);
  assert.doesNotMatch(html, /task-discussion-reply-context/);
  assert.equal(typeof composer(tree).props.onCancel, "function", "失败后仍可取消并保留回复草稿");
  assert.equal(composer(tree).props.disabled, false);
});

test("引用悬停预览不展示定位文案，点击图标直接定位并保留附件版本", () => {
  const locations: string[] = [], opens: unknown[][] = [];
  const file: TaskFileNode = { id: "file-a", kind: "file", name: "已改名.pdf", parentId: null, version: 3, updatedAt: "今天" };
  const attached = { ...nested, attachmentRefs: [{ fileId: file.id, name: "发布时.pdf", version: 1 }] };
  const renderMessage = () => TaskDiscussionMessage({ message: attached, parent: reply, files: [file], currentUser: "周岚", now: Date.parse("2026-09-14T06:00:00Z"), onReply: () => undefined, onLocate: id => { locations.push(id); }, onOpenFile: (...args) => { opens.push(args); } });
  const { tree, html } = capture(renderMessage);
  const reference = elements(tree, item => item.props.className === "task-discussion-feed-reference")[0];
  const preview = elements(tree, item => item.props.className === "task-discussion-reference-popover")[0];
  const recipient = elements(tree, item => item.props.className === "task-discussion-feed-recipient")[0];
  assert.equal(elements(recipient, item => item === reference).length, 1, "引用入口位于回复双方姓名处");
  assert.equal(reference.props.openOnHover, true);
  assert.equal(reference.props["aria-label"], "定位原消息");
  assert.doesNotMatch(html, /reply 的内容/, "闭合消息行不常驻引用正文");
  const previewHtml = capture(() => preview.props.children).html;
  assert.match(previewHtml, /reply 的内容/);
  assert.doesNotMatch(previewHtml, /定位原消息/);
  assert.equal(elements(preview.props.children, item => item.type === "button").length, 0);
  for (const pointerType of ["touch", "mouse"]) {
    reference.props.onPointerDown?.({ pointerType });
    reference.props.onClick();
    assert.equal(locations.at(-1), reply.id, `${pointerType} 点击图标直接定位原消息`);
  }
  reference.props.onKeyDown?.({ key: "Enter" });
  reference.props.onClick();
  assert.deepEqual(locations, [reply.id, reply.id, reply.id], "键盘激活同样直接定位原消息");
  let focused = false;
  const focusPreview = capture(renderMessage, node => {
    if (focused) return;
    focused = true;
    elements(node, item => item.props.className === "task-discussion-feed-reference")[0].props.onFocus({ currentTarget: { matches: (selector: string) => selector === ":focus-visible" } });
  });
  assert.equal(elements(focusPreview.tree, item => typeof item.props.open === "boolean" && item.props.onOpenChange)[0].props.open, true, "键盘聚焦可打开预览");
  elements(tree, item => item.props.className === "task-discussion-feed-file")[0].props.onClick();
  assert.deepEqual(opens, [[file.id, 1]]);
  assert.match(html, /发布时.pdf/);
  assert.match(html, /v1/);
  assert.doesNotMatch(html, /已改名.pdf/);
});

test("删除或缺失原消息仍可预览不可用提示，不暴露旧正文、附件或提供定位", () => {
  const deletedParent = { ...reply, deletedAt: "2026-09-14T05:00:00Z", message: "已经删除的敏感正文", attachmentRefs: [{ fileId: "secret", name: "敏感附件.pdf", version: 1 }] };
  for (const parent of [deletedParent, undefined]) {
    const { tree, html } = capture(() => TaskDiscussionMessage({ message: nested, parent, files: [], currentUser: "周岚", now: Date.parse("2026-09-14T06:00:00Z"), onReply: () => undefined, onLocate: () => { assert.fail("不能定位已删或缺失消息"); }, onOpenFile: () => undefined }));
    const reference = elements(tree, item => item.props.className === "task-discussion-feed-reference")[0];
    const preview = elements(tree, item => item.props.className === "task-discussion-reference-popover")[0];
    assert.notEqual(reference.props.disabled, true, "不可用消息的图标仍能打开提示预览");
    assert.equal(reference.props.openOnHover, true);
    reference.props.onPointerDown?.({ pointerType: "mouse" });
    reference.props.onClick();
    assert.equal(elements(preview.props.children, item => item.props.className === "task-discussion-reference-locate").length, 0);
    const previewHtml = capture(() => preview.props.children).html;
    assert.match(previewHtml, parent ? /原消息已删除/ : /原消息暂不可用/);
    assert.doesNotMatch(html + previewHtml, /已经删除的敏感正文|敏感附件.pdf/);
  }
});
