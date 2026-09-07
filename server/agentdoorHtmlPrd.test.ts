import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readPrd = () => readFileSync(new URL("../public/agentdoor-prd.html", import.meta.url), "utf8");

test("HTML PRD 保留六个产品模块和 Skill、MCP，移除研发底线", () => {
  const html = readPrd();
  const sectionIds = ["flow", "team", "create", "task-list", "my-work", "task-detail", "skill-design", "mcp-design"];

  assert.match(html, /<title>AgentDoor 产品 PRD<\/title>/);
  for (const id of sectionIds) {
    assert.match(html, new RegExp(`<section[^>]+id="${id}"`));
    assert.match(html, new RegExp(`href="#${id}"`));
  }
  assert.doesNotMatch(html, />\s*(Contacts|Background|Objective|Market Segments|Value Propositions)\s*</i);
  assert.doesNotMatch(html, /研发底线|href="#guardrails"|id="guardrails"/);
  assert.equal([...html.matchAll(/<section\b/g)].length, 8);
  assert.match(html, /<h3[^>]*>7\.3 创建任务 Skill<\/h3>/);
  assert.match(html, /<h3>8\.10 当前仅有的两个演示工具<\/h3>/);
});

test("Skill 概览使用核心设计列，说明五项能力的判断机制", () => {
  const html = readPrd();
  const overview = html.match(/<div class="table-wrap skill-overview-table">([\s\S]*?)<\/table>/)?.[1] ?? "";
  assert.match(overview, /<th>核心设计<\/th>/);
  assert.match(overview, /agentdoor-task-effort-assessor/);
  assert.doesNotMatch(html, /核心输出/);
  for (const mechanism of ["先识别再查重", "按结果拆分", "按责任匹配人", "由代码计算进度", "冲突保留双方证据", "按可核对信号排序", "保持顺序稳定"]) {
    assert.ok(overview.includes(mechanism), `Missing design mechanism: ${mechanism}`);
  }
});

test("五个 Skill 写清判断、输入输出及现有实现差距", () => {
  const html = readPrd();
  for (const id of ["skill-create", "skill-status", "skill-diagnosis", "skill-priority", "skill-effort"]) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, new RegExp(`href="#${id}"`));
  }
  for (const text of ["完整性门槛", "execution_blocker", "decision_conflict", "progressRatio", "priorityReason", "inputDigest", "未接入完整生产链路"]) {
    assert.ok(html.includes(text), `Missing ${text}`);
  }
  assert.doesNotMatch(html, /\*\*/);
});

test("工时与进度评估 Skill 定义估算、分布及候选完成度而不冒充验收", () => {
  const html = readPrd();
  for (const text of ["agentdoor-task-effort-assessor", "estimateRangeMinutes", "suggestedCompletionRatio", "acceptedCompletionRatio", "历史样本", "人类净投入", "估算版本", "仅供参考"]) {
    assert.ok(html.includes(text), `Missing effort design: ${text}`);
  }
  assert.doesNotMatch(html, /四个 Skill|四项能力|子任务投入与进度 · 预计共/);
});

test("MCP 合并原契约全部 38 个工具并标注具体参数和演示差异", () => {
  const html = readPrd();
  const original = readFileSync(new URL("../docs/product-v2/13-task-rest-api-and-mcp.md", import.meta.url), "utf8");
  const inventory = original.split("## 9. MCP Tool 清单与 REST 映射")[1].split("## 10.")[0];
  const names = new Set([...inventory.matchAll(/`(agentdoor_[a-z_]+)`/g)].map(match => match[1]));
  assert.equal(names.size, 38);
  for (const name of names) assert.ok(html.includes(`<code>${name}</code>`), `Missing ${name}`);
  for (const text of ["idempotency_key", "expected_version", "impact_digest", "UploadTarget", "CommitDraftUpdate", "TaskCreateFields", "两个演示工具", "输入却不同"]) {
    assert.ok(html.includes(text), `Missing ${text}`);
  }
});

test("打印展开全部章节和规则，避免搜索和折叠丢失内容", () => {
  const html = readPrd();
  assert.ok(html.includes('window.addEventListener("beforeprint"'));
  assert.ok(html.includes('window.addEventListener("afterprint"'));
  assert.ok(html.includes('section.hidden = false'));
  assert.ok(html.includes('detail.open = true'));
});

test("HTML PRD 保留研发需要的流程、Skill 和规则", () => {
  const html = readPrd();

  assert.match(html, /agentdoor-responsibility-advisor/);
  assert.match(html, /agentdoor-task-planner/);
  const responsibilityFlow = html.match(/aria-label="任务责任状态">([\s\S]*?)<\/div>\s*<p/)?.[1] ?? "";
  assert.ok(/推荐[\s\S]*邀请[\s\S]*待接受[\s\S]*正式责任/.test(responsibilityFlow));
  assert.match(html, /EWD/);
  assert.match(html, /讨论\s*｜\s*诊断\s*｜\s*子任务\s*｜\s*文件\s*｜\s*活动/);
  assert.match(html, /当前范围内已验收叶子 Task/);
  assert.match(html, /完成进度[^<]{0,80}展开[^<]{0,80}子任务工作量/s);
  assert.match(html, /燃起图[^<]{0,80}时间趋势[^<]{0,80}不与子任务分布合并/s);
  assert.ok(responsibilityFlow.includes("正式责任<small>最多一位</small>"));
});

test("创建任务模块覆盖五类 Mock 场景与跨成员重复任务", () => {
  const html = readPrd();

  for (const scenario of ["单任务", "复杂任务", "需求不明确", "相似任务", "已有任务下创建子任务"]) {
    assert.match(html, new RegExp(scenario));
  }
  assert.match(html, /成员交叉重复/);
  assert.match(html, /同一团队成员[^<]{0,50}沟通不及时[^<]{0,50}相同任务/);
  assert.match(html, /目标[^<]{0,20}交付物[^<]{0,20}业务对象[^<]{0,20}时间范围/);
  assert.match(html, /查看已有任务[^<]{0,60}仍然创建/s);
  assert.match(html, /任务详情[^<]{0,30}子任务[^<]{0,60}父任务[^<]{0,30}预设/s);
  assert.match(html, /同级子任务/);
});

test("任务列表记录悬浮删除入口和删除影响确认", () => {
  const html = readPrd();
  assert.match(html, /任务行[^<]{0,40}悬浮[^<]{0,30}三点[^<]{0,40}删除任务/s);
  assert.match(html, /下级任务[^<]{0,60}前置依赖[^<]{0,60}永久删除/s);
  assert.match(html, /保存成功[^<]{0,50}任务列表移除/s);
});

test("HTML PRD 提供阅读、搜索和移动端导航交互", () => {
  const html = readPrd();

  assert.match(html, /id="prd-search"/);
  assert.match(html, /id="search-status"[^>]*aria-live="polite"/);
  assert.match(html, /id="menu-toggle"[^>]*aria-expanded=/);
  assert.match(html, /id="expand-all"/);
  assert.match(html, /id="print-prd"/);
  assert.match(html, /<details[^>]+class="rule-group"/);
  assert.match(html, /IntersectionObserver/);
  assert.match(html, /window\.print\(\)/);
  assert.match(html, /@media\s*\(max-width:\s*760px\)/);
  assert.match(html, /@media\s*print/);
});

test("窄屏把页面宽度限制在视口内，只允许流程轨道和表格自身滚动", () => {
  const html = readPrd();

  assert.match(html, /@media\s*\(max-width:\s*760px\)[\s\S]*?html,\s*body\s*\{[^}]*overflow-x:\s*hidden/);
  assert.match(html, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.content\s*\{[^}]*max-width:\s*100%/);
  assert.match(html, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.flow-rail\s*\{[^}]*max-width:\s*100%/);
});
