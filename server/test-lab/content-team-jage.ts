import type {LabCase, LabMember, LabState} from '../../src/test-lab/types.ts';

// Test configuration, supplied by the user; never inferred from permission roles.
export const jageWorkProfile = {
 role:'视觉设计与素材制作',
 responsibilities:[
  '负责新品主视觉、发布海报、官网配图与渠道视觉素材的设计制作',
  '交付可编辑源文件、各渠道导出图和素材版本说明，核对画幅、版式与视觉一致性',
  '依据已确认的产品资料与文案制作视觉，不自行修改产品承诺、价格或发布范围',
 ],
};
export const contentWriterWorkProfile = {
 role:'脚本与文案制作',
 responsibilities:[
  '策划并交付宣传脚本、产品卖点文案、官网介绍和渠道适配文案',
  '向视觉制作提供已确认的文字稿，保留内容版本与交付说明',
  '根据已确认资料制作内容，不自行新增产品承诺；视觉设计由Jage负责',
 ],
};

// Explicitly matched fixture text only: keep custom cases and immutable run snapshots intact.
const replacements = new Map<string,[string,string][]>([
 ['d-three',[['总任务由卜佳菲统筹，脚本和主视觉由林洁负责，活动方案由tiger huang负责。','总任务由卜佳菲统筹，脚本由林洁负责，主视觉由Jage负责，活动方案由tiger huang负责。']]],
 ['d-channels',[['不人为添加串行依赖；内容制作归林洁，客服协作与核对归tiger huang，统筹归卜佳菲。','不人为添加串行依赖；官网介绍由林洁负责，门店海报由Jage负责，客服协作与核对由tiger huang负责，统筹由卜佳菲负责。']]],
 ['d-stage',[['依赖对应口径确认和最终物料，父子归属不自动成为依赖；卜佳菲确认口径，林洁制作，tiger huang交接。','依赖对应口径确认和最终物料，父子归属不自动成为依赖；卜佳菲确认口径，林洁制作文案，Jage制作海报，tiger huang交接。']]],
 ['d-tree',[['文案、配图、海报由林洁负责，执行清单与渠道交接由tiger huang负责，总体由卜佳菲统筹。','文案由林洁负责，配图和海报由Jage负责，执行清单与渠道交接由tiger huang负责，总体由卜佳菲统筹。']]],
 ['d-review',[['林洁负责海报，tiger huang负责核查。','Jage负责海报，tiger huang负责核查。']]],
 ['a-design',[['林洁负责视觉制作；tiger huang如参与，仅承担素材和文字核查。','Jage负责视觉制作；tiger huang如参与，仅承担素材和文字核查。']]],
 ['a-roles',[['林洁负责设计，权限角色或当前用户身份不作为能力证据。','Jage负责设计，权限角色或当前用户身份不作为能力证据。']]],
 ['c-release',[['林洁承担文案与视觉制作，tiger huang承担客服核查与门店执行清单；不执行发布。','林洁承担文案制作，Jage承担主视觉制作，tiger huang承担客服核查与门店执行清单；不执行发布。']]],
 ['c-consistency',[['口径确认由卜佳菲负责，制作由林洁，最终核查由tiger huang。','口径确认由卜佳菲负责，文案由林洁制作，海报由Jage制作，最终核查由tiger huang负责。']]],
 ['c-channel-review',[['林洁承担制作，tiger huang承担现场清单和交接，卜佳菲统筹。','林洁承担文案制作，Jage承担配图和海报制作，tiger huang承担现场清单和交接，卜佳菲统筹。']]],
 ['c-small',[['一项小范围视觉修改，林洁负责，不额外拆调研、统筹、发布任务。','一项小范围视觉修改，Jage负责，不额外拆调研、统筹、发布任务。']]],
 ['c-deadline',[['林洁负责两项制作，卜佳菲统筹；不能从同一负责人推导串行依赖。','林洁负责文案，Jage负责海报，卜佳菲统筹；文案与海报可以并行，不添加输入未要求的串行依赖。']]],
 ['c-owner',[['整体负责人卜佳菲，叶子按制作与核查/交接结果分给对应成员。','整体负责人卜佳菲，文案由林洁负责，视觉由Jage负责，核查和交接由tiger huang负责。']]],
]);
const oldOwnerPrompt='帮我建一份新品发布资料包，卜佳菲统筹确认范围，林洁制作文案和视觉，tiger huang核查并准备渠道交接。每项要能独立验收，不要给同一项设三个负责人。';
const newOwnerPrompt='帮我建一份新品发布资料包，卜佳菲统筹确认范围，林洁制作文案，Jage制作视觉，tiger huang核查并准备渠道交接。每项要能独立验收，不要给同一项设多个负责人。';

type Definition={key:string;category:string;title:string;input:string;checks:string[]};
const definitions:Definition[]=[
 {key:'visual',category:'成员分配',title:'新增成员承担视觉制作',input:'帮我建一张新品首发主视觉的任务，需要可编辑源文件、商城导出图和版本说明，画幅为1080×1080。产品卖点和文案已确认，请按团队职责找负责人。',checks:['Jage负责视觉制作；完成标准保留1080×1080、源文件、导出图和版本说明。','林洁、tiger huang、卜佳菲不因在团队中就被全部加入参与。']},
 {key:'explicit',category:'成员分配',title:'明确指定Jage负责',input:'建一个门店海报任务，这次让Jage负责，tiger huang帮忙核对文字和素材来源。交付A3海报源文件、打印文件和核对记录。',checks:['负责人为Jage，tiger huang通过真实成员工具加入为参与者；任务只有一位负责人。','完成标准分别保留A3、源文件、打印文件与核对记录。']},
 {key:'collaborate',category:'成员分配',title:'设计负责文案协作',input:'安排一张新品图文海报，Jage负责设计，林洁提供文案作为协作人。交付一张1080×1920海报，文字要讲清用途和两项卖点，卖点资料已经确认。',checks:['Jage为负责人，林洁为必要参与者，分别说明视觉和文字贡献。','只有一张图文海报的交付任务；用途、两项卖点、1080×1920和图文交付要求实际保存。']},
 {key:'channel-assets',category:'任务拆解',title:'视觉渠道规格分别交付',input:'官网横幅和门店海报各安排一个任务，两份独立验收、可以同时做。横幅尺寸1920×600，海报为A3，两份都要源文件和导出图。卖点文案已确认，按职责安排。',checks:['官网横幅和门店海报分别形成任务，由Jage负责，不因为同一负责人合并或添加串行依赖。','各自完成标准对应1920×600与A3，并保留源文件和导出图。']},
 {key:'four-deliveries',category:'拆解与分工',title:'四人首发流程分工',input:'帮我安排新品首发准备：官网介绍讲清用途和三项卖点；主视觉交源文件和商城导出图；门店方案交现场步骤和检查清单；最后交一份文字及素材来源核查记录。整体预算不超过2万元，2026年12月31日前准备好。请按职责分工，核查等文案和主视觉定稿后做，暂不实际发布。',checks:['整体由卜佳菲统筹，官网介绍由林洁负责，主视觉由Jage负责，门店方案和独立核查由tiger huang负责。','文案、主视觉、门店方案、核查记录是四项独立交付；核查依赖文案和主视觉，制作之间可以并行。','各节点目标与完成标准均保存，预算2万元及整体截止日期2026-12-31不遗漏；不执行发布。']},
 {key:'copy-to-design',category:'创建流程',title:'文案定稿到设计交接',input:'安排新品文案定稿和海报设计两个任务，先交一份600字以内的定稿文案，再用定稿制作1080×1920海报，海报交源文件和导出图。按大家职责分配，设计要等文案定稿。',checks:['文案由林洁负责，海报由Jage负责；海报依赖文案，父子归属不代替前置关系。','文案600字以内、海报1080×1920、源文件和导出图分别保存至对应任务标准。']},
 {key:'visual-review',category:'创建流程',title:'视觉制作与独立核查',input:'帮我安排一张商城主视觉和一份独立核查记录。主视觉要源文件、导出图和素材版本说明；核查检查文字与商品资料是否一致、素材来源是否齐全。先做好主视觉，再由其他人核查，按职责分工。',checks:['Jage负责主视觉，tiger huang负责独立核查；两项可验收交付分开，核查依赖主视觉。','源文件、导出图、素材版本说明、商品资料一致性和素材来源完整性保存至各自标准。']},
 {key:'parallel',category:'拆解与分工',title:'文案设计并行制作',input:'产品口径已经确认，安排一份官网介绍和一张首发海报，可以并行制作，不必等文案写完才开始设计。官网介绍包含用途和适用人群，海报使用已确认卖点，交源文件和导出图。请按职责安排。',checks:['官网介绍由林洁负责，海报由Jage负责；两个独立交付互不依赖。','不再创建卖点确认任务；各自保留用途、适用人群、已确认卖点和视觉文件要求。']},
 {key:'visual-fields',category:'任务基础信息',title:'设计任务基础信息完整保存',input:'帮我建“新品首发海报定稿”任务，Jage负责，2026年12月25日前交。目标是交付门店可打印的新品海报，完成时检查A3尺寸、商品名称准确、源文件和打印PDF齐全。制作建议先核对已确认文案，再检查打印出血，预计人工制作90分钟。',checks:['任务名称、目标、Jage负责人和截止日期2026-12-25正确保存。','完成标准包含A3尺寸、商品名称准确、源文件和打印PDF齐全，执行建议为核对文案和检查打印出血两条。','保留90分钟人工投入并说明制作方法和估算依据；若服务标记需复核，如实说明。']},
 {key:'visual-package',category:'任务拆解',title:'同一海报的文件不拆任务',input:'给新品发布海报建一个任务，Jage负责，交同一张海报的源文件、PNG和打印PDF，再附版本说明。这些是同一份海报的交付文件，不需要分别建任务。',checks:['只创建一个海报任务，Jage负责，不按源文件、PNG、PDF或版本说明拆成多个任务。','四种交付要求逐条实际保存，任务回读结果与输入对应。']},
];

export function updateContentTeamJageCases(state:LabState){
 const team=state.teams.find(t=>t.id==='lab-content');
 const jage:LabMember|undefined=team?.members.find(m=>m.name==='Jage'&&m.mcpMemberId&&m.responsibilities.length);
 if(!team||!jage)return false;
 let changed=false;
 for(const item of state.cases.filter(c=>c.teamId===team.id&&c.origin==='planning-core-v1')){
  let edited=false;
  for(const [from,to] of replacements.get(item.id.replace('planning-core-v1-',''))??[]){
   if(item.reviewChecklist.includes(from)){item.reviewChecklist=item.reviewChecklist.map(s=>s===from?to:s);edited=true;}
   for(const check of item.expectedOutput?.checks??[])if(check.criterion===from){check.criterion=to;edited=true;}
  }
  if(item.id==='planning-core-v1-c-owner'&&item.steps[0]?.prompt===oldOwnerPrompt){item.steps[0].prompt=newOwnerPrompt;edited=true;}
  if(edited){item.version++;changed=true;}
 }
 for(const d of definitions){
  const id=`content-jage-v1-${d.key}`;if(state.cases.some(c=>c.id===id))continue;
  const checks=['通过真实MCP创建并逐项回读；负责人和参与者使用核对过的在职成员ID，名称、目标与完成标准实际保存。',...d.checks];
  const item:LabCase={id,name:`${d.category} · ${d.title}`,teamId:team.id,actorId:team.members.find(m=>m.id==='zhou')?.id??team.members[0].id,
   category:'创建任务核心评测',description:'验证四人团队的任务拆解、职责分配及基础信息生成。',tags:['真实 MCP',...(d.category==='拆解与分工'?['重点：任务拆解','重点：成员分配']:[`重点：${d.category}`])],
   requiresMemberContext:true,inputFormat:'natural-v1',archived:false,enabled:true,version:1,
   steps:[{id:'s1',skillId:'agentdoor-task-planner',prompt:d.input,taskId:null,usePreviousOutput:false,events:[]}],assertions:[],reviewChecklist:checks,
   expectedOutput:{version:1,checks:checks.map((criterion,i)=>({id:`check-${i+1}`,stepId:'s1',subject:d.category,criterion,expected:null}))},origin:'content-jage-v1'};
  state.cases.push(item);changed=true;
 }
 return changed;
}
