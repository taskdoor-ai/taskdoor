// Rebuild progress requirements, rules, MCP reference, and meeting notes.
// Other product HTML remains hand-authored.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { buildPrdProgressPreview } from './build-prd-progress-preview.mjs';

const root = new URL('../', import.meta.url);
const source = new URL('docs/product-v2/PRD-AgentDoor-协作任务全流程.md', root);
const target = new URL('public/agentdoor-prd.html', root);
let md = await readFile(source, 'utf8');
const scenarios = JSON.parse(await readFile(new URL('docs/product-v2/progress-scenarios.json', root), 'utf8'));
const cell = value => String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
// Scenario rules already accompany the shared interactive preview. Preserve link
// targets without generating a second copy of all 28 sets of rules below it.
const scenarioContent = scenarios.map(item => `<a id="progress-case-${item.id}"></a>`).join('\n');
const scenarioMarker = /<!-- PRD-PROGRESS-SCENARIOS:START -->[\s\S]*?<!-- PRD-PROGRESS-SCENARIOS:END -->/;
if (!scenarioMarker.test(md)) throw new Error('Progress scenario insertion markers not found');
md = md.replace(scenarioMarker, `<!-- PRD-PROGRESS-SCENARIOS:START -->\n${scenarioContent}\n<!-- PRD-PROGRESS-SCENARIOS:END -->`);
const componentModel = JSON.parse(await readFile(new URL('docs/product-v2/progress-component-model.json', root), 'utf8'));
const modelTable = componentModel.slots.map(item => {
  const rows = [['位置',item.location],['展示内容',item.content],['数据来源',item.source],['判断规则',item.rule],['文案变化',item.fallback],['交互',item.interaction]];
  return `<details class="progress-entry" id="progress-slot-${item.id}">\n<summary>${item.id} ${escapeHtml(item.name)}</summary>\n\n| 项目 | 说明 |\n| --- | --- |\n${rows.map(([label,value])=>`| ${label} | ${cell(value)} |`).join('\n')}\n\n[返回组件模型](#progress-component-model)\n\n</details>`;
}).join('\n\n');
const modelMarker = /<!-- PRD-PROGRESS-MODEL:START -->[\s\S]*?<!-- PRD-PROGRESS-MODEL:END -->/;
if (!modelMarker.test(md)) throw new Error('Progress component model insertion markers not found');
md = md.replace(modelMarker, `<!-- PRD-PROGRESS-MODEL:START -->\n${modelTable}\n<!-- PRD-PROGRESS-MODEL:END -->`);
await writeFile(source, md);
const definitions = [
  { number: 7, id: 'skill-design', title: 'Skill 与判断规则', summary: '分别说明人员责任分析、创建任务、任务状态分析、任务诊断、我的工作推荐及 EWD 工时评估与进度。' },
  { number: 8, id: 'mcp-design', title: 'MCP：工具与参数设计', summary: '依会议方向暂缓推进；保留 38 个候选工具的既有设计，与当前演示工具分开。' },
  { number: 9, id: 'meeting-notes', title: '会议纪要', summary: '“上周五”任务流程评审：会议方向、冲突与待确认项、负责人和行动记录。归档于 2026-09-13。' },
];
const anchors = { '7.3': 'skill-create', '7.4': 'skill-status', '7.5': 'skill-diagnosis', '7.6': 'skill-priority', '7.7': 'ewd-progress', '7.8': 'skill-updates', '7.9': 'skill-responsibility' };
const findSection = number => md.search(new RegExp(`^## ${number}\\. `, 'm'));
const sections = definitions.map((definition, index) => {
  const start = findSection(definition.number);
  const end = index + 1 < definitions.length ? findSection(definitions[index + 1].number) : md.length;
  if (start < 0 || end <= start) throw new Error(`Missing section ${definition.number}`);
  const body = md.slice(start, end).replace(/^## .+\n/, '').replace(/\n---\s*$/, '');
  let content = marked.parse(body).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>')
    .replace(/<h3>(7\.[3456789]) ([^<]+)<\/h3>/g, (_, number, title) => `<h3 id="${anchors[number]}" class="subhead">${number} ${title}</h3>`);
  if (definition.id === 'skill-design') content = content.replace('<div class="table-wrap">', '<div class="table-wrap skill-overview-table">');
  content = content.replace(
    '<div class="table-wrap"><table>\n<thead>\n<tr>\n<th>EWD 明细项</th>\n<th>对应检查维度</th>',
    '<div class="table-wrap ewd-estimate-table"><table>\n<thead>\n<tr>\n<th>EWD 明细项</th>\n<th>对应检查维度</th>',
  );
  const quickLinks = definition.number === 7
    ? '<nav class="technical-nav" aria-label="Skill 快速定位"><a href="#skill-responsibility">人员责任分析</a><a href="#skill-create">创建任务</a><a href="#skill-status">状态分析</a><a href="#skill-diagnosis">任务诊断</a><a href="#skill-priority">我的工作推荐</a><a href="#ewd-progress">EWD 工时评估＋进度</a></nav>'
    : '';
  return `<section class="prd-section technical-content" id="${definition.id}" data-title="${definition.title}">
  <header class="section-heading"><span class="section-number">0${definition.number}</span><div><h2>${definition.title}</h2><p class="section-summary">${definition.summary}</p></div></header>
${quickLinks ? `  ${quickLinks}\n` : ''}  ${content}
</section>`;
}).join('\n\n');
const html = await readFile(target, 'utf8');
const marker = /<!-- PRD-TECHNICAL:START -->[\s\S]*?<!-- PRD-TECHNICAL:END -->/;
if (!marker.test(html)) throw new Error('Technical insertion markers not found');
const progressMarker = /<!-- PRD-PROGRESS:START -->[\s\S]*?<!-- PRD-PROGRESS:END -->/;
if (!progressMarker.test(html)) throw new Error('Progress insertion markers not found');
const progressStart = md.indexOf('### 6.3 ');
const progressEnd = md.indexOf('\n### 6.4 ', progressStart);
if (progressStart < 0 || progressEnd <= progressStart) throw new Error('Missing progress requirements');
const progress = marked.parse(md.slice(progressStart, progressEnd))
  .replace('<!-- PRD-PROGRESS-MODEL-PREVIEW -->', '<iframe title="进度组件模型 · 左侧模板与右侧说明" src="./agentdoor-progress-preview.html?view=model" loading="lazy" style="display:block;width:100%;height:840px;border:0;margin:20px 0"></iframe>')
  .replace('<!-- PRD-PROGRESS-COMPONENT -->', '<iframe title="任务完成进度与燃起图 · 同组件场景预览" src="./agentdoor-progress-preview.html" loading="lazy" style="display:block;width:100%;height:740px;border:0;border-radius:12px"></iframe>')
  .replace('href="../../public/agentdoor-progress-preview.html"', 'href="./agentdoor-progress-preview.html"')
  .replace('<h3>', '<h3 id="task-progress-design" class="subhead">')
  .replace(/<table>/g, '<div class="table-wrap"><table>')
  .replace(/<\/table>/g, '</table></div>');
const next = html.replace(marker, `<!-- PRD-TECHNICAL:START -->\n${sections}\n<!-- PRD-TECHNICAL:END -->`)
  .replace(progressMarker, `<!-- PRD-PROGRESS:START -->\n<div class="technical-content progress-module">${progress}</div>\n<!-- PRD-PROGRESS:END -->`);
await buildPrdProgressPreview();
await writeFile(target, next);
console.log(`Updated ${fileURLToPath(target)} (${sections.length} technical characters)`);
