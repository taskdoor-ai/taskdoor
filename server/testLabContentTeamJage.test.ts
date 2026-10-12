import test from 'node:test';
import assert from 'node:assert/strict';
import {seedLab} from './test-lab/seeds.ts';
import {createLabStore} from './test-lab/store.ts';
import {contentWriterWorkProfile,jageWorkProfile,updateContentTeamJageCases} from './test-lab/content-team-jage.ts';
import {mcpConfigForCase} from './test-lab/mcp-member-context.ts';
import {availableMcpCreationCases} from '../src/test-lab/mcp-case.ts';
import {mkdtempSync} from 'node:fs';
import {saveTeamConfiguration} from './test-lab/team-configuration.ts';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('四人职责绑定和正常流程用例同步；重载不改历史运行或恢复用户删除的成员',()=>{
 const path=join(mkdtempSync(join(tmpdir(),'lab-jage-')),'state.json');
 const store=createLabStore(path,seedLab());const state=store.get();
 assert.equal(updateContentTeamJageCases(state),false);
 const team=state.teams.find(t=>t.id==='lab-content')!;
 team.members.push({id:'jage',name:'Jage',...structuredClone(jageWorkProfile),mcpMemberId:'fe956299-7858-4bb8-b4f1-a8d1c0c86b7a',version:1});
 Object.assign(team.members.find(m=>m.id==='lin')!,structuredClone(contentWriterWorkProfile));
 const original=state.cases.find(c=>c.id==='planning-core-v1-a-design')!;
 const historical=JSON.stringify({team,original});
 // A user-created case must not acquire generated fixture edits.
 state.cases.push({...structuredClone(original),id:'custom-design',origin:undefined});
 const runs=JSON.stringify(state.runs);
 assert.equal(updateContentTeamJageCases(state),true);
 assert.equal(availableMcpCreationCases(state.cases,'lab-content').length,47); // 36 + 10 + custom
 const additions=state.cases.filter(c=>c.origin==='content-jage-v1');
 assert.equal(additions.length,10);
 for(const c of additions){assert.ok(!/MCP|工具|memberId|回读/.test(c.steps[0].prompt));assert.ok(c.requiresMemberContext);}
 assert.ok(original.reviewChecklist.some(s=>s.includes('Jage负责视觉制作')));
 assert.ok(state.cases.find(c=>c.id==='custom-design')!.reviewChecklist.some(s=>s.includes('林洁负责视觉制作')));
 const config=mcpConfigForCase({url:'https://example.com/mcp',token:'secret',workspaceId:team.mcpWorkspaceId!},team,additions[0]);
 assert.equal(config.memberContext!.members.length,4);
 assert.equal(config.memberContext!.members.find(m=>m.name==='Jage')!.id,'fe956299-7858-4bb8-b4f1-a8d1c0c86b7a');
 assert.equal(updateContentTeamJageCases(state),false);
 assert.equal(JSON.stringify(state.runs),runs);
 assert.ok(historical.includes('林洁负责视觉制作'));
 store.save(state.revision,state.teams,state.cases);
 let reloaded=createLabStore(path,seedLab());let saved=reloaded.get();
 assert.deepEqual(saved.teams.find(t=>t.id===team.id)!.members,store.get().teams.find(t=>t.id===team.id)!.members);
 assert.equal(saved.cases.filter(c=>c.origin==='content-jage-v1').length,10);
 const custom= saved.cases.find(c=>c.id==='content-jage-v1-visual')!;custom.steps[0].prompt='用户修改后的视觉需求';custom.enabled=false;
 reloaded.save(saved.revision,saved.teams,saved.cases);
 saved=createLabStore(path,seedLab()).get();
 assert.equal(saved.cases.find(c=>c.id===custom.id)!.steps[0].prompt,'用户修改后的视觉需求');
 assert.equal(saved.cases.find(c=>c.id===custom.id)!.enabled,false);
 saved.teams.find(t=>t.id===team.id)!.members=saved.teams.find(t=>t.id===team.id)!.members.filter(m=>m.id!=='jage');
 reloaded=createLabStore(path,seedLab());reloaded.save(reloaded.get().revision,saved.teams,saved.cases);
 assert.equal(createLabStore(path,seedLab()).get().teams.find(t=>t.id===team.id)!.members.length,3);
});

test('按团队保存只更新指定成员及用例，保留其他团队、案例和历史；拒绝跨团队覆盖与旧修订',()=>{
 const store=createLabStore(join(mkdtempSync(join(tmpdir(),'lab-team-save-')),'state.json'),seedLab());
 const state=store.get();const team=state.teams.find(t=>t.id==='lab-content')!;
 team.members.push({id:'jage',name:'Jage',...structuredClone(jageWorkProfile),mcpMemberId:'fe956299-7858-4bb8-b4f1-a8d1c0c86b7a',version:1});
 updateContentTeamJageCases(state);
 const updates=state.cases.filter(c=>c.origin==='content-jage-v1'||c.id==='planning-core-v1-a-design');
 const before=store.get();
 const result=saveTeamConfiguration(store,before.revision,team,updates);
 assert.equal(result.team.members.length,4);
 assert.equal(result.cases.filter(c=>c.origin==='content-jage-v1').length,10);
 const saved=store.get();
 assert.deepEqual(saved.teams.filter(t=>t.id!==team.id),before.teams.filter(t=>t.id!==team.id));
 assert.deepEqual(saved.cases.filter(c=>c.teamId!==team.id),before.cases.filter(c=>c.teamId!==team.id));
 assert.deepEqual(saved.runs,before.runs);
 assert.throws(()=>saveTeamConfiguration(store,before.revision,team,updates),/数据版本/);
 const foreign=before.cases.find(c=>c.teamId!==team.id)!;
 assert.throws(()=>saveTeamConfiguration(store,saved.revision,team,[{...foreign,teamId:team.id}]),/当前团队/);
 assert.throws(()=>saveTeamConfiguration(store,saved.revision,team,[updates[0],updates[0]]),/重复/);
});
