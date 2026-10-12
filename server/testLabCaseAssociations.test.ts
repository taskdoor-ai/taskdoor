import test from 'node:test';
import assert from 'node:assert/strict';
import {seedLab} from './test-lab/seeds.ts';
import {addPeopleAnalysisCases} from './test-lab/people-analysis-cases.ts';
import {taskCaseUsages} from '../src/test-lab/case-associations.ts';
test('用例关联展示目标和本人历史上下文，不展示其他人员场景',()=>{
 const state=seedLab();addPeopleAnalysisCases(state);const team=state.teams.find(t=>t.id==='lab-content')!;
 const people=state.cases.filter(c=>c.origin==='people-analysis-v1');
 const usages=taskCaseUsages(team,people,'people-test-full-match-history-1');
 assert.equal(usages.length,1);assert.equal(usages[0].testCase.id,'case-people-test-full-match');assert.equal(usages[0].matches[0].role,'本人任务上下文');
 assert.equal(taskCaseUsages(team,people,'people-test-full-match-target')[0].matches[0].role,'目标任务');
 const fresh={...people[0],creationContext:'fresh' as const,steps:[{...people[0].steps[0],skillId:'agentdoor-task-planner' as const,taskId:null}]};
 assert.deepEqual(taskCaseUsages(team,[fresh],'people-test-full-match-target'),[]);
});
