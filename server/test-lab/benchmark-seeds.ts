import type { LabCase, LabState } from '../../src/test-lab/types.ts';

// Add once: user edits, deletions and historical run snapshots remain untouched.
export function addBenchmarkCases(state:LabState):boolean {
  if(state.benchmarkVersion===1)return false;
  const team=state.teams.find(t=>t.id==='lab-content');
  if(!team)return false;
  const add=(key:string,sourceId:string,name:string,category:string)=>{
    const source=state.cases.find(c=>c.id===sourceId);
    if(!source)return undefined;
    const item:LabCase={...structuredClone(source),id:`benchmark-${key}`,name,category,version:1,origin:'benchmark/2026-09',archived:false,enabled:true};
    if(!state.cases.some(c=>c.id===item.id))state.cases.push(item);
    return item;
  };
  const planning=(key:string,name:string,prompt:string,criteria:string[])=>{
    const item=add(key,'lab-content-journey-plan-new',name,'任务拆解与分配');if(!item)return;
    item.actorId='zhou';item.steps=[{...item.steps[0],prompt,taskId:null}];
    item.description='固定团队：周岚统筹，林洁负责脚本，陈默负责视觉，高远负责运营，许悦负责文字核查。已有任务、历史交付与当前证据随用例提供。';
    item.reviewChecklist=criteria;
    item.verification={objective:name,preconditions:['按成员真实责任分工；已有结果复用，不额外扩展需求。'],fixtureChecks:team.members.map(m=>({id:`member-${m.id}`,label:`${m.name}的责任基线`,subject:'member',subjectId:m.id,path:'responsibilities',operator:'equals',expected:m.responsibilities})),expectedResults:[{stepId:item.steps[0].id,criteria}]};
    const assertion=(label:string,path:string,expected:LabCase['assertions'][number]['expected'],operator:LabCase['assertions'][number]['operator']='equals')=>item.assertions.push({id:`benchmark-${item.assertions.length}`,label,stepId:item.steps[0].id,path,operator,expected});
    assertion('方案可供确认','disposition','ready_for_confirmation');
    assertion('已完成现有任务查重','duplicateCheck.status','completed');
    return {item,assertion};
  };
  const single=planning('single','01 · 单一交付：脚本负责人匹配','为新出的保温杯制作一份 30 秒文字脚本，卖点为已确认的 350ml 容量和可拆洗杯盖。不涉及拍摄、剪辑、直播或雨伞项目。不设截止日期。请形成任务草稿并推荐负责人。',['只创建一个可独立验收的脚本任务，不按调研、编写、自检拆成子任务。','林洁负责脚本；如推荐许悦参与，说明具体核查贡献。','完成标准覆盖 30 秒、两个已确认卖点与文字交付，不虚构保温时长。']);
  single?.assertion('一个交付任务','proposal.changes',1,'length');
  single?.assertion('脚本推荐林洁','proposal.changes.*.fields.ownerRecommendation.memberId','lin','contains');
  const multi=planning('decompose','02 · 跨岗位交付：拆解与分工','为保温杯新品组织独立的上市内容交付：一份30秒文字脚本、一张商城主视觉、一份门店活动执行方案。卖点为350ml容量与可拆洗杯盖，预算上限2万元。不包含拍摄和媒体投放，不复用雨伞项目作为父任务。请建立统筹任务和这三项可分别验收的子任务，依据团队责任推荐负责人。不设截止日期。',['统筹任务下有脚本、主视觉、门店活动方案三个独立交付；不按制作步骤重复拆分。','脚本由林洁、视觉由陈默、活动方案由高远负责；周岚承担统筹。','每项有可核对完成标准；不新增拍摄投放，不虚构排期；父任务投入按叶子汇总。']);
  multi?.assertion('四个任务草稿','proposal.changes',4,'length');
  for(const [id,name] of [['lin','林洁'],['chen','陈默'],['gao','高远'],['zhou','周岚']])multi?.assertion(`分工包含${name}`,'proposal.changes.*.fields.ownerRecommendation.memberId',id,'contains');
  const missing=planning('unassigned','03 · 能力缺口：保留未分配','为保温杯完成食品接触材料合规检测，交付具备资质机构出具的检测报告。团队目前无人具备检测资质，不新增或虚构成员。请保留待分配的检测交付任务，不把文案或视觉人员当成检测负责人。无需现在确定供应商和截止日期。',['检测任务保持未分配，明确需寻找具备资质的执行者。','缺少负责人不阻止保留任务草稿；不能强行分配给相近岗位。']);
  missing?.assertion('未分配不伪造负责人','proposal.changes.*.fields.ownerRecommendation.basis','unassigned','contains');
  const definitions=[
    ['reuse','plan-reuse','04 · 查重：复用历史与保留新增范围','任务拆解与分配'],
    ['diagnosis','diagnosis-conflict','05 · AI 分析：旧文件与当前要求冲突','AI 分析'],
    ['block','diagnosis-block','06 · AI 分析：区分阻塞与正常等待','AI 分析'],
    ['status','status-current','07 · 进度分析：完成量不等于正式状态','进度分析'],
    ['progress','ewd-progress','08 · 进度分析：核对撤销与未知值','进度分析'],
    ['trend','ewd-trend','09 · 进度分析：范围缩减不算新增完成','进度分析'],
  ];
  for(const [key,source,name,category] of definitions)add(key,`lab-content-journey-${source}`,name,category);
  state.benchmarkVersion=1;return true;
}
