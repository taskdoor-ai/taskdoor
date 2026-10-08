import test from 'node:test';
import assert from 'node:assert/strict';
import {updateContentTeamRoster} from './test-lab/content-team-roster.ts';
import type {LabState} from '../src/test-lab/types.ts';

test('内容测试团队保留三人并修正引用，人数不是添加限制',()=>{
 const members=['zhou','lin','chen','gao','xu'].map((id,i)=>({id,name:['卜佳菲','林洁','陈默','高远','tiger huang'][i],role:'旧角色',responsibilities:['旧职责'],version:1}));
 const team={id:'lab-content',testMemberLimit:5,members,tasks:[{ownerId:'chen',createdById:'gao',participantIds:['lin','gao']}],evidence:[{authorId:'gao',visibleToIds:['gao','xu']}]};
 const c={id:'c',teamId:team.id,actorId:'gao',version:1,steps:[{prompt:'陈默制作海报，高远核对渠道',events:[]}]};
 const state={teams:[team],cases:[c],runs:[{teamSnapshot:structuredClone(team)}]} as unknown as LabState;
 const before=structuredClone(state.runs);
 assert.equal(updateContentTeamRoster(state),true);
 assert.deepEqual(state.teams[0].members.map(m=>m.name),['卜佳菲','tiger huang','林洁']);
 assert.equal(state.teams[0].testMemberLimit,undefined);
 assert.equal(state.teams[0].tasks[0].ownerId,'lin');assert.deepEqual(state.teams[0].tasks[0].participantIds,['xu']);
 assert.equal(state.cases[0].steps[0].prompt,'林洁制作海报，tiger huang核对渠道');
 assert.ok(state.teams[0].members.find(m=>m.id==='lin')!.responsibilities.some(s=>s.includes('海报')));
 assert.deepEqual(state.runs,before);
 state.teams[0].members.push({id:'added',name:'新增人员',role:'协作',responsibilities:[],version:1});
 assert.equal(updateContentTeamRoster(state),false);assert.equal(state.teams[0].members.length,4);
});
