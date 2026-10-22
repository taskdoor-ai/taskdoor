import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    if (url.endsWith(".css")) return { format: "module", source: "export default {}", shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
const { TaskDiscussionMessage } = await import("../src/features/tasks/discussion/components/TaskDiscussionMessage.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");
const { PersonDirectoryProvider } = await import("../src/shared/ui/PersonDirectory.tsx");

function renderMessage(body: string, mentions: string[] = [], reply = false) {
  return renderToStaticMarkup(createElement(I18nProvider, {
    initialLocale: "zh-CN",
    children: createElement(PersonDirectoryProvider, {
      members: [{ id: "reviewer", name: "测试成员", role: "成员", email: "reviewer@example.com" }],
      children: createElement(TaskDiscussionMessage, {
        message: { id: "markdown-test", author: "AI 助手", type: "member-post", message: body, mentionedPrincipalIds: mentions, time: "", ...(reply ? { replyToActivityId: "parent" } : {}) },
        currentUser: "someone-else", files: [], now: Date.now(), onReply() {}, onLocate() {}, onOpenFile() {},
      }),
    }),
  }));
}

test("普通讨论和回复都将 Markdown 正文渲染为标题、列表、强调与代码", () => {
  const source = "## 本周进展\n\n**已完成**，*待确认*，~~旧方案~~\n\n- 第一项\n- 第二项\n\n> 请验收\n\n```ts\nconst ready = true;\n```";
  for (const reply of [false, true]) {
    const html = renderMessage(source, [], reply);
    assert.match(html, /<h2>本周进展<\/h2>/);
    assert.match(html, /<strong>已完成<\/strong>/);
    assert.match(html, /<em>待确认<\/em>/);
    assert.match(html, /<del>旧方案<\/del>/);
    assert.match(html, /<ul>[\s\S]*<li>第一项<\/li>/);
    assert.match(html, /<blockquote>/);
    assert.match(html, /<pre><code class="language-ts">const ready = true;/);
  }
});

test("保留普通文本换行，支持表格和只读任务列表", () => {
  const html = renderMessage("第一行\n第二行\n\n| 事项 | 状态 |\n| --- | --- |\n| 编辑器 | 完成 |\n\n- [x] 已完成\n- [ ] 待处理");
  assert.match(html, /第一行<br\/>\n?第二行/);
  assert.match(html, /<table>/);
  assert.match(html, /<th>事项<\/th>/);
  assert.match(html, /type="checkbox"[^>]*checked=""|checked=""[^>]*type="checkbox"/);
  const checkboxes = html.match(/<input\b[^>]*type="checkbox"[^>]*>/g) ?? [];
  assert.equal(checkboxes.length, 2);
  for (const checkbox of checkboxes) assert.match(checkbox, /disabled=""/);
});

test("只高亮显式 @ 成员，代码和链接中的同名文本保持原样", () => {
  const html = renderMessage("**@测试成员** 请确认；@未选择成员\n\n`@测试成员`\n\n[@测试成员](https://example.com/review)\n\n```txt\n@测试成员\n```", ["reviewer"]);
  assert.equal((html.match(/class="discussion-saved-mention"/g) ?? []).length, 1);
  assert.match(html, /<code>@测试成员<\/code>/);
  assert.match(html, /<code class="language-txt">@测试成员/);
  assert.match(html, /href="https:\/\/example.com\/review"[^>]*>@测试成员<\/a>/);
  assert.match(html, /@未选择成员/);
});

test("正文不执行 HTML 或危险链接，Markdown 图片不自动加载远程资源", () => {
  const html = renderMessage('<script>alert(1)</script>\n\n<img src="https://example.com/tracker" onerror="alert(1)">\n\n[危险](javascript:alert%281%29)\n\n![设计稿](https://example.com/design.png)\n\n[安全链接](https://example.com)');
  assert.doesNotMatch(html, /<script|<img[^>]*example\.com|href="javascript:|onerror="/);
  assert.match(html, /href="https:\/\/example.com\/design.png"[^>]*>设计稿<\/a>/);
  assert.match(html, /href="https:\/\/example.com" target="_blank" rel="noopener noreferrer"/);
});
