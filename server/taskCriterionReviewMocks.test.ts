import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCriterionReviewMocks, criterionDemoEvidence } from '../src/data/taskCriterionReviewMocks';
import { allTeamWorkspaceNodes } from '../src/data/teamWorkspaceScenarios';
import { normalizeWorkspaceNodes, type TaskNode } from '../src/data/workspaceNodes';
import { confirmTaskCriterion, criterionPercent } from '../src/lib/taskCriterionReview';
const fixtures = allTeamWorkspaceNodes.filter((n): n is TaskNode => n.kind === 'task' && Boolean(n.criterionReviews));
test('authored examples cover partial, AI-complete, human-confirmed and unknown without changing task progress', () => {
  assert.equal(fixtures.length,232);
  assert.equal(fixtures.flatMap(n=>n.criterionReviews!).length,577);
  const reviews=fixtures.flatMap(n=>n.criterionReviews!);
  assert.ok(reviews.some(r=>criterionPercent(r)!>0 && criterionPercent(r)!<100));
  assert.ok(reviews.some(r=>criterionPercent(r)===100 && !r.confirmation));
  assert.ok(reviews.some(r=>r.confirmation));
  assert.ok(reviews.some(r=>criterionPercent(r)===null));
  for(const review of reviews) {
    assert.ok(review.analysis?.evidence.startsWith('示例评估：'));
    assert.ok(criterionDemoEvidence(review.analysis!.evidence,'en').startsWith('Demo assessment:'));
  }
});
test('old untouched seeds migrate once; edits, explicit clears, new tasks and removed tasks are preserved', () => {
  const original=fixtures[0]; const {criterionReviews:_,...old}=original;
  const migrated=applyCriterionReviewMocks([old]);
  assert.deepEqual(migrated[0],original);
  assert.equal(applyCriterionReviewMocks(migrated),migrated);
  for(const task of [{...old,completionCriteria:['User standard']},{...old,goal:'User goal'},{...old,id:'user-task'}, {...old,criterionReviews:[]}]) {
    const nodes=[task]; assert.equal(applyCriterionReviewMocks(nodes),nodes);
  }
  assert.deepEqual(applyCriterionReviewMocks([]),[]);
});
test('undo of an example confirmation survives reload and is never reseeded', () => {
  const task=fixtures.find(n=>n.criterionReviews?.[0].confirmation)!;
  const undone=confirmTaskCriterion([task],task.id,task.completionCriteria!,0,false,'Tester');
  const reloaded=applyCriterionReviewMocks(normalizeWorkspaceNodes(JSON.parse(JSON.stringify(undone.nodes))));
  assert.equal((reloaded.find(n=>n.id===task.id) as TaskNode).criterionReviews?.[0].confirmation,undefined);
});
test('saved sun-protection demo uses criterion-specific evidence and protects edited standards',()=>{
  const task={...fixtures[0],id:'created-sun-demo',name:'新品防晒衣抖音达人带货项目',goal:'统筹新品防晒衣抖音达人带货项目，以 9 月 15 日上线和 GMV 50 万为目标，协调达人、内容、直播、商品、投流、数据和合规交付。',createdFrom:'task-planner',teamId:'creator-commerce',completionCriteria:['9 月 15 日按已确认排期上线，商品、达人内容与履约准备就绪。','活动 GMV 达到 50 万，交付可核对的销售数据及复盘。']} as TaskNode;
  delete task.criterionReviews;
  const migrated=applyCriterionReviewMocks([task])[0] as TaskNode;
  assert.equal(criterionPercent(migrated.criterionReviews?.[0]),65);
  assert.equal(criterionPercent(migrated.criterionReviews?.[1]),null);
  assert.deepEqual(migrated.effortEstimate,task.effortEstimate);
  const edited=[{...task,completionCriteria:['11']}];assert.equal(applyCriterionReviewMocks(edited),edited);
});

test('every built-in criterion has a matching bilingual demo snapshot after old-state normalization', () => {
  const old = allTeamWorkspaceNodes.map(node => { const {criterionReviews: _, ...rest} = node as TaskNode; return rest; });
  const migrated = applyCriterionReviewMocks(normalizeWorkspaceNodes(JSON.parse(JSON.stringify(old))));
  for (const node of migrated) {
    if (node.kind !== 'task') continue;
    assert.deepEqual(node.criterionReviews?.map(review => review.text), node.completionCriteria, node.id);
    for (const review of node.criterionReviews!) assert.notEqual(criterionDemoEvidence(review.analysis!.evidence, 'en'), review.analysis!.evidence);
  }
  const landing = migrated.find(node => node.id === 'ccx-creator-monthly-committee') as TaskNode;
  assert.ok(landing.criterionReviews!.some(review => criterionPercent(review)! > 0));
});
