import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const expected = ["agentdoor-responsibility-advisor", "agentdoor-task-planner", "agentdoor-task-status-analyzer", "agentdoor-task-diagnostician", "agentdoor-personal-priority", "agentdoor-ewd-progress"];

test("六类 Skill 均有可读取入口及无环的调用依赖，不冒充运行时注册", () => {
  const registryPath = resolve(root, "skills/registry.json");
  assert.ok(existsSync(registryPath), "缺少 Skill 设计清单");
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  assert.equal(registry.status, "offline_design");
  assert.deepEqual(registry.skills.map((s: { id: string }) => s.id).sort(), [...expected].sort());
  const byId = new Map<string, { id: string; dependsOn: string[] }>(registry.skills.map((s: { id: string }) => [s.id, s]));
  const visit = (id: string, path: string[]) => {
    assert.ok(!path.includes(id), `Skill 循环调用：${[...path, id]}`);
    const item = byId.get(id);
    assert.ok(item, `未定义依赖 ${id}`);
    item.dependsOn.forEach(next => visit(next, [...path, id]));
  };
  for (const skill of registry.skills) {
    visit(skill.id, []);
    const entry = resolve(root, skill.entry);
    assert.ok(entry.startsWith(resolve(root, "skills") + "/"));
    assert.ok(existsSync(entry), `缺少 ${entry}`);
    const content = readFileSync(entry, "utf8");
    assert.match(content, new RegExp(`^---\\nname: ${skill.id}\\n`));
    for (const match of content.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
      if (/^https?:/.test(match[1])) continue;
      assert.ok(existsSync(resolve(dirname(entry), match[1])), `断链 ${skill.id}: ${match[1]}`);
    }
  }
});

test("规则快照与 PRD 同源，沿用已有规划 v0.2 入口", () => {
  const registryPath = resolve(root, "skills/registry.json");
  assert.ok(existsSync(registryPath), "缺少 Skill 设计清单");
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  const md = readFileSync(resolve(root, registry.rulesSource), "utf8");
  for (const skill of registry.skills) {
    const snapshot = readFileSync(resolve(root, skill.rulesFile), "utf8");
    for (const heading of skill.ruleSections) {
      const start = md.indexOf(heading);
      assert.ok(start >= 0, `缺少规则章节 ${heading}`);
      const tail = md.slice(start + heading.length);
      const end = tail.search(/^#{2,3} /m);
      const section = md.slice(start, end < 0 ? undefined : start + heading.length + end).replace(/\n---\s*$/, "").trim();
      assert.ok(snapshot.includes(section), `规则快照不同步 ${skill.id}: ${heading}`);
    }
  }
  const planner = registry.skills.find((s: { id: string }) => s.id === "agentdoor-task-planner");
  assert.equal(planner.outputVersion, "agentdoor.task-plan.v0.2");
  assert.ok(existsSync(resolve(root, "skills/agentdoor-task-planner/references/planning-v0.2.schema.json")));
});
