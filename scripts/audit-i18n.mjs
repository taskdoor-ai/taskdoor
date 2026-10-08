import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const roots = ['src/app', 'src/shared', 'src/features', 'src/ai', 'src/test-lab', 'server', 'mcp'];
// Translation catalogues (any i18n/ folder) are not inventoried, as src/i18n was not before the four-layer move.
const skipped = new Set(['i18n']);
const findings = [];
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!skipped.has(entry.name)) await scan(file); continue; }
    if (!/\.(ts|tsx)$/.test(file) || /\.test\./.test(file)) continue;
    const source = await readFile(file, 'utf8');
    const textCount = source.split('\n').filter(line => /[\u3400-\u9fff]/u.test(line)).length;
    const fixedLocale = [...source.matchAll(/(?:zh-CN|Asia\/Shanghai)/g)].length;
    if (textCount || fixedLocale) findings.push({ file, chineseLines: textCount, fixedLocaleReferences: fixedLocale });
  }
}
for (const root of roots) await scan(root);
console.log(JSON.stringify({ note: 'Inventory only: includes comments, fixtures, prompts, and legacy domain values. Human classification is required; this is not translation coverage.', files: findings.sort((a,b) => b.chineseLines-a.chineseLines) }, null, 2));
