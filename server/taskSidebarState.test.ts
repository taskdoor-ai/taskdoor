import assert from 'node:assert/strict';
import test from 'node:test';

test('任务列表拖过阈值收起，恢复时保留收起前宽度', async () => {
  const { resolveTaskSidebarResize } = await import('../src/features/tasks/lib/task-sidebar-state.ts');
  const previous = { collapsed: false, expandedWidth: 420 };
  assert.deepEqual(resolveTaskSidebarResize(previous, 179), { collapsed: true, expandedWidth: 420 });
  assert.deepEqual(resolveTaskSidebarResize(previous, 0), { collapsed: true, expandedWidth: 420 });
});

test('阈值外的窄宽度回到可读下限，过宽和非法输入不会污染偏好', async () => {
  const { resolveTaskSidebarResize } = await import('../src/features/tasks/lib/task-sidebar-state.ts');
  const previous = { collapsed: false, expandedWidth: 350 };
  assert.deepEqual(resolveTaskSidebarResize(previous, 181), { collapsed: false, expandedWidth: 260 });
  assert.deepEqual(resolveTaskSidebarResize(previous, 800), { collapsed: false, expandedWidth: 520 });
  assert.deepEqual(resolveTaskSidebarResize(previous, Number.NaN), previous);
});

test('到最小宽度后再额外左拖 80px 才收起，少拖一像素仍展开', async () => {
  const { resolveTaskSidebarResize } = await import('../src/features/tasks/lib/task-sidebar-state.ts');
  const previous = { collapsed: false, expandedWidth: 420 };
  assert.deepEqual(resolveTaskSidebarResize(previous, 180), { collapsed: true, expandedWidth: 420 });
  assert.deepEqual(resolveTaskSidebarResize(previous, 181), { collapsed: false, expandedWidth: 260 });
});

test('小幅越过最小宽度保持可读宽度，不提前滑出列表', async () => {
  const state = await import('../src/features/tasks/lib/task-sidebar-state.ts');
  assert.equal(state.getTaskSidebarPreviewWidth(300, 520), 300);
  assert.equal(state.getTaskSidebarPreviewWidth(260, 520), 260);
  assert.equal(state.getTaskSidebarPreviewWidth(220, 520), 260);
  assert.equal(state.getTaskSidebarPreviewWidth(180, 520), 260);
});

test('向右拖动的保存宽度与窗口允许的最大宽度一致', async () => {
  const { resolveTaskSidebarResize } = await import('../src/features/tasks/lib/task-sidebar-state.ts');
  const previous = { collapsed: false, expandedWidth: 350 };
  assert.deepEqual(resolveTaskSidebarResize(previous, 600, 460), { collapsed: false, expandedWidth: 460 });
});

test('窗口变窄时最大宽度同步收紧，宽窗口仍有固定上限', async () => {
  const state = await import('../src/features/tasks/lib/task-sidebar-state.ts');
  assert.equal(state.getTaskSidebarMaxWidth(1280), 520);
  assert.equal(state.getTaskSidebarMaxWidth(1024), 460);
  assert.equal(state.getTaskSidebarMaxWidth(0), 520);
});

test('读取旧宽度和收起偏好，缺失或损坏的存储使用展开默认值', async () => {
  const { readTaskSidebarPreference } = await import('../src/features/tasks/lib/task-sidebar-state.ts');
  assert.deepEqual(readTaskSidebarPreference('420', 'true'), { collapsed: true, expandedWidth: 420 });
  assert.deepEqual(readTaskSidebarPreference(null, null), { collapsed: false, expandedWidth: 350 });
  assert.deepEqual(readTaskSidebarPreference('12', 'broken'), { collapsed: false, expandedWidth: 350 });
});
