import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLabStore } from './test-lab/store.ts';
import { seedLab } from './test-lab/seeds.ts';
import { buildView, buildModelInput } from './test-lab/context.ts';

test('测试数据原子保存、旧修订拒绝且重建可恢复', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'agentdoor-lab-')), 'state.json');
  const store = createLabStore(path, seedLab());
  const before = store.get();
  const teams = structuredClone(before.teams); teams[0].name = '已编辑团队';
  store.save(before.revision, teams, before.cases);
  assert.throws(() => store.save(before.revision, teams, before.cases), /版本/);
  assert.equal(createLabStore(path, seedLab()).get().teams[0].name, '已编辑团队');
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).version, 1);
  const clone = store.get(); clone.teams.length = 0;
  assert.ok(store.get().teams.length > 0);
});

test('限定任务和个人证据由服务端按视角裁剪，预期不进入模型输入', () => {
  const state = seedLab(); const team = state.teams[0];
  team.tasks.push({...team.tasks[0], id:'private-task', title:'不可见标记', ownerId:team.members[1].id, participantIds:[], parentId:null, dependsOnTaskIds:[], visibility:'restricted'});
  team.evidence.push({id:'private-source',taskId:'private-task',authorId:team.members[1].id,kind:'交付',title:'私密交付',content:'秘密交付标记',createdAt:'',version:1,visibleToIds:[]});
  const actor = team.members[0].id;
  const view = buildView(team, actor);
  assert.ok(!JSON.stringify(view.team).includes('不可见标记'));
  assert.ok(!JSON.stringify(view.team).includes('秘密交付标记'));
  const c = {...state.cases[0], assertions:[{id:'assert-secret',label:'答案不能进入模型',stepId:'s1',path:'summary',operator:'equals' as const,expected:'GOLDEN_SECRET'}], legacyExpected:{answer:'OTHER_SECRET'}};
  const input = buildModelInput(team, c, c.steps[0], 'run-test', []);
  assert.ok(!JSON.stringify(input).includes('GOLDEN_SECRET'));
  assert.ok(!JSON.stringify(input).includes('OTHER_SECRET'));
  assert.ok(!JSON.stringify(input).includes('秘密交付标记'));
  assert.throws(() => buildView(team, 'non-member'), /成员/);
});

test('无效人员引用、依赖环、自身父任务和未知状态均拒绝且不改变数据', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'agentdoor-lab-')), 'state.json');
  const store = createLabStore(path, seedLab()); const initial = store.get();
  for(const mutate of [
    (s: typeof initial) => {s.teams[0].tasks[0].ownerId='unknown';},
    (s: typeof initial) => {const t=s.teams[0].tasks;t[0].dependsOnTaskIds=[t[1].id];t[1].dependsOnTaskIds=[t[0].id];},
    (s: typeof initial) => {s.teams[0].tasks[0].parentId=s.teams[0].tasks[0].id;},
    (s: typeof initial) => {(s.teams[0].tasks[0] as {status:string}).status='待审核';},
  ]) {
    const next=structuredClone(initial);mutate(next);
    assert.throws(()=>store.save(initial.revision,next.teams,next.cases));
    assert.deepEqual(store.get(),initial);
  }
});

test('实体版本由服务端增加，用户自报版本不能伪装成新版本',()=>{
  const store=createLabStore(join(mkdtempSync(join(tmpdir(),'lab-version-')),'state.json'),seedLab());
  const state=store.get();state.teams[0].members[0].responsibilities=['新的明确责任'];state.teams[0].members[0].version=900;
  state.teams[0].tasks[0].version=900;
  const saved=store.save(state.revision,state.teams,state.cases);
  assert.equal(saved.teams[0].members[0].version,2);assert.equal(saved.teams[0].tasks[0].version,1);
});

test('旧测试数据补齐任务创建人及任务级文件讨论字段',()=>{
  const path=join(mkdtempSync(join(tmpdir(),'lab-migrate-')),'state.json');
  const legacy=seedLab() as any;
  for(const team of legacy.teams){
    for(const task of team.tasks)delete task.createdById;
    for(const item of team.evidence){delete item.title;delete item.createdAt;}
  }
  writeFileSync(path,JSON.stringify(legacy));
  const migrated=createLabStore(path,seedLab()).get();
  assert.equal(migrated.teams[0].tasks[0].createdById,null);
  assert.equal(migrated.teams[0].evidence[0].title,'文件记录');
  assert.equal(migrated.teams[0].evidence[0].createdAt,'');
});

test('任务创建人必须引用当前团队成员',()=>{
  const path=join(mkdtempSync(join(tmpdir(),'lab-relations-')),'state.json');
  const store=createLabStore(path,seedLab());const state=store.get();
  state.teams[0].tasks[0].createdById='other-team-member';
  assert.throws(()=>store.save(state.revision,state.teams,state.cases),/创建人/);
});

test('旧数据默认只保留八个活跃团队，其余自动归档而不删除',()=>{
  const path=join(mkdtempSync(join(tmpdir(),'lab-team-limit-')),'state.json');
  const state=seedLab();const source=state.teams[0];
  state.teams=Array.from({length:12},(_,index)=>({...structuredClone(source),id:index===0?source.id:`import-team-${index}`,name:`测试团队 ${index+1}`}));
  state.cases=[];
  writeFileSync(path,JSON.stringify(state));
  const migrated=createLabStore(path,seedLab()).get();
  assert.equal(migrated.teams.length,12);
  assert.equal(migrated.teams.filter((team)=>!team.archived).length,8);
  assert.equal(migrated.teams.filter((team)=>team.archived).length,4);
});

test('保存时拒绝超过十个活跃团队',()=>{
  const store=createLabStore(join(mkdtempSync(join(tmpdir(),'lab-team-cap-')),'state.json'),seedLab());
  const state=store.get(),source=state.teams[0];
  state.teams=Array.from({length:11},(_,index)=>({...structuredClone(source),id:`manual-team-${index}`}));
  assert.throws(()=>store.save(state.revision,state.teams,[]),/最多保留 10 个活跃团队/);
});

test('线上协作种子包含律师与短视频团队的责任、任务资料和测试用例',()=>{
  const state=seedLab();
  for(const id of ['lab-legal','lab-short-video']){
    const team=state.teams.find((item)=>item.id===id);
    assert.ok(team);assert.ok(team.members.length>=5);assert.ok(team.tasks.length>=5);
    assert.ok(team.tasks.some((item)=>item.dependsOnTaskIds.length>0));
    assert.ok(team.evidence.some((item)=>item.kind==='文件'));
    assert.ok(team.evidence.some((item)=>item.kind==='讨论'));
    assert.ok(state.cases.some((item)=>item.teamId===id));
  }
  assert.match(state.teams.find((item)=>item.id==='lab-legal')!.members.map((item)=>item.role).join('、'),/律师/);
  assert.match(state.teams.find((item)=>item.id==='lab-short-video')!.members.map((item)=>item.role).join('、'),/编导|剪辑/);
});
