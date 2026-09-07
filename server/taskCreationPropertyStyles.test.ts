import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(`../src/styles/${file}`, import.meta.url), "utf8");
const declarations = (css: string, selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  assert.ok(rule, `缺少局部样式：${selector}`);
  return rule[1];
};
const properties = ".task-detail-properties:is(.creation-heading-properties, .creation-subtask-metadata)";

test("创建主子任务属性行共用紧凑间距及详情分隔线，不影响其他详情", () => {
  const css = read("task-creation-cards.css");
  const row = declarations(css, properties);
  assert.match(row, /align-items:\s*center/);
  assert.match(row, /column-gap:\s*var\(--ad-space-3\)/);
  const separator = declarations(css, `${properties} > .task-detail-property-separator`);
  assert.match(separator, /flex:\s*0 0 1px/);
  assert.match(separator, /height:\s*var\(--ad-space-6\)/);
  assert.match(separator, /background:\s*var\(--ad-border-soft\)/);
  assert.match(separator, /pointer-events:\s*none/);
  assert.doesNotMatch(css, /(?:^|\})\s*\.task-detail-property-separator\s*\{/);
});

test("创建主任务预计投入标题和值同字号且整行底边对齐", () => {
  const css = read("task-creation-cards.css");
  const effort = declarations(css, ".creation-heading .task-effort-cost");
  assert.match(effort, /align-items:\s*baseline/);
  const type = declarations(css, ".creation-heading .task-effort-cost > .task-effort-field-label, .creation-heading .task-effort-cost-value");
  assert.match(type, /font-size:\s*var\(--ad-text-body-sm\)/);
  assert.match(type, /font-weight:\s*400/);
  assert.match(type, /line-height:\s*1\.5/);
  const label = declarations(css, ".creation-heading .task-effort-cost > .task-effort-field-label");
  assert.match(label, /padding-top:\s*0/);
  const summary = declarations(css, ".creation-heading .task-effort-cost-summary");
  assert.match(summary, /min-height:\s*0/);
  assert.match(summary, /align-items:\s*flex-end/);
  assert.match(declarations(css, ".creation-heading .task-effort-info"), /align-self:\s*flex-end/);
  const touch = css.slice(css.indexOf("@media (max-width: 720px), (pointer: coarse)"));
  assert.match(declarations(touch, ".creation-heading .task-effort-cost-summary"), /align-items:\s*center/);
  assert.match(declarations(touch, ".creation-heading .task-effort-info"), /align-self:\s*auto/);
});

test("前置依赖与标准正文对齐，预估独立留在属性区", () => {
  const css = read("task-creation-subtask.css");
  const planning = declarations(css, ".creation-subtask-planning");
  assert.match(planning, /display:\s*flex/);
  assert.match(planning, /align-items:\s*center/);
  const dependency = declarations(read("task-creation-cards.css"), ".creation-subtask-dependency-field");
  assert.match(dependency, /grid-template-columns:\s*68px minmax\(0, 1fr\)/);
  assert.match(dependency, /align-items:\s*start/);
  assert.doesNotMatch(css, /creation-subtask-planning-separator|creation-subtask-dependency-property/);
  const trigger = declarations(css, ".creation-subtask-dependencies .creation-dep-edit");
  assert.match(trigger, /min-height:\s*var\(--ad-control-height-sm\)/);
  assert.match(trigger, /padding:\s*0 var\(--ad-space-2\)/);
  assert.match(trigger, /background:\s*transparent/);
  assert.match(trigger, /color:\s*var\(--ad-ink-tertiary\)/);
  assert.match(trigger, /font-size:\s*var\(--ad-text-caption\)/);
  assert.match(trigger, /overflow-wrap:\s*anywhere/);
  assert.match(declarations(css, ".creation-subtask-dependencies .creation-dep-edit:focus-visible"), /outline:\s*2px solid var\(--ad-focus\)/);
});

test("窄屏隐藏可能独立换行的分隔线，依赖入口在窄屏和触屏仍有44px点击面积", () => {
  const cards = read("task-creation-cards.css");
  const compact = cards.slice(cards.indexOf("@media (max-width: 840px)"));
  assert.match(declarations(compact, `${properties} > .task-detail-property-separator`), /display:\s*none/);
  const subtask = read("task-creation-subtask.css");
  const narrow = cards.slice(cards.indexOf("@media (max-width: 760px)"));
  assert.match(declarations(narrow, ".creation-subtask-dependency-field, .creation-member-match-basis"), /grid-template-columns:\s*minmax\(0, 1fr\)/);
  const touchStart = subtask.indexOf("@media (max-width: 720px), (pointer: coarse)");
  assert.ok(touchStart >= 0, "窄视口和coarse指针均需触摸尺寸");
  const trigger = declarations(subtask.slice(touchStart), ".creation-subtask-dependencies .creation-dep-edit");
  assert.match(trigger, /min-height:\s*var\(--ad-control-touch-min\)/);
  assert.match(trigger, /min-width:\s*var\(--ad-control-touch-min\)/);
});

test("沿用共享卡片背景和纯色图标，底部移除动作不再作为整项提交工具栏", () => {
  const css = read("task-creation-subtask.css");
  assert.match(declarations(css, ".creation-task-row"), /background:\s*var\(--task-card-background, var\(--ad-surface\)\)/);
  assert.doesNotMatch(declarations(css, ".creation-subtask-card .task-detail-title-row > .task-icon"), /gradient/);
  const actions = declarations(css, ".creation-subtask-actions");
  assert.match(actions, /border-top:\s*0/);
  assert.match(actions, /margin-top:\s*0/);
  assert.match(declarations(css, ".creation-subtask-actions > button"), /min-height:\s*var\(--ad-control-height-sm\)/);
});
