// Rebuild only the technical insert; existing product HTML remains hand-authored.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = new URL('../', import.meta.url);
const source = new URL('docs/product-v2/PRD-AgentDoor-协作任务全流程.md', root);
const target = new URL('public/agentdoor-prd.html', root);
const md = await readFile(source, 'utf8');
const definitions = [
  { number: 7, id: 'skill-design', title: 'Skill 与判断规则', summary: '分别说明人员责任分析、创建任务、任务状态分析、任务诊断、我的工作推荐及 EWD 工时评估与进度。' },
  { number: 8, id: 'mcp-design', title: 'MCP：工具与参数设计', summary: '38 个候选工具的参数、回包与写入边界；与当前两个演示工具明确分开。' },
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
  ${quickLinks}
  ${content}
</section>`;
}).join('\n\n');
const html = await readFile(target, 'utf8');
const marker = /<!-- PRD-TECHNICAL:START -->[\s\S]*?<!-- PRD-TECHNICAL:END -->/;
if (!marker.test(html)) throw new Error('Technical insertion markers not found');
const next = html.replace(marker, `<!-- PRD-TECHNICAL:START -->\n${sections}\n<!-- PRD-TECHNICAL:END -->`);
await writeFile(target, next);
console.log(`Updated ${fileURLToPath(target)} (${sections.length} technical characters)`);
