import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seedLab } from './test-lab/seeds.ts';
import { createLabStore } from './test-lab/store.ts';
import { importedLibrary } from './test-lab/library.ts';
import { validateRelations, caseSchema } from './test-lab/schema.ts';
import { buildModelInput, buildView, applyEvents } from './test-lab/context.ts';
import { copyTeam } from '../src/test-lab/model.ts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CaseDetails } from '../src/test-lab/views.tsx';

function fullState() {
  const state = seedLab(), library = importedLibrary();
  const activeIds = new Set(['import-REAL-A-REL-01','import-REAL-A-SAAS-01','import-REAL-A-ECOM-01','import-REAL-A-CS-01','import-REAL-C-03']);
  state.teams.push(...library.teams.map(t => ({ ...t, archived: !activeIds.has(t.id) })));
  state.cases.push(...library.cases);
  state.teamCurationVersion = 2;
  return state;
}

test('十个行业都有完整资料和覆盖六类 Skill 的可运行场景', () => {
  const store = createLabStore(join(mkdtempSync(join(tmpdir(), 'lab-catalog-')), 'state.json'), fullState());
  const state = store.get(), active = state.teams.filter(t => !t.archived);
  assert.equal(active.length, 10);
  for (const team of active) {
    const cases = state.cases.filter(c => c.teamId === team.id && c.id.includes('-journey-'));
    assert.ok(cases.length >= 18, `${team.name} 用例不足`);
    assert.equal(new Set(cases.flatMap(c => c.steps.map(s => s.skillId))).size, 6);
    for (const kind of ['文件','讨论','交付','确认','活动']) assert.ok(team.evidence.filter(e => e.kind === kind).length >= 4, `${team.name} 缺少 ${kind}`);
    assert.ok(cases.filter(c => c.steps.length > 1).length >= 5);
    assert.ok(team.tasks.some(t => t.parentId && team.tasks.find(parent => parent.id === t.parentId)?.parentId));
    for (const c of cases) {
      assert.ok(c.enabled && c.assertions.length && c.reviewChecklist.length);
      let sandbox = structuredClone(team);
      for (const step of c.steps) {
        sandbox = applyEvents(sandbox, step);
        assert.doesNotThrow(() => buildModelInput(sandbox, c, step, 'catalog-check', []), c.name);
        for (const event of step.events) if (event.type === 'evidence' && event.evidence.kind === '文件' && event.evidence.attachment) {
          assert.equal(Buffer.from(event.evidence.attachment.dataUrl.split(',')[1], 'base64').toString('utf8'), event.evidence.content, `${c.name} 的事件文件与正文不一致`);
        }
      }
    }
  }
  validateRelations(state.teams, state.cases);
});

test('资料增补保留用户编辑、归档状态、旧版本和报告，重启不重复追加', () => {
  const old = fullState(), team = old.teams[0];
  team.name = '用户的内容团队';
  team.members[0].responsibilities = ['用户保存的责任'];
  team.evidence[0].content = '用户保存的正文';
  old.cases[0].name = '用户自己的用例';
  const path = join(mkdtempSync(join(tmpdir(), 'lab-catalog-preserve-')), 'state.json');
  writeFileSync(path, JSON.stringify(old));
  const saved = createLabStore(path, seedLab()).get();
  assert.equal(saved.teams[0].name, team.name);
  assert.deepEqual(saved.teams[0].members[0], team.members[0]);
  assert.deepEqual(saved.teams[0].tasks.slice(0, team.tasks.length), team.tasks);
  assert.deepEqual(saved.teams[0].evidence[0], team.evidence[0]);
  assert.deepEqual(saved.cases[0], old.cases[0]);
  assert.deepEqual(saved.runs, old.runs);
  assert.deepEqual(createLabStore(path, seedLab()).get(), saved);
});

test('固定判断时间进入模型上下文，文件附件不传给模型，受限资料不进入普通成员视角', () => {
  const state = createLabStore(join(mkdtempSync(join(tmpdir(), 'lab-catalog-context-')), 'state.json'), fullState()).get();
  const c = state.cases.find(c => c.id.includes('-journey-priority-'))!;
  assert.ok(c, '缺少排序用例');
  const team = state.teams.find(t => t.id === c.teamId)!;
  const step = c.steps[0];
  const input = buildModelInput(team, c, step, 'fixed-clock', []);
  assert.equal(input.evaluatedAt, new Date(step.evaluatedAt!).toISOString());
  assert.equal(input.currentDate, '2026-09-08');
  assert.doesNotMatch(JSON.stringify(input), /data:[^\s]*;base64/);
  const privateRecord = team.evidence.find(e => e.title.includes('商务底稿'))!;
  assert.ok(privateRecord);
  const actor = team.members.find(m => !privateRecord.visibleToIds.includes(m.id))!;
  const publicRecord = team.evidence.find(e => !e.visibleToIds.length && e.kind === '讨论')!;
  publicRecord.relatedEvidenceIds = [privateRecord.id];
  publicRecord.replyToId = privateRecord.id;
  const view = buildView(team, actor.id);
  assert.ok(!view.team.evidence.some(e => e.id === privateRecord.id));
  assert.ok(!view.team.evidence.some(e => e.relatedEvidenceIds?.includes(privateRecord.id)));
  assert.equal(view.team.evidence.find(e => e.id === publicRecord.id)?.replyToId, undefined);
  assert.equal(caseSchema.safeParse({...c, steps:[{...step,evaluatedAt:'not-a-date'}]}).success, false);
});

test('复制资料丰富的团队后，回复、文件替代及正文引用均指向副本', () => {
  const state = createLabStore(join(mkdtempSync(join(tmpdir(), 'lab-catalog-copy-')), 'state.json'), fullState()).get();
  const source = state.teams.find(t => !t.archived)!;
  const snapshot = structuredClone(source);
  const copied = copyTeam(source);
  validateRelations([copied], []);
  const ids = new Set(copied.evidence.map(e => e.id));
  for (const record of copied.evidence) {
    for (const id of [record.replyToId, record.supersedesId, ...(record.relatedEvidenceIds || [])].filter(Boolean)) assert.ok(ids.has(id!), `${record.title} 引用了原团队`);
    for (const task of source.tasks) assert.ok(!record.content.includes(`"${task.id}"`), `${record.title} 正文引用了原任务`);
    if (record.attachment && /^(text\/|application\/json)/.test(record.attachment.mimeType)) {
      assert.equal(Buffer.from(record.attachment.dataUrl.split(',')[1], 'base64').toString('utf8'), record.content);
    }
  }
  assert.deepEqual(source, snapshot);
});

test('用例详情展示可见的文件与讨论，隐藏私密资料并按需渲染正文', () => {
  const state = createLabStore(join(mkdtempSync(join(tmpdir(), 'lab-catalog-preview-')), 'state.json'), fullState()).get();
  const item = state.cases.find(c => c.id.includes('-journey-status-private'))!;
  const team = state.teams.find(t => t.id === item.teamId)!;
  const secret = team.evidence.find(e => e.title.includes('商务底稿'))!;
  const html = renderToStaticMarkup(createElement(CaseDetails, { item, team, skills: [] }));
  assert.match(html, /文件与讨论/);
  assert.match(html, /搜索文件、讨论或正文/);
  assert.match(html, /运行前资料/);
  assert.ok(!html.includes(secret.title));
  assert.ok(!html.includes(secret.content));
  assert.doesNotMatch(html, /data:[^\s]*;base64/);
});
