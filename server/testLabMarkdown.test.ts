import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MarkdownContent } from '../src/test-lab/markdown.tsx';
import { evidenceDownload, isMarkdownEvidence, markdownAttachment, replaceSkillDocument, splitSkillDocuments, updateEvidenceContent } from '../src/test-lab/markdown-files.ts';
import { TeamDetails } from '../src/test-lab/views.tsx';
import { createLabStore } from './test-lab/store.ts';
import { seedLab } from './test-lab/seeds.ts';
import { loadSkill, resolveSkill } from './test-lab/skills.ts';

test('Markdown 渲染标题、表格、清单和代码，并安全显示 HTML 与链接', () => {
  const html = renderToStaticMarkup(createElement(MarkdownContent, { content: '---\nname: 文档\n---\n# 验证记录\n\n**已完成**\n\n| 项目 | 结果 |\n| --- | --- |\n| 回滚 | 待复核 |\n\n- [x] 升级验证\n- [ ] 回滚验证\n\n```js\nconst count = 3;\n```\n\n<script>alert(1)</script>\n\n[运行](javascript:alert%281%29)\n\n[资料](https://example.com)' }));
  for (const expected of ['<h1>验证记录</h1>', '<table>', '<strong>已完成</strong>', 'type="checkbox"', 'checked=""', 'language-js', '文档属性']) assert.ok(html.includes(expected), expected);
  assert.doesNotMatch(html, /<script>|href="javascript:/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test('按文件编辑 Skill 保留其他文件和分隔符，兼容独立 Markdown 快照', () => {
  const source = '\n--- FILE: skills/demo/SKILL.md ---\n---\nname: demo\n---\n# 规则\n\n--- FILE: skills/demo/references/rules.md ---\n# 引用\n';
  const files = splitSkillDocuments(source);
  assert.equal(files.length, 2);
  assert.equal(replaceSkillDocument(source, 0, files[0].content), source);
  const edited = replaceSkillDocument(source, 0, '# 新规则');
  assert.equal(splitSkillDocuments(edited)[0].content, '# 新规则\n');
  assert.deepEqual(splitSkillDocuments(edited).map(file => [file.path, file.content]).slice(1), files.map(file => [file.path, file.content]).slice(1));
  assert.equal(replaceSkillDocument('# 独立文件', 0, '# 已编辑'), '# 已编辑');
  assert.throws(() => replaceSkillDocument(source, 8, '内容'), /不存在/);
});

test('Markdown 保存后的正文、下载字节与附件大小一致，非 Markdown 附件保留原文件', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'lab-md-file-')), 'state.json');
  const store = createLabStore(path, seedLab());
  let state = store.get();
  const team = state.teams[0], item = team.evidence.find(file => file.id === 'script-file')!;
  item.attachment = markdownAttachment(item.title, item.content);
  state = store.save(state.revision, state.teams, state.cases);
  const before = state.teams[0].evidence.find(file => file.id === item.id)!;
  const content = '# 新品脚本\n\n- [x] 产品介绍\n- [ ] 最终行动引导\n\n中文与 emoji：🌧️\n';
  state.teams[0].evidence = state.teams[0].evidence.map(file => file.id === item.id ? updateEvidenceContent(file, content) : file);
  store.save(state.revision, state.teams, state.cases);
  const saved = createLabStore(path, seedLab()).get().teams[0].evidence.find(file => file.id === item.id)!;
  const download = evidenceDownload(saved);
  assert.equal(Buffer.from(download.dataUrl.split(',')[1], 'base64').toString('utf8'), content);
  assert.equal(saved.attachment?.size, Buffer.byteLength(content));
  assert.equal(saved.content, content);
  assert.equal(saved.version, before.version + 1);
  const pdf = { ...before, attachment: { ...before.attachment!, name: '原稿.pdf', mimeType: 'application/pdf' } };
  assert.equal(isMarkdownEvidence(pdf), false);
  assert.deepEqual(updateEvidenceContent(pdf, '新摘要').attachment, pdf.attachment);
});

test('编辑引用文件后保存 Skill 新版本，后续运行可选用且旧版本不受影响', () => {
  const store = createLabStore(join(mkdtempSync(join(tmpdir(), 'lab-md-skill-')), 'state.json'), seedLab());
  const skillId = 'agentdoor-responsibility-advisor';
  const original = loadSkill(skillId).snapshot.trim();
  let state = store.addSkillVersion(store.get().revision, { skillId, label: 'v1', notes: '', snapshot: original });
  const first = state.skillVersions![0];
  const document = splitSkillDocuments(original)[1];
  const edited = replaceSkillDocument(original, 1, document.content + '\n## 补充规则\n保留未确认的责任边界。\n').trim();
  state = store.addSkillVersion(state.revision, { skillId, label: 'v2', notes: '编辑引用文件', snapshot: edited });
  assert.equal(state.skillVersions![0].snapshot, original);
  const second = state.skillVersions![1];
  assert.notEqual(second.hash, first.hash);
  assert.equal(resolveSkill(state, skillId, second.id).snapshot, edited);
  assert.equal(splitSkillDocuments(second.snapshot)[0].content, splitSkillDocuments(original)[0].content);
});

test('任务文件直接提供 Markdown 编辑入口，历史快照和人员视角只读', () => {
  const team = seedLab().teams[0];
  team.evidence.find(file => file.id === 'script-file')!.content = '# 新品脚本\n\n**待确认**';
  const editable = renderToStaticMarkup(createElement(TeamDetails, { team, onEditFile: () => {} }));
  assert.match(editable, /<h1>新品脚本<\/h1>/);
  assert.match(editable, /编辑文档/);
  assert.doesNotMatch(renderToStaticMarkup(createElement(TeamDetails, { team })), /编辑文档/);
});
