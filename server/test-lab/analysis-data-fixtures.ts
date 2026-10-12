import type {LabState,LabCase,LabTeam,LabTask,LabEvidence} from '../../src/test-lab/types.ts';
import {selectCaseContext} from '../../src/test-lab/case-input-context.ts';

export function buildAnalysisDataFixtures(state:LabState){
 let changed=false;
 const team=state.teams.find(t=>t.id==='lab-content');if(!team)return false;
 const baseline=state.cases.find(c=>c.id==='case-analysis-test-page-ready');
 if(baseline){
 for(const scenario of ['hierarchy','dependency','overlap'] as const){
  const caseId=`case-analysis-data-${scenario}`;if(state.cases.some(c=>c.id===caseId))continue;
  const c:LabCase=structuredClone(baseline);c.id=caseId;c.origin='analysis-data-v2';c.name={hierarchy:'父子任务与独立文件讨论',dependency:'前置受阻但当前任务可继续',overlap:'父子成果重复引用不能重复计量'}[scenario];c.tags=['任务层级',scenario==='dependency'?'前置依赖':'证据归属'];c.assertions=[];c.steps=[{...c.steps[0],id:'s1',prompt:'',taskId:`analysis-data-${scenario}-root`,events:[],usePreviousOutput:false}];
  const snapshot:LabTeam=structuredClone(selectCaseContext(team,baseline,baseline.steps[0]).team);snapshot.tasks=[];snapshot.evidence=[];
  const owner=snapshot.members[0];const base=team.tasks.find(t=>t.id===baseline.steps[0].taskId)!;
  const root:LabTask={...structuredClone(base),id:c.steps[0].taskId!,title:'新品宣传内容交付',goal:'完成脚本和海报交付',parentId:null,dependsOnTaskIds:[],acceptanceCriteria:['脚本与商品事实一致','海报可用于发布'],criteria:undefined,estimatedMinutes:120};
  const script:LabTask={...structuredClone(root),id:`${root.id}-script`,title:'新品介绍脚本',goal:'交付准确脚本',parentId:root.id,acceptanceCriteria:['600字以内，包含两项商品卖点'],estimatedMinutes:60};
  const poster:LabTask={...structuredClone(root),id:`${root.id}-poster`,title:'首发海报',goal:'交付商城海报',parentId:root.id,acceptanceCriteria:['1080×1920海报，可直接发布'],estimatedMinutes:60};
  const dependency:LabTask={...structuredClone(root),id:`${root.id}-approval`,title:'品牌发布审批',goal:'获得上线许可',parentId:null,status:'已阻塞',acceptanceCriteria:['取得审批记录'],estimatedMinutes:30};
  if(scenario==='dependency')root.dependsOnTaskIds=[dependency.id];
  snapshot.tasks=[root,script,poster,...(scenario==='dependency'?[dependency]:[])];
  for(const t of snapshot.tasks)t.criteria={taskId:t.id,version:1,items:t.acceptanceCriteria.map((text,i)=>({id:`${t.id}-criterion-${i+1}`,text}))};
  const ev=(task:LabTask,suffix:string,kind:LabEvidence['kind'],content:string):LabEvidence=>({id:`${task.id}-${suffix}`,taskId:task.id,authorId:owner.id,kind,title:suffix,content,createdAt:'2026-10-11T09:00:00+08:00',version:1,visibleToIds:[]});
  snapshot.evidence=[ev(root,'scope.md','文件','两项独立工作各60分钟，总量120分钟。父任务只是汇总，不追加父级工作量。脚本已完整交付，海报明确尚未执行。'),ev(script,'script.md','文件','核对记录：完整脚本480字，卖点来自正式商品资料，已逐项复核，当前标准全部满足。'),ev(script,'review','讨论','已核对脚本正文满足当前要求。'),ev(poster,'report','讨论','海报尚未执行，无任何交付结果。'),ev(root,'report','讨论',scenario==='dependency'?'审批尚未通过，只影响发布；脚本和海报制作可继续，不能认定当前制作任务已停工。':'请按子任务独立交付汇总，不把汇总层重复算成工作。')];
  if(scenario==='overlap')snapshot.evidence.push({...ev(root,'script-reference','讨论','父任务引用子任务脚本，是同一份成果，不是新增交付。'),relatedEvidenceIds:[`${script.id}-script.md`]});
  c.dataSnapshot=snapshot;c.expectedOutput={version:1,checks:[{id:'whole',stepId:'s1',subject:'整体进度',criterion:'按两项独立工作汇总，脚本完成，海报未执行；父级与引用不重复计量。',expected:50},{id:'evidence',stepId:'s1',subject:'归属与行动',criterion:scenario==='dependency'?'指出审批影响发布，不把制作阶段误判为全面阻塞。':'每条结论引用对应子任务文件或讨论，不混用其他任务证据。',expected:null}]};c.assertions=[{id:'progress',label:'整体独立工作完成一半',stepId:'s1',path:'result.progress.displayPercent',operator:'equals',expected:50},{id:'status',label:'分析不改正式状态',stepId:'s1',path:'result.formalStatusUnchanged',operator:'equals',expected:true}];state.cases.push(c);changed=true;
 }
 }
 for(const c of state.cases.filter(c=>['task-analysis-evidence-v1','people-analysis-v1'].includes(c.origin??''))){
  if(c.dataSnapshot)continue;const source=state.teams.find(t=>t.id===c.teamId);if(!source)continue;
  c.dataSnapshot=structuredClone(selectCaseContext(source,c,c.steps[0]).team);c.version++;
  // Generated prompts only: preserve user-authored extra instructions.
  for(const step of c.steps)if(step.prompt.startsWith('按当前任务、完成标准、文件正文和讨论分析')||step.prompt.startsWith('只分析候选成员')||step.prompt.startsWith('分析当前用户正式责任，结合历史任务'))step.prompt='';
  changed=true;
 }
 return changed;
}
