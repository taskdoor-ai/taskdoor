import test from 'node:test';
import assert from 'node:assert/strict';
import {seedLab} from './test-lab/seeds.ts';
import {addTaskAnalysisCases} from './test-lab/task-analysis-cases.ts';
import {editableSchema, validateRelations} from './test-lab/schema.ts';
import {availableTaskAnalysisCases} from '../src/test-lab/task-preview-case.ts';
import {buildModelInput, applyEvents} from './test-lab/context.ts';
test('分析用例含完整团队证据，期望答案不进入模型输入',()=>{
  const state=seedLab();assert.equal(addTaskAnalysisCases(state),true);
  const cases=state.cases.filter(c=>c.origin==='task-analysis-evidence-v1');
  assert.equal(cases.length,15);
  editableSchema.parse({expectedRevision:state.revision,teams:state.teams,cases:state.cases});validateRelations(state.teams,state.cases);
  for(const c of cases){
    const team=state.teams.find(t=>t.id===c.teamId)!;
    const input=buildModelInput(team,c,c.steps[0],'fixture-check',[]);
    assert.ok(input.evidence.some(e=>e.taskId===c.steps[0].taskId&&e.kind==='文件'&&e.content));
    assert.equal(input.evidence.filter(e=>e.taskId===c.steps[0].taskId&&e.kind==='讨论').length>=2,true);
    assert.equal('assertions' in input,false);assert.equal('expectedOutput' in input,false);
    assert.equal(JSON.stringify(input).includes('分档完成度与证据预期一致'),false);
    assert.equal(input.coverage.evidence.state,c.id==='case-analysis-test-unreadable'?'partial':'complete');
  }
});
test('补交文件更新正文和版本，保留旧输入；多轮答案与人工状态独立',()=>{
  const state=seedLab();addTaskAnalysisCases(state);
  const c=state.cases.find(c=>c.id==='case-analysis-test-incremental')!;
  const original=state.teams.find(t=>t.id===c.teamId)!;
  let team=original;
  for(const [index,step] of c.steps.entries()){
    team=applyEvents(team,step);
    const input=buildModelInput(team,c,step,'incremental',[]);
    const delivery=input.evidence.find(e=>e.id==='analysis-test-incremental-delivery')!;
    assert.equal(delivery.version,index+1);
    assert.equal((delivery.content.match(/该项尚未执行/g)??[]).length,2-index);
    assert.equal(c.assertions.find(a=>a.id===`${step.id}-percent`)?.expected,50+index*25);
    assert.equal(input.tasks.find(t=>t.id===step.taskId)?.status,'进行中');
  }
  assert.equal(original.evidence.find(e=>e.id==='analysis-test-incremental-delivery')?.version,1);
});
test('重新加载不重复插入或覆盖用户修改',()=>{
  const state=seedLab();addTaskAnalysisCases(state);
  const c=state.cases.find(c=>c.id==='case-analysis-test-rules-only')!;c.steps[0].prompt='用户已编辑的测试需求';
  const count=state.cases.length;assert.equal(addTaskAnalysisCases(state),false);
  assert.equal(state.cases.length,count);assert.equal(c.steps[0].prompt,'用户已编辑的测试需求');
});

test('评测入口只列当前团队启用的任务分析用例',()=>{
  const state=seedLab();addTaskAnalysisCases(state);
  const available=availableTaskAnalysisCases(state.cases,'lab-content');
  assert.equal(available.filter(c=>c.origin==='task-analysis-evidence-v1').length,15);
  assert.ok(available.every(c=>c.steps.every(s=>s.skillId==='agentdoor-task-status-analyzer'&&s.taskId)));
  available[0].archived=true;
  assert.ok(!availableTaskAnalysisCases(state.cases,'lab-content').some(c=>c.id===available[0].id));
  assert.deepEqual(availableTaskAnalysisCases(state.cases,'missing-team'),[]);
});

 test('MCP标准ID独立版本与不可读正文保留，隔离无关任务',()=>{
 const state=seedLab();addTaskAnalysisCases(state);
 const c=state.cases.find(c=>c.id==='case-analysis-test-unreadable')!;
 const team=state.teams.find(t=>t.id===c.teamId)!;
 const input=buildModelInput(team,c,c.steps[0],'contract',[]);
 assert.ok('analysisContext' in input);
 const ctx=input.analysisContext!;
 assert.equal(ctx.tasks.length,1);assert.equal(ctx.tasks[0].criteria.version,1);
 assert.equal(ctx.tasks[0].criteria.items[0].id,'analysis-test-unreadable-criterion-1');
 assert.equal(ctx.files.find(f=>f.readState==='unavailable')?.text,null);
 assert.deepEqual(Object.keys(input.inputVersions.tasks),['analysis-test-unreadable']);
 });
