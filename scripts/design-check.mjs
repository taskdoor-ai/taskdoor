import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(root, "scripts", "design-baseline.json");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : target;
  }));
  return files.flat();
}

function countMatches(source, pattern, predicate = () => true) {
  return [...source.matchAll(pattern)].filter((match) => predicate(match)).length;
}

const srcFiles = (await walk(path.join(root, "src"))).filter((file) => /\.(?:css|js|jsx|ts|tsx)$/.test(file));
const records = await Promise.all(srcFiles.map(async (file) => ({ file, source: await readFile(file, "utf8") })));
const cssRecords = records.filter(({ file }) => file.endsWith(".css"));
const scriptRecords = records.filter(({ file }) => /\.(?:js|jsx|ts|tsx)$/.test(file));
const outsideUiRecords = scriptRecords.filter(({ file }) => !file.includes(`${path.sep}components${path.sep}ui${path.sep}`));
const globalStyles = cssRecords.find(({ file }) => file === path.join(root, "src", "styles.css"));

const metrics = {
  microFontDeclarations: cssRecords.reduce((total, { source }) => total + countMatches(source, /font-size\s*:\s*(\d+(?:\.\d+)?)px/gi, (match) => Number(match[1]) < 12), 0),
  rawFontSizeDeclarations: cssRecords.reduce((total, { source }) => total + countMatches(source, /font-size\s*:\s*(?:\d+(?:\.\d+)?)(?:px|rem)\b/gi), 0),
  rawSpacingDeclarations: cssRecords.reduce((total, { source }) => total + countMatches(source, /(?:padding|margin|gap)(?:-(?:top|right|bottom|left|inline|block|x|y))?\s*:[^;{}]*\d+(?:\.\d+)?px/gi), 0),
  rawRadiusDeclarations: cssRecords.reduce((total, { source }) => total + countMatches(source, /border-radius\s*:[^;{}]*\d+(?:\.\d+)?px/gi), 0),
  arbitraryTailwindPixels: scriptRecords.reduce((total, { source }) => total + countMatches(source, /(?:text|size|[wh]|min-[wh]|max-[wh]|gap|p[trblxy]?|m[trblxy]?|rounded)-\[[^\]]*\d+(?:\.\d+)?px[^\]]*\]/gi), 0),
  hardcodedColorsInSource: records.reduce((total, { source }) => total + countMatches(source, /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\([^)]*\)/gi), 0),
  nativeSelectElements: scriptRecords.reduce((total, { source }) => total + countMatches(source, /<select\b/gi), 0),
  nativeDialogElements: scriptRecords.reduce((total, { source }) => total + countMatches(source, /<dialog\b/gi), 0),
  pagePrimitiveStyleOverrides: cssRecords.reduce((total, { source }) => total + countMatches(source, /[^{}]+\b(?:button|input|select|textarea)\b[^{}]*\{/gi), 0),
  duplicateUiExports: outsideUiRecords.reduce((total, { source }) => total + countMatches(source, /export\s+(?:function|const|class)\s+\w*(?:Button|Select|Dialog|Input|Badge|Table)\b/g), 0),
  globalStylesLines: globalStyles ? globalStyles.source.split(/\r?\n/).length : 0,
};

const forbiddenCopy = [
  { label: "默认 List / Default List", pattern: /默认\s*List|Default\s*List/i },
  { label: "占位 Lorem ipsum", pattern: /Lorem\s+ipsum/i },
];

const forbiddenFindings = [];
for (const { file, source } of records) {
  for (const rule of forbiddenCopy) {
    if (rule.pattern.test(source)) forbiddenFindings.push(`${path.relative(root, file)}: ${rule.label}`);
  }
}

let baseline;
try {
  baseline = JSON.parse(await readFile(baselinePath, "utf8"));
} catch {
  console.error("缺少 scripts/design-baseline.json。当前指标：");
  console.error(JSON.stringify(metrics, null, 2));
  process.exit(1);
}

const regressions = Object.entries(metrics)
  .filter(([name, value]) => typeof baseline[name] !== "number" || value > baseline[name])
  .map(([name, value]) => `${name}: ${baseline[name] ?? "未登记"} → ${value}`);

console.log("TaskDoor design check");
for (const [name, value] of Object.entries(metrics)) console.log(`  ${name}: ${value}（基线 ${baseline[name]}）`);

if (forbiddenFindings.length || regressions.length) {
  if (regressions.length) console.error(`\n新增设计债务：\n- ${regressions.join("\n- ")}`);
  if (forbiddenFindings.length) console.error(`\n禁止的用户界面文案：\n- ${forbiddenFindings.join("\n- ")}`);
  console.error("\n请复用现有 Token/组件或降低对应基线；不要通过抬高基线绕过检查。");
  process.exit(1);
}

console.log("\n✓ 未新增已登记的设计债务");
