import assert from 'node:assert/strict';
import test from 'node:test';
import { detailEn, detailZh } from '../src/i18n/detailMessages';
import { creationEn, creationZh } from '../src/i18n/creationMessages';
import { moduleEn, moduleZh, moduleText } from '../src/i18n/moduleMessages';
import { en, zh } from '../src/i18n/messages';
import { remainingEn, remainingZh } from '../src/i18n/remainingMessages';
import { globalUiText } from '../src/i18n/globalUi';
import { recommendationReason } from '../src/i18n/recommendationCopy';

test('task terminology is consistent across creation, details and selectors', () => {
  assert.equal(detailEn.criteria, 'Acceptance criteria');
  assert.equal(creationEn.prerequisites, detailEn.dependencies);
  assert.equal(creationEn.participants, detailEn.participants);
  assert.equal(detailEn.participants, 'Collaborators');
  assert.equal(creationEn.owner, detailEn.owner);
  assert.equal(creationEn.dueDate, detailEn.dueDate);
  assert.equal(detailEn.noDeadline, detailEn.noDueDate);
  assert.equal(en['list.pin'], 'Pin');
  assert.equal(moduleText('en', '未填写责任'), 'No responsibilities provided');
  assert.equal(moduleText('zh-CN', '未填写责任'), '未填写职责');
  assert.equal(en['list.pinned'], 'Pinned tasks');
  const copy = [detailEn, creationEn, moduleEn, en, remainingEn];
  for (const catalog of copy) for (const value of Object.values(catalog)) {
    assert.doesNotMatch(value, /\b(?:Completion criteria|Prerequisites|Participants|Sign in|Sign out|No deadline)\b/i);
  }
});
test('bilingual catalogs preserve keys and interpolation arguments', () => {
  for (const [english, chinese] of [[detailEn, detailZh], [creationEn, creationZh], [moduleEn, moduleZh], [en, zh], [remainingEn, remainingZh]]) {
    assert.deepEqual(Object.keys(english).sort(), Object.keys(chinese).sort());
    for (const key of Object.keys(english)) {
      const value = (english as Record<string, string>)[key];
      const original = (chinese as Record<string, string>)[key];
      assert.deepEqual(value.match(/\{\w+\}/g)?.sort() ?? [], original.match(/\{\w+\}/g)?.sort() ?? [], key);
    }
  }
});
test('local recommendation explanations translate by template without changing custom content', () => {
  const person = {id: '陈默', name: '陈默'};
  const reason = '任务中的“达人、建联、佣金”与陈默的责任范围直接匹配。';
  assert.equal(recommendationReason('zh-CN', person, reason), reason);
  assert.equal(recommendationReason('en', person, reason), "The task keywords creators, outreach, commission match Mo Chen's responsibilities.");
  assert.equal(recommendationReason('en', person, '用户补充的推荐理由'), '用户补充的推荐理由');
  assert.doesNotMatch(recommendationReason('en', person, '当前任务描述与陈默的责任记录缺少直接命中，建议结合实际经验与可用时间再确认。'), /\p{Script=Han}/u);
  assert.equal(globalUiText('en', '前置依赖未能保存，请重试。'), 'Could not save dependencies. Please try again.');
});
