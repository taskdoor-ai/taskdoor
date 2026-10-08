import type { TeamMembership, TeamResponsibilityProfile } from '../data/memberProfiles';
import type { TaskNode, WorkspaceNode } from '@/shared/model/task-model';

/** Upgrade legacy roles without changing a transferred owner or the original creator. */
export function normalizeTeamOwnership(team: TeamResponsibilityProfile): TeamResponsibilityProfile {
  const owner = team.memberships.find(m => m.status === 'active' && m.role === 'owner')
    ?? team.memberships.find(m => m.status === 'active' && m.memberId === team.createdBy)
    ?? team.memberships.find(m => m.status === 'active' && m.role === 'admin');
  if (!owner) return team;
  return { ...team, createdBy: team.createdBy ?? owner.memberId, memberships: team.memberships.map(m => m.id === owner.id ? { ...m, role: 'owner' } : m.role === 'owner' ? { ...m, role: 'admin' } : m) };
}
export const activeMembership = (team: TeamResponsibilityProfile, memberId: string) => team.memberships.find(m => m.memberId === memberId && m.status === 'active');
export function canEditTeamInformation(team: TeamResponsibilityProfile, actorId: string) {
  return activeMembership(team, actorId)?.role === 'owner';
}
export function canRemoveTeamMember(team: TeamResponsibilityProfile, actorId: string, memberId: string) {
  const actor = activeMembership(team, actorId), member = activeMembership(team, memberId);
  return Boolean(actor && member && member.role !== 'owner' && (actorId === memberId || actor.role === 'owner' || (actor.role === 'admin' && member.role === 'member')));
}
export function changeTeamRole(team: TeamResponsibilityProfile, actorId: string, memberId: string, role: 'admin' | 'member') {
  const actor = activeMembership(team, actorId), member = activeMembership(team, memberId);
  if (actor?.role !== 'owner' || !member || member.role === 'owner' || !['admin', 'member'].includes(role)) throw new Error('只有拥有者可以修改成员角色。');
  return { ...team, memberships: team.memberships.map(m => m.id === member.id ? { ...m, role } : m) };
}
export function transferTeamOwnership(team: TeamResponsibilityProfile, actorId: string, successorId: string) {
  if (activeMembership(team, actorId)?.role !== 'owner' || actorId === successorId || !activeMembership(team, successorId)) throw new Error('请选择其他有效成员接任拥有者。');
  return { ...team, memberships: team.memberships.map((m): TeamMembership => m.memberId === successorId ? { ...m, role: 'owner' } : m.memberId === actorId ? { ...m, role: 'admin' } : m) };
}
export function getHandoffTasks(teamId: string, nodes: readonly WorkspaceNode[], memberId: string): TaskNode[] {
  return nodes.filter((n): n is TaskNode => n.kind === 'task' && n.teamId === teamId && !['已完成', '已取消'].includes(n.status) && (n.ownerId === memberId || Boolean(n.participantIds?.includes(memberId))));
}
export function handoffSignature(team: TeamResponsibilityProfile, nodes: readonly WorkspaceNode[], memberId: string) {
  return JSON.stringify({ members: team.memberships.map(m => [m.id, m.memberId, m.status, m.role]), tasks: getHandoffTasks(team.id, nodes, memberId).map(t => [t.id, t.name, t.parentTaskId, t.status, t.ownerId, t.participantIds]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))) });
}
export type MemberExitInput = { team: TeamResponsibilityProfile; nodes: readonly WorkspaceNode[]; actorId: string; memberId: string; replacements: Record<string, string>; expectedSignature: string };
export function prepareMemberExit(input: MemberExitInput) {
  const { team, nodes, actorId, memberId, replacements, expectedSignature } = input;
  if (!canRemoveTeamMember(team, actorId, memberId)) throw new Error('没有移除权限，或需要先转让团队拥有者。');
  if (expectedSignature !== handoffSignature(team, nodes, memberId)) throw new Error('任务或成员已变化，请重新核对交接清单。');
  const tasks = getHandoffTasks(team.id, nodes, memberId);
  for (const task of tasks) if (!replacements[task.id] || replacements[task.id] === memberId || !activeMembership(team, replacements[task.id])) throw new Error('请为每项任务指定有效的接手人。');
  const ids = new Set(tasks.map(t => t.id));
  const nextNodes = nodes.map(node => {
    if (node.kind !== 'task' || node.teamId !== team.id) return node;
    if (!ids.has(node.id)) return node.proposedOwnerId === memberId ? { ...node, proposedOwnerId: undefined } : node;
    const successor = replacements[node.id];
    const ownerId = node.ownerId === memberId ? successor : node.ownerId;
    const participantIds = new Set((node.participantIds ?? []).filter(id => id !== memberId && id !== ownerId));
    if (node.ownerId !== memberId && successor !== ownerId) participantIds.add(successor);
    return { ...node, ownerId, proposedOwnerId: node.proposedOwnerId === memberId ? undefined : node.proposedOwnerId, participantIds: [...participantIds], updatedAt: new Date().toISOString() };
  });
  return { nodes: nextNodes, team: { ...team, memberships: team.memberships.filter(m => m.memberId !== memberId) }, tasks };
}
