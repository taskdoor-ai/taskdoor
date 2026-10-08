import type {LabCase, LabState} from '../../src/test-lab/types.ts';

const retiredCoreKeys = new Set(['d-boundary', 'a-roles', 'a-no-busy', 'c-small', 'c-unknown', 'c-boundary']);
const generatedOrigins = new Set(['industry-journeys/2026-09', 'benchmark/2026-09', 'coverage/2026-09', 'decomposition/2026-09', 'creation-contract/2026-09', 'mcp-live-v1', 'mcp-live-v2', 'mcp-team-v3', 'mcp-coverage-v4']);
type Scenario = {key:string; category:string; title:string; input:string; checks:string[]};

// Curate once per team. Archive old cases so historical snapshots and user edits remain recoverable.
export function curateWorkflowFocusCases(state:LabState){
 const migrated = new Set(state.workflowFocusTeamIds ?? []);
 let changed = false;
 for(const team of state.teams.filter(t => !t.archived && t.members.length && t.tasks.length && !migrated.has(t.id))){
  for(const item of state.cases.filter(c => c.teamId === team.id)){
   const oldGenerated = generatedOrigins.has(item.origin ?? '') && item.steps.some(s => s.skillId === 'agentdoor-task-planner');
   const boundaryCore = item.origin === 'planning-core-v1' && retiredCoreKeys.has(item.id.replace('planning-core-v1-', ''));
   if((oldGenerated || boundaryCore) && (!item.archived || item.enabled)){
    item.archived = true; item.enabled = false; item.version++;
   }
  }
  const leaves = team.tasks.filter(t => !team.tasks.some(child => child.parentId === t.id));
  const task = leaves[0] ?? team.tasks[0];
  const title = task.title;
  const goal = task.goal || `交付${title}的成果`;
  const criteria = task.acceptanceCriteria.length ? task.acceptanceCriteria : ['交付完整成果', '提供核对记录'];
  const brief = `“${title}”，目标是${goal}，完成时要满足：${criteria.join('；')}`;
  const assignment = team.id === 'lab-content' ? '按团队职责安排负责人。' : '由我负责。';
  const definitions:Scenario[] = [];
  const add = (key:string, category:string, name:string, input:string, ...checks:string[]) => definitions.push({key, category, title:name, input:input+assignment, checks});
  add('create', '创建流程', '从需求创建任务', `帮我建一个任务：${brief}。`, '成功创建任务，返回任务名称和可打开的任务编号。', '回读确认目标、完成标准和负责人已保存。');
  add('complete', '创建流程', '完整信息一次创建', `帮我建一个任务：${brief}。截止2026年12月31日。建议先核对需求，再整理交付记录，预计用45分钟人工核对，依据是一份资料的一轮检查。`, '一次创建请求落成任务，基础信息完整，回读与输入一致。', '截止日期为2026-12-31；执行建议两条；预计投入45分钟，并保留方法与依据。');
  const deliverables = leaves.slice(0,3);
  if(deliverables.length >= 2){
   const requirements = deliverables.map(t => `“${t.title}”：${t.goal || t.title}，完成时要满足${t.acceptanceCriteria.join('、') || '交付完整成果'}`).join('；');
   add('deliveries', '创建流程', '多项交付拆解后创建', `帮我安排这一批工作：${requirements}。这些成果分别验收，可以并行，请整理成合适的任务。`, '不同交付物形成可独立验收的任务，上级任务准确汇总本次范围。', '逐项回读真实任务，名称、目标、完成标准和层级对应正确，不额外添加先后依赖。');
  }else{
   add('deliveries', '创建流程', '制作与核对拆解后创建', `帮我安排${title}及其成果核对，分别交付完整成果和核对记录，核对要等最终成果出来。`, '制作和核对分别形成独立交付任务。', '核对任务的前置为制作任务，逐项回读层级及依赖。');
  }
  add('handoff', '创建流程', '制作核查交接完整流程', `安排${title}的制作、核查与交接，分别交付成果、逐项核查记录和交接清单。先完成制作，再核查，核查通过后准备交接。`, '创建对应制作、核查、交接的独立任务，每项有目标和完成标准。', '真实保存制作到核查、核查到交接的前置关系，回读方向正确。');
  add('name', '任务基础信息', '从口语需求生成名称', `这件事帮我记成任务：我们需要把${title}准备好，交付${goal}，做到${criteria.join('、')}就可以。`, '生成简洁、可识别的任务名称，准确表达交付对象。', '目标和完成标准实际保存，名称没有混入工具指令。');
  add('goal', '任务基础信息', '生成清晰目标', `帮我安排${title}，是为了${goal}。完成时要满足${criteria.join('、')}。`, '目标准确表达用户希望得到的结果，保留业务用途。', '名称、目标、完成标准分别保存，回读可核对。');
  add('criteria', '任务基础信息', '整理逐项完成标准', `帮我建${title}，目标是${goal}。完成时逐项检查：${criteria.join('；')}。`, '完成要求整理为逐条可检查的标准，并实际保存。', '业务对象与要求不遗漏，不只写“完成任务”或“基本完成”。');
  add('deadline', '任务基础信息', '保存截止时间', `帮我建一个任务：${brief}。2026年12月31日前交付。`, '截止日期保存为2026-12-31，其他基础信息与输入一致。');
  add('tips', '任务基础信息', '保存执行建议', `帮我建一个任务：${brief}。做的时候建议先核对需求，再整理交付记录。`, '两条建议作为执行建议保存，目标和完成标准仍单独保留。');
  add('effort', '任务基础信息', '保存预计投入', `帮我建一个任务：${brief}。预计花45分钟，方法是人工逐项核对，依据是一份资料的一轮检查。`, '预计人工投入为45分钟，方法和依据完整保存。');
  add('numbers', '任务基础信息', '保留明确验收数量', `帮我建“${title}交付记录整理”任务，交付一份可核对的记录表。这次要整理20条记录，逐条对应交付项目，每条注明结果和核对依据。`, '目标和完成标准保留20条、逐条对应、结果和核对依据。', '回读记录中的业务数量与输入一致。');
  add('all-fields', '任务基础信息', '标题目标标准与日期完整生成', `请安排${title}，目的是${goal}，验收时检查${criteria.join('、')}，2026年12月25日前交。把名称、目标和逐项完成要求整理清楚。`, '任务名称、目标、逐条完成标准和截止日期全部实际保存。', '截止日期为2026-12-25，回读基础信息与用户需求一致。');
  // Other teams keep domain diversity, without the old protocol/exception scenarios.
  if(team.id !== 'lab-content')for(const [i,leaf] of leaves.slice(0,8).entries()){
   add(`business-${i+1}`, '任务基础信息', `业务创建 · ${leaf.title}`, `帮我建“${leaf.title}”，目标是${leaf.goal || `交付${leaf.title}的成果`}，完成时要满足${leaf.acceptanceCriteria.join('；') || '交付完整成果并提供核对记录'}。`, '实际创建业务任务，名称、目标、逐项完成标准与输入一致。');
  }
  for(const definition of definitions){
   const id = `workflow-focus-v1-${team.id}-${definition.key}`;
   if(state.cases.some(c => c.id === id))continue;
   const checks = ['通过真实工具创建并回读，确认任务编号、工作区、负责人及各项基础信息真实保存。', ...definition.checks];
   const item:LabCase = {id, name:`${definition.category} · ${definition.title}`, teamId:team.id, actorId:team.members[0].id,
    category:'创建任务核心评测', description:'验证正常创建流程与任务信息生成。', tags:['真实 MCP', `重点：${definition.category}`],
    requiresMemberContext:team.id === 'lab-content', inputFormat:'natural-v1', archived:false, enabled:true, version:1,
    steps:[{id:'s1', skillId:'agentdoor-task-planner', prompt:definition.input, taskId:null, usePreviousOutput:false, events:[]}], assertions:[],
    reviewChecklist:checks, expectedOutput:{version:1, checks:checks.map((criterion,i) => ({id:`check-${i+1}`, stepId:'s1', subject:definition.category, criterion, expected:null}))}, origin:'workflow-focus-v1'};
   state.cases.push(item);
  }
  migrated.add(team.id);changed = true;
 }
 if(changed)state.workflowFocusTeamIds = [...migrated];
 return changed;
}
