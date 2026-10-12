import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadSkill, labSkills } from './test-lab/skills.ts';
import { validateOutput } from './test-lab/validation.ts';
import { splitSkillDocuments } from '../src/test-lab/markdown-files.ts';

test('生产创建入口使用独立生产资料，分析入口保留共用规则与输出契约', () => {
  for (const skill of labSkills) {
    const files = splitSkillDocuments(loadSkill(skill.id).snapshot).map(file => file.path);
    assert.equal(new Set(files).size, files.length, `${skill.id} 重复加载资料`);
    if (skill.id !== 'agentdoor-task-planner') {
      assert.ok(files.includes('skills/shared/product-rules.md'), skill.id);
      assert.ok(files.includes('skills/shared/assistant-path-rules.md'), skill.id);
      assert.ok(files.includes(`skills/${skill.id}/references/output-contract.md`), skill.id);
    } else {
      assert.ok(files.includes('skills/agentdoor-task-planner/references/task-preview.schema.json'));
      assert.ok(!files.includes('skills/agentdoor-task-planner/references/planning-v0.2.md'));
    }
  }
});

test('创建不加载进度分析依赖，状态分析保留依赖，旧版本保持原文', () => {
  const planner = loadSkill('agentdoor-task-planner');
  const status = loadSkill('agentdoor-task-status-analyzer');
  assert.ok(!planner.snapshot.includes('--- FILE: skills/agentdoor-ewd-progress/references/output-contract.md ---'));
  assert.ok(status.snapshot.includes('--- FILE: skills/agentdoor-ewd-progress/references/output-contract.md ---'));
  assert.ok(status.snapshot.includes('--- FILE: skills/agentdoor-task-status-analyzer/references/problem-analysis.md ---'));
  const old = '# 已保存的旧规则\n仅使用本版本内容。';
  const restored = loadSkill('agentdoor-task-planner', old);
  assert.equal(restored.snapshot, old);
  assert.ok(restored.instructions.includes(old));
  assert.ok(!restored.instructions.includes('EWD-2026-09-08-v10'));
});

for (const skill of labSkills.filter(s => s.id !== 'agentdoor-task-planner')) {
  test(`${skill.title} 的文档 JSON 示例可通过工作台现有协议校验`, () => {
    const content = readFileSync(new URL(`../skills/${skill.id}/references/output-contract.md`, import.meta.url), 'utf8');
    const match = content.match(/```json\n([\s\S]*?)\n```/);
    assert.ok(match, '缺少可解析示例');
    const result = JSON.parse(match[1]);
    const input = {
      requestId: 'request-check', principalId: 'member-writer', teamId: 'team-content',
      inputVersions: { task: 4 },
      taskId: result.taskId,
      tasks: [
        { id: 'task-plan', version: 4, status: '进行中' },
        { id: 'task-incident', version: 2, status: '进行中', ownerId: null, participantIds: ['member-writer'] },
      ],
      sources: ['member-writer', 'delivery-one', 'delivery-two', 'task-plan', 'file-plan', 'file-budget', 'task-incident', 'delivery-needs', 'incident-update', 'waiting-record', 'file-check'].map(ref => ({ ref })),
    };
    const output = {
      schemaVersion: skill.outputVersion, skillId: skill.id, ruleVersion: 'contract-check',
      requestId: input.requestId, principalId: input.principalId, teamId: input.teamId,
      inputVersions: input.inputVersions, coverage: {}, evaluatedAt: '2026-09-03T02:00:00Z',
      status: 'partial', result, evidenceRefs: [], unknowns: [], warnings: [], writeReceipt: null,
    };
    assert.deepEqual(validateOutput(skill.id, output, input), []);
    if (skill.id === 'agentdoor-ewd-progress') {
      const progress = result.progress;
      assert.equal(progress.totalEwdMinutes / 480, 1.5);
      assert.equal(progress.completedEwdMinutes / 480, 1.15);
      assert.equal(progress.items.reduce((n: number, item: any) => n + item.ewdMinutes * item.progressPercent / 100, 0), 552);
      assert.equal(new Set(progress.items.map((item: any) => item.id)).size, 3);
    }
  });
}
