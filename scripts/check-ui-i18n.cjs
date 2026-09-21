/** Static guard for JSX copy reachable from the app. Does not claim runtime/data coverage. */
const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const seen = new Set();
function collect(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:from\s*|import\s*\(|import\s*)["']([^"']+)["']/g)) {
    const spec = match[1];
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
    const base = spec.startsWith('@/') ? `src/${spec.slice(2)}` : path.join(path.dirname(file), spec);
    const dependency = [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (dependency && /\.tsx?$/.test(dependency)) collect(dependency);
  }
}
collect('src/App.tsx');
const failures = [];
const translatedSources = new Set(Object.values(JSON.parse(fs.readFileSync("src/i18n/globalUiMessages.json", "utf8"))).map(copy => copy.zh));
let components = 0;
for (const file of seen) {
  if (!file.startsWith('src/components/') || !file.endsWith('.tsx')) continue;
  components++;
  const ast = parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  function visit(node, parent) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression' && node.callee?.name === 'ui' && node.arguments[0]?.type === 'StringLiteral') {
      const source = node.arguments[0].value;
      if (/\p{Script=Han}/u.test(source) && !translatedSources.has(source)) failures.push(`${file}:${node.loc.start.line}: missing system translation: ${source}`);
    }
    const text = node.type === 'JSXText' ? node.value.trim() : node.type === 'StringLiteral' && parent?.type === 'JSXAttribute' ? node.value : '';
    if (/\p{Script=Han}/u.test(text) && !(file.endsWith('/LanguageSwitcher.tsx') && text === '简体中文')) failures.push(`${file}:${node.loc.start.line}: ${text}`);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc') continue;
      if (Array.isArray(value)) value.forEach(child => visit(child, node));
      else if (value && typeof value === 'object') visit(value, node);
    }
  }
  visit(ast);
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Checked ${components} reachable components: no untranslated static JSX copy (language endonyms excluded). Dynamic content requires separate tests.`);
