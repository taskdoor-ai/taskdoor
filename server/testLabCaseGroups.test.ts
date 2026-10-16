import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {caseSkillGroup,caseMatchesSkillGroup,caseGroupingProblem} from '../src/test-lab/case-groups.ts';
import {availableTaskPreviewCases} from '../src/test-lab/task-preview-case.ts';
import {availableSubtaskSuggestionsCases} from '../src/test-lab/subtask-case.ts';
import {seedLab} from './test-lab/seeds.ts';
import {createRunner} from './test-lab/runner.ts';
import type {LabCase} from '../src/test-lab/types.ts';
import type {LabStore} from './test-lab/store.ts';

function cases(){
  const seed=seedLab(),creation=structuredClone(seed.cases.find(item=>item.id==='case-create')!);
  creation.assertions=[];creation.id='create-only';creation.steps[0].prompt='创建一项发布资料包任务，完成标准含文案和配图，不在本流程拆子任务。';
  const subtask:LabCase={...structuredClone(creation),id:'subtasks-only',steps:[{...creation.steps[0],skillId:'taskdoor-decompose-task',taskId:'script',prompt:'只建议这个已保存任务下一层剩余交付。'}]};
  const mixed:LabCase={...structuredClone(creation),id:'mixed',steps:[...structuredClone(creation.steps),{...subtask.steps[0],id:'s2'}]};
  const wrongTarget:LabCase={...structuredClone(creation),id:'planner-with-existing-task',steps:[{...creation.steps[0],taskId:'script'}]};
  const missingTarget:LabCase={...structuredClone(subtask),id:'subtasks-without-task',steps:[{...subtask.steps[0],taskId:null}]};
  return {seed,creation,subtask,mixed,wrongTarget,missingTarget};
}

test('创建与独立拆解按全部步骤和目标任务分组，混合与错误目标明确待分组',()=>{
  const {creation,subtask,mixed,wrongTarget,missingTarget}=cases(),before=structuredClone([creation,subtask,mixed,wrongTarget,missingTarget]);
  assert.equal(caseSkillGroup(creation),'agentdoor-task-planner');
  assert.equal(caseSkillGroup(subtask),'taskdoor-decompose-task');
  for(const item of [mixed,wrongTarget,missingTarget]){
    assert.equal(caseSkillGroup(item),null);
    assert.equal(caseMatchesSkillGroup(item,'agentdoor-task-planner'),false);
    assert.equal(caseMatchesSkillGroup(item,'taskdoor-decompose-task'),false);
    assert.ok(caseGroupingProblem(item));
  }
  assert.match(caseGroupingProblem(mixed)!,/不同 Skill/);
  assert.match(caseGroupingProblem(wrongTarget)!,/已保存任务/);
  assert.match(caseGroupingProblem(missingTarget)!,/已保存任务/);
  assert.deepEqual([creation,subtask,mixed,wrongTarget,missingTarget],before);
});

test('启动筛选互不混组；多轮创建修改和独立拆解修改保留各自覆盖',()=>{
  const {creation,subtask,mixed,wrongTarget,missingTarget}=cases();
  const createEdit={...structuredClone(creation),id:'create-edit',steps:[...creation.steps,{...creation.steps[0],id:'s2',prompt:'只调整当前任务截止日期，其他不变。',usePreviousOutput:true}]};
  const subtaskEdit={...structuredClone(subtask),id:'subtasks-edit',steps:[...subtask.steps,{...subtask.steps[0],id:'s2',prompt:'去掉其中一个候选，返回剩余完整建议。',usePreviousOutput:true}]};
  const items=[creation,subtask,mixed,wrongTarget,missingTarget,createEdit,subtaskEdit];
  assert.deepEqual(availableTaskPreviewCases(items,creation.teamId).map(item=>item.id),['create-only','create-edit']);
  assert.deepEqual(availableSubtaskSuggestionsCases(items,creation.teamId).map(item=>item.id),['subtasks-only','subtasks-edit']);
  assert.equal(caseSkillGroup(createEdit),'agentdoor-task-planner');assert.equal(caseSkillGroup(subtaskEdit),'taskdoor-decompose-task');
});

test('API runner 无论是否指定 Skill，混合与错组用例都在排队和模型请求前拒绝',()=>{
  const {seed,mixed,wrongTarget,missingTarget}=cases();seed.cases=[mixed,wrongTarget,missingTarget];let calls=0,queued=0;
  const store={getLibrary:()=>structuredClone(seed),getRuns:()=>[],appendRuns:()=>{queued++;}} as unknown as LabStore;
  const runner=createRunner(store,{apiKey:'test-not-real',endpoint:'https://example.invalid/responses',model:'test',maxOutputTokens:1000,timeoutMs:1000},async()=>{calls++;throw Error('不可发出请求');});
  for(const item of seed.cases)assert.throws(()=>runner.enqueue([item.id],item.id,{executionMode:item.id===missingTarget.id?'subtasks':'preview'}),/用例需先分组/);
  assert.equal(queued,0);assert.equal(calls,0);
});

test('真实用例页共用完整步骤分组，待分组可见且启动页使用各自只读入口',()=>{
  const casesSource=readFileSync(new URL('../tools/evaluation/fork/extensions/CasesPage.tsx',import.meta.url),'utf8');
  const runSource=readFileSync(new URL('../tools/evaluation/fork/extensions/RunPage.tsx',import.meta.url),'utf8');
  assert.match(casesSource,/caseMatchesSkillGroup\(c,skillFilter\)/);
  assert.match(casesSource,/待分组/);assert.match(casesSource,/caseGroupingProblem/);
  assert.ok(!casesSource.includes("c.steps.some(s=>s.skillId===skillFilter)"));
  assert.match(casesSource,/>创建任务<\/option>/);assert.match(casesSource,/>子任务拆解<\/option>/);
  assert.match(runSource,/availableSubtaskSuggestionsCases/);assert.match(runSource,/availableTaskPreviewCases/);
  assert.match(runSource,/decomposing\?'subtasks'/);assert.match(runSource,/创建任务/);
  for(const name of ['CasesPage','RunPage'])assert.equal(readFileSync(new URL(`../tools/evaluation/fork/extensions/${name}.tsx`,import.meta.url),'utf8'),readFileSync(new URL(`../tools/evaluation/upstream/src/app/src/extensions/${name}.tsx`,import.meta.url),'utf8'));
});
