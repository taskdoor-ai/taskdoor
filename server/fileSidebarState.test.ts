import assert from 'node:assert/strict';
import test from 'node:test';

test('文件列表到最小宽度后额外左拖80px才收起，并保留展开宽度', async () => {
  const state = await import('../src/features/tasks/files/lib/file-sidebar-state.ts');
  const previous = { collapsed: false, expandedWidth: 300 };
  assert.deepEqual(state.resolveFileSidebarResize(previous, 101), { collapsed: false, expandedWidth: 180 });
  assert.deepEqual(state.resolveFileSidebarResize(previous, 100), { collapsed: true, expandedWidth: 300 });
  assert.deepEqual(state.resolveFileSidebarResize(previous, -30), { collapsed: true, expandedWidth: 300 });
  assert.equal(state.getFileSidebarPreviewWidth(100), 180);
});

test('文件列表调宽给正文保留空间，提交宽度与实际边界一致', async () => {
  const state = await import('../src/features/tasks/files/lib/file-sidebar-state.ts');
  assert.equal(state.getFileSidebarMaxWidth(1000), 420);
  assert.equal(state.getFileSidebarMaxWidth(760), 420);
  assert.equal(state.getFileSidebarMaxWidth(600), 280);
  assert.equal(state.getFileSidebarMaxWidth(0), 420);
  assert.deepEqual(state.resolveFileSidebarResize({ collapsed: false, expandedWidth: 200 }, 600, 280), { collapsed: false, expandedWidth: 280 });
});

test('文件列表恢复设备偏好，非法宽度不污染会话', async () => {
  const state = await import('../src/features/tasks/files/lib/file-sidebar-state.ts');
  assert.deepEqual(state.readFileSidebarPreference('300', 'true'), { collapsed: true, expandedWidth: 300 });
  assert.deepEqual(state.readFileSidebarPreference(null, null), { collapsed: false, expandedWidth: 200 });
  assert.deepEqual(state.readFileSidebarPreference('12', 'broken'), { collapsed: false, expandedWidth: 200 });
  const previous = { collapsed: false, expandedWidth: 300 };
  assert.deepEqual(state.resolveFileSidebarResize(previous, Number.NaN), previous);
});
