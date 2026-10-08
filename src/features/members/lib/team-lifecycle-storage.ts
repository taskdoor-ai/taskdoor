import { RECYCLE_BIN_KEY, readRecycleBin } from '@/features/tasks/lib/task-recycle-bin';
import { loadPersonalCenterDirectory, personalCenterStorageKey, type PersonalCenterState } from '@/ai/mock/data/memberProfiles';
import type { TaskNode, WorkspaceNode } from '@/shared/model/task-model';
import type { TeamLifecycleAction } from '@/features/members/components/TeamLifecycle';
import { activeMembership, changeTeamRole, prepareMemberExit, transferTeamOwnership } from '@/features/members/lib/team-membership-lifecycle';
import { appendTaskActivity, createTaskChangeActivity, type TaskActivityStore } from '@/features/tasks/lib/task-activity';
import { commitTaskAiStorage } from '@/features/tasks/lib/task-ai-adjustment-storage';
import { TASK_FILE_EDITS_STORAGE_PREFIX } from '@/features/tasks/files/lib/task-file-editing';
import { TASK_COLLABORATION_STORAGE_PREFIX } from '@/features/tasks/lib/task-collaboration';

export const teamLifecycleHistoryKey = 'agentdoor-team-lifecycle-history';
export type TeamLifecycleRecord = { id: string; teamId: string; kind: TeamLifecycleAction['kind']; actorId: string; memberId?: string; memberEmail?: string; successorId?: string; role?: "admin" | "member"; at: string; note?: string; assignments?: Array<{ taskId: string; memberId: string }> };
export const handoffNotificationKey = 'agentdoor-handoff-notifications';
export type HandoffNotification = { id: string; teamId: string; recipientId: string; taskIds: string[]; fromName: string; read: boolean; at: string };
export function readHandoffNotifications(storage: Pick<Storage, 'getItem'>): HandoffNotification[] {
  const value = JSON.parse(storage.getItem(handoffNotificationKey) ?? '[]');
  if (!Array.isArray(value)) throw new Error('无法读取交接通知，请重试。');
  return value;
}
export function readTeamLifecycleHistory(storage: Pick<Storage, 'getItem'>): TeamLifecycleRecord[] {
  const value = JSON.parse(storage.getItem(teamLifecycleHistoryKey) ?? '[]');
  if (!Array.isArray(value)) throw new Error('无法读取团队操作记录，请重试。');
  return value;
}
/** Existing recovery journal makes the local multi-key update recoverable; not a server transaction. */
export function commitTeamLifecycle(input: { storage: Storage; directory?: PersonalCenterState; teamId: string; actorId: string; actorName: string; nodes: WorkspaceNode[]; activities: TaskActivityStore; seeds: TaskNode[]; action: TeamLifecycleAction }) {
  const { storage, teamId, actorId, actorName, action } = input;
  const directory = input.directory ?? loadPersonalCenterDirectory();
  const team = directory.teams.find(t => t.id === teamId);
  if (!team) throw new Error('团队已不存在，请刷新。');
  let nextTeam = team, nodes = input.nodes, activities = input.activities, seeds = input.seeds;
  let deletedIds: string[] = [];
  const writes: Array<[string, string]> = [];
  const history = readTeamLifecycleHistory(storage);
  const record: TeamLifecycleRecord = { id: crypto.randomUUID(), teamId, actorId, kind: action.kind, at: new Date().toISOString() };
  let notifications = readHandoffNotifications(storage);
  if (action.kind === 'exit') {
    const next = prepareMemberExit({ team, nodes, actorId, memberId: action.memberId, replacements: action.replacements, expectedSignature: action.signature });
    nodes = next.nodes; nextTeam = next.team;
    record.memberId = action.memberId; record.memberEmail = team.memberships.find(m => m.memberId === action.memberId)?.email; record.note = action.note; record.assignments = next.tasks.map(t => ({ taskId: t.id, memberId: action.replacements[t.id] }));
    const memberName = (id: string) => team.memberships.find(m => m.memberId === id)?.name ?? id;
    for (const task of next.tasks) {
      const owner = task.ownerId === action.memberId;
      const activity = createTaskChangeActivity({ author: actorName, type: owner ? 'owner-change' : 'participants-change', message: `${memberName(action.memberId)}离开团队，任务${owner ? '负责人' : '参与职责'}交接给${memberName(action.replacements[task.id])}。${action.note ? `\n交接说明：${action.note}` : ''}`, changes: [{ label: owner ? '负责人' : '参与者', before: memberName(action.memberId), after: memberName(action.replacements[task.id]) }] });
      if (activity) activities = appendTaskActivity(activities, task.id, activity);
    }
    for (const recipientId of new Set(Object.values(action.replacements))) {
      const taskIds = next.tasks.filter(t => action.replacements[t.id] === recipientId).map(t => t.id);
      if (taskIds.length) notifications.push({ id: `${record.id}:${recipientId}`, teamId, recipientId, taskIds, fromName: memberName(action.memberId), read: false, at: record.at });
    }
    const byId = new Map(nodes.filter((n): n is TaskNode => n.kind === 'task').map(n => [n.id, n]));
    seeds = seeds.map(seed => byId.get(seed.id) ?? seed);
    const legacy = JSON.parse(storage.getItem('agentdoor-created-tasks') ?? '{}') as Record<string, Record<string, unknown>>;
    const changed = new Set(next.tasks.map(task => task.id));
    for (const [id, snapshot] of Object.entries(legacy)) {
      const task = byId.get(id);
      if (task && changed.has(id)) legacy[id] = { ...snapshot, ownerId: task.ownerId, owner: task.ownerId ? [task.ownerId] : [], participants: task.participantIds ?? [], proposedOwnerId: undefined };
    }
    writes.push(['agentdoor-created-tasks', JSON.stringify(legacy)]);
    const latest = JSON.parse(storage.getItem('agentdoor-created-task') ?? 'null');
    if (latest && changed.has(latest.id) && legacy[latest.id]) writes.push(['agentdoor-created-task', JSON.stringify(legacy[latest.id])]);
    // Remove pending assignment overlays for the departed member, keeping unrelated choices.
    for (const key of ['agentdoor-task-owner-proposals', 'agentdoor-task-participant-invitations']) {
      const value = JSON.parse(storage.getItem(key) ?? '{}') as Record<string, unknown>;
      for (const node of nodes) if (node.kind === 'task' && node.teamId === teamId) {
        if (key.endsWith('owner-proposals') && value[node.id] === action.memberId) delete value[node.id];
        else if (value[node.id] && typeof value[node.id] === 'object') { const entry = { ...value[node.id] as Record<string, unknown> }; delete entry[action.memberId]; value[node.id] = entry; }
      }
      writes.push([key, JSON.stringify(value)]);
    }
  } else if (action.kind === 'transfer') { nextTeam = transferTeamOwnership(team, actorId, action.successorId); record.successorId = action.successorId; }
  else if (action.kind === 'role') { nextTeam = changeTeamRole(team, actorId, action.memberId, action.role); record.memberId = action.memberId; record.role = action.role; }
  else {
    if (activeMembership(team, actorId)?.role !== 'owner' || action.name !== team.name) throw new Error('仅拥有者可以在确认团队名称后删除团队。');
    writes.push([RECYCLE_BIN_KEY, JSON.stringify(readRecycleBin(storage).filter(entry => entry.teamId !== teamId))]);
    deletedIds = nodes.filter(n => n.kind === 'task' && n.teamId === teamId).map(n => n.id);
    const ids = new Set(deletedIds);
    nodes = nodes.filter(n => n.teamId !== teamId); seeds = seeds.filter(n => n.teamId !== teamId && !ids.has(n.id));
    activities = Object.fromEntries(Object.entries(activities).filter(([id]) => !ids.has(id)));
    notifications = notifications.filter(n => n.teamId !== teamId);
    for (const key of ['agentdoor-task-owner-proposals', 'agentdoor-task-participant-invitations', 'agentdoor-created-tasks']) {
      const value = JSON.parse(storage.getItem(key) ?? '{}');
      writes.push([key, JSON.stringify(Object.fromEntries(Object.entries(value).filter(([id]) => !ids.has(id))))]);
    }
    const latest = JSON.parse(storage.getItem('agentdoor-created-task') ?? 'null');
    if (latest && ids.has(latest.id)) writes.push(['agentdoor-created-task', 'null']);
    for (const id of deletedIds) {
      writes.push([`${TASK_FILE_EDITS_STORAGE_PREFIX}${encodeURIComponent(id)}`, '{}']);
      writes.push([`${TASK_COLLABORATION_STORAGE_PREFIX}${encodeURIComponent(JSON.stringify([teamId, id]))}`, 'null']);
    }
  }
  const nextDirectory = { ...directory, teams: action.kind === 'delete' ? directory.teams.filter(t => t.id !== teamId) : directory.teams.map(t => t.id === teamId ? nextTeam : t) };
  writes.push([personalCenterStorageKey, JSON.stringify(nextDirectory)], [teamLifecycleHistoryKey, JSON.stringify([...history, record])], [handoffNotificationKey, JSON.stringify(notifications)]);
  if (action.kind === 'exit' || action.kind === 'delete') writes.push(['agentdoor-workspace-nodes', JSON.stringify(nodes)], ['agentdoor-task-activity', JSON.stringify(activities)], ['agentdoor-task-detail-seeds', JSON.stringify(seeds)]);
  commitTaskAiStorage(storage, writes);
  return { directory: nextDirectory, nodes, activities, seeds, deletedIds };
}
