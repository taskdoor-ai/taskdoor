import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTaskAiConnectionRequest } from '../src/features/tasks/lib/task-ai-connection';
import { buildDiscussionAiRequest } from '../src/features/tasks/discussion/lib/task-discussion-ai';
import type { TaskDetailContent } from '../src/shared/model/task-model';

const task: TaskDetailContent = {
  title: '当前任务', goal: '  当前目标\n保留原文  ', status: '进行中', owner: 'owner',
  participants: ['participant'], due: '2026-10-20', summary: '', files: [], commits: [],
  completionCriteria: ['标准一', ' ', '标准二'], activities: [],
};
test('任务上下文保留定位信息，排除可按需获取的详细内容', () => {
  const request = buildTaskAiConnectionRequest({ taskId: 'task-123', task, currentUser: 'user', due: '', tags: ['不要带入的标签'] });
  const text = JSON.stringify(request);
  assert.equal(request.taskId, 'task-123');
  assert.equal(request.workObject.title, task.title);
  assert.equal(request.workObject.content, undefined);
  assert.equal(request.context.find(item => item.label === '任务目标')?.value, task.goal);
  assert.equal(request.contextPreview!.items.find(item => item.label === '任务目标')?.value, task.goal);
  assert.doesNotMatch(text, /完成标准|标准一|标准二/);
  assert.doesNotMatch(text, /不要带入|participant|2026-10-20/);
  assert.ok(request.context.some(item => item.label === '状态' && item.value === '进行中'));
});
test('回复带自身及直接被回复消息，排除祖先、兄弟和缓存引用', () => {
  const activities = [
    { id: 'ancestor', author: 'A', type: 'member-post' as const, message: '不要带入的祖先记录', time: '今天' },
    { id: 'parent', author: 'B', type: 'member-reply' as const, replyToActivityId: 'ancestor', message: '  直接原消息\n保留换行  ', time: '今天', createdAt: '2026-10-10T01:00:00Z' },
    { id: 'reply', author: 'C', type: 'member-reply' as const, replyToActivityId: 'parent', message: '  长\n'.repeat(250), time: '今天', createdAt: '2026-10-10T02:00:00Z', quote: { messageId: 'parent', author: '旧作者', text: '不要带入的旧缓存' } },
    { id: 'sibling', author: 'D', type: 'member-reply' as const, replyToActivityId: 'parent', message: '不要带入的兄弟记录', time: '今天' },
  ];
  const request = buildDiscussionAiRequest({ taskId: 'task-123', task: { ...task, activities }, currentUser: 'user', target: { kind: 'reply', activityId: 'reply' } });
  assert.ok(request);
  assert.equal(request.taskId, 'task-123');
  assert.equal(request.context.find(item => item.label === '任务目标')?.value, task.goal);
  assert.equal(request.contextPreview!.items.find(item => item.label === '任务目标')?.value, task.goal);
  assert.doesNotMatch(JSON.stringify(request), /完成标准|标准一|标准二/);
  assert.equal(request.context.find(item => item.label === '讨论 ID')?.value, 'reply');
  assert.ok(!request.context.some(item => item.label === '回复 ID'));
  assert.equal(request.workObject.content, activities[2].message);
  assert.equal(request.context.find(item => item.label === '被回复原消息 ID')?.value, 'parent');
  assert.equal(request.context.find(item => item.label === '被回复原消息用户')?.value, 'B');
  assert.equal(request.context.find(item => item.label === '被回复原消息发布时间')?.value, '2026-10-10T01:00:00Z');
  assert.equal(request.context.find(item => item.label === '被回复原消息内容')?.value, activities[1].message);
  assert.equal(request.context.find(item => item.label === '发布时间')?.value, '2026-10-10T02:00:00Z');
  for (const field of request.context) assert.equal(request.contextPreview!.items.find(item => item.label === field.label)?.value, field.value);
  assert.equal(request.contextPreview!.items.find(item => item.label === '讨论内容')?.value, activities[2].message);
  assert.doesNotMatch(JSON.stringify(request), /不要带入/);
  assert.equal(buildDiscussionAiRequest({ taskId: 'task-123', task: { ...task, activities: activities.map(item => ({ ...item, deletedAt: '2026-10-10' })) }, currentUser: 'user', target: { kind: 'reply', activityId: 'reply' } }), null);
});

test('空目标和空标准不进入任务上下文或预览', () => {
  const request = buildTaskAiConnectionRequest({ taskId: 'empty', task: { ...task, goal: ' ', completionCriteria: [' '] }, currentUser: 'user' });
  for (const fields of [request.context, request.contextPreview!.items]) {
    assert.ok(!fields.some(item => ['任务目标', '完成标准'].includes(item.label)));
  }
});
