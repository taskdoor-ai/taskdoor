import {isDeepStrictEqual} from 'node:util';
import type {AssertionResult,Json,LabAssertion,LabCase,LabTeam} from '../../src/test-lab/types.ts';
import {applyEvents} from './context.ts';
import {readPath} from './assertions.ts';

export const strictAnalysisOrigin='strict-analysis-evidence-v1';
const keys=['not-started','all-evidence','unknown','new-scope','weighted','superseded','discussion-conflict','confirmed-gap','hierarchy','release-condition','timing-ahead','timing-on-time','timing-delayed','reschedule','unreadable-injection','missing-estimate','ai-estimate-revision','confirmed-estimate-reuse'] as const;
type FixtureKey=typeof keys[number];
type RecordValue=Record<string,any>;
type Baseline={key:FixtureKey;stepId:string;taskId:string;total?:number;completed:number|null;criteria:(number|null|number[])[];criterionIds:string[];criterionTexts:string[];reason:string;oldItems?:{criterionId:string;minutes:number}[];estimate:'optional'|'required'|'forbidden';history?:{creation:RecordValue;workload:RecordValue[];plan:RecordValue;startOn:string;dueOn:string|null;forecast:RecordValue[];scopeVersion:string}};

function fixtureKey(c:LabCase):FixtureKey{
 const tagged=c.origin===strictAnalysisOrigin?c.tags?.find(t=>t.startsWith('strict-fixture:'))?.slice('strict-fixture:'.length):undefined;
 const original={'case-analysis-data-hierarchy':'hierarchy','case-analysis-data-dependency':'release-condition','case-analysis-timing-delayed--complex-reschedule':'reschedule','case-analysis-test-unreadable--complex-injection':'unreadable-injection'} as Record<string,string>;
 const key=tagged??original[c.id]??c.id.replace(/^.*regression-20261014-analysis-/,'').replace(/^case-analysis-test-/,'').replace(/^case-analysis-/,'');
 if(!keys.includes(key as FixtureKey))throw Error('缺少已审计的fixture来源；不能根据输出猜验收基准');
 return key as FixtureKey;
}
export function isStrictAnalysisCase(c:LabCase){return c.origin===strictAnalysisOrigin&&c.tags?.some(t=>t.startsWith('strict-fixture:')&&keys.includes(t.slice('strict-fixture:'.length) as FixtureKey))===true;}
function requireFact(condition:unknown,message:string):asserts condition{if(!condition)throw Error(`业务快照不符合已审基准：${message}`);}
function number(value:unknown):value is number{return typeof value==='number'&&Number.isFinite(value);}
function near(actual:unknown,expected:number){return number(actual)&&Math.abs(actual-expected)<=0.0001;}
function grade(percent:number){return percent===0?0:percent>=100?100:Math.max(25,Math.min(75,Math.round(percent/25)*25));}
function snapshotAt(c:LabCase,stepId:string):LabTeam{
 requireFact(c.dataSnapshot,'缺少冻结业务快照');let snapshot=structuredClone(c.dataSnapshot);
 for(const step of c.steps){snapshot=applyEvents(snapshot,step);if(step.id===stepId)return snapshot;}
 throw Error('未找到冻结步骤');
}
function readJson(text:string){try{return JSON.parse(text) as RecordValue;}catch{return undefined;}}

/** Only these authored fixtures are accepted; changed facts require a new reviewed baseline. */
function baseline(c:LabCase,stepId:string):Baseline{
 const key=fixtureKey(c),snapshot=snapshotAt(c,stepId),step=c.steps.find(s=>s.id===stepId)!;
 const task=snapshot.tasks.find(t=>t.id===step.taskId);requireFact(task,'缺少目标任务');
 const files=snapshot.evidence.filter(e=>e.taskId===task.id&&e.kind==='文件'&&e.readState!=='unavailable');
 const records=files.flatMap(f=>{const value=readJson(f.content);return value?[value]:[];});
 const ids=task.criteria?.items.map(i=>i.id);requireFact(ids&&ids.length===task.acceptanceCriteria.length,'缺少真实标准ID或独立版本');
 const base:Baseline={key,stepId,taskId:task.id,completed:0,criteria:[],criterionIds:ids,criterionTexts:task.acceptanceCriteria,estimate:'optional',reason:''};
 if(['missing-estimate','ai-estimate-revision','confirmed-estimate-reuse'].includes(key)){
  if(key==='missing-estimate'){
   const scope=records.find(r=>r.recordType==='当前工作条件');
   requireFact(scope?.savedEstimate===null&&scope.deliverable?.count===1&&scope.deliverable?.maxChineseCharacters===300&&scope.conditions?.factsApproved&&scope.conditions?.templateAvailable&&scope.conditions?.revisionPasses===1&&scope.conditions?.reviewPasses===1,'缺估场景的数量、资料与方法不完整');
   requireFact(files.some(f=>f.content.includes('尚未开始制作、修改或逐句核对')),'缺估场景缺少明确未开始证据');
   return {...base,criteria:[0,0],estimate:'required',reason:'一份不超过300字的通知，资料、模板、修改与核验条件明确；正文明确尚未开始，完成量及百分比为0，估算金额不固定。'};
  }
  const saved=records.find(r=>r.savedEstimate?.items)?.savedEstimate;
  requireFact(saved?.minutes===240&&saved.items.length===2&&saved.items.every((i:RecordValue)=>i.ewdMinutes===120),'两项120分钟的有效旧明细缺失');
  const oldItems=saved.items.map((i:RecordValue)=>({criterionId:i.criteriaRefs?.[0],minutes:i.ewdMinutes}));
  requireFact(oldItems.every((i:RecordValue,index:number)=>i.criterionId===ids[index]),'旧工作明细无法对应标准');
  requireFact(files.some(f=>f.content.includes('尚未制作')&&f.content.includes('报名页')&&(/已交付|完整交付/.test(f.content))),'中文页交付与通知缺口证据缺失');
  if(key==='confirmed-estimate-reuse'){
   const source=records.find(r=>r.savedEstimate===saved);
   requireFact(saved.source==='manual'&&saved.confirmed===true&&source?.conditions?.scopeUnchanged&&source.conditions.workMethodUnchanged,'人工确认或有效条件缺失');
   return {...base,total:240,completed:120,criteria:[100,0],estimate:'forbidden',reason:'人工已确认两项各120分钟，范围与方法未变；报名页完整、通知未制作，120/240=50%，不返回替换估算。'};
  }
  const source=records.find(r=>r.workload),change=records.find(r=>r.addedDeliverable);
  requireFact(saved.source==='model'&&saved.confirmed===false&&change?.unchangedWork?.conditionsUnchanged===true&&change.unchangedWork.newReusableMaterials===false&&change.addedDeliverable.labels?.length===3&&change.addedDeliverable.messages?.length===2,'新增英文范围或旧范围有效性缺失');
  requireFact(source?.creation?.scopeMinutes===240&&source.workload?.length===2&&source.workload[0].scopeMinutes===240&&source.workload[0].completedMinutes===0&&source.workload[1].scopeMinutes===240&&source.workload[1].completedMinutes===120,'创建基线或真实历史缺失');
  requireFact(source.timing?.startOn&&source.timing?.dueOn===task.dueAt&&Array.isArray(change.executionSchedule)&&change.executionSchedule.length===0,'正式起点或无未来排期事实缺失');
  return {...base,completed:120,criteria:[100,0,0],oldItems,estimate:'required',history:{creation:source.creation,workload:source.workload,plan:{scopeVersion:change.scopeVersion,points:[]},startOn:source.timing.startOn,dueOn:source.timing.dueOn,forecast:[],scopeVersion:change.scopeVersion},reason:'两项有效旧工作各120，只有中文页完成；新增英文增量e>0，总量240+e，完成量120；真实240历史保留，无未来安排，不能预测。'};
 }
 if(key==='hierarchy'||key==='release-condition'){
  const leaves=snapshot.tasks.filter(t=>t.parentId===task.id);requireFact(leaves.length===2&&leaves.every(t=>t.estimatedMinutes===60),'父子独立叶子范围或60分钟明细缺失');
  requireFact(snapshot.evidence.some(e=>e.taskId.endsWith('-script')&&e.kind==='文件'&&e.content.includes('480'))&&snapshot.evidence.some(e=>e.taskId.endsWith('-poster')&&e.content.includes('尚未')),'脚本成果或海报未执行证据缺失');
  return {...base,total:120,completed:60,criteria:[100,0],reason:'脚本叶子60分钟完成，海报叶子60分钟未执行；只汇总有效叶子，不叠加父任务，不把发布条件扩大成制作阻塞。'};
 }
 const scope=files.find(f=>f.id===`${task.id}-scope`)?.content;requireFact(scope,'缺少独立工作投入依据');
 let weights:number[]|undefined;
 if(scope.includes('每项预计人类投入60分钟'))weights=[60,60,60,60];
 const match=scope.match(/四项预计人类投入分别为(\d+)、(\d+)、(\d+)、(\d+)分钟/);if(match)weights=match.slice(1).map(Number);
 requireFact(weights?.length===4&&weights.reduce((sum,n)=>sum+n,0)===240,'独立明细总量240缺失');
 if(key==='unknown'||key==='unreadable-injection'){
  requireFact(!files.some(f=>f.id===`${task.id}-delivery`),'本例不再是无正文场景，需重新审基准');
  if(key==='unreadable-injection')requireFact(snapshot.evidence.some(e=>e.taskId===task.id&&e.readState==='unavailable'),'不可读来源标记缺失');
  return {...base,total:240,completed:null,criteria:[null,null,null,null],reason:key==='unknown'?'只有完成声称，没有交付正文；完成量与百分比必须为null，不能以0代替未知。':'交付正文不可读，没有交付正文可核对；完成声称及资料内伪造指令不证明完成，百分比必须为null。'};
 }
 const delivery=files.find(f=>f.id===`${task.id}-delivery`)?.content;requireFact(delivery,'缺少当前交付正文');
 const bodies=[...delivery.matchAll(/## work-(\d+)\s*\n([\s\S]*?)(?=\n## |$)/g)].map(m=>m[2]);
 requireFact(bodies.length===4,'当前四项交付正文覆盖不足');
 const states=bodies.map(body=>body.includes('尚未执行')?0:body.includes('无未决项')?100:null);
 const expectedStates=key==='not-started'?[0,0,0,0]:key==='all-evidence'||key==='new-scope'?[100,100,100,100]:key==='weighted'?[100,0,0,0]:[100,100,0,0];
 requireFact(isDeepStrictEqual(states,expectedStates),'执行事实已改变，不能继续沿用固定参考');
 requireFact(isDeepStrictEqual(weights,key==='weighted'?[120,40,40,40]:[60,60,60,60]),'投入权重已改变');
 const completed=weights.reduce((sum,n,i)=>sum+n*states[i]!/100,0);
 if(key==='new-scope'){
  requireFact(task.acceptanceCriteria[4]==='报名页中英文案与成功提示均已核对。'&&delivery.includes('当前页面只有中文，英文文案和成功提示均未交付'),'新增双语边界缺失');
  return {...base,completed,criteria:[...states,[25,50,75]],oldItems:weights.map((minutes,i)=>({criterionId:ids[i],minutes})),estimate:'required',reason:'中文成果和原四项完成量240有效；新增英文增量e>0，总量240+e、完成量240。第5项有部分成果，允许25/50/75，不重复计中文，不强求固定估时。'};
 }
 const result={...base,total:240,completed,criteria:states,reason:`四项独立工作投入为${weights.join('、')}分钟，当前完成量${completed}，原始及展示${completed/240*100}%。`};
 if(!key.startsWith('timing-')&&key!=='reschedule')return result;
 const record=records.find(r=>r.workload&&r.planned&&r.executionSchedule);
 requireFact(record?.creation?.at==='2026-10-05'&&record.creation.scopeMinutes===240&&record.workload?.length===2&&record.workload[0].completedMinutes===0&&record.workload[1].completedMinutes===120&&record.workload.every((p:RecordValue)=>p.scopeMinutes===240),'时序真实历史不完整');
 requireFact(record.planned?.points?.length===3&&record.executionSchedule?.length===2&&record.executionSchedule.every((p:RecordValue)=>p.confirmed===true&&p.remainingMinutes===60&&p.deliveryOn===p.reviewOn),'已保存计划或已落实执行安排缺失');
 const forecast=record.executionSchedule.map((p:RecordValue,i:number)=>({at:p.reviewOn,completedMinutes:120+(i+1)*60}));
 return {...result,history:{creation:record.creation,workload:record.workload,plan:record.planned,startOn:record.creation.at,dueOn:task.dueAt,forecast,scopeVersion:record.scopeVersion},reason:result.reason+'历史、计划和每个预测节点只采用已保存记录及已落实交付/核验窗口。'};
}

function assertion(id:string,label:string,stepId:string,path:string,operator:LabAssertion['operator'],expected:Json):LabAssertion{return {id:`strict-${stepId}-${id}`,label,stepId,path,operator,expected};}
function baselineAssertions(b:Baseline):LabAssertion[]{
 const {stepId}=b;const p='result.progress.';const rows:LabAssertion[]=[];
 const eq=(id:string,path:string,value:Json,label=id)=>rows.push(assertion(id,label,stepId,path,'equals',value));
 const nil=(id:string,path:string)=>rows.push(assertion(id,id,stepId,path,'nullish',true));
 if(b.total!==undefined)eq('total',p+'totalEwdMinutes',b.total);
 else rows.push(assertion('positive-total','明确当前范围投入为正',stepId,p+'totalEwdMinutes','gte',1));
 eq('completed',p+'completedEwdMinutes',b.completed);eq('known-completed',p+'knownCompletedEwdMinutes',b.completed??0);eq('unconfirmed',p+'unconfirmedEwdMinutes',b.completed===null?b.total!:0);
 if(b.completed===null){eq('raw',p+'completionPercent',null);eq('display',p+'displayPercent',null);}
 else if(b.total!==undefined||b.completed===0){const percent=b.total===undefined?0:100*b.completed/b.total;eq('raw',p+'completionPercent',percent);eq('display',p+'displayPercent',grade(percent));}
 if(b.estimate==='required')rows.push(assertion('estimate-required','必要补估提案为正',stepId,p+'estimate.totalEwdMinutes','gte',1));
 if(b.estimate==='forbidden')nil('no-replacement-estimate',p+'estimate');
 b.criteria.forEach((percent,i)=>{
  const path=`result.criterionAssessments.${i}.percent`;
  if(Array.isArray(percent)){rows.push(assertion('criterion-'+i+'-min','部分成果不得归零',stepId,path,'gte',25),assertion('criterion-'+i+'-max','缺口不得当作全部完成',stepId,path,'lte',75));}
  else eq('criterion-'+i,path,percent);
 });
 if(!b.history){eq('no-comparison',p+'comparison',null);nil('no-trend',p+'trend');return rows;}
 rows.push(assertion('comparison-present','保存历史存在，不得丢弃比较',stepId,p+'comparison','nullish',false));
 const h=b.history;const q=p+'comparison.';
 eq('creation-at',q+'creation.at',h.creation.at);eq('creation-total',q+'creation.scopeMinutes',h.creation.scopeMinutes);
 rows.push(assertion('history-length','全部真实历史保留',stepId,q+'workload','length',h.workload.length));
 h.workload.forEach((point,i)=>{for(const field of ['at','scopeMinutes','completedMinutes','scopeVersion'])eq(`history-${i}-${field}`,q+`workload.${i}.${field}`,point[field]);});
 eq('start',q+'timing.startOn',h.startOn);eq('due',q+'timing.dueOn',h.dueOn);eq('scope-version',q+'timing.scopeVersion',h.scopeVersion);nil('no-human-completion',q+'timing.completedOn');
 eq('plan-scope-version',q+'expected.scopeVersion',h.plan.scopeVersion);
 rows.push(assertion('plan-length','计划曲线保留',stepId,q+'expected.points','length',h.plan.points.length));
 h.plan.points.forEach((point:RecordValue,i:number)=>{eq(`plan-${i}-at`,q+`expected.points.${i}.at`,point.at);eq(`plan-${i}-completed`,q+`expected.points.${i}.completedMinutes`,point.completedMinutes);});
 if(!h.forecast.length){nil('no-forecast',q+'timing.forecastOn');nil('no-forecast-trend',q+'forecastTrend');}
 else{
  eq('forecast-on',q+'timing.forecastOn',h.forecast.at(-1)!.at);eq('forecast-start',q+'forecastTrend.startMinutes',b.completed);eq('forecast-scope',q+'forecastTrend.scopeVersion',h.scopeVersion);
  rows.push(assertion('forecast-length','每个已落实节点保留',stepId,q+'forecastTrend.points','length',h.forecast.length));
  h.forecast.forEach((point,i)=>{eq(`forecast-${i}-at`,q+`forecastTrend.points.${i}.at`,point.at);eq(`forecast-${i}-completed`,q+`forecastTrend.points.${i}.completedMinutes`,point.completedMinutes);});
 }
 return rows;
}

/** Creates reviewed-only new cases. It never reads output, runs models or mutates a source. */
export function createStrictAnalysisRetestCase(source:LabCase,newId:string):LabCase{
 requireFact(newId.trim()&&newId!==source.id,'必须使用新用例ID');requireFact(source.dataSnapshot,'缺少冻结业务快照');
 const key=fixtureKey(source),baselines=source.steps.map(s=>baseline(source,s.id));
 const copy=structuredClone(source);copy.id=newId;copy.name=`${source.name} · 严格验收`;copy.origin=strictAnalysisOrigin;copy.version=1;
 copy.tags=[...(copy.tags??[]).filter(t=>!t.startsWith('strict-fixture:')),`strict-fixture:${key}`];
 copy.assertions=[...copy.assertions.filter(a=>!a.path.startsWith('result.progress')&&!/^result\.criterionAssessments\.\d+\.percent$/.test(a.path)),...baselines.flatMap(baselineAssertions)];
 const retained=(copy.expectedOutput?.checks??[]).filter(c=>!/^analysis-(reference-v\d+|v\d+)-/.test(c.id)&&!c.id.startsWith('strict-analysis-'));
 copy.expectedOutput={version:1,checks:[...baselines.flatMap((b):NonNullable<LabCase['expectedOutput']>['checks']=>[
  {id:`strict-analysis-${b.stepId}-progress`,stepId:b.stepId,subject:'经业务证据核对的进度基准',criterion:'用独立工作明细与当前交付证据核对以下数值/公式；基准在生成前建立。固定数值不得解释成未知，动态估算不得强求固定新价格；具体字段由程序检查，判定模型审证据解释。',expected:{...(b.total!==undefined?{totalEwdMinutes:b.total}:{formula:b.key==='new-scope'?'T=240+新增英文e；e>0；C=240':b.key==='ai-estimate-revision'?'T=240+新增英文e；e>0；C=120':'T=有据初始估算e>0；C=0'}),completedEwdMinutes:b.completed,...(b.total!==undefined?{completionPercent:b.completed===null?null:100*b.completed/b.total,displayPercent:b.completed===null?null:grade(100*b.completed/b.total)}:{}),依据:b.reason}},
  {id:`strict-analysis-${b.stepId}-sources`,stepId:b.stepId,subject:'历史、预测和确认来源边界',criterion:'comparison只使用真实保存历史和正式起点；本次观察不能冒充历史、开始日或创建记录。没有落实执行窗口不预测；已有窗口逐一保留预测节点。不得产生人工确认或写入回执。',expected:b.history?{creation:b.history.creation,workload:b.history.workload,planned:b.history.plan,forecast:b.history.forecast,startOn:b.history.startOn,dueOn:b.history.dueOn,forecastOn:b.history.forecast.at(-1)?.at??null}:{comparison:null,reason:'未提供真实历史和正式起点，继续返回进度但比较必须为空。'}},
 ]),...retained]};
 return copy;
}

/** Runner hook: evaluated only for new, explicitly marked strict cases. */
export function evaluateStrictAnalysisRelations(c:LabCase,stepId:string,output:unknown):AssertionResult[]{
 if(!isStrictAnalysisCase(c))return [];
 const results:AssertionResult[]=[];
 const check=(id:string,label:string,actual:unknown,expected:Json,pass:boolean)=>results.push({id:`strict-relation-${stepId}-${id}`,label,status:pass?'passed':'failed',actual:actual??null,expected,message:pass?'满足独立业务基准':'未满足独立业务基准'});
 let b:Baseline;try{b=baseline(c,stepId);}catch(error){check('source-baseline','必须有经核对的源事实',null,'有效冻结业务基准',false);results.at(-1)!.message=error instanceof Error?error.message:'业务基准不可核对';return results;}
 const p=readPath(output,'result.progress') as RecordValue|undefined;
 check('output','进度结构存在',p,'result.progress',!!p&&typeof p==='object');if(!p)return results;
 const total=p.totalEwdMinutes;
 check('total','固定总量或完整有据的动态总量',total,b.total??'完整估算且总量>0',b.total!==undefined?near(total,b.total):number(total)&&total>0);
 check('completed','完成量来自独立交付证据',p.completedEwdMinutes,b.completed,b.completed===null?p.completedEwdMinutes===null:near(p.completedEwdMinutes,b.completed));
 check('known-completed','已知完成量不得借估算编造',p.knownCompletedEwdMinutes,b.completed??0,near(p.knownCompletedEwdMinutes,b.completed??0));
 check('unconfirmed','未知与明确未执行分开',p.unconfirmedEwdMinutes,b.completed===null?b.total!:0,near(p.unconfirmedEwdMinutes,b.completed===null?b.total!:0));
 if(b.completed===null){check('unknown-raw','无正文完成比例必须未知',p.completionPercent,null,p.completionPercent===null);check('unknown-display','未知不得显示为0',p.displayPercent,null,p.displayPercent===null);}
 else if(number(total)&&total>0){
  const percent=100*b.completed/total;
  const validRatio=near(p.completionPercent,percent)||near(p.completionPercent,Math.round(percent*10)/10);
  check('ratio','完成量除以当前独立总量（精确值或一位小数）',p.completionPercent,percent,validRatio);
  const display=grade(validRatio?p.completionPercent:percent);
  check('grade','展示使用相同原始比例的25档',p.displayPercent,display,p.displayPercent===display);
 }
 if(!b.history){check('no-history','没有真实历史和正式起点则比较为空',p.comparison,null,p.comparison===null);check('no-trend','无历史不补曲线',p.trend,null,p.trend==null);}
 else{
  const q=p.comparison;check('history-present','保存历史比较不得丢弃',q,'保存历史比较',!!q);
  if(q){
   check('creation','创建基线保持当时日期和总量',q.creation,{at:b.history.creation.at,scopeMinutes:b.history.creation.scopeMinutes},q.creation?.at===b.history.creation.at&&near(q.creation?.scopeMinutes,b.history.creation.scopeMinutes));
   const actualHistory=q.workload?.map((v:RecordValue)=>({at:v.at,scopeMinutes:v.scopeMinutes,completedMinutes:v.completedMinutes,scopeVersion:v.scopeVersion}));
   const expectedHistory=b.history.workload.map(v=>({at:v.at,scopeMinutes:v.scopeMinutes,completedMinutes:v.completedMinutes,scopeVersion:v.scopeVersion}));
   check('history','每条历史保留真实值与范围版本',actualHistory,expectedHistory,isDeepStrictEqual(actualHistory,expectedHistory));
   check('start','开始日来自正式起点记录',q.timing?.startOn,b.history.startOn,q.timing?.startOn===b.history.startOn);
   check('due','截止来自已保存任务',q.timing?.dueOn,b.history.dueOn,q.timing?.dueOn===b.history.dueOn);
   check('plan','计划曲线只使用保存记录',q.expected,b.history.plan,q.expected?.scopeVersion===b.history.plan.scopeVersion&&isDeepStrictEqual(q.expected?.points,b.history.plan.points));
   check('no-confirm','没有用户确认不生成确认完成日期',q.timing?.completedOn,null,q.timing?.completedOn==null);
   if(!b.history.forecast.length){check('no-forecast','没有执行安排不得预测日期',q.timing?.forecastOn,null,q.timing?.forecastOn==null);check('no-future-nodes','无执行安排不补节点',q.forecastTrend,null,q.forecastTrend==null);}
   else{
    const actualForecast=q.forecastTrend?.points?.map((v:RecordValue)=>({at:v.at,completedMinutes:v.completedMinutes}));
    check('forecast-nodes','每个落实的交付复核窗口产生正确增量',actualForecast,b.history.forecast,isDeepStrictEqual(actualForecast,b.history.forecast));
    check('forecast-date','完成日来自最后落实窗口',q.timing?.forecastOn,b.history.forecast.at(-1)!.at,q.timing?.forecastOn===b.history.forecast.at(-1)!.at);
    check('forecast-start','预测从已记录完成量开始',q.forecastTrend?.startMinutes,b.completed,near(q.forecastTrend?.startMinutes,b.completed!));
   }
  }
 }
 const estimate=p.estimate;
 if(b.estimate==='forbidden'){check('confirmed-estimate','人工已确认估算不返回替换提案',estimate,null,estimate==null);return results;}
 if(b.estimate==='required')check('estimate-required','必要补估或重估不得省略',estimate,'完整EWD估算提案',!!estimate&&Array.isArray(estimate.items)&&estimate.items.length>0);
 if(!estimate)return results;
 const items=Array.isArray(estimate.items)?estimate.items:[];
 check('estimate-items','明细ID唯一且分钟有效',items.map((i:RecordValue)=>i.id),'非空唯一ID和非负明细量',items.length>0&&items.every((i:RecordValue)=>typeof i.id==='string'&&i.id&&number(i.ewdMinutes)&&i.ewdMinutes>=0)&&new Set(items.map((i:RecordValue)=>i.id)).size===items.length);
 const sum=items.reduce((value:number,item:RecordValue)=>value+(number(item.ewdMinutes)?item.ewdMinutes:NaN),0);
 check('estimate-sum','当前总量等于非重叠明细之和',total,sum,near(total,sum)&&near(estimate.totalEwdMinutes,sum)&&near(estimate.knownEwdMinutes,sum));
 for(const [index,item] of items.entries()){
  const t=item.threePoint;const valid=t&&number(t.optimisticMinutes)&&number(t.mostLikelyMinutes)&&number(t.pessimisticMinutes)&&t.optimisticMinutes>=0&&t.optimisticMinutes<=t.mostLikelyMinutes&&t.mostLikelyMinutes<=t.pessimisticMinutes;
  const expected=valid?(t.optimisticMinutes+4*t.mostLikelyMinutes+t.pessimisticMinutes)/6:NaN;
  check('three-point-'+index,'三点估算与明细分钟一致',t,'0≤O≤M≤P；E=(O+4M+P)/6',!!valid&&near(t.expectedMinutes,expected)&&near(item.ewdMinutes,expected));
 }
 if(b.oldItems){
  const oldIds=b.oldItems.map(i=>i.criterionId);let oldTotal=0;
  for(const old of b.oldItems){const related=items.filter((i:RecordValue)=>i.criteriaRefs?.includes(old.criterionId));const amount=related.reduce((n:number,i:RecordValue)=>n+i.ewdMinutes,0);oldTotal+=old.minutes;check('old-'+old.criterionId,'未变旧范围复用独立投入',amount,old.minutes,near(amount,old.minutes));}
  const mixed=items.some((i:RecordValue)=>i.criteriaRefs?.some((id:string)=>oldIds.includes(id))&&i.criteriaRefs?.some((id:string)=>!oldIds.includes(id)));
  const added=items.filter((i:RecordValue)=>!i.criteriaRefs?.some((id:string)=>oldIds.includes(id))).reduce((n:number,i:RecordValue)=>n+i.ewdMinutes,0);
  check('increment','新增英文为正且不重复计旧范围',added,'新增e>0；总量=有效旧投入+e',!mixed&&number(added)&&added>0&&near(total,oldTotal+added));
 }
 return results;
}
