import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleCases,groupRuns} from '../src/test-lab/run-center.tsx';
import {seedLab} from './test-lab/seeds.ts';
import type {LabBootstrap,LabRun} from '../src/test-lab/types.ts';

test('创建运行只选择团队内、匹配能力和成员可见范围的启用用例',()=>{
 const state=seedLab();const team=state.teams[0];const actor=team.members[0].id;
 const source=structuredClone(state.cases.find(c=>c.teamId===team.id)!);
 source.steps=[{...source.steps[0],skillId:'agentdoor-task-planner',taskId:null}];
 source.actorId=actor;source.enabled=true;source.archived=false;
 state.cases=[{...source,id:'yes'},{...source,id:'other-team',teamId:'other'},{...source,id:'archived',archived:true},{...source,id:'disabled',enabled:false},{...source,id:'analysis',steps:[{...source.steps[0],skillId:'agentdoor-task-status-analyzer'}]},{...source,id:'invisible',steps:[{...source.steps[0],taskId:'missing-task'}]}];
 const b={state} as LabBootstrap;
 assert.deepEqual(eligibleCases(b,team.id,'agentdoor-task-planner',actor).map(c=>c.id),['yes']);
 assert.equal(eligibleCases(b,team.id,'agentdoor-task-planner','non-member').length,0);
 team.archived=true;assert.equal(eligibleCases(b,team.id,'agentdoor-task-planner',actor).length,0);
});
test('运行列表按批次汇总并保留无批次的历史运行',()=>{
 const runs=[{id:'a',batchId:'batch',createdAt:'2026-09-22'},{id:'b',batchId:'batch',createdAt:'2026-09-22'},{id:'c',createdAt:'2026-09-23'}] as LabRun[];
 const groups=groupRuns(runs);
 assert.deepEqual(groups.map(([id,rs])=>[id,rs.length]),[['c',1],['batch',2]]);
 assert.equal(runs.length,3);
});

import {pageSlice} from '../src/test-lab/Pagination.tsx';
import {modelProvider} from '../src/test-lab/ModelPicker.tsx';
test('分页覆盖全部结果，结果缩减时收敛到合法页码',()=>{
 const items=Array.from({length:23},(_,i)=>i);
 assert.deepEqual([1,2,3].flatMap(p=>pageSlice(items,p,10).items),items);
 assert.equal(pageSlice(items,99,10).current,3);
 assert.deepEqual(pageSlice([],3,10),{items:[],current:1,pages:1});
});
test('模型厂商归组支持代理前缀，不把未知模型冒充已知厂商',()=>{
 assert.equal(modelProvider('pa/gpt-test'),'OpenAI');
 assert.equal(modelProvider('vendor/claude-test'),'Anthropic');
 assert.equal(modelProvider('deepseek-ai/DeepSeek-test'),'DeepSeek');
 assert.equal(modelProvider('Qwen/test'),'阿里云 · Qwen');
 assert.equal(modelProvider('custom-private'),'其他模型');
});
