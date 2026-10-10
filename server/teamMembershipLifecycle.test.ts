import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPersonalCenterState } from '../src/ai/mock/data/memberProfiles';
import type { TaskNode } from '../src/shared/model/task-model';
import { canEditTeamInformation, normalizeTeamOwnership, canRemoveTeamMember, getHandoffTasks, handoffSignature, prepareMemberExit, transferTeamOwnership, changeTeamRole } from '../src/features/members/lib/team-membership-lifecycle';
const base = () => normalizeTeamOwnership(structuredClone(initialPersonalCenterState.teams[0]));
const task = (id: string, extra: Partial<TaskNode> = {}): TaskNode => ({ id, kind: 'task', teamId: base().id, name: id, parentId: null, ownerId: '陈默', participantIds: ['周岚'], status: '进行中', updatedAt: '', ...extra });
const input = () => { const team = base(); const nodes = [task('parent'), task('child', { parentTaskId: 'parent', ownerId: '周岚', participantIds: ['陈默'] }), task('done', { status: '已完成' }), task('other', { teamId: 'other' })]; return { team, nodes, actorId: '周岚', memberId: '陈默', replacements: { parent: '周岚', child: '周岚' }, expectedSignature: handoffSignature(team, nodes, '陈默') }; };
test('legacy migration chooses one owner and preserves original creator on transfer', () => { const team = base(); assert.equal(team.memberships.filter(m => m.role === 'owner').length, 1); const next = transferTeamOwnership(team, '周岚', '陈默'); assert.equal(next.memberships.find(m => m.memberId === '周岚')?.role, 'admin'); assert.equal(next.createdBy, '周岚'); assert.equal(normalizeTeamOwnership(next).memberships.find(m => m.memberId === '陈默')?.role, 'owner'); });
test('admin cannot remove another admin or owner, member cannot remove colleagues', () => { let team = base(); team = changeTeamRole(team, '周岚', '陈默', 'admin'); assert.equal(canRemoveTeamMember(team, '陈默', '周岚'), false); assert.equal(canRemoveTeamMember(team, '陈默', '林洁'), true); assert.equal(canRemoveTeamMember(team, '林洁', '陈默'), false); assert.throws(() => changeTeamRole(team, '陈默', '林洁', 'admin')); });
test('handoff transfers each task independently, deduplicates roles and preserves terminal and other-team tasks', () => { const source = input(); const result = prepareMemberExit(source); assert.deepEqual(getHandoffTasks(source.team.id, source.nodes, '陈默').map(t => t.id), ['parent', 'child']); assert.equal((result.nodes[0] as TaskNode).ownerId, '周岚'); assert.deepEqual((result.nodes[0] as TaskNode).participantIds, []); assert.deepEqual((result.nodes[1] as TaskNode).participantIds, []); assert.deepEqual(result.nodes[2], source.nodes[2]); assert.deepEqual(result.nodes[3], source.nodes[3]); assert.equal(result.team.memberships.some(m => m.memberId === '陈默'), false); assert.equal(source.team.memberships.some(m => m.memberId === '陈默'), true); });
test('missing or ineligible successor and stale task scope reject entire exit', () => { const source = input(); assert.throws(() => prepareMemberExit({ ...source, replacements: { parent: '周岚' } })); assert.throws(() => prepareMemberExit({ ...source, replacements: { parent: '陈默', child: '周岚' } })); assert.throws(() => prepareMemberExit({ ...source, nodes: [...source.nodes, task('new')] })); assert.throws(() => prepareMemberExit({ ...source, memberId: '周岚' })); });
test('self exit allowed after ownership transfer; terminal history is unchanged', () => { const source = input(); source.team = transferTeamOwnership(source.team, '周岚', '陈默'); const replacements = { parent: '陈默', child: '陈默' }; const result = prepareMemberExit({ ...source, memberId: '周岚', replacements, expectedSignature: handoffSignature(source.team, source.nodes, '周岚') }); assert.equal(result.team.memberships.some(m => m.memberId === '周岚'), false); assert.equal((result.nodes[1] as TaskNode).ownerId, '陈默'); });

test('recoverable save rolls back membership and assignments when one write fails', async () => {
  const { commitTeamLifecycle } = await import('../src/features/members/lib/team-lifecycle-storage');
  const { personalCenterStorageKey } = await import('../src/ai/mock/data/memberProfiles');
  const source = input(); const directory = { ...structuredClone(initialPersonalCenterState), teams: [source.team] };
  const values = new Map<string, string>([[personalCenterStorageKey, JSON.stringify(directory)], ['agentdoor-workspace-nodes', JSON.stringify(source.nodes)]]);
  const before = new Map(values); let fail = true;
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { if (k === 'agentdoor-workspace-nodes' && fail) { fail = false; throw new Error('quota'); } values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } } as Storage;
  const args = { storage, directory, teamId: source.team.id, actorId: '周岚', actorName: '周岚', nodes: source.nodes, activities: {}, seeds: source.nodes, action: { kind: 'exit' as const, memberId: '陈默', replacements: source.replacements, signature: source.expectedSignature, note: '资料在任务文件中' } };
  assert.throws(() => commitTeamLifecycle(args)); assert.deepEqual(values, before);
  const saved = commitTeamLifecycle(args); assert.equal(saved.directory.teams[0].memberships.some(m => m.memberId === '陈默'), false);
  assert.match(saved.activities.parent[0].message, /资料在任务文件中/);
  assert.equal(JSON.parse(values.get('agentdoor-handoff-notifications')!).length, 1);
});
test('only owner can delete last team; unrelated team and records survive', async () => {
  const { commitTeamLifecycle } = await import('../src/features/members/lib/team-lifecycle-storage');
  const source = input(); const values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } } as Storage;
  const args = { storage, directory: { ...structuredClone(initialPersonalCenterState), teams: [source.team] }, teamId: source.team.id, actorId: '陈默', actorName: '陈默', nodes: source.nodes, activities: {}, seeds: source.nodes, action: { kind: 'delete' as const, name: source.team.name } };
  assert.throws(() => commitTeamLifecycle(args));
  const result = commitTeamLifecycle({ ...args, actorId: '周岚' });
  assert.equal(result.directory.teams.length, 0); assert.deepEqual(result.nodes, [source.nodes[3]]);
});

test('deleted team is kept 30 days; only its owner can restore tasks and records, expired teams are gone', async () => {
  const { commitTeamLifecycle, readDeletedTeams, restoreDeletedTeam, readTeamLifecycleHistory } = await import('../src/features/members/lib/team-lifecycle-storage');
  const source = input(); const values = new Map<string, string>([['agentdoor-task-owner-proposals', JSON.stringify({ parent: '周岚', other: '周岚' })]]);
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } } as Storage;
  const activities = { parent: [{ id: 'a1' }] } as never;
  const deleted = commitTeamLifecycle({ storage, directory: { ...structuredClone(initialPersonalCenterState), teams: [source.team] }, teamId: source.team.id, actorId: '周岚', actorName: '周岚', nodes: source.nodes, activities, seeds: source.nodes, action: { kind: 'delete', name: source.team.name } });
  assert.deepEqual(JSON.parse(values.get('agentdoor-task-owner-proposals')!), { other: '周岚' });
  const [entry] = readDeletedTeams(storage);
  assert.equal(entry.team.id, source.team.id); assert.equal(entry.expiresAt - entry.deletedAt, 30 * 86400000);
  const args = { storage, directory: deleted.directory, teamId: source.team.id, nodes: deleted.nodes, activities: deleted.activities, seeds: deleted.seeds };
  assert.throws(() => restoreDeletedTeam({ ...args, actorId: '陈默' }), /仅团队拥有者/);
  assert.throws(() => restoreDeletedTeam({ ...args, actorId: '周岚', now: entry.expiresAt }), /30 天/);
  const restored = restoreDeletedTeam({ ...args, actorId: '周岚', now: entry.expiresAt - 1 });
  assert.deepEqual(restored.directory.teams.map(t => t.id), [source.team.id]);
  assert.deepEqual(new Set(restored.nodes.map(n => n.id)), new Set(source.nodes.map(n => n.id)));
  assert.deepEqual(restored.activities, activities);
  assert.deepEqual(JSON.parse(values.get('agentdoor-task-owner-proposals')!), { other: '周岚', parent: '周岚' });
  assert.deepEqual(readDeletedTeams(storage), []);
  assert.equal(readTeamLifecycleHistory(storage).at(-1)?.kind, 'restore');
  assert.throws(() => restoreDeletedTeam({ ...args, directory: restored.directory, actorId: '周岚' }));
});

test('removed people are not reintroduced from demo directory; admin cannot invite admin', async () => {
  const { getTeamPeople, createTeamEmailInvitation } = await import('../src/features/members/lib/team-invitations');
  const team = base();
  const removed = { ...team, memberships: team.memberships.filter(m => m.memberId !== '陈默') };
  assert.equal(getTeamPeople(removed, [{ id: '陈默', name: '陈默', email: 'chenmo@agentdoor.local', role: '成员' }]).some(m => m.id === '陈默'), false);
  const directory = { ...structuredClone(initialPersonalCenterState), teams: [changeTeamRole(team, '周岚', '陈默', 'admin')] };
  directory.profile.email = 'chenmo@agentdoor.local';
  assert.throws(() => createTeamEmailInvitation(directory, { teamId: team.id, email: 'new@example.com', role: 'admin' }));
  directory.profile.email = team.memberships.find(m => m.role === 'owner')!.email;
  assert.equal(createTeamEmailInvitation(directory, { teamId: team.id, email: 'new@example.com', role: 'admin' }).membership.role, 'admin');
});
test('stale login preview cannot recreate deleted team or removed membership', async () => {
  const { reconcileOnboardingMemberships } = await import('../src/features/auth/lib/onboarding-workspace');
  const { createOnboardingPreview } = await import('../src/features/auth/lib/onboarding-preview');
  const team = base(); const state = { ...createOnboardingPreview(), verified: true, step: 'workspace' as const, email: 'chenmo@agentdoor.local', teams: [{ id: team.id, name: team.name, role: 'member' as const }], activeTeamId: team.id };
  const directory = { ...structuredClone(initialPersonalCenterState), teams: [{ ...team, memberships: team.memberships.filter(m => m.memberId !== '陈默') }] };
  assert.deepEqual(reconcileOnboardingMemberships(state, directory, [{ id: 'exit', kind: 'exit', teamId: team.id, actorId: '周岚', memberId: '陈默', memberEmail: state.email, at: '' }]).teams, []);
  assert.deepEqual(reconcileOnboardingMemberships(state, { ...directory, teams: [] }, [{ id: 'delete', kind: 'delete', teamId: team.id, actorId: '周岚', at: '' }]).teams, []);
});

test('team information is editable by active owners and admins, including after transfer', () => {
  const team = changeTeamRole(base(), '周岚', '陈默', 'admin');
  assert.equal(canEditTeamInformation(team, '周岚'), true);
  assert.equal(canEditTeamInformation(team, '陈默'), true);
  for (const id of ['林洁', 'outsider']) assert.equal(canEditTeamInformation(team, id), false);
  const transferred = transferTeamOwnership(team, '周岚', '陈默');
  assert.equal(canEditTeamInformation(transferred, '周岚'), true);
  assert.equal(canEditTeamInformation(transferred, '陈默'), true);
  const inactive = { ...team, memberships: team.memberships.map(m => m.memberId === '周岚' ? { ...m, status: 'invited' as const } : m) };
  assert.equal(canEditTeamInformation(inactive, '周岚'), false);
});

test('large team retention snapshots fit a bounded store and restore without data loss', async () => {
  const { commitTeamLifecycle, readDeletedTeams, restoreDeletedTeam } = await import('../src/features/members/lib/team-lifecycle-storage');
  const source = input();
  source.nodes[0].goal = '团队任务的完整讨论及结果依据。'.repeat(12000);
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      // Models a store that cannot accept the uncompressed duplicate snapshot.
      if (key === 'agentdoor-deleted-teams' && value.length > 60000) throw new DOMException('Full', 'QuotaExceededError');
      values.set(key, value);
    },
    removeItem: (key: string) => { values.delete(key); },
  } as Storage;
  const result = commitTeamLifecycle({ storage, directory: { ...structuredClone(initialPersonalCenterState), teams: [source.team] }, teamId: source.team.id, actorId: '周岚', actorName: '周岚', nodes: source.nodes, seeds: source.nodes, activities: {}, action: { kind: 'delete', name: source.team.name } });
  assert.equal(JSON.parse(values.get('agentdoor-deleted-teams')!).encoding, 'gzip-base64');
  assert.equal(readDeletedTeams(storage)[0].nodes[0].goal, source.nodes[0].goal);
  const restored = restoreDeletedTeam({ storage, directory: result.directory, teamId: source.team.id, actorId: '周岚', nodes: result.nodes, seeds: result.seeds, activities: result.activities });
  assert.equal(restored.nodes.find(node => node.id === source.nodes[0].id)?.goal, source.nodes[0].goal);
});
