import assert from 'node:assert/strict';
import test from 'node:test';
import { moduleEn, moduleZh, moduleText } from '../src/i18n/moduleMessages';
import { activityChangeValue, activityMessage } from '../src/i18n/activityDisplay';
import { settingsMockText } from '../src/i18n/settingsMock';
import { mockRecordText, mockTaskCatalog } from '../src/i18n/mockContent';
import settings from '../src/i18n/mock/settings.json';

test('settings and activity catalogs have matching keys and interpolation parameters', () => {
  assert.deepEqual(Object.keys(moduleEn).sort(), Object.keys(moduleZh).sort());
  for (const key of Object.keys(moduleEn) as (keyof typeof moduleEn)[]) {
    assert.deepEqual(moduleEn[key].match(/\{\w+\}/g)?.sort() ?? [], moduleZh[key].match(/\{\w+\}/g)?.sort() ?? [], key);
    assert.ok(moduleEn[key].trim());
    assert.ok(!/[\u4e00-\u9fff]/.test(moduleEn[key]), key);
  }
  assert.equal(moduleText('en', '任务活动'), 'Task activity');
  assert.equal(moduleText('zh-CN', 'Settings'), '设置');
});
test('activity localizes system status messages and empty values without translating user discussion', () => {
  const message = '将任务状态更新为“待开始”。';
  assert.equal(activityMessage('en', 'status-change', message), 'Changed the task status to “Not started”.');
  assert.equal(activityMessage('zh-CN', 'status-change', message), message);
  assert.equal(activityMessage('en', 'member-post', message), message);
  assert.equal(activityChangeValue('en', '状态', '进行中'), 'In progress');
  assert.equal(activityChangeValue('en', '状态', null), '');
  assert.equal(activityChangeValue('en', '目标', '我的任务目标'), '我的任务目标');
});
test('every settings fixture has English display and preserves edits and unknown identities', () => {
  for (const [id, copies] of Object.entries(settings)) for (const copy of copies) {
    assert.equal(settingsMockText('en', id, copy.zh), copy.en);
    assert.equal(settingsMockText('zh-CN', id, copy.zh), copy.zh);
    assert.equal(settingsMockText('en', id, copy.zh + '（已修改）'), copy.zh + '（已修改）');
    assert.equal(settingsMockText('en', 'custom-id', copy.zh), copy.zh);
  }
});
test('file activity templates use matching task translations without mutating custom records', () => {
  for (const [id, copy] of Object.entries(mockTaskCatalog)) {
    const message = `更新“${copy.title.zh}”的范围、依据与交付结果。`;
    assert.equal(mockRecordText('en', id, message), `Updated the scope, evidence, and deliverables for “${copy.title.en}”.`);
    assert.equal(mockRecordText('en', id, message+'新增备注'), message+'新增备注');
  }
});
