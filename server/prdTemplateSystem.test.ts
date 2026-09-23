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
    "## 4. 功能验收标准",
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

test("当前任务列表模块使用正式正文和功能验收标准", async () => {
  const module = await readProjectFile("docs/prd/modules/06-task-list.md");
  assert.deepEqual(h2Headings(module), [
    "## 1. 目的",
    "## 2. 范围和边界",
    "## 3. 详细功能设计",
    "## 4. 功能验收标准",
  ]);
  assert.match(module, /我负责／我参与/);
  assert.match(module, /置顶仅影响本人/);
  assert.match(module, /!\[[^\]]+\]\([^)]*filters-en\.png\)/);
  assert.match(module, /FIG-LIST-002/);
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
  assert.match(html, /<figure[^>]+id="fig-list-002"/);
  assert.match(html, /id="prd-search"/);
  assert.match(html, /href="#task-creation"/);
  assert.match(html, /href="\.\/references\/account-validation\.html"/);
  const accountReference = readFileSync(new URL("../public/prd/references/account-validation.html", import.meta.url), "utf8");
  assert.match(accountReference, /10 分钟/);

  assert.match(html, /@media\s+print/);
  assert.match(html, /@media\s+\(max-width:\s*760px\)/);
  assert.match(html, /data:image\/svg\+xml;base64,/);
  assert.equal(index.modules[0].moduleId, "product-preview");
  const taskList = index.modules.find((module: { moduleId: string }) => module.moduleId === "task-list");
  assert.ok(taskList);
  assert.ok(
    taskList.sections.some(
      (section: { id: string }) => section.id === "task-list-detail",
    ),
  );
});
