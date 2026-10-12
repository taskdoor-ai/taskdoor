import type {LabState,LabTask,LabEvidence,LabCase,SkillId} from '../../src/test-lab/types.ts';

/** Independent scenario teams prevent unrelated fixtures contaminating history. */
export function addPeopleAnalysisCases(state:LabState){
  const source=state.teams.find(t=>t.id==='lab-content');if(!source||source.members.length<2)return false;
  let changed=false;
  const scenarios=[
    {key:'sustained',skill:'agentdoor-responsibility-advisor',name:'多次脚本贡献细化责任',operation:'update',responsibility:'内容制作',history:'本人独立编写产品脚本，复核人确认内容与卖点一致。'},
    {key:'temporary',skill:'agentdoor-responsibility-advisor',name:'临时直播协助不变长期责任',operation:'no_change',responsibility:'负责产品脚本撰写，不承担直播运营',history:'本人临时协助直播字幕，负责人仍为另一成员。本人明确：仅本次帮忙，不改变长期责任。'},
    {key:'wrong-author',skill:'agentdoor-responsibility-advisor',name:'上传他人成果不归为本人责任',operation:'no_change',responsibility:'负责内容资料归档',history:'本人仅归档文件；实际脚本由另一成员完成。上传行为不表示创作贡献。'},
    {key:'planned-only',skill:'agentdoor-responsibility-advisor',name:'待开始分工不能证明已承担',operation:'no_change',responsibility:'负责商品资料核对',history:'新安排拟参与脚本制作，任务尚未开始，没有实际脚本贡献。'},
    {key:'full-match',skill:'agentdoor-member-matcher',name:'正式责任覆盖完整任务',level:'high',percent:100,role:'owner',responsibility:'负责产品脚本撰写、卖点核对及脚本交付',history:'本人独立编写脚本并核对卖点，已交付可编辑文稿。'},
    {key:'partial-match',skill:'agentdoor-member-matcher',name:'责任只覆盖任务部分结果',level:'partial',percent:50,role:'participant',responsibility:'负责商品卖点事实核对，不负责脚本撰写',history:'本人仅核对卖点；脚本写作由另一成员承担。'},
    {key:'support-match',skill:'agentdoor-member-matcher',name:'资料支持仅覆盖四分之一任务',level:'partial',percent:25,role:'participant',responsibility:'仅整理商品卖点资料，为事实核对提供支持，不独立核对、不撰写脚本',history:'本人提供资料目录与商品参数出处，核对与脚本制作由其他成员完成。'},
    {key:'near-match',skill:'agentdoor-member-matcher',name:'主体覆盖但关键核对仍需协作',level:'high',percent:75,role:'participant',responsibility:'负责产品脚本撰写与交付；提供卖点核对资料，不独立承担最终事实核对',history:'本人独立交付脚本，整理参数来源；最终商品事实核对由另一成员完成。'},
    {key:'unknown-match',skill:'agentdoor-member-matcher',name:'缺少正式责任不猜匹配',level:'unknown',percent:null,role:null,responsibility:'',history:'历史记录未说明本人具体承担内容，不能归属个人成果。'},
    {key:'wrong-history',skill:'agentdoor-member-matcher',name:'他人历史成果不提升匹配',level:'low',percent:0,role:null,responsibility:'负责资料归档，不承担文案制作',history:'本人仅上传归档；脚本是另一成员创作，与本人责任无关。'},
  ];
  for(const d of scenarios){
    const scenarioId=`people-test-${d.key}`,teamId=source.id,caseId=`case-${scenarioId}`;if(state.cases.some(c=>c.id===caseId))continue;
    const members=structuredClone(source.members.slice(0,2));for(const m of members)m.id=`${scenarioId}-${m.id}`;const actor=members[0],other=members[1];actor.responsibilities=d.responsibility?[d.responsibility]:[];actor.version=3;other.responsibilities=['负责活动执行，不承担产品脚本制作'];
    const makeTask=(id:string,title:string,status:LabTask['status']):LabTask=>({id,title,goal:'交付产品介绍脚本，准确体现商品卖点',status,createdById:actor.id,ownerId:other.id,participantIds:[actor.id],parentId:null,dependsOnTaskIds:[],acceptanceCriteria:['交付600字以内可编辑脚本','商品卖点与正式资料逐项一致'],executionTips:[],estimatedMinutes:90,dueAt:'2026-10-20',tags:[],visibility:'team',version:2});
    const target=makeTask(`${scenarioId}-target`,'编写新品介绍脚本','待开始');const histories=[1,2].map(i=>makeTask(`${scenarioId}-history-${i}`,`历史商品${i}介绍脚本`,d.key==='planned-only'?'待开始':'已完成'));
    const evidence:LabEvidence[]=histories.flatMap((t,i)=>[
      {id:`${t.id}-discussion`,taskId:t.id,authorId:actor.id,kind:'讨论',title:'贡献说明',content:d.history,createdAt:`2026-09-${20+i}T10:00:00+08:00`,version:1,visibleToIds:[]},
      {id:`${t.id}-file`,taskId:t.id,authorId:other.id,kind:'文件',title:`脚本${i+1}.md`,content:d.key==='planned-only'?'仅有计划，没有交付正文':`文稿包含开场、商品两项卖点和行动指引。成果归属说明：${d.history}`,createdAt:`2026-09-${20+i}T11:00:00+08:00`,version:2,visibleToIds:[]},
      {id:`${t.id}-review`,taskId:t.id,authorId:other.id,kind:'讨论',title:'复核反馈',content:`核对贡献边界：${d.history}`,createdAt:`2026-09-${20+i}T12:00:00+08:00`,version:1,visibleToIds:[]},
    ]);
    evidence.push({id:`target.id-brief-${d.key}`,taskId:target.id,authorId:other.id,kind:'文件',title:'新品任务简报.md',content:'当前任务需交付600字以内脚本，并核对商品卖点。历史成果只作为经验依据，不代表当前任务已经完成。',createdAt:'2026-10-10T09:00:00+08:00',version:1,visibleToIds:[]});
    const skillId=d.skill as SkillId;
    const c:LabCase={id:caseId,name:d.name,category:skillId==='agentdoor-member-matcher'?'人员匹配':'人员责任',tags:['人员分析','完整历史证据'],teamId,actorId:actor.id,description:'每项历史任务独立关联讨论、文件及贡献复核；当前责任与测试预期隔离。',enabled:true,archived:false,version:1,origin:'people-analysis-v1',steps:[{id:'s1',skillId,taskId:skillId==='agentdoor-member-matcher'?target.id:null,prompt:'',evaluatedAt:'2026-10-10T10:00:00+08:00',usePreviousOutput:false,events:[]}],assertions:[{id:'no-write',label:'分析不写业务',stepId:'s1',path:'writeReceipt',operator:'equals',expected:null},...(skillId==='agentdoor-member-matcher'?[{id:'level',label:'按正式责任和本人贡献判断',stepId:'s1',path:'result.candidates.0.matchLevel',operator:'equals' as const,expected:d.level!},{id:'percent',label:'匹配百分比按结果覆盖计算',stepId:'s1',path:'result.candidates.0.matchPercent',operator:'equals' as const,expected:d.percent??null},{id:'role',label:'角色建议与责任范围一致',stepId:'s1',path:'result.candidates.0.suggestedRole',operator:'equals' as const,expected:d.role??null},{id:'candidate',label:'候选身份一致',stepId:'s1',path:'result.candidates.0.memberId',operator:'equals' as const,expected:actor.id},{id:'unchanged',label:'不自动分配',stepId:'s1',path:'result.assignmentUnchanged',operator:'equals' as const,expected:true}]:[{id:'operation',label:'责任操作符合贡献边界',stepId:'s1',path:'result.proposals.0.operation',operator:'equals' as const,expected:d.operation!},{id:'version',label:'责任基准版本一致',stepId:'s1',path:'result.responsibilityVersion',operator:'equals' as const,expected:3},{id:'update',label:'仅生成责任建议',stepId:'s1',path:'result.update',operator:'equals' as const,expected:null}])],reviewChecklist:['每份文件与讨论归属正确历史任务','不把上传人或Owner当作实际成果承担人','不把临时协助或计划分工当持续责任','输出引用和版本来自当前可读快照']};
    c.dataSnapshot={...structuredClone(source),members,tasks:[target,...histories],evidence};state.cases.push(c);changed=true;
  }
  return changed;
}
