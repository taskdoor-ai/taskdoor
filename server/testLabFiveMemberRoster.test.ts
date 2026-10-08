import test from 'node:test';
import assert from 'node:assert/strict';
import {limitTestTeamMembers} from './test-lab/five-member-roster.ts';
import type {LabState} from '../src/test-lab/types.ts';

test('测试团队最多5人，合并职责和所有用例引用但保留历史快照',()=>{
 const members=Array.from({length:7},(_,i)=>({id:`m${i}`,name:`人员${i}`,role:i===6?'质量':'项目经理',responsibilities:[`职责${i}`],version:1}));
 const team={id:'t',members,tasks:[{ownerId:'m0',createdById:'m5',participantIds:['m5','m6']}],evidence:[{authorId:'m6',visibleToIds:['m0','m5','m6']}]};
 const c={id:'c',teamId:'t',actorId:'m6',version:1,steps:[{prompt:'人员6负责核对',events:[{type:'responsibility',memberId:'m6',responsibilities:['核对']},{type:'evidence',evidence:{authorId:'m6',visibleToIds:['m0','m5']}}]}],workload:{members:[{memberId:'m0',currentWork:'甲',remainingMinutes:10,availableMinutes:60},{memberId:'m5',currentWork:'乙',remainingMinutes:20,availableMinutes:60}]},expectedOutput:{checks:[{expected:{ownerId:'m6'}}]}};
 const run={teamSnapshot:structuredClone(team),caseSnapshot:structuredClone(c)};
 const state={teams:[team],cases:[c],runs:[run]} as unknown as LabState;
 const before=structuredClone(state.runs);
 assert.equal(limitTestTeamMembers(state),true);
 assert.equal(state.teams[0].members.length,5);
 const allowed=new Set(state.teams[0].members.map(m=>m.id));
 assert.ok(state.teams[0].members.flatMap(m=>m.responsibilities).includes('职责6'));
 const serialized=JSON.stringify([state.teams,state.cases]);assert.ok(!/m5|m6|人员5|人员6/.test(serialized));
 assert.ok(allowed.has(state.cases[0].actorId));
 assert.ok(!state.teams[0].tasks[0].participantIds.includes(state.teams[0].tasks[0].ownerId!));
 assert.equal(state.cases[0].workload!.members.length,1);
 assert.equal(state.cases[0].workload!.members[0].remainingMinutes,30);
 assert.equal(state.cases[0].workload!.members[0].availableMinutes,60);
 assert.deepEqual(state.runs,before);
 assert.equal(limitTestTeamMembers(state),false);
});
