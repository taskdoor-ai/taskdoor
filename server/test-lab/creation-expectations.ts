import type {LabCase,LabExpectedOutput,LabState} from '../../src/test-lab/types.ts';
import {expectedOutputFor} from '../../src/test-lab/expected-output.ts';
const common:LabExpectedOutput['checks']=[
 {id:'task-content',stepId:null,subject:'每个新建任务的目标与完成标准',criterion:'逐个核对新建节点，不得只返回任务名称。目标说明交付目的，完成标准可检查且覆盖输入指定范围；父级不重复计算叶子工作量。',expected:{eachCreatedTask:{fields:['title','goal.text','acceptanceCriteria','ownerRecommendation','estimate'],goal:'明确结果和用途，不是标题复述',acceptanceCriteria:'包含交付物、内容范围和通过条件'},processSteps:'非独立交付放 tips',maxDepth:4}},
 {id:'candidate-fit',stepId:null,subject:'具体候选成员及匹配依据',criterion:'按每项任务目标与所需工作对照全部可选成员当前责任，给出人员ID、匹配程度和覆盖/缺口依据。高低是任务责任匹配，不是能力、效率或概率评分；选择改变后理由同步改变。',expected:{levels:['高','中','低','未知'],source:'当前已确认责任',perCandidate:['memberId','匹配程度','覆盖责任','缺口','依据'],userOverride:'保留合法用户选择，basis=explicit，如实说明匹配缺口',forbidden:['虚构百分比','任务多即忙或能力强','未经采纳的责任建议当正式责任']}},
 {id:'effort-method',stepId:null,subject:'叶子任务人天估算与计算依据',criterion:'按工作明细逐项给出O/M/P及范围依据，用三点估算汇总；保留八维检查及避免重复计量的解释。重要紧急不直接乘工作量。v0.2明细放estimate.assumptions，ewdHours是人时不是人天。',expected:{dimensions:['交付规模','实现难度','信息不确定性','资料准备','协作依赖','修改迭代','核验验收','工具环境'],perItem:['工作内容','对应标准','O','M','P','单位','依据'],formula:'(O+4*M+P)/6',minutesPerPersonDay:480,hoursPerPersonDay:8,field:'fields.estimate.ewdHours',parent:'汇总叶子，不额外增加一份父级投入',unknown:'部分待估保留已知量，总量未知而不是0',priority:'仅实际增加的交付或核验工作影响估算，不使用重要/紧急倍率'}},
 {id:'existing-context',stepId:null,subject:'已有任务与下一阶段历史依据边界',criterion:'允许提供当前可见任务做范围与查重上下文，但不能据任务数量推断可用工时。未提供历史成果证据，不声称已验证该成员胜任；不得修改已有正式任务或伪造写入回执。',expected:{currentTasks:'只引用实际输入ID和版本',availability:'未提供，不猜测',historyMatching:'本阶段不以历史任务数量或标题评定胜任程度',externalEffects:'none'}},
];
export function migrateCreationExpectations(state:LabState){
 let normalized=false;for(const c of state.cases)if(c.origin==='creation-contract/2026-09'&&!c.contextMode){c.contextMode='team_tasks';normalized=true;}
 if(state.creationExpectationsVersion===1)return normalized;
 // Superseded synthetic time-capacity scenarios; their saved run snapshots remain untouched.
 state.cases=state.cases.filter(c=>c.origin!=='workload/2026-09');
 for(const c of state.cases){delete c.workload;if(!c.expectedOutput){const expected=expectedOutputFor(c);if(expected.checks.length)c.expectedOutput=expected;}
  if(c.steps.every(s=>s.skillId==='agentdoor-task-planner')&&c.expectedOutput){c.expectedOutput.checks=[...c.expectedOutput.checks,...common.map(x=>({...structuredClone(x),id:'planning-'+x.id}))].slice(0,100);c.version++;}}
 const team=state.teams.find(t=>t.id==='lab-content');
 if(team&&['zhou','lin','chen','gao','xu'].every(id=>team.members.some(m=>m.id===id))){
 const name=(id:string)=>team.members.find(m=>m.id===id)!.name;
 const people={script:{recommended:{memberId:'lin',name:name('lin'),level:'高',reason:'宣传脚本策划与交付、产品卖点文案'},alternatives:[{memberId:'xu',name:name('xu'),level:'中',reason:'文字核查只覆盖校对环节，不等同原创主责'},{memberId:'chen',name:name('chen'),level:'低',reason:'海报设计不覆盖原创脚本'}]},poster:{recommended:{memberId:'chen',name:name('chen'),level:'高',reason:'活动海报设计与出图'},alternatives:[{memberId:'lin',name:name('lin'),level:'中',reason:'可供文案，不覆盖设计出图'},{memberId:'gao',name:name('gao'),level:'低',reason:'执行运营不覆盖设计出图'}]}};
 const defs=[
 {key:'first',title:'首次创建 · 脚本目标与人天',fresh:true,prompt:'这是首次创建，任务列表为空。请为新品雨伞创建一项30秒介绍脚本任务，仅交付完整口播文本，不含拍摄剪辑。目标是让消费者理解已确认的轻量、折叠尺寸和开合方式；不得新增防风防漏承诺。请生成目标、可核对的完成标准、负责人候选及匹配程度、预计人天和明细依据。',specific:{taskCount:1,deliverable:'30秒口播脚本',goal:'让消费者理解三项已确认卖点',acceptance:['完整口播文本','时长约30秒','覆盖轻量、折叠尺寸、开合方式','不新增性能承诺'],people:people.script}},
 {key:'split',title:'两个交付 · 分别匹配人员与估算',fresh:true,prompt:'请规划两个独立交付：30秒新品雨伞介绍脚本、活动海报定稿。脚本只依据确认后的商品资料；海报提供可发布文件，活动标题为“轻行出发”，无促销优惠，二者不互相等待。不建父任务，不包含拍摄、直播或投流。分别生成目标、完成标准、人员候选与匹配程度、人天估算及依据。',specific:{taskCount:2,relationships:'两个平行交付，不建立虚构依赖',script:{goal:'准确传达产品卖点',acceptance:['完整30秒口播文本','卖点有确认依据'],...people.script},poster:{goal:'形成可发布的活动视觉物料',acceptance:['活动标题和优惠信息与已确认资料一致','交付可发布的海报文件'],...people.poster}}},
 {key:'override',title:'人工改选负责人 · 保留选择与匹配缺口',fresh:true,prompt:`请创建30秒雨伞原创脚本任务，输出目标、完成标准、人天明细和候选匹配程度。我明确选择${name('gao')}（gao）负责，即使责任匹配不足也保留这个选择，并向我说明与${name('lin')}（lin）相比的责任覆盖差异。不得擅自换回推荐人，不假设任何人的可用工时。`,specific:{taskCount:1,owner:{memberId:'gao',basis:'explicit',level:'低',gap:'活动执行与直播运营不覆盖原创脚本'},alternative:people.script.recommended,required:'选人改变不改变工作本身的预计人天，不把低匹配直接解释为低效率'}},
 {key:'estimate',title:'既有任务上下文 · 三点估算与单位',fresh:false,prompt:'本轮仅创建一项新周期的内部交接清单任务，与已有商品脚本、海报不是同一交付。目标是让接收人核对资料和交接项是否齐全；交付一份覆盖资料版本、交接项、通过条件的清单。已确认工作明细以分钟计：资料核对 O=30/M=60/P=90，清单编写 O=60/M=120/P=180，验收复核 O=15/M=30/P=45。三项互不重叠；请计算人天并解释，不因“重要且紧急”乘工作量，不按团队任务数量推测忙闲。',specific:{taskCount:1,workItems:[{name:'资料核对',ewdMinutes:60},{name:'清单编写',ewdMinutes:120},{name:'验收复核',ewdMinutes:30}],totalEwdMinutes:210,ewdHours:3.5,personDays:0.4375,tolerance:0.01,existingTasks:'保留原任务ID、人员、状态和版本，不声称已写入',owner:'根据现有责任解释候选，不将历史任务条数当能力或空闲依据'}},
 ];
 for(const d of defs){const id='lab-content-creation-contract-'+d.key;if(state.cases.some(c=>c.id===id))continue;const c:LabCase={id,name:d.title,category:'创建任务完整输出',teamId:team.id,actorId:'zhou',description:'核对目标、完成标准、具体人员匹配和人天估算；不提供人工可用窗口。',enabled:true,archived:false,version:1,...(d.fresh?{creationContext:'fresh' as const}:{}),contextMode:'team_tasks',origin:'creation-contract/2026-09',tags:['重点：任务拆解','重点：成员匹配','重点：人天估算'],steps:[{id:'s1',prompt:d.prompt,skillId:'agentdoor-task-planner',taskId:null,usePreviousOutput:false,events:[]}],assertions:[],reviewChecklist:[],expectedOutput:{version:1,checks:[{id:'scenario-result',stepId:'s1',subject:'本例具体任务与人员预期',criterion:'按交付语义匹配节点，不依赖数组位置或生成的任务ID。核对下列具体对象、人员、关系和数值；责任已被用户编辑且与预期冲突时指出夹具冲突，不把预期当事实。',expected:d.specific as any},...structuredClone(common)]}};state.cases.push(c);}
 }
 state.creationExpectationsVersion=1;return true;
}
