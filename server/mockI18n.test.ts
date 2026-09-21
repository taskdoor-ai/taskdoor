import assert from 'node:assert/strict';
import test from 'node:test';
import { allTeamWorkspaceNodes } from '../src/data/teamWorkspaceScenarios';
import { mockTaskCatalog, mockTaskField, mockRecordText, mockTeamName, mockPersonName, mockTagName } from '../src/i18n/mockContent';
import { buildTaskListProjection, buildTaskScopeCounts } from '../src/lib/taskListProjection';
import { createInitialTaskListFilters } from '../src/components/taskListFilters';

test('every built-in task has aligned English title and goal without changing the model', () => {
  const before = JSON.stringify(allTeamWorkspaceNodes);
  const tasks = allTeamWorkspaceNodes.filter(task => task.kind === 'task');
  assert.equal(tasks.length, Object.keys(mockTaskCatalog).length);
  for (const task of tasks) {
    const copy = mockTaskCatalog[task.id];
    assert.equal(copy.title.zh, task.name, task.id);
    assert.equal(copy.goal.zh, task.goal ?? '', task.id);
    assert.ok(copy.title.en.length > 0 && copy.goal.en.length > 0);
    assert.doesNotMatch(copy.title.en + copy.goal.en, /[\u3400-\u9fff]/u);
    assert.equal(mockTaskField('zh-CN', task.id, 'title', task.name), task.name);
    assert.equal(mockTaskField('en', task.id, 'title', task.name), copy.title.en);
  }
  assert.equal(JSON.stringify(allTeamWorkspaceNodes), before);
});
test('edits and new user tasks remain exactly as authored', () => {
  assert.equal(mockTaskField('en','fragrance-content','title','我的新名称'), '我的新名称');
  assert.equal(mockTaskField('en','user-task','title','终审短视频脚本与直播卖点'), '终审短视频脚本与直播卖点');
  assert.equal(mockTaskField('en','fragrance-content','goal',''), '');
  assert.equal(mockRecordText('en','user-task','收到，我会在本轮完成前核对并回传结论。'), '收到，我会在本轮完成前核对并回传结论。');
});
test('English search returns original task objects and preserves ownership counts', () => {
  const filters = createInitialTaskListFilters('周岚');
  const display = (task: typeof allTeamWorkspaceNodes[number]) => mockTaskField('en',task.id,'title',task.name);
  const projection = buildTaskListProjection(allTeamWorkspaceNodes, 'gift set', filters, [], '周岚', display);
  assert.ok(projection.visibleTasks.some(task => task.id === 'fragrance-creator-wrapup'));
  for (const task of projection.visibleTasks) assert.equal(task, allTeamWorkspaceNodes.find(node => node.id === task.id));
  const counts = buildTaskScopeCounts(allTeamWorkspaceNodes, 'gift set', filters, [], '周岚', display);
  assert.equal(counts.all, projection.visibleTasks.length);
  assert.ok(counts.owned > 0);
});
test('team, person and tag display aliases do not affect renamed or custom records', () => {
  assert.equal(mockTeamName('en','creator-commerce','达人带货运营团队'), 'Creator Commerce');
  assert.equal(mockTeamName('en','creator-commerce','我的团队'), '我的团队');
  assert.equal(mockPersonName('en','林洁','林洁'), 'Jie Lin');
  assert.equal(mockPersonName('en','林洁','新名字'), '新名字');
  assert.equal(mockTagName('en','custom','内容制作'), '内容制作');
});

test('all seeded completion criteria are translated only within their original task', async () => {
  const { default: baselines } = await import('../src/i18n/mock/taskCriteria.json');
  const { default: translations } = await import('../src/i18n/mock/criteria.json');
  const original = new Set<string>();
  for (const [id, values] of Object.entries(baselines)) {
    for (const value of values) {
      original.add(value);
      const english = mockRecordText('en', id, value);
      assert.ok(english.length > 0, id);
      assert.doesNotMatch(english, /[\u3400-\u9fff]/u, id);
      for (const number of value.match(/\d+(?:[.,]\d+)*/g) ?? []) assert.ok(english.includes(number), id);
      assert.equal(mockRecordText('zh-CN', id, value), value);
      assert.equal(mockRecordText('en', 'user-task', value), value);
      assert.equal(mockRecordText('en', id, `修改后的标准：${value}`), `修改后的标准：${value}`);
    }
  }
  assert.equal(original.size, Object.keys(translations).length);
});

test('core seeded discussion translations preserve record identity and edited text', async () => {
  const { default: records } = await import('../src/i18n/mock/coreRecords.json');
  for (const [id, rows] of Object.entries(records)) {
    for (const row of rows) {
      assert.equal(mockRecordText('en', id, row.text), row.en);
      assert.equal(mockRecordText('zh-CN', id, row.text), row.text);
      assert.equal(mockRecordText('en', id, `${row.text}已编辑`), `${row.text}已编辑`);
    }
  }
});

test('saved creation demo translations do not depend on estimates, dates or completion status', async () => {
  const { buildCreatedMockCatalog } = await import('../src/i18n/createdMockCatalog');
  const { default: copies } = await import('../src/i18n/mock/createdTasks.json');
  const nodes = copies.map((copy, index) => ({
    id: `saved-${index}`, kind: 'task' as const, name: copy.title.zh, goal: copy.goal.zh,
    teamId: 'creator-commerce', parentId: null, ownerId: '', status: '已完成' as const,
    parentTaskId: index === copies.length - 1 ? undefined : `saved-${copies.length - 1}`,
    updatedAt: '', plannedEndOn: '2027-01-01',
  }));
  const before = JSON.stringify(nodes);
  const catalog = buildCreatedMockCatalog(nodes);
  assert.equal(Object.keys(catalog).length, 8);
  for (const node of nodes) {
    assert.doesNotMatch(mockTaskField('en', node.id, 'title', node.name, catalog), /[\u3400-\u9fff]/u);
    assert.equal(mockTaskField('en', node.id, 'title', '用户修改的标题', catalog), '用户修改的标题');
  }
  assert.equal(JSON.stringify(nodes), before);
  assert.deepEqual(buildCreatedMockCatalog([nodes[0]]), {});
  assert.deepEqual(buildCreatedMockCatalog(nodes.map(node => ({ ...node, teamId: 'my-team' }))), {});
});

test('untitled editor placeholders translate without replacing custom titles', async () => {
  const { buildCreatedMockCatalog } = await import('../src/i18n/createdMockCatalog');
  const task = { id: 'empty-editor-task', kind: 'task' as const, name: '未命名任务', goal: '', parentId: null, ownerId: '', status: '待开始' as const, updatedAt: '', createdFrom: 'task-editor' as const };
  const catalog = buildCreatedMockCatalog([task]);
  assert.equal(mockTaskField('en', task.id, 'title', task.name, catalog), 'Untitled task');
  assert.equal(mockTaskField('en', task.id, 'title', '我的任务', catalog), '我的任务');
  assert.equal(mockTaskField('zh-CN', task.id, 'title', task.name, catalog), task.name);
});

test('filter labels localize status and date ranges without changing stored filters', async () => {
  const { filterDateLabel, filterStatusLabel } = await import('../src/i18n/filterDisplay');
  const filter = { preset: 'custom' as const, from: '2026-09-01', to: '2026-09-20' };
  assert.equal(filterDateLabel('en', filter), '2026-09-01 to 2026-09-20');
  assert.equal(filterDateLabel('zh-CN', filter), '2026-09-01 至 2026-09-20');
  assert.equal(filterStatusLabel('en', '已阻塞'), 'Blocked');
  assert.equal(filterStatusLabel('zh-CN', '已阻塞'), '已阻塞');
  assert.equal(filter.preset, 'custom');
});

test('saved single and nested planner examples localize independently of their current tree', async () => {
  const { buildCreatedMockCatalog } = await import('../src/i18n/createdMockCatalog');
  const { default: copies } = await import('../src/i18n/mock/savedCreationTasks.json');
  for (const [index, copy] of copies.entries()) {
    const node = { id: `planner-${index}`, kind: 'task' as const, name: copy.title.zh, goal: copy.goal.zh, parentId: null, ownerId: '', status: '待开始' as const, updatedAt: '', createdFrom: 'task-planner' as const };
    const before = JSON.stringify(node);
    const catalog = buildCreatedMockCatalog([node]);
    for (const field of ['title', 'goal'] as const) {
      assert.equal(mockTaskField('en', node.id, field, copy[field].zh, catalog), copy[field].en);
      assert.doesNotMatch(copy[field].en, /[\u3400-\u9fff]/u);
      assert.equal(mockTaskField('zh-CN', node.id, field, copy[field].zh, catalog), copy[field].zh);
      assert.equal(mockTaskField('en', node.id, field, '我修改的内容', catalog), '我修改的内容');
    }
    for (const [zh, en] of Object.entries(copy.records)) {
      assert.equal(mockRecordText('en', node.id, zh, catalog), en);
    }
    assert.deepEqual(buildCreatedMockCatalog([{ ...node, createdFrom: 'task-editor' }]), {});
    assert.deepEqual(buildCreatedMockCatalog([{ ...node, goal: '自定义目标' }]), {});
    assert.equal(JSON.stringify(node), before);
  }
});
