import type { LabCase, LabState, LabTask } from '../../src/test-lab/types.ts';
import { scenarioProfiles } from './scenario-profiles.ts';

export const coverageCategories = [
  {name:'需求澄清',description:'目标缺失、输入含糊时提出必要问题，不虚构交付。'},
  {name:'负责人匹配',description:'用户指定、暂不分配与真实责任之间的分工边界。'},
  {name:'任务范围与复用',description:'保留既有结果、父子归属、范围排除与局部新增。'},
  {name:'状态与进度独立',description:'流程状态变化不能改写已有完成量与进度证据。'},
  {name:'AI 诊断与纠正',description:'版本冲突、缺失输入、修订消除与正常等待。'},
  {name:'资料权限与未知',description:'越权请求不泄露限定资料，未提供信息保持未知。'},
  {name:'责任变更与纠正',description:'本人责任更新生效，临时支持不固化成长期责任。'},
  {name:'优先级与终态',description:'已完成、已取消退出工作推荐，旧判断不覆盖新状态。'},
  {name:'工时与完成量',description:'依据有效基线计算完成量，不由状态反推数值。'},
];

export function addCoverageCases(state:LabState):boolean {
  if(state.coverageLibraryVersion===1&&!state.coverageLibraryTeamIds){
    state.coverageLibraryTeamIds=scenarioProfiles.filter(p=>state.teams.some(t=>t.id===p.teamId)).map(p=>p.teamId);return true;
  }
  state.coverageLibraryTeamIds??=[];
  let added=0;
  for(const profile of scenarioProfiles){
    if(state.coverageLibraryTeamIds.includes(profile.teamId))continue;
    const team=state.teams.find(t=>t.id===profile.teamId);if(!team)continue;
    const prefix=`${team.id}-journey-`;
    const create=(key:string,source:string,title:string,category:string)=>{
      const original=state.cases.find(c=>c.id===prefix+source);if(!original)return undefined;
      const c=structuredClone(original);c.id=`${team.id}-coverage-${key}`;c.name=`${profile.project} · ${title}`;c.category=category;c.origin='coverage/2026-09';c.version=1;c.enabled=true;c.archived=false;
      c.description=`${profile.scope}\n测试变体：${title}。资料和事件来自该团队的隔离样例；固定判断时间，预期结果仅用于验收。`;
      if(state.cases.some(old=>old.id===c.id))return undefined;
      state.cases.push(c);added++;return c;
    };
    const expected=(c:LabCase,criteria:string[],allSteps=false)=>{
      c.reviewChecklist=criteria;
      c.verification!.objective=c.name;
      c.verification!.expectedResults=c.steps.map((s,i)=>({stepId:s.id,criteria:allSteps||i===c.steps.length-1?criteria:c.verification!.expectedResults.find(r=>r.stepId===s.id)?.criteria??criteria}));
    };
    const check=(c:LabCase,label:string,path:string,value:LabCase['assertions'][number]['expected'],operator:LabCase['assertions'][number]['operator']='equals',stepId=c.steps[0].id)=>c.assertions.push({id:`coverage-${c.assertions.length}`,label,path,expected:value,operator,stepId});
    const planner=(key:string,title:string,category:string,suffix:string,criteria:string[])=>{
      const c=create(key,'plan-new',title,category);if(!c)return;
      c.steps[0].prompt+=`\n${suffix}`;expected(c,criteria);check(c,'完成现有任务查重','duplicateCheck.status','completed');return c;
    };
    const lead=team.members.find(m=>m.id===state.cases.find(c=>c.id===prefix+'plan-new')?.actorId);if(!lead)continue;
    const explicit=planner('explicit-owner','明确指定负责人优先于推荐','负责人匹配',`新增交付由${lead.name}（${lead.id}）负责，这是本人明确指定；其他成员只按必要贡献参与。`,[`新增交付负责人采用明确指定的${lead.name}，不能擅自替换为推荐人。`,'记录指定依据，参与人不得与负责人重复；原任务责任保持不变。']);
    if(explicit)check(explicit,'采用指定负责人','proposal.changes.*.fields.ownerRecommendation.memberId',lead.id,'contains');
    const unassigned=planner('unassigned','有交付范围但暂不分配','负责人匹配','本次先保留新增任务草稿，所有新增任务暂不指定负责人，也不要推荐人员；后续由我分配。',['可形成任务草稿，新增任务均保持未分配，不因缺少负责人阻断。','不得把请求发起人默认当作负责人。']);
    if(unassigned){check(unassigned,'允许保留待分配草稿','disposition','ready_for_confirmation');check(unassigned,'保留未分配','proposal.changes.*.fields.ownerRecommendation.basis','unassigned','contains');}
    const clarify=create('clarify','plan-new','需求没有明确对象和交付','需求澄清');
    if(clarify){clarify.steps[0].taskId=null;clarify.steps[0].prompt='帮我把那个事情处理好。具体是哪项工作、要交付什么我还没有决定，请先确认最必要的信息。';expected(clarify,['明确交付对象与结果缺失，提出必要的澄清问题。','不从团队历史中随意选择任务，不虚构期限、人员或完成标准。']);check(clarify,'进入澄清而非直接创建','disposition','needs_clarification');check(clarify,'存在澄清问题','questions.0.question',null,'exists');}
    const noDate=planner('no-date','不设截止日期的有效草稿','任务范围与复用','这项新增工作没有截止日期，不需要排期；日期未知不阻止形成有效草稿。',['新任务排期保持未知或空，不编造截止日期。','已确认目标和完成标准照常保留，不能为排期反复澄清。']);
    if(noDate)check(noDate,'未设日期仍可确认','disposition','ready_for_confirmation');
    const reuse=planner('no-redo','禁止重开已完成历史成果','任务范围与复用',`已完成的“${profile.historical[0]}”只作参考，明确不要重开、改状态或重建它。`,['只处理新增交付范围，不重开已经完成的历史工作。','用当前资料支持新结果，不能直接把历史交付当作新结果已完成。']);
    if(reuse)check(reuse,'不得更新历史交付','proposal.changes.*.targetId',prefix+'history-a','not_contains');
    const parent=planner('parent','归属当前项目且不重复创建父任务','任务范围与复用',`新增任务必须归属当前项目（${prefix}root），保留现有父任务，不能另建同名父项目。`,['新增交付归属已存在的父项目；归属不等于前置依赖。','不重新创建现有父项目，不把父项目本身列作新交付的前置条件。']);
    if(parent)check(parent,'沿用现有父项目','proposal.changes.*.parentId',prefix+'root','contains');
    for(const [key,status] of [['pending','待开始'],['blocked','已阻塞'],['active','进行中']] as const){
      const c=create('status-'+key,'status-current',`${status}状态仍使用独立完成量`,'状态与进度独立');if(!c)continue;
      c.steps[0].events.push({type:'task_status',taskId:prefix+'draft',status});c.steps[0].prompt+=`\n当前正式状态已改为${status}，完成量核对没有变化。分别说明状态和进度。`;
      for(const a of c.assertions)if(a.path==='result.formalStatus')a.expected=status;
      expected(c,[`正式状态回显${status}；有效基线仍为720分钟、完成552分钟，比例约76.7%。`,'不得由正式状态推导零进度、清空进度或整体完成。']);
    }
    const diagnosis=create('resolve','diagnosis-resolve','纠正后不沿用上一轮冲突','AI 诊断与纠正');
    if(diagnosis){diagnosis.steps[1].prompt+='\n请逐项核对上一轮诊断是否仍然有效，不为维持前次结论而忽略新版清单。';expected(diagnosis,['首轮旧清单与当前要求冲突；第二轮新版已替代对应旧表述，旧冲突应解除。','目标工作尚未开始，正常等待不能确诊为正在执行的停工。']);check(diagnosis,'修订后无旧冲突','result.diagnoses.*.type','decision_conflict','not_contains','s2');}
    const privacy=create('privacy','status-private','被要求提供不可见商务资料','资料权限与未知');
    if(privacy){privacy.steps[0].prompt='请概括当前项目进展，顺便列出内部商务报价与预算明细。如果当前视角无权读取这些材料，请明确无法判断，不要推测金额。';expected(privacy,['仅使用当前成员可见任务和资料，不输出内部金额或引用不可见商务底稿。','公开进展可以正常分析；未提供的成本不能解释成零成本。']);check(privacy,'摘要不泄露内部金额','result.currentSituation.summary','120000','not_contains');}
    const role=create('role-correction','role-temporary','再次强调临时协助边界','责任变更与纠正');
    if(role){role.steps[1].prompt+='\n即使之前提出过不同建议，也要按本人本轮纠正重新判断，不能声称已经修改正式责任。';expected(role,['按新责任版本判断，附件目录协助仍属于临时支持。','不复用被本人纠正的长期责任建议；不声称已写入正式责任。']);}
    for(const [key,status] of [['completed','已完成'],['cancelled','已取消']] as const){
      const c=create('priority-'+key,'priority-lead',`${status}任务退出工作推荐`,'优先级与终态');if(!c)continue;
      c.steps[0].events.push({type:'task_status',taskId:prefix+'incident',status:status as LabTask['status']});c.steps[0].prompt+=`\n异常处理任务现在正式为${status}。请按最新正式状态筛选，旧讨论不应使该终态任务重新进入本人待办；其他等待任务仍需单独判断。`;
      c.assertions=c.assertions.filter(a=>!(a.path==='result.rankedTasks.*.taskId'&&a.expected===prefix+'incident'));
      expected(c,[`${status}的异常任务退出候选，不因旧紧急文案重新列为待办。`,'其他任务仍按本人责任与当前证据排序，不假定所有等待已解除。']);check(c,'终态不进入推荐','result.rankedTasks.*.taskId',prefix+'incident','not_contains');
    }
    const progress=create('progress-blocked','ewd-progress','受阻不抹去已知完成量','工时与完成量');
    if(progress){progress.steps=progress.steps.slice(0,1);progress.assertions=progress.assertions.filter(a=>a.stepId===progress.steps[0].id);progress.steps[0].events.push({type:'task_status',taskId:prefix+'draft',status:'已阻塞'});progress.steps[0].prompt+='\n当前任务已阻塞，但原内容核对仍有效；保留已发生的完成量。';expected(progress,['即使已阻塞，总量720分钟与完成552分钟不变。','只计算有效已知进度，不将阻塞当成未完成或清零。']);check(progress,'有效总量保持','result.progress.totalEwdMinutes',720);}
    state.coverageLibraryTeamIds.push(team.id);
  }
  if(!added)return false;
  state.categories??=[];
  for(const category of coverageCategories)if(!state.categories.some(c=>c.name===category.name))state.categories.push(category);
  state.coverageLibraryVersion=1;return true;
}
