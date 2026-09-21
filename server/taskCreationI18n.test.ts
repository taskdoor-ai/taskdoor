import assert from 'node:assert/strict';
import test from 'node:test';
import { taskCreationScenarios } from '../src/data/taskCreationScenarios.ts';
import { creationScenarioEnglish } from '../src/i18n/creationMock.ts';
import { creationEn, creationZh, localizeCreationMessage } from '../src/i18n/creationMessages.ts';
import { planTaskCreation } from '../src/lib/taskCreationPlanning.ts';
import { getEffortScopeKey } from '../src/lib/taskEffort.ts';
import { getCreationEffortLeaves } from '../src/lib/taskCreationEffort.ts';
import { toTaskPlanDraft, validateCreationForm } from '../src/lib/taskCreationForm.ts';
import { getCreationFeedback } from '../src/lib/taskCreationProgress.ts';
const context = { currentDate: '2026-09-20', currentUserId: 'me', members: [{ id: 'me', name: '林晓' }], tags: [], existingTasks: [{ id: 'weekly-retro-notes', name: '团队自己的复盘' }, { id: 'product-launch-planning', name: '团队自己的发布会' }] };

test('all supported creation scenarios generate English content with valid effort scopes and stable relationships', () => {
  for (const scenario of taskCreationScenarios) {
    const input = creationScenarioEnglish[scenario.id].prompt;
    const result = planTaskCreation(input, context, { scenarioId: scenario.id, locale: 'en', answers: { goal: 'Increase product awareness', deliverable: 'Event plan and schedule' } });
    assert.ok(result.stage === 'review' || result.stage === 'decision', scenario.id);
    assert.equal(result.form.request, input);
    const tasks = [result.form.mainTask, ...result.form.subtasks];
    for (const item of tasks) {
      assert.doesNotMatch([item.title, item.goal, ...item.completionCriteria, ...item.executionTips, item.effortEstimate?.workMethod, item.effortEstimate?.reason].join(' '), /[\u3400-\u9fff]/, scenario.id);
      assert.ok(item.clientId);
      assert.ok(item.participantIds.includes('me'));
    }
    for (const leaf of getCreationEffortLeaves(result.form)) {
      if (leaf.effortEstimate) assert.equal(leaf.effortEstimate.scopeKey, getEffortScopeKey(leaf, leaf.effortEstimate.workMethod), leaf.title);
    }
    assert.equal(validateCreationForm({ ...result.form, decision: 'independent' }, context.members), null);
    const draft = toTaskPlanDraft(result.form);
    assert.equal(draft.subtasks.length, result.form.subtasks.length);
    if (result.form.candidate) assert.match(result.form.candidate.name!, /^团队自己的/);
    for (const step of getCreationFeedback(result)) for (const text of [step.label, step.detail, step.basis]) assert.doesNotMatch(localizeCreationMessage('en', text), /[\u3400-\u9fff]/);
  }
});

test('clarification localizes choices and preserves custom user goals and deliverables', () => {
  const prompt = creationScenarioEnglish['clarify-requirement'].prompt;
  const pending = planTaskCreation(prompt, context, { locale: 'en' });
  assert.equal(pending.stage, 'clarify');
  if (pending.stage === 'clarify') assert.equal(pending.questions[0].choices[0], 'Increase product awareness');
  const result = planTaskCreation(prompt, context, { locale: 'en', answers: { goal: '保留我的原始目标', deliverable: '用户填写的交付' } });
  assert.ok(result.stage === 'review');
  assert.equal(result.form.mainTask.goal, '保留我的原始目标');
  assert.equal(result.form.mainTask.completionCriteria[0], 'Deliver: 用户填写的交付');
  assert.equal(planTaskCreation('任意真实用户输入', context, { locale: 'en' }).stage, 'unavailable');
});

test('creation UI catalogs preserve interpolation and localized validation does not mutate drafts', () => {
  for (const key of Object.keys(creationEn) as Array<keyof typeof creationEn>) {
    assert.deepEqual(creationEn[key].match(/\{\w+\}/g)?.sort() ?? [], creationZh[key].match(/\{\w+\}/g)?.sort() ?? [], key);
  }
  assert.equal(localizeCreationMessage('en', '请补充子任务 2名称。'), 'Add a name for subtask 2.');
  assert.equal(localizeCreationMessage('en', '子任务 2的第 3 条完成标准为空，请补全或删除。'), 'Completion criterion 3 for subtask 2 is empty. Complete or remove it.');
  assert.equal(localizeCreationMessage('en', '服务返回的未知信息'), '服务返回的未知信息');
});
