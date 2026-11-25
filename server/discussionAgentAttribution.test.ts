import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseTaskActivityStore } from "../src/features/tasks/lib/task-activity.ts";
import { createCollaborationSnapshot, loadCollaboration, postCollaborationMessage, saveCollaboration } from "../src/features/tasks/lib/task-collaboration.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    if (url.endsWith(".css")) return { format: "module", source: "export default {}", shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
const { TaskDiscussionMessage } = await import("../src/features/tasks/discussion/components/TaskDiscussionMessage.tsx");
const { DiscussionMessages } = await import("../src/features/tasks/discussion/components/DiscussionMessages.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");
const now = "2026-11-10T01:00:00Z";
const message = { id: "agent-post", author: "member-1", type: "member-post" as const, message: "已核对结果", time: "2026-11-10 09:00", createdAt: now };
const via = { client: "CLI" as const, agent: { name: "Claude Code", version: "2.1.0" } };
const render = (tree: React.ReactNode, initialLocale = "zh-CN") => renderToStaticMarkup(createElement(I18nProvider, { initialLocale, children: tree }));

test("来源与版本随消息保存刷新，活动解析也保留来源", () => {
  const records = new Map<string, string>();
  const storage = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
  const next = postCollaborationMessage(createCollaborationSnapshot([]), { message: { ...message, via } });
  saveCollaboration(storage, "team:task", 0, next);
  assert.deepEqual(loadCollaboration(storage, "team:task", []).messages[0].via, via);
  assert.deepEqual(parseTaskActivityStore({ task: [{ ...message, via }] }).task[0].via, via);
});

test("主讨论和文件讨论都在作者后标来源，版本不出现在页面", () => {
  const posted = { ...message, via };
  const html = [
    render(createElement(TaskDiscussionMessage, { message: posted, currentUser: "member-2", files: [], onReply() {}, onLocate() {}, onOpenFile() {}, now: Date.parse(now) })),
    render(createElement(DiscussionMessages, { messages: [posted], files: [], people: [], currentUser: "member-2", draftKey: "agent-attribution", onPost() {}, onOpenFile() {} })),
  ];
  for (const markup of html) {
    assert.match(markup, /aria-label="Claude Code · 通过 CLI"/);
    assert.match(markup, /data-agent="Claude Code"/);
    assert.doesNotMatch(markup, /2\.1\.0/);
  }
});

test("未知工具与未报工具用通用图标，普通消息不猜AI来源", () => {
  const props = { currentUser: "member-2", files: [], onReply() {}, onLocate() {}, onOpenFile() {}, now: Date.parse(now) };
  const unknown = render(createElement(TaskDiscussionMessage, { ...props, message: { ...message, via: { client: "MCP", agent: { name: "my-bot", version: null } } } }));
  assert.match(unknown, /aria-label="my-bot · 通过 MCP"/);
  assert.match(unknown, /lucide-bot/);
  const noAgent = render(createElement(TaskDiscussionMessage, { ...props, message: { ...message, via: { client: "OPEN_API" } } }), "en");
  assert.match(noAgent, /aria-label="via API"/);
  const ordinary = render(createElement(TaskDiscussionMessage, { ...props, message: { ...message, author: "TaskDoor AI" } }));
  assert.doesNotMatch(ordinary, /discussion-agent-badge/);
});
