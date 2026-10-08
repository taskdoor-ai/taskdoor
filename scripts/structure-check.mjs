import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// Layer rules for src/ (the app / shared / features / ai layout of TaskDoor apps/web, ADR-0014).
// Zero dependencies on purpose: it reads import specifiers with regular expressions, like
// design-check.mjs reads CSS. The evaluation lab (src/test-lab), the PRD site (src/prd) and
// src/assets are separate sub-projects and are not scanned.
//
//   1. shared/ does not import features/, app/ or ai/.
//   2. features/<x> imports another feature only along feature-dependencies.json.
//   3. ai/mock/ is imported only from ai/.
//   4. app/ is imported only by main.tsx (and by files inside app/).
//   5. No "../" imports inside src/; same-directory "./" and "@/" are fine.
//   6. File names under features/ and shared/{lib,i18n,model}: .ts modules kebab-case,
//      .tsx components PascalCase, hooks useX.
//
// Named exceptions are counted per file in scripts/structure-exceptions.json, each rule with the
// reason it is allowed ("$reasons", "$fileReasons"). A file may not go above its count, and a count
// that has gone down must be lowered there too, so the exceptions only ever shrink.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const baselinePath = path.join(root, "scripts", "structure-exceptions.json");
const graphPath = path.join(root, "feature-dependencies.json");
const SKIPPED = new Set(["test-lab", "prd", "assets"].map((name) => path.join(src, name)));

// Feature pairs that import each other in PM code and are left for PM to resolve. Each entry is
// "a<->b" with a reason; the cycle check ignores exactly these pairs.
const KNOWN_CYCLES = {
  "members<->tasks": "members/lib/team-lifecycle-storage clears a deleted team's local task state (recycle bin, activity, AI drafts, file drafts, collaboration); tasks pick owners and participants with the members' MemberSelector / PersonPicker. Left for PM: the demo keeps team deletion next to the team store.",
};
// The number of edges in feature-dependencies.json when it was set. It may only fall.
const MAX_FEATURE_EDGES = 9;
// While src/ is being moved into the layers, a feature may be declared before its directory exists.
// Set to true once every declared feature has a directory: then the two lists must be equal.
const REQUIRE_EVERY_FEATURE_DIRECTORY = true;
// Lower bounds: below these the scan has stopped reading the tree, and "no violations" means nothing.
const MIN_FILES = 100;
const MIN_SPECIFIERS = 500;

const RULES = {
  "shared-imports-upper-layer": "shared/ 不得 import features/、app/、ai/",
  "feature-edge-not-declared": "features/<x> 只能沿 feature-dependencies.json 登记的边 import 其它 feature",
  "ai-mock-outside-ai": "ai/mock/ 只能被 ai/ 下的文件 import",
  "app-imported-outside-main": "app/ 只能被 main.tsx（及 app/ 内部）import",
  "parent-relative-import": "src/ 内不得用 ../ 跨目录 import（同目录 ./ 与 @/ 可以）",
  "file-name": "features/ 与 shared/{lib,i18n,model} 下：.ts 用 kebab-case，.tsx 用 PascalCase，hook 用 useX",
};

function walk(directory) {
  if (SKIPPED.has(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const posix = (file) => path.relative(root, file).split(path.sep).join("/");
const lineOf = (source, index) => source.slice(0, index).split("\n").length;

const SPECIFIER_PATTERNS = [
  /\b(?:import|export)\s+(?:type\s+)?(?:[^'"`;]*?\bfrom\s*)?["']([^"'\n]+)["']/g,
  /\bimport\(\s*["']([^"'\n]+)["']\s*\)/g,
];
const CSS_IMPORT = /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/g;

function specifiersOf(file, source) {
  const patterns = file.endsWith(".css") ? [CSS_IMPORT] : SPECIFIER_PATTERNS;
  return patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => ({ spec: match[1], line: lineOf(source, match.index) })),
  );
}

function resolveSpecifier(file, spec) {
  const bare = spec.replace(/[?#].*$/, "");
  if (bare.startsWith("@/")) return path.join(src, bare.slice(2));
  if (bare.startsWith(".")) return path.resolve(path.dirname(file), bare);
  return null;
}

// Where a path sits in the layout: "app", "shared/<dir>", "features/<name>", "ai/mock", "ai", "main", or "legacy".
function layerOf(absolute) {
  const parts = path.relative(src, absolute).split(path.sep);
  if (parts[0] === ".." || path.isAbsolute(path.relative(src, absolute))) return { layer: "outside" };
  if (parts.length === 1 && /^main\.tsx?$/.test(parts[0])) return { layer: "main" };
  if (parts[0] === "app") return { layer: "app" };
  if (parts[0] === "shared") return { layer: "shared", dir: parts.length > 2 ? parts[1] : "" };
  if (parts[0] === "features") return { layer: "features", feature: parts[1] };
  if (parts[0] === "ai") return { layer: parts[1] === "mock" ? "ai/mock" : "ai" };
  return { layer: "legacy" };
}

function fileNameProblem(file) {
  const where = layerOf(file);
  const named = where.layer === "features" || (where.layer === "shared" && ["lib", "i18n", "model"].includes(where.dir));
  if (!named || !/\.tsx?$/.test(file) || file.endsWith(".d.ts")) return null;
  const name = path.basename(file).replace(/\.tsx?$/, "");
  const component = file.endsWith(".tsx");
  const valid = /^use[A-Z][A-Za-z0-9]*$/.test(name) || (component ? /^[A-Z][A-Za-z0-9]*$/ : /^[a-z0-9]+(-[a-z0-9]+)*$/).test(name);
  return valid ? null : `${path.basename(file)} 应为 ${component ? "PascalCase" : "kebab-case"}`;
}

const graphFile = JSON.parse(readFileSync(graphPath, "utf8"));
const graph = Object.fromEntries(Object.entries(graphFile).filter(([name]) => !name.startsWith("$")));

const files = walk(src).filter((file) => /\.(?:ts|tsx|js|jsx|mjs|css)$/.test(file));
const findings = Object.fromEntries(Object.keys(RULES).map((rule) => [rule, []]));
let specifierCount = 0;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const from = layerOf(file);
  const nameProblem = fileNameProblem(file);
  if (nameProblem) findings["file-name"].push({ file: posix(file), line: 1, detail: nameProblem });
  for (const { spec, line } of specifiersOf(file, source)) {
    specifierCount += 1;
    const target = resolveSpecifier(file, spec);
    if (!target) continue;
    const to = layerOf(target);
    const record = (rule) => findings[rule].push({ file: posix(file), line, detail: spec });
    if (spec.startsWith("../")) record("parent-relative-import");
    if (from.layer === "shared" && ["features", "app", "ai", "ai/mock"].includes(to.layer)) record("shared-imports-upper-layer");
    if (from.layer === "features" && to.layer === "features" && to.feature !== from.feature && !(graph[from.feature] && to.feature in graph[from.feature])) record("feature-edge-not-declared");
    if (to.layer === "ai/mock" && !["ai", "ai/mock"].includes(from.layer)) record("ai-mock-outside-ai");
    if (to.layer === "app" && !["main", "app"].includes(from.layer)) record("app-imported-outside-main");
  }
}

// The feature graph itself: it names the feature directories, says why for each edge, stays acyclic
// apart from KNOWN_CYCLES, and does not grow.
const graphProblems = [];
const edges = Object.entries(graph).flatMap(([from, to]) => Object.keys(to).map((name) => [from, name]));
const featuresDir = path.join(src, "features");
let featureNote = "";
if (existsSync(featuresDir)) {
  const directories = readdirSync(featuresDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const declared = Object.keys(graph).sort();
  const undeclared = directories.filter((name) => !declared.includes(name));
  const missing = declared.filter((name) => !directories.includes(name));
  if (undeclared.length) graphProblems.push(`src/features 下的目录没有登记在 feature-dependencies.json：${undeclared.join(", ")}`);
  if (missing.length && REQUIRE_EVERY_FEATURE_DIRECTORY) graphProblems.push(`feature-dependencies.json 登记的 feature 没有目录：${missing.join(", ")}`);
  else if (missing.length) featureNote = `  已登记、目录尚未建立的 feature：${missing.join(", ")}`;
}
for (const [from, to] of edges) {
  if (!(to in graph)) graphProblems.push(`边 ${from} -> ${to} 指向未登记的 feature`);
  if (typeof graph[from][to] !== "string" || graph[from][to].length <= 10) graphProblems.push(`边 ${from} -> ${to} 需要一句理由`);
}
if (edges.length > MAX_FEATURE_EDGES) graphProblems.push(`feature-dependencies.json 有 ${edges.length} 条边，登记上限 ${MAX_FEATURE_EDGES}（只减不增）`);
const knownCycle = (a, b) => `${a}<->${b}` in KNOWN_CYCLES || `${b}<->${a}` in KNOWN_CYCLES;
const state = new Map();
const visit = (name, trail) => {
  if (state.get(name) === "done") return;
  if (state.get(name) === "visiting") return graphProblems.push(`feature 之间有环：${[...trail, name].join(" -> ")}`);
  state.set(name, "visiting");
  for (const next of Object.keys(graph[name] ?? {})) if (!knownCycle(name, next)) visit(next, [...trail, name]);
  state.set(name, "done");
};
for (const name of Object.keys(graph)) visit(name, []);

const counts = Object.fromEntries(Object.entries(findings).map(([rule, list]) => {
  const perFile = {};
  for (const { file } of list) perFile[file] = (perFile[file] ?? 0) + 1;
  return [rule, Object.fromEntries(Object.entries(perFile).sort(([a], [b]) => a.localeCompare(b)))];
}));

if (process.argv.includes("--print-counts")) {
  console.log(JSON.stringify(counts, null, 2));
  process.exit(0);
}

let baseline = {};
if (existsSync(baselinePath)) baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const reasons = baseline.$reasons ?? {};
const fileReasons = baseline.$fileReasons ?? {};

const regressions = [];
const improvements = [];
for (const rule of Object.keys(RULES)) {
  const allowed = baseline[rule] ?? {};
  for (const file of new Set([...Object.keys(counts[rule]), ...Object.keys(allowed)])) {
    const now = counts[rule][file] ?? 0;
    const was = allowed[file] ?? 0;
    if (now > was) regressions.push({ rule, file, was, now });
    else if (now < was) improvements.push({ rule, file, was, now });
  }
}

const total = (rule) => Object.values(counts[rule]).reduce((sum, n) => sum + n, 0);
console.log("TaskDoor structure check");
console.log(`  扫描文件 ${files.length}，import 说明符 ${specifierCount}，feature 边 ${edges.length}`);
for (const rule of Object.keys(RULES)) console.log(`  ${rule}: ${total(rule)}（例外 ${Object.values(baseline[rule] ?? {}).reduce((sum, n) => sum + n, 0)}）`);
for (const [pair, why] of Object.entries(KNOWN_CYCLES)) console.log(`  已登记的环 ${pair}：${why}`);
const listed = Object.keys(RULES).filter((rule) => Object.keys(baseline[rule] ?? {}).length);
if (listed.length) console.log("\n具名例外（scripts/structure-exceptions.json，只减不增）：");
for (const rule of listed) {
  console.log(`  ${rule}：${reasons[rule] ?? "（缺理由）"}`);
  for (const [file, n] of Object.entries(baseline[rule])) console.log(`    ${file} ${n}${fileReasons[file] ? `（${fileReasons[file]}）` : ""}`);
}
if (featureNote) console.log(featureNote);

let failed = false;
if (files.length < MIN_FILES || specifierCount < MIN_SPECIFIERS) {
  console.error(`\n只扫到 ${files.length} 个文件、${specifierCount} 个 import 说明符（下限 ${MIN_FILES} / ${MIN_SPECIFIERS}）：检查已经不在工作，零违反不说明任何事。`);
  failed = true;
}
if (graphProblems.length) {
  console.error(`\nfeature 依赖图：\n- ${graphProblems.join("\n- ")}`);
  failed = true;
}
if (regressions.length) {
  console.error("\n新增结构违反：");
  for (const { rule, file, was, now } of regressions) {
    console.error(`- ${RULES[rule]}：${file} ${was} → ${now}`);
    for (const finding of findings[rule].filter((item) => item.file === file)) console.error(`    ${finding.file}:${finding.line}  ${finding.detail}`);
  }
  failed = true;
}
if (improvements.length) {
  console.error("\n违反已减少，请同步降低 scripts/structure-exceptions.json（例外只减不增）：");
  for (const { rule, file, was, now } of improvements) console.error(`- ${rule}：${file} ${was} → ${now}`);
  failed = true;
}
const unexplained = listed.filter((rule) => !reasons[rule]);
if (unexplained.length) {
  console.error(`\n例外缺少理由：${unexplained.join(", ")}`);
  failed = true;
}
if (failed) {
  console.error("\n目录约定见 TaskDoor ADR-0014；不要通过放宽例外绕过检查。");
  process.exit(1);
}
console.log("\n✓ 没有新增结构违反");
