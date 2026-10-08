import type {LabCase,LabState,LabTask} from '../../src/test-lab/types.ts';

type Scenario={key:string;name:string;tag:string;input:string;checks:string[]};
// Extra coverage is opt-in by selecting individual cases; initialization never runs MCP writes.
export function addMcpCoverage(state:LabState){
 let changed=false;
 for(const team of state.teams.filter(t=>!t.archived&&t.members.length&&t.tasks.length)){
  const root=team.tasks.find(t=>!t.parentId)??team.tasks[0];
  const tasks=[...team.tasks.filter(t=>!team.tasks.some(child=>child.parentId===t.id)),...team.tasks.filter(t=>team.tasks.some(child=>child.parentId===t.id))].slice(0,20);
  const brief=(t:LabTask)=>`标题“[MCP评测] ${t.title}”；目标“${t.goal||`交付${t.title}的结果`}”；完成标准：${t.acceptanceCriteria.join('；')||'提供可核对的交付记录'}`;
  const scope=`本次业务：${root.title}。`;
  const scenarios:Scenario[]=tasks.map((t,i)=>({key:`business-${i+1}`,name:`业务字段组合 · ${t.title}`,tag:'业务组合',input:`实际创建独立任务：${brief(t)}。本次截止日期2026-12-31；执行建议两条：核对输入范围、保留交付依据；预计人工投入60分钟，方法为人工逐项核对，依据为本次一轮核对。不要拆分。`,checks:['恰好创建一个根任务，各字段与本次业务输入对应。','dueDate 为2026-12-31，executionTips 两条，effortEstimate.minutes 为60。']}));
  const add=(key:string,name:string,tag:string,input:string,...checks:string[])=>scenarios.push({key,name,tag,input:scope+input,checks});
  const nodeRule='节点标题加上本次业务名；每个节点目标为交付该节点对应的结果，完成标准为提供该结果的可核对记录。';
  const graph=(key:string,name:string,description:string,checks:string[],tag='依赖组合')=>add(key,name,tag,`实际创建以下新任务：${description}${nodeRule}先创建全部节点，再根据明确的前置关系设置依赖；没有列出的依赖不要添加。`,...checks);
  graph('chain','三节点串行链','三个独立根任务A资料整理、B资料核对、C交接；B依赖A，C依赖B。',['恰好3个根任务；依赖集合B=[A]、C=[B]、A=[]。']);
  graph('fanin','双前置汇聚','三个独立根任务A交付清单、B核对证据、C交接资料；C同时依赖A和B。',['C有且仅有A、B两个前置；A、B互不依赖。']);
  graph('fanout','一个前置分叉','三个独立根任务A确认资料、B文字交付、C图表交付；B和C分别依赖A。',['B=[A]、C=[A]；B、C可以并行，无相互依赖。']);
  graph('diamond','菱形依赖','四个独立根任务A范围记录、B清单、C证据、D汇总；B、C依赖A，D依赖B和C。',['4个任务；B=[A]、C=[A]、D=[B,C]，不加传递冗余边D→A。']);
  graph('cross','跨分支叶子依赖','根R下有分支P和Q；P下有A资料初稿，Q下有B资料核对；只有B依赖A。',['共5个任务；R→P→A和R→Q→B两条层级分支。','唯一前置边是B依赖A；不得用移动任务代替依赖。']);
  graph('siblings','兄弟归属不代表先后','父R下有A清单和B证据两项，明确可同时进行。',['一个父任务两个子任务；均无前置依赖。'],'任务层级');
  graph('four-level','四层任务链','根R→阶段P→资料包Q→叶子A四层，箭头仅表示父子归属，无前置关系。',['4个节点深度1至4，逐层真实创建；无依赖。'],'任务层级');
  graph('balanced','两分支四叶子','根R下P文字资料和Q证据资料；P下A初稿、B清稿，Q下C清单、D记录。各项无前置。',['7个任务；P、Q同属R；A、B属P，C、D属Q。'],'任务层级');
  graph('mixed','叶子与分支混合','根R下A独立清单和P资料包；P下B文字资料与C核对记录。',['5个任务；A、P同属R，B、C同属P。'],'任务层级');
  graph('batch-five','五个同父子任务批量','根R下5个直属子任务，分别交付范围清单、文字资料、证据目录、核对记录、交接说明。优先使用create_subtasks批量创建。',['共6个任务；5个子任务共享同一个真实父ID。','批量回执各项ID正确映射，逐项保存标准并回读。'],'批量创建');
  graph('two-roots','两棵独立任务树','根R1交付准备和根R2交接准备；R1下A清单、B资料，R2下C核对、D说明。两棵树互不依赖。',['6个任务两棵树；子节点不混入另一棵树。'],'任务层级');
  graph('same-title-child','不同父节点下同名子任务','根R下P渠道甲和Q渠道乙；P、Q各自有一个标题相同的“交付核对”子任务；甲节点标准为甲渠道记录，乙节点标准为乙渠道记录。',['两个同名叶子具有不同真实ID和不同parentTaskId，标准不串位。'],'任务层级');
  add('same-title-roots','明确新增两项同名任务','幂等与查重','明确授权创建两个标题相同的独立任务“[MCP评测] 交付核对”，第一个目标和标准为甲批次核对记录，第二个为乙批次核对记录。不是重复重试。','两个根任务ID不同；各自目标和标准不混淆；创建动作使用不同幂等键。');
  add('repeat-batch','批量创建重放','幂等与查重',`创建根任务及其两个直属子任务A清单、B记录。针对同一个create_subtasks动作，用相同父ID、相同参数和相同幂等键调用两次。${nodeRule}`,'两次批量回执返回同一组子任务ID；总共仅3个任务。');
  add('criterion-replace','同次运行标准修订','版本与修改',`先创建任务：${brief(tasks[0])}。先保存标准“提供初稿”，回读；随后仅修改本次新任务的标准为“提供清稿”和“附核对记录”。`,'同一个任务ID；最终criteria有且仅有两条指定标准。','第二次set_task_criteria使用重新读取的criteria.version，不混用任务顶层版本。');
  add('goal-update','同次运行目标补充','版本与修改',`先创建任务：${brief(tasks[0])}。然后仅将该新任务目标改为“交付完整资料并附逐项核对记录”，保留标题、负责人和标准。`,'仅一个任务；update_task用本次任务顶层version。','回读目标为新文本，其他指定字段保留。');
  add('dependency-replace','同次运行依赖替换','版本与修改',`创建三个新根任务A资料、B清单、C核对。先设置C依赖A，回读后改为只依赖B。${nodeRule}`,'最终C依赖集合=[B]，A不再出现在集合中。','两次使用各自最新dependencies.version，没有另建C。');
  add('date-update','同次运行截止日期改期','截止日期',`创建任务：${brief(tasks[0])}。截止日期先为2026-12-20，回读后仅将该新任务改为2026-12-31。`,'同一个ID最终dueDate=2026-12-31，没有开始日期写入。','改期使用最新任务version，未重建任务。');
  add('branch-dates','父子不同截止日期','截止日期',`创建父“[MCP评测] ${root.title}资料包”，目标和标准为交付完整资料包，截止2026-12-31；子A资料交付截止2026-12-20，子B核对记录截止2026-12-25，目标和标准分别为资料、核对记录。`,'父及两个子任务各自dueDate正确，未继承成同一天。');
  add('partial-date','只有部分节点有截止日期','截止日期',`创建父“[MCP评测] ${root.title}准备”，不设置截止日期；其下A清单截止2026-12-20，B证据不设置截止日期；目标和标准对应节点交付。`,'只有A写入dueDate；父与B没有猜测截止日期。');
  add('hour-convert','小时换算为分钟','投入估算',`创建任务：${brief(tasks[0])}。人工预计1.5小时，方法为逐项核对，依据为一次资料检查。`,'effortEstimate.minutes=90，是整数；workMethod和reason完整。');
  add('day-convert','人天换算为分钟','投入估算',`创建任务：${brief(tasks[0])}。人工预计0.5人天，本次1人天明确为480分钟；方法为人工整理，依据为半天资料整理。`,'effortEstimate.minutes=240，不写0.5或30；记录方法与依据。');
  add('zero-effort','明确零人工投入','投入估算',`创建任务：${brief(tasks[0])}。本次明确预计人工投入0分钟，方法为已有自动流程处理，依据为无需人工操作。这里只创建任务，不执行自动流程。`,'明确的effortEstimate.minutes=0保留，不能当作未知省略。');
  add('unknown-effort','未知投入不填零','投入估算',`创建任务：${brief(tasks[0])}。人工投入未知，请省略整个effortEstimate，不根据标题估算。`,'没有发送effortEstimate对象，不能以0表示未知。');
  add('leaf-effort','叶子工时不重复累计','投入估算',`创建父“[MCP评测] ${root.title}资料包”和两个直属子任务A整理、B核对。A人工投入30分钟，B45分钟，方法为人工处理，依据为对应一轮处理；父不估算。节点目标和标准对应交付。`,'A=30、B=45；父不重复写入75分钟或其他估算。');
  add('ten-criteria','十条标准完整保存','完成标准',`创建任务：${brief(tasks[0])}。本次标准替换为十条，严格分别是“核对项目01”至“核对项目10”；其他原标准不保留。`,'criteria恰好10条，01到10无缺漏、无合并。');
  add('criteria-order','标准顺序与编号','完成标准',`创建任务：${brief(tasks[0])}。本次标准按顺序严格为“1. 核对范围”、“2. 检查记录”、“3. 提供交接说明”，替换原标准。`,'三条标准文字和顺序保留，包括编号。');
  add('thresholds','数值阈值不弱化','完成标准',`创建任务：${brief(tasks[0])}。标准改为“核对20条记录，无遗漏”、“差错数等于0”、“连续观察48小时记录齐全”。`,'20、0、48小时和等于/无遗漏条件保留；不能只写基本完成。');
  add('pending-facts','外部承诺不等于已到位','事实与边界',`创建任务：${brief(tasks[0])}。外部只承诺提供资料，尚未收到。新增标准“实际收到资料后完成核对”；目标记录待资料到位，不表示已经收到。`,'新任务目标与标准保留等待事实，不声称已收到、已核对或已完成。');
  add('scope-exclusion','明确排除业务范围','事实与边界',`创建任务：${brief(tasks[0])}。只创建资料核对，不创建发布、通知、签约或付款任务；标准为资料核对记录完整。`,'仅创建核对任务，不扩展为发布等实际业务动作或额外任务。');
  add('unassigned-participant','可选参与者未知','成员分配',`创建任务：${brief(tasks[0])}。负责人用当前有效成员；暂时没有参与者安排，不按姓名或本地角色猜测。`,'未添加输入未授权的参与者；ownerMemberId仍为真实当前有效成员。');
  add('multi-participant','多个有效参与者','成员分配',`创建任务：${brief(tasks[0])}。若有其他ACTIVE成员，按真实成员ID稳定排序选最多2位，逐一添加为MEMBER并回读。成员不足时按实际数量添加并说明。`,'最多2位额外ACTIVE参与者，身份不重复，不包含负责人或INVITED成员。','list_task_members能核对新增参与者，不虚构补足数量。');
  add('viewer','只读协作角色','成员分配',`创建任务：${brief(tasks[0])}。若存在另一位ACTIVE成员，添加为VIEWER，不给编辑参与者角色；没有时说明。`,'存在成员时set_task_member.role=VIEWER且回读一致，不发送OWNER。');
  add('multiline-goal','多行目标保真','文本保真',`创建标题“[MCP评测] ${root.title}资料说明”；目标严格为两行“第一行：交付资料\n第二行：附核对记录”；标准为资料与记录齐全。`,'goal保留两行内容，换行不变成字面量反斜杠n或HTML标签。');
  add('unicode','中英文与Emoji','文本保真',`创建标题“[MCP评测] ${root.title} QA ✅”；目标“交付 v2.1 中文 / English 核对记录”；标准为“版本 v2.1 一致”、“记录包含 ✅ 标记”。`,'中英文、版本号、斜杠与Emoji原文保存，不截断。');
  add('tips-order','执行提示有序列表','文本保真',`创建任务：${brief(tasks[0])}。执行提示严格依次为“先核对范围”、“再检查记录”、“最后整理交接说明”。`,'executionTips恰好三条，顺序和文字一致。');
  add('quoted-text','引号与反斜杠','文本保真',`创建标题“[MCP评测] ${root.title}引号核对”；目标包含原文：版本“候选A”、路径 docs\\release。标准为两个片段均原样保存。`,'JSON转义后真实存储内容仍含引号和一个反斜杠，不双重转义。');
  add('readback-fields','完整字段回读证据','回读与结果',`创建任务：${brief(tasks[0])}。截止2026-12-31，人工投入20分钟，方法为核对资料，依据为单轮核对；执行提示为“保留证据”。返回各字段实际回读值。`,'实际get_task字段、criteria.items和真实ID作为结果依据，不能只复制请求作为成功证据。');
  add('id-map','多任务ID逐项映射','回读与结果',`创建三个根任务，标题都含本次业务名，后缀分别为A清单、B记录、C说明；各自目标和标准分别对应A、B、C结果。逐一返回标题与真实ID及回读值。`,'三项标题与ID一一映射，ID均不同；没有把content和structuredContent当成两次创建。');
  add('isolation','本次新任务操作范围','回读与结果',`创建任务：${brief(tasks[0])}。即使真实空间存在同名历史任务，也已明确授权本次创建新评测任务；不修改、归档或删除历史任务。`,'写入目标仅限本次新建ID；所有历史任务保持原记录。');

  const common='读取实时tools/list与真实工作区有效成员；负责人使用当前凭据对应的member.id，不使用本地模拟ID。只执行本次任务创建和明确的新任务字段设置，不执行任务对应的业务。所有标准通过set_task_criteria保存，标准、依赖分别使用各自最新版本。逐项get_task回读并返回真实任务ID；未知或失败如实记录，不伪造成功。只设置截止日期，不提交开始日期。';
  for(const d of scenarios){
   const id=`mcp-coverage-v4-${team.id}-${d.key}`;
   if(state.cases.some(c=>c.id===id))continue;
   const checks=['真实MCP成功创建，并以get_task回读同一真实ID和工作区；各节点标准实际保存。',...d.checks];
   const c:LabCase={id,name:`${team.name} · ${d.name}`,teamId:team.id,actorId:team.members[0].id,category:'真实 MCP 创建',description:'业务组合与边界覆盖；只使用真实 MCP 执行和回读。',tags:['真实 MCP',d.tag],archived:false,enabled:true,version:1,steps:[{id:'s1',skillId:'agentdoor-task-planner',prompt:d.input+common,taskId:null,usePreviousOutput:false,events:[]}],assertions:[],reviewChecklist:checks,expectedOutput:{version:1,checks:checks.map((criterion,i)=>({id:`check-${i+1}`,stepId:'s1',subject:'真实创建回执',criterion,expected:null}))},origin:'mcp-coverage-v4'};
   state.cases.push(c);changed=true;
  }
 }
 return changed;
}
