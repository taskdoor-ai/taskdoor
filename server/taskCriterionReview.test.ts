import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmTaskCriterion, criterionPercent, criterionReview, criterionStage } from '../src/lib/taskCriterionReview';
import { applyCurrentTaskCriteria } from '../src/lib/taskCriteriaEditing';
import { normalizeWorkspaceNodes, type TaskNode } from '../src/data/workspaceNodes';
const task = { kind: 'task', id: 'review-test', completionCriteria: ['A', 'B'], status: '待开始', ownerId: 'tester', name: 'Review test', parentId: null, updatedAt: '2026-09-21T00:00:00Z' } as TaskNode;
test('confirmation is independent of AI, records author, survives serialization, and can be undone', () => {
  const result = confirmTaskCriterion([task], task.id, ['A','B'], 0, true, 'Tester');
  const saved = normalizeWorkspaceNodes(JSON.parse(JSON.stringify(result.nodes))).filter(node => node.kind === "task") as TaskNode[];
  assert.equal(saved[0].criterionReviews?.[0].confirmation?.by, 'Tester');
  assert.equal(saved[0].status, task.status);
  assert.ok(result.activity);
  assert.equal(confirmTaskCriterion(saved, task.id, ['A','B'], 0, true, 'Tester').activity, null);
  const undone = confirmTaskCriterion(saved, task.id, ['A','B'], 0, false, 'Tester');
  assert.equal((undone.nodes[0] as TaskNode).criterionReviews?.[0].confirmation, undefined);
});
test('editing a criterion clears its confirmation without resurrecting it when text is restored', () => {
  const saved = confirmTaskCriterion([task], task.id, ['A','B'], 0, true, 'Tester');
  const changed = applyCurrentTaskCriteria(saved.nodes, task.id, ['A','B'], ['Changed','B'], 'Tester');
  const restored = applyCurrentTaskCriteria(changed.nodes, task.id, ['Changed','B'], ['A','B'], 'Tester');
  assert.equal((restored.nodes[0] as TaskNode).criterionReviews?.[0].confirmation, undefined);
  assert.throws(() => confirmTaskCriterion(changed.nodes, task.id, ['A','B'], 0, true, 'Tester'));
});
test('AI must have valid quantitative evidence; 100 percent does not constitute human confirmation', () => {
  const review = { text:'A', analysis: { percent:100, evidence:'All evidence verified', observedAt:'2026-09-21T00:00:00Z' } };
  assert.equal(criterionPercent(review),100);
  assert.equal(criterionReview('A',review)?.confirmation,undefined);
  assert.equal(criterionReview('Edited',review),undefined);
  assert.equal(criterionPercent({...review,analysis:{...review.analysis,percent:101}}),null);
  assert.equal(criterionPercent({...review,analysis:{...review.analysis,evidence:''}}),null);
  assert.equal(criterionPercent(undefined),null);
});

test('criterion stages share task progress thresholds without treating the highest stage as confirmation', () => {
  for (const [percent, expected] of [[0,0],[10,1],[25,2],[49,2],[50,3],[89,3],[90,4],[100,4]]) {
    const review = { text:'A', analysis:{percent,evidence:'Evidence',observedAt:'2026-09-21T00:00:00Z'} };
    assert.equal(criterionStage(review),expected);
    assert.equal(criterionReview('A',review)?.confirmation,undefined);
  }
  assert.equal(criterionStage(undefined),null);
});
