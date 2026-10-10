import test from 'node:test';
import assert from 'node:assert/strict';
import { contentReading } from '../src/ai/mock/i18n/contentReading';
import { mockRecordText } from '../src/ai/mock/i18n/mockContent';
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
