import test from 'node:test';
import assert from 'node:assert/strict';
import {seedLab} from './test-lab/seeds.ts';
import {addPeopleAnalysisCases} from './test-lab/people-analysis-cases.ts';
import {editableSchema,validateRelations} from './test-lab/schema.ts';
import {buildModelInput} from './test-lab/context.ts';
import {validateOutput} from './test-lab/validation.ts';
import {loadSkill} from './test-lab/skills.ts';
import {availablePeopleAnalysisCases} from '../src/test-lab/task-preview-case.ts';
test('人员分析十个用例有独立成员和关联任务正文，不泄漏预期',()=>{
 const state=seedLab();const memberCount=state.teams.find(t=>t.id==='lab-content')!.members.length;assert.equal(addPeopleAnalysisCases(state),true);assert.equal(state.teams.find(t=>t.id==='lab-content')!.members.length,memberCount);
 editableSchema.parse({expectedRevision:state.revision,teams:state.teams,cases:state.cases});validateRelations(state.teams,state.cases);
 const cases=state.cases.filter(c=>c.origin==='people-analysis-v1');assert.equal(cases.length,10);
 for(const c of cases){const team=c.dataSnapshot!;const input=buildModelInput(team,c,c.steps[0],'people',[]);
 assert.equal(input.tasks.length,3);assert.equal(input.members.length,2);assert.equal(input.evidence.length,7);assert.equal('assertions' in input,false);assert.equal('expectedOutput' in input,false);
 assert.ok(input.evidence.every(e=>input.tasks.some(t=>t.id===e.taskId)));assert.ok(input.evidence.some(e=>e.kind==='文件'&&e.content));
 assert.ok('peopleContext' in input);assert.equal(input.responsibilityVersion,3);
 assert.equal(availablePeopleAnalysisCases(state.cases,c.teamId,c.steps[0].skillId).filter(x=>x.origin==='people-analysis-v1').length,c.steps[0].skillId==='agentdoor-member-matcher'?6:4);
 }
 const count=state.cases.length;cases[0].steps[0].prompt='用户修改';assert.equal(addPeopleAnalysisCases(state),false);assert.equal(state.cases.length,count);assert.equal(cases[0].steps[0].prompt,'用户修改');
});
test('两项Skill可加载为完整冻结包',()=>{for(const id of ['agentdoor-member-matcher','agentdoor-responsibility-advisor'] as const){const skill=loadSkill(id);assert.ok(skill.snapshot.includes(`name: ${id}`));assert.ok(skill.snapshot.includes('output-contract.md'));}});
test('匹配契约拒绝候选、责任版本、角色与业务写入错误',()=>{
 const state=seedLab();addPeopleAnalysisCases(state);const c=state.cases.find(c=>c.id==='case-people-test-full-match')!;const team=c.dataSnapshot!;const input=buildModelInput(team,c,c.steps[0],'validate',[]) as any;
 const output:any={schemaVersion:'agentdoor.member-match.v0.1',skillId:'agentdoor-member-matcher',ruleVersion:'MEMBER-MATCH-2026-10-10-v1',requestId:input.requestId,principalId:input.principalId,teamId:input.teamId,inputVersions:input.inputVersions,coverage:input.coverage,evaluatedAt:input.evaluatedAt,status:'ready',result:{taskId:input.taskId,taskVersion:2,candidates:[{memberId:c.actorId,responsibilityVersion:3,matchLevel:'high',suggestedRole:'owner',matchedRequirements:['脚本交付'],gaps:[],pendingChecks:[],reason:'正式责任覆盖',evidenceRefs:[c.actorId,input.taskId]}],recommendedOwnerId:c.actorId,assignmentUnchanged:true},evidenceRefs:[],unknowns:[],warnings:[],writeReceipt:null};
 assert.deepEqual(validateOutput('agentdoor-member-matcher',output,input),[]);
 for(const mutate of [(o:any)=>o.result.candidates[0].responsibilityVersion=2,(o:any)=>o.result.candidates[0].memberId='outsider',(o:any)=>o.result.candidates[0].matchLevel='unknown',(o:any)=>o.writeReceipt={success:true},(o:any)=>o.result.taskVersion=1]){const bad=structuredClone(output);mutate(bad);assert.ok(validateOutput('agentdoor-member-matcher',bad,input).length);}
});

test('人员参考答案覆盖所有梯度，逐轮冻结，迁移幂等且不泄漏到生成输入',async()=>{
 const {updatePeopleAnalysisReferences}=await import('./test-lab/people-analysis-reference.ts');
 const state=seedLab();addPeopleAnalysisCases(state);assert.equal(updatePeopleAnalysisReferences(state),true);assert.equal(updatePeopleAnalysisReferences(state),false);
 const grades=new Set<unknown>();
 for(const c of state.cases.filter(c=>c.steps.some(s=>['agentdoor-responsibility-advisor','agentdoor-member-matcher'].includes(s.skillId)))){
  assert.ok(c.expectedOutput?.checks.some(x=>x.id.startsWith('people-reference-v2-')));
  const input=buildModelInput(c.dataSnapshot??state.teams.find(t=>t.id===c.teamId)!,c,c.steps[0],'reference',[]);
  assert.ok(!JSON.stringify(input).includes('people-reference-v2-'));assert.equal('expectedOutput' in input,false);
  const matching=c.expectedOutput!.checks.find(x=>x.subject==='参考人员匹配');if(matching)grades.add((matching.expected as any)[0].匹配百分比);
 }
 assert.deepEqual([...grades].sort((a:any,b:any)=>(a??-1)-(b??-1)),[null,0,25,50,75,100]);
 const multi=state.cases.find(c=>c.id==='case-feedback')!;const rounds=multi.expectedOutput!.checks.filter(x=>x.subject==='参考责任更新');assert.equal(rounds.length,2);assert.notEqual((rounds[0].expected as any).责任基准版本,(rounds[1].expected as any).责任基准版本);
 const changed=state.cases.find(c=>c.id==='case-people-test-sustained')!;changed.dataSnapshot!.members[0].version++;assert.equal(updatePeopleAnalysisReferences(state),true);
});
test('新匹配契约不允许百分比和覆盖依据冲突',()=>{
 const state=seedLab();addPeopleAnalysisCases(state);const c=state.cases.find(c=>c.id==='case-people-test-full-match')!;const input=buildModelInput(c.dataSnapshot!,c,c.steps[0],'scores',[]) as any;
 const output:any={schemaVersion:'agentdoor.member-match.v0.1',skillId:'agentdoor-member-matcher',ruleVersion:'MEMBER-MATCH-2026-10-11-v2',requestId:input.requestId,principalId:input.principalId,teamId:input.teamId,inputVersions:input.inputVersions,coverage:input.coverage,evaluatedAt:input.evaluatedAt,status:'ready',result:{taskId:input.taskId,taskVersion:2,candidates:[{memberId:c.actorId,responsibilityVersion:3,matchLevel:'high',matchPercent:100,requirementAssessments:[{requirement:'脚本交付与卖点核对',coverage:'full',reason:'正式责任完整覆盖',evidenceRefs:[c.actorId,input.taskId]}],suggestedRole:'owner',matchedRequirements:['脚本交付与卖点核对'],gaps:[],pendingChecks:['参与权限尚未核验'],reason:'正式责任覆盖',evidenceRefs:[c.actorId,input.taskId]}],recommendedOwnerId:c.actorId,assignmentUnchanged:true},evidenceRefs:[],unknowns:[],warnings:[],writeReceipt:null};
 assert.deepEqual(validateOutput('agentdoor-member-matcher',output,input),[]);
 for(const mutate of [(o:any)=>delete o.result.candidates[0].matchPercent,(o:any)=>o.result.candidates[0].matchPercent=50,(o:any)=>o.result.candidates[0].requirementAssessments[0].coverage='unknown',(o:any)=>o.result.candidates[0].matchPercent=82]){const bad=structuredClone(output);mutate(bad);assert.ok(validateOutput('agentdoor-member-matcher',bad,input).length);}
});

 test('复杂匹配参考随每轮正式责任变化，旧参考缓存必须更新',async()=>{
 const {buildAnalysisDataFixtures}=await import('./test-lab/analysis-data-fixtures.ts');
 const {addComplexSkillCases}=await import('./test-lab/complex-skill-cases.ts');
 const {updatePeopleAnalysisReferences}=await import('./test-lab/people-analysis-reference.ts');
 const state=seedLab();addPeopleAnalysisCases(state);buildAnalysisDataFixtures(state);addComplexSkillCases(state);
 updatePeopleAnalysisReferences(state);
 const c=state.cases.find(c=>c.id==='case-people-test-partial-match--complex-expand')!;
 const matches=c.expectedOutput!.checks.filter(x=>x.subject==='参考人员匹配');
 assert.deepEqual(matches.map(x=>(x.expected as any)[0].匹配百分比),[50,100]);
 const second=c.expectedOutput!.checks.find(x=>x.stepId==='s2'&&x.subject==='参考匹配依据')!;
 assert.equal((second.expected as any).推荐负责人,c.actorId);
 assert.match((second.expected as any).缺口,/全部覆盖/);
 c.assertions=c.assertions.filter(a=>a.path!=='result.candidates.0.matchPercent');
 assert.equal(addComplexSkillCases(state),true);
 assert.equal(addComplexSkillCases(state),false);
 c.expectedOutput!.checks.forEach(x=>{if(x.id.startsWith('people-reference-'))x.id=x.id.replace(/people-reference-v2-[^-]+-/, 'people-reference-v2-obsolete-');});
 assert.equal(updatePeopleAnalysisReferences(state),true);
 assert.equal(updatePeopleAnalysisReferences(state),false);
 assert.deepEqual(c.expectedOutput!.checks.filter(x=>x.subject==='参考人员匹配').map(x=>(x.expected as any)[0].匹配百分比),[50,100]);
 });
