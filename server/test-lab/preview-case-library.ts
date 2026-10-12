import {assignmentCriterionNote} from './assignment-review-policy.ts';
import type {LabCase,LabState} from '../../src/test-lab/types.ts';
import {isTaskPreviewCase,previewCaseForEvaluation} from '../../src/test-lab/task-preview-case.ts';

export function updatePreviewCaseLibrary(state:LabState){
  let changed=false;
  const activeTeams=new Set(state.teams.filter(t=>!t.archived).map(t=>t.id));
  state.cases=state.cases.map(c=>{
    if(c.archived||!c.enabled||!activeTeams.has(c.teamId)||!isTaskPreviewCase(c)||c.previewCriteriaVersion===1)return c;
    const next=previewCaseForEvaluation(c);
    next.name=next.name.replace('创建流程','方案流程').replace('从需求创建任务','从需求生成任务方案').replace('完整信息一次创建','完整信息一次生成').replace('多项交付拆解后创建','多项交付拆解方案').replace('保存截止时间','生成截止日期').replace('保存执行建议','保留执行建议').replace('保存预计投入','保留预计投入').replace('基础信息完整保存','基础信息完整生成');
    next.version=c.version+1;changed=true;return next;
  });
  const team=state.teams.find(t=>t.id==='lab-content'&&!t.archived);
  if(!team)return changed;
  const scenarios=[
    {key:'date',name:'修改方案 · 调整日期保留分工',first:'帮我安排新品发布资料：林洁负责介绍文案，Jage负责海报，卜佳菲统筹。文案要讲清用途和卖点；海报交源文件和导出图。整批12月31日前交付。',next:'文案改为12月20日前交，海报改为12月25日前交，其他内容和人员不变。',checks:['各节点保留原方案的临时 clientId，不重建不相关任务。','文案 dueDate 为2026-12-20，海报为2026-12-25，整体为2026-12-31；同步标准和建议中直接关联的旧日期表述，其余分工、目标、交付要求不变。']},
    {key:'participant',name:'修改方案 · 增加具体参与贡献',first:'请帮我建一项新品官网介绍文案任务，由林洁负责，文案包含用途、适用对象和核心卖点，先不安排其他参与者。',next:'请让 tiger huang 参与核对商品名称和卖点表述，林洁还是负责人，其他不变。',checks:['保留原任务 clientId、目标与逐条完成标准，ownerMemberId 仍对应林洁。','participants 增加 tiger huang 并说明商品名称和卖点表述核对的贡献，不添加全员或第二个负责人。']},
    {key:'delete',name:'修改方案 · 删除交付保留剩余范围',first:'帮我安排新品发布准备：需要介绍文案、海报和门店执行清单，分别验收。按团队职责安排人员，不拍摄也不投放。',next:'门店执行清单这次不要了，只保留文案和海报，其他要求不变。',checks:['删除门店执行清单，不在标题、标准或建议中恢复该交付；父级范围和标准同步移除该项。','文案和海报保留各自 clientId、分工和标准，删除失效依赖，不添加拍摄或投放。']},
    {key:'confirm',name:'方案流程 · 确认后仍返回方案',first:'帮我安排一项门店海报制作任务，由Jage负责，交付A3海报源文件和打印PDF，12月25日前完成。',next:'这个方案可以，就按这个确认。',checks:['保留原方案 clientId、Jage负责人、A3源文件与打印PDF标准及2026-12-25截止日期。','仍返回任务方案，不声明任务已创建、人员已接受，不返回真实任务 ID 或创建回执；确认执行由应用负责。']},
  ];
  for(const definition of scenarios){
    const id=`task-preview-flow-v1-${definition.key}`;
    const existing=state.cases.find(c=>c.id===id);
    if(existing){
      const old='文案 dueDate 为2026-12-20，海报为2026-12-25，整体为2026-12-31；保留原分工、目标及完成要求。';
      const revised='文案 dueDate 为2026-12-20，海报为2026-12-25，整体为2026-12-31；同步标准和建议中直接关联的旧日期表述，其余分工、目标、交付要求不变。';
      if(definition.key==='date'&&existing.version===1&&existing.reviewChecklist.includes(old)){
        existing.reviewChecklist=existing.reviewChecklist.map(text=>text===old?revised:text);
        if(existing.expectedOutput)existing.expectedOutput.checks=existing.expectedOutput.checks.map(check=>({...check,criterion:check.criterion===old?revised:check.criterion}));
        existing.version++;changed=true;
      }
      continue;
    }
    const firstChecks=['生成覆盖用户要求的任务方案，目标与完成标准明确，按用户指定或已确认职责分工。'];
    const item:LabCase={id,name:definition.name,teamId:team.id,actorId:team.members[0].id,category:'任务方案流程',description:'先预览，再根据用户本轮要求修改；验证未变字段和节点标识保持稳定。',tags:['任务预览','重点：流程','方案修改'],origin:'task-preview-flow-v1',previewCriteriaVersion:1,requiresMemberContext:true,inputFormat:'natural-v1',archived:false,enabled:true,version:1,
      steps:[{id:'s1',skillId:'agentdoor-task-planner',prompt:definition.first,evaluatedAt:'2026-10-09T04:00:00Z',taskId:null,usePreviousOutput:false,events:[]},{id:'s2',skillId:'agentdoor-task-planner',prompt:definition.next,evaluatedAt:'2026-10-09T04:00:00Z',taskId:null,usePreviousOutput:true,events:[]}],assertions:[],reviewChecklist:[...firstChecks,...definition.checks],
      expectedOutput:{version:1,checks:[...firstChecks.map((criterion,i)=>({id:`initial-${i+1}`,stepId:'s1',subject:'初始方案',criterion,expected:null})),...definition.checks.map((criterion,i)=>({id:`edit-${i+1}`,stepId:'s2',subject:'修改方案',criterion,expected:null}))]}};
    state.cases.push(item);changed=true;
  }
  return changed;
}

// Clarify current preview expectations without changing inputs or historical run snapshots.
export function updatePreviewAssignmentCriteria(state:LabState){
  let changed=false;
  const activeTeams=new Set(state.teams.filter(t=>!t.archived).map(t=>t.id));
  for(const item of state.cases){
    if(item.archived||!item.enabled||!activeTeams.has(item.teamId)||item.previewCriteriaVersion!==1||!isTaskPreviewCase(item))continue;
    const corrections:Record<string,Record<string,string>>={
      'planning-core-v1-d-channels':{
        '不人为添加串行依赖；内容制作归林洁，客服协作与核对归tiger huang，统筹归卜佳菲。':'不人为添加串行依赖；各渠道按当前职责合理分工。客服内容制作与口径核对可由合理相关的负责人或参与者承担；参与者需说明具体贡献，不强制某成员必须担任负责人。',
        '不人为添加串行依赖；官网介绍由林洁负责，门店海报由Jage负责，客服协作与核对由tiger huang负责，统筹由卜佳菲负责。':'不人为添加串行依赖；官网、门店海报、客服问答按当前职责合理分工。客服内容制作与口径核对可由合理相关的负责人或参与者承担；参与者需说明具体贡献，不强制某成员必须担任负责人。',
      },
      'planning-core-v1-d-reuse':{
        '官网介绍由林洁负责；问答内容制作可由林洁承担，客服口径核查由tiger huang参与且说明边界。':'官网介绍与客服问答按当前职责合理分配。客服口径核查可由合理相关的负责人或参与者承担；若添加参与者，说明具体贡献，不强制额外增加协作人。',
      },
    };
    const clarify=(text:string)=>{
      const base=text.replace(' '+assignmentCriterionNote,'');
      const corrected=corrections[item.id]?.[base]??text;
      return /负责人|分工|分配|统筹|承担|参与者|由[^。；]*负责/.test(corrected)&&!corrected.includes(assignmentCriterionNote)?`${corrected} ${assignmentCriterionNote}`:corrected;
    };
    const before=JSON.stringify([item.reviewChecklist,item.expectedOutput,item.verification]);
    item.reviewChecklist=item.reviewChecklist.map(clarify);
    if(item.expectedOutput)item.expectedOutput.checks=item.expectedOutput.checks.map(check=>({...check,criterion:clarify(check.criterion)}));
    if(item.verification)item.verification.expectedResults=item.verification.expectedResults.map(result=>({...result,criteria:result.criteria.map(clarify)}));
    if(JSON.stringify([item.reviewChecklist,item.expectedOutput,item.verification])!==before){item.version++;changed=true;}
  }
  return changed;
}
