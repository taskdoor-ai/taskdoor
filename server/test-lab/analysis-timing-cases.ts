import type {LabState,LabEvidence} from '../../src/test-lab/types.ts';
export function addAnalysisTimingCases(state:LabState){
 const template=state.cases.find(c=>c.id==='case-analysis-test-page-ready');if(!template)return false;
 const base=template.dataSnapshot??state.teams.find(t=>t.id===template.teamId);if(!base)return false;
 let changed=false;
 for(const [key,finish,delta] of [['ahead','2026-10-11',-1],['on-time','2026-10-12',0],['delayed','2026-10-14',2]] as const){
  const id=`case-analysis-timing-${key}`;const existingIndex=state.cases.findIndex(c=>c.id===id);if(existingIndex>=0&&state.cases[existingIndex].origin==='analysis-timing-v3')continue;
  const c=structuredClone(template);c.id=id;c.name=`任务工时与燃起图 · ${delta<0?'提前一天':delta===0?'按期':'延期两天'}的有据预测`;c.origin='analysis-timing-v3';c.tags=['燃起图','工时评估','有据预测'];c.version=1;
  const snapshot=structuredClone(base);const target=snapshot.tasks.find(t=>t.id===template.steps[0].taskId)!;
  target.dueAt='2026-10-12';c.steps=[{...c.steps[0],evaluatedAt:'2026-10-09T10:00:00+08:00',prompt:'',usePreviousOutput:false,events:[]}];
  const scopeVersion='scope-1';const workload=[{at:'2026-10-05',scopeMinutes:240,completedMinutes:0,scopeVersion},{at:'2026-10-09',scopeMinutes:240,completedMinutes:120,scopeVersion}];
  const expected={scopeVersion,points:[{at:'2026-10-05',completedMinutes:0},{at:'2026-10-09',completedMinutes:120},{at:'2026-10-12',completedMinutes:240}]};
  const comparison={asOf:'2026-10-09',workload,creation:{at:'2026-10-05',scopeMinutes:240},expected,forecastTrend:{asOf:'2026-10-09',scopeVersion,startMinutes:120,points:[{at:'2026-10-10',completedMinutes:180,note:'通知材料已落实10/10交付与复核窗口'},{at:finish,completedMinutes:240,note:'应急预案落实复核窗口并交付'}]},timing:{startOn:'2026-10-05',dueOn:'2026-10-12',forecastOn:finish,scopeVersion,basis:`通知10/10完成；应急预案的人工制作与复核窗口已确认在${finish}，无未决依赖。`}};
  const evidence:LabEvidence={id:`${target.id}-schedule-${key}`,taskId:target.id,authorId:target.ownerId!,kind:'文件',title:'工作量历史、计划与执行安排.json',version:1,createdAt:'2026-10-09T09:00:00+08:00',visibleToIds:[],content:JSON.stringify({recordType:'已保存业务记录',asOf:comparison.asOf,scopeVersion,creation:comparison.creation,workload,planned:expected,executionSchedule:[{workId:'work-3',remainingMinutes:60,deliveryOn:'2026-10-10',reviewOn:'2026-10-10',confirmed:true},{workId:'work-4',remainingMinutes:60,deliveryOn:finish,reviewOn:finish,confirmed:true}],dependencies:[],userCompletionConfirmation:null})};
  snapshot.members=snapshot.members.filter(m=>['zhou','xu','lin','jage'].includes(m.id));snapshot.evidence.push(evidence);c.dataSnapshot=snapshot;
  c.assertions=[{id:'raw-percent',stepId:'s1',label:'原始完成度120/240=50%',path:'result.progress.completionPercent',operator:'equals',expected:50},...[100,100,0,0].map((expected,index)=>({id:'criterion-'+index,stepId:'s1',label:'按交付正文逐条核对标准',path:`result.criterionAssessments.${index}.percent`,operator:'equals' as const,expected})),{id:'percent',stepId:'s1',label:'当前完成量120/240，展示50%',path:'result.progress.displayPercent',operator:'equals',expected:50},{id:'forecast',stepId:'s1',label:'预测日期来自具体执行安排',path:'result.progress.comparison.timing.forecastOn',operator:'equals',expected:finish},{id:'history',stepId:'s1',label:'保留两个真实工作量历史点',path:'result.progress.comparison.workload',operator:'length',expected:2},{id:'forecast-points',stepId:'s1',label:'保留两项已落实交付复核节点',path:'result.progress.comparison.forecastTrend.points',operator:'length',expected:2},{id:'forecast-first',stepId:'s1',label:'通知交付增加60分钟至180',path:'result.progress.comparison.forecastTrend.points.0.completedMinutes',operator:'equals',expected:180},{id:'no-confirm',stepId:'s1',label:'预测不产生用户确认完成日',path:'result.progress.comparison.timing.completedOn',operator:'exists',expected:false}];
  c.expectedOutput={version:1,checks:[{id:'timing-fixture',stepId:'s1',subject:'排期参考',criterion:'与已保存历史、计划及已落实的交付/复核安排对照，差值由程序计算；不将计划截止当预测日或产生用户确认。',expected:{历史节点:workload,计划截止:'2026-10-12',预计完成:finish,确认完成:null,计划日期差:delta,当前计划工作量差:0,预测节点:comparison.forecastTrend.points,依据:comparison.timing.basis}}]};
  if(existingIndex>=0)state.cases[existingIndex]=c;else state.cases.push(c);changed=true;
 }
 return changed;
}
