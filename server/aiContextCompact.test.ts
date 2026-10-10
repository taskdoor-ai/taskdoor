import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTaskAiConnectionRequest } from '../src/features/tasks/lib/task-ai-connection';
import { buildDiscussionAiRequest } from '../src/features/tasks/discussion/lib/task-discussion-ai';
import type { TaskDetailContent } from '../src/shared/model/task-model';

const task: TaskDetailContent = {
  title: '当前任务', goal: '当前目标', status: '进行中', owner: 'owner',
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
  assert.equal(request.context.find(item => item.label === '完成标准')?.value, '1. 标准一\n2. 标准二');
  assert.doesNotMatch(text, /不要带入|participant|2026-10-20/);
  assert.ok(request.context.some(item => item.label === '状态' && item.value === '进行中'));
});
test('回复仅带自身讨论 ID，保留完整当前内容', () => {
  const activities = [
    { id: 'root', author: 'A', type: 'member-post' as const, message: '不要带入的其他记录', time: '今天' },
    { id: 'reply', author: 'B', type: 'member-reply' as const, replyToActivityId: 'root', message: '长'.repeat(1000), time: '今天' },
  ];
  const request = buildDiscussionAiRequest({ taskId: 'task-123', task: { ...task, activities }, currentUser: 'user', target: { kind: 'reply', activityId: 'reply' } });
  assert.ok(request);
  assert.equal(request.taskId, 'task-123');
  assert.equal(request.context.find(item => item.label === '任务目标')?.value, task.goal);
  assert.equal(request.context.find(item => item.label === '完成标准')?.value, '1. 标准一\n2. 标准二');
  assert.equal(request.context.find(item => item.label === '讨论 ID')?.value, 'reply');
  assert.ok(!request.context.some(item => item.label === '回复 ID'));
  assert.equal(request.workObject.content?.length, 1000);
  assert.doesNotMatch(JSON.stringify(request), /不要带入/);
  assert.equal(buildDiscussionAiRequest({ taskId: 'task-123', task: { ...task, activities: activities.map(item => ({ ...item, deletedAt: '2026-10-10' })) }, currentUser: 'user', target: { kind: 'reply', activityId: 'reply' } }), null);
});

test('空目标和空标准不进入任务上下文或预览', () => {
  const request = buildTaskAiConnectionRequest({ taskId: 'empty', task: { ...task, goal: ' ', completionCriteria: [' '] }, currentUser: 'user' });
  for (const fields of [request.context, request.contextPreview!.items]) {
    assert.ok(!fields.some(item => ['任务目标', '完成标准'].includes(item.label)));
  }
});
