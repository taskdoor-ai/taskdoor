import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {seedLab} from './test-lab/seeds.ts';
import {createLabStore} from './test-lab/store.ts';
import {createRunner} from './test-lab/runner.ts';
import {loadSkill,compactPreviewSnapshot,productionSnapshot} from './test-lab/skills.ts';
import {splitSkillDocuments} from '../src/test-lab/markdown-files.ts';
import {updatePreviewCaseLibrary,updatePreviewAssignmentCriteria} from './test-lab/preview-case-library.ts';
import {availableTaskPreviewCases} from '../src/test-lab/task-preview-case.ts';
import {evaluateWithFallback} from './test-lab/judge-fallback.ts';
import {buildJevRequest} from './test-lab/jev-request.ts';
import {batchProgress} from '../src/test-lab/batch-progress.ts';
import {runTiming} from '../src/test-lab/run-timing.ts';
import type {LabRun,LabState} from '../src/test-lab/types.ts';

const options={apiKey:'test',endpoint:'https://example.com/responses',model:'test',maxOutputTokens:2000,timeoutMs:1000};
const makeStore=()=>{
  const store=createLabStore(join(mkdtempSync(join(tmpdir(),'preview-flow-')),'state.json'),seedLab());
  let state:LabState=store.getLibrary();
  state=store.addSkillVersion(state.revision,{skillId:'agentdoor-task-planner',label:'预览流程版',notes:'',snapshot:loadSkill('agentdoor-task-planner').snapshot});
  store.setSkillDefault(state.revision,'agentdoor-task-planner',state.skillVersions!.at(-1)!.id);
  state=store.getLibrary();store.saveModels(state.revision,['test'],true);
  return store;
};

test('当前方案用例标准只迁移一次，用户输入、其他 Skill、历史运行不改变',()=>{
  const store=makeStore();const state:LabState=store.getLibrary();
  const cases=availableTaskPreviewCases(state.cases,'lab-content');
  assert.ok(cases.length>4);assert.equal(cases.filter(c=>c.origin==='task-preview-flow-v1').length,4);
  assert.ok(cases.every(c=>c.previewCriteriaVersion===1));
  assert.ok(cases.every(c=>!c.reviewChecklist.join('').match(/get_task|真实MCP|真实工具|回读|set_task/)));
  const before=structuredClone(state);
  assert.equal(updatePreviewCaseLibrary(state),false);assert.deepEqual(state,before);
  const legacy=cases.find(c=>c.origin==='planning-core-v1')!;
  delete legacy.previewCriteriaVersion;legacy.reviewChecklist=['通过真实MCP创建，每个任务get_task回读。','林洁负责文案；标准保留30秒和350ml。'];delete legacy.expectedOutput;
  const prompt=legacy.steps[0].prompt;
  const historical={id:'historical',caseSnapshot:structuredClone(legacy)} as LabRun;
  state.runs=[historical];const historyBefore=structuredClone(historical);
  assert.equal(updatePreviewCaseLibrary(state),true);
  assert.deepEqual(state.runs[0],historyBefore);
  assert.equal(state.cases.find(c=>c.id===legacy.id)!.steps[0].prompt,prompt);
});

test('修改步骤接收上一轮真实方案，只生成两次、不执行 MCP，并在结构通过后判断一次',async()=>{
  const store=makeStore();let calls=0,judges=0,mcpCalls=0;let previous:any;
  const example=[...readFileSync(new URL('../skills/agentdoor-task-planner/references/task-preview.md',import.meta.url),'utf8').matchAll(/```json\n([\s\S]*?)\n```/g)].map(match=>JSON.parse(match[1])).find(plan=>plan.status==='ready'&&plan.tasks?.length===1&&plan.tasks[0].children?.length===0);
  const runner=createRunner(store,options,async(_o,_s,raw)=>{
    const input=raw as any;calls++;
    if(calls===2){assert.deepEqual(input.previousPlan,previous);assert.match(input.userRequest,/改为|改成|调整/);}
    else assert.equal(input.previousPlan,undefined);
    const output=structuredClone(calls===1?example:previous);output.requestId=input.requestId;
    const assign=(tasks:any[])=>tasks.forEach(t=>{t.ownerMemberId=input.currentMemberId;t.participants=[];assign(t.children);});assign(output.tasks);
    if(calls===2)output.tasks[0].dueDate='2026-12-20';
    previous=output;
    return {rawOutput:JSON.stringify(output),usage:{inputTokens:1,outputTokens:1,totalTokens:2}};
  },undefined,{model:'judge',configured:true,review:async id=>{judges++;return store.getRun(id)!;}},undefined,async()=>{mcpCalls++;throw Error('不应写入');});
  const [run]=runner.enqueue(['task-preview-flow-v1-date'],'preview-edit',{executionMode:'preview',judgeModel:'judge'});
  await runner.idle();const result=store.getRun(run.id)!;
  assert.equal(calls,2);assert.equal(judges,1);assert.equal(mcpCalls,0);
  assert.equal(result.steps.length,2);assert.ok(result.steps.every(s=>s.structure==='passed'));
  assert.equal(result.steps[1].output&&(result.steps[1].output as any).tasks[0].clientId,(result.steps[0].output as any).tasks[0].clientId);
  assert.equal(result.judgeStatus,'completed');
  for(const step of result.steps){const plan=step.output as any;assert.equal(plan.tasks.length,1);assert.deepEqual(plan.tasks[0].children,[]);}
  assert.equal((result.steps[1].output as any).tasks[0].dueDate,'2026-12-20');
});

test('结构修正仍失败时不请求判断模型或下一步骤，完成度结束、总耗时可用',async()=>{
  const store=makeStore();let calls=0,judges=0;
  const runner=createRunner(store,options,async()=>{calls++;return {rawOutput:'{"tasks":[]}',usage:{inputTokens:1,outputTokens:1,totalTokens:2}};},undefined,{model:'judge',configured:true,review:async id=>{judges++;return store.getRun(id)!;}});
  const [run]=runner.enqueue(['task-preview-flow-v1-date'],'invalid-preview',{executionMode:'preview',judgeModel:'judge'});
  await runner.idle();const result=store.getRun(run.id)!;
  assert.equal(calls,2);assert.equal(judges,0);assert.equal(result.steps.length,1);assert.equal(result.steps[0].previewAttempts?.length,2);assert.equal(result.status,'failed');assert.equal(result.judgeStatus,'skipped');
  assert.ok(result.steps[0].structureErrors.length);assert.equal(batchProgress([result]).percent,100);
  assert.equal(runTiming(result).totalMs,runTiming(result).generationMs);
});

test('预览裁判不要求创建回执，工具执行裁判仍保留真实执行要求',async()=>{
  const run={id:'r',status:'needs_review',model:'test',selection:{executionMode:'preview',judgeModel:'qwen/qwen3.7-plus'},caseSnapshot:{steps:[{id:'s1',prompt:'安排文案'}],reviewChecklist:['方案满足输入要求']},steps:[{stepId:'s1',input:{userRequest:'安排文案',members:[]},output:{tasks:[]},error:null}]} as unknown as LabRun;
  let prompt='';
  const modelCall=async(_o:any,instructions:string)=>{prompt=instructions;return {rawOutput:'{"items":[{"id":"q0","choice":"met","reason":"目标与用户要求一致"}]}',usage:{inputTokens:1,outputTokens:1,totalTokens:2}};};
  const preview=await evaluateWithFallback(run,{model:'jev',timeoutMs:1000},options,undefined,modelCall);
  assert.match(prompt,/没有调用 MCP 不是失败/);assert.doesNotMatch(prompt,/没有成功工具回执及回读不能/);
  assert.equal(preview.policyVersion,'task-preview-judge-v3');
  assert.match(JSON.stringify(buildJevRequest(run,'jev')),/No tool receipt or read-back is required/);
  run.selection!.executionMode='mcp';await evaluateWithFallback(run,{model:'jev',timeoutMs:1000},options,undefined,modelCall);
  assert.match(prompt,/没有成功工具回执及回读不能/);
});


test('职责标准允许合理替代人选，保留用户点名与业务约束；旧快照和归档用例不改',()=>{
  const state:LabState=seedLab();
  const base:LabState=makeStore().getLibrary();
  const template=structuredClone(base.cases.find(c=>c.id==='planning-core-v1-a-explicit')!);
  const old='林洁作为文案负责人；不增加投放。';
  template.reviewChecklist=[old];template.expectedOutput={version:1,checks:[{id:'assign',stepId:'s1',subject:'分配',criterion:old,expected:null}]};
  const archived={...structuredClone(template),id:'archived',archived:true};
  state.teams=base.teams;state.cases=[template,archived];state.runs=[{id:'history',caseSnapshot:structuredClone(template)} as LabRun];
  const before=structuredClone(state),version=template.version;
  assert.equal(updatePreviewAssignmentCriteria(state),true);
  assert.deepEqual(template.steps,before.cases[0].steps);assert.deepEqual(state.runs,before.runs);assert.deepEqual(archived,before.cases[1]);
  assert.equal(template.version,version+1);assert.ok(template.reviewChecklist[0].startsWith(old));
  assert.match(template.reviewChecklist[0],/其他合理人选也可通过/);assert.match(template.reviewChecklist[0],/用户点名.*仍须遵守/);
  assert.equal(template.expectedOutput.checks[0].criterion,template.reviewChecklist[0]);
  const once=structuredClone(state);assert.equal(updatePreviewAssignmentCriteria(state),false);assert.deepEqual(state,once);
});

test('两种预览裁判都按宽泛职责语义判断，保留明确人选，不向裁判发送隐藏团队资料',async()=>{
  const visible={userRequest:'让林洁负责活动记录',members:[{id:'lin',name:'林洁',responsibilities:['内容制作']},{id:'xu',name:'tiger huang',responsibilities:['品牌运营']} ]};
  const run={id:'broad',status:'needs_review',model:'test',selection:{executionMode:'preview',judgeModel:'deepseek/deepseek-v4.1-flash'},teamSnapshot:{privateNote:'hidden-team-note'},caseSnapshot:{steps:[{id:'s1',prompt:visible.userRequest}],reviewChecklist:['参考由 tiger huang 负责活动记录']},steps:[{stepId:'s1',input:visible,output:{tasks:[{ownerMemberId:'lin'}]},error:null}]} as unknown as LabRun;
  let prompt='',sent:any;
  await evaluateWithFallback(run,{model:'jev',timeoutMs:1000},options,undefined,async(_o,instructions,input)=>{prompt=instructions;sent=input;return {rawOutput:'{"items":[{"id":"q0","choice":"met","reason":"保留用户指定的负责人"}]}',usage:{inputTokens:1,outputTokens:1,totalTokens:2}};});
  assert.deepEqual(sent.steps[0].input,visible);assert.ok(!JSON.stringify(sent).includes('hidden-team-note'));
  assert.match(prompt,/不要求岗位描述逐字/);assert.match(prompt,/用户点名.*硬约束/);assert.match(prompt,/未由用户明确点名.*参考推荐/);
  const request=buildJevRequest(run,'jev');const instructions=(request.questions as any).q0.instructions.task;
  assert.match(instructions,/not exact wording/);assert.match(instructions,/Preserve explicit user selections/);
  assert.ok(!JSON.stringify(request).includes('hidden-team-note'));
});


test('预览提示将生产入口放在资料之后，保留所有冻结规则、示例与 schema',()=>{
  const skill=loadSkill('agentdoor-task-planner');
  const original=splitSkillDocuments(productionSnapshot('agentdoor-task-planner',skill.snapshot));
  const compact=splitSkillDocuments(compactPreviewSnapshot('agentdoor-task-planner',skill.snapshot));
  assert.deepEqual(compact.map(f=>f.path).sort(),original.map(f=>f.path).sort());
  assert.equal(compact.at(-1)!.path,'skills/agentdoor-task-planner/SKILL.md');
  for(const file of original){
    const result=compact.find(f=>f.path===file.path)!.content;
    if(file.path.endsWith('.json'))assert.deepEqual(JSON.parse(result),JSON.parse(file.content));
    else {
      const normalize=(text:string)=>text.replace(/```json\r?\n([\s\S]*?)\r?\n```/g,(_m,json)=>JSON.stringify(JSON.parse(json)));
      assert.equal(normalize(result).trimEnd(),normalize(file.content).trimEnd());
    }
  }
  assert.ok(compactPreviewSnapshot('agentdoor-task-planner',skill.snapshot).length<productionSnapshot('agentdoor-task-planner',skill.snapshot).length);
});


test('DeepSeek 预览默认快速生成，可切回低档推理，保存实际设置且不影响其他模型',async()=>{
  for(const [model,configured,expected] of [['deepseek/deepseek-v4.1-flash',undefined,'none'],['deepseek/deepseek-v4.1-flash','low','low'],['test',undefined,undefined]] as const){
    const store=makeStore();const state=store.getLibrary();store.saveModels(state.revision,[model],false);
    const example=JSON.parse(readFileSync(new URL('../skills/agentdoor-task-planner/references/task-preview.md',import.meta.url),'utf8').match(/```json\n([\s\S]*?)\n```/)![1]);
    const runner=createRunner(store,{...options,model,previewReasoningEffort:configured},async(actual,_prompt,raw)=>{
      assert.equal(actual.reasoningEffort,expected);assert.equal(actual.maxOutputTokens,options.maxOutputTokens);
      const input=raw as any;const output=structuredClone(example);output.requestId=input.requestId;
      const assign=(tasks:any[])=>tasks.forEach(t=>{t.ownerMemberId=input.currentMemberId;t.participants=[];assign(t.children);});assign(output.tasks);
      return {rawOutput:JSON.stringify(output),usage:{inputTokens:1,outputTokens:1,totalTokens:2}};
    });
    const [created]=runner.enqueue(['planning-core-v1-d-single'],'speed-'+model+(configured??'default'),{executionMode:'preview'});
    await runner.idle();const run=store.getRun(created.id)!;
    assert.equal(run.steps[0].structure,'passed');assert.equal(run.steps[0].modelSettings?.reasoningEffort,expected);assert.equal(run.steps[0].modelSettings?.maxOutputTokens,options.maxOutputTokens);
  }
});
