import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const registry = JSON.parse(readFileSync(resolve(root, 'skills/registry.json'), 'utf8'));
const args = process.argv.slice(2);
const check = args.includes('--check');
const only = args.find(arg => arg.startsWith('--only='))?.slice(7);
if (args.some(arg => arg !== '--check' && !arg.startsWith('--only='))) throw new Error('仅支持 --check 与 --only=<skill-id>');
const selected = registry.skills.filter(skill => !only || skill.id === only);
if (!selected.length) throw new Error(`未知 Skill：${only}`);

// 先验证全部来源和输出边界，再写快照；源 PRD 不被修改。
function extract(source, heading) {
  const lines = source.split(/\r?\n/);
  const indices = lines.flatMap((line, index) => line === heading ? [index] : []);
  if (indices.length !== 1) throw new Error(`章节缺失或重复：${heading}`);
  const depth = heading.match(/^#+/)?.[0].length;
  if (!depth) throw new Error(`无效章节标题：${heading}`);
  const start = indices[0];
  let end = start + 1;
  while (end < lines.length) {
    const level = lines[end].match(/^(#+) /)?.[1].length;
    if (level && level <= depth) break;
    end++;
  }
  return lines.slice(start, end).join('\n').replace(/\n---\s*$/, '').trim();
}
const definitions = [
  ...selected.map(skill => ({id: skill.id, output: skill.rulesFile, title: '产品规则快照', boundary: `skills/${skill.id}`, sources: [{path: registry.rulesSource, sections: skill.ruleSections}]})),
  ...(registry.ruleSnapshots ?? []).map(item => ({...item, id: item.output, boundary: 'skills/shared'})),
];
const updates = definitions.map(item => {
  const output = resolve(root, item.output);
  if (!output.startsWith(resolve(root, item.boundary) + sep)) throw new Error(`越界路径：${item.output}`);
  const sections = item.sources.map(entry => {
    const path = resolve(root, entry.path);
    if (!path.startsWith(resolve(root, 'docs') + sep)) throw new Error(`越界来源：${entry.path}`);
    const source = readFileSync(path, 'utf8');
    return `来源：${entry.path}\n\n${entry.sections.map(heading => extract(source, heading)).join('\n\n')}`;
  });
  const content = `# ${item.title}\n\n由 scripts/sync-agentdoor-skill-rules.mjs 按 registry.json 中的章节生成。规则变更先修改对应产品文档，再同步本文件；不要独立改写快照。\n\n${sections.join('\n\n')}\n`;
  return {output, content, id: item.id};
});
const stale = updates.filter(({ output, content }) => !existsSync(output) || readFileSync(output, 'utf8') !== content);
if (check) {
  if (stale.length) throw new Error(`规则未同步：${stale.map(item => item.id).join(', ')}`);
  console.log(`${selected.length} 类 Skill 及共用规则快照一致（${updates.length} 份）`);
} else {
  for (const { output, content } of stale) {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, content);
  }
  console.log(`更新 ${stale.length} / ${updates.length} 类 Skill 规则快照`);
}
