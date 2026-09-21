import type { LabState,LabTeam,LabTask,LabCase,SkillId } from '../../src/test-lab/types.ts';
import { industrySeed } from './industry-seeds.ts';
import { onlineCollaborationSeed } from './online-seeds.ts';
const task=(id:string,title:string,ownerId:string,goal:string,standard:string,status:LabTask['status']='进行中'):LabTask=>({id,title,createdById:ownerId,ownerId,goal,status,participantIds:[],parentId:null,dependsOnTaskIds:[],acceptanceCriteria:[standard],executionTips:['先核对当前要求，再交付可核查结果。'],estimatedMinutes:240,dueAt:null,tags:[],visibility:'team',version:1});
export function seedLab():LabState{
  const team:LabTeam={id:'lab-content',name:'星禾品牌内容团队',industry:'品牌与内容',description:'文案、设计、运营与审核共同推进新品首发，覆盖预算冲突、内容交付和跨岗位依赖。',archived:false,
    members:[{id:'zhou',name:'周岚',role:'项目负责人',responsibilities:['统筹品牌活动目标、预算与跨岗位交付'],version:1},{id:'lin',name:'林洁',role:'内容策划',responsibilities:['宣传脚本策划与交付','产品卖点文案'],version:1},{id:'chen',name:'陈默',role:'视觉设计',responsibilities:['活动海报设计与出图'],version:1},{id:'gao',name:'高远',role:'运营',responsibilities:['活动执行与直播运营'],version:1},{id:'xu',name:'许悦',role:'文字核查',responsibilities:['文字校对与产品表述核查'],version:1}],
    tasks:[task('launch','新品首发内容交付','zhou','完成新品首发宣传内容，预算不超过 10 万元','脚本、海报和活动方案按已确认要求交付'),task('script','完成新品介绍脚本','lin','形成准确清晰的新品宣传脚本','交付通过产品信息核对的完整脚本'),task('poster','完成首发海报','chen','根据活动标题与优惠信息完成海报定稿','提供可发布的海报文件'),task('budget','核对活动预算方案','zhou','活动预算不超过 10 万元','预算明细总额不超过 10 万元'),task('past-script','完成上一期短视频脚本','lin','制作上期宣传脚本','完整脚本已交付','已完成'),task('private','供应商费用谈判','zhou','核对内部采购报价','完成内部价格核对','待开始')],
    evidence:[{id:'script-file',taskId:'script',authorId:'lin',kind:'文件',title:'新品介绍脚本-v1.md',content:'本版完成产品介绍与口播；尚未包含活动标题、优惠金额和最终行动引导。',createdAt:'2026-09-01T09:00:00.000Z',version:1,visibleToIds:[]},{id:'poster-wait',taskId:'poster',authorId:'chen',kind:'讨论',title:'海报定稿依赖',content:'已完成海报版式，当前定稿必须使用活动标题和优惠信息；这些内容未交付，无法继续定稿。',createdAt:'2026-09-02T03:30:00.000Z',version:1,visibleToIds:[]},{id:'budget-file',taskId:'budget',authorId:'gao',kind:'文件',title:'活动预算方案.xlsx',content:'活动执行方案：达人合作 8 万元，直播制作 3 万元，物流 1 万元，合计 12 万元。预算上限尚未变更。',createdAt:'2026-09-02T06:00:00.000Z',version:1,visibleToIds:[]},{id:'past-delivery',taskId:'past-script',authorId:'lin',kind:'确认',title:'完成确认',content:'本人独立承担上期脚本内容制作并交付，已确认满足完成标准。直播排班仅临时协助，不属于长期责任。',createdAt:'2026-08-28T08:00:00.000Z',version:1,visibleToIds:[]}]};
  team.tasks[0].participantIds=['lin','chen','gao'];team.tasks[1].participantIds=['xu'];team.tasks[2].dependsOnTaskIds=['script'];team.tasks[2].parentId='launch';team.tasks[1].parentId='launch';team.tasks[3].tags=['重点任务'];team.tasks[5].visibility='restricted';
  const definitions:[string,string,SkillId,string,string|null,string][]=[
    ['create','创建宣传脚本并匹配成员','agentdoor-task-planner','zhou',null,'为新一款雨伞制作一份 30 秒介绍脚本，产品卖点以确认后的资料为准。不涉及拍摄剪辑，请推荐负责人和必要参与人，给出完成标准、执行建议与预计投入。'],
    ['responsibility','从实际贡献校准责任','agentdoor-responsibility-advisor','lin',null,'结合我负责或参与的任务与实际贡献，提出责任更新建议。直播只属于临时协助，不要归纳成长期职责。不要写入正式责任。'],
    ['status','交付缺口与当前状态','agentdoor-task-status-analyzer','lin','script','分析当前情况、下一步建议与进度。仅有部分脚本文字，不要把上传当作完成；缺少有效分配时进度保持未知。'],
    ['diagnosis','预算要求与交付冲突','agentdoor-task-diagnostician','zhou','budget','检查这项任务的执行阻塞和决策冲突，列出具体证据及建议，不修改预算或状态。'],
    ['priority','本人工作推荐与标签参考','agentdoor-personal-priority','zhou',null,'对我负责或参与的待开始、进行中、已阻塞任务排序，列出 B/C/P/D/H/Q、I/U/W 和一句处理原因；没有证据的分项标未知。'],
    ['effort','平台模板估算简短文案','agentdoor-ewd-progress','lin',null,'执行 estimate 模式：制作一份单主题新品通知文案，包含常规资料核对、自检和一轮修改，不涉及长篇研究、拍摄或额外版本。名称：新品上市通知；目标：告知上市；完成标准：交付一份事实准确、可直接发布的通知。请用平台规则估算，按规定 JSON 输出。'],
  ];
  const cases:LabCase[]=definitions.map(([id,name,skillId,actorId,taskId,prompt])=>({id:`case-${id}`,name,category:skillId.split('-').slice(1).join('-'),teamId:team.id,actorId,description:'当前规则的可编辑核心场景；AI 输出与人工判断分开记录。',archived:false,enabled:true,version:1,steps:[{id:'s1',prompt,skillId,taskId,usePreviousOutput:false,events:[]}],assertions:[{id:'schema',label:'返回结构版本',stepId:'s1',path:'schemaVersion',operator:'exists',expected:null}],reviewChecklist:['判断是否有可追溯依据','未知是否如实保留','是否遵守角色与确认边界']}));
  cases.push({...structuredClone(cases[1]),id:'case-feedback',name:'多轮责任纠正与再次分析',steps:[...structuredClone(cases[1].steps),{id:'s2',prompt:'用户已将责任明确为脚本策划与交付，并纠正直播为临时协助。结合当前责任和前次输出重新分析，不重复提出被纠正的建议。',skillId:'agentdoor-responsibility-advisor',taskId:null,usePreviousOutput:true,events:[{type:'responsibility',memberId:'lin',responsibilities:['短视频脚本策划与交付（不含直播运营）']}]}]});
  const checks:Record<string,[string,string,LabCase['assertions'][number]['expected']][]>={
    'case-create':[['无外部写入','externalEffects','none']],
    'case-responsibility':[['不产生责任写回回执','writeReceipt',null]],
    'case-status':[['保留正式状态','result.formalStatus','进行中'],['进度缺少依据时保持未知','result.progress.completionPercent',null]],
    'case-diagnosis':[['预算两侧冲突','result.diagnoses.0.type','decision_conflict'],['不改正式状态','result.formalStatusUnchanged',true]],
    'case-effort':[['单份通知按平台模板估算 240 分钟','result.estimate.totalEwdMinutes',240],['分钟换算为半人天','result.estimate.personDays',0.5]],
    'case-feedback':[['多轮分析不写回','writeReceipt',null]],
  };
  for(const c of cases)for(const [i,[label,path,expected]] of (checks[c.id]??[]).entries())c.assertions.push({id:`rule-${i}`,label,path,expected,operator:'equals',stepId:c.id==='case-feedback'?'s2':'s1'});
  const online=onlineCollaborationSeed(),industry=industrySeed();
  return {version:1,revision:0,teams:[team,...online.teams,...industry.teams],cases:[...cases,...online.cases,...industry.cases],runs:[]};
}
