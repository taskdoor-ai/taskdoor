import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import {buildModelInput} from './test-lab/context.ts';
test('基础创建不泄漏历史上下文，任务分析仍保留资料，重启不重复改写',()=>{
 const path=join(mkdtempSync(join(tmpdir(),'fresh-creation-')),'state.json');
 const store=createLabStore(path,seedLab());const state=store.get();
 const c=state.cases.find(c=>c.id==='benchmark-single')!;const team=structuredClone(state.teams.find(t=>t.id===c.teamId)!);
 team.evidence[0].content='HISTORY_MUST_NOT_REACH_CREATION';team.tasks[0].title='OLD_TASK_MUST_NOT_REACH_CREATION';
 const input=buildModelInput(team,c,c.steps[0],'fresh',[]);
 assert.deepEqual(input.tasks,[]);assert.deepEqual(input.evidence,[]);assert.deepEqual(input.history,[]);
 assert.ok(input.members.length);assert.ok(!JSON.stringify(input).includes('MUST_NOT_REACH_CREATION'));
 assert.ok(input.sources.every(s=>team.members.some(m=>m.id===s.ref)));
 for(const entry of state.cases.filter(c=>!c.archived&&c.steps.every(s=>s.skillId==='agentdoor-task-planner'))){assert.equal(entry.creationContext,'fresh');assert.ok(entry.verification?.fixtureChecks.every(f=>f.subject==='member'));}
 const analysis=state.cases.find(c=>c.teamId===team.id&&c.steps[0].skillId==='agentdoor-task-status-analyzer')!;
 const analyzed=buildModelInput(team,analysis,analysis.steps[0],'analysis',[]);assert.ok(analyzed.tasks.length);assert.ok(analyzed.evidence.length);
 const reopened=createLabStore(path,seedLab()).get();assert.equal(reopened.cases.find(x=>x.id===c.id)?.version,c.version);
});
