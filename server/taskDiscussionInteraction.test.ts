import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SmartTextbox, type Segment } from "@tigerabrodioss/fude";
import { TaskDiscussion } from "../src/components/TaskDiscussion.tsx";
import { DiscussionMessages, ReplyReference } from "../src/components/discussion/DiscussionMessages.tsx";
import { DiscussionComposer } from "../src/components/discussion/DiscussionComposer.tsx";
import { MentionComposer } from "../src/components/MentionComposer.tsx";
import { getTaskDiscussionThreads } from "../src/lib/taskActivity.ts";
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

const messageProps = { messages: [root, reply], allMessages: [root, reply], currentUser: "林洁", files: [], people: [], draftKey: "test", onOpenFile: () => undefined, onPost: () => undefined };

test("任务讨论显示统一附件入口和普通回复，隐藏消息引用并隔离文件评论", () => {
  const html = renderToStaticMarkup(createElement(TaskDiscussion, { ...props, activities: [root, { ...reply, quote: { messageId: root.id, author: root.author, text: "旧引用摘录" } }, { ...root, id: "file-only", fileThreadId: "file-thread", message: "仅在文件中显示" }] }));
  assert.match(html, /contentEditable="true"/i);
  assert.match(html, /aria-label="添加附件"/);
  assert.doesNotMatch(html, /aria-label="本地上传"|aria-label="从文件列表选择"/);
  assert.match(html, /discussion-reference-icon/);
  assert.doesNotMatch(html, /引用<\/button>|discussion-inline-quote|旧引用摘录/);
  assert.equal(html.split(root.message).length - 1, 1, "已发布回复不常驻原文摘要");
  assert.doesNotMatch(html, /仅在文件中显示/);
});

test("主讨论 AI 入口只传递当前串和触发器，不提交发言", () => {
  const calls: unknown[][] = [];
  let posts = 0;
  const { tree } = capture(() => DiscussionMessages({ ...messageProps, onPost: () => { posts++; }, onConnectAi: (...args) => { calls.push(args); } }));
  const buttons = elements(tree, node => node.props.title === "连接 AI");
  assert.equal(buttons.length, 1);
  const trigger = {} as HTMLElement;
  buttons[0].props.onClick({ currentTarget: trigger });
  assert.deepEqual(calls, [[{ kind: "discussion", activityId: root.id }, trigger]]);
  assert.equal(posts, 0);
});

test("针对具体回复再回复时保留该回复 ID，草稿 AI 不发送正文", async () => {
  const posts: unknown[][] = [], calls: unknown[][] = [];
  let opened = false;
  const { tree } = capture(() => DiscussionMessages({ ...messageProps, allowQuote: false, onPost: (...args) => { posts.push(args); }, onConnectAi: (...args) => { calls.push(args); } }), node => {
    if (opened) return;
    opened = true;
    const record = elements(node, item => item.props.id === `task-activity-${reply.id}`)[0];
    elements(record.props.children, item => item.props["aria-expanded"] === false)[0].props.onClick();
  });
  const composer = elements(tree, node => node.type === DiscussionComposer)[0];
  assert.equal(composer.props.autoFocus, true);
  assert.equal(composer.props.allowQuote, false);
  const trigger = {} as HTMLElement;
  composer.props.onConnectAi("草稿", trigger);
  assert.deepEqual(calls, [[{ kind: "reply-draft", activityId: reply.id, draft: "草稿" }, trigger]]);
  assert.equal(posts.length, 0);
  await composer.props.onSubmit({ body: "收到", mentions: [], attachments: [] });
  assert.equal(posts[0][1], reply.id);
  assert.equal((posts[0][0] as { quote?: unknown }).quote, undefined);
});

test("消息附件点击使用稳定文件 ID 与发布版本，已删除评论不占位", () => {
  const opens: unknown[][] = [];
  const file = { id: "file-a", kind: "file" as const, name: "已改名.md", parentId: null, version: 3, updatedAt: "今天" };
  const { tree, html } = capture(() => DiscussionMessages({ ...messageProps, files: [file], messages: [{ ...root, attachmentRefs: [{ fileId: file.id, version: 1, name: "原名.md" }] }, { ...reply, deletedAt: "2026-09-14T01:00:00Z", message: "" }], onOpenFile: (...args) => { opens.push(args); } }));
  elements(tree, node => node.props.className === "task-record-file-link")[0].props.onClick();
  assert.deepEqual(opens, [["file-a", 1]]);
  assert.doesNotMatch(html, /这条评论已删除|task-activity-specific-reply/);
  assert.doesNotMatch(html, /我已确认范围/);
});

test("删除根评论后保留其他回复且不留下空讨论组，全部删除显示空态", () => {
  const deleted = { ...root, deletedAt: "2026-09-16T01:22:00Z" };
  const activities = [deleted, reply, { ...deleted, id: "empty-deleted-thread" }];
  const html = renderToStaticMarkup(createElement(TaskDiscussion, { ...props, activities }));
  assert.doesNotMatch(html, /这条评论已删除|task-activity-root-discussion|task-activity-empty-deleted-thread|请核对交付范围/);
  assert.match(html, /我已确认范围/);
  assert.equal((html.match(/class="task-discussion-group"/g) ?? []).length, 1);
  const empty = renderToStaticMarkup(createElement(TaskDiscussion, { ...props, activities: [deleted] }));
  assert.match(empty, /还没有讨论/);
  assert.doesNotMatch(empty, /task-discussion-group/);
});

test("删除评论不占折叠配额，回复对象不跳转已删除原文或展示旧引用", () => {
  const deleted = { ...root, deletedAt: "2026-09-16T01:22:00Z" };
  const replies = Array.from({ length: 5 }, (_, index) => ({ ...reply, id: `reply-${index}`, quote: { messageId: root.id, author: root.author, text: "已删除的敏感摘录" } }));
  const messages = [deleted, ...replies];
  const { tree, html } = capture(() => DiscussionMessages({ ...messageProps, messages, allMessages: messages }));
  assert.match(html, /展开 5 条回复/);
  assert.doesNotMatch(html, /敏感摘录|原消息暂不可用/);
  assert.match(html, /回复原文不可用/);
  assert.equal(recordIds(tree).length, 0);
  assert.equal(elements(tree, node => node.type === "button" && node.props.className === "discussion-reply-target").length, 0);
});

test("时间显示保存的日期时分且位于内容附件下方，旧相对时间不伪造日期", () => {
  const { tree, html } = capture(() => DiscussionMessages({ ...messageProps, messages: [
    { ...root, createdAt: "2026-09-14T02:03:00Z", time: "刚刚", file: "核对记录.docx", updatedAt: "2026-09-14T03:04:00Z" },
    { ...reply, time: "6 分钟前" },
  ] }));
  assert.match(html, /dateTime="2026-09-14T02:03:00\.000Z">2026-09-14 10:03<\/time>/i);
  assert.doesNotMatch(html, /原时间|刚刚|6 分钟前|2026-09-14 11:04/);
  assert.equal(elements(tree, item => item.type === "time").length, 1);
  for (const header of elements(tree, item => item.type === "header")) {
    assert.equal(elements(header.props.children, item => item.type === "time").length, 0);
  }
  assert.ok(html.indexOf("核对记录.docx") < html.indexOf("discussion-message-meta"));
  assert.ok(html.indexOf("discussion-message-meta") < html.indexOf("task-discussion-actions"));
  const legacy = renderToStaticMarkup(createElement(DiscussionMessages, { ...messageProps, messages: [{ ...root, time: "2026-09-01 10:06" }] }));
  assert.match(legacy, /dateTime="2026-09-01T02:06:00\.000Z">2026-09-01 10:06<\/time>/i);
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
  const { tree } = capture(() => DiscussionMessages(messageProps));
  const thread = elements(tree, (node) => node.props.className === "discussion-message")[0];
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

const replySeries = Array.from({ length: 5 }, (_, index) => ({ ...reply, id: `series-${index}`, message: `第 ${index + 1} 条回复`, createdAt: `2026-09-14T0${index}:00:00Z` }));
const recordIds = (tree: ReactNode): string[] => Children.toArray(tree).flatMap(child => {
  if (!isValidElement<Record<string, any>>(child) || child.props.hidden) return [];
  return [...(child.props.id?.startsWith("task-activity-") ? [child.props.id] : []), ...recordIds(child.props.children)];
});

test("回复初始收起，单一入口展开全部并保持原顺序", () => {
  const messages = [root, ...getTaskDiscussionThreads([root, ...replySeries])[0].replies];
  const initial = capture(() => DiscussionMessages({ ...messageProps, messages, allMessages: messages }));
  assert.deepEqual(recordIds(initial.tree), [`task-activity-${root.id}`]);
  assert.match(initial.html, /展开 5 条回复/);
  assert.doesNotMatch(initial.html, /收起回复|展开全部/);
  let opened = false;
  const expanded = capture(() => DiscussionMessages({ ...messageProps, messages, allMessages: messages }), tree => {
    if (!opened) { opened = true; elements(tree, item => item.props.className === "discussion-expand")[0].props.onClick({ currentTarget: { focus() {} } }); }
  });
  assert.deepEqual(recordIds(expanded.tree), messages.map(message => `task-activity-${message.id}`));
  assert.match(expanded.html, /收起回复/);
  for (const count of [0, 1, 2]) {
    const few = capture(() => DiscussionMessages({ ...messageProps, messages: [root, ...replySeries.slice(0, count)] }));
    assert.equal(recordIds(few.tree).length, 1);
    assert.equal(elements(few.tree, item => item.props.className === "discussion-expand").length, count ? 1 : 0);
  }
});

test("引用按实际消息 ID 定位被隐藏的同名作者回复，先展开再定位", () => {
  const messages = [root, ...getTaskDiscussionThreads([root, ...replySeries.slice(0, 4), { ...replySeries[4], replyToActivityId: replySeries[1].id }])[0].replies];
  let clicked = false;
  const { tree, html } = capture(() => DiscussionMessages({ ...messageProps, messages, allMessages: messages }), tree => {
    if (clicked) return;
    clicked = true;
    const record = elements(tree, item => item.props.id === "task-activity-series-4")[0];
    const reference = elements(record.props.children, item => item.type === ReplyReference)[0];
    reference.props.onLocate(reference.props.message.id);
  });
  assert.equal(recordIds(tree).length, 6);
  assert.match(html, /第 2 条回复/);
  assert.match(html, /收起回复/);
  const record = elements(tree, item => item.props.id === "task-activity-series-4")[0];
  const context = elements(record.props.children, item => item.type === ReplyReference)[0];
  assert.equal(context.props.message.id, replySeries[1].id);
});

test("原文缺失不可跳转，只有附件的原文显示附件名称", () => {
  const attachmentRoot = { ...root, message: "", attachmentRefs: [{ fileId: "attachment", name: "交付清单.pdf", version: 1 }] };
  const { tree, html } = capture(() => DiscussionMessages({ ...messageProps, messages: [attachmentRoot, reply, { ...reply, id: "orphan", replyToActivityId: "missing" }], allMessages: [attachmentRoot, reply] }));
  assert.match(html, /回复原文不可用/);
  const references = elements(tree, item => item.type === ReplyReference);
  assert.equal(references[0].props.message.attachmentRefs[0].name, "交付清单.pdf");
  assert.equal(references[1].props.message, undefined);
});

for (const mode of ["回复", "编辑"]) test(`收起回复隐藏整串但保留正在${mode}的编辑器及草稿键`, () => {
  const messages = [root, ...getTaskDiscussionThreads([root, ...replySeries])[0].replies];
  let step = 0;
  const { tree, html } = capture(() => DiscussionMessages({ ...messageProps, currentUser: reply.author, messages, allMessages: messages, onEdit: () => undefined }), tree => {
    if (step === 0) { step++; elements(tree, item => item.props.className === "discussion-expand")[0].props.onClick({ currentTarget: { focus() {} } }); }
    else if (step === 1) {
      step++;
      const record = elements(tree, item => item.props.id === "task-activity-series-0")[0];
      const actions = elements(record.props.children, item => item.props.className === "task-discussion-actions")[0];
      elements(actions.props.children, item => item.type === "button" && Children.toArray(item.props.children).includes(mode))[0].props.onClick();
    } else if (step === 2) { step++; elements(tree, item => item.props.className === "discussion-collapse")[0].props.onClick({ currentTarget: { focus() {} } }); }
  });
  assert.deepEqual(recordIds(tree), [`task-activity-${root.id}`]);
  const composer = elements(tree, item => item.type === DiscussionComposer)[0];
  assert.equal(composer.props.draftKey, `test:${mode === "回复" ? "reply" : "edit"}:series-0`);
  assert.match(html, /展开 5 条回复/);
  assert.doesNotMatch(html, /收起回复|已保留正在编辑或回复的内容/);
  if (mode === "回复") {
    assert.match(html, /discussion-composer-context/);
    assert.match(html, /aria-label="取消回复"/);
    assert.match(html, /第 1 条回复/);
  }
});

test("每个有回复的动态均可隐藏全部回复，再展开全部，主动态始终保留", () => {
  for (const count of [1, 2, 5]) {
    const messages = [root, ...replySeries.slice(0, count)];
    let step = 0;
    const result = capture(() => DiscussionMessages({ ...messageProps, messages, allMessages: messages }), tree => {
      if (step === 0) { step++; elements(tree, item => item.props.className === "discussion-expand")[0].props.onClick({ currentTarget: { focus() {} } }); }
      else if (step === 1) { step++; elements(tree, item => item.props.className === "discussion-collapse")[0].props.onClick({ currentTarget: { focus() {} } }); }
    });
    assert.deepEqual(recordIds(result.tree), [`task-activity-${root.id}`]);
    assert.match(result.html, new RegExp(`展开 ${count} 条回复`));
    assert.equal(elements(result.tree, item => item.props.className === "discussion-replies-controls")[0].props.children.props["aria-expanded"], false);
    step = 0;
    const reopened = capture(() => DiscussionMessages({ ...messageProps, messages, allMessages: messages }), tree => {
      if (step === 0 || step === 2) { step++; elements(tree, item => item.props.className === "discussion-expand")[0].props.onClick({ currentTarget: { focus() {} } }); }
      else if (step === 1) { step++; elements(tree, item => item.props.className === "discussion-collapse")[0].props.onClick({ currentTarget: { focus() {} } }); }
    });
    assert.equal(recordIds(reopened.tree).length, count + 1);
  }
});

test("引用图标保留精确定位，触屏先查看内容，缺失或删除原文不可定位", () => {
  const located: string[] = [];
  const { tree } = capture(() => ReplyReference({ message: root, onLocate: id => located.push(id) }));
  const trigger = elements(tree, item => item.props.className === "discussion-reference-icon")[0];
  trigger.props.onPointerDown({ pointerType: "touch" });
  trigger.props.onClick({ detail: 1, preventDefault() {} });
  assert.deepEqual(located, [], "触屏第一次点击不直接跳走");
  trigger.props.onPointerDown({ pointerType: "mouse" });
  trigger.props.onClick({ detail: 1, preventDefault() {} });
  assert.deepEqual(located, [root.id]);
  for (const unavailable of [undefined, { ...root, deletedAt: "2026-09-17T01:00:00Z" }]) {
    const result = capture(() => ReplyReference({ message: unavailable, onLocate: () => assert.fail("不应定位不存在的原文") }));
    const icon = elements(result.tree, item => item.props.className === "discussion-reference-icon")[0];
    assert.equal(icon.props["aria-label"], "回复原文不可用");
    icon.props.onClick({ detail: 0, preventDefault() {} });
    assert.equal(elements(result.tree, item => item.type === "button").length, 0, "不可用时弹层不显示定位入口");
  }
});


test("任务回复控制紧跟主消息时间，无时间仍可操作，删除主消息保留独立入口", () => {
  for (const recorded of [false, true]) {
    const rootMessage = { ...root, ...(recorded ? { createdAt: "2026-09-14T02:03:00Z" } : {}) };
    const { tree } = capture(() => DiscussionMessages({ ...messageProps, messages: [rootMessage, reply] }));
    const record = elements(tree, node => node.props.id === `task-activity-${root.id}`)[0];
    const meta = elements(record.props.children, node => node.props.className === "discussion-message-meta")[0];
    const children = Children.toArray(meta.props.children).filter(isValidElement) as Element[];
    assert.equal(children.at(-1)?.props.className, "discussion-replies-controls");
    if (recorded) assert.equal(children[0].type, "time");
    assert.equal(elements(tree, node => node.props.className === "discussion-replies-controls").length, 1);
  }
  const deleted = { ...root, deletedAt: "2026-09-16T01:22:00Z" };
  const { html, tree } = capture(() => DiscussionMessages({ ...messageProps, messages: [deleted, reply] }));
  assert.deepEqual(recordIds(tree), []);
  assert.match(html, /展开 1 条回复/);
});
