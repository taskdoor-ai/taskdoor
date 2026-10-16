import test from 'node:test';
import assert from 'node:assert/strict';
import type {LabCase,LabState} from '../src/test-lab/types.ts';
import {seedLab} from './test-lab/seeds.ts';
import {applyCreationOutcomeCriteria,creationOutcomeCriteria} from './test-lab/creation-outcome-criteria.ts';
import {creationCaseContentConflicts,refreshCreationCaseContent} from './test-lab/creation-case-content.ts';

const task=(id:string,prompt:string,criterion='用户专项：保留真实业务范围'):LabCase=>({id,name:'任务拆解 · 创建覆盖场景',teamId:'lab-content',actorId:'zhou',category:'创建任务核心评测',description:'内置可编辑用例',origin:'planning-core-v1',version:1,enabled:true,archived:false,previewCriteriaVersion:1,steps:[{id:'s1',skillId:'agentdoor-task-planner',prompt,taskId:null,usePreviousOutput:false,events:[]}],assertions:[],reviewChecklist:[criterion],expectedOutput:{version:1,checks:[{id:'scenario',stepId:'s1',subject:'当前范围',criterion,expected:null}]}});
const teams=()=>seedLab().teams;

test('旧多交付创建改为一项当前主任务，保留用途、数量、预算和格式，不生成已保存父任务上下文',()=>{
 const source=task('planning-core-v1-d-three','帮我安排保温杯的首发物料，需要一份30秒介绍脚本、一张商城主视觉、一份门店活动执行方案，预算不超过2万元。脚本讲350ml容量和可拆洗杯盖，海报使用同一卖点，活动方案写清现场步骤和检查清单。不拍摄、不投放。请按职责分工。','总任务下有脚本、主视觉、活动方案三个独立交付。');
 const before=structuredClone(source),[current]=applyCreationOutcomeCriteria(teams(),[source]);
 assert.equal(current.steps[0].taskId,null);assert.match(current.steps[0].prompt,/只整理当前一项新任务/);
 for(const detail of ['30秒','350ml','可拆洗','2万元','不拍摄','不投放'])assert.ok(current.steps[0].prompt.includes(detail));
 assert.match(current.steps[0].prompt,/让首发面向顾客的产品信息保持一致/);
 assert.match(current.expectedOutput!.checks[0].criterion,/标准分别覆盖30秒脚本、商城主视觉、门店活动方案/);
 assert.doesNotMatch(current.expectedOutput!.checks[0].criterion,/总任务下有/);
 assert.ok(creationOutcomeCriteria.every(rule=>current.expectedOutput!.checks.some(check=>check.id===rule.id)));
 assert.deepEqual(source,before);assert.equal(current.version,source.version);
 assert.deepEqual(applyCreationOutcomeCriteria(teams(),[current]),[current]);
});

test('各交付日期作为主任务标准保留，主截止及第二轮修改约束不变',()=>{
 const source=task('task-preview-flow-v1-date','帮我安排新品发布资料：林洁负责介绍文案，Jage负责海报，卜佳菲统筹。文案要讲清用途和卖点；海报交源文件和导出图。整批12月31日前交付。','文案 dueDate 为2026-12-20，海报为2026-12-25，整体为2026-12-31；同步标准和建议中直接关联的旧日期表述，其余分工、目标、交付要求不变。');
 source.origin='task-preview-flow-v1';source.steps.push({...source.steps[0],id:'s2',prompt:'文案改为12月20日前交，海报改为12月25日前交，其他内容和人员不变。',usePreviousOutput:true});
 const [current]=applyCreationOutcomeCriteria(teams(),[source]);
 assert.equal(current.steps[1].prompt,source.steps[1].prompt);assert.equal(current.steps[1].usePreviousOutput,true);
 assert.match(current.expectedOutput!.checks[0].criterion,/主任务 dueDate=2026-12-31和clientId/);
 assert.match(current.expectedOutput!.checks[0].criterion,/各自交付条件.*2026-12-20.*2026-12-25/);
 assert.doesNotMatch(current.expectedOutput!.checks[0].criterion,/文案 dueDate/);
});

test('旧回归创建内拆树指令移除，仅已知原文可升级，未将旧子树假装成已保存任务',()=>{
 const source=task('regression-20261014-create-planning-core-v1-d-channels','给新品发布安排官网介绍、门店海报和客服问答，三份内容各自审核、各自交付，可以并行；官网讲用途，海报突出卖点，问答覆盖使用和售后。请安排分工。\n请在一个主任务下拆成官网介绍、门店海报和客服问答三个子任务，分别安排负责人。','三种渠道交付独立拆分，不按制作步骤拆分。');
 source.origin='manual';source.version=6;
 const [current]=applyCreationOutcomeCriteria(teams(),[source]);
 assert.equal(creationCaseContentConflicts(teams(),[source]).length,0);
 assert.doesNotMatch(current.steps[0].prompt,/请在一个主任务下拆成/);assert.equal(current.steps[0].taskId,null);
 assert.match(current.expectedOutput!.checks[0].criterion,/只生成当前新品发布资料主任务/);
});

test('正式职责及创建确认边界单独核对，自定义标准不因共享ID被覆盖',()=>{
 const source=task('custom-main','只创建一项纪要整理任务，使参会人明确已作决定和下一步。');source.origin='manual';
 source.expectedOutput!.checks.push({id:'creation-assignment-v2',stepId:'s1',subject:'人工职责要求',criterion:'仅保留我选定的合法人员，不改角色',expected:{custom:true}});
 const [current]=applyCreationOutcomeCriteria(teams(),[source]);
 assert.deepEqual(current.expectedOutput!.checks[1],source.expectedOutput!.checks[1]);
 assert.equal(current.expectedOutput!.checks.filter(check=>check.id==='creation-assignment-v2').length,1);
 assert.ok(!current.reviewChecklist.includes(creationOutcomeCriteria.find(check=>check.id==='creation-assignment-v2')!.criterion));
 const rules=JSON.stringify(creationOutcomeCriteria);
 assert.match(rules,/已确认职责/);assert.match(rules,/推荐不等于/);assert.match(rules,/确认也仍只返回方案/);
});

test('用户自编或已编辑内置的拆树请求不静默改写，给出冲突清单后供用户重新归类',()=>{
 const custom=task('user-split','我已有一个任务，请拆成两层子任务。');custom.origin='manual';custom.version=4;
 const edited=task('planning-core-v1-d-three','我改过的输入：要拆成另一套子任务。');edited.version=20;
 const source=[custom,edited],before=structuredClone(source);
 assert.equal(creationCaseContentConflicts(teams(),source).length,2);
 assert.deepEqual(refreshCreationCaseContent(teams(),source),before);
 assert.deepEqual(applyCreationOutcomeCriteria(teams(),source),before);
});

test('归档、禁用、独立拆解及真实上下文用例和历史运行保持原样',()=>{
 const ordinary=task('planning-core-v1-d-single','给新品保温杯建个任务，要一份30秒介绍脚本，讲清350ml容量和可拆洗杯盖，不拍摄、不剪辑。帮我安排合适的人。');
 const archived={...structuredClone(ordinary),id:'archived',archived:true},disabled={...structuredClone(ordinary),id:'disabled',enabled:false};
 const subtask=structuredClone(ordinary);subtask.id='subtask';subtask.steps[0].skillId='taskdoor-decompose-task';subtask.steps[0].taskId='saved';
 const bound=structuredClone(ordinary);bound.id='bound';bound.steps[0].taskId='saved';
 const cases=[archived,disabled,subtask,bound];assert.deepEqual(applyCreationOutcomeCriteria(teams(),cases),cases);
 const state={cases:[ordinary],runs:[{caseSnapshot:structuredClone(ordinary)}]} as unknown as LabState;
 const history=structuredClone(state.runs);applyCreationOutcomeCriteria(teams(),state.cases);assert.deepEqual(state.runs,history);
});
