import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { en, zh } from '../src/i18n/messages';
import { normalizeLocale, translate, formatCalendarDate, formatInstant, formatTaskCount } from '../src/i18n/core';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { statusMessageKey } from '../src/i18n/taskStatus';

test('English is default and unsupported or corrupt preferences fall back safely', () => {
  for (const input of [null, undefined, '', 'fr', {}, 'en-US']) assert.equal(normalizeLocale(input), 'en');
  for (const input of ['zh', 'zh-CN', 'zh-TW']) assert.equal(normalizeLocale(input), 'zh-CN');
});
test('catalogs have matching keys and interpolation variables', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    assert.deepEqual(en[key].match(/\{\w+\}/g) ?? [], zh[key].match(/\{\w+\}/g) ?? [], key);
  }
});
test('interpolation preserves user content and does not recursively translate it', () => {
  assert.equal(translate('en', 'team.switchLabel', { name: '团队 {name} <script>' }), 'Switch team, currently 团队 {name} <script>');
  assert.equal(translate('zh-CN', 'team.switchLabel', { name: 'My team' }), '切换团队，当前为My team');
});
test('English pluralization handles zero, one, and many', () => {
  assert.equal(formatTaskCount('en', 0), '0 tasks');
  assert.equal(formatTaskCount('en', 1), '1 task');
  assert.equal(formatTaskCount('en', 2), '2 tasks');
  assert.equal(formatTaskCount('zh-CN', 1), '1 个任务');
});
test('calendar dates remain stable and reject normalized invalid dates', () => {
  assert.equal(formatCalendarDate('en', '2026-09-20'), 'Sep 20, 2026');
  assert.throws(() => formatCalendarDate('en', '2026-02-30'), RangeError);
  assert.throws(() => formatCalendarDate('en', '2026-09-20T00:00:00Z'), RangeError);
  assert.match(formatInstant('en', new Date('2026-09-20T01:00:00Z'), 'America/Los_Angeles'), /Sep 19/);
});
test('status compatibility preserves all existing data values', () => {
  assert.equal(translate('en', statusMessageKey['进行中']), 'In progress');
  assert.equal(translate('zh-CN', statusMessageKey['待审核']), '待审核');
});
test('provider can render without browser storage', () => {
  assert.equal(renderToStaticMarkup(createElement(I18nProvider, null, 'content')), 'content');
});
