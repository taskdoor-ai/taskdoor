import assert from 'node:assert/strict';
import { register } from 'node:module';
import test from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CollaborationMessage } from '../src/features/tasks/lib/task-collaboration';
import type { Locale } from '../src/shared/i18n/core';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith('.svg')) return { format: 'module', source: 'export default ' + JSON.stringify(url), shortCircuit: true };
    if (url.endsWith('.css')) return { format: 'module', source: 'export default {}', shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
const { TaskDiscussionMessage } = await import('../src/features/tasks/discussion/components/TaskDiscussionMessage');
const { I18nProvider } = await import('../src/shared/i18n/I18nProvider');

function renderMessage(body: string, locale: Locale, reply = false) {
  const message: CollaborationMessage = { id: 'manual-translation', author: '陈默', type: 'member-post', message: body, time: '时间未知' };
  if (reply) { message.type = 'member-reply'; message.replyToActivityId = 'parent'; }
  const common = { currentUser: '其他人', files: [], onOpenFile: () => undefined };
  const row = createElement(TaskDiscussionMessage, { ...common, message, now: Date.now(), onReply: () => undefined, onLocate: () => undefined });
  return renderToStaticMarkup(createElement(I18nProvider, { initialLocale: locale, children: row }));
}

test('自动翻译关闭时，主消息及回复都按逐条正文语言显示手动翻译', () => {
  for (const reply of [false, true]) {
    assert.match(renderMessage('请确认本次交付结果。', 'en', reply), /<button[^>]*>Translate<\/button>/);
    assert.match(renderMessage('Please confirm the deliverable.', 'zh-CN', reply), /<button[^>]*>翻译<\/button>/);
    assert.doesNotMatch(renderMessage('请确认本次交付结果。', 'zh-CN', reply), /<button[^>]*>翻译<\/button>/);
    assert.doesNotMatch(renderMessage('Please confirm the deliverable.', 'en', reply), /<button[^>]*>Translate<\/button>/);
  }
});

test('空正文和只有任务引用、数字或代码的消息没有手动翻译入口', () => {
  for (const body of ['', '12345', '[225](<#taskdoor-task=venue-confirmation>) 1', '`const result = await fetch(url)`']) {
    assert.doesNotMatch(renderMessage(body, 'zh-CN'), /<button[^>]*>翻译<\/button>/);
  }
});

test('短回复取得译文后显示查看原文，成功切换入口不受手动按钮悬停规则影响', () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => key === 'taskdoor.content-auto-translate.v1' ? 'true' : null,
    setItem: () => undefined,
  } } });
  try {
    function CaptureTranslation() {
      const row = TaskDiscussionMessage({
        message: { id: 'short-reply', author: '陈默', type: 'member-post', message: 'yes', time: '时间未知' },
        currentUser: '其他人', files: [], now: Date.now(), onReply: () => undefined, onLocate: () => undefined, onOpenFile: () => undefined,
      });
      const selected: React.ReactNode[] = [];
      function collect(tree: React.ReactNode) {
        React.Children.forEach(tree, child => {
          if (!React.isValidElement<{ className?: string; children?: React.ReactNode }>(child)) return;
          if (['task-discussion-feed-body', 'task-discussion-feed-translation'].includes(child.props.className ?? '')) selected.push(child);
          else collect(child.props.children);
        });
      }
      collect(row);
      return createElement('div', null, ...selected);
    }
    const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: 'zh-CN', children: createElement(CaptureTranslation) }));
    assert.match(html, /<p>是的<\/p>/);
    assert.match(html, /<button[^>]*>查看原文<\/button>/);
    assert.doesNotMatch(html, /暂无译文|task-discussion-translate-trigger/);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
