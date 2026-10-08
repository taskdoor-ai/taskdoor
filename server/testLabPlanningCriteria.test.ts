import test from 'node:test';
import assert from 'node:assert/strict';
import {seedLab} from './test-lab/seeds.ts';
import {migratePlanningCriteria} from './test-lab/planning-criteria.ts';
import {planningCriteria} from '../src/test-lab/planning-criteria.ts';
test('创建标准包含拆解、责任匹配和可验收交付，保留原有专项标准且不覆盖后续编辑',()=>{
 const state=seedLab();const c=state.cases.find(c=>c.id==='case-create')!;c.reviewChecklist.push('用户自定义验收');const other=structuredClone(state.cases.find(c=>c.id==='case-status'));
 assert.equal(migratePlanningCriteria(state),true);assert.ok(c.reviewChecklist.includes('用户自定义验收'));assert.ok(c.reviewChecklist.includes(planningCriteria[2]));assert.ok(c.reviewChecklist.some(s=>s.includes('30 秒')));assert.ok(!c.reviewChecklist.includes('判断是否有可追溯依据'));assert.deepEqual(state.cases.find(c=>c.id==='case-status'),other);
 c.reviewChecklist=['修改后的标准'];assert.equal(migratePlanningCriteria(state),false);assert.deepEqual(c.reviewChecklist,['修改后的标准']);
});
