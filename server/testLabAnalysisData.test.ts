import test from 'node:test';
import assert from 'node:assert/strict';
import {seedLab} from './test-lab/seeds.ts';
import {addTaskAnalysisCases} from './test-lab/task-analysis-cases.ts';
import {addPeopleAnalysisCases} from './test-lab/people-analysis-cases.ts';
import {buildAnalysisDataFixtures} from './test-lab/analysis-data-fixtures.ts';
import {editableSchema,validateRelations} from './test-lab/schema.ts';
import {buildModelInput,applyEvents} from './test-lab/context.ts';
function fixtures(){const state=seedLab();addTaskAnalysisCases(state);addPeopleAnalysisCases(state);buildAnalysisDataFixtures(state);return state;}
test('28个分析用例独立快照合法，空说明不妨碍分析',()=>{
 const state=fixtures();const cases=state.cases.filter(c=>c.dataSnapshot);assert.equal(cases.length,28);
 editableSchema.parse({expectedRevision:state.revision,teams:state.teams,cases:state.cases});validateRelations(state.teams,state.cases);
 for(const c of cases){assert.equal(c.steps[0].prompt,'');const input=buildModelInput(c.dataSnapshot!,c,c.steps[0],'data-run',[]);assert.ok(input.message);assert.ok(input.evidence.length);assert.equal('assertions' in input,false);assert.equal('expectedOutput' in input,false);}
});
test('任务层级保留，已移除依赖字段不进输入，发布条件仍由正文表达',()=>{
 const state=fixtures();const c=state.cases.find(c=>c.id==='case-analysis-data-dependency')!;const input=buildModelInput(c.dataSnapshot!,c,c.steps[0],'hierarchy',[]) as any;
 assert.equal(input.analysisContext.tasks.length,4);assert.equal(input.analysisContext.tasks.filter((t:any)=>t.parentTaskId===c.steps[0].taskId).length,2);
 const root=input.analysisContext.tasks.find((t:any)=>t.id===c.steps[0].taskId);
 assert.equal(Object.hasOwn(input.analysisContext,'dependencies'),false);
 for(const task of input.analysisContext.tasks){assert.equal(Object.hasOwn(task,'dependencies'),false);assert.equal(Object.hasOwn(task,'dependsOnTaskIds'),false);}
 assert.ok(input.evidence.some((item:any)=>item.content.includes('审批尚未通过，只影响发布')));
 assert.equal(input.analysisContext.files.find((f:any)=>f.name==='script.md').taskId,root.id+'-script');
 assert.equal(JSON.stringify(input).includes('整体独立工作完成一半'),false);
});
test('不同用例及团队基线不共享可变快照，多轮补交保留版本',()=>{
 const state=fixtures();const c=state.cases.find(c=>c.id==='case-analysis-test-incremental')!;
 const library=state.teams.find(t=>t.id===c.teamId)!;const original=structuredClone(library);c.dataSnapshot!.tasks[0].goal='只改本用例';assert.deepEqual(library,original);
 let team=c.dataSnapshot!;for(const [i,step] of c.steps.entries()){team=applyEvents(team,step);const input=buildModelInput(team,c,step,'multi',[]);assert.equal(input.evidence.find(e=>e.id==='analysis-test-incremental-delivery')?.version,i+1);}
 assert.equal(c.dataSnapshot!.evidence.find(e=>e.id==='analysis-test-incremental-delivery')?.version,1);
});
test('拒绝快照证据错误归属、跨团队快照及空创建需求',()=>{
 const state=fixtures();const c=state.cases.find(c=>c.id==='case-analysis-data-hierarchy')!;
 for(const mutate of [(item:any)=>item.dataSnapshot.evidence[0].taskId='missing',(item:any)=>item.dataSnapshot.id='other-team',(item:any)=>{item.steps[0].skillId='agentdoor-task-planner';item.steps[0].prompt='';}]){const bad=structuredClone(c);mutate(bad);assert.throws(()=>validateRelations(state.teams,[bad]));}
});

test('执行器冻结用例快照而非公共任务库，发送空说明的实际分析数据',async()=>{
 const {createRunner}=await import('./test-lab/runner.ts');const {createLabStore}=await import('./test-lab/store.ts');const {mkdtempSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const path=join(mkdtempSync(join(tmpdir(),'analysis-data-run-')),'state.json');const store=createLabStore(path,seedLab());
 let actual:any=null;
 const runner=createRunner(store,{apiKey:'fake',endpoint:'https://example.test',model:'fixture-model',maxOutputTokens:1000,timeoutMs:1000},async(_options,_instructions,input)=>{actual=input;return {rawOutput:'故意不模拟业务结论，只核对实际请求',usage:{inputTokens:0,outputTokens:0,totalTokens:0}};});
 const runs=runner.enqueue(['case-analysis-data-hierarchy'],'snapshot-request',{skillId:'agentdoor-task-status-analyzer',executionMode:'proposal'});await runner.idle();
 const run=store.get().runs.find(r=>r.id===runs[0].id)!;assert.equal(run.teamSnapshot.tasks.length,3);assert.equal(run.caseSnapshot.steps[0].prompt,'');assert.equal(actual.tasks.length,3);assert.equal(actual.evidence.length,5);assert.equal(actual.tasks.filter((t:any)=>t.parentId===actual.taskId).length,2);
 assert.equal(run.steps[0].structure,'failed');
});

test('旧公共团队污染迁移后重启不复发，所有人员用例继续有效',async()=>{
 const {createLabStore}=await import('./test-lab/store.ts');
 const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=mkdtempSync(join(tmpdir(),'member-isolation-'));
 try{
  const path=join(dir,'state.json');const initial=createLabStore(path,seedLab());const library=initial.getLibrary();const team=library.teams.find(t=>t.id==='lab-content')!;
  const baseIds=team.members.map(m=>m.id);const people=library.cases.filter(c=>c.origin==='people-analysis-v1');assert.equal(people.length,10);
  for(const c of people){const snapshot=c.dataSnapshot!;team.members.push(...structuredClone(snapshot.members));team.tasks.push(...structuredClone(snapshot.tasks));team.evidence.push(...structuredClone(snapshot.evidence));}
  initial.save(library.revision,library.teams,library.cases);
  const reopened=createLabStore(path,seedLab()).getLibrary();const clean=reopened.teams.find(t=>t.id==='lab-content')!;
  assert.deepEqual(clean.members.map(m=>m.id),baseIds);assert.ok(!clean.tasks.some(t=>t.id.startsWith('people-test-')));
  validateRelations(reopened.teams,reopened.cases);
  for(const c of reopened.cases.filter(c=>c.origin==='people-analysis-v1')){assert.ok(c.dataSnapshot!.members.some(m=>m.id===c.actorId));assert.ok(buildModelInput(c.dataSnapshot!,c,c.steps[0],'isolation',[]).evidence.length);}
  const again=createLabStore(path,seedLab()).getLibrary();assert.deepEqual(again.teams.find(t=>t.id==='lab-content')!.members,clean.members);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('创建与规划当前只使用输入内容及人员责任，默认不注入已有任务文件讨论',()=>{
 const state=seedLab();const team=state.teams.find(t=>t.id==='lab-content')!;const c=structuredClone(state.cases.find(c=>c.teamId===team.id&&c.steps[0].skillId==='agentdoor-task-planner')!);
 delete c.creationContext;c.steps[0].taskId=team.tasks[0]?.id??null;
 const input=buildModelInput(team,c,c.steps[0],'input-only',[]);
 assert.deepEqual(input.tasks,[]);assert.deepEqual(input.evidence,[]);assert.equal(input.taskId,null);assert.ok(input.members.length);assert.equal(input.message,c.steps[0].prompt);
});

test('进度验收有独立数值参考及五项输出检查，迁移幂等且答案不进入输入',async()=>{
 const {updateTaskAnalysisExpectations}=await import('./test-lab/task-analysis-expectations.ts');const state=fixtures();assert.equal(updateTaskAnalysisExpectations(state),true);
 const c=state.cases.find(c=>c.id==='case-analysis-test-page-ready')!;const checks=c.expectedOutput!.checks;
 assert.deepEqual(checks.find(x=>x.subject==='整体进度')!.expected,{displayPercent:50,completionPercent:50});
 assert.deepEqual((checks.find(x=>x.subject==='逐条标准完成度')!.expected as any[]).map(x=>x.percent),[100,100,0,0]);
 assert.ok(checks.some(x=>x.subject==='燃起图数据结构'));assert.ok(checks.some(x=>x.subject==='当前情况'));assert.ok(checks.some(x=>x.subject==='下一步建议'));
 const serialized=JSON.stringify(c.expectedOutput);assert.equal(updateTaskAnalysisExpectations(state),false);assert.equal(JSON.stringify(c.expectedOutput),serialized);
 const input=buildModelInput(c.dataSnapshot!,c,c.steps[0],'rubric',[]);assert.equal('expectedOutput' in input,false);assert.equal('assertions' in input,false);
});

test('每条参考分析绑定具体证据、权重和轮次，只提供给评判且修改输入后失效',async()=>{
 const {updateTaskAnalysisExpectations}=await import('./test-lab/task-analysis-expectations.ts');
 const state=fixtures();updateTaskAnalysisExpectations(state);
 const weighted=state.cases.find(c=>c.id==='case-analysis-test-weighted')!;
 const checks=weighted.expectedOutput!.checks.filter(x=>x.id.startsWith('analysis-reference-v2-'));
 assert.equal(checks.length,4);
 assert.match(JSON.stringify(checks),/120\/240=50%/);
 assert.match(JSON.stringify(checks),/analysis-test-weighted-delivery/);
 const multi=state.cases.find(c=>c.id==='case-analysis-test-incremental')!;
 const values=multi.expectedOutput!.checks.filter(x=>x.id.startsWith('analysis-reference-v2-')&&x.subject==='参考整体进度').map(x=>(x.expected as any).展示完成度);
 assert.deepEqual(values,[50,75,100]);
 const input=buildModelInput(weighted.dataSnapshot!,weighted,weighted.steps[0],'reference-test',[]);
 assert.equal(JSON.stringify(input).includes('参考整体进度'),false);
 const old=weighted.expectedOutput!.checks.find(x=>x.id.startsWith('analysis-reference-v2-'))!.id;
 weighted.dataSnapshot!.evidence[0].version++;
 updateTaskAnalysisExpectations(state);
 assert.notEqual(weighted.expectedOutput!.checks.find(x=>x.id.startsWith('analysis-reference-v2-'))!.id,old);
 assert.equal(weighted.expectedOutput!.checks.filter(x=>x.id.startsWith('analysis-reference-v2-')).length,4);
 assert.equal(updateTaskAnalysisExpectations(state),false);
});


test('排期用例仅保留真实成员及独立排期证据，迁移幂等',async()=>{
 const {addAnalysisTimingCases}=await import('./test-lab/analysis-timing-cases.ts');
 const state=fixtures();assert.equal(addAnalysisTimingCases(state),true);assert.equal(addAnalysisTimingCases(state),false);
 const cases=state.cases.filter(c=>c.origin==='analysis-timing-v3');assert.equal(cases.length,3);
 for(const c of cases){
  assert.ok(c.dataSnapshot!.members.length > 0);
  assert.ok(c.dataSnapshot!.members.every(m=>['zhou','xu','lin','jage'].includes(m.id)));
  assert.equal(new Set(c.dataSnapshot!.members.map(m=>m.id)).size,c.dataSnapshot!.members.length);
  const input=buildModelInput(c.dataSnapshot!,c,c.steps[0],'timing',[]) as any;
  const record=JSON.parse(input.evidence.find((e:any)=>e.title==='工作量历史、计划与执行安排.json').content);
  assert.equal(record.workload.length,2);assert.equal(record.executionSchedule.length,2);
  assert.equal(record.userCompletionConfirmation,null);
  assert.equal('expectedOutput' in input,false);assert.equal('forecastOn' in record,false);
 }
 validateRelations(state.teams,state.cases);
});

test('扩展用例隔离快照、证据归属正确、迁移幂等且参考不进入模型输入',async()=>{
 const {addExpandedSkillCases}=await import('./test-lab/expanded-skill-cases.ts');
 const state=fixtures();const baseline=structuredClone(state.teams);
 assert.equal(addExpandedSkillCases(state),true);assert.equal(addExpandedSkillCases(state),false);
 const added=state.cases.filter(c=>c.origin==='expanded-skills-v1');assert.equal(added.length,14);
 validateRelations(state.teams,state.cases);assert.deepEqual(state.teams,baseline);
 for(const c of added){
  const source=state.cases.find(s=>s.id===c.id.split('--')[0])!;
  assert.notDeepEqual(c.dataSnapshot!.evidence,source.dataSnapshot!.evidence);
  const input=buildModelInput(c.dataSnapshot!,c,c.steps[0],'expanded',[]) as any;
  assert.equal('expectedOutput' in input,false);assert.equal('assertions' in input,false);
  c.dataSnapshot!.tasks[0].goal='仅改扩展用例';assert.notEqual(source.dataSnapshot!.tasks[0].goal,'仅改扩展用例');
 }
});

test('复杂用例多轮版本、私密正文及证据指令隔离，参考不进入生成上下文',async()=>{
 const {addComplexSkillCases}=await import('./test-lab/complex-skill-cases.ts');
 const {addAnalysisTimingCases}=await import('./test-lab/analysis-timing-cases.ts');
 const state=fixtures();addAnalysisTimingCases(state);
 assert.equal(addComplexSkillCases(state),true);assert.equal(addComplexSkillCases(state),false);
 const cases=state.cases.filter(c=>c.origin==='complex-skills-v1');assert.equal(cases.length,18);
 validateRelations(state.teams,state.cases);editableSchema.parse({expectedRevision:state.revision,teams:state.teams,cases:state.cases});
 const privateCase=cases.find(c=>c.id.endsWith('complex-private'))!;
 const input=buildModelInput(privateCase.dataSnapshot!,privateCase,privateCase.steps[0],'private-test',[]);
 assert.equal(JSON.stringify(input).includes('SECRET_PRIVATE_RESULT_100'),false);
 const expanded=cases.find(c=>c.id.endsWith('complex-expand'))!;
 const later=applyEvents(expanded.dataSnapshot!,expanded.steps[1]);
 assert.equal(later.members.find(m=>m.id===expanded.actorId)!.version,4);
 assert.equal(expanded.dataSnapshot!.members.find(m=>m.id===expanded.actorId)!.version,3);
 for(const c of cases)for(const step of c.steps){const input=buildModelInput(applyEvents(c.dataSnapshot!,step),c,step,'complex-test',[]);assert.equal('expectedOutput' in input,false);}
});
