import { appendTaskActivity, createTaskChangeActivity } from '@/features/tasks/lib/task-activity';
import type { TeamResponsibilityProfile } from '@/ai/mock/data/memberProfiles';
import type { TaskNode } from '@/shared/model/task-model';
import { TASK_FILE_EDITS_STORAGE_PREFIX } from '@/features/tasks/files/lib/task-file-editing';
import { deleteWorkspaceTask, getTaskDeletionPreview, type SubtaskWorkspaceState } from '@/features/tasks/lib/workspace-subtask-editing';

export const RECYCLE_BIN_KEY = 'agentdoor-task-recycle-bin';
export const RETENTION_MS = 30 * 86400000;
export type RecycledTask = {
  id: string; teamId: string; deletedBy: string; deletedByName: string; deletedAt: number; expiresAt: number;
  tasks: TaskNode[]; snapshot: Omit<SubtaskWorkspaceState, 'nodes'>; fileEdits: Record<string, string>;
};
type StorageReader = Pick<Storage, 'getItem'>;
export function readRecycleBin(storage: StorageReader): RecycledTask[] {
  const raw = storage.getItem(RECYCLE_BIN_KEY);
  if (!raw) return [];
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(item => !item || typeof item.id !== 'string' || typeof item.teamId !== 'string'
    || !Number.isFinite(item.expiresAt) || !Number.isFinite(item.deletedAt) || typeof item.deletedBy !== 'string' || typeof item.deletedByName !== 'string'
    || !Array.isArray(item.tasks) || !item.tasks.length || item.tasks.some((t: Partial<TaskNode>) => !t || t.kind !== 'task' || typeof t.id !== 'string' || typeof t.name !== 'string' || typeof t.ownerId !== 'string')
    || !item.snapshot || !Array.isArray(item.snapshot.detailSeeds) || !item.snapshot.activities || !item.snapshot.ownerProposals
    || !item.snapshot.participantInvitations || !item.snapshot.periodOverrides || !item.snapshot.legacySnapshots || !item.fileEdits
    || Object.entries(item.fileEdits).some(([key, value]) => !key.startsWith(TASK_FILE_EDITS_STORAGE_PREFIX) || typeof value !== 'string'))) {
    throw new Error('回收站记录无法读取，请保留当前数据并重试。');
  }
  return value;
}
export function canManageRecycledTask(entry: RecycledTask, team: TeamResponsibilityProfile | undefined, actorId: string) {
  const member = team?.memberships.find(m => m.status === 'active' && m.memberId === actorId);
  return Boolean(member && team?.id === entry.teamId && (member.role === 'owner' || entry.deletedBy === actorId));
}
const pick = <T,>(record: Record<string, T>, ids: Set<string>) => Object.fromEntries(Object.entries(record).filter(([id]) => ids.has(id)));
export function recycleTask(state: SubtaskWorkspaceState, taskId: string, signature: string, team: TeamResponsibilityProfile, actorId: string, actorName: string, storage: StorageReader, now = Date.now()) {
  const preview = getTaskDeletionPreview(state.nodes, taskId);
  if (!team.memberships.some(m => m.status === 'active' && m.memberId === actorId) || preview.task.ownerId !== actorId
    || preview.deletedTasks.some(t => t.teamId && t.teamId !== team.id)) throw new Error('只有当前任务负责人可以删除该团队的任务。');
  const next = deleteWorkspaceTask(state, taskId, signature, actorName);
  const ids = new Set(next.deletedTaskIds);
  const entry: RecycledTask = {
    id: `${taskId}:${now}`, teamId: team.id, deletedBy: actorId, deletedByName: actorName, deletedAt: now, expiresAt: now + RETENTION_MS,
    tasks: preview.deletedTasks,
    snapshot: { activities: pick(state.activities, ids), detailSeeds: state.detailSeeds.filter(t => ids.has(t.id)),
      ownerProposals: pick(state.ownerProposals, ids), participantInvitations: pick(state.participantInvitations, ids),
      periodOverrides: pick(state.periodOverrides, ids), legacySnapshots: pick(state.legacySnapshots, ids),
      latestLegacySnapshot: state.latestLegacySnapshot && ids.has(state.latestLegacySnapshot.id) ? state.latestLegacySnapshot : null },
    fileEdits: Object.fromEntries([...ids].map(id => { const key = `${TASK_FILE_EDITS_STORAGE_PREFIX}${encodeURIComponent(id)}`; return [key, storage.getItem(key) ?? '{}']; })),
  };
  return { next, entries: [...readRecycleBin(storage).filter(e => e.expiresAt > now), entry] };
}

/** Revalidate the entire selection before making any changes. Expired records can never be restored. */
export function changeRecycledTasks(state: SubtaskWorkspaceState, entries: RecycledTask[], ids: string[], action: 'restore' | 'purge', team: TeamResponsibilityProfile, actorId: string, replacementOwner = '', now = Date.now()) {
  const selected = entries.filter(e => ids.includes(e.id));
  if (!ids.length || selected.length !== new Set(ids).size) throw new Error('所选记录已变化，请刷新回收站后重试。');
  if (selected.some(e => !canManageRecycledTask(e, team, actorId))) throw new Error('你已无权处理所选任务，请刷新后重试。');
  if (selected.some(e => e.expiresAt <= now)) throw new Error('所选任务已过保留期，请刷新回收站。');
  let next = { ...state };
  const fileWrites: Array<[string, string]> = [];
  if (action === 'restore') {
    const active = new Set(team.memberships.filter(m => m.status === 'active').map(m => m.memberId));
    const restored = selected.flatMap(e => e.tasks);
    const liveIds = new Set(state.nodes.map(n => n.id));
    if (restored.some(t => liveIds.has(t.id)) || new Set(restored.map(t => t.id)).size !== restored.length) throw new Error('任务标识发生冲突，未恢复任何任务。');
    if (restored.some(t => t.ownerId && !active.has(t.ownerId)) && !active.has(replacementOwner)) throw new Error('原负责人已离开，请先选择新的负责人。');
    const available = new Set([...state.nodes.filter(n => n.kind === 'task' && (!n.teamId || n.teamId === team.id)).map(n => n.id), ...restored.map(t => t.id)]);
    const clean = (t: TaskNode): TaskNode => ({ ...t, teamId: team.id,
      parentTaskId: t.parentTaskId && available.has(t.parentTaskId) ? t.parentTaskId : undefined,
      ownerId: t.ownerId && !active.has(t.ownerId) ? replacementOwner : t.ownerId,
      participantIds: t.participantIds?.filter(id => active.has(id)),
      proposedOwnerId: t.proposedOwnerId && active.has(t.proposedOwnerId) ? t.proposedOwnerId : undefined,
      dependsOnTaskIds: t.dependsOnTaskIds?.filter(id => available.has(id)),
    });
    next.nodes = [...state.nodes, ...restored.map(clean)];
    const byId = new Map(next.nodes.filter((n): n is TaskNode => n.kind === 'task').map(t => [t.id, t]));
    for (const task of restored) {
      let current = byId.get(task.id); const seen = new Set<string>();
      while (current) {
        if (seen.has(current.id) || seen.size >= 4) throw new Error('恢复后任务层级超过四层或存在循环，请先调整原父任务。');
        seen.add(current.id); current = current.parentTaskId ? byId.get(current.parentTaskId) : undefined;
      }
    }
    const cleanLegacy = (s: SubtaskWorkspaceState['legacySnapshots'][string]) => {
      const t = byId.get(s.id);
      return t ? { ...s, ownerId: t.ownerId, owner: t.ownerId ? [t.ownerId] : [], participants: t.participantIds ?? [], proposedOwnerId: undefined, parentTaskId: t.parentTaskId,
        childTaskIds: next.nodes.filter(n => n.kind === 'task' && n.parentTaskId === s.id).map(n => n.id) } : s;
    };
    for (const entry of selected) {
      const s = entry.snapshot;
      next = { ...next, activities: { ...next.activities, ...s.activities }, detailSeeds: [...next.detailSeeds, ...s.detailSeeds.map(clean)],
        ownerProposals: { ...next.ownerProposals, ...Object.fromEntries(restored.filter(t => entry.tasks.some(e => e.id === t.id)).map(t => [t.id, clean(t).ownerId])) },
        participantInvitations: { ...next.participantInvitations, ...Object.fromEntries(Object.entries(s.participantInvitations).map(([id, people]) => [id, Object.fromEntries(Object.entries(people).filter(([person]) => active.has(person)))])) },
        periodOverrides: { ...next.periodOverrides, ...s.periodOverrides }, legacySnapshots: { ...next.legacySnapshots, ...Object.fromEntries(Object.entries(s.legacySnapshots).map(([id, task]) => [id, cleanLegacy(task)])) },
      };
      const activity = createTaskChangeActivity({ author: actorId, type: 'task-definition-change', message: '从回收站恢复任务', changes: [{ label: '任务', before: null, after: entry.tasks[0].name }] });
      if (activity) next.activities = appendTaskActivity(next.activities, entry.tasks[0].id, activity);
      fileWrites.push(...Object.entries(entry.fileEdits));
    }
    next.legacySnapshots = Object.fromEntries(Object.entries(next.legacySnapshots).map(([id, task]) => [id, cleanLegacy(task)]));
    if (next.latestLegacySnapshot) next.latestLegacySnapshot = cleanLegacy(next.latestLegacySnapshot);
  }
  return { next, entries: entries.filter(e => !ids.includes(e.id) && e.expiresAt > now), fileWrites };
}
