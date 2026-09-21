import assert from 'node:assert/strict';
import test from 'node:test';
import copy from '../src/i18n/globalUiMessages.json';
import { globalUiText } from '../src/i18n/globalUi';
import { notificationCopy } from '../src/i18n/notificationCopy';
import { notificationExamples } from '../src/data/notificationExamples';
import { aiTransferMessage } from '../src/i18n/aiTransferCopy';
import { taskContextValue } from '../src/i18n/aiContextCopy';
import { buildTaskAiConnectionRequest } from '../src/lib/taskAiConnection';
import { taskDetailMocks } from '../src/data/taskDetailMocks';

test('system copy preserves Chinese and interpolation parameters and never translates unknown text', () => {
  for (const {zh, en} of Object.values(copy)) {
    assert.doesNotMatch(en, /[\u3400-\u9fff]/u, zh);
    assert.deepEqual([...(zh.match(/\{\w+\}/g) ?? [])].sort(), [...(en.match(/\{\w+\}/g) ?? [])].sort(), zh);
    assert.equal(globalUiText('zh-CN', zh), zh);
  }
  assert.equal(globalUiText('en', '用户自由输入'), '用户自由输入');
  assert.equal(globalUiText('en', '复制并尝试打开 {tool}', {tool: 'Codex'}), 'Copy and try opening Codex');
});
test('notifications translate only the original fixtures and retain IDs and read state', () => {
  const before = JSON.stringify(notificationExamples);
  for (const item of notificationExamples) {
    const translated = notificationCopy('en', {...item, read: true});
    assert.doesNotMatch(translated.content, /[\u3400-\u9fff]/u);
    assert.equal(translated.id, item.id);
    assert.equal(translated.task?.id, item.task?.id);
    assert.equal(translated.read, true);
    assert.equal(notificationCopy('zh-CN', item), item);
    const edited = {...item, content: '用户修改过的通知'};
    assert.equal(notificationCopy('en', edited), edited);
  }
  assert.equal(JSON.stringify(notificationExamples), before);
});
test('AI transfer feedback distinguishes failure, attempted launch and preview without launching tools', () => {
  for (const status of ['preview','copy-failed','open-failed','open-attempted','cancelled'] as const) {
    const result = {status, message: '原始说明'};
    assert.doesNotMatch(aiTransferMessage('en', result, 'Codex'), /[\u3400-\u9fff]/u);
    assert.equal(aiTransferMessage('zh-CN', result, 'Codex'), result.message);
  }
  assert.match(aiTransferMessage('en', {status:'open-attempted',message:''}, 'Codex'), /cannot be confirmed/);
});
test('task context preview translates original title, goal and whole criteria without rewriting the transfer payload', () => {
  const request = buildTaskAiConnectionRequest({taskId:'fragrance-content',task:taskDetailMocks['fragrance-content'],currentUser:'周岚'});
  const before = JSON.stringify(request);
  const criteria = request.contextPreview!.items.find(item => item.label === '完成标准')!.value;
  assert.doesNotMatch(taskContextValue('en', 'fragrance-content', '完成标准', criteria), /[\u3400-\u9fff]/u);
  assert.equal(taskContextValue('zh-CN', 'fragrance-content', '完成标准', criteria), criteria);
  assert.equal(taskContextValue('en', 'fragrance-content', '完成标准', '用户编辑的标准、保留标点'), '用户编辑的标准、保留标点');
  assert.equal(taskContextValue('en', '', '参与人', '林洁\n周岚'), 'Jie Lin, Lan Zhou');
  assert.equal(JSON.stringify(request), before);
});
