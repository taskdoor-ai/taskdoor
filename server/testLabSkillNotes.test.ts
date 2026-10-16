import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import {skillVersionNotesInputSchema} from './test-lab/schema.ts';
import {createLabClient} from '../src/test-lab/client.ts';
import {skillVersionOption,selectedSkillVersion} from '../src/test-lab/skill-version-notes.ts';
import type {LabRun} from '../src/test-lab/types.ts';

test('补充版本说明仅改 notes，冻结包、版本身份、默认与历史运行不变',()=>{
  const seed=seedLab(),path=join(mkdtempSync(join(tmpdir(),'skill-notes-')),'state.json');
  const store=createLabStore(path,seed);
  let state=store.get();state=store.addSkillVersion(state.revision,{skillId:'agentdoor-task-planner',label:'v15',notes:'旧说明',snapshot:'# 已冻结规则',baseVersionId:null});
  const version=state.skillVersions!.at(-1)!;
  state=store.setSkillDefault(state.revision,version.skillId,version.id);
  const item=state.cases[0],team=state.teams.find(team=>team.id===item.teamId)!;
  const history:LabRun={id:'historical-run',batchId:'historical-batch',requestId:'historical-request',caseId:item.id,caseName:item.name,actorId:item.actorId,teamId:team.id,status:'interrupted',createdAt:'2026-10-16T00:00:00Z',startedAt:null,finishedAt:'2026-10-16T00:00:00Z',model:'test',endpoint:'https://example.invalid/responses',skillVersionId:version.id,selection:{executionMode:'preview',skillId:version.skillId,skillVersionId:version.id},caseSnapshot:structuredClone(item),teamSnapshot:structuredClone(team),steps:[],error:'历史记录',review:null};
  store.appendRuns([history]);
  const before=store.get(),saved=store.updateSkillVersionNotes(before.revision,version.id,{notes:'  真实目标、可验证标准；持续任务不强加截止。  '});
  assert.equal(saved.revision,before.revision+1);
  assert.deepEqual(saved.skillVersions!.at(-1),{...before.skillVersions!.at(-1),notes:'真实目标、可验证标准；持续任务不强加截止。'});
  assert.deepEqual(saved.runs,before.runs);assert.deepEqual(saved.skillDefaults,before.skillDefaults);
  assert.equal(store.updateSkillVersionNotes(saved.revision,version.id,{notes:saved.skillVersions!.at(-1)!.notes}).revision,saved.revision);
  assert.equal(createLabStore(path,seed).get().skillVersions!.at(-1)!.notes,'真实目标、可验证标准；持续任务不强加截止。');
});

test('说明更新拒绝旧 revision、缺失版本、过长内容及任何冻结字段',()=>{
  const store=createLabStore(join(mkdtempSync(join(tmpdir(),'skill-notes-guard-')),'state.json'),seedLab());
  const initial=store.get(),saved=store.addSkillVersion(initial.revision,{skillId:'agentdoor-task-planner',label:'v1',notes:'',snapshot:'# frozen'}),id=saved.skillVersions!.at(-1)!.id;
  assert.throws(()=>store.updateSkillVersionNotes(initial.revision,id,{notes:'新说明'}),/版本已更新/);
  assert.throws(()=>store.updateSkillVersionNotes(saved.revision,'missing',{notes:'新说明'}),/不存在/);
  assert.equal(skillVersionNotesInputSchema.safeParse({notes:'说明',snapshot:'changed'}).success,false);
  assert.equal(skillVersionNotesInputSchema.safeParse({notes:'说明',hash:'changed'}).success,false);
  assert.equal(skillVersionNotesInputSchema.safeParse({notes:'x'.repeat(2001)}).success,false);
  assert.equal(store.get().revision,saved.revision);
});

test('客户端通过专用说明接口写入 notes，不发送规则正文',async()=>{
  let captured:{path:string;init?:RequestInit}|undefined;
  const client=createLabClient('csrf',async(path,init)=>{captured={path:String(path),init};return new Response(JSON.stringify({revision:2}),{status:200,headers:{'Content-Type':'application/json'}});});
  await client.updateSkillVersionNotes(1,'version/id','修复范围与日期');
  assert.equal(captured!.path,'/api/test-lab/skill-versions/version%2Fid/notes');
  assert.equal(captured!.init!.method,'PUT');assert.deepEqual(JSON.parse(String(captured!.init!.body)),{expectedRevision:1,notes:'修复范围与日期'});
});

test('选版摘要精简换行，完整说明保留且固定工作区不会误读默认版',()=>{
  const version={id:'v15',skillId:'agentdoor-task-planner' as const,label:'创建 v15',notes:'真实目标\n可核对标准',hash:'hash',snapshot:'body',createdAt:'2026-10-16T00:00:00Z'};
  assert.equal(skillVersionOption(version),'创建 v15 · 真实目标 可核对标准');
  assert.match(skillVersionOption({...version,notes:'长'.repeat(100)}),/…$/);
  assert.equal(selectedSkillVersion([version],{[version.skillId]:version.id},version.skillId)?.notes,version.notes);
  assert.equal(selectedSkillVersion([version],{[version.skillId]:version.id},version.skillId,null),undefined);
  assert.equal(selectedSkillVersion([version],{},'agentdoor-task-status-analyzer',version.id),undefined);
});
