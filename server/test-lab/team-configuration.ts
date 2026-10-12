import type {LabCase,LabTeam} from '../../src/test-lab/types.ts';
import type {LabStore} from './store.ts';

// Send just one team and its changed cases, rather than the whole fixture library.
export function saveTeamConfiguration(store:LabStore,expectedRevision:number,team:LabTeam,caseUpdates:LabCase[]){
 const state=store.get();
 if(!state.teams.some(t=>t.id===team.id))throw Error('团队不存在');
 if(new Set(caseUpdates.map(c=>c.id)).size!==caseUpdates.length)throw Error('用例 ID 重复');
 if(caseUpdates.some(c=>c.teamId!==team.id||state.cases.some(old=>old.id===c.id&&old.teamId!==team.id)))throw Error('只能更新当前团队的用例');
 const updates=new Map(caseUpdates.map(c=>[c.id,c]));
 const saved=store.save(expectedRevision,state.teams.map(t=>t.id===team.id?team:t),[
  ...state.cases.map(c=>updates.get(c.id)??c),...caseUpdates.filter(c=>!state.cases.some(old=>old.id===c.id)),
 ]);
 return {revision:saved.revision,team:saved.teams.find(t=>t.id===team.id)!,cases:saved.cases.filter(c=>c.teamId===team.id)};
}
