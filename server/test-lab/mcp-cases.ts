import {migrateNaturalCaseInputs} from './natural-case-input.ts';
import {addMcpCoverage} from './mcp-coverage.ts';
import type {LabState,LabCase} from '../../src/test-lab/types.ts';
// Live cases never depend on mock identities, task IDs, or sandbox output schemas.
export function addLiveMcpCases(state:LabState){
 const team=state.teams.find(t=>!t.archived&&t.members.length);if(!team)return false;
 const definitions=[
  {key:'single',name:'真实 MCP · 单任务创建',prompt:'请在当前 MCP 工作区实际创建一个任务：标题为“[MCP评测] 编写产品介绍文案”，目标是交付一份简明产品介绍，完成标准为包含产品用途、适用对象和核心特点。负责人使用 MCP 查询到的当前成员。请通过真实工具创建并回读，返回真实任务 ID。',criteria:['通过真实 MCP 创建任务，并用 get_task 回读同一任务 ID。','任务标题、目标和三个完成要求与输入一致。','负责人来自真实工作区成员，不使用模拟成员 ID。']},
  {key:'children',name:'真实 MCP · 父子任务创建',prompt:'请在当前 MCP 工作区实际创建“[MCP评测] 准备新品发布资料”父任务，目标是交付完整发布资料。拆成两个可独立验收的子任务：“编写介绍文案”（包含用途、适用对象、核心特点）和“制作发布海报”（包含产品名称和发布信息）。父子任务负责人均使用 MCP 查询到的当前成员。通过真实工具创建并逐项回读。',criteria:['真实创建一个父任务和两个子任务，返回各自真实 ID。','两个子任务的 parentTaskId 都指向本次父任务。','各节点保存对应目标和完成标准，逐项 get_task 回读确认。']},
  {key:'deadline',name:'真实 MCP · 截止日期创建',prompt:'请在当前 MCP 工作区实际创建“[MCP评测] 校对发布文案”，目标是交付无错字且信息一致的文案。完成标准：修正错别字、核对产品名称、核对发布日期。截止日期为 2026-12-31，不设置开始日期。负责人使用 MCP 查询到的当前成员。通过真实工具创建并回读。',criteria:['真实创建并回读任务，提供真实任务 ID。','截止日期为 2026-12-31，不写入开始日期。','目标、三项完成标准和真实负责人保存正确。']},
  {"key": "criteria", "name": "真实 MCP · 完成标准单独写入", "prompt": "实际创建“[MCP评测] 整理产品规格表”，目标是交付完整规格表。完成标准必须通过 set_task_criteria 保存为三条：包含尺寸；包含材质；包含适用范围。不要只写在目标或回复中。负责人和上下文必须从当前真实 MCP 工作区读取。只通过真实工具执行，返回新建的真实 ID，并逐项回读核对。", "criteria": ["创建任务后读取 criteria.version，再用 set_task_criteria 写入三条标准。", "get_task 回读 criteria 包含上述三条，且 unavailable 不为 true。"]},
  {"key": "tips", "name": "真实 MCP · 执行建议保存", "prompt": "实际创建“[MCP评测] 核对发布素材”，目标是交付已核对的素材包。完成标准：素材名称一致、发布日期一致。执行建议按两条保存：先核对原始资料；再检查最终导出文件。负责人和上下文必须从当前真实 MCP 工作区读取。只通过真实工具执行，返回新建的真实 ID，并逐项回读核对。", "criteria": ["executionTips 为两条字符串，内容对应输入，不合并为单一文本。", "目标与完成标准分别保存并回读确认。"]},
  {"key": "effort", "name": "真实 MCP · 投入估算字段", "prompt": "实际创建“[MCP评测] 校对短篇介绍”，目标是交付已校对文案，完成标准为无错别字、产品名称一致。预计人工投入明确为30分钟，工作方法为人工逐句校对，依据为一篇短文的一次核对；按真实 effortEstimate 字段保存。负责人和上下文必须从当前真实 MCP 工作区读取。只通过真实工具执行，返回新建的真实 ID，并逐项回读核对。", "criteria": ["effortEstimate.minutes 为整数30，而非30小时。", "workMethod 与 reason 保存输入明确给定的方法和依据。", "创建后的任务及标准回读成功。"]},
  {"key": "deep", "name": "真实 MCP · 三层任务树", "prompt": "实际创建“[MCP评测] 产品资料交付”父任务，目标为交付资料包；其下创建“准备文字资料”，目标为交付文字资料；在这个子任务下创建“编写产品简介”，目标为交付简介，完成标准为包含用途和特点。每个父节点的完成标准为对应下级资料全部交付。负责人和上下文必须从当前真实 MCP 工作区读取。只通过真实工具执行，返回新建的真实 ID，并逐项回读核对。", "criteria": ["共有三个真实任务，形成根、子、孙三层。", "中间节点 parentTaskId 指向根；叶子 parentTaskId 指向中间节点。", "逐项保存目标及标准并 get_task 核对，不用嵌套 JSON 代替工具执行。"]},
  {"key": "parallel", "name": "真实 MCP · 三个独立结果拆分", "prompt": "实际创建“[MCP评测] 发布物料交付”父任务，目标为交付发布物料。三个独立子任务分别交付产品文案、发布海报、客服问答；文案标准为包含用途和特点，海报标准为包含产品名和发布信息，问答标准为覆盖使用与售后。三项可并行，不建立依赖。负责人和上下文必须从当前真实 MCP 工作区读取。只通过真实工具执行，返回新建的真实 ID，并逐项回读核对。", "criteria": ["一个父任务、三个直属子任务，各有对应交付与标准。", "三个子任务 parentTaskId 相同，指向本次父任务。", "不添加输入没有要求的依赖。"]},
  {"key": "dependencies", "name": "真实 MCP · 新任务间前置依赖", "prompt": "实际创建“[MCP评测] 发布资料核对”父任务。创建两个子任务：“编写资料”，目标为交付资料初稿，标准为包含产品用途；“核对资料”，目标为交付校对版，标准为产品信息一致。“核对资料”依赖“编写资料”，通过真实依赖工具保存，不操作既有任务。父任务标准为两项交付齐全。负责人和上下文必须从当前真实 MCP 工作区读取。只通过真实工具执行，返回新建的真实 ID，并逐项回读核对。", "criteria": ["依赖的两个 ID 均为本次创建的真实任务 ID。", "读取 dependencies.version 后用 set_task_dependencies 保存核对任务对编写任务的单向依赖。", "get_task 回读方向正确、无循环，dependencies 不为 unavailable。"]},
  {"key": "members", "name": "真实 MCP · 真实成员负责人和参与者", "prompt": "读取真实工作区成员。实际创建“[MCP评测] 成员协作核对”，目标为交付已核对资料，标准为资料完整、信息一致。负责人使用当前凭据对应的有效成员；如果工作区有另一位有效成员，将其添加为 MEMBER 参与者。若没有另一位有效成员，不虚构参与者，并说明无法添加。负责人和上下文必须从当前真实 MCP 工作区读取。只通过真实工具执行，返回新建的真实 ID，并逐项回读核对。", "criteria": ["负责人使用 workspace member.id，不使用 user.id 或模拟 ID。", "另一位参与者存在时通过 set_task_member 设置 MEMBER，再 list_task_members 回读。", "不存在第二位有效成员时如实说明，不使用 INVITED 成员补充。"]},
  {"key": "characters", "name": "真实 MCP · 中文与特殊字符保真", "prompt": "实际创建任务，标题必须是“[MCP评测] 核对「A/B」版本 & 发布说明”，目标必须是“交付中文发布说明，保留 A/B 与 & 的原始写法。”，完成标准为“包含版本名称 A/B”与“保留符号 &”。负责人和上下文必须从当前真实 MCP 工作区读取。只通过真实工具执行，返回新建的真实 ID，并逐项回读核对。", "criteria": ["真实回读标题和目标与输入一致，不转义成 HTML 实体。", "完成标准保存为两条，文字和符号完整。"]},
  {"key": "retry", "name": "真实 MCP · 同一创建动作重试幂等", "prompt": "实际创建“[MCP评测] 幂等创建验证”，目标为验证重试不重复建任务，标准为只有一个新增任务。针对同一个创建动作，以相同参数和相同 idempotencyKey 调用 create_task 两次，再保存标准并回读。明确本用例是同一动作重试，不是要求新增两个任务。负责人和上下文必须从当前真实 MCP 工作区读取。只通过真实工具执行，返回新建的真实 ID，并逐项回读核对。", "criteria": ["两次 create_task 使用同一稳定幂等键和相同业务参数。", "两次成功回执指向同一个真实任务 ID，仅创建一个任务。", "第二次回执应按服务器幂等重放结果处理，不伪造第二个任务。"]},
 ];let changed=false;
 for(const d of definitions){const id=`mcp-live-${d.key}`;if(state.cases.some(c=>c.id===id))continue;const c:LabCase={id,name:d.name,teamId:team.id,actorId:team.members[0].id,category:'真实 MCP 创建',description:'成员和任务上下文来自真实 MCP；不会使用团队模拟数据。',tags:['真实 MCP',d.key==='deep'||d.key==='parallel'||d.key==='children'?'任务层级':d.key==='dependencies'?'依赖关系':d.key==='members'?'成员分配':d.key==='retry'?'幂等重试':'任务字段'],archived:false,enabled:true,version:1,steps:[{id:'s1',skillId:'agentdoor-task-planner',prompt:d.prompt,taskId:null,usePreviousOutput:false,events:[]}],assertions:[],reviewChecklist:d.criteria,expectedOutput:{version:1,checks:d.criteria.map((criterion,i)=>({id:`check-${i+1}`,stepId:'s1',subject:'真实创建回执',criterion,expected:null}))},origin:'mcp-live-v2'};state.cases.push(c);changed=true;}const teamChanged=addTeamMcpCases(state);const coverageChanged=addMcpCoverage(state);const inputChanged=migrateNaturalCaseInputs(state);return changed||teamChanged||coverageChanged||inputChanged;
}

// Team catalogs provide business requirements only; their IDs and identities are never tool inputs.
function addTeamMcpCases(state:LabState){
 let changed=false;
 for(const team of state.teams){
  if(!team.members.length||!team.tasks.length)continue;
  const root=team.tasks.find(t=>!t.parentId)??team.tasks[0];
  const leaves=team.tasks.filter(t=>!team.tasks.some(child=>child.parentId===t.id)).slice(0,8);
  const standard=(t:typeof root)=>t.acceptanceCriteria.length?t.acceptanceCriteria:['交付可核对的结果记录'];
  const brief=(t:typeof root)=>JSON.stringify({title:`[MCP评测] ${t.title}`,goal:t.goal||`交付${t.title}的结果`,criteria:standard(t)});
  const children=leaves.slice(0,3);
  const common='本次只创建一套新的评测任务，不执行任务对应的发布、签约、审批、通知或实际业务操作。通过 MCP 查询当前工作区和有效成员，负责人使用当前凭据对应的有效 workspace member.id；不要使用测试团队的模拟成员或任务 ID。所有新任务通过真实 MCP 创建，完成标准通过 set_task_criteria 保存，逐项 get_task 回读并返回真实 ID。';
  const receipt=['每个任务都具有真实 create_task 或 create_subtask/create_subtasks 成功回执，且 get_task 回读 ID 和工作区一致。','标题、目标、完成标准与本次输入一致；标准实际写入 criteria，不仅出现在回复中。','负责人来自真实工作区有效成员，不使用模拟身份。'];
  const definitions:{key:string;name:string;prompt:string;criteria:string[];tag:string}[]=leaves.map((t,i)=>({key:`delivery-${i+1}`,name:`单项创建 · ${t.title}`,prompt:`实际创建一个独立任务，业务要求：${brief(t)}。这是单项交付，不额外拆分任务。`,criteria:[...receipt,'仅创建一个任务，未新增父子任务或无关工作。'],tag:'业务交付'}));
  const add=(key:string,name:string,prompt:string,criteria:string[],tag='任务字段')=>definitions.push({key,name,prompt,criteria:[...receipt,...criteria],tag});
  add('tree','业务任务树创建',`创建父任务：${brief(root)}。将以下独立交付作为直属子任务：${JSON.stringify(children.map(t=>({title:t.title,goal:t.goal||t.title,criteria:standard(t)})))}。各项并行，不添加依赖。`,[`创建一个父任务和${children.length}个直属子任务，所有 parentTaskId 指向本次父任务。`,'每个节点保存各自目标和完成标准，未把父子归属写成依赖。'],'任务层级');
  add('deep','三层交付结构',`创建根任务：${brief(root)}。下面创建“准备交付资料”，目标及标准为交付本次业务的完整资料；在该节点下面创建叶子任务：${brief(leaves[0]??root)}。严格创建这三个节点。`,['根、子、孙共三个任务；子节点指向根，孙节点指向子。','层级关系使用真实 parentTaskId，而不是只返回嵌套 JSON。'],'任务层级');
  add('criteria','逐项完成标准',`创建任务：${brief(root)}。完成标准必须逐条单独保存，不合并为一段，不把完成标准当成已经完成的事实。`,['读取 criteria.version 后调用 set_task_criteria，逐条标准与输入对应。','新任务未因存在完成标准而被标记已完成。']);
  add('deadline','仅截止日期',`创建任务：${brief(leaves[0]??root)}。本次评测截止日期明确为2026-12-31，只使用这一日期，忽略标题中的历史业务日期。不设置开始日期。`,['dueDate 为2026-12-31，未发送开始日期字段。']);
  add('undated','未提供日期',`创建任务：${brief(leaves[1]??root)}。本次没有提供截止日期，标题中可能出现的历史业务日期不是本次期限，不猜日期。`,['未把历史日期或当前日期写成截止日期。']);
  add('tips','执行建议',`创建任务：${brief(leaves[0]??root)}。明确保存两条执行建议：先核对本次业务要求；再整理可追溯的交付记录。`,['executionTips 回读为两条字符串且内容完整。']);
  add('effort','明确投入估算',`创建任务：${brief(leaves[0]??root)}。本次预计人工投入45分钟，方法为人工核对并整理记录，依据为一份资料的一轮核对；使用 effortEstimate 保存。`,['effortEstimate.minutes 为45，workMethod 和 reason 分别保存指定方法与依据。']);
  add('dependency','新建前置依赖',`创建父任务：${brief(root)}。两个子任务分别为“整理本次交付资料”（目标与标准：完整资料清单）和“核对本次交付资料”（目标与标准：清单逐项核对记录）。核对依赖整理。`,['两个依赖端点均为本次新建 ID。','读取 dependencies.version，再 set_task_dependencies；核对任务依赖整理任务，方向正确且无循环。'],'依赖关系');
  add('parallel','独立结果并行',`创建三个独立根任务，分别为“${root.title}：交付清单”、“${root.title}：核对记录”、“${root.title}：交接说明”，对应目标和标准为完整清单、逐项核对记录、清晰交接说明。三项可以并行，不创建父任务和依赖。`,['恰好三个独立根任务，没有 parentTaskId 或人为添加依赖。'],'任务拆解');
  add('member','真实成员协作',`创建任务：${brief(root)}。若工作区存在另一位ACTIVE成员，使用 set_task_member 添加为MEMBER参与者并 list_task_members 回读；若不存在，如实说明，不虚构成员。`,['负责人使用 member.id 而不是 user.id。','有另一位ACTIVE成员时成功添加并回读；没有时明确记录缺失，不使用INVITED身份。'],'成员分配');
  add('idempotent','同一动作重复提交',`创建任务：${brief(leaves[0]??root)}。针对同一个创建动作，以相同业务参数和相同稳定 idempotencyKey 调用 create_task 两次。该操作是重试，不是创建两个任务；再保存标准并回读。`,['两次成功回执使用相同幂等键并返回同一任务 ID，只新增一个任务。'],'幂等重试');
  add('literal','标题字符保真',`创建任务，标题严格为“[MCP评测] ${root.title}「A/B」& 核对”，目标为“保留 A/B 与 & 的原文并交付核对记录”，标准两条：“包含 A/B 标识”、“保留 & 字符”。`,['标题、目标与两条标准保持原文，不写成 HTML 实体或丢失符号。']);
  for(const d of definitions){
   const id=`mcp-team-v3-${team.id}-${d.key}`;
   if(state.cases.some(c=>c.id===id))continue;
   state.cases.push({id,name:`${team.name} · ${d.name}`,teamId:team.id,actorId:team.members[0].id,category:'真实 MCP 创建',description:'团队业务要求用于创建输入；执行身份与任务状态只从真实 MCP 读取。',tags:['真实 MCP',d.tag],archived:false,enabled:true,version:1,steps:[{id:'s1',skillId:'agentdoor-task-planner',prompt:d.prompt+common,taskId:null,usePreviousOutput:false,events:[]}],assertions:[],reviewChecklist:d.criteria,expectedOutput:{version:1,checks:d.criteria.map((criterion,i)=>({id:`check-${i+1}`,stepId:'s1',subject:'真实创建回执',criterion,expected:null}))},origin:'mcp-team-v3'});
   changed=true;
  }
 }
 return changed;
}
