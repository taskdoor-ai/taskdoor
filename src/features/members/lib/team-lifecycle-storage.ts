import { RECYCLE_BIN_KEY, RETENTION_MS, readRecycleBin, type RecycledTask } from '@/features/tasks/lib/task-recycle-bin';
import { loadPersonalCenterDirectory, personalCenterStorageKey, type PersonalCenterState, type TeamResponsibilityProfile } from '@/ai/mock/data/memberProfiles';
import type { TaskNode, WorkspaceNode } from '@/shared/model/task-model';
import type { TeamLifecycleAction } from '@/features/members/components/TeamLifecycle';
import { activeMembership, changeTeamRole, prepareMemberExit, transferTeamOwnership } from '@/features/members/lib/team-membership-lifecycle';
import { appendTaskActivity, createTaskChangeActivity, type TaskActivityStore } from '@/features/tasks/lib/task-activity';
import { compressStorageGzip, decompressStorageGzip, decompressStorageText } from '@/features/tasks/lib/task-storage-compression';
import { commitTaskAiStorage } from '@/features/tasks/lib/task-ai-adjustment-storage';
import { TASK_FILE_EDITS_STORAGE_PREFIX } from '@/features/tasks/files/lib/task-file-editing';
import { TASK_COLLABORATION_STORAGE_PREFIX } from '@/features/tasks/lib/task-collaboration';

export const teamLifecycleHistoryKey = 'agentdoor-team-lifecycle-history';
export type TeamLifecycleRecord = { id: string; teamId: string; kind: TeamLifecycleAction['kind'] | 'restore'; actorId: string; memberId?: string; memberEmail?: string; successorId?: string; role?: "admin" | "member"; at: string; note?: string; assignments?: Array<{ taskId: string; memberId: string }> };
export const handoffNotificationKey = 'agentdoor-handoff-notifications';
export type HandoffNotification = { id: string; teamId: string; recipientId: string; taskIds: string[]; fromName: string; read: boolean; at: string };
export function readHandoffNotifications(storage: Pick<Storage, 'getItem'>): HandoffNotification[] {
  const value = JSON.parse(storage.getItem(handoffNotificationKey) ?? '[]');
  if (!Array.isArray(value)) throw new Error('无法读取交接通知，请重试。');
  return value;
}
export const deletedTeamsKey = 'agentdoor-deleted-teams';
const overlayKeys = ['agentdoor-task-owner-proposals', 'agentdoor-task-participant-invitations', 'agentdoor-created-tasks'] as const;
/** A deleted team keeps everything removed from the workspace so the owner can restore it within the retention window. */
export type DeletedTeam = {
  team: TeamResponsibilityProfile; deletedBy: string; deletedAt: number; expiresAt: number;
  nodes: WorkspaceNode[]; seeds: TaskNode[]; activities: TaskActivityStore; notifications: HandoffNotification[]; recycleBin: RecycledTask[];
  overlays: Record<string, Record<string, unknown>>; storedValues: Record<string, string>;
};
/** Entries past their retention window are treated as permanently deleted. */
export function readDeletedTeams(storage: Pick<Storage, 'getItem'>, now = Date.now()): DeletedTeam[] {
  let value = JSON.parse(storage.getItem(deletedTeamsKey) ?? '[]');
  if (typeof value?.payload === 'string' && (value.encoding === 'lzw-utf8' || value.encoding === 'gzip-base64')) value = JSON.parse(value.encoding === 'gzip-base64' ? decompressStorageGzip(value.payload) : decompressStorageText(value.payload));
  if (!Array.isArray(value) || value.some(entry => !entry?.team || typeof entry.team.id !== 'string' || !Array.isArray(entry.team.memberships) || !Number.isFinite(entry.expiresAt) || !Number.isFinite(entry.deletedAt) || !Array.isArray(entry.nodes) || !Array.isArray(entry.seeds))) throw new Error('无法读取已删除团队，请重试。');
  return (value as DeletedTeam[]).filter(entry => entry.expiresAt > now);
}
/** Retention snapshots can be large; compress them before duplicating them in the recovery journal. */
function serializeDeletedTeams(entries: DeletedTeam[]): string {
  const raw = JSON.stringify(entries);
  if (raw.length < 16384) return raw;
  const compressed = JSON.stringify({ encoding: 'gzip-base64', payload: compressStorageGzip(raw) });
  return compressed.length < raw.length ? compressed : raw;
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
    const recycleBin = readRecycleBin(storage);
    deletedIds = nodes.filter(n => n.kind === 'task' && n.teamId === teamId).map(n => n.id);
    const ids = new Set(deletedIds);
    const now = Date.parse(record.at);
    const entry: DeletedTeam = {
      team, deletedBy: actorId, deletedAt: now, expiresAt: now + RETENTION_MS,
      nodes: nodes.filter(n => n.teamId === teamId), seeds: seeds.filter(n => n.teamId === teamId || ids.has(n.id)),
      activities: Object.fromEntries(Object.entries(activities).filter(([id]) => ids.has(id))),
      notifications: notifications.filter(n => n.teamId === teamId), recycleBin: recycleBin.filter(e => e.teamId === teamId), overlays: {}, storedValues: {},
    };
    writes.push([RECYCLE_BIN_KEY, JSON.stringify(recycleBin.filter(e => e.teamId !== teamId))]);
    nodes = nodes.filter(n => n.teamId !== teamId); seeds = seeds.filter(n => n.teamId !== teamId && !ids.has(n.id));
    activities = Object.fromEntries(Object.entries(activities).filter(([id]) => !ids.has(id)));
    notifications = notifications.filter(n => n.teamId !== teamId);
    for (const key of overlayKeys) {
      const value = JSON.parse(storage.getItem(key) ?? '{}');
      entry.overlays[key] = Object.fromEntries(Object.entries(value).filter(([id]) => ids.has(id)));
      writes.push([key, JSON.stringify(Object.fromEntries(Object.entries(value).filter(([id]) => !ids.has(id))))]);
    }
    const latest = JSON.parse(storage.getItem('agentdoor-created-task') ?? 'null');
    if (latest && ids.has(latest.id)) writes.push(['agentdoor-created-task', 'null']);
    for (const id of deletedIds) {
      for (const [key, empty] of [[`${TASK_FILE_EDITS_STORAGE_PREFIX}${encodeURIComponent(id)}`, '{}'], [`${TASK_COLLABORATION_STORAGE_PREFIX}${encodeURIComponent(JSON.stringify([teamId, id]))}`, 'null']]) {
        const stored = storage.getItem(key);
        if (stored !== null) entry.storedValues[key] = stored;
        writes.push([key, empty]);
      }
    }
    writes.push([deletedTeamsKey, serializeDeletedTeams([...readDeletedTeams(storage, now).filter(e => e.team.id !== teamId), entry])]);
  }
  const nextDirectory = { ...directory, teams: action.kind === 'delete' ? directory.teams.filter(t => t.id !== teamId) : directory.teams.map(t => t.id === teamId ? nextTeam : t) };
  writes.push([personalCenterStorageKey, JSON.stringify(nextDirectory)], [teamLifecycleHistoryKey, JSON.stringify([...history, record])], [handoffNotificationKey, JSON.stringify(notifications)]);
  if (action.kind === 'exit' || action.kind === 'delete') writes.push(['agentdoor-workspace-nodes', JSON.stringify(nodes)], ['agentdoor-task-activity', JSON.stringify(activities)], ['agentdoor-task-detail-seeds', JSON.stringify(seeds)]);
  commitTaskAiStorage(storage, writes);
  return { directory: nextDirectory, nodes, activities, seeds, deletedIds };
}

/** Restores a deleted team with its tasks and records; only its owner can do this within the retention window. */
export function restoreDeletedTeam(input: { storage: Storage; directory?: PersonalCenterState; teamId: string; actorId: string; nodes: WorkspaceNode[]; activities: TaskActivityStore; seeds: TaskNode[]; now?: number }) {
  const { storage, teamId, actorId, now = Date.now() } = input;
  const directory = input.directory ?? loadPersonalCenterDirectory();
  const deleted = readDeletedTeams(storage, now);
  const entry = deleted.find(e => e.team.id === teamId);
  if (!entry) throw new Error('团队已超过 30 天保留期或已被恢复，请刷新。');
  if (activeMembership(entry.team, actorId)?.role !== 'owner') throw new Error('仅团队拥有者可以恢复团队。');
  if (directory.teams.some(t => t.id === teamId)) throw new Error('团队已恢复，请刷新。');
  const nodes = [...input.nodes, ...entry.nodes];
  const seeds = [...input.seeds, ...entry.seeds];
  const activities = { ...input.activities, ...entry.activities };
  const record: TeamLifecycleRecord = { id: crypto.randomUUID(), teamId, actorId, kind: 'restore', at: new Date(now).toISOString() };
  const nextDirectory = { ...directory, teams: [...directory.teams, entry.team] };
  const writes: Array<[string, string]> = [
    [personalCenterStorageKey, JSON.stringify(nextDirectory)],
    [teamLifecycleHistoryKey, JSON.stringify([...readTeamLifecycleHistory(storage), record])],
    [handoffNotificationKey, JSON.stringify([...readHandoffNotifications(storage), ...entry.notifications])],
    [RECYCLE_BIN_KEY, JSON.stringify([...readRecycleBin(storage), ...entry.recycleBin])],
    [deletedTeamsKey, serializeDeletedTeams(deleted.filter(e => e !== entry))],
    ['agentdoor-workspace-nodes', JSON.stringify(nodes)], ['agentdoor-task-activity', JSON.stringify(activities)], ['agentdoor-task-detail-seeds', JSON.stringify(seeds)],
    ...overlayKeys.map((key): [string, string] => [key, JSON.stringify({ ...JSON.parse(storage.getItem(key) ?? '{}'), ...entry.overlays[key] })]),
    ...Object.entries(entry.storedValues),
  ];
  commitTaskAiStorage(storage, writes);
  return { directory: nextDirectory, nodes, activities, seeds };
}
