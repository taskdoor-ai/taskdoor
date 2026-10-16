import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {seedLab} from './test-lab/seeds.ts';
import {isTaskPreviewCase} from '../src/test-lab/task-preview-case.ts';
import type {LabCase,LabRun,LabState} from '../src/test-lab/types.ts';
import {applyCreationOutcomeCriteria,creationOutcomeCaseIds,creationOutcomeCriteria,updateCreationOutcomeCriteria} from './test-lab/creation-outcome-criteria.ts';
import {createLabStore} from './test-lab/store.ts';

function preview(id='user-imported'):LabCase {
  return {id,name:'用户已导入的创建用例',teamId:'lab-content',actorId:'zhou',category:'自定义',description:'保留用户专项内容',enabled:true,archived:false,version:7,
    steps:[{id:'s1',skillId:'agentdoor-task-planner',prompt:'只做一张商城主视觉，帮助顾客理解350ml容量。',taskId:null,usePreviousOutput:false,events:[]}],
    assertions:[],reviewChecklist:['用户专项：只做一张主视觉'],expectedOutput:{version:1,checks:[{id:'custom',stepId:'s1',subject:'用户专项',criterion:'用户专项：只做一张主视觉',expected:{count:1}}]}};
}
function stateWith(cases:LabCase[]):LabState {const state=seedLab();state.cases=cases;return state;}

test('对已有及后导入的预览用例补充当前九类标准，保留专项原文、输入及历史记录',()=>{
  const item=preview();const state=stateWith([item]);
  state.runs=[{id:'old-run',caseSnapshot:structuredClone(item),steps:[{rawOutput:'历史模型原文'}]} as LabRun];
  const before=structuredClone(state);
  assert.equal(updateCreationOutcomeCriteria(state),true);
  assert.equal(creationOutcomeCriteria.length,9);
  assert.equal(item.version,8);assert.deepEqual(item.steps,before.cases[0].steps);
  assert.deepEqual(item.expectedOutput!.checks[0],before.cases[0].expectedOutput!.checks[0]);
  assert.equal(item.expectedOutput!.checks.length,1+creationOutcomeCriteria.length);
  assert.ok(creationOutcomeCriteria.every(check=>item.expectedOutput!.checks.some(saved=>saved.id===check.id)));
  assert.ok(item.reviewChecklist.includes('用户专项：只做一张主视觉'));
  assert.deepEqual(state.runs,before.runs);
  const once=structuredClone(state);assert.equal(updateCreationOutcomeCriteria(state),false);assert.deepEqual(state,once);
  const later=preview('later-import');state.cases.push(later);
  assert.equal(updateCreationOutcomeCriteria(state),true);assert.equal(later.version,8);
  assert.deepEqual(state.cases.find(c=>c.id===item.id),once.cases[0]);
});

test('从已有复核标准构造期望输出，不丢失用户逐步骤验收内容',()=>{
  const item=preview();delete item.expectedOutput;
  item.verification={objective:'当前验收',preconditions:[],fixtureChecks:[],expectedResults:[{stepId:'s1',criteria:['这一步只保留350ml容量事实']}]};
  const state=stateWith([item]);updateCreationOutcomeCriteria(state);
  assert.ok(item.expectedOutput!.checks.some(check=>check.stepId==='s1'&&check.criterion==='这一步只保留350ml容量事实'));
  assert.ok(item.expectedOutput!.checks.some(check=>check.criterion==='用户专项：只做一张主视觉'));
  assert.deepEqual(item.verification.expectedResults,[{stepId:'s1',criteria:['这一步只保留350ml容量事实']}]);
});

test('混合技能、真实MCP/上下文用例、禁用及归档对象不追加预览标准',()=>{
  const mixed=preview('mixed');mixed.steps.push({...mixed.steps[0],id:'s2',skillId:'agentdoor-responsibility-advisor'});
  const mcp=preview('mcp');mcp.steps[0].taskId='script';
  const context=preview('context');context.contextMode='team_tasks';
  const asserted=preview('tool-assertion');asserted.assertions=[{id:'receipt',stepId:'s1',label:'真实回执',path:'receipt',operator:'exists',expected:null}];
  const disabled={...preview('disabled'),enabled:false}, archived={...preview('archived'),archived:true};
  const archivedTeam={...preview('archived-team'),teamId:'archived-team'};
  const state=stateWith([mixed,mcp,context,asserted,disabled,archived,archivedTeam]);
  state.teams.push({...structuredClone(state.teams[0]),id:'archived-team',archived:true});
  const before=structuredClone(state.cases);updateCreationOutcomeCriteria(state);
  assert.deepEqual(state.cases.slice(0,before.length),before);
});

test('修正旧数量验收对目标复述的要求，数量仍在完成标准中核对',()=>{
  const old='目标和完成标准保留20条、逐条对应、结果和核对依据。';
  const item=preview('workflow-focus-v1-lab-content-numbers');
  item.reviewChecklist=[old,'用户另加的数量要求：不能少于20条'];
  item.expectedOutput={version:1,checks:[{id:'numbers',stepId:'s1',subject:'明确数量',criterion:old,expected:null}]};
  const state=stateWith([item]);updateCreationOutcomeCriteria(state);
  const criterion=item.expectedOutput!.checks[0].criterion;
  assert.match(criterion,/完成标准.*20条/);assert.match(criterion,/目标.*用途|目标.*核对或交接/);
  assert.doesNotMatch(criterion,/目标和完成标准保留20条/);
  assert.ok(item.reviewChecklist.includes('用户另加的数量要求：不能少于20条'));
  assert.equal(item.reviewChecklist[0],criterion);
});

test('十个边界用例固定日期并可直接执行预览，日期清空后修改保留上一轮方案',()=>{
  const state=stateWith([]);assert.equal(updateCreationOutcomeCriteria(state),true);
  assert.equal(creationOutcomeCaseIds.length,10);
  const cases=creationOutcomeCaseIds.map(id=>state.cases.find(c=>c.id===id)!);
  assert.ok(cases.every(Boolean));assert.ok(cases.every(isTaskPreviewCase));
  assert.ok(cases.every(c=>c.steps.every(s=>s.evaluatedAt==='2026-10-16T04:00:00Z')));
  assert.ok(cases.every(c=>creationOutcomeCriteria.every(check=>c.expectedOutput!.checks.some(x=>x.id===check.id))));
  const clear=cases.find(c=>c.id.endsWith('clear-then-edit'))!;
  assert.equal(clear.steps.length,3);assert.deepEqual(clear.steps.map(s=>s.usePreviousOutput),[false,true,true]);
  assert.match(clear.steps[1].prompt,/清空|不设截止/);assert.match(clear.steps[2].prompt,/名称/);
  const specific=(suffix:string)=>JSON.stringify(cases.find(c=>c.id.endsWith(suffix))!.expectedOutput);
  assert.match(specific('supplied-metrics'),/10%/);assert.match(specific('supplied-metrics'),/3%/);
  assert.match(specific('no-metrics-delivery'),/不.*(?:销量|转化|KPI)/);
  assert.match(specific('unknown-purpose'),/needs_clarification/);
  assert.match(specific('research-evidence'),/假设/);
  assert.match(specific('finite-suggestion'),/AI.*建议|建议.*日期/);
  assert.match(specific('ongoing'),/null/);assert.match(specific('external-wait'),/null/);
  assert.match(specific('relative-date'),/2026-10-21/);
  assert.match(specific('past-explicit-date'),/2026-10-15/);assert.match(specific('past-explicit-date'),/风险|过期/);
  const once=structuredClone(state);assert.equal(updateCreationOutcomeCriteria(state),false);assert.deepEqual(state,once);
});

test('新增边界库不覆盖用户已经编辑的同名用例，无可用团队时不新建',()=>{
  const state=stateWith([]);updateCreationOutcomeCriteria(state);
  const edited=state.cases.find(c=>c.id===creationOutcomeCaseIds[0])!;
  edited.name='用户自行重命名';edited.steps[0].prompt='用户自行修改输入';
  const before=structuredClone(edited);assert.equal(updateCreationOutcomeCriteria(state),false);assert.deepEqual(edited,before);
  const none=stateWith([]);none.teams.forEach(team=>{team.archived=true;});
  assert.equal(updateCreationOutcomeCriteria(none),false);assert.equal(none.cases.length,0);
});

test('纯函数只处理传入用例，不改输入、版本或重新补入用户删除的库用例',()=>{
  const item=preview(),state=stateWith([item]),before=structuredClone(state);
  const cases=applyCreationOutcomeCriteria(state.teams,state.cases);
  assert.equal(cases.length,1);assert.equal(cases[0].version,7);assert.equal(cases[0].expectedOutput!.checks.length,1+creationOutcomeCriteria.length);
  assert.deepEqual(state,before);assert.equal(applyCreationOutcomeCriteria(state.teams,[]).length,0);
  assert.deepEqual(applyCreationOutcomeCriteria(state.teams,cases),cases);
});

test('已知旧目标标准仅升级一次且三处一致，不改用例输入或历史快照',()=>{
  const old='仅核对已输出的候选节点；合理 needs_clarification 且 tasks 为空时，不要求虚构目标字段，检查问题及已知边界即可。候选节点的 goal 说明为什么做、帮助谁理解/判断/继续工作或希望改变的状态，不能只是“完成/交付+标题”的换称。目的来自本次原话、已知上下文或紧邻用途；合理用途推断须简短标为建议，不能虚构痛点或收益。实质目的未知且会影响交付边界时补问，不把猜测写成 ready 的最终目标。';
  const item=preview('old-goal-criteria');item.previewCriteriaVersion=1;
  item.reviewChecklist=[old,'用户专项：只交一份脚本'];
  item.expectedOutput={version:1,checks:[{id:'creation-outcome-v1-goal',stepId:null,subject:'真实目标（O）',criterion:old,expected:null}]};
  item.verification={objective:'检查目标',preconditions:[],fixtureChecks:[],expectedResults:[{stepId:'s1',criteria:[old,'用户专项：只交一份脚本']}]};
  const state=stateWith([item]);state.runs=[{id:'old-goal-run',caseSnapshot:structuredClone(item),steps:[]} as unknown as LabRun];
  const before=structuredClone(state);assert.equal(updateCreationOutcomeCriteria(state),true);
  const current=creationOutcomeCriteria.find(check=>check.id==='creation-outcome-v1-goal')!.criterion;
  assert.match(current,/具体理解、判断或行动能力/);assert.match(current,/本身仍不够/);
  assert.equal(item.expectedOutput.checks[0].criterion,current);assert.equal(item.reviewChecklist[0],current);
  assert.equal(item.verification.expectedResults[0].criteria[0],current);
  assert.ok(item.reviewChecklist.includes('用户专项：只交一份脚本'));
  assert.deepEqual(item.steps,before.cases[0].steps);assert.deepEqual(state.runs,before.runs);
  assert.equal(item.version,8);
  const once=structuredClone(state);assert.equal(updateCreationOutcomeCriteria(state),false);assert.deepEqual(state,once);
});

test('通用目标ID被用户改写时保留自定义原文，不换写或补回默认目标规则',()=>{
  const custom='用户自己定义的目标标准：保留当前业务目的与专有名词。';
  const item=preview('custom-goal-id');item.previewCriteriaVersion=1;
  item.expectedOutput={version:1,checks:[{id:'creation-outcome-v1-goal',stepId:'s1',subject:'我的目标规则',criterion:custom,expected:{custom:true}}]};
  item.reviewChecklist=[custom];
  item.verification={objective:'自定义目标',preconditions:[],fixtureChecks:[],expectedResults:[{stepId:'s1',criteria:[custom]}]};
  const state=stateWith([item]),before=structuredClone(item);updateCreationOutcomeCriteria(state);
  assert.deepEqual(item.expectedOutput.checks[0],before.expectedOutput!.checks[0]);
  assert.equal(item.reviewChecklist[0],custom);assert.deepEqual(item.verification,before.verification);
  assert.ok(!item.reviewChecklist.includes(creationOutcomeCriteria[0].criterion));
  const once=structuredClone(state);assert.equal(updateCreationOutcomeCriteria(state),false);assert.deepEqual(state,once);
});

test('实际复测冻结快照中的首版目标、标准和日期规则升级，旧运行仍保持冻结',()=>{
  // Copied verbatim from the first caseSnapshot in retest-v16.runs.json.
  // Keep the small fixture independent of the local evaluation artifact directory.
  const frozen=JSON.parse(readFileSync(new URL('./test-lab/fixtures/creation-outcome-v1-initial-case.json',import.meta.url),'utf8')) as LabCase;
  const firstGoal=frozen.expectedOutput!.checks.find(check=>check.id==='creation-outcome-v1-goal')!.criterion;
  assert.ok(firstGoal.startsWith('逐节点核对 goal：'));
  const item=structuredClone(frozen),state=stateWith([item]);
  state.runs=[{id:'frozen-v16-retest',caseSnapshot:structuredClone(frozen),steps:[]} as unknown as LabRun];
  const before=structuredClone(state);assert.equal(updateCreationOutcomeCriteria(state),true);
  for(const id of ['creation-outcome-v1-goal','creation-outcome-v1-criteria','creation-outcome-v1-deadline']){
    const expected=creationOutcomeCriteria.find(check=>check.id===id)!.criterion;
    assert.equal(item.expectedOutput!.checks.find(check=>check.id===id)!.criterion,expected);
    assert.ok(item.reviewChecklist.includes(expected));
  }
  assert.match(item.steps[0].prompt,/让宣传受众理解已确认的产品用途与特点/);
  assert.match(item.steps[0].prompt,/只整理当前一项新任务/);
  assert.deepEqual(item.steps.map(({prompt,...step})=>step),before.cases[0].steps.map(({prompt,...step})=>step));
  assert.deepEqual(state.runs,before.runs);
  assert.equal(item.version,frozen.version+1);
  const once=structuredClone(state);assert.equal(updateCreationOutcomeCriteria(state),false);assert.deepEqual(state,once);
});

test('实际无指标主视觉快照同时升级截止规则与本例验收，不改输入、数量及历史',()=>{
  const frozen=JSON.parse(readFileSync(new URL('./test-lab/fixtures/creation-outcome-v16-no-metrics-case.json',import.meta.url),'utf8')) as LabCase;
  const previousSource='目标表达帮助商城访客理解容量和可拆洗特点、支持选购，不是“交付主视觉”换称；标准核对一张商城可用主视觉、350ml和可拆洗杯盖清楚呈现。不新增销量、转化率或KPI，不编尺寸；尺寸待核对可在warnings说明，不因这个可补信息阻断范围明确的方案。不因成员职责增加源文件/多渠道物料/访谈/效果测试，不要求制作任务保证访客已理解。';
  for(const sourceVersion of ['frozen-initial','previous-source']){
    const item=structuredClone(frozen);
    if(sourceVersion==='previous-source'){
      const original=item.expectedOutput!.checks.find(check=>check.id==='scenario-1')!.criterion;
      item.expectedOutput!.checks.find(check=>check.id==='scenario-1')!.criterion=previousSource;
      item.reviewChecklist=item.reviewChecklist.map(text=>text===original?previousSource:text);
    }
    const state=stateWith([item]);updateCreationOutcomeCriteria(state);
    state.runs=[{id:'frozen-null-date-'+sourceVersion,caseSnapshot:structuredClone(frozen),steps:[]} as unknown as LabRun];
    // Simulate the same old saved case already present in an otherwise migrated 84-case library.
    const originalCount=state.cases.length;state.cases[0]=structuredClone(sourceVersion==='previous-source'?{...frozen,expectedOutput:{version:1,checks:frozen.expectedOutput!.checks.map(check=>check.id==='scenario-1'?{...check,criterion:previousSource}:check)},reviewChecklist:frozen.reviewChecklist.map(text=>text===frozen.expectedOutput!.checks.find(check=>check.id==='scenario-1')!.criterion?previousSource:text)}:frozen);
    const before=structuredClone(state);assert.equal(updateCreationOutcomeCriteria(state),true);
    const updated=state.cases[0];
    const deadline=updated.expectedOutput!.checks.find(check=>check.id==='creation-outcome-v1-deadline')!.criterion;
    const scenario=updated.expectedOutput!.checks.find(check=>check.id==='scenario-1')!.criterion;
    assert.match(deadline,/制作规格/);assert.match(deadline,/不自动.*(?:等待|归类)/);
    assert.match(scenario,/dueDate.*2026-10-16/);assert.match(scenario,/warnings.*任务.*日期.*假设/);
    assert.match(scenario,/不得.*尺寸.*null|不能.*尺寸.*null/);
    assert.ok(updated.reviewChecklist.includes(deadline));assert.ok(updated.reviewChecklist.includes(scenario));
    assert.deepEqual(updated.steps,before.cases[0].steps);assert.deepEqual(state.runs,before.runs);
    assert.equal(state.cases.length,originalCount);
    const once=structuredClone(state);assert.equal(updateCreationOutcomeCriteria(state),false);assert.deepEqual(state,once);
  }
});

test('本例自定义验收与自定义同ID日期规则不被已知版本升级覆盖',()=>{
  const item=preview('creation-outcome-v1-no-metrics-delivery');item.previewCriteriaVersion=1;
  const customScenario='用户调整后的本例验收：只核对已确认用途。',customDeadline='用户自己的截止日期规则，保留当前业务约定。';
  item.expectedOutput={version:1,checks:[{id:'scenario-1',stepId:'s1',subject:'我的场景',criterion:customScenario,expected:null},{id:'creation-outcome-v1-deadline',stepId:null,subject:'我的日期',criterion:customDeadline,expected:null}]};
  item.reviewChecklist=[customScenario,customDeadline];
  const state=stateWith([item]),before=structuredClone(item);updateCreationOutcomeCriteria(state);
  assert.deepEqual(item.expectedOutput.checks.slice(0,2),before.expectedOutput!.checks);
  assert.ok(!item.reviewChecklist.includes(creationOutcomeCriteria.find(check=>check.id==='creation-outcome-v1-deadline')!.criterion));
});

test('store.save立即补全新导入标准，重复保存和重载不升版本或修改历史快照',()=>{
  const dir=mkdtempSync(join(tmpdir(),'taskdoor-outcome-criteria-'));
  try{
    const path=join(dir,'state.json'),store=createLabStore(path,seedLab());
    const before=store.getLibrary();
    const imported=preview('saved-import');delete imported.expectedOutput;
    const history={id:'preserved-history',caseSnapshot:structuredClone(imported),steps:[],teamSnapshot:structuredClone(before.teams[0]),status:'needs_review'} as unknown as LabRun;
    store.appendRuns([history]);
    const current=store.getLibrary();
    const saved=store.save(current.revision,current.teams,[...current.cases,imported]);
    const result=saved.cases.find(c=>c.id===imported.id)!;
    assert.ok(creationOutcomeCriteria.every(check=>result.expectedOutput!.checks.some(actual=>actual.id===check.id)));
    assert.ok(result.reviewChecklist.includes('用户专项：只做一张主视觉'));
    const same=store.save(saved.revision,saved.teams,saved.cases);
    assert.equal(same.cases.find(c=>c.id===imported.id)!.version,result.version);
    assert.deepEqual(store.getRun(history.id),history);
    const reload=createLabStore(path,seedLab());
    assert.deepEqual(reload.getLibrary().cases.find(c=>c.id===imported.id),result);
    assert.deepEqual(reload.getRun(history.id),history);
    // Saving itself must not restore a deliberately removed focused library case.
    const latest=reload.getLibrary();
    const without=latest.cases.filter(c=>c.id!==creationOutcomeCaseIds[0]);
    const deleted=reload.save(latest.revision,latest.teams,without);
    assert.ok(!deleted.cases.some(c=>c.id===creationOutcomeCaseIds[0]));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
