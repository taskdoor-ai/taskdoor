import assert from 'node:assert/strict';
import { register } from 'node:module';
import test from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith('.svg')) return { format: 'module', source: 'export default ' + JSON.stringify(url), shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
const { AiConnectionContextPreview, buildContextPrompt, buildContextPayload, launchAiContext } = await import('../src/features/ai-connection/components/AiConnectionDialog.tsx');
const { I18nProvider } = await import('../src/shared/i18n/I18nProvider.tsx');
const { createAiToolPreferenceStore } = await import('../src/features/ai-connection/lib/ai-tool-preferences.ts');

const request = {
  taskId: 'task-123', title: '连接 AI', description: '',
  workObject: { kind: '回复', title: 'B的回复', content: '  按第二种方案执行。\n保留  原文。  ' },
  context: [
    { label: '任务名称', value: '方案评审' },
    { label: '任务 ID', value: 'task-123' },
    { label: '任务目标', value: '核对方案\n确认边界' },
    { label: '讨论 ID', value: 'reply-b' },
    { label: '用户', value: 'B' },
    { label: '被回复原消息 ID', value: 'message-a' },
    { label: '被回复原消息用户', value: 'A' },
    { label: '被回复原消息内容', value: '方案一：本地处理。\n方案二：集中处理。' },
  ],
};

test('上下文预览显示实际带入的任务目标及消息定位信息', () => {
  const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: 'zh-CN', children: createElement(AiConnectionContextPreview, { request }) }));
  for (const text of ['reply-b', 'message-a', '按第二种方案执行。', '方案一：本地处理。', '方案二：集中处理。']) assert.ok(html.includes(text), text);
  assert.match(html, /task-123/);
  assert.doesNotMatch(html, /当前动态及|条回复|未发送的回复草稿|目标未提供|完成标准|参与人|标签|未提供/);
  const goal = '核对方案\n确认边界';
  const taskRequest = { ...request, workObject: { kind: '任务', title: '方案评审' }, context: [{ label: '任务 ID', value: 'task-123' }, { label: '任务目标', value: goal }] };
  const taskHtml = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: 'zh-CN', children: createElement(AiConnectionContextPreview, { request: taskRequest }) }));
  assert.ok(taskHtml.includes(goal));
  assert.doesNotMatch(taskHtml, /完成标准|目标未提供|未提供/);
});

test('讨论带入文案分组展示，保留用户原文的自然换行和空白', () => {
  const prompt = buildContextPrompt({ ...request, context: [...request.context, { label: '发布时间', value: '2026-09-01T10:06:00+08:00' }, { label: '被回复原消息发布时间', value: '2026-09-01T10:00:00+08:00' }] });
  assert.match(prompt, /^## 「方案评审」任务讨论上下文信息\n\n——————————\n\n/);
  for (const heading of ['任务信息', '当前消息', '被回复消息']) assert.ok(prompt.includes(`\n${heading}\n`));
  assert.match(prompt, /用户：B  发布时间：2026-09-01T10:06:00\+08:00/);
  assert.match(prompt, /用户：A  发布时间：2026-09-01T10:00:00\+08:00/);
  assert.ok(prompt.includes(`正文： ${request.workObject.content}`));
  assert.match(prompt, /任务目标：核对方案\n确认边界/);
  assert.ok(prompt.includes(request.workObject.content));
  assert.ok(prompt.includes(request.context.at(-1)!.value));
  assert.doesNotMatch(prompt, /Task Package|待分析材料 \/ JSON|TaskDoor ·|任务名称：|内容摘录|以下为 TaskDoor|&#x20;|\\n/);
});

test('原消息不可用时预览保留缺口提示，英文界面使用对应系统文案', () => {
  const unavailable = { ...request, context: request.context.filter(item => !['被回复原消息用户', '被回复原消息内容'].includes(item.label)).concat({ label: '来源缺口', value: '被回复原消息不可用' }) };
  const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: 'en', children: createElement(AiConnectionContextPreview, { request: unavailable }) }));
  assert.match(html, /message-a/);
  assert.match(html, /Original message unavailable/);
  assert.doesNotMatch(html, /方案一：本地处理/);
});

test('回复关系缺少原消息 ID 时仍显示不可用说明', () => {
  const missingParent = { ...request, context: request.context.filter(item => !item.label.startsWith('被回复原消息')).concat({ label: '来源缺口', value: '被回复原消息不可用' }) };
  const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: 'zh-CN', children: createElement(AiConnectionContextPreview, { request: missingParent }) }));
  assert.match(html, /被回复原消息不可用/);
  assert.doesNotMatch(html, /message-a|方案一：本地处理/);
});

test('中英文带入只切换系统文案，任务、讨论和回复都保留原始材料', () => {
  const saved = { ...request, context: [...request.context, { label: '发布时间', value: '2026-09-01T10:06:00+08:00' }, { label: '被回复原消息发布时间', value: '2026-09-01T10:00:00+08:00' }] };
  const task = { ...saved, workObject: { kind: '任务', title: '方案评审' }, context: [
    { label: '任务 ID', value: 'task-123' }, { label: '任务目标', value: '当前消息\n被回复原消息不可用' },
    { label: '负责人', value: '梁川' }, { label: '状态', value: '进行中' }, { label: '截止时间', value: '2026-09-30' },
  ] };
  const discussion = { ...saved, workObject: { ...saved.workObject, kind: '讨论' }, context: saved.context.filter(item => !item.label.startsWith('被回复原消息')) };
  const before = JSON.stringify([task, discussion, saved]);
  for (const current of [task, discussion, saved]) {
    const chinese = buildContextPrompt(current, 'zh-CN');
    const english = buildContextPrompt(current, 'en');
    assert.match(chinese, current.workObject.kind === '任务' ? /^## 「方案评审」任务上下文信息/ : /^## 「方案评审」任务讨论上下文信息/);
    assert.match(english, current.workObject.kind === '任务' ? /^## Task context for “方案评审”/ : /^## Task discussion context for “方案评审”/);
    assert.match(english, /Task information\n\nTask ID: task-123/);
    assert.match(english, /Use the TaskDoor CLI for details\.$/);
    assert.doesNotMatch(english, /任务信息|任务 ID：|任务目标：|作者：|这是我当前/);
    if (current.workObject.kind === '任务') {
      assert.match(english, /Goal: 当前消息\n被回复原消息不可用/);
      assert.match(english, /Owner: 梁川/);
      assert.match(english, /Status: 进行中/);
      assert.match(english, /Due date: 2026-09-30/);
      assert.doesNotMatch(english, /Current message\n|Message ID:/);
      assert.match(english, /This is the task I’m currently working on/);
    } else {
      assert.match(english, /Current message\n\nMessage ID: reply-b/);
      assert.match(english, /User: B  Published at: 2026-09-01T10:06:00\+08:00/);
      assert.ok(english.includes(`Body: ${current.workObject.content}`));
      assert.match(english, /Goal: 核对方案\n确认边界/);
      assert.match(english, /This is the task discussion I’m currently working on/);
      assert.equal(english.includes('\nReplied-to message\n'), current.workObject.kind === '回复');
    }
  }
  assert.equal(JSON.stringify([task, discussion, saved]), before);
});

test('英文来源说明使用系统译文，预览保留负责人、目标及消息原文', () => {
  const unavailable = { ...request, context: request.context.filter(item => !['被回复原消息用户', '被回复原消息内容'].includes(item.label)).concat(
    { label: '来源缺口', value: '被回复原消息不可用' }, { label: '负责人', value: '梁川' },
  ) };
  const prompt = buildContextPrompt(unavailable, 'en');
  assert.match(prompt, /Replied-to message\n\nMessage ID: message-a\n\nSource note: Original message unavailable/);
  assert.ok(prompt.includes(request.workObject.content));
  const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: 'en', children: createElement(AiConnectionContextPreview, { request: unavailable }) }));
  for (const original of ['梁川', '核对方案\n确认边界', request.workObject.content]) assert.ok(html.includes(original), original);
  assert.doesNotMatch(html, /Chuan Liang/);
});

test('实际复制和工具链接使用本次启动语言，切换语言无需修改原始请求', async () => {
  const store = createAiToolPreferenceStore();
  for (const tool of ['ChatGPT', 'Claude Code', 'Cursor', 'WorkBuddy'] as const) {
    for (const locale of ['en', 'zh-CN'] as const) {
      let copied = '', opened = '';
      const result = await launchAiContext(request, tool, new AbortController().signal, {
        copyText: async text => { copied = text; return true; }, openUrl: url => { opened = url; },
      }, store, locale);
      assert.equal(result.status, 'open-attempted');
      assert.equal(copied, buildContextPrompt(request, locale));
      assert.match(copied, locale === 'en' ? /^## Task discussion context for/ : /^## 「方案评审」任务讨论上下文信息/);
      if (tool === 'ChatGPT' || tool === 'Claude Code') assert.equal(new URL(opened).searchParams.get(tool === 'ChatGPT' ? 'prompt' : 'q'), copied);
    }
  }
});

test('无任务 ID 的带入外框支持英文，JSON 材料保留原始载荷', () => {
  const unscoped = { ...request, taskId: undefined };
  const english = buildContextPrompt(unscoped, 'en');
  assert.match(english, /## Working boundaries/);
  assert.match(english, /## Included context \(source material \/ JSON\)/);
  assert.match(english, /## Usage boundaries/);
  assert.ok(english.includes(JSON.stringify(buildContextPayload(unscoped), null, 2)));
});

test('消息附件在中英文提示词与预览中按所属消息展示，名称保持原文', () => {
  const withAttachments = { ...request, messageAttachments: {
    current: [{ id: 'file-1', name: '当前附件.pdf' }, { name: '旧附件.xlsx' }],
    parent: [{ id: 'file-2', name: '  原消息附件.md  ' }],
  } };
  for (const locale of ['zh-CN', 'en'] as const) {
    const prompt = buildContextPrompt(withAttachments, locale);
    const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: locale, children: createElement(AiConnectionContextPreview, { request: withAttachments }) }));
    for (const original of ['file-1', 'file-2', '当前附件.pdf', '旧附件.xlsx', '  原消息附件.md  ']) {
      assert.ok(prompt.includes(original), original); assert.ok(html.includes(original), original);
    }
    const parentStart = prompt.indexOf(locale === 'en' ? '\nReplied-to message\n' : '\n被回复消息\n');
    assert.ok(prompt.indexOf('file-1') < parentStart);
    assert.ok(prompt.indexOf('file-2') > parentStart);
    assert.match(prompt, locale === 'en' ? /Attachment ID: Not provided/ : /附件 ID：未提供/);
    assert.doesNotMatch(prompt, /(?:^|\n)(?:附件|Attachments)(?:\n|$)/);
    assert.doesNotMatch(html, />\s*(?:附件|Attachments)\s*</);
    assert.match(prompt, locale === 'en' ? /Attachment name: 当前附件.pdf/ : /附件名称：当前附件.pdf/);
    const attachmentLine = locale === 'en' ? 'Attachment ID: file-1, Attachment name: 当前附件.pdf' : '附件 ID：file-1，附件名称：当前附件.pdf';
    assert.ok(prompt.includes(attachmentLine));
    assert.ok(html.includes(attachmentLine));
    assert.doesNotMatch(prompt + html, /作者：|Author:/);
  }
  assert.deepEqual(buildContextPayload(withAttachments).messageAttachments, withAttachments.messageAttachments);
});
