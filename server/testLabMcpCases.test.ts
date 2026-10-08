import test from 'node:test';
import assert from 'node:assert/strict';
import {addLiveMcpCases} from './test-lab/mcp-cases.ts';
import {isMcpCreationCase} from '../src/test-lab/mcp-case.ts';
import type {LabState} from '../src/test-lab/types.ts';
test('真实创建用例覆盖12个场景、幂等初始化且不覆盖用户编辑',()=>{
 const state={teams:[{id:'local-team',archived:false,tasks:[],members:[{id:'mock-actor'}]}],cases:[]} as unknown as LabState;
 assert.equal(addLiveMcpCases(state),true);assert.equal(state.cases.length,12);
 for(const c of state.cases){assert.equal(isMcpCreationCase(c),true);assert.ok(c.expectedOutput?.checks.length);assert.ok(!c.steps[0].prompt.includes('mock-actor'));assert.ok(!c.steps[0].prompt.includes('local-team'));assert.equal(c.assertions.length,0);}
 state.cases[0].steps[0].prompt='用户编辑';assert.equal(addLiveMcpCases(state),false);assert.equal(state.cases[0].steps[0].prompt,'用户编辑');
 const baseline=structuredClone(state.cases[1]);assert.equal(isMcpCreationCase({...baseline,contextMode:'team_tasks'}),false);baseline.steps[0].skillId='agentdoor-task-status-analyzer';assert.equal(isMcpCreationCase(baseline),false);
});

test('所有团队都有业务专属真实创建用例，包含原生字段和回读标准',()=>{
 const teams=['发布组','电商组','律师组'].map((name,i)=>({id:`team-${i}`,name,archived:i===2,members:[{id:`fake-member-${i}`}],tasks:Array.from({length:8},(_,j)=>({id:`fake-task-${i}-${j}`,title:`${name}交付${j}`,goal:`${name}业务目标${j}`,acceptanceCriteria:[`核对${name}结果${j}`],parentId:null}))}));
 const state={teams,cases:[]} as unknown as LabState;
 assert.equal(addLiveMcpCases(state),true);
 for(const team of teams){
  const cases=state.cases.filter(c=>c.teamId===team.id&&c.origin==='mcp-team-v3');
  assert.equal(cases.length,20);
  for(const c of cases){assert.equal(isMcpCreationCase(c),true);assert.ok(c.steps[0].prompt.includes(team.tasks[0].title)||c.steps[0].prompt.includes(team.name));assert.ok(!c.steps[0].prompt.includes('fake-member'));assert.ok(!c.steps[0].prompt.includes('fake-task'));assert.ok(c.expectedOutput!.checks.some(x=>x.criterion.includes('get_task')));}
 }
 const size=state.cases.length;assert.equal(addLiveMcpCases(state),false);assert.equal(state.cases.length,size);
});

test('扩展覆盖每个当前团队的业务组合与40种创建边界，初始化不覆盖编辑',()=>{
 const team={id:'coverage-team',name:'制造交付团队',archived:false,members:[{id:'local-member'}],tasks:Array.from({length:24},(_,i)=>({id:`local-task-${i}`,title:`业务交付${i}`,goal:`结果${i}`,acceptanceCriteria:[`标准${i}`],parentId:null}))};
 const state={teams:[team],cases:[]} as unknown as LabState;
 addLiveMcpCases(state);
 const expanded=state.cases.filter(c=>c.origin==='mcp-coverage-v4');
 assert.equal(expanded.length,60);
 assert.equal(new Set(expanded.map(c=>c.steps[0].prompt)).size,60);
 for(const c of expanded){assert.equal(isMcpCreationCase(c),true);assert.ok(c.expectedOutput!.checks.length>=2);assert.ok(!c.steps[0].prompt.includes('local-member'));assert.ok(!c.steps[0].prompt.includes('local-task-'));}
 for(const tag of ['依赖组合','批量创建','版本与修改','截止日期','投入估算','完成标准','事实与边界','成员分配','文本保真','回读与结果'])assert.ok(expanded.some(c=>c.tags?.includes(tag)),tag);
 const edited=expanded[0];edited.steps[0].prompt='用户修改的输入';const size=state.cases.length;
 assert.equal(addLiveMcpCases(state),false);assert.equal(state.cases.length,size);assert.equal(edited.steps[0].prompt,'用户修改的输入');
});

test('用户输入无工具术语、JSON参数和评测标记，验收标准保留真实回读要求',()=>{
 const state={teams:[{id:'natural-team',name:'发布团队',archived:false,members:[{id:'fake-user'}],tasks:[{id:'fake-task',title:'发布资料交付',goal:'交付完整资料',acceptanceCriteria:['资料完整'],parentId:null}]}],cases:[],runs:[]} as unknown as LabState;
 addLiveMcpCases(state);
 for(const c of state.cases){assert.ok(!/MCP|create_task|create_subtasks?|set_task_|get_task|list_task_|tools\/list|effortEstimate|workspace|idempotencyKey|"title"|"criteria"/.test(c.steps[0].prompt),c.id);assert.equal(c.inputFormat,'natural-v1');assert.ok(c.steps[0].prompt.includes('负责人'));}
 const input=state.cases.find(c=>c.id==='mcp-live-single')!.steps[0].prompt;
 assert.ok(input.includes('产品用途、适用对象和核心特点'));
 assert.ok(state.cases.find(c=>c.id==='mcp-live-criteria')!.steps[0].prompt.includes('包含尺寸、包含材质、包含适用范围'));
 assert.ok(state.cases.find(c=>c.id==='mcp-live-children')!.steps[0].prompt.includes('准备新品发布资料'));
 const c=state.cases.find(c=>c.id==='mcp-live-single')!;c.steps[0].prompt='用户修改的自然输入';
 assert.equal(addLiveMcpCases(state),false);assert.equal(c.steps[0].prompt,'用户修改的自然输入');
});
