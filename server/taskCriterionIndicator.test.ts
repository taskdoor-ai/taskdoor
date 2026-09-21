import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TaskCriterionIndicator } from '../src/components/TaskCriterionIndicator';
const review = {text:'A',analysis:{percent:70,evidence:'Demo',observedAt:'2026-09-14T17:30:00+08:00'}};
test('confirmation uses the orbit button and its tooltip explains the AI assessment', () => {
  const html=renderToStaticMarkup(createElement(TaskCriterionIndicator,{index:0,review,onConfirm:()=>{}}));
  assert.match(html,/aria-label="1\. Confirm met"/);
  assert.match(html,/aria-pressed="false"/);
  assert.doesNotMatch(html,/criterion-confirm-feedback/);

  assert.match(html,/criterion-touch-confirm/);
  assert.match(html,/AI assessment: Mostly complete/);
  assert.match(html,/Click to confirm as met/);
});
test('confirmed criteria expose undo and read-only criteria disable confirmation',()=>{
  const confirmed={...review,confirmation:{by:'Tester',at:'2026-09-14T18:00:00+08:00'}};
  const html=renderToStaticMarkup(createElement(TaskCriterionIndicator,{index:0,review:confirmed,onConfirm:()=>{}}));
  assert.match(html,/aria-label="1\. Undo confirmation"/);
  assert.match(html,/aria-pressed="true"/);
  const readonly=renderToStaticMarkup(createElement(TaskCriterionIndicator,{index:0,review}));
  assert.match(readonly,/disabled=""/);
  assert.doesNotMatch(readonly,/criterion-touch-confirm/);
});
