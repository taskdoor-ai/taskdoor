import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { globalUiText } from '../src/i18n/globalUi';
import { progressText } from '../src/i18n/progressCopy';
import { workbenchPriorityReason } from '../src/i18n/workbenchCopy';
import { priorityReasonFor, type PersonalWorkbenchItem } from '../src/lib/personalWorkbench';

test('local editing and dependency validation errors have English display copy', () => {
  for (const file of ['taskDependencies', 'taskFileTree', 'taskEffortEditing', 'taskFileEditing', 'taskCriteriaEditing']) {
    const source = readFileSync(new URL(`../src/lib/${file}.ts`, import.meta.url), 'utf8');
    const errors = [...source.matchAll(/(?:throw new Error\(|return )"([^"\n]*[\u3400-\u9fff][^"\n]*)"/g)].map(match => match[1]);
    assert.ok(errors.length, file);
    for (const error of errors) {
      assert.doesNotMatch(globalUiText('en', error), /[\u3400-\u9fff]/u, `${file}: ${error}`);
      assert.equal(globalUiText('zh-CN', error), error);
    }
  }
  assert.equal(globalUiText('en', '第 12 条完成标准不能为空，请补全或删除这一条。'), 'Acceptance criterion 12 is empty. Complete it or remove it.');
  assert.equal(globalUiText('en', '用户自定义错误'), '用户自定义错误');
});

test('schedule validation interpolates dates without leaking system Chinese', () => {
  assert.equal(progressText('en', '截止时间不能早于创建日期（2026-09-20）。'), 'The due date cannot be before the creation date (2026-09-20).');
  assert.doesNotMatch(progressText('en', '截止日期无效，请选择有效日期。'), /[\u3400-\u9fff]/u);
});

test('workbench guidance keeps facts and custom criteria while localizing system copy', () => {
  const item = { taskId: 'custom', dueState: 'overdue', dueLabel: '9 月 20 日', focus: 'dependency', role: 'coordination', priorityContext: {
    childCount: 4, completedChildCount: 1, remainingChildCount: 2, cancelledChildCount: 1,
    pendingDependencyCount: 2, missingDependencyCount: 1,
    completionCriterion: '客户自己的验收要求',
  }} as PersonalWorkbenchItem;
  const result = workbenchPriorityReason('en', item);
  assert.match(result, /Past the due date \(Sep 20\)/);
  assert.match(result, /Direct subtasks: 4 total; 1 marked complete; 2 awaiting wrap-up/);
  assert.match(result, /客户自己的验收要求/);
  assert.doesNotMatch(result.replace('客户自己的验收要求', ''), /[\u3400-\u9fff]/u);
  assert.equal(workbenchPriorityReason('zh-CN', item), priorityReasonFor(item));
  assert.match(workbenchPriorityReason('en', item, () => 'Approved campaign assets'), /Approved campaign assets/);
});
