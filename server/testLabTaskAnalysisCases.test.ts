import test from 'node:test';
import assert from 'node:assert/strict';
import {seedLab} from './test-lab/seeds.ts';
import {addTaskAnalysisCases} from './test-lab/task-analysis-cases.ts';
import {editableSchema, validateRelations} from './test-lab/schema.ts';
import {availableTaskAnalysisCases} from '../src/test-lab/task-preview-case.ts';
import {buildModelInput, applyEvents} from './test-lab/context.ts';
import * as analysisCases from './test-lab/task-analysis-cases.ts';
import {updateTaskAnalysisExpectations} from './test-lab/task-analysis-expectations.ts';
import {evaluateAssertions} from './test-lab/assertions.ts';

test('双语复合标准允许有证据的部分完成，未执行的独立标准仍为零',()=>{
  const state=seedLab();addTaskAnalysisCases(state);updateTaskAnalysisExpectations(state);
  const c=state.cases.find(c=>c.id==='case-analysis-test-new-scope')!;
  const partial=c.assertions.filter(a=>a.path==='result.criterionAssessments.4.percent');
  assert.deepEqual(partial.map(a=>[a.operator,a.expected]),[['gte',25],['lte',75]]);
  for(const percent of [25,50,75])assert.ok(evaluateAssertions({result:{criterionAssessments:[{},{},{},{},{percent}]}},partial).every(a=>a.status==='passed'));
  for(const percent of [0,100])assert.ok(evaluateAssertions({result:{criterionAssessments:[{},{},{},{},{percent}]}},partial).some(a=>a.status==='failed'));
  const references=c.expectedOutput!.checks;
  const authored=(references.find(c=>c.subject==='参考逐条完成度')!.expected as any[])[4];
  const contract=(references.find(c=>c.subject==='逐条标准完成度')!.expected as any[])[4];
  assert.deepEqual(authored.允许AI参考完成度,[25,50,75]);assert.equal('AI参考完成度' in authored,false);
  assert.deepEqual(contract.allowedPercents,[25,50,75]);assert.equal('percent' in contract,false);
  assert.match(authored.依据,/中文/);assert.match(authored.依据,/英文/);
  assert.match(JSON.stringify(references.find(c=>c.id==='new-scope-partial-evidence-s1')),/一致性/);
  const other=state.cases.find(c=>c.id==='case-analysis-test-page-ready')!;
  const unexecuted=other.assertions.filter(a=>a.path==='result.criterionAssessments.2.percent');
  assert.deepEqual(unexecuted.map(a=>[a.operator,a.expected]),[['equals',0]]);
  assert.equal(evaluateAssertions({result:{criterionAssessments:[{},{},{percent:25}]}},unexecuted)[0].status,'failed');
});

test('显式复测克隆只修复复合标准验收，保留原用例、业务快照和其它检查',()=>{
  const state=seedLab();addTaskAnalysisCases(state);updateTaskAnalysisExpectations(state);
  const source=structuredClone(state.cases.find(c=>c.id==='case-analysis-test-new-scope')!);
  source.dataSnapshot=structuredClone(state.teams.find(t=>t.id===source.teamId)!);
  // Reproduce the old frozen rubric without importing or writing any persisted run.
  source.assertions=source.assertions.filter(a=>a.path!=='result.criterionAssessments.4.percent');
  source.assertions.push({id:'s1-criterion-4',stepId:'s1',label:'旧复合标准归零',path:'result.criterionAssessments.4.percent',operator:'equals',expected:0});
  for(const check of source.expectedOutput!.checks){
    if(check.subject==='参考逐条完成度'){
      const row=(check.expected as any[])[4];delete row.允许AI参考完成度;row.AI参考完成度=0;row.依据='旧参考认为新增标准尚未形成结果';
    }
    if(check.subject==='逐条标准完成度'){
      const row=(check.expected as any[])[4];delete row.allowedPercents;row.percent=0;
    }
  }
  source.expectedOutput!.checks.push({id:'user-accepted-check',stepId:'s1',subject:'用户自定验收',criterion:'保留已通过的自定规则',expected:{retained:true}});
  source.steps[0].prompt='用户保留的测试需求';
  const before=structuredClone(source);
  const create=Reflect.get(analysisCases,'createNewScopeAnalysisRetestCase');
  assert.equal(typeof create,'function');
  const copy=create(source,'case-new-scope-retest');
  assert.deepEqual(source,before);assert.notEqual(copy.id,source.id);
  assert.deepEqual(copy.dataSnapshot,source.dataSnapshot);assert.notEqual(copy.dataSnapshot,source.dataSnapshot);
  assert.deepEqual(copy.steps,source.steps);
  assert.deepEqual(copy.assertions.filter((a:any)=>a.path!=='result.criterionAssessments.4.percent'),source.assertions.filter(a=>a.path!=='result.criterionAssessments.4.percent'));
  for(const check of source.expectedOutput!.checks.filter(c=>!['参考逐条完成度','逐条标准完成度'].includes(c.subject))){
    const retained=copy.expectedOutput!.checks.find((c:any)=>c.subject===check.subject&&c.id.endsWith(check.id.split('-').at(-1)!));
    assert.ok(retained);assert.deepEqual({...retained,id:check.id},check);
  }
  const isolated={...state,cases:[copy],teams:[copy.dataSnapshot]};
  const frozen=JSON.stringify(copy);assert.equal(updateTaskAnalysisExpectations(isolated),false);assert.equal(JSON.stringify(copy),frozen);
  const input=buildModelInput(copy.dataSnapshot,copy,copy.steps[0],'retest',[]);
  assert.equal('assertions' in input,false);assert.equal('expectedOutput' in input,false);
  assert.equal(JSON.stringify(input).includes('allowedPercents'),false);
  assert.throws(()=>create(source,source.id),/新/);
});

test('缺少raw参考时0与100可由分档规则确定，缺50不得倒算或写成未知',()=>{
  const state=seedLab();addTaskAnalysisCases(state);
  for(const key of ['not-started','all-evidence','weighted']){
    const c=state.cases.find(c=>c.id===`case-analysis-test-${key}`)!;
    c.assertions=c.assertions.filter(a=>a.path!=='result.progress.completionPercent');
  }
  updateTaskAnalysisExpectations(state);
  for(const [key,expected] of [['not-started',0],['all-evidence',100]] as const){
    const c=state.cases.find(c=>c.id===`case-analysis-test-${key}`)!;
    const value=c.expectedOutput!.checks.find(c=>c.subject==='参考整体进度')!.expected as Record<string,unknown>;
    assert.equal(value.原始完成度,expected);assert.equal(JSON.stringify(value).includes('null%'),false);
  }
  const partial=state.cases.find(c=>c.id==='case-analysis-test-weighted')!;
  const value=partial.expectedOutput!.checks.find(c=>c.subject==='参考整体进度')!.expected as Record<string,unknown>;
  assert.equal('原始完成度' in value,false);assert.match(String(value.原始比例规则),/原始|分档/);
  const unknown=state.cases.find(c=>c.id==='case-analysis-test-unknown')!;
  assert.equal((unknown.expectedOutput!.checks.find(c=>c.subject==='参考整体进度')!.expected as Record<string,unknown>).原始完成度,null);
});
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
