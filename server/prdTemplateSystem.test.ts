import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = new URL("../", import.meta.url);

async function readProjectFile(path: string) {
  return readFile(new URL(path, projectRoot), "utf8");
}

function h2Headings(markdown: string) {
  return markdown.match(/^## .+$/gm) ?? [];
}

test("PRD 模块模板仅固定四个一级内容区块", async () => {
  const template = await readProjectFile("docs/prd/templates/module-template.md");

  assert.deepEqual(h2Headings(template), [
    "## 1. 目的",
    "## 2. 范围和边界",
    "## 3. 详细功能设计",
    "## 4. 验收标准",
  ]);
});

test("PRD 治理说明覆盖内容组织、图片和变更机制", async () => {
  const readme = await readProjectFile("docs/prd/README.md");
  const changelog = await readProjectFile("docs/prd/CHANGELOG.md");

  assert.match(readme, /Markdown.*唯一内容源/s);
  assert.match(readme, /连续说明/);
  assert.match(readme, /图号/);
  assert.match(readme, /语义需求变更/);
  assert.match(changelog, /变更 ID/);
  assert.match(changelog, /影响模块/);
  assert.match(changelog, /原因与影响/);
});

test("PRD 索引提供模块顺序和入口", async () => {
  const index = await readProjectFile("docs/prd/index.md");

  assert.match(index, /模块顺序/);
  assert.match(index, /templates\/module-template\.md/);
});

test("任务列表示例遵循模板并连续描述关键交互", async () => {
  const module = await readProjectFile("docs/prd/modules/01-task-list.md");

  assert.deepEqual(h2Headings(module), [
    "## 1. 目的",
    "## 2. 范围和边界",
    "## 3. 详细功能设计",
    "## 4. 验收标准",
  ]);
  assert.match(module, /^### 3\.1 页面结构$/m);
  assert.match(module, /^### 3\.2 搜索与筛选区$/m);
  assert.match(module, /^### 3\.3 任务列表区$/m);
  assert.match(module, /^### 3\.4 置顶区$/m);
  assert.match(module, /展示内容/);
  assert.match(module, /可用操作/);
  assert.match(module, /操作步骤与结果/);
  assert.match(module, /分页或加载/);
  assert.match(module, /键盘/);
  assert.match(module, /!\[[^\]]+\]\([^)]*task-list-pinned\.svg\)/);
  assert.match(module, /FIG-LIST-001/);
});

test("构建脚本生成连续 HTML 和 AI 模块索引", () => {
  const scriptPath = fileURLToPath(
    new URL("../scripts/build-agentdoor-prd.mjs", import.meta.url),
  );
  execFileSync(process.execPath, [scriptPath], { stdio: "pipe" });

  const html = readFileSync(
    new URL("../public/prd/index.html", import.meta.url),
    "utf8",
  );
  const index = JSON.parse(
    readFileSync(
      new URL("../public/prd/module-index.json", import.meta.url),
      "utf8",
    ),
  );

  assert.match(html, /<article[^>]+data-module-id="task-list"/);
  assert.match(html, /<figure[^>]+id="fig-list-001"/);
  assert.match(html, /id="prd-search"/);
  assert.match(html, /@media\s+print/);
  assert.match(html, /@media\s+\(max-width:\s*760px\)/);
  assert.match(html, /data:image\/svg\+xml;base64,/);
  assert.equal(index.modules[0].moduleId, "task-list");
  assert.ok(
    index.modules[0].sections.some(
      (section: { id: string }) => section.id === "task-list-detail",
    ),
  );
});
