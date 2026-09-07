import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const registry = JSON.parse(readFileSync(resolve(root, 'skills/registry.json'), 'utf8'));
const source = readFileSync(resolve(root, registry.rulesSource), 'utf8');
const args = process.argv.slice(2);
const check = args.includes('--check');
const only = args.find(arg => arg.startsWith('--only='))?.slice(7);
if (args.some(arg => arg !== '--check' && !arg.startsWith('--only='))) throw new Error('仅支持 --check 与 --only=<skill-id>');
const selected = registry.skills.filter(skill => !only || skill.id === only);
if (!selected.length) throw new Error(`未知 Skill：${only}`);

// 先完整验证边界，再生成快照；不会改写 PRD 或运行时注册。
const updates = selected.map(skill => {
  const output = resolve(root, skill.rulesFile);
  if (!output.startsWith(resolve(root, 'skills', skill.id) + sep)) throw new Error(`越界路径：${skill.rulesFile}`);
  const sections = skill.ruleSections.map(heading => {
    const start = source.indexOf(heading);
    if (start < 0 || source.indexOf(heading, start + heading.length) >= 0) throw new Error(`章节缺失或重复：${heading}`);
    const tail = source.slice(start + heading.length);
    const next = tail.search(/^#{2,3} /m);
    return source.slice(start, next < 0 ? undefined : start + heading.length + next).replace(/\n---\s*$/, '').trim();
  });
  const content = `# 产品规则快照\n\n由 scripts/sync-agentdoor-skill-rules.mjs 从 ${registry.rulesSource} 生成。请修改 PRD 后重新同步，不手工修改本文件。\n\n${sections.join('\n\n')}\n`;
  return { output, content, id: skill.id };
});
const stale = updates.filter(({ output, content }) => !existsSync(output) || readFileSync(output, 'utf8') !== content);
if (check) {
  if (stale.length) throw new Error(`规则未同步：${stale.map(item => item.id).join(', ')}`);
  console.log(`${updates.length} 类 Skill 规则快照一致`);
} else {
  for (const { output, content } of stale) {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, content);
  }
  console.log(`更新 ${stale.length} / ${updates.length} 类 Skill 规则快照`);
}
