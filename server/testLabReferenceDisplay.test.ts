import test from 'node:test';
import assert from 'node:assert/strict';
import {describeReference,compareReference,formatActualValue,acceptanceCheckSections,analysisProgressReference,analysisCriterionReference,analysisWorkloadReference} from '../src/test-lab/reference-display.ts';
import type {LabCase} from '../src/test-lab/types.ts';
type ReferenceCase=Pick<LabCase,'assertions'|'expectedOutput'>;

test('固定数值参考显示精确值，并区分一致与偏差',()=>{
 const reference=describeReference(50,{unit:'percent'});
 assert.equal(reference.kind,'exact');
 assert.equal(reference.label,'50%');
 assert.equal(compareReference(50,reference).status,'match');
 assert.equal(compareReference(75,reference).status,'mismatch');
});

test('明确 null 参考要求无法估计，缺失数值不是未知要求',()=>{
 const unknown=describeReference(null,{unit:'percent'});
 const missing=describeReference(undefined,{unit:'percent'});
 assert.equal(unknown.label,'应无法估计');
 assert.equal(compareReference(null,unknown).status,'match');
 assert.equal(compareReference(0,unknown).status,'mismatch');
 assert.equal(missing.kind,'missing');
 assert.equal(missing.label,'未设固定数值');
 assert.equal(compareReference(undefined,missing).status,'unverified');
 assert.notEqual(compareReference(undefined,missing).label,'一致');
 assert.equal(formatActualValue(undefined,{unit:'percent'}),'未返回');
 assert.equal(formatActualValue(null,{unit:'percent'}),'无法估计');
});

test('允许 25/50/75 的部分完成档不显示为未知',()=>{
 for(const context of [{允许AI参考完成度:[25,50,75]},{allowedPercents:[25,50,75]}]){
  const reference=describeReference(undefined,{field:'AI参考完成度',unit:'percent',context});
  assert.equal(reference.kind,'allowed');
  assert.equal(reference.label,'允许 25% / 50% / 75%');
  assert.equal(compareReference(50,reference).status,'match');
  assert.equal(compareReference(0,reference).status,'mismatch');
 }
});

test('只有计算依据或判断规则时按规则核对，不声称数值存在偏差',()=>{
 const formula=describeReference(undefined,{unit:'percent',context:{计算依据:'按有效投入加权'}});
 const rule=describeReference(undefined,{unit:'percent',rule:'保留有效成果并说明缺口'});
 assert.equal(formula.label,'按公式核对');
 assert.equal(formula.detail,'按有效投入加权');
 assert.equal(rule.label,'按规则核对');
 assert.equal(compareReference(50,formula).status,'unverified');
 assert.equal(compareReference(50,rule).label,'按规则核对');
});

test('原始参考为空但展示参考已有数值时明确需补基准，不借实际值补齐',()=>{
 const reference=describeReference(null,{field:'原始完成度',unit:'percent',context:{展示完成度:100,原始完成度:null}});
 assert.equal(reference.kind,'incomplete');
 assert.equal(reference.label,'需补数值基准');
 assert.equal(compareReference(100,reference).status,'unverified');
 assert.equal(compareReference(null,reference).status,'unverified');
 const trueUnknown=describeReference(null,{field:'原始完成度',unit:'percent',context:{展示完成度:null,原始完成度:null}});
 assert.equal(trueUnknown.kind,'unknown');
});

test('空历史是明确零节点，未提供历史保持缺失且不能判一致',()=>{
 const empty=describeReference([],{field:'历史节点',unit:'count'});
 const missing=describeReference(undefined,{field:'历史节点',unit:'count'});
 assert.equal(empty.value,0);
 assert.equal(empty.label,'无历史节点（0 个）');
 assert.equal(compareReference(0,empty).status,'match');
 assert.equal(compareReference(undefined,empty).status,'unverified');
 assert.equal(compareReference(undefined,missing).status,'unverified');
 assert.equal(formatActualValue([],{field:'历史节点',unit:'count'}),'无历史节点（0 个）');
});

test('明确没有确认或预测日期与缺失字段分别展示',()=>{
 const confirmed=describeReference(null,{field:'确认完成'});
 const forecast=describeReference(null,{field:'预计完成'});
 assert.equal(confirmed.label,'应无确认记录');
 assert.equal(forecast.label,'应无预测日期');
 assert.equal(compareReference(null,confirmed).status,'match');
 assert.equal(compareReference(undefined,confirmed).status,'unverified');
 assert.equal(formatActualValue(null,{field:'确认完成'}),'尚无确认记录');
 assert.equal(formatActualValue(undefined,{field:'确认完成'}),'未返回');
});

test('日期差明确不可计算时空值有含义，两边缺值不能判一致',()=>{
 const absent=describeReference(null,{field:'计划日期差',unit:'days'});
 assert.equal(absent.label,'应无法计算日期差');
 assert.equal(compareReference(null,absent).status,'match');
 assert.equal(compareReference(undefined,absent).status,'unverified');
 assert.equal(describeReference(-2,{unit:'days'}).label,'-2 天');
});

test('有参考分析仍保留新增范围、估算、历史等实质业务验收',()=>{
 const checks=[
  {id:'analysis-reference-v2-progress',subject:'参考整体进度',criterion:'对照参考',expected:{展示完成度:50}},
  {id:'analysis-v5-progress',subject:'整体进度',criterion:'通用梯度及结构规则',expected:null},
  {id:'scope-increment',subject:'新增范围',criterion:'英文增量应补估且不重复累计',expected:null},
  {id:'estimate',subject:'初始估算',criterion:'AI估算不得冒充人工确认',expected:null},
  {id:'history',subject:'历史变化',criterion:'保留有效中文成果',expected:null},
 ];
 const sections=acceptanceCheckSections(checks);
 assert.deepEqual(sections.primary.map(x=>x.id),['analysis-reference-v2-progress','scope-increment','estimate','history']);
 assert.deepEqual(sections.details.map(x=>x.id),['analysis-v5-progress']);
 assert.equal(sections.hasReferences,true);
});

test('没有参考分析时不折叠验收，带具体预期的通用项也保持可审阅',()=>{
 const ordinary={id:'analysis-v5-progress',subject:'整体进度',criterion:'规则',expected:{displayPercent:50}};
 assert.deepEqual(acceptanceCheckSections([ordinary]).primary,[ordinary]);
 const reference={...ordinary,id:'analysis-reference-v2-progress'};
 assert.deepEqual(acceptanceCheckSections([reference,ordinary]).primary,[reference,ordinary]);
});

test('严格业务基准优先使用英文数值字段，不被旧参考覆盖',()=>{
 const item:ReferenceCase={assertions:[],expectedOutput:{version:1,checks:[
  {id:'old',stepId:'s1',subject:'参考整体进度',criterion:'旧参考',expected:{展示完成度:25,原始完成度:25}},
  {id:'strict',stepId:'s1',subject:'经业务证据核对的进度基准',criterion:'独立工作量核对',expected:{totalEwdMinutes:240,completedEwdMinutes:120,completionPercent:50,displayPercent:50,依据:'两项工作已完成'}},
 ]}};
 const reference=analysisProgressReference(item,'s1');
 assert.equal(reference.display.label,'50%');
 assert.equal(reference.raw?.label,'50%');
});

test('严格动态估算基准展示工作量公式，不能取实际输出补固定比例',()=>{
 const item:ReferenceCase={assertions:[],expectedOutput:{version:1,checks:[{id:'strict',stepId:'s1',subject:'经业务证据核对的进度基准',criterion:'独立工作量核对',expected:{formula:'T=240+新增英文e；e>0；C=240',completedEwdMinutes:240,依据:'保留中文成果，只补英文增量'}}]}};
 const reference=analysisProgressReference(item,'s1');
 assert.equal(reference.display.label,'按工作量计算');
 assert.equal(reference.display.detail,'T=240+新增英文e；e>0；C=240');
 assert.equal(compareReference(75,reference.display).status,'unverified');
});

test('严格逐条断言支持固定值和25到75允许档位',()=>{
 const assertions=[
  {id:'one',label:'完整交付',stepId:'s1',path:'result.criterionAssessments.0.percent',operator:'equals' as const,expected:100},
  {id:'low',label:'部分成果',stepId:'s1',path:'result.criterionAssessments.1.percent',operator:'gte' as const,expected:25},
  {id:'high',label:'仍有缺口',stepId:'s1',path:'result.criterionAssessments.1.percent',operator:'lte' as const,expected:75},
 ];
 assert.equal(analysisCriterionReference({assertions},'s1',0,'标准一').label,'100%');
 assert.equal(analysisCriterionReference({assertions},'s1',1,'标准二').label,'允许 25% / 50% / 75%');
});

test('严格来源基准映射保存的创建、历史、计划、预测及日期',()=>{
 const creation={at:'2026-10-05',scopeMinutes:240};
 const workload=[{at:'2026-10-05',scopeMinutes:240,completedMinutes:0}];
 const planned={scopeVersion:'scope-1',points:[{at:'2026-10-12',completedMinutes:240}]};
 const forecast=[{at:'2026-10-14',completedMinutes:240}];
 const reference=analysisWorkloadReference({creation,workload,planned,forecast,startOn:'2026-10-05',dueOn:'2026-10-12',forecastOn:'2026-10-14'});
 assert.equal(reference.mode,'sources');
 assert.equal(reference.values.计划截止,'2026-10-12');
 assert.equal(reference.values.预计完成,'2026-10-14');
 assert.equal(reference.values.创建日期,creation.at);
 assert.equal(reference.values.初始投入,240);
 assert.deepEqual(reference.values.历史节点,workload);
 assert.deepEqual(reference.values.计划节点,planned.points);
 assert.deepEqual(reference.values.预测节点,forecast);
 assert.equal(reference.values.正式开始,'2026-10-05');
 assert.equal(reference.values.确认完成,undefined);
});

test('严格没有历史基准保留 comparison=null 与原因，不生成空日期参考',()=>{
 const reference=analysisWorkloadReference({comparison:null,reason:'没有真实历史和正式起点'});
 assert.equal(reference.mode,'empty');
 assert.equal(reference.values.comparison,null);
 assert.equal(reference.detail,'没有真实历史和正式起点');
 assert.equal(reference.values.计划截止,undefined);
});
