import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLabStore } from './test-lab/store.ts';
import { seedLab } from './test-lab/seeds.ts';
import { createRunner } from './test-lab/runner.ts';
import { buildModelInput } from './test-lab/context.ts';
import { importLibrary } from './test-lab/library.ts';

test('文件附件持久化但只将正文提供给模型', () => {
  const store=makeStore();const state=store.get();
  state.teams[0].evidence[0].attachment={name:'测试.txt',mimeType:'text/plain',size:6,dataUrl:'data:text/plain;base64,U0VDUkVU'};
  const saved=store.save(state.revision,state.teams,state.cases);
  assert.equal(saved.teams[0].evidence[0].attachment?.name,'测试.txt');
  const input=buildModelInput(saved.teams[0],saved.cases[0],saved.cases[0].steps[0],'file-input',[]);
  assert.doesNotMatch(JSON.stringify(input),/U0VDUkVU|data:text/);
});

const makeStore = () => createLabStore(join(mkdtempSync(join(tmpdir(), 'lab-management-')), 'state.json'), seedLab());
const options = { apiKey: 'test-key', model: 'default-model', endpoint: 'https://example.com/responses', maxOutputTokens: 1000, timeoutMs: 1000 };

test('Skill 版本独立保存、默认切换不修改旧内容且旧修订不能写入', () => {
  const store = makeStore();
  const first = store.addSkillVersion(store.get().revision, { skillId: 'agentdoor-ewd-progress', label: 'v1.0', notes: '基线', snapshot: 'first instructions' });
  const version = first.skillVersions![0];
  const second = store.addSkillVersion(first.revision, { skillId: version.skillId, label: 'v1.1', notes: '调整', snapshot: 'second instructions' });
  store.setSkillDefault(second.revision, version.skillId, version.id);
  assert.equal(store.get().skillVersions![0].snapshot, 'first instructions');
  assert.equal(store.get().skillDefaults![version.skillId], version.id);
  assert.throws(() => store.setSkillDefault(first.revision, version.skillId, null), /版本/);
  assert.throws(() => store.setSkillDefault(store.get().revision, 'agentdoor-task-planner', version.id), /Skill/);
});

test('选中的模型、人员与 Skill 版本进入真实调用参数，排队后修改默认值不影响快照', async () => {
  const store = makeStore();
  const state = store.addSkillVersion(store.get().revision, { skillId: 'agentdoor-ewd-progress', label: 'v1', notes: '', snapshot: 'FROZEN_SKILL_MARKER' });
  store.setSkillDefault(state.revision, 'agentdoor-ewd-progress', state.skillVersions![0].id);
  let observed: any;
  const runner = createRunner(store, options, async (config, instructions, input) => {
    observed = { config, instructions, input };
    return { rawOutput: '{}', usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
  });
  const selection = { model: 'another-model', actorId: 'zhou' };
  const [run] = runner.enqueue(['case-effort'], 'selection-key', selection);
  assert.equal(runner.enqueue(['case-effort'], 'selection-key', selection)[0].id, run.id);
  assert.throws(() => runner.enqueue(['case-effort'], 'selection-key', { ...selection, model: 'different' }), /不同/);
  store.setSkillDefault(store.get().revision, 'agentdoor-ewd-progress', null);
  await runner.idle();
  assert.equal(observed.config.model, 'another-model');
  assert.equal(observed.input.principalId, 'zhou');
  assert.match(observed.instructions, /FROZEN_SKILL_MARKER/);
  assert.equal(store.get().cases.find(c => c.id === 'case-effort')!.actorId, 'lin');
  assert.equal(store.get().runs[0].steps[0].skillVersionId, state.skillVersions![0].id);
});

test('无权访问目标任务的人员在入队前被拒绝且没有模型调用', () => {
  const store = makeStore(); const state = store.get();
  state.cases[0].steps[0].taskId = 'private';
  store.save(state.revision, state.teams, state.cases);
  const runner = createRunner(store, options, async () => { throw new Error('不应调用'); });
  assert.throws(() => runner.enqueue(['case-create'], 'denied', { actorId: 'lin' }), /无权/);
  assert.equal(store.get().runs.length, 0);
});

test('复杂行业场景包含三级任务、受限文件和多轮用例', () => {
  const state = seedLab();
  for (const id of ['lab-manufacturing', 'lab-retail']) {
    const team = state.teams.find(t => t.id === id)!;
    assert.ok(team, id);
    assert.ok(team.members.length >= 6);
    assert.ok(team.tasks.length >= 12);
    assert.ok(team.tasks.some(t => t.parentId && team.tasks.find(p => p.id === t.parentId)?.parentId));
    assert.ok(team.evidence.filter(e => e.kind === '文件').length >= 4);
    assert.ok(team.evidence.some(e => e.visibleToIds.length));
    assert.ok(state.cases.some(c => c.teamId === id && c.enabled && c.steps.length >= 3));
    assert.doesNotMatch(team.name + team.description, /合成/);
  }
});

test('固定版本不受默认切换影响，常用模型可持久化且拒绝旧修订', async () => {
  const store=makeStore();
  let state=store.addSkillVersion(store.get().revision,{skillId:'agentdoor-ewd-progress',label:'fixed',notes:'',snapshot:'PINNED_CONTENT'});
  const fixed=state.skillVersions![0];
  state=store.addSkillVersion(state.revision,{skillId:'agentdoor-ewd-progress',label:'default',notes:'',snapshot:'DEFAULT_CONTENT'});
  state=store.setSkillDefault(state.revision,fixed.skillId,state.skillVersions![1].id);
  state.cases.find(c=>c.id==='case-effort')!.steps[0].skillVersionId=fixed.id;
  state=store.save(state.revision,state.teams,state.cases);
  const saved=store.saveModels(state.revision,['model-a','model-b','model-a']);
  assert.deepEqual(saved.models,['model-a','model-b']);
  assert.throws(()=>store.saveModels(state.revision,['model-c']),/版本/);
  let instructions='';
  const runner=createRunner(store,options,async (_options,prompt)=>{instructions=prompt;return {rawOutput:'{}',usage:{inputTokens:0,outputTokens:0,totalTokens:0}};});
  runner.enqueue(['case-effort'],'pinned');await runner.idle();
  assert.match(instructions,/PINNED_CONTENT/);assert.doesNotMatch(instructions,/DEFAULT_CONTENT/);
});

test('现有存储增补新行业而不覆盖人员编辑或历史报告，重复加载不再修改', () => {
  const path=join(mkdtempSync(join(tmpdir(),'lab-upgrade-')),'state.json');
  const old=seedLab();old.teamCurationVersion=2;delete old.managementVersion;
  old.teams=old.teams.filter(t=>!['lab-retail','lab-manufacturing'].includes(t.id));
  old.cases=old.cases.filter(c=>old.teams.some(t=>t.id===c.teamId));
  old.teams[0].name='合成·原有团队';old.teams[0].members[0].responsibilities=['用户保存的分工'];
  writeFileSync(path,JSON.stringify(old));
  const upgraded=createLabStore(path,seedLab()).get();
  assert.equal(upgraded.teams[0].name,'原有团队');
  assert.deepEqual(upgraded.teams[0].members[0].responsibilities,['用户保存的分工']);
  assert.deepEqual(upgraded.runs,old.runs);
  assert.ok(upgraded.teams.some(t=>t.id==='lab-retail'));
  assert.deepEqual(createLabStore(path,seedLab()).get(),upgraded);
});

test('已有团队和用例去掉导入编号，保留自定义名称、业务型号及运行快照', async () => {
  const path=join(mkdtempSync(join(tmpdir(),'lab-label-upgrade-')),'state.json');
  const store=createLabStore(path,seedLab());
  const old=importLibrary(store).state;
  const release=old.teams.find(team=>team.id==='import-REAL-A-REL-01')!;
  release.name='星渡桌面发布组 · REAL-A-REL-01';
  const releaseCase=old.cases.find(item=>item.id===release.id)!;
  releaseCase.name='REAL-A-REL-01 · reuse_full_duplicate_and_rewire_consumers';
  const customTeam=old.teams.find(team=>team.id==='import-REAL-A-SAAS-01')!;
  customTeam.name='森屿二期交付团队';
  const customCase=old.cases.find(item=>item.id===customTeam.id)!;
  customCase.name='管理员培训验收：第一批完成后的复核';
  const multi=old.cases.find(item=>item.id==='import-multiturn-A')!;
  multi.name='多轮 A · 新草稿、局部改期、保持不变';
  releaseCase.enabled=true;
  store.save(old.revision,old.teams,old.cases);
  const runner=createRunner(store,options,async()=>({rawOutput:'{}',usage:{inputTokens:0,outputTokens:0,totalTokens:0}}));
  runner.enqueue([releaseCase.id],'labels-history');await runner.idle();
  const saved=JSON.parse(JSON.stringify(store.get())) as ReturnType<typeof store.get>;delete saved.libraryNamesVersion;
  writeFileSync(path,JSON.stringify(saved));
  const upgraded=createLabStore(path,seedLab()).get();
  assert.equal(upgraded.teams.find(team=>team.id===release.id)!.name,'星渡桌面发布组');
  assert.equal(upgraded.cases.find(item=>item.id===release.id)!.name,'桌面版本发布：复用公证回执并衔接提交');
  assert.equal(upgraded.cases.find(item=>item.id===multi.id)!.name,'多轮：新草稿、局部改期、保持不变');
  assert.equal(upgraded.teams.find(team=>team.id===customTeam.id)!.name,customTeam.name);
  assert.equal(upgraded.cases.find(item=>item.id===customCase.id)!.name,customCase.name);
  assert.deepEqual(upgraded.teams.find(team=>team.id==='lab-manufacturing'),saved.teams.find(team=>team.id==='lab-manufacturing'));
  assert.deepEqual(upgraded.teams.find(team=>team.id===release.id)!.tasks,release.tasks);
  assert.equal(upgraded.cases.find(item=>item.id===release.id)!.origin,releaseCase.origin);
  assert.deepEqual(upgraded.runs,saved.runs);
  assert.deepEqual(createLabStore(path,seedLab()).get(),upgraded);
});
