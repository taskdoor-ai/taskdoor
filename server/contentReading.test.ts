import test from 'node:test';
import assert from 'node:assert/strict';
import { contentReading } from '../src/ai/mock/i18n/contentReading';
import { mockRecordText } from '../src/ai/mock/i18n/mockContent';
import * as mockContent from '../src/ai/mock/i18n/mockContent';
import * as discussionReading from '../src/ai/discussion-reading';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from '../src/shared/i18n/I18nProvider';
import { MockTaskProvider } from '../src/ai/mock/i18n/MockDataProvider';
import demo from '../src/ai/mock/i18n/mock/readingDemo.json';

test('reading switches without overwriting source; disabled and same-language states stay quiet', () => {
  assert.deepEqual(contentReading('原文', 'Translation', 'en', true, false), {text:'Translation', state:'translated'});
  assert.deepEqual(contentReading('原文', 'Translation', 'en', true, true), {text:'原文', state:'original'});
  assert.deepEqual(contentReading('原文', 'Translation', 'en', false, false), {text:'原文', state:'off'});
  assert.equal(contentReading('English content', 'English content', 'en', true, false).state, 'same');
  assert.equal(contentReading('中文内容', '中文内容', 'zh-CN', true, false).state, 'same');
  assert.equal(contentReading('', '', 'en', true, false).state, 'same');
});
test('unavailable translations keep the original and never masquerade as translated', () => {
  assert.deepEqual(contentReading('新的中文讨论', '新的中文讨论', 'en', true, false), {text:'新的中文讨论',state:'unavailable'});
  assert.equal(contentReading('A new discussion', 'A new discussion', 'zh-CN', true, false).state, 'unavailable');
});
test('task reference markup and digits do not request translation while prose still does', () => {
  const reference = '[225](<#taskdoor-task=venue-confirmation>) 1';
  const english = `${reference} Confirm the venue`;
  assert.deepEqual(contentReading(reference, reference, 'zh-CN', true, false), {text:reference, state:'same'});
  assert.deepEqual(contentReading(english, english, 'zh-CN', true, false), {text:english, state:'unavailable'});
});
test('language detection ignores hidden link destinations, URLs and code without hiding visible prose', () => {
  for (const source of ['[123](https://example.com/english-page)', 'https://example.com/english-page', '`const value = true`', '```js\nconst value = true;\n```', '123 👍']) {
    assert.equal(contentReading(source, source, 'zh-CN', true, false).state, 'same', source);
  }
  assert.equal(contentReading('[确认](https://example.com/english-page)', '[确认](https://example.com/english-page)', 'zh-CN', true, false).state, 'same');
  assert.equal(contentReading('[Confirm](https://example.com/中文)', '[Confirm](https://example.com/中文)', 'en', true, false).state, 'same');
  assert.equal(contentReading('Please confirm `const value = true`', 'Please confirm `const value = true`', 'zh-CN', true, false).state, 'unavailable');
});
test('discussion demo supports exact reverse translations without changing generic record display', () => {
  assert.equal(typeof mockContent.mockDiscussionText, 'function');
  for (const [source, expected] of Object.entries(demo['ccx-serum-budget-gate'])) {
    assert.equal(mockContent.mockDiscussionText('en', 'ccx-serum-budget-gate', source), expected);
    assert.equal(mockContent.mockDiscussionText('zh-CN', 'ccx-serum-budget-gate', expected), source);
    assert.equal(mockContent.mockDiscussionText('zh-CN', 'ccx-serum-budget-gate', expected + ' edited'), expected + ' edited');
    assert.equal(mockContent.mockDiscussionText('zh-CN', 'custom-task', expected), expected);
    assert.equal(mockRecordText('zh-CN', 'ccx-serum-budget-gate', expected), expected);
  }
});
test('short discussion replies translate in both directions even for new and custom tasks', () => {
  for (const taskId of ['product-launch-host-script', 'new-custom-task']) {
    for (const [source, expected] of [
      ['yes', '是的'], ['Yes', '是的'], ['YES', '是的'], ['no', '不是'],
      ['ok', '好的'], ['OK', '好的'], ['hello', '你好'], ['thanks', '谢谢'], ['thank you', '谢谢'],
      ['Yes!', '是的！'],
    ]) assert.equal(mockContent.mockDiscussionText('zh-CN', taskId, source), expected, `${taskId}: ${source}`);
    for (const [source, expected] of [
      ['好的', 'OK'], ['是的', 'Yes'], ['收到', 'Got it'], ['谢谢', 'Thank you'], ['你好', 'Hello'], ['谢谢！', 'Thank you!'],
    ]) assert.equal(mockContent.mockDiscussionText('en', taskId, source), expected, `${taskId}: ${source}`);
  }
  const additional = { 'custom-with-records': { title: { zh: '任务', en: 'Task' }, goal: { zh: '', en: '' }, records: { '是的': 'Confirmed by the task owner.' } } };
  assert.equal(mockContent.mockDiscussionText('en', 'custom-with-records', '是的', additional), 'Confirmed by the task owner.');
  assert.equal(mockContent.mockDiscussionText('zh-CN', 'new-custom-task', 'yes, but the budget still needs approval'), 'yes, but the budget still needs approval');
});
test('common two-letter replies are translatable without treating arbitrary identifiers as prose', () => {
  for (const source of ['no', 'No', 'NO', 'ok', 'OK', 'OK!']) {
    assert.equal(contentReading(source, source, 'zh-CN', true, false).state, 'unavailable', source);
    assert.equal(contentReading(source, source, 'en', true, false).state, 'same', source);
  }
  for (const source of ['ID', 'v2', '123', '`ok`', '[123](https://example.com/ok)']) {
    assert.equal(contentReading(source, source, 'zh-CN', true, false).state, 'same', source);
  }
});
test('current launch and retrospective discussion examples have exact reversible demo translations', () => {
  for (const [taskId, source, expected] of [
    ['product-launch-venue', '场地方的容量确认与当前座席表已收齐，等核对后再发最终邀请名额。', 'The venue capacity confirmation and current seating plan are ready. We will issue the final invitation allocation after reviewing them.'],
    ['weekly-retro-decisions', '决定清单和原始依据已经逐条核对，D04 的确认台账已统一。我已确认完成。', 'The decision list and source evidence have been checked item by item, and the confirmation register for D04 is consistent. I have confirmed completion.'],
    ['ccx-serum-launch', '【附件样例·引用回复】这条示例回复继续引用同一份协作说明，不新增文件副本，便于查看回复关系与附件复用。', '[Attachment example: reply reference] This example reply references the same collaboration notes without adding a file copy, so you can check the reply relationship and attachment reuse.'],
  ]) {
    assert.equal(mockContent.mockDiscussionText('en', taskId, source), expected);
    assert.equal(mockContent.mockDiscussionText('zh-CN', taskId, expected), source);
    assert.equal(mockContent.mockDiscussionText('en', 'unrelated-custom-task', source), source);
  }
});
test('manual discussion reading offers only mismatched prose and does not translate before a click', () => {
  assert.equal(typeof discussionReading.useDiscussionReading, 'function');
  (globalThis as typeof globalThis & { React: typeof React }).React = React;
  const previousWindow = globalThis.window;
  let writes = 0;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: { getItem: () => null, setItem: () => { writes++; } } } });
  try {
    for (const [source, deletedAt, canTranslate] of [
      ['请核对预算。', undefined, true],
      ['Please check the budget.', undefined, false],
      ['123 👍', undefined, false],
      ['请核对预算。', '2026-11-07T01:00:00Z', false],
    ] as const) {
      let captured: ReturnType<typeof discussionReading.useDiscussionReading> | undefined;
      function Reader() { captured = discussionReading.useDiscussionReading({ id: 'manual-test', message: source, deletedAt }); return null; }
      renderToStaticMarkup(createElement(I18nProvider, { initialLocale: 'en', children: createElement(MockTaskProvider, { taskId: 'ccx-serum-budget-gate', children: createElement(Reader) }) }));
      assert.equal(captured?.canTranslate, canTranslate, source);
      assert.equal(captured?.translating, false);
      assert.equal(captured?.text, deletedAt ? '' : source);
    }
    assert.equal(writes, 0, 'off-state renders never generate or save a translation');
  } finally {
    if (previousWindow === undefined) Reflect.deleteProperty(globalThis, 'window');
    else Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow });
  }
});
test('local demo translations match exact source and task, preserving custom edits', () => {
  for (const [source, expected] of Object.entries(demo['ccx-serum-budget-gate'])) {
    assert.equal(mockRecordText('en', 'ccx-serum-budget-gate', source), expected);
    assert.equal(mockRecordText('zh-CN', 'ccx-serum-budget-gate', source), source);
    assert.equal(mockRecordText('en', 'custom-task', source), source);
    assert.equal(mockRecordText('en', 'ccx-serum-budget-gate', source+'用户修改'), source+'用户修改');
  }
  assert.match(Object.values(demo['ccx-serum-budget-gate'])[2], /CNY 5,000/);
  assert.match(Object.values(demo['ccx-serum-budget-gate'])[2], /without waiting for the owner/);
});

test('task content stays original in every language', async () => {
  const { mockTaskField, mockTaskCatalog } = await import('../src/ai/mock/i18n/mockContent');
  const [id, copy] = Object.entries(mockTaskCatalog)[0];
  assert.equal(mockTaskField('en', id, 'title', copy.title.zh), copy.title.zh);
  assert.equal(mockTaskField('en', id, 'goal', copy.goal.zh), copy.goal.zh);
});

test('discussion translation entries are reused across reloads and isolated by source and language', async () => {
  const { createDiscussionTranslationEntries } = await import('../src/ai/mock/i18n/discussion-translation-entries');
  const saved = new Map<string, string>();
  const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value); } };
  let calls = 0;
  const lookup = () => { calls++; return 'Translation'; };
  const entries = createDiscussionTranslationEntries(storage);
  assert.equal(entries.read('task', '原文', 'en', lookup), 'Translation');
  assert.equal(entries.read('task', '原文', 'en', lookup), 'Translation');
  assert.equal(createDiscussionTranslationEntries(storage).read('task', '原文', 'en', lookup), 'Translation');
  assert.equal(calls, 1);
  entries.read('task', '修改后的原文', 'en', lookup);
  entries.read('task', '原文', 'zh-CN', lookup);
  assert.equal(calls, 3);
});
