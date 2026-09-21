# TaskDoor PRD Template System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立模块化 Markdown PRD 模板、需求变更日志和可自动生成的连续 HTML 阅读页，并用任务列表示例证明模板可用。

**Architecture:** `docs/prd/` 是唯一源目录，`index.md` 决定模块顺序，每个模块只固定四个一级部分。Node 构建脚本读取模块元数据、校验标题和资源、内联本地图片，生成 `public/prd/index.html` 与轻量 `module-index.json`；旧 PRD 保留不覆盖。

**Tech Stack:** Markdown、SVG、Node.js ESM、Marked、Node `node:test`、HTML/CSS/原生 JavaScript。

---

### Task 1: 固定模板与治理合同

**Files:**
- Create: `server/prdTemplateSystem.test.ts`
- Create: `docs/prd/README.md`
- Create: `docs/prd/index.md`
- Create: `docs/prd/CHANGELOG.md`
- Create: `docs/prd/templates/module-template.md`

- [ ] **Step 1: 写模板合同失败测试**

在 `server/prdTemplateSystem.test.ts` 中读取四个源文件，断言模板只有以下四个二级标题：

```ts
const headings = [...template.matchAll(/^## (.+)$/gm)].map(match => match[1]);
assert.deepEqual(headings, ["1. 目的", "2. 范围和边界", "3. 详细功能设计", "4. 验收标准"]);
assert.match(template, /module_id:/);
assert.match(template, /last_change:/);
assert.match(readme, /Markdown.*唯一事实源/);
assert.match(changelog, /变更编号.*影响模块.*变更内容/s);
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --import tsx --test server/prdTemplateSystem.test.ts`

Expected: FAIL，提示 `docs/prd/` 文件不存在。

- [ ] **Step 3: 建立治理文件与精简模板**

`module-template.md` 使用以下完整骨架：

```md
---
module_id: "{{MODULE_ID}}"
title: "{{MODULE_TITLE}}"
version: "0.1"
status: "draft"
last_change: "{{CHANGE_ID}}"
summary: "{{ONE_SENTENCE_SUMMARY}}"
---

# {{MODULE_TITLE}}

## 1. 目的

说明本模块解决的问题和希望用户达成的结果。

## 2. 范围和边界

说明本次覆盖、不覆盖以及与其他模块的边界。

## 3. 详细功能设计

按页面和页面内模块连续说明展示内容、可用操作、操作步骤、结果，以及确有必要的规则。

## 4. 验收标准

- 使用可观察、可验证的结果描述验收项。
```

`README.md` 明确单一事实源、四段模板、图文连续、变更边界和构建命令；`index.md` 使用 Markdown 链接维护模块顺序；`CHANGELOG.md` 提供字段表和首条模板体系变更。

- [ ] **Step 4: 运行测试并确认通过**

Run: `node --import tsx --test server/prdTemplateSystem.test.ts`

Expected: 模板合同测试 PASS。

- [ ] **Step 5: 提交模板治理文件**

```bash
git add server/prdTemplateSystem.test.ts docs/prd/README.md docs/prd/index.md docs/prd/CHANGELOG.md docs/prd/templates/module-template.md
git commit -m "docs: add modular PRD template"
```

### Task 2: 用任务列表模块验证模板

**Files:**
- Create: `docs/prd/modules/01-task-list.md`
- Create: `docs/prd/assets/task-list/task-list-pinned.svg`
- Modify: `docs/prd/index.md`
- Modify: `docs/prd/CHANGELOG.md`
- Modify: `server/prdTemplateSystem.test.ts`

- [ ] **Step 1: 写任务列表示例失败测试**

增加以下断言：

```ts
assert.match(taskList, /## 3\. 详细功能设计/);
assert.match(taskList, /### 3\.1 页面结构/);
assert.match(taskList, /### 3\.2 搜索与筛选区/);
assert.match(taskList, /### 3\.3 任务列表区/);
assert.match(taskList, /### 3\.4 置顶区/);
for (const text of ["展示内容", "可用操作", "操作步骤与结果", "分页或加载", "键盘"]) assert.ok(taskList.includes(text));
assert.match(taskList, /!\[[^\]]+\]\([^)]*task-list-pinned\.svg\)/);
assert.match(taskList, /FIG-LIST-001/);
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --import tsx --test server/prdTemplateSystem.test.ts`

Expected: FAIL，提示任务列表模块或 SVG 不存在。

- [ ] **Step 3: 写任务列表目标模块**

模块使用四个一级部分；详细设计按页面结构、搜索与筛选区、任务列表区、置顶区连续展开。任务列表区使用下列表头：

```md
| 展示内容 | 可用操作 | 操作步骤与结果 | 必要说明 |
| --- | --- | --- | --- |
```

内容覆盖搜索、筛选、排序、打开、置顶、取消置顶和更多操作，并说明：先应用查询条件，再拆分置顶与普通任务；同一任务不重复；首版采用连续加载；失败时在列表末尾保留重试；触屏和键盘入口可用。

- [ ] **Step 4: 创建可读 SVG 目标界面图**

SVG 使用 `viewBox="0 0 960 600"`，展示任务列表标题、搜索框、筛选按钮、“置顶”标题、一条已置顶任务、普通任务及右侧图钉。添加 `<title>` 和 `<desc>`，确保图片脱离正文仍可理解。

- [ ] **Step 5: 运行测试并确认通过**

Run: `node --import tsx --test server/prdTemplateSystem.test.ts`

Expected: 模板与示例测试 PASS。

- [ ] **Step 6: 提交示例模块**

```bash
git add docs/prd/modules/01-task-list.md docs/prd/assets/task-list/task-list-pinned.svg docs/prd/index.md docs/prd/CHANGELOG.md server/prdTemplateSystem.test.ts
git commit -m "docs: add task list PRD example"
```

### Task 3: 自动生成完整 HTML 与 AI 索引

**Files:**
- Create: `scripts/build-agentdoor-prd.mjs`
- Create: `public/prd/index.html`
- Create: `public/prd/module-index.json`
- Modify: `package.json`
- Modify: `server/prdTemplateSystem.test.ts`

- [ ] **Step 1: 写构建产物失败测试**

测试先运行构建命令，再校验产物：

```ts
execFileSync(process.execPath, [fileURLToPath(new URL("../scripts/build-agentdoor-prd.mjs", import.meta.url))]);
const html = readFileSync(new URL("../public/prd/index.html", import.meta.url), "utf8");
const index = JSON.parse(readFileSync(new URL("../public/prd/module-index.json", import.meta.url), "utf8"));
assert.match(html, /<article[^>]+data-module-id="task-list"/);
assert.match(html, /<figure[^>]+id="fig-list-001"/);
assert.match(html, /id="prd-search"/);
assert.match(html, /@media\s+print/);
assert.match(html, /@media\s+\(max-width:\s*760px\)/);
assert.deepEqual(index.modules[0].moduleId, "task-list");
assert.ok(index.modules[0].sections.some((section: { id: string }) => section.id === "task-list-detail"));
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --import tsx --test server/prdTemplateSystem.test.ts`

Expected: FAIL，提示构建脚本或产物不存在。

- [ ] **Step 3: 实现 Markdown 读取与校验**

`scripts/build-agentdoor-prd.mjs` 导出并使用以下接口：

```js
export function parseFrontmatter(source, filePath) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${filePath}: missing frontmatter`);
  const metadata = Object.fromEntries(match[1].split("\n").filter(Boolean).map(line => {
    const splitAt = line.indexOf(":");
    return [line.slice(0, splitAt).trim(), line.slice(splitAt + 1).trim().replace(/^"|"$/g, "")];
  }));
  return { metadata, body: source.slice(match[0].length) };
}

export function validateModule(module) {
  for (const key of ["module_id", "title", "version", "status", "last_change", "summary"]) {
    if (!module.metadata[key]) throw new Error(`${module.filePath}: missing ${key}`);
  }
  const headings = [...module.body.matchAll(/^## (.+)$/gm)].map(match => match[1]);
  const expected = ["1. 目的", "2. 范围和边界", "3. 详细功能设计", "4. 验收标准"];
  if (JSON.stringify(headings) !== JSON.stringify(expected)) throw new Error(`${module.filePath}: invalid module headings`);
}
```

脚本从 `docs/prd/index.md` 的模块链接读取顺序，检查模块 ID 唯一，使用 Marked 转换正文，并把本地 SVG 图片转成内联 `data:image/svg+xml;base64,...`。

- [ ] **Step 4: 实现连续 HTML 外壳**

生成页必须包含：

- 左侧模块目录、搜索输入和变更日志入口。
- 一个模块对应一个语义化 `article`。
- Markdown 图片包装为带稳定 ID 的 `figure` 和 `figcaption`。
- 搜索通过 `data-search-text` 匹配模块正文并更新结果数。
- 当前目录使用 `IntersectionObserver` 高亮。
- 窄屏目录按钮、打印按钮、复制当前模块链接。
- `beforeprint` 清除搜索隐藏状态，`afterprint` 恢复。
- CSS 保持连续正文、长表格自身横向滚动，避免卡片墙。

- [ ] **Step 5: 生成轻量模块索引**

`module-index.json` 使用以下结构：

```json
{
  "version": "1.0",
  "generatedAt": "2026-09-18T00:00:00.000Z",
  "modules": [
    {
      "moduleId": "task-list",
      "title": "任务列表",
      "summary": "帮助成员快速找到、判断并进入需要处理的任务。",
      "source": "docs/prd/modules/01-task-list.md",
      "url": "./index.html#task-list",
      "sections": [{ "id": "task-list-detail", "title": "3. 详细功能设计" }]
    }
  ]
}
```

`generatedAt` 由构建时间产生；测试只检查格式和必要字段，不固定具体时间。

- [ ] **Step 6: 增加构建命令并运行验证**

在 `package.json` scripts 中增加：

```json
"build:prd": "node scripts/build-agentdoor-prd.mjs"
```

Run:

```bash
npm run build:prd
node --import tsx --test server/prdTemplateSystem.test.ts
```

Expected: 构建成功，所有 PRD 模板测试 PASS。

- [ ] **Step 7: 浏览器最小验证**

打开 `http://127.0.0.1:5173/prd/`，验证目录、搜索、任务列表模块、图示、操作步骤表、变更日志、窄屏目录和打印样式可用。只做本功能相关浏览器检查。

- [ ] **Step 8: 提交构建系统**

```bash
git add scripts/build-agentdoor-prd.mjs public/prd/index.html public/prd/module-index.json package.json server/prdTemplateSystem.test.ts
git commit -m "feat: generate modular PRD site"
```

### Task 4: 最终范围与质量检查

**Files:**
- Verify: `docs/prd/`
- Verify: `public/prd/`
- Verify: `server/prdTemplateSystem.test.ts`

- [ ] **Step 1: 检查设计覆盖**

逐项对照 `docs/superpowers/specs/2026-09-18-prd-template-system-design.md`，确认四段模板、连续图文、模块索引、变更机制、窄屏与打印均有实现；确认未覆盖旧 `public/agentdoor-prd.html`，未创建远程仓库，未迁移其他模块。

- [ ] **Step 2: 运行最小必要验证**

Run:

```bash
npm run build:prd
node --import tsx --test server/prdTemplateSystem.test.ts
git diff --check -- docs/prd scripts/build-agentdoor-prd.mjs public/prd server/prdTemplateSystem.test.ts package.json
```

Expected: 构建成功、测试 0 失败、差异检查无输出。

- [ ] **Step 3: 检查提交边界**

Run: `git status --short`

Expected: 本次提交只包含计划列出的 PRD 模板系统文件；用户已有的其他工作区改动保持原状。
