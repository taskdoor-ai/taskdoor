import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
